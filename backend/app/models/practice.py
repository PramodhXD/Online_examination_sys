from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    Float,
    Boolean,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


# =====================================================
# Practice Category
# =====================================================

class PracticeCategory(Base):
    __tablename__ = "practice_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    questions = relationship(
        "PracticeQuestion",
        back_populates="category",
        cascade="all, delete-orphan"
    )

    attempts = relationship(
        "PracticeAttempt",
        back_populates="category",
        cascade="all, delete-orphan"
    )


# =====================================================
# Practice Question
# =====================================================

class PracticeQuestion(Base):
    __tablename__ = "practice_questions"

    id = Column(Integer, primary_key=True, index=True)

    category_id = Column(
        Integer,
        ForeignKey("practice_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    question_text = Column(Text, nullable=False)
    difficulty = Column(String(20), default="Easy")

    option_1 = Column(Text, nullable=False)
    option_2 = Column(Text, nullable=False)
    option_3 = Column(Text, nullable=False)
    option_4 = Column(Text, nullable=False)

    correct_option = Column(Integer, nullable=False)
    explanation = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    category = relationship("PracticeCategory", back_populates="questions")


# =====================================================
# Practice Attempt
# =====================================================

class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    category_id = Column(
        Integer,
        ForeignKey("practice_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, default=0)
    score = Column(Float, default=0)
    accuracy = Column(Float)
    assigned_question_ids = Column(Text)
    submit_reason = Column(String(30), default="manual")

    status = Column(String(20), default="in_progress")

    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    tab_switches = Column(Integer, nullable=False, default=0)
    fullscreen_exits = Column(Integer, nullable=False, default=0)
    webcam_alerts = Column(Integer, nullable=False, default=0)
    proctor_alert_count = Column(Integer, nullable=False, default=0)
    last_proctor_event = Column(Text)
    last_proctor_event_at = Column(DateTime)

    # Relationships
    user = relationship("User", back_populates="practice_attempts")

    category = relationship("PracticeCategory", back_populates="attempts")

    answers = relationship(
        "PracticeAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan"
    )


# =====================================================
# Practice Answer
# =====================================================

class PracticeAnswer(Base):
    __tablename__ = "practice_answers"

    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(
        Integer,
        ForeignKey("practice_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    question_id = Column(
        Integer,
        ForeignKey("practice_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    selected_option = Column(Integer)
    is_correct = Column(Boolean)
    time_taken_seconds = Column(Integer, default=0)

    # Relationships
    attempt = relationship("PracticeAttempt", back_populates="answers")
    question = relationship("PracticeQuestion")
