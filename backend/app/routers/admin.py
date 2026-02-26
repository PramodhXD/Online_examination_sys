from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.subscription import get_plan_config
from app.models.admin import AdminLog, AdminSetting, AdminStudentMeta
from app.models.assessment import (
    AssessmentAnswer,
    AssessmentAttempt,
    AssessmentCategory,
    AssessmentQuestion,
)
from app.models.exam_assignment import ExamAssignment
from app.models.practice import PracticeAnswer, PracticeAttempt, PracticeCategory
from app.models.user import User
from app.schemas.admin import (
    AdminCertificateEligibleItem,
    AdminDashboardStats,
    AnalyticsItem,
    ExamCreate,
    ExamAssignmentResponse,
    ExamAssignmentUpdate,
    ExamResponse,
    ExamUpdate,
    LiveSessionResponse,
    LogResponse,
    QuestionCreate,
    QuestionResponse,
    QuestionUpdate,
    SettingItem,
    SettingsUpdateRequest,
    StudentListItem,
    StudentResultsResponse,
    TimeCheckResponse,
)
from app.utils.face_storage import delete_user_face_data
from app.utils.exam_assignment import (
    ALL_SCOPE,
    STUDENT_SCOPE,
    assignment_count_for_category,
    assignment_mode_from_rows,
    get_assignment_rows,
)
from app.utils.attempt_limits import (
    UNLIMITED_ATTEMPT_LIMIT,
    normalize_attempt_limit,
)
from app.utils.jwt import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

ASSESSMENT_FINAL_STATUSES = ["COMPLETED", "VIOLATION_SUBMITTED"]
PASS_PERCENTAGE = 50.0


async def _require_admin(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict | User:
    result = await db.execute(select(User).where(User.id == current_user["id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _faces_root() -> Path:
    return Path(__file__).resolve().parents[2] / "faces"


def _face_key_from_roll(roll_number: str | None) -> str:
    value = str(roll_number or "").strip()
    if (
        not value
        or "/" in value
        or "\\" in value
        or value in {".", ".."}
        or ".." in value
        or ":" in value
    ):
        return ""
    return value


def _is_completed(status: str | None) -> bool:
    return (status or "").upper() in ASSESSMENT_FINAL_STATUSES


def _is_in_progress(status: str | None) -> bool:
    return (status or "").upper() in {"IN_PROGRESS", "LIVE"}


_VALID_EXAM_TYPES = {"ASSESSMENT", "PRACTICE"}
_VALID_EXAM_LIFECYCLE_STATUSES = {"DRAFT", "PUBLISHED"}


def _coerce_exam_type(value: str | None) -> str:
    normalized = (value or "ASSESSMENT").strip().upper()
    if normalized in _VALID_EXAM_TYPES:
        return normalized
    return "ASSESSMENT"


def _validate_exam_type(value: str | None) -> str:
    normalized = (value or "ASSESSMENT").strip().upper()
    if normalized not in _VALID_EXAM_TYPES:
        raise HTTPException(status_code=400, detail="exam_type must be assessment or practice")
    return normalized


def _validate_exam_lifecycle_status(value: str | None) -> str:
    normalized = (value or "draft").strip().upper()
    if normalized not in _VALID_EXAM_LIFECYCLE_STATUSES:
        raise HTTPException(status_code=400, detail="status must be draft or published")
    return normalized.lower()


def _coerce_exam_lifecycle_status(value: str | None) -> str:
    normalized = (value or "draft").strip().lower()
    if normalized in {"draft", "published"}:
        return normalized
    return "draft"


def _validate_attempt_limit(value: int | None) -> int:
    try:
        limit = int(value if value is not None else 1)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="attempt_limit must be a number")
    if limit < UNLIMITED_ATTEMPT_LIMIT:
        raise HTTPException(status_code=400, detail="attempt_limit must be 0 (unlimited) or at least 1")
    return limit


def _live_cutoff_for_duration(duration_minutes: int | None) -> datetime:
    duration = int(duration_minutes or 0)
    # Treat only recent in-progress attempts as truly live.
    window_minutes = max(15, duration + 15)
    return datetime.utcnow() - timedelta(minutes=window_minutes)


def _code_prefix(exam_type: str) -> str:
    return "PRC" if exam_type == "PRACTICE" else "ASM"


async def _search_students_for_assignment(
    db: AsyncSession,
    search: str,
    limit: int = 100,
) -> list[User]:
    query = select(User).where(User.role == "student", User.is_deleted.is_(False))
    if search:
        like = f"%{search.lower()}%"
        query = query.where(
            func.lower(User.name).like(like)
            | func.lower(User.email).like(like)
            | func.lower(User.roll_number).like(like)
        )
    query = query.order_by(User.name.asc()).limit(limit)
    return (await db.execute(query)).scalars().all()


async def _student_activity_logs(db: AsyncSession) -> list[LogResponse]:
    logs: list[LogResponse] = []

    assessment_rows = (
        await db.execute(
            select(AssessmentAttempt, User, AssessmentCategory)
            .join(User, AssessmentAttempt.user_id == User.id)
            .join(AssessmentCategory, AssessmentAttempt.category_id == AssessmentCategory.id)
        )
    ).all()
    for attempt, user, category in assessment_rows:
        if attempt.started_at:
            logs.append(
                LogResponse(
                    id=-(1_000_000 + int(attempt.id)),
                    event_type="Student",
                    message=f"{user.name} ({user.roll_number}) started assessment '{category.title}'",
                    created_at=attempt.started_at,
                )
            )
        if attempt.completed_at and _is_completed(attempt.status):
            if (attempt.status or "").upper() == "VIOLATION_SUBMITTED":
                outcome = "auto-submitted due to violation"
            else:
                outcome = "submitted"
            logs.append(
                LogResponse(
                    id=-(2_000_000 + int(attempt.id)),
                    event_type="Student",
                    message=f"{user.name} ({user.roll_number}) {outcome} assessment '{category.title}'",
                    created_at=attempt.completed_at,
                )
            )

    practice_rows = (
        await db.execute(
            select(PracticeAttempt, User, PracticeCategory)
            .join(User, PracticeAttempt.user_id == User.id)
            .join(PracticeCategory, PracticeAttempt.category_id == PracticeCategory.id)
        )
    ).all()
    for attempt, user, category in practice_rows:
        if attempt.started_at:
            logs.append(
                LogResponse(
                    id=-(3_000_000 + int(attempt.id)),
                    event_type="Student",
                    message=f"{user.name} ({user.roll_number}) started practice '{category.name}'",
                    created_at=attempt.started_at,
                )
            )
        if attempt.completed_at and (attempt.status or "").upper() == "COMPLETED":
            logs.append(
                LogResponse(
                    id=-(4_000_000 + int(attempt.id)),
                    event_type="Student",
                    message=f"{user.name} ({user.roll_number}) submitted practice '{category.name}'",
                    created_at=attempt.completed_at,
                )
            )

    return logs


async def _count_ongoing_sessions(db: AsyncSession) -> int:
    # Assessment attempts: keep only recent, unresolved, and actually answered attempts.
    assessment_rows = (
        await db.execute(
            select(
                AssessmentAttempt.id,
                AssessmentAttempt.user_id,
                AssessmentAttempt.category_id,
                AssessmentAttempt.started_at,
                AssessmentCategory.duration,
            )
            .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
            .where(
                func.upper(AssessmentAttempt.status).in_(["IN_PROGRESS", "LIVE"]),
                AssessmentAttempt.completed_at.is_(None),
            )
        )
    ).all()
    assessment_answer_counts = {
        row[0]: row[1]
        for row in (
            await db.execute(
                select(AssessmentAnswer.attempt_id, func.count(AssessmentAnswer.id))
                .group_by(AssessmentAnswer.attempt_id)
            )
        ).all()
    }

    live_keys: dict[tuple[str, int, int], datetime] = {}
    for attempt_id, user_id, category_id, started_at, duration in assessment_rows:
        if not started_at:
            continue
        if started_at < _live_cutoff_for_duration(duration):
            continue
        if int(assessment_answer_counts.get(attempt_id, 0)) <= 0:
            continue
        key = ("assessment", int(user_id), int(category_id))
        previous = live_keys.get(key)
        if previous is None or started_at > previous:
            live_keys[key] = started_at

    # Practice attempts: same policy.
    practice_rows = (
        await db.execute(
            select(
                PracticeAttempt.id,
                PracticeAttempt.user_id,
                PracticeAttempt.category_id,
                PracticeAttempt.started_at,
                func.coalesce(AssessmentCategory.duration, 60),
            )
            .outerjoin(AssessmentCategory, AssessmentCategory.id == PracticeAttempt.category_id)
            .where(
                func.upper(PracticeAttempt.status).in_(["IN_PROGRESS", "LIVE"]),
                PracticeAttempt.completed_at.is_(None),
            )
        )
    ).all()
    practice_answer_counts = {
        row[0]: row[1]
        for row in (
            await db.execute(
                select(PracticeAnswer.attempt_id, func.count(PracticeAnswer.id))
                .group_by(PracticeAnswer.attempt_id)
            )
        ).all()
    }

    for attempt_id, user_id, category_id, started_at, duration in practice_rows:
        if not started_at:
            continue
        if started_at < _live_cutoff_for_duration(duration):
            continue
        if int(practice_answer_counts.get(attempt_id, 0)) <= 0:
            continue
        key = ("practice", int(user_id), int(category_id))
        previous = live_keys.get(key)
        if previous is None or started_at > previous:
            live_keys[key] = started_at

    return len(live_keys)


async def _count_flagged_sessions(db: AsyncSession) -> int:
    flagged_keys: dict[tuple[str, int, int], datetime] = {}

    assessment_rows = (
        await db.execute(
            select(
                AssessmentAttempt.user_id,
                AssessmentAttempt.category_id,
                AssessmentAttempt.started_at,
                AssessmentCategory.duration,
            )
            .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
            .where(
                func.upper(AssessmentAttempt.status) == "FLAGGED",
                AssessmentAttempt.completed_at.is_(None),
            )
        )
    ).all()
    for user_id, category_id, started_at, duration in assessment_rows:
        if not started_at:
            continue
        if started_at < _live_cutoff_for_duration(duration):
            continue
        key = ("assessment", int(user_id), int(category_id))
        previous = flagged_keys.get(key)
        if previous is None or started_at > previous:
            flagged_keys[key] = started_at

    practice_rows = (
        await db.execute(
            select(
                PracticeAttempt.user_id,
                PracticeAttempt.category_id,
                PracticeAttempt.started_at,
                func.coalesce(AssessmentCategory.duration, 60),
            )
            .outerjoin(AssessmentCategory, AssessmentCategory.id == PracticeAttempt.category_id)
            .where(
                func.upper(PracticeAttempt.status) == "FLAGGED",
                PracticeAttempt.completed_at.is_(None),
            )
        )
    ).all()
    for user_id, category_id, started_at, duration in practice_rows:
        if not started_at:
            continue
        if started_at < _live_cutoff_for_duration(duration):
            continue
        key = ("practice", int(user_id), int(category_id))
        previous = flagged_keys.get(key)
        if previous is None or started_at > previous:
            flagged_keys[key] = started_at

    return len(flagged_keys)


@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_students = await db.scalar(
        select(func.count()).select_from(User).where(User.role == "student", User.is_deleted.is_(False))
    ) or 0

    published_exams = await db.scalar(
        select(func.count()).select_from(AssessmentCategory).where(func.upper(AssessmentCategory.status) == "PUBLISHED")
    ) or 0
    draft_exams = await db.scalar(
        select(func.count()).select_from(AssessmentCategory).where(func.upper(AssessmentCategory.status) == "DRAFT")
    ) or 0

    ongoing_sessions = await _count_ongoing_sessions(db)

    assessment_completed = await db.scalar(
        select(func.count()).select_from(AssessmentAttempt).where(func.upper(AssessmentAttempt.status) == "COMPLETED")
    ) or 0
    assessment_violation_submitted = await db.scalar(
        select(func.count()).select_from(AssessmentAttempt).where(
            func.upper(AssessmentAttempt.status) == "VIOLATION_SUBMITTED"
        )
    ) or 0
    practice_completed = await db.scalar(
        select(func.count()).select_from(PracticeAttempt).where(func.upper(PracticeAttempt.status) == "COMPLETED")
    ) or 0
    completed_attempts = assessment_completed + practice_completed

    cheating_alerts = await _count_flagged_sessions(db)

    assessment_avg = await db.scalar(
        select(func.avg(AssessmentAttempt.accuracy)).where(func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES))
    )
    practice_avg = await db.scalar(
        select(func.avg(PracticeAttempt.accuracy)).where(func.upper(PracticeAttempt.status) == "COMPLETED")
    )
    avg_values = [float(x) for x in [assessment_avg, practice_avg] if x is not None]
    average_score = round(sum(avg_values) / len(avg_values), 2) if avg_values else 0

    return AdminDashboardStats(
        total_students=total_students,
        active_exams=published_exams,
        published_exams=published_exams,
        draft_exams=draft_exams,
        ongoing_sessions=ongoing_sessions,
        completed_attempts=completed_attempts,
        violation_submitted_attempts=assessment_violation_submitted,
        cheating_alerts=cheating_alerts,
        average_score=average_score,
    )


@router.get("/students", response_model=List[StudentListItem])
async def list_students(
    search: str = "",
    department: str = "all",
    face_status: str = "all",
    subscription_status: str = "all",
    page: int = 1,
    page_size: int = 50,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.role == "student", User.is_deleted.is_(False))
    if search:
        like = f"%{search.lower()}%"
        query = query.where(
            func.lower(User.name).like(like)
            | func.lower(User.email).like(like)
            | func.lower(User.roll_number).like(like)
        )

    users = (await db.execute(query.offset((page - 1) * page_size).limit(page_size))).scalars().all()
    faces_dir = _faces_root()
    out: List[StudentListItem] = []

    for u in users:
        plan = (u.subscription_plan or "FREE").strip().upper()
        meta = (
            await db.execute(select(AdminStudentMeta).where(AdminStudentMeta.user_id == u.id))
        ).scalar_one_or_none()

        if not meta:
            face_key = _face_key_from_roll(u.roll_number)
            detected_face = "verified" if (face_key and (faces_dir / face_key / "template.json").exists()) else "not_registered"
            meta = AdminStudentMeta(
                user_id=u.id,
                department="General",
                batch="2024-28",
                blocked=False,
                face_status=detected_face,
            )
            db.add(meta)
            await db.flush()

        if department != "all" and meta.department != department:
            continue
        if face_status != "all" and meta.face_status != face_status:
            continue
        if subscription_status == "paid" and plan == "FREE":
            continue
        if subscription_status == "free" and plan != "FREE":
            continue

        in_progress_assessment = await db.scalar(
            select(func.count()).select_from(AssessmentAttempt).where(
                AssessmentAttempt.user_id == u.id,
                func.upper(AssessmentAttempt.status).in_(["IN_PROGRESS", "LIVE"]),
            )
        ) or 0
        in_progress_practice = await db.scalar(
            select(func.count()).select_from(PracticeAttempt).where(
                PracticeAttempt.user_id == u.id,
                func.upper(PracticeAttempt.status).in_(["IN_PROGRESS", "LIVE"]),
            )
        ) or 0

        exam_status = "suspended" if meta.blocked else ("active" if (in_progress_assessment + in_progress_practice) > 0 else "idle")

        out.append(
            StudentListItem(
                id=u.id,
                name=u.name,
                email=u.email,
                roll_number=u.roll_number,
                department=meta.department,
                batch=meta.batch,
                subscription_plan=plan,
                blocked=meta.blocked,
                face_status=meta.face_status,
                exam_status=exam_status,
            )
        )

    await db.commit()
    return out


@router.post("/students/{student_id}/certificates/issue")
async def issue_student_certificates(
    student_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == student_id, User.role == "student"))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    if not get_plan_config(user.subscription_plan).allow_certificates:
        raise HTTPException(status_code=400, detail="Student subscription is not eligible for certificates")

    attempts = (
        await db.execute(
            select(AssessmentAttempt).where(
                AssessmentAttempt.user_id == student_id,
                func.upper(AssessmentAttempt.status) == "COMPLETED",
                AssessmentAttempt.completed_at.is_not(None),
                AssessmentAttempt.accuracy >= PASS_PERCENTAGE,
            )
        )
    ).scalars().all()

    issued = 0
    for attempt in attempts:
        if bool(attempt.certificate_issued_by_admin):
            continue
        attempt.certificate_issued_by_admin = True
        issued += 1

    if issued > 0:
        db.add(AdminLog(event_type="Admin", message=f"Issued {issued} certificate(s) for {user.email}"))
    await db.commit()
    return {"student_id": student_id, "issued": issued}


@router.get("/certificates/eligible", response_model=List[AdminCertificateEligibleItem])
async def list_eligible_certificates(
    search: str = "",
    student_id: int | None = None,
    only_pending: bool = True,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(AssessmentAttempt, AssessmentCategory, User)
        .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
        .join(User, User.id == AssessmentAttempt.user_id)
        .where(
            User.role == "student",
            User.is_deleted.is_(False),
            func.upper(AssessmentAttempt.status) == "COMPLETED",
            AssessmentAttempt.completed_at.is_not(None),
            AssessmentAttempt.accuracy >= PASS_PERCENTAGE,
        )
        .order_by(AssessmentAttempt.completed_at.desc())
    )

    if student_id is not None:
        query = query.where(User.id == student_id)

    if search:
        like = f"%{search.lower()}%"
        query = query.where(
            func.lower(User.name).like(like)
            | func.lower(User.email).like(like)
            | func.lower(User.roll_number).like(like)
            | func.lower(AssessmentCategory.title).like(like)
        )

    rows = (await db.execute(query)).all()
    out: list[AdminCertificateEligibleItem] = []
    for attempt, category, user in rows:
        plan = (user.subscription_plan or "FREE").strip().upper()
        if not get_plan_config(plan).allow_certificates:
            continue
        issued = bool(attempt.certificate_issued_by_admin)
        if only_pending and issued:
            continue
        out.append(
            AdminCertificateEligibleItem(
                attempt_id=attempt.id,
                student_id=user.id,
                student_name=user.name,
                email=user.email,
                roll_number=user.roll_number,
                subscription_plan=plan,
                assessment_title=category.title,
                percentage=float(attempt.accuracy or 0),
                score=int(attempt.score or 0),
                total=int(attempt.total or 0),
                completed_at=attempt.completed_at,
                issued=issued,
            )
        )
    return out


@router.post("/certificates/{attempt_id}/issue")
async def issue_single_certificate(
    attempt_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(AssessmentAttempt, AssessmentCategory, User)
            .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
            .join(User, User.id == AssessmentAttempt.user_id)
            .where(AssessmentAttempt.id == attempt_id, User.role == "student", User.is_deleted.is_(False))
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Eligible attempt not found")

    attempt, category, user = row
    if not get_plan_config(user.subscription_plan).allow_certificates:
        raise HTTPException(status_code=400, detail="Student subscription is not eligible for certificates")
    if (attempt.status or "").upper() != "COMPLETED" or attempt.completed_at is None or float(attempt.accuracy or 0) < PASS_PERCENTAGE:
        raise HTTPException(status_code=400, detail="Attempt is not certificate eligible")
    if bool(attempt.certificate_issued_by_admin):
        return {"attempt_id": attempt.id, "issued": False, "message": "Already issued"}

    attempt.certificate_issued_by_admin = True
    db.add(
        AdminLog(
            event_type="Admin",
            message=f"Certificate issued for {user.email} in '{category.title}' (attempt {attempt.id})",
        )
    )
    await db.commit()
    return {"attempt_id": attempt.id, "issued": True, "message": "Certificate issued"}


@router.patch("/students/{student_id}/block")
async def toggle_student_block(
    student_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == student_id, User.role == "student"))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    meta = (
        await db.execute(select(AdminStudentMeta).where(AdminStudentMeta.user_id == student_id))
    ).scalar_one_or_none()
    if not meta:
        meta = AdminStudentMeta(user_id=student_id)
        db.add(meta)
        await db.flush()

    meta.blocked = not meta.blocked
    db.add(AdminLog(event_type="Admin", message=f"Student {user.email} block toggled to {meta.blocked}"))
    await db.commit()
    return {"student_id": student_id, "blocked": meta.blocked}


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == student_id, User.role == "student"))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    delete_user_face_data(roll_number=user.roll_number, email=user.email)
    user.is_deleted = True
    db.add(AdminLog(event_type="Admin", message=f"Student {user.email} deleted by admin"))
    await db.commit()
    return {"message": "Student deleted"}


@router.get("/students/{student_id}/results", response_model=StudentResultsResponse)
async def get_student_results(
    student_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    assessment_attempts = (
        await db.execute(
            select(AssessmentAttempt).where(
                AssessmentAttempt.user_id == student_id,
                func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
            )
        )
    ).scalars().all()
    practice_attempts = (
        await db.execute(
            select(PracticeAttempt).where(
                PracticeAttempt.user_id == student_id,
                func.upper(PracticeAttempt.status) == "COMPLETED",
            )
        )
    ).scalars().all()

    combined_scores = [float(a.accuracy or 0) for a in assessment_attempts] + [float(a.accuracy or 0) for a in practice_attempts]
    if not combined_scores:
        return StudentResultsResponse(exams_taken=0, avg_score=0, latest_result=None)

    latest = None
    latest_type = None
    if assessment_attempts:
        latest_assessment = max(assessment_attempts, key=lambda x: x.completed_at or datetime.min)
        latest = latest_assessment
        latest_type = "Assessment"
    if practice_attempts:
        latest_practice = max(practice_attempts, key=lambda x: x.completed_at or datetime.min)
        if latest is None or (latest_practice.completed_at or datetime.min) > (latest.completed_at or datetime.min):
            latest = latest_practice
            latest_type = "Practice"

    latest_result = f"{latest_type} Attempt #{latest.id} - {round(float(latest.accuracy or 0), 2)}%"
    return StudentResultsResponse(
        exams_taken=len(combined_scores),
        avg_score=round(sum(combined_scores) / len(combined_scores), 2),
        latest_result=latest_result,
    )


@router.get("/exams", response_model=List[ExamResponse])
async def list_exams(
    search: str = "",
    exam_type: str = "assessment",
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    filter_type = exam_type.strip().lower()
    if filter_type not in {"all", "assessment", "practice"}:
        raise HTTPException(status_code=400, detail="exam_type must be all, assessment, or practice")

    query = select(AssessmentCategory)
    if filter_type != "all":
        query = query.where(func.upper(AssessmentCategory.exam_type) == filter_type.upper())
    if search:
        like = f"%{search.lower()}%"
        query = query.where(func.lower(AssessmentCategory.title).like(like) | func.lower(AssessmentCategory.description).like(like))
    categories = (await db.execute(query.order_by(AssessmentCategory.created_at.desc()))).scalars().all()

    out: List[ExamResponse] = []
    for c in categories:
        live_cutoff = _live_cutoff_for_duration(c.duration)
        current_type = _coerce_exam_type(c.exam_type)
        assignment_rows = await get_assignment_rows(db, c.id)
        assigned = await assignment_count_for_category(db, c.id, assignment_rows)
        if current_type == "PRACTICE":
            live_count = await db.scalar(
                select(func.count(func.distinct(PracticeAttempt.id)))
                .select_from(PracticeAttempt)
                .join(PracticeAnswer, PracticeAnswer.attempt_id == PracticeAttempt.id)
                .where(
                    PracticeAttempt.category_id == c.id,
                    func.upper(PracticeAttempt.status).in_(["IN_PROGRESS", "LIVE"]),
                    PracticeAttempt.completed_at.is_(None),
                    PracticeAttempt.started_at >= live_cutoff,
                )
            ) or 0
            completed_count = await db.scalar(
                select(func.count()).where(PracticeAttempt.category_id == c.id, func.upper(PracticeAttempt.status) == "COMPLETED")
            ) or 0
        else:
            live_count = await db.scalar(
                select(func.count(func.distinct(AssessmentAttempt.id)))
                .select_from(AssessmentAttempt)
                .join(AssessmentAnswer, AssessmentAnswer.attempt_id == AssessmentAttempt.id)
                .where(
                    AssessmentAttempt.category_id == c.id,
                    func.upper(AssessmentAttempt.status).in_(["IN_PROGRESS", "LIVE"]),
                    AssessmentAttempt.completed_at.is_(None),
                    AssessmentAttempt.started_at >= live_cutoff,
                )
            ) or 0
            completed_count = await db.scalar(
                select(func.count()).where(AssessmentAttempt.category_id == c.id, func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES))
            ) or 0

        if live_count > 0:
            status = "live"
        else:
            status = _coerce_exam_lifecycle_status(c.status)

        out.append(
            ExamResponse(
                id=c.id,
                code=f"{_code_prefix(current_type)}-{str(c.id).zfill(3)}",
                exam_type=current_type.lower(),
                title=c.title,
                subject=(c.description or "General")[:100],
                exam_date=c.created_at,
                duration_minutes=c.duration,
                attempt_limit=normalize_attempt_limit(c.attempt_limit),
                assigned_students=assigned,
                status=status,
            )
        )
    return out


@router.post("/exams", response_model=ExamResponse)
async def create_exam(
    payload: ExamCreate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    requested_type = _validate_exam_type(payload.exam_type)
    exists = await db.scalar(
        select(func.count()).select_from(AssessmentCategory).where(
            func.lower(AssessmentCategory.title) == payload.title.lower(),
            func.upper(AssessmentCategory.exam_type) == requested_type,
        )
    ) or 0
    if exists:
        raise HTTPException(status_code=400, detail=f"{requested_type.title()} title already exists")

    category = AssessmentCategory(
        exam_type=requested_type,
        title=payload.title.strip(),
        description=payload.subject.strip(),
        status=_validate_exam_lifecycle_status(payload.status),
        duration=int(payload.duration_minutes),
        attempt_limit=_validate_attempt_limit(payload.attempt_limit),
        total_marks=100,
    )
    db.add(category)
    await db.flush()
    db.add(ExamAssignment(category_id=category.id, user_id=None, assignment_scope=ALL_SCOPE))
    db.add(AdminLog(event_type="Admin", message=f"{requested_type.title()} category created: {category.title}"))
    await db.commit()
    await db.refresh(category)

    return ExamResponse(
        id=category.id,
        code=f"{_code_prefix(requested_type)}-{str(category.id).zfill(3)}",
        exam_type=requested_type.lower(),
        title=category.title,
        subject=category.description or "General",
        exam_date=category.created_at,
        duration_minutes=category.duration,
        attempt_limit=normalize_attempt_limit(category.attempt_limit),
        assigned_students=0,
        status=category.status,
    )


@router.put("/exams/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    payload: ExamUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    category = (await db.execute(select(AssessmentCategory).where(AssessmentCategory.id == exam_id))).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Exam not found")

    data = payload.dict(exclude_none=True)
    new_type = _coerce_exam_type(category.exam_type)
    if "exam_type" in data:
        new_type = _validate_exam_type(data["exam_type"])
    if "status" in data:
        category.status = _validate_exam_lifecycle_status(data["status"])

    new_title = (data.get("title") or category.title).strip()
    duplicate = await db.scalar(
        select(func.count()).select_from(AssessmentCategory).where(
            AssessmentCategory.id != exam_id,
            func.lower(AssessmentCategory.title) == new_title.lower(),
            func.upper(AssessmentCategory.exam_type) == new_type,
        )
    ) or 0
    if duplicate:
        raise HTTPException(status_code=400, detail=f"{new_type.title()} title already exists")

    category.exam_type = new_type
    if "title" in data:
        category.title = data["title"].strip()
    if "subject" in data:
        category.description = data["subject"].strip()
    if "duration_minutes" in data:
        category.duration = int(data["duration_minutes"])
    if "attempt_limit" in data:
        category.attempt_limit = _validate_attempt_limit(data["attempt_limit"])

    db.add(AdminLog(event_type="Admin", message=f"{new_type.title()} category updated: {category.title}"))
    await db.commit()
    await db.refresh(category)

    current_type = _coerce_exam_type(category.exam_type)
    live_cutoff = _live_cutoff_for_duration(category.duration)
    assignment_rows = await get_assignment_rows(db, category.id)
    assigned = await assignment_count_for_category(db, category.id, assignment_rows)
    if current_type == "PRACTICE":
        live_count = await db.scalar(
            select(func.count(func.distinct(PracticeAttempt.id)))
            .select_from(PracticeAttempt)
            .join(PracticeAnswer, PracticeAnswer.attempt_id == PracticeAttempt.id)
            .where(
                PracticeAttempt.category_id == category.id,
                func.upper(PracticeAttempt.status).in_(["IN_PROGRESS", "LIVE"]),
                PracticeAttempt.completed_at.is_(None),
                PracticeAttempt.started_at >= live_cutoff,
            )
        ) or 0
        completed_count = await db.scalar(
            select(func.count()).where(PracticeAttempt.category_id == category.id, func.upper(PracticeAttempt.status) == "COMPLETED")
        ) or 0
    else:
        live_count = await db.scalar(
            select(func.count(func.distinct(AssessmentAttempt.id)))
            .select_from(AssessmentAttempt)
            .join(AssessmentAnswer, AssessmentAnswer.attempt_id == AssessmentAttempt.id)
            .where(
                AssessmentAttempt.category_id == category.id,
                func.upper(AssessmentAttempt.status).in_(["IN_PROGRESS", "LIVE"]),
                AssessmentAttempt.completed_at.is_(None),
                AssessmentAttempt.started_at >= live_cutoff,
            )
        ) or 0
        completed_count = await db.scalar(
            select(func.count()).where(AssessmentAttempt.category_id == category.id, func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES))
        ) or 0
    status = "live" if live_count > 0 else _coerce_exam_lifecycle_status(category.status)

    return ExamResponse(
        id=category.id,
        code=f"{_code_prefix(current_type)}-{str(category.id).zfill(3)}",
        exam_type=current_type.lower(),
        title=category.title,
        subject=category.description or "General",
        exam_date=category.created_at,
        duration_minutes=category.duration,
        attempt_limit=normalize_attempt_limit(category.attempt_limit),
        assigned_students=assigned,
        status=status,
    )


@router.get("/exams/{exam_id}/assignments", response_model=ExamAssignmentResponse)
async def get_exam_assignments(
    exam_id: int,
    search: str = "",
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    category = (await db.execute(select(AssessmentCategory).where(AssessmentCategory.id == exam_id))).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Exam not found")

    rows = await get_assignment_rows(db, exam_id)
    assignment_mode = assignment_mode_from_rows(rows)
    assigned_students = await assignment_count_for_category(db, exam_id, rows)
    selected_ids = sorted({row.user_id for row in rows if row.user_id is not None})

    selected_students: list[User] = []
    if selected_ids:
        selected_students = (
            await db.execute(
                select(User)
                .where(User.id.in_(selected_ids), User.role == "student", User.is_deleted.is_(False))
                .order_by(User.name.asc())
            )
        ).scalars().all()

    candidates = await _search_students_for_assignment(db, search=search, limit=100)

    return ExamAssignmentResponse(
        exam_id=exam_id,
        assignment_mode=assignment_mode,
        assigned_students=assigned_students,
        selected_students=[
            {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "roll_number": student.roll_number,
            }
            for student in selected_students
        ],
        candidates=[
            {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "roll_number": student.roll_number,
            }
            for student in candidates
        ],
    )


@router.put("/exams/{exam_id}/assignments", response_model=ExamAssignmentResponse)
async def update_exam_assignments(
    exam_id: int,
    payload: ExamAssignmentUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    category = (await db.execute(select(AssessmentCategory).where(AssessmentCategory.id == exam_id))).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Exam not found")

    mode = (payload.assignment_mode or "").strip().lower()
    if mode not in {"all", "specific"}:
        raise HTTPException(status_code=400, detail="assignment_mode must be all or specific")

    await db.execute(delete(ExamAssignment).where(ExamAssignment.category_id == exam_id))

    if mode == "all":
        db.add(ExamAssignment(category_id=exam_id, user_id=None, assignment_scope=ALL_SCOPE))
    else:
        requested_ids = sorted({int(student_id) for student_id in payload.student_ids if student_id is not None})
        if not requested_ids:
            raise HTTPException(status_code=400, detail="Select at least one student for specific assignment")

        valid_students = (
            await db.execute(
                select(User.id).where(
                    User.id.in_(requested_ids),
                    User.role == "student",
                    User.is_deleted.is_(False),
                )
            )
        ).scalars().all()
        valid_ids = sorted({int(student_id) for student_id in valid_students})
        if not valid_ids:
            raise HTTPException(status_code=400, detail="No valid students found for assignment")

        for student_id in valid_ids:
            db.add(
                ExamAssignment(
                    category_id=exam_id,
                    user_id=student_id,
                    assignment_scope=STUDENT_SCOPE,
                )
            )

    db.add(AdminLog(event_type="Admin", message=f"Exam assignment updated: {category.title} ({mode})"))
    await db.commit()

    rows = await get_assignment_rows(db, exam_id)
    assigned_students = await assignment_count_for_category(db, exam_id, rows)
    selected_ids = sorted({row.user_id for row in rows if row.user_id is not None})
    selected_students: list[User] = []
    if selected_ids:
        selected_students = (
            await db.execute(
                select(User)
                .where(User.id.in_(selected_ids), User.role == "student", User.is_deleted.is_(False))
                .order_by(User.name.asc())
            )
        ).scalars().all()

    return ExamAssignmentResponse(
        exam_id=exam_id,
        assignment_mode=assignment_mode_from_rows(rows),
        assigned_students=assigned_students,
        selected_students=[
            {
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "roll_number": student.roll_number,
            }
            for student in selected_students
        ],
        candidates=[],
    )


@router.delete("/exams/{exam_id}")
async def delete_exam(
    exam_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    category = (await db.execute(select(AssessmentCategory).where(AssessmentCategory.id == exam_id))).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Exam not found")
    current_type = _coerce_exam_type(category.exam_type)

    if current_type == "PRACTICE":
        has_attempts = await db.scalar(
            select(func.count()).select_from(PracticeAttempt).where(PracticeAttempt.category_id == exam_id)
        ) or 0
    else:
        has_attempts = await db.scalar(
            select(func.count()).select_from(AssessmentAttempt).where(AssessmentAttempt.category_id == exam_id)
        ) or 0
    if has_attempts > 0:
        raise HTTPException(status_code=400, detail="Cannot delete exam with attempts")

    await db.execute(delete(ExamAssignment).where(ExamAssignment.category_id == exam_id))

    practice_category = (await db.execute(select(PracticeCategory).where(PracticeCategory.id == exam_id))).scalar_one_or_none()
    if practice_category:
        await db.delete(practice_category)

    questions = (await db.execute(select(AssessmentQuestion).where(AssessmentQuestion.category_id == exam_id))).scalars().all()
    for q in questions:
        await db.delete(q)

    title = category.title
    await db.delete(category)
    db.add(AdminLog(event_type="Admin", message=f"{current_type.title()} category deleted: {title}"))
    await db.commit()
    return {"message": "Exam deleted"}


@router.get("/exams/{exam_id}/time-check", response_model=TimeCheckResponse)
async def time_limit_check(
    exam_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    category = (await db.execute(select(AssessmentCategory).where(AssessmentCategory.id == exam_id))).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Exam not found")

    ok = 30 <= category.duration <= 180
    if ok:
        return TimeCheckResponse(ok=True, message=f"Time limit is valid ({category.duration} mins)")
    return TimeCheckResponse(ok=False, message="Time limit outside recommended range (30-180 mins)")


@router.get("/questions", response_model=List[QuestionResponse])
async def list_questions(
    search: str = "",
    exam_id: int | None = None,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(AssessmentQuestion, AssessmentCategory).join(
        AssessmentCategory, AssessmentQuestion.category_id == AssessmentCategory.id
    )
    if exam_id:
        query = query.where(AssessmentQuestion.category_id == exam_id)
    if search:
        like = f"%{search.lower()}%"
        query = query.where(
            func.lower(AssessmentQuestion.question_text).like(like)
            | func.lower(AssessmentCategory.title).like(like)
        )

    rows = (await db.execute(query.order_by(AssessmentQuestion.id.desc()))).all()
    out: List[QuestionResponse] = []
    for q, c in rows:
        options = [q.option_1, q.option_2, q.option_3, q.option_4]
        correct_answer = options[q.correct_option - 1] if 1 <= q.correct_option <= 4 else ""
        out.append(
            QuestionResponse(
                id=q.id,
                code=f"Q-{str(q.id).zfill(3)}",
                exam_id=q.category_id,
                exam_title=c.title,
                question_text=q.question_text,
                question_type="MCQ",
                difficulty="Medium",
                marks=q.marks,
                options=options,
                correct_answer=correct_answer,
                explanation=q.explanation,
            )
        )
    return out


def _validate_mcq_payload(payload: QuestionCreate) -> int:
    options = [payload.option_1, payload.option_2, payload.option_3, payload.option_4]
    if payload.question_type.upper() != "MCQ":
        raise HTTPException(status_code=400, detail="Only MCQ is supported by assessment question model")
    if any(not str(opt or "").strip() for opt in options):
        raise HTTPException(status_code=400, detail="All four options are required")
    try:
        correct_option = options.index(payload.correct_answer) + 1
    except ValueError:
        raise HTTPException(status_code=400, detail="Correct answer must match one option")
    return correct_option


@router.post("/questions", response_model=QuestionResponse)
async def create_question(
    payload: QuestionCreate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    category = (await db.execute(select(AssessmentCategory).where(AssessmentCategory.id == payload.exam_id))).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Exam not found")

    correct_option = _validate_mcq_payload(payload)
    question = AssessmentQuestion(
        category_id=payload.exam_id,
        question_text=payload.question_text,
        option_1=payload.option_1,
        option_2=payload.option_2,
        option_3=payload.option_3,
        option_4=payload.option_4,
        correct_option=correct_option,
        marks=payload.marks,
        explanation=(payload.explanation or "").strip() or None,
    )
    db.add(question)
    await db.flush()
    db.add(AdminLog(event_type="Admin", message=f"Question created in {category.title}"))
    await db.commit()
    await db.refresh(question)

    options = [question.option_1, question.option_2, question.option_3, question.option_4]
    return QuestionResponse(
        id=question.id,
        code=f"Q-{str(question.id).zfill(3)}",
        exam_id=question.category_id,
        exam_title=category.title,
        question_text=question.question_text,
        question_type="MCQ",
        difficulty="Medium",
        marks=question.marks,
        options=options,
        correct_answer=options[question.correct_option - 1],
        explanation=question.explanation,
    )


@router.post("/questions/bulk")
async def create_questions_bulk(
    payload: List[QuestionCreate],
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    if not payload:
        raise HTTPException(status_code=400, detail="No questions provided")

    created = 0
    for item in payload:
        category = (await db.execute(select(AssessmentCategory).where(AssessmentCategory.id == item.exam_id))).scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail=f"Exam not found for question {item.code}")
        correct_option = _validate_mcq_payload(item)
        db.add(
            AssessmentQuestion(
                category_id=item.exam_id,
                question_text=item.question_text,
                option_1=item.option_1,
                option_2=item.option_2,
                option_3=item.option_3,
                option_4=item.option_4,
                correct_option=correct_option,
                marks=item.marks,
                explanation=(item.explanation or "").strip() or None,
            )
        )
        created += 1

    db.add(AdminLog(event_type="Admin", message=f"Bulk question create count={created}"))
    await db.commit()
    return {"created": created}


@router.put("/questions/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: int,
    payload: QuestionUpdate,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    question = (await db.execute(select(AssessmentQuestion).where(AssessmentQuestion.id == question_id))).scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    data = payload.dict(exclude_none=True)
    if "question_text" in data:
        question.question_text = data["question_text"]
    if "marks" in data:
        question.marks = int(data["marks"])
    if "option_1" in data:
        question.option_1 = data["option_1"]
    if "option_2" in data:
        question.option_2 = data["option_2"]
    if "option_3" in data:
        question.option_3 = data["option_3"]
    if "option_4" in data:
        question.option_4 = data["option_4"]

    if "correct_answer" in data and data["correct_answer"] is not None:
        options = [question.option_1, question.option_2, question.option_3, question.option_4]
        try:
            question.correct_option = options.index(data["correct_answer"]) + 1
        except ValueError:
            raise HTTPException(status_code=400, detail="Correct answer must match one option")
    if "explanation" in data:
        question.explanation = (data["explanation"] or "").strip() or None

    category = (await db.execute(select(AssessmentCategory).where(AssessmentCategory.id == question.category_id))).scalar_one()
    db.add(AdminLog(event_type="Admin", message=f"Question updated in {category.title}"))
    await db.commit()
    await db.refresh(question)

    options = [question.option_1, question.option_2, question.option_3, question.option_4]
    return QuestionResponse(
        id=question.id,
        code=f"Q-{str(question.id).zfill(3)}",
        exam_id=question.category_id,
        exam_title=category.title,
        question_text=question.question_text,
        question_type="MCQ",
        difficulty="Medium",
        marks=question.marks,
        options=options,
        correct_answer=options[question.correct_option - 1],
        explanation=question.explanation,
    )


@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    question = (await db.execute(select(AssessmentQuestion).where(AssessmentQuestion.id == question_id))).scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    await db.delete(question)
    db.add(AdminLog(event_type="Admin", message=f"Question deleted: {question_id}"))
    await db.commit()
    return {"message": "Question deleted"}


@router.get("/live", response_model=List[LiveSessionResponse])
async def list_live_sessions(
    search: str = "",
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    assessment_query = (
        select(AssessmentAttempt, User, AssessmentCategory)
        .join(User, AssessmentAttempt.user_id == User.id)
        .join(AssessmentCategory, AssessmentAttempt.category_id == AssessmentCategory.id)
        .where(
            func.upper(AssessmentAttempt.status).in_(["IN_PROGRESS", "LIVE", "FLAGGED"]),
            AssessmentAttempt.completed_at.is_(None),
        )
        .order_by(AssessmentAttempt.started_at.desc())
    )
    if search:
        like = f"%{search.lower()}%"
        assessment_query = assessment_query.where(
            func.lower(User.name).like(like)
            | func.lower(AssessmentCategory.title).like(like)
            | func.lower(User.roll_number).like(like)
        )
    assessment_rows = (await db.execute(assessment_query)).all()

    practice_query = (
        select(PracticeAttempt, User, PracticeCategory)
        .join(User, PracticeAttempt.user_id == User.id)
        .join(PracticeCategory, PracticeAttempt.category_id == PracticeCategory.id)
        .where(
            func.upper(PracticeAttempt.status).in_(["IN_PROGRESS", "LIVE", "FLAGGED"]),
            PracticeAttempt.completed_at.is_(None),
        )
        .order_by(PracticeAttempt.started_at.desc())
    )
    if search:
        like = f"%{search.lower()}%"
        practice_query = practice_query.where(
            func.lower(User.name).like(like)
            | func.lower(PracticeCategory.name).like(like)
            | func.lower(User.roll_number).like(like)
        )
    practice_rows = (await db.execute(practice_query)).all()

    faces_dir = _faces_root()

    out: List[LiveSessionResponse] = []
    for attempt, user, category in assessment_rows:
        if attempt.started_at and attempt.started_at < _live_cutoff_for_duration(category.duration):
            continue
        total_q = await db.scalar(
            select(func.count()).select_from(AssessmentQuestion).where(AssessmentQuestion.category_id == category.id)
        ) or 0
        answered_q = await db.scalar(
            select(func.count()).select_from(AssessmentAnswer).where(AssessmentAnswer.attempt_id == attempt.id)
        ) or 0
        progress = int((answered_q / total_q) * 100) if total_q else 0

        status = "Live"
        if (attempt.status or "").upper() == "FLAGGED":
            status = "Flagged"

        face_key = _face_key_from_roll(user.roll_number)
        face_status = "ok" if (face_key and (faces_dir / face_key / "template.json").exists()) else "warning"
        out.append(
            LiveSessionResponse(
                id=attempt.id,
                session_code=f"A-{attempt.id}",
                attempt_type="assessment",
                student_name=user.name,
                exam_title=category.title,
                face_status=face_status,
                tab_switches=0,
                progress=progress,
                status=status,
                started_at=attempt.started_at or datetime.utcnow(),
            )
        )

    for attempt, user, category in practice_rows:
        # PracticeCategory ids are mirrored from assessment categories in normal flow.
        duration = await db.scalar(
            select(AssessmentCategory.duration).where(AssessmentCategory.id == category.id)
        ) or 60
        if attempt.started_at and attempt.started_at < _live_cutoff_for_duration(duration):
            continue

        total_q = await db.scalar(
            select(func.count()).select_from(AssessmentQuestion).where(AssessmentQuestion.category_id == category.id)
        ) or 0
        answered_q = await db.scalar(
            select(func.count()).select_from(PracticeAnswer).where(PracticeAnswer.attempt_id == attempt.id)
        ) or 0
        progress = int((answered_q / total_q) * 100) if total_q else 0

        status = "Live"
        if (attempt.status or "").upper() == "FLAGGED":
            status = "Flagged"

        face_key = _face_key_from_roll(user.roll_number)
        face_status = "ok" if (face_key and (faces_dir / face_key / "template.json").exists()) else "warning"
        out.append(
            LiveSessionResponse(
                id=-attempt.id,
                session_code=f"P-{attempt.id}",
                attempt_type="practice",
                student_name=user.name,
                exam_title=category.name,
                face_status=face_status,
                tab_switches=0,
                progress=progress,
                status=status,
                started_at=attempt.started_at or datetime.utcnow(),
            )
        )
    out.sort(key=lambda item: item.started_at, reverse=True)
    return out


@router.patch("/live/{session_id}/flag")
async def flag_live_session(
    session_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    if session_id < 0:
        practice_id = abs(session_id)
        attempt = (await db.execute(select(PracticeAttempt).where(PracticeAttempt.id == practice_id))).scalar_one_or_none()
        if not attempt:
            raise HTTPException(status_code=404, detail="Session not found")
        attempt.status = "FLAGGED"
        db.add(AdminLog(event_type="Security", message=f"Practice session flagged: P-{attempt.id}"))
        await db.commit()
        return {"message": "Session flagged"}

    attempt = (await db.execute(select(AssessmentAttempt).where(AssessmentAttempt.id == session_id))).scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Session not found")
    attempt.status = "FLAGGED"
    db.add(AdminLog(event_type="Security", message=f"Assessment session flagged: A-{attempt.id}"))
    await db.commit()
    return {"message": "Session flagged"}


@router.patch("/live/{session_id}/stop")
async def stop_live_session(
    session_id: int,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    if session_id < 0:
        practice_id = abs(session_id)
        attempt = (await db.execute(select(PracticeAttempt).where(PracticeAttempt.id == practice_id))).scalar_one_or_none()
        if not attempt:
            raise HTTPException(status_code=404, detail="Session not found")
        attempt.status = "STOPPED"
        attempt.completed_at = datetime.utcnow()
        db.add(AdminLog(event_type="Security", message=f"Practice session stopped: P-{attempt.id}"))
        await db.commit()
        return {"message": "Session stopped"}

    attempt = (await db.execute(select(AssessmentAttempt).where(AssessmentAttempt.id == session_id))).scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Session not found")
    attempt.status = "STOPPED"
    attempt.completed_at = datetime.utcnow()
    db.add(AdminLog(event_type="Security", message=f"Assessment session stopped: A-{attempt.id}"))
    await db.commit()
    return {"message": "Session stopped"}


@router.get("/analytics", response_model=List[AnalyticsItem])
async def get_analytics(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    out: List[AnalyticsItem] = []

    assessment_rows = (
        await db.execute(
            select(AssessmentCategory.id, AssessmentCategory.title).where(
                func.upper(AssessmentCategory.exam_type) == "ASSESSMENT"
            )
        )
    ).all()
    for cid, title in assessment_rows:
        attempts = (
            await db.execute(
                select(AssessmentAttempt).where(
                    AssessmentAttempt.category_id == cid,
                    func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
                )
            )
        ).scalars().all()
        if not attempts:
            out.append(AnalyticsItem(exam=title, attempts=0, average=0, pass_rate=0))
            continue
        scores = [float(a.accuracy or 0) for a in attempts]
        passes = len([s for s in scores if s >= 40])
        out.append(
            AnalyticsItem(
                exam=title,
                attempts=len(attempts),
                average=round(sum(scores) / len(scores), 2),
                pass_rate=round((passes / len(scores)) * 100, 2),
            )
        )

    # Practice attempts are keyed by practice_categories.id. Use that as source
    # of truth, then backfill any configured PRACTICE exams with zero attempts.
    practice_rows = (
        await db.execute(select(PracticeCategory.id, PracticeCategory.name))
    ).all()
    seen_practice_names: set[str] = set()
    for cid, title in practice_rows:
        seen_practice_names.add(title)
        attempts = (
            await db.execute(
                select(PracticeAttempt).where(
                    PracticeAttempt.category_id == cid,
                    func.upper(PracticeAttempt.status) == "COMPLETED",
                )
            )
        ).scalars().all()
        if not attempts:
            out.append(AnalyticsItem(exam=f"Practice: {title}", attempts=0, average=0, pass_rate=0))
            continue
        scores = [float(a.accuracy or 0) for a in attempts]
        passes = len([s for s in scores if s >= 40])
        out.append(
            AnalyticsItem(
                exam=f"Practice: {title}",
                attempts=len(attempts),
                average=round(sum(scores) / len(scores), 2),
                pass_rate=round((passes / len(scores)) * 100, 2),
            )
        )

    configured_practice_rows = (
        await db.execute(
            select(AssessmentCategory.title).where(
                func.upper(AssessmentCategory.exam_type) == "PRACTICE"
            )
        )
    ).all()
    for (title,) in configured_practice_rows:
        if title in seen_practice_names:
            continue
        out.append(AnalyticsItem(exam=f"Practice: {title}", attempts=0, average=0, pass_rate=0))
    return out


@router.get("/logs", response_model=List[LogResponse])
async def list_logs(
    search: str = "",
    event_type: str = "all",
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(AdminLog)
    if event_type not in {"all", "Student"}:
        query = query.where(AdminLog.event_type == event_type)
    if search:
        like = f"%{search.lower()}%"
        query = query.where(
            func.lower(AdminLog.message).like(like)
            | func.lower(AdminLog.event_type).like(like)
        )
    admin_rows = (await db.execute(query.order_by(AdminLog.created_at.desc()))).scalars().all()
    combined = [
        LogResponse(id=r.id, event_type=r.event_type, message=r.message, created_at=r.created_at)
        for r in admin_rows
    ]

    student_logs = await _student_activity_logs(db)
    if event_type == "Student":
        combined = student_logs
    elif event_type == "all":
        combined.extend(student_logs)

    if search:
        lower = search.lower()
        combined = [
            item for item in combined
            if lower in (item.message or "").lower() or lower in (item.event_type or "").lower()
        ]

    combined.sort(key=lambda item: item.created_at, reverse=True)
    return combined


@router.post("/logs/generate")
async def generate_log_report(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    admin_count = await db.scalar(select(func.count()).select_from(AdminLog)) or 0
    student_count = len(await _student_activity_logs(db))
    count = int(admin_count) + int(student_count)
    return {"message": "Report generated", "records": count}


@router.get("/settings", response_model=List[SettingItem])
async def get_settings(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(select(AdminSetting).order_by(AdminSetting.key.asc()))).scalars().all()
    return [SettingItem(key=s.key, value=s.value) for s in rows]


@router.put("/settings")
async def update_settings(
    payload: SettingsUpdateRequest,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    for item in payload.items:
        setting = (await db.execute(select(AdminSetting).where(AdminSetting.key == item.key))).scalar_one_or_none()
        if setting:
            setting.value = item.value
        else:
            db.add(AdminSetting(key=item.key, value=item.value))
    db.add(AdminLog(event_type="Admin", message="System settings updated"))
    await db.commit()
    return {"message": "Settings updated"}
