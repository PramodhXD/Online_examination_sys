from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# =====================================================
# Performance Chart Data
# =====================================================

class PerformancePoint(BaseModel):
    label: str
    date: str
    timestamp: datetime
    score: float


# =====================================================
# Recent Assessment
# =====================================================

class RecentAssessment(BaseModel):
    exam_name: str
    date: datetime
    score: float
    status: str


# =====================================================
# Skill Proficiency
# =====================================================

class SkillProficiency(BaseModel):
    skill_name: str
    score: float


# =====================================================
# Main Dashboard Response
# =====================================================

class StudentDashboardResponse(BaseModel):

    total_exams: int
    average_score: float
    highest_score: float
    overall_accuracy: float
    rank: Optional[int]

    performance_overview: List[PerformancePoint]
    recent_assessments: List[RecentAssessment]
    skill_proficiency: List[SkillProficiency]


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    name: str
    roll_number: Optional[str] = None
    average_score: float
    attempts: int
    is_current_user: bool = False


class LeaderboardResponse(BaseModel):
    scope: str
    total_students: int
    my_rank: Optional[int] = None
    entries: List[LeaderboardEntry]
