from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# =====================================================
# Practice Category Schemas
# =====================================================

class PracticeCategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime]
    attempt_limit: int = 1
    attempts_used: int = 0
    attempts_left: int = 1
    limit_reached: bool = False

    class Config:
        from_attributes = True


# =====================================================
# Practice Question Schemas (Student Version)
# =====================================================

class PracticeQuestionResponse(BaseModel):
    id: int
    category_id: int
    question_text: str
    difficulty: str

    option_1: str
    option_2: str
    option_3: str
    option_4: str
    correct_option: Optional[int] = None
    explanation: Optional[str] = None

    class Config:
        from_attributes = True



# =====================================================
# Practice Attempt Schemas
# =====================================================

class PracticeAttemptCreate(BaseModel):
    category_id: int


class PracticeAttemptResponse(BaseModel):
    id: int
    category_id: int

    total_questions: int
    correct_answers: int
    score: float
    accuracy: Optional[float]
    status: str

    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# =====================================================
# Practice Submit Schemas
# =====================================================

class PracticeAnswerSubmit(BaseModel):
    question_id: int
    selected_option: int


class PracticeSubmitRequest(BaseModel):
    attempt_id: Optional[int] = None
    answers: List[PracticeAnswerSubmit]


class PracticeSubmitResponse(BaseModel):
    attempt_id: int
    total_questions: int
    correct_answers: int
    wrong_answers: int
    score: float
    accuracy: float
