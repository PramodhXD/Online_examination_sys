from datetime import datetime
from io import BytesIO
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Float, desc, func, select, union_all

from app.core.subscription import get_plan_config
from app.db.session import get_db
from app.utils.jwt import get_current_user
from app.models.assessment import AssessmentAttempt, AssessmentCategory
from app.models.practice import PracticeAttempt, PracticeCategory
from app.models.programming_exam import ProgrammingAttempt, ProgrammingExam
from app.models.user import User
from app.schemas.dashboard import (
    LeaderboardEntry,
    LeaderboardResponse,
    StudentDashboardResponse,
    PerformancePoint,
    RecentAssessment,
    SkillProficiency,
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Student Dashboard"],
)

ASSESSMENT_FINAL_STATUSES = ["COMPLETED", "VIOLATION_SUBMITTED"]
PRACTICE_FINAL_STATUSES = ["COMPLETED"]


def _is_assessment_final(status: str | None) -> bool:
    return (status or "").upper() in ASSESSMENT_FINAL_STATUSES


def _is_practice_final(status: str | None) -> bool:
    return (status or "").upper() in PRACTICE_FINAL_STATUSES


async def _build_leaderboard_rows(db: AsyncSession, scope: str):
    if scope == "assessment":
        all_scores = (
            select(
                AssessmentAttempt.user_id.label("user_id"),
                func.cast(AssessmentAttempt.accuracy, Float).label("score"),
            )
            .where(
                func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
                AssessmentAttempt.accuracy.isnot(None),
            )
            .subquery()
        )
    elif scope == "practice":
        all_scores = (
            select(
                PracticeAttempt.user_id.label("user_id"),
                func.cast(PracticeAttempt.accuracy, Float).label("score"),
            )
            .where(
                func.upper(PracticeAttempt.status) == "COMPLETED",
                PracticeAttempt.accuracy.isnot(None),
            )
            .subquery()
        )
    else:
        assessment_scores = select(
            AssessmentAttempt.user_id.label("user_id"),
            func.cast(AssessmentAttempt.accuracy, Float).label("score"),
        ).where(
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
            AssessmentAttempt.accuracy.isnot(None),
        )
        practice_scores = select(
            PracticeAttempt.user_id.label("user_id"),
            func.cast(PracticeAttempt.accuracy, Float).label("score"),
        ).where(
            func.upper(PracticeAttempt.status) == "COMPLETED",
            PracticeAttempt.accuracy.isnot(None),
        )
        all_scores = union_all(assessment_scores, practice_scores).subquery()

    ranked_rows = await db.execute(
        select(
            User.id.label("user_id"),
            User.name.label("name"),
            User.roll_number.label("roll_number"),
            func.avg(all_scores.c.score).label("avg_score"),
            func.count(all_scores.c.score).label("attempt_count"),
        )
        .join(all_scores, all_scores.c.user_id == User.id)
        .where(User.role == "student", User.is_deleted.is_(False))
        .group_by(User.id, User.name, User.roll_number)
    )

    rows = [
        {
            "user_id": int(row.user_id),
            "name": row.name,
            "roll_number": row.roll_number,
            "average_score": round(float(row.avg_score or 0), 2),
            "attempts": int(row.attempt_count or 0),
        }
        for row in ranked_rows.all()
    ]
    rows.sort(key=lambda item: (-item["average_score"], -item["attempts"], item["user_id"]))
    return rows

# =====================================================
# 1️⃣ DASHBOARD ANALYTICS ENDPOINT
# =====================================================

@router.get("/", response_model=StudentDashboardResponse)
async def get_student_dashboard(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user["id"]
    current_user_row = (
        await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    ).scalar_one_or_none()
    if not current_user_row:
        raise HTTPException(status_code=404, detail="User not found")
    plan_cfg = get_plan_config(current_user_row.subscription_plan)

    # ================= TOTAL COMPLETED EXAMS =================
    assess_count = await db.scalar(
        select(func.count()).where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES)
        )
    )

    practice_count = await db.scalar(
        select(func.count()).where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED"
        )
    )

    total_exams = (assess_count or 0) + (practice_count or 0)

    # ================= AVERAGE SCORE =================
    assess_avg = await db.scalar(
        select(func.avg(AssessmentAttempt.accuracy)).where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES)
        )
    )

    practice_avg = await db.scalar(
        select(func.avg(PracticeAttempt.accuracy)).where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED"
        )
    )

    avg_values = [float(v) for v in [assess_avg, practice_avg] if v is not None]
    average_score = round(sum(avg_values) / len(avg_values), 2) if avg_values else 0

    # ================= HIGHEST SCORE =================
    assess_max = await db.scalar(
        select(func.max(AssessmentAttempt.accuracy)).where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES)
        )
    )

    practice_max = await db.scalar(
        select(func.max(PracticeAttempt.accuracy)).where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED"
        )
    )

    highest_score = max(assess_max or 0, practice_max or 0)

    # ================= PERFORMANCE OVERVIEW =================
    performance_overview: List[PerformancePoint] = []

    assess_perf = await db.execute(
        select(
            AssessmentAttempt.accuracy,
            AssessmentAttempt.completed_at,
            AssessmentCategory.title,
        )
        .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
        .where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
            AssessmentAttempt.completed_at.isnot(None)
        )
    )

    practice_perf = await db.execute(
        select(
            PracticeAttempt.accuracy,
            PracticeAttempt.completed_at,
            PracticeCategory.name,
        )
        .join(PracticeCategory, PracticeCategory.id == PracticeAttempt.category_id)
        .where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED",
            PracticeAttempt.completed_at.isnot(None)
        )
    )

    combined_perf = []

    for row in assess_perf.all():
        combined_perf.append((row.completed_at, row.accuracy, row.title))

    for row in practice_perf.all():
        combined_perf.append((row.completed_at, row.accuracy, row.name))

    combined_perf.sort(key=lambda x: x[0])

    for date, score, exam_label in combined_perf:
        performance_overview.append(
            PerformancePoint(
                label=str(exam_label or "Exam"),
                date=date.strftime("%d %b"),
                timestamp=date,
                score=float(score or 0)
            )
        )

    # ================= RECENT ACTIVITY =================
    recent_assessments: List[RecentAssessment] = []

    assess_recent = await db.execute(
        select(AssessmentAttempt, AssessmentCategory)
        .join(AssessmentCategory)
        .where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
            AssessmentAttempt.completed_at.isnot(None)
        )
        .order_by(desc(AssessmentAttempt.completed_at))
        .limit(5)
    )

    for attempt, category in assess_recent.all():
        recent_assessments.append(
            RecentAssessment(
                exam_name=category.title,
                date=attempt.completed_at,
                score=float(attempt.accuracy or 0),
                status=attempt.status
            )
        )

    # ================= SKILL PROFICIENCY =================
    skill_proficiency: List[SkillProficiency] = []

    assess_skills = await db.execute(
        select(
            AssessmentCategory.title,
            func.avg(AssessmentAttempt.accuracy)
        )
        .join(AssessmentAttempt)
        .where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES)
        )
        .group_by(AssessmentCategory.title)
    )

    for name, score in assess_skills.all():
        skill_proficiency.append(
            SkillProficiency(skill_name=name, score=round(float(score or 0), 2))
        )

    practice_skills = await db.execute(
        select(
            PracticeCategory.name,
            func.avg(PracticeAttempt.accuracy)
        )
        .join(PracticeAttempt)
        .where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED"
        )
        .group_by(PracticeCategory.name)
    )

    for name, score in practice_skills.all():
        skill_proficiency.append(
            SkillProficiency(skill_name=name, score=round(float(score or 0), 2))
        )

    programming_avg = await db.scalar(
        select(
            func.avg(
                (ProgrammingAttempt.score * 100.0) / func.nullif(ProgrammingAttempt.total, 0)
            )
        )
        .where(
            ProgrammingAttempt.user_id == user_id,
            func.upper(ProgrammingAttempt.status) == "COMPLETED",
            ProgrammingAttempt.total.isnot(None),
            ProgrammingAttempt.total > 0,
        )
    )

    if programming_avg is not None:
        skill_proficiency.append(
            SkillProficiency(skill_name="Programming", score=round(float(programming_avg), 2))
        )

    skill_proficiency.sort(key=lambda x: x.score, reverse=True)

    # ================= STUDENT RANK =================
    rank = None
    if plan_cfg.allow_leaderboard:
        assessment_scores = (
            select(
                AssessmentAttempt.user_id.label("user_id"),
                func.cast(AssessmentAttempt.accuracy, Float).label("score"),
            )
            .where(
                func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
                AssessmentAttempt.accuracy.isnot(None),
            )
        )
        practice_scores = (
            select(
                PracticeAttempt.user_id.label("user_id"),
                func.cast(PracticeAttempt.accuracy, Float).label("score"),
            )
            .where(
                func.upper(PracticeAttempt.status) == "COMPLETED",
                PracticeAttempt.accuracy.isnot(None),
            )
        )

        all_scores = union_all(assessment_scores, practice_scores).subquery()
        ranked_rows = await db.execute(
            select(
                User.id.label("user_id"),
                func.avg(all_scores.c.score).label("avg_score"),
                func.count(all_scores.c.score).label("attempt_count"),
            )
            .join(all_scores, all_scores.c.user_id == User.id)
            .where(User.role == "student", User.is_deleted.is_(False))
            .group_by(User.id)
        )

        leaderboard = [
            (
                int(row.user_id),
                float(row.avg_score or 0),
                int(row.attempt_count or 0),
            )
            for row in ranked_rows.all()
        ]

        leaderboard.sort(key=lambda item: (-item[1], -item[2], item[0]))
        for idx, (ranked_user_id, _, _) in enumerate(leaderboard, start=1):
            if ranked_user_id == user_id:
                rank = idx
                break

    return StudentDashboardResponse(
        total_exams=total_exams,
        average_score=average_score,
        highest_score=highest_score,
        overall_accuracy=average_score,
        rank=rank,
        performance_overview=performance_overview,
        recent_assessments=recent_assessments,
        skill_proficiency=skill_proficiency,
    )


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    scope: str = "all",
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user_row = (
        await db.execute(select(User).where(User.id == current_user["id"], User.is_deleted.is_(False)))
    ).scalar_one_or_none()
    if not current_user_row:
        raise HTTPException(status_code=404, detail="User not found")
    if not get_plan_config(current_user_row.subscription_plan).allow_leaderboard:
        raise HTTPException(status_code=403, detail="Upgrade to Pro or Premium to access leaderboard")

    normalized_scope = (scope or "all").strip().lower()
    if normalized_scope not in {"all", "assessment", "practice"}:
        raise HTTPException(status_code=400, detail="scope must be one of: all, assessment, practice")

    capped_limit = max(1, min(int(limit or 20), 100))
    ranked = await _build_leaderboard_rows(db, normalized_scope)

    my_rank = None
    entries: list[LeaderboardEntry] = []

    for idx, row in enumerate(ranked, start=1):
        is_current_user = row["user_id"] == int(current_user["id"])
        if is_current_user:
            my_rank = idx

        if idx <= capped_limit or is_current_user:
            entries.append(
                LeaderboardEntry(
                    rank=idx,
                    user_id=row["user_id"],
                    name=row["name"],
                    roll_number=row["roll_number"],
                    average_score=row["average_score"],
                    attempts=row["attempts"],
                    is_current_user=is_current_user,
                )
            )

    entries.sort(key=lambda item: item.rank)

    return LeaderboardResponse(
        scope=normalized_scope,
        total_students=len(ranked),
        my_rank=my_rank,
        entries=entries,
    )

# =====================================================
# 2️⃣ PERFORMANCE HISTORY (FULL + IN PROGRESS)
# =====================================================

@router.get("/performance")
async def get_performance_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user["id"]
    history = []

    # ================= ASSESSMENT HISTORY =================
    assess_query = await db.execute(
        select(AssessmentAttempt, AssessmentCategory)
        .join(AssessmentCategory)
        .where(
            AssessmentAttempt.user_id == user_id
        )
        .order_by(desc(AssessmentAttempt.started_at))
    )

    for attempt, category in assess_query.all():
        history.append({
            "id": attempt.id,
            "category_id": attempt.category_id,
            "exam_name": category.title,
            "type": "Assessment",
            "date": attempt.completed_at or attempt.started_at,
            "score": float(attempt.accuracy or 0)
                     if _is_assessment_final(attempt.status)
                     else None,
            "status": attempt.status.upper()
        })

    # ================= PRACTICE HISTORY =================
    practice_query = await db.execute(
        select(PracticeAttempt, PracticeCategory)
        .join(PracticeCategory)
        .where(
            PracticeAttempt.user_id == user_id
        )
        .order_by(desc(PracticeAttempt.started_at))
    )

    for attempt, category in practice_query.all():
        history.append({
            "id": attempt.id,
            "category_id": attempt.category_id,
            "exam_name": category.name,
            "type": "Practice",
            "date": attempt.completed_at or attempt.started_at,
            "score": float(attempt.accuracy or 0)
                     if _is_practice_final(attempt.status)
                     else None,
            "status": attempt.status.upper()
        })

    # ================= PROGRAMMING EXAM HISTORY =================
    programming_query = await db.execute(
        select(ProgrammingAttempt, ProgrammingExam)
        .join(ProgrammingExam, ProgrammingExam.id == ProgrammingAttempt.exam_id)
        .where(
            ProgrammingAttempt.user_id == user_id
        )
        .order_by(desc(ProgrammingAttempt.started_at))
    )

    for attempt, exam in programming_query.all():
        total = float(attempt.total or 0)
        score = float(attempt.score or 0)
        percentage = (score / total * 100.0) if total > 0 else 0.0
        is_final = (attempt.status or "").upper() in {"COMPLETED", "VIOLATION_SUBMITTED"}

        history.append({
            "id": attempt.id,
            "category_id": attempt.exam_id,
            "exam_name": exam.title,
            "type": "Programming",
            "date": attempt.completed_at or attempt.started_at,
            "score": percentage if is_final else None,
            "status": (attempt.status or "").upper() or "IN_PROGRESS"
        })

    # ================= SORT COMBINED =================
    history.sort(
        key=lambda x: x["date"] if x["date"] else 0,
        reverse=True
    )

    return {"attempts": history}


@router.get("/report-pdf")
async def download_student_report_pdf(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user["id"]
    user = (
        await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not get_plan_config(user.subscription_plan).allow_pdf_reports:
        raise HTTPException(status_code=403, detail="Upgrade to Premium to download PDF reports")

    assess_count = await db.scalar(
        select(func.count()).where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
        )
    ) or 0
    practice_count = await db.scalar(
        select(func.count()).where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED",
        )
    ) or 0
    total_exams = int(assess_count) + int(practice_count)

    assess_avg = await db.scalar(
        select(func.avg(AssessmentAttempt.accuracy)).where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
        )
    )
    practice_avg = await db.scalar(
        select(func.avg(PracticeAttempt.accuracy)).where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED",
        )
    )
    avg_values = [float(v) for v in [assess_avg, practice_avg] if v is not None]
    average_score = round(sum(avg_values) / len(avg_values), 2) if avg_values else 0.0

    assess_max = await db.scalar(
        select(func.max(AssessmentAttempt.accuracy)).where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
        )
    )
    practice_max = await db.scalar(
        select(func.max(PracticeAttempt.accuracy)).where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED",
        )
    )
    highest_score = max(float(assess_max or 0), float(practice_max or 0))

    # ================= RANK (same logic as dashboard) =================
    rank = None
    assessment_scores = (
        select(
            AssessmentAttempt.user_id.label("user_id"),
            func.cast(AssessmentAttempt.accuracy, Float).label("score"),
        )
        .where(
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
            AssessmentAttempt.accuracy.isnot(None),
        )
    )
    practice_scores = (
        select(
            PracticeAttempt.user_id.label("user_id"),
            func.cast(PracticeAttempt.accuracy, Float).label("score"),
        )
        .where(
            func.upper(PracticeAttempt.status) == "COMPLETED",
            PracticeAttempt.accuracy.isnot(None),
        )
    )
    all_scores = union_all(assessment_scores, practice_scores).subquery()
    ranked_rows = await db.execute(
        select(
            User.id.label("user_id"),
            func.avg(all_scores.c.score).label("avg_score"),
            func.count(all_scores.c.score).label("attempt_count"),
        )
        .join(all_scores, all_scores.c.user_id == User.id)
        .where(User.role == "student", User.is_deleted.is_(False))
        .group_by(User.id)
    )
    leaderboard = [
        (
            int(row.user_id),
            float(row.avg_score or 0),
            int(row.attempt_count or 0),
        )
        for row in ranked_rows.all()
    ]
    leaderboard.sort(key=lambda item: (-item[1], -item[2], item[0]))
    for idx, (ranked_user_id, _, _) in enumerate(leaderboard, start=1):
        if ranked_user_id == user_id:
            rank = idx
            break

    # ================= SKILL PROFICIENCY =================
    skill_scores: dict[str, list[float]] = {}

    assess_skill_rows = await db.execute(
        select(
            AssessmentCategory.title,
            func.avg(AssessmentAttempt.accuracy),
        )
        .join(AssessmentAttempt, AssessmentAttempt.category_id == AssessmentCategory.id)
        .where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
        )
        .group_by(AssessmentCategory.title)
    )
    for name, score in assess_skill_rows.all():
        if name not in skill_scores:
            skill_scores[name] = []
        skill_scores[name].append(float(score or 0))

    practice_skill_rows = await db.execute(
        select(
            PracticeCategory.name,
            func.avg(PracticeAttempt.accuracy),
        )
        .join(PracticeAttempt, PracticeAttempt.category_id == PracticeCategory.id)
        .where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED",
        )
        .group_by(PracticeCategory.name)
    )
    for name, score in practice_skill_rows.all():
        if name not in skill_scores:
            skill_scores[name] = []
        skill_scores[name].append(float(score or 0))

    skill_rows = [
        (skill_name, round(sum(values) / len(values), 2))
        for skill_name, values in skill_scores.items()
        if values
    ]
    skill_rows.sort(key=lambda item: item[1], reverse=True)

    recent_rows = []
    assess_recent = await db.execute(
        select(AssessmentCategory.title, AssessmentAttempt.accuracy, AssessmentAttempt.completed_at)
        .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
        .where(
            AssessmentAttempt.user_id == user_id,
            func.upper(AssessmentAttempt.status).in_(ASSESSMENT_FINAL_STATUSES),
            AssessmentAttempt.completed_at.isnot(None),
        )
    )
    for title, accuracy, completed_at in assess_recent.all():
        recent_rows.append(
            {
                "exam_name": title,
                "score": float(accuracy or 0),
                "date": completed_at,
                "type": "Assessment",
            }
        )

    practice_recent = await db.execute(
        select(PracticeCategory.name, PracticeAttempt.accuracy, PracticeAttempt.completed_at)
        .join(PracticeCategory, PracticeCategory.id == PracticeAttempt.category_id)
        .where(
            PracticeAttempt.user_id == user_id,
            func.upper(PracticeAttempt.status) == "COMPLETED",
            PracticeAttempt.completed_at.isnot(None),
        )
    )
    for name, accuracy, completed_at in practice_recent.all():
        recent_rows.append(
            {
                "exam_name": name,
                "score": float(accuracy or 0),
                "date": completed_at,
                "type": "Practice",
            }
        )

    # Keep an ordered subset for chart plotting.
    graph_rows = sorted(recent_rows, key=lambda item: item["date"])[-10:]

    recent_rows.sort(key=lambda item: item["date"], reverse=True)
    recent_rows = recent_rows[:12]

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 50

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(40, y, "Student Performance Report")
    y -= 24
    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, y, f"Generated: {datetime.utcnow().strftime('%d %b %Y %H:%M UTC')}")
    y -= 18
    pdf.drawString(40, y, f"Name: {user.name}")
    y -= 16
    pdf.drawString(40, y, f"Email: {user.email}")
    y -= 24

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, "Summary")
    y -= 18
    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, y, f"Total Completed Exams: {total_exams}")
    y -= 14
    pdf.drawString(50, y, f"Average Score: {average_score:.2f}%")
    y -= 14
    pdf.drawString(50, y, f"Highest Score: {highest_score:.2f}%")
    y -= 14
    pdf.drawString(50, y, f"Rank in Batch: #{rank}" if rank else "Rank in Batch: -")
    y -= 24

    # ================= SKILL PROFICIENCY =================
    if y < 190:
        pdf.showPage()
        y = height - 50

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, "Skill Proficiency")
    y -= 18

    if not skill_rows:
        pdf.setFont("Helvetica", 10)
        pdf.setFillColorRGB(0.45, 0.48, 0.54)
        pdf.drawString(50, y, "No skill proficiency data available yet.")
        y -= 18
    else:
        bar_left = 50
        bar_width = 280
        row_height = 18
        pdf.setFont("Helvetica", 9)

        for skill_name, score in skill_rows[:8]:
            if y < 80:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 9)
            safe_score = max(0.0, min(100.0, float(score)))
            pdf.setFillColorRGB(0.20, 0.24, 0.33)
            pdf.drawString(bar_left, y, str(skill_name)[:28])
            pdf.drawRightString(bar_left + bar_width + 70, y, f"{safe_score:.1f}%")

            # Track
            y_bar = y - 8
            pdf.setFillColorRGB(0.9, 0.92, 0.95)
            pdf.roundRect(bar_left, y_bar, bar_width, 8, 4, stroke=0, fill=1)
            # Fill
            pdf.setFillColorRGB(0.13, 0.36, 0.91)
            pdf.roundRect(bar_left, y_bar, bar_width * (safe_score / 100.0), 8, 4, stroke=0, fill=1)
            y -= row_height

        y -= 8

    # ================= PERFORMANCE GRAPH =================
    if y < 260:
        pdf.showPage()
        y = height - 50

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, "Performance Graph (Recent Attempts)")
    y -= 14

    chart_left = 50
    chart_bottom = y - 130
    chart_width = 500
    chart_height = 100

    pdf.setStrokeColorRGB(0.85, 0.87, 0.9)
    pdf.rect(chart_left, chart_bottom, chart_width, chart_height, stroke=1, fill=0)

    # Horizontal grid and Y labels (0-100%)
    for tick in [0, 25, 50, 75, 100]:
        ty = chart_bottom + (tick / 100) * chart_height
        pdf.setStrokeColorRGB(0.9, 0.92, 0.95)
        pdf.line(chart_left, ty, chart_left + chart_width, ty)
        pdf.setFillColorRGB(0.35, 0.4, 0.5)
        pdf.setFont("Helvetica", 8)
        pdf.drawRightString(chart_left - 6, ty - 2, str(tick))

    if graph_rows:
        points = []
        n = len(graph_rows)
        for idx, row in enumerate(graph_rows):
            score = max(0.0, min(100.0, float(row["score"])))
            px = chart_left + (chart_width * (idx / (n - 1 if n > 1 else 1)))
            py = chart_bottom + (score / 100.0) * chart_height
            points.append((px, py, row["date"].strftime("%d %b")))

        pdf.setStrokeColorRGB(0.13, 0.36, 0.91)
        pdf.setLineWidth(2)
        for i in range(1, len(points)):
            pdf.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])

        pdf.setFillColorRGB(0.13, 0.36, 0.91)
        for px, py, _ in points:
            pdf.circle(px, py, 2.2, stroke=0, fill=1)

        # Label first and last date on X axis for readability.
        pdf.setFillColorRGB(0.35, 0.4, 0.5)
        pdf.setFont("Helvetica", 8)
        pdf.drawString(points[0][0], chart_bottom - 12, points[0][2])
        if len(points) > 1:
            pdf.drawRightString(points[-1][0] + 30, chart_bottom - 12, points[-1][2])
    else:
        pdf.setFillColorRGB(0.45, 0.48, 0.54)
        pdf.setFont("Helvetica", 10)
        pdf.drawString(chart_left + 10, chart_bottom + chart_height / 2, "No completed attempts available for graph.")

    y = chart_bottom - 30

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, "Recent Completed Attempts")
    y -= 18
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(50, y, "Date")
    pdf.drawString(150, y, "Type")
    pdf.drawString(250, y, "Exam")
    pdf.drawString(520, y, "Score")
    y -= 14
    pdf.setFont("Helvetica", 10)

    if not recent_rows:
        pdf.drawString(50, y, "No completed attempts yet.")
    else:
        for row in recent_rows:
            if y < 60:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 10)
            date_text = row["date"].strftime("%d %b %Y")
            exam_text = str(row["exam_name"])[:42]
            pdf.drawString(50, y, date_text)
            pdf.drawString(150, y, row["type"])
            pdf.drawString(250, y, exam_text)
            pdf.drawRightString(560, y, f"{row['score']:.2f}%")
            y -= 14

    pdf.save()
    buffer.seek(0)

    safe_name = "".join(ch for ch in user.name.lower().replace(" ", "_") if ch.isalnum() or ch == "_") or "student"
    filename = f"{safe_name}_performance_report.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

