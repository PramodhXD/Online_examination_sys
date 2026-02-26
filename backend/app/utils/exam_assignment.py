from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam_assignment import ExamAssignment
from app.models.user import User

ALL_SCOPE = "ALL"
STUDENT_SCOPE = "STUDENT"


async def get_assignment_rows(
    db: AsyncSession,
    category_id: int,
) -> list[ExamAssignment]:
    return (
        await db.execute(
            select(ExamAssignment).where(ExamAssignment.category_id == category_id)
        )
    ).scalars().all()


def assignment_mode_from_rows(rows: Iterable[ExamAssignment]) -> str:
    materialized = list(rows)
    if not materialized:
        return "all"
    if any((row.assignment_scope or "").upper() == ALL_SCOPE for row in materialized):
        return "all"
    return "specific"


async def assignment_count_for_category(
    db: AsyncSession,
    category_id: int,
    rows: list[ExamAssignment] | None = None,
) -> int:
    materialized = rows if rows is not None else await get_assignment_rows(db, category_id)
    mode = assignment_mode_from_rows(materialized)
    if mode == "all":
        total_students = await db.scalar(
            select(func.count()).select_from(User).where(
                User.role == "student",
                User.is_deleted.is_(False),
            )
        ) or 0
        return int(total_students)

    return len({row.user_id for row in materialized if row.user_id is not None})


async def is_user_assigned_to_exam(
    db: AsyncSession,
    category_id: int,
    user_id: int,
) -> bool:
    rows = await get_assignment_rows(db, category_id)
    if not rows:
        return True
    if any((row.assignment_scope or "").upper() == ALL_SCOPE for row in rows):
        return True
    return any(
        (row.assignment_scope or "").upper() == STUDENT_SCOPE and row.user_id == user_id
        for row in rows
    )
