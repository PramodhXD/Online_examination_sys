from pydantic import BaseModel
from typing import List


class AssessmentCategoryResponse(BaseModel):
    id: int
    title: str
    description: str
    duration: int
    total_marks: int
    attempt_limit: int = 1
    attempts_used: int = 0
    attempts_left: int = 1
    limit_reached: bool = False

    class Config:
        from_attributes = True


class AssessmentQuestionResponse(BaseModel):
    id: int
    question_text: str
    options: List[str]


class AssessmentAnswerSubmit(BaseModel):
    question_id: int
    selected_option: int


class AssessmentSubmit(BaseModel):
    attempt_id: int
    question_ids: List[int]
    answers: List[int]
    submit_reason: str | None = None



class AssessmentResult(BaseModel):
    attempt_id: int
    score: int
    total: int
    percentage: float
    correct_answers: int
    wrong_answers: int
    certificate_eligible: bool = False
    certificate_download_url: str | None = None


class AssessmentCertificateItem(BaseModel):
    attempt_id: int
    category_id: int
    assessment_title: str
    percentage: float
    score: int
    total: int
    completed_at: str
