from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.celery_app import celery_app
from app.schemas.code import CodeExecutionResponse, SupportedLanguage

try:
    from celery.result import AsyncResult
except ModuleNotFoundError:  # pragma: no cover - depends on local environment
    AsyncResult = None  # type: ignore[assignment]


MAX_CPU_SECONDS = 2
MAX_WALL_SECONDS = 5
MAX_MEMORY_MB = 256
MAX_STDIO_BYTES = 1024 * 1024


@dataclass(frozen=True)
class SandboxRequest:
    language: SupportedLanguage
    source_code: str
    stdin: str = ""
    cpu_seconds: int = MAX_CPU_SECONDS
    wall_seconds: int = MAX_WALL_SECONDS
    memory_mb: int = MAX_MEMORY_MB


def _truncate_output(value: str) -> str:
    encoded = value.encode("utf-8", errors="replace")
    if len(encoded) <= MAX_STDIO_BYTES:
        return value
    return encoded[:MAX_STDIO_BYTES].decode("utf-8", errors="replace") + "\n[output truncated]"


async def _run_subprocess(
    args: list[str],
    *,
    cwd: Path,
    stdin_text: str,
    timeout_seconds: int,
) -> tuple[str, str, int | None, int]:
    return await asyncio.to_thread(
        _run_subprocess_sync,
        args,
        cwd=cwd,
        stdin_text=stdin_text,
        timeout_seconds=timeout_seconds,
    )


def _run_subprocess_sync(
    args: list[str],
    *,
    cwd: Path,
    stdin_text: str,
    timeout_seconds: int,
) -> tuple[str, str, int | None, int]:
    started_at = time.perf_counter()

    try:
        completed = subprocess.run(
            args,
            cwd=str(cwd),
            input=stdin_text,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        elapsed_ms = int((time.perf_counter() - started_at) * 1000)
        return (
            _truncate_output(exc.stdout or ""),
            _truncate_output(exc.stderr or "Execution timed out."),
            None,
            elapsed_ms,
        )

    elapsed_ms = int((time.perf_counter() - started_at) * 1000)
    return (
        _truncate_output(completed.stdout or ""),
        _truncate_output(completed.stderr or ""),
        completed.returncode,
        elapsed_ms,
    )


def _python_executable() -> str:
    return sys.executable


def _runtime_info(language: SupportedLanguage) -> tuple[str | None, str | None]:
    if language == "python":
        return _python_executable(), None
    if language == "javascript":
        return shutil.which("node"), "Node.js"
    if language == "java":
        return shutil.which("javac"), "Java"
    if language == "c":
        return shutil.which("gcc"), "GCC"
    if language == "cpp":
        return shutil.which("g++"), "G++"
    return None, "Runtime"


def _commands_for(language: SupportedLanguage, workspace: Path) -> tuple[Path, list[str] | None, list[str]]:
    if language == "python":
        source = workspace / "main.py"
        return source, None, [_python_executable(), str(source)]
    if language == "javascript":
        source = workspace / "main.js"
        return source, None, ["node", str(source)]
    if language == "java":
        source = workspace / "Main.java"
        return source, ["javac", str(source)], ["java", "-Xmx128m", "-cp", str(workspace), "Main"]
    if language == "c":
        source = workspace / "main.c"
        binary = workspace / "main.exe"
        return source, ["gcc", str(source), "-O2", "-std=c11", "-o", str(binary)], [str(binary)]
    if language == "cpp":
        source = workspace / "main.cpp"
        binary = workspace / "main.exe"
        return source, ["g++", str(source), "-O2", "-std=c++17", "-o", str(binary)], [str(binary)]
    raise ValueError(f"Unsupported language: {language}")


def _runtime_unavailable_response(language: SupportedLanguage) -> CodeExecutionResponse | None:
    executable, display_name = _runtime_info(language)
    if executable:
        return None
    name = display_name or language
    return CodeExecutionResponse(
        language=language,
        success=False,
        stdout="",
        stderr=f"{name} runtime is not installed or not available on PATH.",
        exit_code=None,
        execution_time_ms=None,
        runtime_available=False,
        message=f"{name} runtime is not available on this server.",
    )


async def _run_locally(request: SandboxRequest) -> CodeExecutionResponse:
    runtime_error = _runtime_unavailable_response(request.language)
    if runtime_error is not None:
        return runtime_error

    with tempfile.TemporaryDirectory(prefix=f"code-run-{request.language}-") as temp_dir:
        workspace = Path(temp_dir)
        try:
            source_path, compile_command, run_command = _commands_for(request.language, workspace)
        except ValueError as exc:
            return CodeExecutionResponse(
                language=request.language,
                success=False,
                stdout="",
                stderr=str(exc),
                exit_code=None,
                execution_time_ms=None,
                runtime_available=False,
                message="Unsupported language.",
            )

        source_path.write_text(request.source_code, encoding="utf-8")

        if compile_command:
            compile_stdout, compile_stderr, compile_exit_code, compile_elapsed_ms = await _run_subprocess(
                compile_command,
                cwd=workspace,
                stdin_text="",
                timeout_seconds=request.wall_seconds,
            )
            if compile_exit_code is None:
                return CodeExecutionResponse(
                    language=request.language,
                    success=False,
                    stdout=compile_stdout,
                    stderr=compile_stderr or "Compilation timed out.",
                    exit_code=None,
                    execution_time_ms=compile_elapsed_ms,
                    runtime_available=True,
                    message="Compilation timed out.",
                )
            if compile_exit_code != 0:
                return CodeExecutionResponse(
                    language=request.language,
                    success=False,
                    stdout=compile_stdout,
                    stderr=compile_stderr or "Compilation failed.",
                    exit_code=compile_exit_code,
                    execution_time_ms=compile_elapsed_ms,
                    runtime_available=True,
                    message="Compilation failed.",
                )

        stdout, stderr, exit_code, elapsed_ms = await _run_subprocess(
            run_command,
            cwd=workspace,
            stdin_text=request.stdin,
            timeout_seconds=request.wall_seconds,
        )

        if exit_code is None:
            return CodeExecutionResponse(
                language=request.language,
                success=False,
                stdout=stdout,
                stderr=stderr or "Execution timed out.",
                exit_code=None,
                execution_time_ms=elapsed_ms,
                runtime_available=True,
                message="Execution timed out.",
            )

        return CodeExecutionResponse(
            language=request.language,
            success=exit_code == 0,
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            execution_time_ms=elapsed_ms,
            runtime_available=True,
            message="Execution completed successfully." if exit_code == 0 else "Execution failed.",
        )


async def run_code_safely(
    code: str,
    language: SupportedLanguage,
    stdin: str = "",
) -> CodeExecutionResponse:
    return await _run_locally(
        SandboxRequest(
            language=language,
            source_code=code,
            stdin=stdin,
        )
    )


async def execute_code(
    language: SupportedLanguage,
    source_code: str,
    stdin: str = "",
) -> CodeExecutionResponse:
    return await run_code_safely(source_code, language, stdin)


def _ensure_queue_available() -> None:
    if celery_app is None or AsyncResult is None:
        raise HTTPException(
            status_code=503,
            detail="Code execution queue is unavailable. Install celery and redis dependencies first.",
        )


def is_queue_available() -> bool:
    return celery_app is not None and AsyncResult is not None


def _execute_code_task_impl(code: str, language: SupportedLanguage, stdin: str = "") -> dict[str, Any]:
    result = asyncio.run(run_code_safely(code, language, stdin))
    return result.model_dump()


if celery_app is not None:
    @celery_app.task(name="code_execution.execute_code_task", bind=True)
    def execute_code_task(self, code: str, language: SupportedLanguage, stdin: str = "") -> dict[str, Any]:
        return _execute_code_task_impl(code, language, stdin)
else:
    def execute_code_task(code: str, language: SupportedLanguage, stdin: str = "") -> dict[str, Any]:
        return _execute_code_task_impl(code, language, stdin)


def enqueue_code_execution(
    *,
    language: SupportedLanguage,
    source_code: str,
    stdin: str = "",
) -> str:
    _ensure_queue_available()
    job = execute_code_task.delay(source_code, language, stdin)
    return job.id


def get_code_execution_job(job_id: str) -> AsyncResult:
    _ensure_queue_available()
    return AsyncResult(job_id, app=celery_app)
