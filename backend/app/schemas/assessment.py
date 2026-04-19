from typing import List

from pydantic import BaseModel


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


class AssessmentSessionResponse(BaseModel):
    attempt_id: int
    category_id: int
    assessment_title: str
    status: str
    started_at: str | None = None
    duration_minutes: int
    remaining_seconds: int
    expired: bool = False
    auto_submitted: bool = False


class AssessmentAnswerSubmit(BaseModel):
    question_id: int
    selected_option: int


class AssessmentSubmit(BaseModel):
    attempt_id: int
    question_ids: List[int]
    answers: List[int]
    question_times: List[int] | None = None
    submit_reason: str | None = None


class AssessmentProctoringEvent(BaseModel):
    event_type: str
    message: str | None = None


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
    certificate_id: str
    verify_url: str


class AssessmentReviewQuestion(BaseModel):
    id: int
    order: int
    question_text: str
    options: List[str]
    user_answer: int | None = None
    user_answer_text: str | None = None
    correct_answer: int
    correct_answer_text: str
    is_correct: bool
    time_taken_seconds: int = 0


class AssessmentAttemptReview(BaseModel):
    attempt_id: int
    category_id: int
    assessment_title: str
    status: str
    submission_reason: str
    started_at: str | None = None
    completed_at: str | None = None
    score: int
    total: int
    percentage: float
    correct_answers: int
    wrong_answers: int
    certificate_eligible: bool = False
    certificate_download_url: str | None = None
    questions: List[AssessmentReviewQuestion]
