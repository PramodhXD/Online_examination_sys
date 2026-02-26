from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class AdminExam(Base):
    __tablename__ = "admin_exams"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)
    exam_date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    assigned_students = Column(Integer, default=0)
    status = Column(String(30), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    questions = relationship(
        "AdminQuestion",
        back_populates="exam",
        cascade="all, delete-orphan",
    )


class AdminQuestion(Base):
    __tablename__ = "admin_questions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    exam_id = Column(Integer, ForeignKey("admin_exams.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="MCQ")
    difficulty = Column(String(20), default="Easy")
    marks = Column(Integer, default=1)
    option_1 = Column(Text, nullable=True)
    option_2 = Column(Text, nullable=True)
    option_3 = Column(Text, nullable=True)
    option_4 = Column(Text, nullable=True)
    correct_answer = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    exam = relationship("AdminExam", back_populates="questions")


class AdminStudentMeta(Base):
    __tablename__ = "admin_student_meta"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department = Column(String(100), default="General")
    batch = Column(String(30), default="2024-28")
    blocked = Column(Boolean, default=False)
    face_status = Column(String(30), default="not_registered")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdminLiveSession(Base):
    __tablename__ = "admin_live_sessions"

    id = Column(Integer, primary_key=True, index=True)
    student_name = Column(String(150), nullable=False)
    session_code = Column(String(50), unique=True, index=True, nullable=False)
    exam_title = Column(String(200), nullable=False)
    face_status = Column(String(30), default="ok")
    tab_switches = Column(Integer, default=0)
    progress = Column(Integer, default=0)
    status = Column(String(30), default="Live")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdminLog(Base):
    __tablename__ = "admin_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AdminSetting(Base):
    __tablename__ = "admin_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
