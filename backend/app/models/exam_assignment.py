from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.db.base import Base


class ExamAssignment(Base):
    __tablename__ = "exam_assignment"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(
        Integer,
        ForeignKey("assessment_category.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    assignment_scope = Column(String(20), nullable=False, default="STUDENT")
    created_at = Column(DateTime, default=datetime.utcnow)
