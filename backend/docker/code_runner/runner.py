#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import resource
import signal
import subprocess
import sys
import time
from pathlib import Path

MAX_STDIO_BYTES = 1024 * 1024
MAX_FILE_BYTES = 1024 * 1024
MAX_OPEN_FILES = 64
MAX_PROCESSES = 32


def _write_json(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def _truncate(value: str) -> str:
    if len(value.encode("utf-8", errors="replace")) <= MAX_STDIO_BYTES:
        return value
    encoded = value.encode("utf-8", errors="replace")[:MAX_STDIO_BYTES]
    return encoded.decode("utf-8", errors="replace") + "\n[output truncated]"


def _limit_resources(cpu_seconds: int, memory_mb: int) -> None:
    memory_bytes = memory_mb * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
    resource.setrlimit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_FILE_BYTES, MAX_FILE_BYTES))
    resource.setrlimit(resource.RLIMIT_NOFILE, (MAX_OPEN_FILES, MAX_OPEN_FILES))
    resource.setrlimit(resource.RLIMIT_NPROC, (MAX_PROCESSES, MAX_PROCESSES))
    os.setsid()


def _run_command(
    args: list[str],
    *,
    cwd: Path,
    stdin_text: str,
    cpu_seconds: int,
    wall_seconds: int,
    memory_mb: int,
) -> dict:
    started_at = time.perf_counter()
    process = subprocess.Popen(
        args,
        cwd=str(cwd),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        preexec_fn=lambda: _limit_resources(cpu_seconds, memory_mb),
    )
    try:
        stdout, stderr = process.communicate(stdin_text, timeout=wall_seconds)
        timed_out = False
    except subprocess.TimeoutExpired:
        timed_out = True
        os.killpg(process.pid, signal.SIGKILL)
        stdout, stderr = process.communicate()

    elapsed_ms = int((time.perf_counter() - started_at) * 1000)
    return {
        "stdout": _truncate(stdout or ""),
        "stderr": _truncate(stderr or ("Execution timed out." if timed_out else "")),
        "exit_code": None if timed_out else process.returncode,
        "execution_time_ms": elapsed_ms,
        "timed_out": timed_out,
    }


def _commands_for(language: str) -> tuple[Path, list[str] | None, list[str]]:
    if language == "python":
        source = Path("main.py")
        return source, None, ["python3", str(source)]
    if language == "javascript":
        source = Path("main.js")
        return source, None, ["node", str(source)]
    if language == "java":
        source = Path("Main.java")
        return source, ["javac", str(source)], ["java", "-Xmx128m", "Main"]
    if language == "c":
        source = Path("main.c")
        return source, ["gcc", str(source), "-O2", "-std=c11", "-o", "main"], ["./main"]
    if language == "cpp":
        source = Path("main.cpp")
        return source, ["g++", str(source), "-O2", "-std=c++17", "-o", "main"], ["./main"]
    raise ValueError(f"Unsupported language: {language}")


def main() -> int:
    if len(sys.argv) != 2:
        _write_json(
            {
                "success": False,
                "stdout": "",
                "stderr": "Runner payload path is required.",
                "exit_code": None,
                "execution_time_ms": None,
                "runtime_available": False,
                "message": "Sandbox runner misconfigured.",
            }
        )
        return 0

    payload_path = Path(sys.argv[1])
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    workspace = payload_path.parent
    language = str(payload["language"]).strip().lower()
    source_code = str(payload.get("source_code") or "")
    stdin_text = str(payload.get("stdin") or "")
    cpu_seconds = max(1, int(payload.get("cpu_seconds") or 2))
    wall_seconds = max(cpu_seconds + 1, int(payload.get("wall_seconds") or 5))
    memory_mb = max(64, int(payload.get("memory_mb") or 256))

    try:
        source_path, compile_command, run_command = _commands_for(language)
    except ValueError as exc:
        _write_json(
            {
                "success": False,
                "stdout": "",
                "stderr": str(exc),
                "exit_code": None,
                "execution_time_ms": None,
                "runtime_available": False,
                "message": "Unsupported language.",
            }
        )
        return 0

    (workspace / source_path).write_text(source_code, encoding="utf-8")

    if compile_command:
        compile_result = _run_command(
            compile_command,
            cwd=workspace,
            stdin_text="",
            cpu_seconds=cpu_seconds,
            wall_seconds=wall_seconds,
            memory_mb=memory_mb,
        )
        if compile_result["timed_out"] or compile_result["exit_code"] != 0:
            _write_json(
                {
                    "success": False,
                    "stdout": compile_result["stdout"],
                    "stderr": compile_result["stderr"],
                    "exit_code": compile_result["exit_code"],
                    "execution_time_ms": compile_result["execution_time_ms"],
                    "runtime_available": True,
                    "message": "Compilation timed out." if compile_result["timed_out"] else "Compilation failed.",
                }
            )
            return 0

    result = _run_command(
        run_command,
        cwd=workspace,
        stdin_text=stdin_text,
        cpu_seconds=cpu_seconds,
        wall_seconds=wall_seconds,
        memory_mb=memory_mb,
    )

    _write_json(
        {
            "success": not result["timed_out"] and result["exit_code"] == 0,
            "stdout": result["stdout"],
            "stderr": result["stderr"],
            "exit_code": result["exit_code"],
            "execution_time_ms": result["execution_time_ms"],
            "runtime_available": True,
            "message": (
                "Execution timed out."
                if result["timed_out"]
                else "Execution completed successfully."
                if result["exit_code"] == 0
                else "Execution failed."
            ),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
