from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class ProgrammingExam(Base):
    __tablename__ = "programming_exam"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(120), nullable=False)
    description = Column(Text, default="")
    status = Column(String(20), nullable=False, default="draft")
    duration_minutes = Column(Integer, nullable=False, default=90)
    total_marks = Column(Integer, nullable=False, default=100)
    created_at = Column(DateTime, default=datetime.utcnow)

    problems = relationship(
        "ProgrammingProblem",
        back_populates="exam",
        cascade="all, delete-orphan",
    )
    attempts = relationship(
        "ProgrammingAttempt",
        back_populates="exam",
        cascade="all, delete-orphan",
    )
    assignments = relationship(
        "ProgrammingExamAssignment",
        back_populates="exam",
        cascade="all, delete-orphan",
    )


class ProgrammingProblem(Base):
    __tablename__ = "programming_problem"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("programming_exam.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(140), nullable=False)
    difficulty = Column(String(20), default="Easy")
    statement = Column(Text, nullable=False)
    input_format = Column(Text, default="")
    output_format = Column(Text, default="")
    constraints = Column(Text, default="")
    sample_input = Column(Text, default="")
    sample_output = Column(Text, default="")
    starter_code = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    exam = relationship("ProgrammingExam", back_populates="problems")
    test_cases = relationship(
        "ProgrammingTestCase",
        back_populates="problem",
        cascade="all, delete-orphan",
    )


class ProgrammingTestCase(Base):
    __tablename__ = "programming_test_case"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("programming_problem.id", ondelete="CASCADE"), nullable=False)
    input_data = Column(Text, default="")
    expected_output = Column(Text, default="")
    is_sample = Column(Boolean, default=False)
    marks = Column(Integer, default=1)

    problem = relationship("ProgrammingProblem", back_populates="test_cases")


class ProgrammingAttempt(Base):
    __tablename__ = "programming_attempt"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("programming_exam.id", ondelete="CASCADE"), nullable=False)
    problem_id = Column(Integer, ForeignKey("programming_problem.id", ondelete="CASCADE"), nullable=False)

    language = Column(String(20), default="python")
    source_code = Column(Text, default="")

    score = Column(Integer, default=0)
    total = Column(Integer, default=0)
    passed_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    status = Column(String(20), default="IN_PROGRESS")

    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    user = relationship("User", back_populates="programming_attempts")
    exam = relationship("ProgrammingExam", back_populates="attempts")
    problem = relationship("ProgrammingProblem")


class ProgrammingExamAssignment(Base):
    __tablename__ = "programming_exam_assignment"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("programming_exam.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    assignment_scope = Column(String(20), nullable=False, default="STUDENT")
    created_at = Column(DateTime, default=datetime.utcnow)

    exam = relationship("ProgrammingExam", back_populates="assignments")
