from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.assessment import AssessmentCategory, AssessmentQuestion
from app.models.practice import PracticeAttempt, PracticeCategory
from app.models.user import User
from app.schemas.practice import (
    PracticeCategoryResponse,
    PracticeQuestionResponse,
    PracticeSubmitRequest,
    PracticeSubmitResponse,
)
from app.utils.attempt_limits import (
    calculate_attempts_left,
    has_attempts_remaining,
    normalize_attempt_limit,
)
from app.utils.exam_assignment import is_user_assigned_to_exam
from app.utils.jwt import get_current_user

router = APIRouter(prefix="/practice", tags=["Practice"])
PUBLISHED_STATUS = "PUBLISHED"


@router.get("/categories", response_model=List[PracticeCategoryResponse])
async def get_practice_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(AssessmentCategory)
            .where(
                func.upper(AssessmentCategory.exam_type) == "PRACTICE",
                func.upper(AssessmentCategory.status) == PUBLISHED_STATUS,
                exists(
                    select(1).where(
                        AssessmentQuestion.category_id == AssessmentCategory.id
                    )
                ),
            )
            .order_by(AssessmentCategory.created_at.desc())
        )
    ).scalars().all()

    visible: list[AssessmentCategory] = []
    for category in rows:
        if await is_user_assigned_to_exam(db, category.id, current_user["id"]):
            visible.append(category)

    out: list[PracticeCategoryResponse] = []
    for category in visible:
        attempts_used = await db.scalar(
            select(func.count()).select_from(PracticeAttempt).where(
                PracticeAttempt.user_id == current_user["id"],
                PracticeAttempt.category_id == category.id,
            )
        ) or 0
        attempt_limit = normalize_attempt_limit(category.attempt_limit)
        attempts_left = calculate_attempts_left(attempt_limit, attempts_used)
        limit_reached = not has_attempts_remaining(attempt_limit, attempts_used)
        out.append(
            PracticeCategoryResponse(
                id=category.id,
                name=category.title,
                description=category.description,
                created_at=category.created_at,
                attempt_limit=attempt_limit,
                attempts_used=int(attempts_used),
                attempts_left=attempts_left,
                limit_reached=limit_reached,
            )
        )
    return out


@router.post("/start")
async def start_practice(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment_category = (
        await db.execute(
            select(AssessmentCategory).where(
                AssessmentCategory.id == category_id,
                func.upper(AssessmentCategory.exam_type) == "PRACTICE",
                func.upper(AssessmentCategory.status) == PUBLISHED_STATUS,
                exists(
                    select(1).where(
                        AssessmentQuestion.category_id == AssessmentCategory.id
                    )
                ),
            )
        )
    ).scalar_one_or_none()
    if not assessment_category:
        raise HTTPException(status_code=404, detail="Practice category not found")
    if not await is_user_assigned_to_exam(db, category_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="This exam is not assigned to you")

    practice_category = (
        await db.execute(
            select(PracticeCategory).where(PracticeCategory.id == category_id)
        )
    ).scalar_one_or_none()

    if not practice_category:
        # Backward compatibility: some DBs can already have this name with a
        # different id due to older data seeding paths.
        practice_category = (
            await db.execute(
                select(PracticeCategory).where(
                    PracticeCategory.name == assessment_category.title
                )
            )
        ).scalar_one_or_none()

    if not practice_category:
        db.add(
            PracticeCategory(
                id=assessment_category.id,
                name=assessment_category.title,
                description=assessment_category.description,
            )
        )
        try:
            await db.flush()
            practice_category = (
                await db.execute(
                    select(PracticeCategory).where(PracticeCategory.id == category_id)
                )
            ).scalar_one_or_none()
        except IntegrityError:
            await db.rollback()
            practice_category = (
                await db.execute(
                    select(PracticeCategory).where(
                        PracticeCategory.name == assessment_category.title
                    )
                )
            ).scalar_one_or_none()
            if not practice_category:
                raise HTTPException(
                    status_code=409,
                    detail="Could not create or resolve practice category",
                )

    resolved_category_id = practice_category.id if practice_category else category_id
    open_attempt = (
        await db.execute(
            select(PracticeAttempt).where(
                PracticeAttempt.user_id == current_user["id"],
                PracticeAttempt.category_id == resolved_category_id,
                func.upper(PracticeAttempt.status).in_(["IN_PROGRESS", "LIVE", "FLAGGED"]),
                PracticeAttempt.completed_at.is_(None),
            ).order_by(PracticeAttempt.started_at.desc())
        )
    ).scalars().first()
    if open_attempt:
        return {"attempt_id": open_attempt.id}

    used_attempts = await db.scalar(
        select(func.count()).select_from(PracticeAttempt).where(
            PracticeAttempt.user_id == current_user["id"],
            PracticeAttempt.category_id == resolved_category_id,
        )
    ) or 0
    attempt_limit = normalize_attempt_limit(assessment_category.attempt_limit)
    if not has_attempts_remaining(attempt_limit, used_attempts):
        raise HTTPException(
            status_code=403,
            detail=f"Attempt limit reached ({attempt_limit}). You cannot retake this practice exam.",
        )

    attempt = PracticeAttempt(
        user_id=current_user["id"],
        category_id=resolved_category_id,
        total_questions=0,
        correct_answers=0,
        score=0,
        accuracy=0,
        status="IN_PROGRESS",
        started_at=datetime.utcnow(),
    )

    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return {"attempt_id": attempt.id}


@router.get("/{category_id}", response_model=List[PracticeQuestionResponse])
async def get_questions(
    category_id: int,
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = (
        await db.execute(
            select(AssessmentCategory).where(
                AssessmentCategory.id == category_id,
                func.upper(AssessmentCategory.exam_type) == "PRACTICE",
                func.upper(AssessmentCategory.status) == PUBLISHED_STATUS,
            )
        )
    ).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Practice category not found")
    if not await is_user_assigned_to_exam(db, category_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="This exam is not assigned to you")

    result = await db.execute(
        select(AssessmentQuestion)
        .join(AssessmentCategory, AssessmentCategory.id == AssessmentQuestion.category_id)
        .where(
            AssessmentQuestion.category_id == category_id,
            func.upper(AssessmentCategory.exam_type) == "PRACTICE",
            func.upper(AssessmentCategory.status) == PUBLISHED_STATUS,
        )
        .order_by(func.random())
        .limit(limit)
    )

    questions = result.scalars().all()

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No questions found for this practice category",
        )

    return [
        PracticeQuestionResponse(
            id=q.id,
            category_id=q.category_id,
            question_text=q.question_text,
            difficulty="Medium",
            option_1=q.option_1,
            option_2=q.option_2,
            option_3=q.option_3,
            option_4=q.option_4,
            correct_option=q.correct_option,
            explanation=q.explanation,
        )
        for q in questions
    ]


@router.post("/submit", response_model=PracticeSubmitResponse)
async def submit_practice(
    data: PracticeSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.answers:
        raise HTTPException(status_code=400, detail="No answers submitted")

    result = await db.execute(
        select(PracticeAttempt).where(
            PracticeAttempt.id == data.attempt_id,
            PracticeAttempt.user_id == current_user["id"],
        )
    )

    attempt = result.scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    question_ids = list({answer.question_id for answer in data.answers})
    question_rows = (
        await db.execute(
            select(AssessmentQuestion).where(AssessmentQuestion.id.in_(question_ids))
        )
    ).scalars().all()
    question_map = {question.id: question for question in question_rows}

    correct_count = 0
    total = len(data.answers)

    for answer in data.answers:
        question = question_map.get(answer.question_id)
        if question and answer.selected_option == question.correct_option:
            correct_count += 1

    wrong_answers = total - correct_count
    accuracy = (correct_count / total) * 100 if total > 0 else 0

    attempt.total_questions = total
    attempt.correct_answers = correct_count
    attempt.score = correct_count
    attempt.accuracy = round(accuracy, 2)
    attempt.status = "COMPLETED"
    attempt.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(attempt)

    return PracticeSubmitResponse(
        attempt_id=attempt.id,
        total_questions=total,
        correct_answers=correct_count,
        wrong_answers=wrong_answers,
        score=correct_count,
        accuracy=round(accuracy, 2),
    )
