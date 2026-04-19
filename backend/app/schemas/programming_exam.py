from typing import List, Optional

from pydantic import BaseModel, Field


class ProgrammingExamResponse(BaseModel):
    id: int
    title: str
    description: str
    duration_minutes: int
    total_marks: int
    status: str

    class Config:
        from_attributes = True


class ProgrammingTestCaseResponse(BaseModel):
    id: int
    input_data: str
    expected_output: str
    is_sample: bool


class ProgrammingProblemResponse(BaseModel):
    id: int
    problem_id: int
    title: str
    description: str
    time_limit: int
    difficulty: str
    statement: str
    input_format: str
    output_format: str
    constraints: str
    sample_input: str
    sample_output: str
    starter_code: str
    sample_tests: List[ProgrammingTestCaseResponse] = Field(default_factory=list)


class ProgrammingExamDetailResponse(BaseModel):
    exam: ProgrammingExamResponse
    problems: List[ProgrammingProblemResponse] = Field(default_factory=list)


class ProgrammingProblemSolution(BaseModel):
    problem_id: int
    code: str = Field(default="", max_length=50000)


class ProgrammingAttemptStartResponse(BaseModel):
    attempt_id: int
    exam_id: int
    problem_id: int
    resumed: bool = False
    language: str
    starter_code: str
    saved_code: str
    solutions: List[ProgrammingProblemSolution] = Field(default_factory=list)
    started_at: str | None = None
    duration_minutes: int
    remaining_seconds: int
    status: str


class ProgrammingAttemptSessionResponse(BaseModel):
    attempt_id: int
    exam_id: int
    problem_id: int
    status: str
    started_at: str | None = None
    duration_minutes: int
    remaining_seconds: int
    expired: bool
    auto_submitted: bool = False


class ProgrammingDraftSaveRequest(BaseModel):
    attempt_id: int
    language: str
    source_code: str = Field(default="", max_length=50000)
    solutions: List[ProgrammingProblemSolution] = Field(default_factory=list)


class ProgrammingSubmitRequest(BaseModel):
    attempt_id: int
    language: str
    source_code: str = Field(default="", max_length=50000)
    solutions: List[ProgrammingProblemSolution] = Field(default_factory=list)
    submit_reason: str | None = None


class ProgrammingSubmitResult(BaseModel):
    attempt_id: int
    passed: int
    total: int
    score: int
    status: str
    message: str
