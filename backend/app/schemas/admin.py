from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional


class AdminDashboardStats(BaseModel):
    total_students: int
    active_exams: int
    published_exams: int
    draft_exams: int
    ongoing_sessions: int
    completed_attempts: int
    violation_submitted_attempts: int
    cheating_alerts: int
    average_score: float


class StudentListItem(BaseModel):
    id: int
    name: str
    email: str
    roll_number: str
    department: str
    batch: str
    subscription_plan: str
    blocked: bool
    face_status: str
    exam_status: str


class StudentResultsResponse(BaseModel):
    exams_taken: int
    avg_score: float
    latest_result: Optional[str]


class AdminCertificateEligibleItem(BaseModel):
    attempt_id: int
    student_id: int
    student_name: str
    email: str
    roll_number: str
    subscription_plan: str
    assessment_title: str
    percentage: float
    score: int
    total: int
    completed_at: datetime
    issued: bool


class ExamCreate(BaseModel):
    code: str
    exam_type: str = "assessment"
    title: str
    subject: str
    exam_date: datetime
    duration_minutes: int
    attempt_limit: int = 1
    assigned_students: int = 0
    status: str = "draft"


class ExamUpdate(BaseModel):
    exam_type: Optional[str] = None
    title: Optional[str] = None
    subject: Optional[str] = None
    exam_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    attempt_limit: Optional[int] = None
    assigned_students: Optional[int] = None
    status: Optional[str] = None


class ExamResponse(BaseModel):
    id: int
    code: str
    exam_type: str
    title: str
    subject: str
    exam_date: datetime
    duration_minutes: int
    attempt_limit: int
    assigned_students: int
    status: str


class AssignmentStudentItem(BaseModel):
    id: int
    name: str
    email: str
    roll_number: str


class ExamAssignmentResponse(BaseModel):
    exam_id: int
    assignment_mode: str
    assigned_students: int
    selected_students: List[AssignmentStudentItem]
    candidates: List[AssignmentStudentItem]


class ExamAssignmentUpdate(BaseModel):
    assignment_mode: str
    student_ids: List[int] = []


class TimeCheckResponse(BaseModel):
    ok: bool
    message: str


class QuestionCreate(BaseModel):
    code: str
    exam_id: int
    question_text: str
    question_type: str = "MCQ"
    difficulty: str = "Easy"
    marks: int = 1
    option_1: Optional[str] = None
    option_2: Optional[str] = None
    option_3: Optional[str] = None
    option_4: Optional[str] = None
    correct_answer: str
    explanation: Optional[str] = None


class QuestionBulkCreate(BaseModel):
    exam_id: int
    question_type: str = "MCQ"
    difficulty: str = "Easy"
    marks: int = 1
    items: List[QuestionCreate]


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = None
    difficulty: Optional[str] = None
    marks: Optional[int] = None
    option_1: Optional[str] = None
    option_2: Optional[str] = None
    option_3: Optional[str] = None
    option_4: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None


class QuestionResponse(BaseModel):
    id: int
    code: str
    exam_id: int
    exam_title: str
    question_text: str
    question_type: str
    difficulty: str
    marks: int
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None


class LiveSessionResponse(BaseModel):
    id: int
    session_code: str
    attempt_type: str
    student_name: str
    exam_title: str
    face_status: str
    tab_switches: int
    progress: int
    status: str
    started_at: datetime


class AnalyticsItem(BaseModel):
    exam: str
    attempts: int
    average: float
    pass_rate: float


class LogResponse(BaseModel):
    id: int
    event_type: str
    message: str
    created_at: datetime


class SettingItem(BaseModel):
    key: str
    value: str


class SettingsUpdateRequest(BaseModel):
    items: List[SettingItem]
