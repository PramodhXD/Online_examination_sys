import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.assessment import AssessmentCategory
from app.models.practice import (
    PracticeAnswer,
    PracticeAttempt,
    PracticeCategory,
    PracticeQuestion,
)
from app.models.user import User
from app.schemas.practice import (
    PracticeAttemptReview,
    PracticeCategoryResponse,
    PracticeProctoringEvent,
    PracticeQuestionResponse,
    PracticeReviewQuestion,
    PracticeSubmitRequest,
    PracticeSubmitResponse,
)
from app.services.notification_service import create_notification
from app.utils.attempt_limits import (
    calculate_attempts_left,
    has_attempts_remaining,
    normalize_attempt_limit,
)
from app.utils.exam_assignment import is_user_assigned_to_exam
from app.utils.jwt import get_current_user

router = APIRouter(prefix="/practice", tags=["Practice"])
PUBLISHED_STATUS = "PUBLISHED"
DEFAULT_PRACTICE_QUESTION_LIMIT = 5


def _normalize_submission_reason(reason: str | None) -> str:
    normalized = (reason or "").strip().lower()
    if normalized == "timeout":
        return "timeout"
    return "manual"


def _is_attempt_open(attempt: PracticeAttempt) -> bool:
    return (
        str(attempt.status or "").upper() in {"IN_PROGRESS", "LIVE", "FLAGGED"}
        and attempt.completed_at is None
    )


def _record_proctoring_event(
    attempt: PracticeAttempt,
    *,
    event_type: str,
    message: str | None = None,
) -> None:
    normalized_event_type = str(event_type or "").strip().lower()
    normalized_message = str(message or "").strip()

    attempt.proctor_alert_count = int(attempt.proctor_alert_count or 0) + 1
    attempt.last_proctor_event = normalized_message or normalized_event_type or "Proctoring alert"
    attempt.last_proctor_event_at = datetime.utcnow()

    if normalized_event_type == "tab_switch":
        attempt.tab_switches = int(attempt.tab_switches or 0) + 1
    elif normalized_event_type == "fullscreen_exit":
        attempt.fullscreen_exits = int(attempt.fullscreen_exits or 0) + 1
    elif normalized_event_type in {
        "camera_access_denied",
        "multiple_faces",
        "no_face_detected",
        "face_mismatch",
        "webcam_disconnected",
        "webcam_error",
    }:
        attempt.webcam_alerts = int(attempt.webcam_alerts or 0) + 1


async def _get_practice_assignment_rows(
    db: AsyncSession,
    attempt_id: int,
) -> list[PracticeAnswer]:
    return (
        await db.execute(
            select(PracticeAnswer)
            .where(PracticeAnswer.attempt_id == attempt_id)
            .order_by(PracticeAnswer.id.asc())
        )
    ).scalars().all()


async def _bind_practice_questions(
    db: AsyncSession,
    *,
    attempt: PracticeAttempt,
    questions: list[PracticeQuestion],
) -> list[PracticeAnswer]:
    assignment_rows = await _get_practice_assignment_rows(db, attempt.id)
    if assignment_rows:
        return assignment_rows

    for question in questions:
        db.add(
            PracticeAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                selected_option=0,
                is_correct=False,
            )
        )
    await db.flush()
    return await _get_practice_assignment_rows(db, attempt.id)


def _serialize_question_ids(question_ids: list[int]) -> str:
    return json.dumps([int(question_id) for question_id in question_ids])


async def _resolve_practice_category_id(
    db: AsyncSession,
    assessment_category: AssessmentCategory,
) -> int:
    by_id = (
        await db.execute(
            select(PracticeCategory.id).where(PracticeCategory.id == assessment_category.id)
        )
    ).scalar_one_or_none()
    if by_id is not None:
        return int(by_id)

    by_name = (
        await db.execute(
            select(PracticeCategory.id).where(PracticeCategory.name == assessment_category.title)
        )
    ).scalar_one_or_none()
    if by_name is not None:
        return int(by_name)

    return int(assessment_category.id)


async def _find_practice_category(
    db: AsyncSession,
    *,
    category_id: int,
    category_name: str,
) -> PracticeCategory | None:
    by_id = (
        await db.execute(
            select(PracticeCategory).where(PracticeCategory.id == category_id)
        )
    ).scalar_one_or_none()
    if by_id is not None:
        return by_id

    return (
        await db.execute(
            select(PracticeCategory).where(PracticeCategory.name == category_name)
        )
    ).scalar_one_or_none()


async def _practice_question_count(
    db: AsyncSession,
    *,
    category_id: int,
) -> int:
    return int(
        await db.scalar(
            select(func.count()).select_from(PracticeQuestion).where(
                PracticeQuestion.category_id == category_id
            )
        )
        or 0
    )


def _to_practice_question_response(question: PracticeQuestion) -> PracticeQuestionResponse:
    return PracticeQuestionResponse(
        id=question.id,
        category_id=question.category_id,
        question_text=question.question_text,
        difficulty=question.difficulty or "Medium",
        option_1=question.option_1,
        option_2=question.option_2,
        option_3=question.option_3,
        option_4=question.option_4,
        correct_option=question.correct_option,
        explanation=question.explanation,
    )


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
        resolved_category_id = await _resolve_practice_category_id(db, category)
        if await _practice_question_count(db, category_id=resolved_category_id) <= 0:
            continue
        attempts_used = await db.scalar(
            select(func.count()).select_from(PracticeAttempt).where(
                PracticeAttempt.user_id == current_user["id"],
                PracticeAttempt.category_id == resolved_category_id,
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
            )
        )
    ).scalar_one_or_none()
    if not assessment_category:
        raise HTTPException(status_code=404, detail="Practice category not found")
    if not await is_user_assigned_to_exam(db, category_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="This exam is not assigned to you")

    assessment_category_id = int(assessment_category.id)
    assessment_category_title = str(assessment_category.title or "").strip()
    assessment_category_description = assessment_category.description

    practice_category = await _find_practice_category(
        db,
        category_id=assessment_category_id,
        category_name=assessment_category_title,
    )

    if not practice_category:
        db.add(
            PracticeCategory(
                id=assessment_category_id,
                name=assessment_category_title,
                description=assessment_category_description,
            )
        )
        try:
            await db.flush()
            practice_category = await _find_practice_category(
                db,
                category_id=assessment_category_id,
                category_name=assessment_category_title,
            )
        except IntegrityError:
            await db.rollback()
            practice_category = await _find_practice_category(
                db,
                category_id=assessment_category_id,
                category_name=assessment_category_title,
            )
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
        assignment_rows = await _get_practice_assignment_rows(db, open_attempt.id)
        assigned_question_ids = [int(row.question_id) for row in assignment_rows]
        question_rows = (
            await db.execute(
                select(PracticeQuestion).where(PracticeQuestion.id.in_(assigned_question_ids))
            )
        ).scalars().all() if assigned_question_ids else []
        question_map = {question.id: question for question in question_rows}
        questions = [
            _to_practice_question_response(question_map[question_id])
            for question_id in assigned_question_ids
            if question_id in question_map
        ]
        return {"attempt_id": open_attempt.id, "resumed": True, "questions": questions}

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
    await db.flush()

    selected_questions = (
        await db.execute(
            select(PracticeQuestion)
            .where(
                PracticeQuestion.category_id == resolved_category_id,
            )
            .order_by(func.random())
            .limit(DEFAULT_PRACTICE_QUESTION_LIMIT)
        )
    ).scalars().all()
    if not selected_questions:
        raise HTTPException(
            status_code=404,
            detail="No questions found for this practice category",
        )

    attempt.assigned_question_ids = _serialize_question_ids(
        [int(question.id) for question in selected_questions]
    )
    attempt.total_questions = len(selected_questions)
    await _bind_practice_questions(db, attempt=attempt, questions=selected_questions)
    await db.commit()
    await db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "resumed": False,
        "questions": [_to_practice_question_response(question) for question in selected_questions],
    }


@router.get("/{category_id}", response_model=List[PracticeQuestionResponse])
async def get_questions(
    category_id: int,
    limit: int = 5,
    attempt_id: int | None = None,
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

    resolved_category_id = await _resolve_practice_category_id(db, category)
    attempt = None
    if attempt_id is not None:
        attempt = (
            await db.execute(
                select(PracticeAttempt).where(
                    PracticeAttempt.id == attempt_id,
                    PracticeAttempt.user_id == current_user["id"],
                )
            )
        ).scalar_one_or_none()
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
    else:
        resolved_category_id = await _resolve_practice_category_id(db, category)
        attempt = (
            await db.execute(
                select(PracticeAttempt).where(
                    PracticeAttempt.user_id == current_user["id"],
                    PracticeAttempt.category_id == resolved_category_id,
                    func.upper(PracticeAttempt.status).in_(["IN_PROGRESS", "LIVE", "FLAGGED"]),
                    PracticeAttempt.completed_at.is_(None),
                ).order_by(PracticeAttempt.started_at.desc())
            )
        ).scalars().first()

    assignment_rows = await _get_practice_assignment_rows(db, attempt.id) if attempt else []
    if assignment_rows:
        assigned_question_ids = [int(row.question_id) for row in assignment_rows]
        question_rows = (
            await db.execute(
                select(PracticeQuestion).where(PracticeQuestion.id.in_(assigned_question_ids))
            )
        ).scalars().all()
        question_map = {question.id: question for question in question_rows}
        questions = [
            question_map[question_id]
            for question_id in assigned_question_ids
            if question_id in question_map
        ]
    else:
        question_category_id = attempt.category_id if attempt else resolved_category_id
        result = await db.execute(
            select(PracticeQuestion)
            .where(
                PracticeQuestion.category_id == question_category_id,
            )
            .order_by(func.random())
            .limit(limit)
        )
        questions = result.scalars().all()
        if questions and attempt:
            attempt.assigned_question_ids = _serialize_question_ids(
                [int(question.id) for question in questions]
            )
            await _bind_practice_questions(db, attempt=attempt, questions=questions)
            attempt.total_questions = len(questions)
            await db.commit()

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No questions found for this practice category",
        )

    return [
        _to_practice_question_response(q)
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
    if str(attempt.status or "").upper() == "COMPLETED":
        raise HTTPException(status_code=400, detail="Already submitted")

    assignment_rows = await _get_practice_assignment_rows(db, attempt.id)
    if not assignment_rows:
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: no server-side question assignment found for this attempt",
        )

    submitted_question_ids = [int(answer.question_id) for answer in data.answers]
    assigned_question_ids = [int(row.question_id) for row in assignment_rows]
    submitted_question_times = list(data.question_times or [])
    if len(submitted_question_ids) != len(assigned_question_ids):
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: submitted answer count does not match the assigned questions",
        )
    if submitted_question_times and len(submitted_question_times) != len(assigned_question_ids):
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: submitted timing count does not match the assigned questions",
        )
    if submitted_question_ids != assigned_question_ids:
        submitted_unique_ids = set(submitted_question_ids)
        assigned_unique_ids = set(assigned_question_ids)
        if len(submitted_question_ids) != len(set(submitted_question_ids)):
            raise HTTPException(
                status_code=400,
                detail="Invalid submission: duplicate question ids were submitted",
            )
        if submitted_unique_ids - assigned_unique_ids:
            raise HTTPException(
                status_code=400,
                detail="Invalid submission: request includes question ids that were not assigned to this attempt",
            )
        if assigned_unique_ids - submitted_unique_ids:
            raise HTTPException(
                status_code=400,
                detail="Invalid submission: request is missing one or more assigned questions",
            )
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: submitted questions do not match the server-side attempt record",
        )

    question_rows = (
        await db.execute(
            select(PracticeQuestion).where(PracticeQuestion.id.in_(assigned_question_ids))
        )
    ).scalars().all()
    question_map = {question.id: question for question in question_rows}
    if len(question_map) != len(assigned_question_ids):
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: assigned questions could not be resolved on the server",
        )

    correct_count = 0
    total = len(assigned_question_ids)
    if not submitted_question_times:
        submitted_question_times = [0] * len(assigned_question_ids)

    for answer_row, answer, time_taken in zip(assignment_rows, data.answers, submitted_question_times):
        question = question_map[int(answer_row.question_id)]
        selected_option = int(answer.selected_option or 0)
        is_correct = selected_option == int(question.correct_option or 0)
        answer_row.selected_option = selected_option
        answer_row.is_correct = is_correct
        answer_row.time_taken_seconds = max(0, int(time_taken or 0))
        if is_correct:
            correct_count += 1

    wrong_answers = total - correct_count
    accuracy = (correct_count / total) * 100 if total > 0 else 0
    practice_category = (
        await db.execute(
            select(PracticeCategory).where(PracticeCategory.id == attempt.category_id)
        )
    ).scalar_one_or_none()

    attempt.total_questions = total
    attempt.correct_answers = correct_count
    attempt.score = correct_count
    attempt.accuracy = round(accuracy, 2)
    attempt.submit_reason = _normalize_submission_reason(data.submit_reason)
    attempt.status = "COMPLETED"
    attempt.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(attempt)
    await create_notification(
        db,
        user_id=attempt.user_id,
        title="Practice result available",
        message=(
            f"Your practice attempt for '{practice_category.name if practice_category else 'Practice'}' is ready. "
            f"Score: {round(accuracy, 2)}%."
        ),
        notification_type="success",
        link=f"/practice/review?attempt={attempt.id}",
    )
    await db.commit()

    return PracticeSubmitResponse(
        attempt_id=attempt.id,
        total_questions=total,
        correct_answers=correct_count,
        wrong_answers=wrong_answers,
        score=correct_count,
        accuracy=round(accuracy, 2),
    )


@router.post("/attempts/{attempt_id}/proctoring")
async def report_practice_proctoring_event(
    attempt_id: int,
    payload: PracticeProctoringEvent,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempt = (
        await db.execute(
            select(PracticeAttempt).where(
                PracticeAttempt.id == attempt_id,
                PracticeAttempt.user_id == current_user["id"],
            )
        )
    ).scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if not _is_attempt_open(attempt):
        raise HTTPException(status_code=409, detail="Attempt is no longer active")

    _record_proctoring_event(
        attempt,
        event_type=payload.event_type,
        message=payload.message,
    )
    await db.commit()

    return {
        "attempt_id": attempt.id,
        "tab_switches": int(attempt.tab_switches or 0),
        "fullscreen_exits": int(attempt.fullscreen_exits or 0),
        "webcam_alerts": int(attempt.webcam_alerts or 0),
        "total_alerts": int(attempt.proctor_alert_count or 0),
        "last_alert_message": attempt.last_proctor_event,
    }


@router.get("/attempts/{attempt_id}/review", response_model=PracticeAttemptReview)
async def get_practice_attempt_review(
    attempt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attempt = (
        await db.execute(
            select(PracticeAttempt).where(
                PracticeAttempt.id == attempt_id,
                PracticeAttempt.user_id == current_user["id"],
            )
        )
    ).scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    category = (
        await db.execute(
            select(PracticeCategory).where(PracticeCategory.id == attempt.category_id)
        )
    ).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Practice category not found")

    answer_rows = (
        await db.execute(
            select(PracticeAnswer, PracticeQuestion)
            .join(PracticeQuestion, PracticeQuestion.id == PracticeAnswer.question_id)
            .where(PracticeAnswer.attempt_id == attempt.id)
            .order_by(PracticeAnswer.id.asc())
        )
    ).all()

    review_questions: list[PracticeReviewQuestion] = []
    correct_answers = 0
    for fallback_index, (answer, question) in enumerate(answer_rows, start=1):
        options = [
            question.option_1,
            question.option_2,
            question.option_3,
            question.option_4,
        ]
        user_answer = int(answer.selected_option or 0)
        correct_answer = int(question.correct_option or 0)
        safe_user_answer = user_answer if 1 <= user_answer <= len(options) else None
        safe_correct_answer = correct_answer if 1 <= correct_answer <= len(options) else None
        is_correct = bool(answer.is_correct)
        if is_correct:
            correct_answers += 1

        review_questions.append(
            PracticeReviewQuestion(
                id=question.id,
                order=fallback_index,
                question_text=question.question_text,
                options=options,
                user_answer=safe_user_answer,
                user_answer_text=options[safe_user_answer - 1] if safe_user_answer else None,
                correct_answer=safe_correct_answer or 0,
                correct_answer_text=options[safe_correct_answer - 1] if safe_correct_answer else "",
                is_correct=is_correct,
                time_taken_seconds=max(0, int(answer.time_taken_seconds or 0)),
            )
        )

    return PracticeAttemptReview(
        attempt_id=attempt.id,
        category_id=category.id,
        practice_title=category.name,
        status=str(attempt.status or "").upper(),
        submission_reason=_normalize_submission_reason(attempt.submit_reason),
        started_at=attempt.started_at.isoformat() if attempt.started_at else None,
        completed_at=attempt.completed_at.isoformat() if attempt.completed_at else None,
        score=float(attempt.score or 0),
        percentage=round(float(attempt.accuracy or 0), 2),
        total_questions=len(review_questions),
        correct_answers=correct_answers,
        wrong_answers=max(0, len(review_questions) - correct_answers),
        questions=review_questions,
    )
