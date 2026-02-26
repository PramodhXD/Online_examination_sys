from datetime import datetime
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
    AssessmentCategoryResponse,
    AssessmentCertificateItem,
    AssessmentQuestionResponse,
    AssessmentResult,
    AssessmentSubmit,
)
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
SIGNATURE_IMAGE_CANDIDATES = (
    Path(__file__).resolve().parent.parent / "assets" / "certificate_signature.png",
    Path(__file__).resolve().parent.parent / "assets" / "certificate_signature.jpg",
    Path(__file__).resolve().parent.parent / "assets" / "certificate_signature.jpeg",
)


def _is_certificate_eligible(attempt: AssessmentAttempt) -> bool:
    if attempt.status != "COMPLETED":
        return False
    return float(attempt.accuracy or 0) >= PASS_PERCENTAGE


async def _get_user(db: AsyncSession, user_id: int) -> User:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


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
        return {"attempt_id": open_attempt.id}

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
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return {"attempt_id": attempt.id}


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
    if len(data.answers) != len(data.question_ids):
        raise HTTPException(status_code=400, detail="Answer mismatch")

    questions = (
        await db.execute(
            select(AssessmentQuestion).where(AssessmentQuestion.id.in_(data.question_ids))
        )
    ).scalars().all()
    if len(questions) != len(data.question_ids):
        raise HTTPException(status_code=400, detail="Question mismatch")

    question_map = {q.id: q for q in questions}
    score = 0
    total = 0
    correct_answers = 0

    for q_id, selected in zip(data.question_ids, data.answers):
        question = question_map.get(q_id)
        if not question:
            continue
        total += question.marks
        is_correct = selected == question.correct_option
        if is_correct:
            score += question.marks
            correct_answers += 1
        db.add(
            AssessmentAnswer(
                attempt_id=attempt.id,
                question_id=question.id,
                selected_option=selected,
                is_correct=is_correct,
            )
        )

    percentage = (score / total) * 100 if total > 0 else 0
    wrong_answers = len(data.question_ids) - correct_answers
    attempt.score = score
    attempt.total = total
    attempt.accuracy = round(percentage, 2)
    is_violation_submit = (data.submit_reason or "").strip().lower() == "violation"
    attempt.status = VIOLATION_SUBMITTED if is_violation_submit else "COMPLETED"
    attempt.completed_at = datetime.utcnow()
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


@router.get("/certificates", response_model=List[AssessmentCertificateItem])
async def list_my_certificates(
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
