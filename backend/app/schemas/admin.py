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


class ProgrammingTestCasePayload(BaseModel):
    input_data: str = ""
    expected_output: str = ""
    is_sample: bool = False
    marks: int = 1


class ProgrammingProblemPayload(BaseModel):
    title: str
    difficulty: str = "Easy"
    statement: str
    input_format: str = ""
    output_format: str = ""
    constraints: str = ""
    sample_input: str = ""
    sample_output: str = ""
    starter_code: str = ""
    test_cases: Optional[List[ProgrammingTestCasePayload]] = None


class ProgrammingExamCreate(BaseModel):
    title: str
    description: str = ""
    duration_minutes: int = 90
    total_marks: Optional[int] = None
    status: str = "draft"
    problem: ProgrammingProblemPayload


class ProgrammingExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    total_marks: Optional[int] = None
    status: Optional[str] = None
    problem: Optional[ProgrammingProblemPayload] = None


class ProgrammingTestCaseAdmin(BaseModel):
    id: int
    input_data: str
    expected_output: str
    is_sample: bool
    marks: int


class ProgrammingProblemAdmin(BaseModel):
    id: int
    title: str
    difficulty: str
    statement: str
    input_format: str
    output_format: str
    constraints: str
    sample_input: str
    sample_output: str
    starter_code: str
    test_cases: List[ProgrammingTestCaseAdmin] = []


class ProgrammingExamAdminResponse(BaseModel):
    id: int
    title: str
    description: str
    duration_minutes: int
    total_marks: int
    assigned_students: int = 0
    status: str
    created_at: datetime
    problem: Optional[ProgrammingProblemAdmin] = None


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
    fullscreen_exits: int = 0
    webcam_alerts: int = 0
    total_alerts: int = 0
    last_alert_message: Optional[str] = None
    last_alert_at: Optional[datetime] = None
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


class AdminSupportTicketReplyCreate(BaseModel):
    message: str


class AdminSupportTicketStatusUpdate(BaseModel):
    status: str


class AdminSupportTicketReplyUpdate(BaseModel):
    message: str
    status: str = "in_progress"


class AdminSupportTicketReplyItem(BaseModel):
    id: int
    author_role: str
    author_name: str
    message: str
    created_at: datetime


class AdminSupportTicketItem(BaseModel):
    id: int
    ticket_id: str
    student_id: int
    student_name: str
    student_email: str
    subject: str
    category: str
    priority: str
    message: str
    status: str
    admin_reply: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    replies: List[AdminSupportTicketReplyItem] = []
