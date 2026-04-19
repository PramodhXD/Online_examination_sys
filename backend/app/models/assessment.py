from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, TIMESTAMP, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class AssessmentCategory(Base):
    __tablename__ = "assessment_category"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text)
    exam_type = Column(String(20), nullable=False, default="ASSESSMENT", server_default="ASSESSMENT")
    status = Column(String(20), nullable=False, default="draft", server_default="draft")
    attempt_limit = Column(Integer, nullable=False, default=1, server_default="1")
    duration = Column(Integer, nullable=False)
    total_marks = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    questions = relationship("AssessmentQuestion", back_populates="category")
    attempts = relationship("AssessmentAttempt", back_populates="category")


class AssessmentQuestion(Base):
    __tablename__ = "assessment_question"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("assessment_category.id"), nullable=False)

    question_text = Column(Text, nullable=False)
    option_1 = Column(Text, nullable=False)
    option_2 = Column(Text, nullable=False)
    option_3 = Column(Text, nullable=False)
    option_4 = Column(Text, nullable=False)

    correct_option = Column(Integer, nullable=False)
    marks = Column(Integer, default=1)
    explanation = Column(Text)

    category = relationship("AssessmentCategory", back_populates="questions")
    answers = relationship("AssessmentAnswer", back_populates="question")


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempt"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("assessment_category.id"), nullable=False)

    score = Column(Integer, default=0)
    total = Column(Integer)
    accuracy = Column(Integer)
    assigned_question_ids = Column(Text)
    started_at = Column(TIMESTAMP, server_default=func.now())
    duration_minutes = Column(Integer, nullable=False, default=60, server_default="60")
    completed_at = Column(TIMESTAMP)
    status = Column(String(20), default="in_progress")
    submit_reason = Column(String(30), default="manual", server_default="manual")
    tab_switches = Column(Integer, nullable=False, default=0, server_default="0")
    fullscreen_exits = Column(Integer, nullable=False, default=0, server_default="0")
    webcam_alerts = Column(Integer, nullable=False, default=0, server_default="0")
    proctor_alert_count = Column(Integer, nullable=False, default=0, server_default="0")
    last_proctor_event = Column(Text)
    last_proctor_event_at = Column(TIMESTAMP)
    certificate_issued_by_admin = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    user = relationship("User", back_populates="attempts")
    category = relationship("AssessmentCategory", back_populates="attempts")
    answers = relationship("AssessmentAnswer", back_populates="attempt")


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answer"

    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(Integer, ForeignKey("assessment_attempt.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("assessment_question.id"), nullable=False)

    selected_option = Column(Integer)
    is_correct = Column(Boolean)
    time_taken_seconds = Column(Integer, default=0, server_default="0")
    question_order = Column(Integer, default=0, server_default="0")

    attempt = relationship("AssessmentAttempt", back_populates="answers")
    question = relationship("AssessmentQuestion", back_populates="answers")
