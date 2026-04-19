from fastapi import APIRouter, Depends, HTTPException

from app.schemas.code import (
    CodeExecutionEnqueueResponse,
    CodeExecutionJobResult,
    CodeExecutionRequest,
)
from app.services.code_execution import (
    enqueue_code_execution,
    get_code_execution_job,
    is_queue_available,
)
from app.utils.jwt import get_current_user

router = APIRouter(prefix="/code", tags=["Code"])
result_router = APIRouter(tags=["Code"])


@router.post("/execute", response_model=CodeExecutionEnqueueResponse)
async def execute_code_route(
    payload: CodeExecutionRequest,
    _: dict = Depends(get_current_user),
):
    if not is_queue_available():
        raise HTTPException(
            status_code=503,
            detail=(
                "Code execution queue is unavailable. "
                "Provision the worker/Redis stack before enabling this endpoint."
            ),
        )

    job_id = enqueue_code_execution(
        language=payload.language,
        source_code=payload.source_code,
        stdin=payload.stdin,
    )
    return CodeExecutionEnqueueResponse(
        job_id=job_id,
        status="pending",
        message="Code execution job queued successfully.",
        queued=True,
    )


def _build_job_result(job_id: str) -> CodeExecutionJobResult:
    job = get_code_execution_job(job_id)
    state = str(job.state or "").upper()

    if state == "PENDING":
        return CodeExecutionJobResult(
            job_id=job_id,
            status="pending",
            message="Job is waiting to be processed.",
        )

    if state in {"RECEIVED", "STARTED", "RETRY"}:
        return CodeExecutionJobResult(
            job_id=job_id,
            status="running",
            message="Job is currently running.",
        )

    if state == "FAILURE":
        error = str(job.result) if job.result is not None else "Code execution failed."
        return CodeExecutionJobResult(
            job_id=job_id,
            status="failed",
            error=error,
            message="Code execution failed.",
        )

    if state != "SUCCESS":
        return CodeExecutionJobResult(
            job_id=job_id,
            status="failed",
            error=f"Unexpected job state: {state or 'UNKNOWN'}",
            message="Unable to read code execution result.",
        )

    payload = job.result
    if not isinstance(payload, dict):
        raise HTTPException(status_code=500, detail="Invalid job result payload")

    return CodeExecutionJobResult(
        job_id=job_id,
        status="completed",
        output=str(payload.get("stdout") or ""),
        error=str(payload.get("stderr") or ""),
        execution_time=payload.get("execution_time_ms"),
        language=payload.get("language"),
        success=payload.get("success"),
        exit_code=payload.get("exit_code"),
        runtime_available=payload.get("runtime_available"),
        message=str(payload.get("message") or "Execution completed."),
    )


@result_router.get("/code-result/{job_id}", response_model=CodeExecutionJobResult)
async def get_code_execution_result(
    job_id: str,
    _: dict = Depends(get_current_user),
):
    return _build_job_result(job_id)
