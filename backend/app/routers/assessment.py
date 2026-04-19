import json
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path
from typing import List

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
try:
    from PIL import Image, ImageOps
except Exception:  # pragma: no cover - optional runtime dependency
    Image = None
    ImageOps = None

from app.core.config import ALGORITHM, SECRET_KEY
from app.core.subscription import get_plan_config
from app.db.session import get_db
from app.models.assessment import (
    AssessmentAnswer,
    AssessmentAttempt,
    AssessmentCategory,
    AssessmentQuestion,
)
from app.models.user import User
from app.schemas.assessment import (
    AssessmentAttemptReview,
    AssessmentCategoryResponse,
    AssessmentCertificateItem,
    AssessmentProctoringEvent,
    AssessmentReviewQuestion,
    AssessmentQuestionResponse,
    AssessmentSessionResponse,
    AssessmentResult,
    AssessmentSubmit,
)
from app.services.notification_service import create_notification
from app.utils.attempt_limits import (
    calculate_attempts_left,
    has_attempts_remaining,
    normalize_attempt_limit,
)
from app.utils.exam_assignment import is_user_assigned_to_exam
from app.utils.jwt import get_current_user

router = APIRouter(prefix="/assessments", tags=["Assessments"])

VIOLATION_SUBMITTED = "VIOLATION_SUBMITTED"
PUBLISHED_STATUS = "PUBLISHED"
PASS_PERCENTAGE = 50.0
DEFAULT_ASSESSMENT_QUESTION_LIMIT = 60
SIGNATURE_IMAGE_CANDIDATES = (
    Path(__file__).resolve().parent.parent / "assets" / "certificate_signature.png",
    Path(__file__).resolve().parent.parent / "assets" / "certificate_signature.jpg",
    Path(__file__).resolve().parent.parent / "assets" / "certificate_signature.jpeg",
)


def _is_certificate_eligible(attempt: AssessmentAttempt) -> bool:
    if attempt.status != "COMPLETED":
        return False
    return float(attempt.accuracy or 0) >= PASS_PERCENTAGE


def _normalize_submission_reason(reason: str | None) -> str:
    normalized = (reason or "").strip().lower()
    if normalized in {"manual", "timeout", "violation"}:
        return normalized
    return "manual"


def _attempt_duration_minutes(
    attempt: AssessmentAttempt,
    category: AssessmentCategory | None = None,
) -> int:
    duration = int(getattr(attempt, "duration_minutes", 0) or 0)
    if duration > 0:
        return duration
    if category is not None:
        return max(1, int(category.duration or 0))
    return 60


def _attempt_deadline(
    attempt: AssessmentAttempt,
    category: AssessmentCategory | None = None,
) -> datetime | None:
    if attempt.started_at is None:
        return None
    return attempt.started_at + timedelta(minutes=_attempt_duration_minutes(attempt, category))


def _attempt_remaining_seconds(
    attempt: AssessmentAttempt,
    *,
    now: datetime | None = None,
    category: AssessmentCategory | None = None,
) -> int:
    deadline = _attempt_deadline(attempt, category)
    if deadline is None:
        return 0
    current_time = now or datetime.utcnow()
    return max(0, int((deadline - current_time).total_seconds()))


def _is_attempt_open(attempt: AssessmentAttempt) -> bool:
    return (
        str(attempt.status or "").upper() in {"IN_PROGRESS", "LIVE", "FLAGGED"}
        and attempt.completed_at is None
    )


def _record_proctoring_event(
    attempt: AssessmentAttempt,
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


async def _get_user(db: AsyncSession, user_id: int) -> User:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def _get_attempt_assignment_rows(
    db: AsyncSession,
    attempt_id: int,
) -> list[AssessmentAnswer]:
    return (
        await db.execute(
            select(AssessmentAnswer)
            .where(AssessmentAnswer.attempt_id == attempt_id)
            .order_by(AssessmentAnswer.question_order.asc(), AssessmentAnswer.id.asc())
        )
    ).scalars().all()


async def _bind_attempt_questions(
    db: AsyncSession,
    *,
    attempt: AssessmentAttempt,
    questions: list[AssessmentQuestion],
) -> list[AssessmentAnswer]:
    assignment_rows = await _get_attempt_assignment_rows(db, attempt.id)
    if assignment_rows:
        return assignment_rows

    for order_index, question in enumerate(questions, start=1):
        db.add(
            AssessmentAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                selected_option=0,
                is_correct=False,
                time_taken_seconds=0,
                question_order=order_index,
            )
        )
    await db.flush()
    return await _get_attempt_assignment_rows(db, attempt.id)


def _serialize_question_ids(question_ids: list[int]) -> str:
    return json.dumps([int(question_id) for question_id in question_ids])


async def _finalize_attempt(
    db: AsyncSession,
    *,
    attempt: AssessmentAttempt,
    category: AssessmentCategory,
    plan_cfg,
    submit_reason: str,
    question_ids: list[int] | None = None,
    answers: list[int] | None = None,
    question_times: list[int] | None = None,
) -> AssessmentResult:
    normalized_submit_reason = _normalize_submission_reason(submit_reason)
    requested_question_ids = list(question_ids or [])
    requested_answers = list(answers or [])
    requested_question_times = list(question_times or [])
    assignment_rows = await _get_attempt_assignment_rows(db, attempt.id)
    if not assignment_rows:
        if normalized_submit_reason == "timeout":
            attempt.score = 0
            attempt.total = 0
            attempt.accuracy = 0
            attempt.submit_reason = normalized_submit_reason
            attempt.status = "COMPLETED"
            attempt.completed_at = datetime.utcnow()
            await db.commit()
            await db.refresh(attempt)
            await create_notification(
                db,
                user_id=attempt.user_id,
                title="Assessment auto-submitted",
                message=f"Your assessment '{category.title}' was auto-submitted because the time expired.",
                notification_type="warning",
                link=f"/assessment/result?attempt={attempt.id}",
            )
            await db.commit()
            return AssessmentResult(
                attempt_id=attempt.id,
                score=0,
                total=0,
                percentage=0,
                correct_answers=0,
                wrong_answers=0,
                certificate_eligible=False,
                certificate_download_url=None,
            )
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: no server-side question assignment found for this attempt",
        )

    assigned_question_ids = [int(row.question_id) for row in assignment_rows]
    if len(requested_answers) != len(assigned_question_ids):
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: submitted answer count does not match the assigned questions",
        )
    if requested_question_times is not None and len(requested_question_times) != len(assigned_question_ids):
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: submitted timing count does not match the assigned questions",
        )
    if requested_question_ids != assigned_question_ids:
        submitted_unique_ids = set(requested_question_ids)
        assigned_unique_ids = set(assigned_question_ids)
        if len(requested_question_ids) != len(set(requested_question_ids)):
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

    if not requested_question_times:
        requested_question_times = [0] * len(assigned_question_ids)

    questions = (
        await db.execute(
            select(AssessmentQuestion).where(AssessmentQuestion.id.in_(assigned_question_ids))
        )
    ).scalars().all()
    if len(questions) != len(assigned_question_ids):
        raise HTTPException(
            status_code=400,
            detail="Invalid submission: assigned questions could not be resolved on the server",
        )
    question_map = {question.id: question for question in questions}
    ordered_questions = [question_map[question_id] for question_id in assigned_question_ids]

    score = 0
    total = 0
    correct_answers = 0

    for assignment_row, question, selected, time_taken_seconds in zip(
        assignment_rows,
        ordered_questions,
        requested_answers,
        requested_question_times,
    ):
        marks = int(question.marks or 0)
        total += marks
        selected_option = int(selected or 0)
        is_correct = selected_option == int(question.correct_option or 0)
        if is_correct:
            score += marks
            correct_answers += 1
        assignment_row.selected_option = selected_option
        assignment_row.is_correct = is_correct
        assignment_row.time_taken_seconds = max(0, int(time_taken_seconds or 0))

    percentage = (score / total) * 100 if total > 0 else 0
    wrong_answers = max(0, len(ordered_questions) - correct_answers)
    attempt.score = score
    attempt.total = total
    attempt.accuracy = round(percentage, 2)
    attempt.submit_reason = normalized_submit_reason
    attempt.status = (
        VIOLATION_SUBMITTED if normalized_submit_reason == "violation" else "COMPLETED"
    )
    attempt.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(attempt)
    await create_notification(
        db,
        user_id=attempt.user_id,
        title="Assessment result available",
        message=(
            f"Your assessment '{category.title}' was submitted via "
            f"{'timeout' if normalized_submit_reason == 'timeout' else 'manual submission'}. "
            f"Score: {round(percentage, 2)}%."
        ),
        notification_type="success" if normalized_submit_reason == "manual" else "warning",
        link=f"/assessment/result?attempt={attempt.id}",
    )
    await db.commit()

    certificate_eligible = (
        plan_cfg.allow_certificates
        and bool(attempt.certificate_issued_by_admin)
        and _is_certificate_eligible(attempt)
    )

    return AssessmentResult(
        attempt_id=attempt.id,
        score=score,
        total=total,
        percentage=round(percentage, 2),
        correct_answers=correct_answers,
        wrong_answers=wrong_answers,
        certificate_eligible=certificate_eligible,
        certificate_download_url=(
            f"/assessments/certificates/{attempt.id}/download" if certificate_eligible else None
        ),
    )


async def _auto_submit_if_expired(
    db: AsyncSession,
    *,
    attempt: AssessmentAttempt,
    category: AssessmentCategory,
    plan_cfg,
) -> tuple[bool, AssessmentResult | None]:
    if not _is_attempt_open(attempt):
        return False, None
    if _attempt_remaining_seconds(attempt, category=category) > 0:
        return False, None
    result = await _finalize_attempt(
        db,
        attempt=attempt,
        category=category,
        plan_cfg=plan_cfg,
        submit_reason="timeout",
    )
    return True, result


def _build_certificate_token(attempt: AssessmentAttempt) -> str:
    payload = {
        "typ": "certificate",
        "attempt_id": attempt.id,
        "sub": str(attempt.user_id),
        "iat": int(datetime.utcnow().timestamp()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _build_certificate_pdf(
    *,
    student_name: str,
    roll_number: str,
    assessment_title: str,
    percentage: float,
    score: int,
    total: int,
    completed_at: datetime | None,
    verify_url: str,
):
    buffer = BytesIO()
    page = landscape(A4)
    pdf = canvas.Canvas(buffer, pagesize=page)
    width, height = page

    def draw_center_fitted(text: str, y: float, *, font_name: str, max_size: int, min_size: int, max_width: float):
        size = max_size
        while size > min_size and pdf.stringWidth(text, font_name, size) > max_width:
            size -= 1
        pdf.setFont(font_name, size)
        pdf.drawCentredString(width / 2, y, text)

    def draw_signature_mark(x: float, y: float):
        # Draw a simple vector signature flourish so no external asset is required.
        path = pdf.beginPath()
        path.moveTo(x, y)
        path.curveTo(x + 22, y + 18, x + 44, y - 8, x + 64, y + 10)
        path.curveTo(x + 88, y + 30, x + 112, y - 14, x + 136, y + 7)
        path.curveTo(x + 156, y + 22, x + 176, y + 2, x + 196, y + 9)
        pdf.setLineWidth(1.8)
        pdf.setStrokeColor(colors.HexColor("#0f2f6b"))
        pdf.drawPath(path, stroke=1, fill=0)

    def get_signature_image_reader() -> ImageReader | None:
        source = next((p for p in SIGNATURE_IMAGE_CANDIDATES if p.exists()), None)
        if not source:
            return None
        if Image is None or ImageOps is None:
            return ImageReader(str(source))
        img = Image.open(source)
        img = ImageOps.exif_transpose(img).convert("RGBA")

        # The uploaded signature image may be portrait; rotate to fit certificate signature area.
        if img.height > int(img.width * 1.2):
            img = img.rotate(90, expand=True)

        pixels = img.load()
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = pixels[x, y]
                if r >= 245 and g >= 245 and b >= 245:
                    pixels[x, y] = (r, g, b, 0)
                else:
                    pixels[x, y] = (r, g, b, min(255, a + 20))
        out = BytesIO()
        img.save(out, format="PNG")
        out.seek(0)
        return ImageReader(out)

    def draw_corner_bands():
        # Small corner accents only (avoid crossing body content)
        pdf.setFillColor(colors.HexColor("#082a62"))
        p1 = pdf.beginPath()
        p1.moveTo(width, height)
        p1.lineTo(width - 92, height)
        p1.lineTo(width, height - 92)
        p1.close()
        pdf.drawPath(p1, stroke=0, fill=1)
        pdf.setFillColor(colors.HexColor("#d39a2c"))
        p2 = pdf.beginPath()
        p2.moveTo(width - 26, height)
        p2.lineTo(width - 110, height)
        p2.lineTo(width, height - 110)
        p2.lineTo(width, height - 26)
        p2.close()
        pdf.drawPath(p2, stroke=0, fill=1)

        # Bottom-left accent
        pdf.setFillColor(colors.HexColor("#082a62"))
        p3 = pdf.beginPath()
        p3.moveTo(0, 0)
        p3.lineTo(92, 0)
        p3.lineTo(0, 92)
        p3.close()
        pdf.drawPath(p3, stroke=0, fill=1)
        pdf.setFillColor(colors.HexColor("#d39a2c"))
        p4 = pdf.beginPath()
        p4.moveTo(26, 0)
        p4.lineTo(110, 0)
        p4.lineTo(0, 110)
        p4.lineTo(0, 26)
        p4.close()
        pdf.drawPath(p4, stroke=0, fill=1)

    def draw_certified_badge(cx: float, cy: float):
        pdf.setFillColor(colors.HexColor("#f7d58a"))
        pdf.circle(cx, cy, 38, stroke=0, fill=1)
        pdf.setStrokeColor(colors.HexColor("#a66d12"))
        pdf.setLineWidth(2)
        pdf.circle(cx, cy, 38, stroke=1, fill=0)
        pdf.setFillColor(colors.HexColor("#0f2f6b"))
        pdf.circle(cx, cy, 30, stroke=0, fill=1)
        pdf.setStrokeColor(colors.HexColor("#f3c768"))
        pdf.setLineWidth(1)
        pdf.circle(cx, cy, 25, stroke=1, fill=0)
        pdf.setFont("Helvetica-Bold", 7)
        pdf.setFillColor(colors.HexColor("#f7ddb0"))
        pdf.drawCentredString(cx, cy + 2, "CERTIFIED")
        pdf.setFillColor(colors.HexColor("#f3c768"))
        pdf.drawCentredString(cx, cy - 9, "* * *")

    def draw_score_ribbon(text: str, y: float):
        left = width / 2 - 130
        right = width / 2 + 130
        top = y + 13
        bottom = y - 13
        pdf.setFillColor(colors.HexColor("#f1d49a"))
        ribbon = pdf.beginPath()
        ribbon.moveTo(left, top)
        ribbon.lineTo(right, top)
        ribbon.lineTo(right - 14, bottom)
        ribbon.lineTo(left + 14, bottom)
        ribbon.close()
        pdf.drawPath(ribbon, stroke=0, fill=1)
        pdf.setStrokeColor(colors.HexColor("#c28a20"))
        pdf.setLineWidth(0.8)
        pdf.line(left + 8, top - 3, right - 8, top - 3)
        pdf.setFont("Helvetica-Bold", 19)
        pdf.setFillColor(colors.HexColor("#0f2f6b"))
        pdf.drawCentredString(width / 2, y - 6, text)

    def draw_footer_ornament():
        y = 45
        pdf.setStrokeColor(colors.HexColor("#b37a13"))
        pdf.setLineWidth(1.2)
        pdf.line(width / 2 - 130, y, width / 2 - 40, y)
        pdf.line(width / 2 + 40, y, width / 2 + 130, y)
        p = pdf.beginPath()
        p.moveTo(width / 2 - 40, y)
        p.curveTo(width / 2 - 20, y + 10, width / 2 + 20, y - 10, width / 2 + 40, y)
        p.moveTo(width / 2 - 18, y)
        p.curveTo(width / 2 - 8, y + 6, width / 2 + 8, y + 6, width / 2 + 18, y)
        pdf.drawPath(p, stroke=1, fill=0)

    def draw_soft_seal(cx: float, cy: float, radius: float):
        pdf.setStrokeColor(colors.HexColor("#e8dcc8"))
        pdf.setLineWidth(1)
        pdf.circle(cx, cy, radius, stroke=1, fill=0)
        pdf.circle(cx, cy, radius - 10, stroke=1, fill=0)
        pdf.setFont("Helvetica-Bold", 18)
        pdf.setFillColor(colors.HexColor("#efe7db"))
        pdf.drawCentredString(cx, cy - 7, "CERTIFIED")

    # Background and theme accents
    pdf.setFillColor(colors.HexColor("#fcfbf7"))
    pdf.rect(0, 0, width, height, stroke=0, fill=1)
    draw_corner_bands()

    # Decorative double border
    pdf.setStrokeColor(colors.HexColor("#1f2937"))
    pdf.setLineWidth(2.2)
    pdf.rect(18, 18, width - 36, height - 36, stroke=1, fill=0)
    pdf.setStrokeColor(colors.HexColor("#c68b1d"))
    pdf.setLineWidth(1.2)
    pdf.rect(28, 28, width - 56, height - 56, stroke=1, fill=0)

    # Header
    pdf.setFillColor(colors.HexColor("#031b47"))
    draw_center_fitted(
        "CERTIFICATE OF ACHIEVEMENT",
        height - 112,
        font_name="Helvetica-Bold",
        max_size=38,
        min_size=28,
        max_width=width - 280,
    )
    pdf.setStrokeColor(colors.HexColor("#d0a050"))
    pdf.setLineWidth(0.9)
    pdf.line(200, height - 126, width - 160, height - 126)
    pdf.setFont("Helvetica", 17)
    pdf.setFillColor(colors.HexColor("#596883"))
    pdf.drawCentredString(width / 2, height - 152, "ONLINE EXAMINATION SYSTEM")

    # Body
    pdf.setFont("Helvetica", 21)
    pdf.setFillColor(colors.HexColor("#1f2937"))
    pdf.drawCentredString(width / 2, height - 194, "This certifies that")
    pdf.setFillColor(colors.HexColor("#050e26"))
    draw_center_fitted(
        student_name,
        height - 252,
        font_name="Helvetica-Bold",
        max_size=46,
        min_size=28,
        max_width=width - 380,
    )
    pdf.setStrokeColor(colors.HexColor("#b67e18"))
    pdf.setLineWidth(1.2)
    pdf.line(225, height - 272, width - 165, height - 272)
    pdf.setFont("Helvetica", 18)
    pdf.setFillColor(colors.HexColor("#343c4a"))
    pdf.drawCentredString(width / 2, height - 302, f"Roll Number: {roll_number}")
    pdf.setFont("Helvetica", 19)
    pdf.drawCentredString(width / 2, height - 336, "has successfully passed the assessment")
    pdf.setFillColor(colors.HexColor("#0d152b"))
    draw_center_fitted(
        f"\"{assessment_title}\"",
        height - 374,
        font_name="Helvetica-Bold",
        max_size=30,
        min_size=18,
        max_width=width - 300,
    )
    draw_score_ribbon(f"Score: {percentage:.2f}% ({score}/{total})", height - 412)

    completed_label = (
        completed_at.strftime("%d %b %Y, %H:%M UTC")
        if completed_at
        else datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")
    )
    pdf.setFont("Helvetica", 17)
    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.drawCentredString(width / 2, 125, f"Issued on: {completed_label}")
    pdf.setFont("Helvetica", 16)
    pdf.setFillColor(colors.HexColor("#1f365f"))
    pdf.drawCentredString(width / 2, 98, "Scan the QR code to verify this certificate.")
    draw_soft_seal(width / 2, 65, 26)

    qr_img = qrcode.make(verify_url)
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    # QR block (left side)
    qr_box_x = 82
    qr_box_y = 84
    qr_box_size = 112
    pdf.setStrokeColor(colors.HexColor("#c68b1d"))
    pdf.setLineWidth(1.4)
    pdf.rect(qr_box_x - 12, qr_box_y - 12, qr_box_size + 24, qr_box_size + 24, stroke=1, fill=0)
    pdf.drawImage(ImageReader(qr_buffer), qr_box_x, qr_box_y, width=qr_box_size, height=qr_box_size, mask="auto")
    pdf.setFont("Helvetica-Bold", 13)
    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.drawCentredString(qr_box_x + qr_box_size / 2, qr_box_y - 24, "VERIFY CERTIFICATE")

    # Digital signature block (right side)
    sig_left = width - 250
    sig_line_y = 95
    pdf.setStrokeColor(colors.HexColor("#c68b1d"))
    pdf.setLineWidth(1.1)
    pdf.line(sig_left, sig_line_y, width - 58, sig_line_y)
    signature_reader = get_signature_image_reader()
    if signature_reader:
        pdf.drawImage(
            signature_reader,
            sig_left + 6,
            sig_line_y + 2,
            width=190,
            height=48,
            mask="auto",
            preserveAspectRatio=True,
            anchor="sw",
        )
    else:
        draw_signature_mark(sig_left + 2, sig_line_y + 16)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.setFillColor(colors.HexColor("#2563eb"))
    pdf.drawString(sig_left, sig_line_y + 66, "VERIFIED E-SIGNATURE")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.drawString(sig_left, sig_line_y + 45, "Digitally Signed")
    pdf.setStrokeColor(colors.HexColor("#c68b1d"))
    pdf.setLineWidth(1)
    pdf.line(sig_left, sig_line_y, width - 58, sig_line_y)
    pdf.setFont("Helvetica-Bold", 15)
    pdf.setFillColor(colors.HexColor("#1d4ed8"))
    pdf.drawString(sig_left, sig_line_y - 19, "Examination Controller")
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#1f2937"))
    pdf.drawString(sig_left, sig_line_y - 38, "Authorized Signatory")
    pdf.drawString(sig_left, sig_line_y - 55, "Online Examination System")
    pdf.setFont("Helvetica", 9)
    pdf.setFillColor(colors.HexColor("#64748b"))
    certificate_id = verify_url.rstrip("/").split("/")[-1][:16]
    pdf.drawString(sig_left, sig_line_y - 76, f"Certificate ID: {certificate_id}")
    draw_footer_ornament()

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer


@router.get("/", response_model=List[AssessmentCategoryResponse])
async def get_assessments(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(AssessmentCategory).where(
                func.upper(AssessmentCategory.exam_type) == "ASSESSMENT",
                func.upper(AssessmentCategory.status) == PUBLISHED_STATUS,
            )
        )
    ).scalars().all()

    visible: list[AssessmentCategory] = []
    for category in rows:
        if await is_user_assigned_to_exam(db, category.id, current_user["id"]):
            visible.append(category)

    out: list[AssessmentCategoryResponse] = []
    for category in visible:
        attempts_used = await db.scalar(
            select(func.count()).select_from(AssessmentAttempt).where(
                AssessmentAttempt.user_id == current_user["id"],
                AssessmentAttempt.category_id == category.id,
            )
        ) or 0
        attempt_limit = normalize_attempt_limit(category.attempt_limit)
        attempts_left = calculate_attempts_left(attempt_limit, attempts_used)
        limit_reached = not has_attempts_remaining(attempt_limit, attempts_used)
        out.append(
            AssessmentCategoryResponse(
                id=category.id,
                title=category.title,
                description=category.description or "",
                duration=category.duration,
                total_marks=category.total_marks,
                attempt_limit=attempt_limit,
                attempts_used=int(attempts_used),
                attempts_left=attempts_left,
                limit_reached=limit_reached,
            )
        )
    return out


@router.get("/{category_id}/questions", response_model=List[AssessmentQuestionResponse])
async def get_questions(
    category_id: int,
    limit: int | None = None,
    attempt_id: int | None = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    category = (
        await db.execute(
            select(AssessmentCategory).where(
                AssessmentCategory.id == category_id,
                func.upper(AssessmentCategory.exam_type) == "ASSESSMENT",
                func.upper(AssessmentCategory.status) == PUBLISHED_STATUS,
            )
        )
    ).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if not await is_user_assigned_to_exam(db, category_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="This exam is not assigned to you")

    if attempt_id is not None:
        user = await _get_user(db, current_user["id"])
        attempt = (
            await db.execute(
                select(AssessmentAttempt).where(
                    AssessmentAttempt.id == attempt_id,
                    AssessmentAttempt.user_id == current_user["id"],
                    AssessmentAttempt.category_id == category_id,
                )
            )
        ).scalar_one_or_none()
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")
        expired, _ = await _auto_submit_if_expired(
            db,
            attempt=attempt,
            category=category,
            plan_cfg=get_plan_config(user.subscription_plan),
        )
        if expired:
            raise HTTPException(status_code=409, detail="Assessment time has expired")
        assignment_rows = await _get_attempt_assignment_rows(db, attempt.id)
        if assignment_rows:
            assigned_question_ids = [int(row.question_id) for row in assignment_rows]
            question_rows = (
                await db.execute(
                    select(AssessmentQuestion).where(AssessmentQuestion.id.in_(assigned_question_ids))
                )
            ).scalars().all()
            question_map = {question.id: question for question in question_rows}
            questions = [
                question_map[question_id]
                for question_id in assigned_question_ids
                if question_id in question_map
            ]
        else:
            query = (
                select(AssessmentQuestion)
                .where(AssessmentQuestion.category_id == category_id)
                .order_by(func.random())
            )
            if limit:
                query = query.limit(limit)
            questions = (await db.execute(query)).scalars().all()
            if questions:
                attempt.assigned_question_ids = _serialize_question_ids(
                    [int(question.id) for question in questions]
                )
                await _bind_attempt_questions(db, attempt=attempt, questions=questions)
                await db.commit()
    else:
        query = (
            select(AssessmentQuestion)
            .where(AssessmentQuestion.category_id == category_id)
            .order_by(func.random())
        )
        if limit:
            query = query.limit(limit)
        questions = (await db.execute(query)).scalars().all()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found")

    return [
        AssessmentQuestionResponse(
            id=q.id,
            question_text=q.question_text,
            options=[q.option_1, q.option_2, q.option_3, q.option_4],
        )
        for q in questions
    ]


@router.post("/start/{category_id}")
async def start_assessment(
    category_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user(db, current_user["id"])
    plan_cfg = get_plan_config(user.subscription_plan)

    category = (
        await db.execute(
            select(AssessmentCategory).where(
                AssessmentCategory.id == category_id,
                func.upper(AssessmentCategory.exam_type) == "ASSESSMENT",
                func.upper(AssessmentCategory.status) == PUBLISHED_STATUS,
            )
        )
    ).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if not await is_user_assigned_to_exam(db, category_id, current_user["id"]):
        raise HTTPException(status_code=403, detail="This exam is not assigned to you")

    open_attempt = (
        await db.execute(
            select(AssessmentAttempt).where(
                AssessmentAttempt.user_id == current_user["id"],
                AssessmentAttempt.category_id == category_id,
                func.upper(AssessmentAttempt.status).in_(["IN_PROGRESS", "LIVE", "FLAGGED"]),
                AssessmentAttempt.completed_at.is_(None),
            ).order_by(AssessmentAttempt.started_at.desc())
        )
    ).scalars().first()
    if open_attempt:
        expired, _ = await _auto_submit_if_expired(
            db,
            attempt=open_attempt,
            category=category,
            plan_cfg=plan_cfg,
        )
        if not expired:
            assignment_rows = await _get_attempt_assignment_rows(db, open_attempt.id)
            assigned_question_ids = [int(row.question_id) for row in assignment_rows]
            question_rows = (
                await db.execute(
                    select(AssessmentQuestion).where(AssessmentQuestion.id.in_(assigned_question_ids))
                )
            ).scalars().all() if assigned_question_ids else []
            question_map = {question.id: question for question in question_rows}
            questions = [
                AssessmentQuestionResponse(
                    id=question_map[question_id].id,
                    question_text=question_map[question_id].question_text,
                    options=[
                        question_map[question_id].option_1,
                        question_map[question_id].option_2,
                        question_map[question_id].option_3,
                        question_map[question_id].option_4,
                    ],
                )
                for question_id in assigned_question_ids
                if question_id in question_map
            ]
            return {
                "attempt_id": open_attempt.id,
                "resumed": True,
                "started_at": open_attempt.started_at.isoformat() if open_attempt.started_at else None,
                "duration_minutes": _attempt_duration_minutes(open_attempt, category),
                "remaining_seconds": _attempt_remaining_seconds(open_attempt, category=category),
                "questions": questions,
            }

    if plan_cfg.assessment_limit_per_month is not None:
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_attempts = await db.scalar(
            select(func.count()).select_from(AssessmentAttempt).where(
                AssessmentAttempt.user_id == current_user["id"],
                AssessmentAttempt.started_at >= month_start,
            )
        ) or 0
        if int(monthly_attempts) >= int(plan_cfg.assessment_limit_per_month):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"{user.subscription_plan} plan limit reached. "
                    f"You can attempt up to {plan_cfg.assessment_limit_per_month} assessments per month."
                ),
            )

    used_attempts = await db.scalar(
        select(func.count()).select_from(AssessmentAttempt).where(
            AssessmentAttempt.user_id == current_user["id"],
            AssessmentAttempt.category_id == category_id,
        )
    ) or 0
    attempt_limit = normalize_attempt_limit(category.attempt_limit)
    if not has_attempts_remaining(attempt_limit, used_attempts):
        raise HTTPException(
            status_code=403,
            detail=f"Attempt limit reached ({attempt_limit}). You cannot retake this exam.",
        )

    attempt = AssessmentAttempt(
        user_id=current_user["id"],
        category_id=category_id,
        score=0,
        total=0,
        accuracy=0,
        status="IN_PROGRESS",
        started_at=datetime.utcnow(),
        duration_minutes=max(1, int(category.duration or 0)),
    )
    db.add(attempt)
    await db.flush()

    selected_questions = (
        await db.execute(
            select(AssessmentQuestion)
            .where(AssessmentQuestion.category_id == category_id)
            .order_by(func.random())
            .limit(DEFAULT_ASSESSMENT_QUESTION_LIMIT)
        )
    ).scalars().all()
    if not selected_questions:
        raise HTTPException(status_code=404, detail="No questions found")

    attempt.assigned_question_ids = _serialize_question_ids(
        [int(question.id) for question in selected_questions]
    )
    await _bind_attempt_questions(db, attempt=attempt, questions=selected_questions)
    await db.commit()
    await db.refresh(attempt)
    return {
        "attempt_id": attempt.id,
        "resumed": False,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "duration_minutes": _attempt_duration_minutes(attempt, category),
        "remaining_seconds": _attempt_remaining_seconds(attempt, category=category),
        "questions": [
            AssessmentQuestionResponse(
                id=question.id,
                question_text=question.question_text,
                options=[question.option_1, question.option_2, question.option_3, question.option_4],
            )
            for question in selected_questions
        ],
    }


@router.get("/attempts/{attempt_id}/session", response_model=AssessmentSessionResponse)
async def get_assessment_session(
    attempt_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user(db, current_user["id"])
    row = (
        await db.execute(
            select(AssessmentAttempt, AssessmentCategory)
            .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
            .where(AssessmentAttempt.id == attempt_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt, category = row
    if attempt.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    auto_submitted, _ = await _auto_submit_if_expired(
        db,
        attempt=attempt,
        category=category,
        plan_cfg=get_plan_config(user.subscription_plan),
    )
    if auto_submitted:
        row = (
            await db.execute(
                select(AssessmentAttempt, AssessmentCategory)
                .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
                .where(AssessmentAttempt.id == attempt_id)
            )
        ).first()
        attempt, category = row

    remaining_seconds = _attempt_remaining_seconds(attempt, category=category)
    return AssessmentSessionResponse(
        attempt_id=attempt.id,
        category_id=category.id,
        assessment_title=category.title,
        status=str(attempt.status or "").upper(),
        started_at=attempt.started_at.isoformat() if attempt.started_at else None,
        duration_minutes=_attempt_duration_minutes(attempt, category),
        remaining_seconds=remaining_seconds,
        expired=remaining_seconds <= 0,
        auto_submitted=auto_submitted,
    )


@router.post("/attempts/{attempt_id}/proctoring")
async def report_assessment_proctoring_event(
    attempt_id: int,
    payload: AssessmentProctoringEvent,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    attempt = (
        await db.execute(
            select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
        )
    ).scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
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


@router.post("/submit", response_model=AssessmentResult)
async def submit_assessment(
    data: AssessmentSubmit,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user(db, current_user["id"])
    plan_cfg = get_plan_config(user.subscription_plan)

    attempt = (
        await db.execute(
            select(AssessmentAttempt).where(AssessmentAttempt.id == data.attempt_id)
        )
    ).scalar_one_or_none()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if attempt.status in {"COMPLETED", VIOLATION_SUBMITTED}:
        raise HTTPException(status_code=400, detail="Already submitted")
    category = (
        await db.execute(
            select(AssessmentCategory).where(AssessmentCategory.id == attempt.category_id)
        )
    ).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Assessment not found")

    submit_reason = _normalize_submission_reason(data.submit_reason)
    if _attempt_remaining_seconds(attempt, category=category) <= 0:
        submit_reason = "timeout"

    return await _finalize_attempt(
        db,
        attempt=attempt,
        category=category,
        plan_cfg=plan_cfg,
        submit_reason=submit_reason,
        question_ids=data.question_ids,
        answers=data.answers,
        question_times=data.question_times,
    )


@router.get("/attempts/{attempt_id}/review", response_model=AssessmentAttemptReview)
async def get_attempt_review(
    attempt_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user(db, current_user["id"])

    row = (
        await db.execute(
            select(AssessmentAttempt, AssessmentCategory)
            .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
            .where(AssessmentAttempt.id == attempt_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt, category = row
    if attempt.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    answer_rows = (
        await db.execute(
            select(AssessmentAnswer, AssessmentQuestion)
            .join(AssessmentQuestion, AssessmentQuestion.id == AssessmentAnswer.question_id)
            .where(AssessmentAnswer.attempt_id == attempt.id)
            .order_by(AssessmentAnswer.question_order.asc(), AssessmentAnswer.id.asc())
        )
    ).all()

    review_questions: list[AssessmentReviewQuestion] = []
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
            AssessmentReviewQuestion(
                id=question.id,
                order=int(answer.question_order or fallback_index),
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

    certificate_eligible = (
        get_plan_config(user.subscription_plan).allow_certificates
        and bool(attempt.certificate_issued_by_admin)
        and _is_certificate_eligible(attempt)
    )

    return AssessmentAttemptReview(
        attempt_id=attempt.id,
        category_id=category.id,
        assessment_title=category.title,
        status=str(attempt.status or "").upper(),
        submission_reason=_normalize_submission_reason(attempt.submit_reason),
        started_at=attempt.started_at.isoformat() if attempt.started_at else None,
        completed_at=attempt.completed_at.isoformat() if attempt.completed_at else None,
        score=int(attempt.score or 0),
        total=int(attempt.total or 0),
        percentage=round(float(attempt.accuracy or 0), 2),
        correct_answers=correct_answers,
        wrong_answers=max(0, len(review_questions) - correct_answers),
        certificate_eligible=certificate_eligible,
        certificate_download_url=(
            f"/assessments/certificates/{attempt.id}/download" if certificate_eligible else None
        ),
        questions=review_questions,
    )


@router.get("/certificates", response_model=List[AssessmentCertificateItem])
async def list_my_certificates(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user(db, current_user["id"])
    if not get_plan_config(user.subscription_plan).allow_certificates:
        raise HTTPException(status_code=403, detail="Upgrade to Pro or Premium to access certificates")

    rows = (
        await db.execute(
            select(AssessmentAttempt, AssessmentCategory)
            .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
            .where(
                AssessmentAttempt.user_id == current_user["id"],
                AssessmentAttempt.status == "COMPLETED",
                AssessmentAttempt.completed_at.is_not(None),
                AssessmentAttempt.accuracy >= PASS_PERCENTAGE,
                AssessmentAttempt.certificate_issued_by_admin.is_(True),
            )
            .order_by(AssessmentAttempt.completed_at.desc())
        )
    ).all()

    return [
        AssessmentCertificateItem(
            attempt_id=attempt.id,
            category_id=category.id,
            assessment_title=category.title,
            percentage=float(attempt.accuracy or 0),
            score=int(attempt.score or 0),
            total=int(attempt.total or 0),
            completed_at=attempt.completed_at.isoformat() if attempt.completed_at else "",
            certificate_id=(token := _build_certificate_token(attempt))[:16],
            verify_url=str(request.url_for("verify_certificate", token=token)),
        )
        for attempt, category in rows
    ]


@router.get("/certificates/{attempt_id}/download")
async def download_my_certificate(
    attempt_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user_obj = await _get_user(db, current_user["id"])
    if not get_plan_config(current_user_obj.subscription_plan).allow_certificates:
        raise HTTPException(status_code=403, detail="Upgrade to Pro or Premium to download certificates")

    row = (
        await db.execute(
            select(AssessmentAttempt, AssessmentCategory, User)
            .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
            .join(User, User.id == AssessmentAttempt.user_id)
            .where(AssessmentAttempt.id == attempt_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt, category, user = row
    if attempt.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not _is_certificate_eligible(attempt):
        raise HTTPException(status_code=400, detail="Certificate not available for this attempt")
    if not bool(attempt.certificate_issued_by_admin):
        raise HTTPException(status_code=403, detail="Certificate is pending admin approval")

    token = _build_certificate_token(attempt)
    verify_url = str(request.url_for("verify_certificate", token=token))
    pdf_buffer = _build_certificate_pdf(
        student_name=user.name,
        roll_number=user.roll_number,
        assessment_title=category.title,
        percentage=float(attempt.accuracy or 0),
        score=int(attempt.score or 0),
        total=int(attempt.total or 0),
        completed_at=attempt.completed_at,
        verify_url=verify_url,
    )

    safe_title = "".join(ch if ch.isalnum() else "_" for ch in category.title).strip("_") or "assessment"
    filename = f"certificate_{safe_title}_{attempt.id}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/certificates/verify/{token}", name="verify_certificate")
async def verify_certificate(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("typ") != "certificate":
            raise HTTPException(status_code=400, detail="Invalid certificate token")
        attempt_id = int(payload.get("attempt_id"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid certificate token")

    row = (
        await db.execute(
            select(AssessmentAttempt, AssessmentCategory, User)
            .join(AssessmentCategory, AssessmentCategory.id == AssessmentAttempt.category_id)
            .join(User, User.id == AssessmentAttempt.user_id)
            .where(AssessmentAttempt.id == attempt_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Certificate record not found")

    attempt, category, user = row
    if not _is_certificate_eligible(attempt):
        raise HTTPException(status_code=400, detail="Certificate is not valid")
    if not bool(attempt.certificate_issued_by_admin):
        raise HTTPException(status_code=400, detail="Certificate is not issued by admin")

    return {
        "valid": True,
        "student_name": user.name,
        "roll_number": user.roll_number,
        "assessment_title": category.title,
        "percentage": float(attempt.accuracy or 0),
        "score": int(attempt.score or 0),
        "total": int(attempt.total or 0),
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
    }
