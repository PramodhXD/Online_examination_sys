from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.programming_exam import ProgrammingExamAssignment
from app.models.user import User

ALL_SCOPE = "ALL"
STUDENT_SCOPE = "STUDENT"


async def get_programming_assignment_rows(
    db: AsyncSession,
    exam_id: int,
) -> list[ProgrammingExamAssignment]:
    return (
        await db.execute(
            select(ProgrammingExamAssignment).where(ProgrammingExamAssignment.exam_id == exam_id)
        )
    ).scalars().all()


def programming_assignment_mode_from_rows(rows: Iterable[ProgrammingExamAssignment]) -> str:
    materialized = list(rows)
    if not materialized:
        return "all"
    if any((row.assignment_scope or "").upper() == ALL_SCOPE for row in materialized):
        return "all"
    return "specific"


async def programming_assignment_count(
    db: AsyncSession,
    exam_id: int,
    rows: list[ProgrammingExamAssignment] | None = None,
) -> int:
    materialized = rows if rows is not None else await get_programming_assignment_rows(db, exam_id)
    mode = programming_assignment_mode_from_rows(materialized)
    if mode == "all":
        total_students = await db.scalar(
            select(func.count()).select_from(User).where(
                User.role == "student",
                User.is_deleted.is_(False),
            )
        ) or 0
        return int(total_students)

    return len({row.user_id for row in materialized if row.user_id is not None})


async def is_user_assigned_to_programming_exam(
    db: AsyncSession,
    exam_id: int,
    user_id: int,
) -> bool:
    rows = await get_programming_assignment_rows(db, exam_id)
    if not rows:
        return True
    if any((row.assignment_scope or "").upper() == ALL_SCOPE for row in rows):
        return True
    return any(
        (row.assignment_scope or "").upper() == STUDENT_SCOPE and row.user_id == user_id
        for row in rows
    )
