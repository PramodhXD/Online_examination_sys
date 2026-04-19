from typing import Literal, Optional

from pydantic import BaseModel, Field


SupportedLanguage = Literal["python", "javascript", "java", "cpp", "c"]


class CodeExecutionRequest(BaseModel):
    language: SupportedLanguage
    source_code: str = Field(..., min_length=1, max_length=50000)
    stdin: str = Field(default="", max_length=10000)


class CodeExecutionResponse(BaseModel):
    language: SupportedLanguage
    success: bool
    stdout: str = ""
    stderr: str = ""
    exit_code: Optional[int] = None
    execution_time_ms: Optional[int] = None
    runtime_available: bool
    message: str


class CodeExecutionEnqueueResponse(BaseModel):
    job_id: str
    status: str
    message: str
    queued: bool = True
    result: Optional[CodeExecutionResponse] = None


class CodeExecutionJobResult(BaseModel):
    job_id: str
    status: Literal["pending", "running", "completed", "failed"]
    output: str = ""
    error: str = ""
    execution_time: Optional[int] = None
    language: Optional[SupportedLanguage] = None
    success: Optional[bool] = None
    exit_code: Optional[int] = None
    runtime_available: Optional[bool] = None
    message: str = ""
