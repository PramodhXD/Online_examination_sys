import hmac
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from app.core.subscription import (
    PLAN_FREE,
    VALID_PLANS,
    get_plan_config,
    get_plan_price_paise,
    normalize_plan,
)
from app.db.session import get_db
from app.models.admin import AdminLog, AdminStudentMeta, SupportTicket
from app.models.user import User
from app.schemas.user import (
    ChangePasswordSchema,
    RazorpayConfirmRequest,
    RazorpayConfirmResponse,
    RazorpayOrderRequest,
    RazorpayOrderResponse,
    RazorpayVerifyRequest,
    SubscriptionInfo,
    SubscriptionPlanUpdate,
    SupportTicketCreate,
    SupportTicketItem,
    SupportTicketReplyItem,
    SupportTicketResponse,
    UpdateProfileSchema,
    UserProfileResponse,
)
from app.services.password_service import change_user_password
from app.services.notification_service import create_notification
from app.utils.face_storage import delete_user_face_data, migrate_user_face_data
from app.utils.jwt import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


def _normalize_ticket_status(status: str | None) -> str:
    normalized = str(status or "").strip().lower()
    if normalized in {"open", "in_progress", "resolved", "closed"}:
        return normalized
    return "open"


def _subscription_response(user: User) -> SubscriptionInfo:
    plan = normalize_plan(user.subscription_plan)
    cfg = get_plan_config(plan)
    return SubscriptionInfo(
        plan=plan,
        started_at=user.subscription_started_at,
        monthly_assessment_limit=cfg.assessment_limit_per_month,
        allow_certificates=cfg.allow_certificates,
        allow_leaderboard=cfg.allow_leaderboard,
        allow_pdf_reports=cfg.allow_pdf_reports,
    )


def _effective_razorpay_key_id() -> str:
    if not RAZORPAY_KEY_ID:
        raise HTTPException(status_code=503, detail="Razorpay key is not configured")
    return RAZORPAY_KEY_ID


def _effective_razorpay_secret() -> str:
    if not RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay secret is not configured")
    return RAZORPAY_KEY_SECRET


def _compute_signature(order_id: str, payment_id: str) -> str:
    message = f"{order_id}|{payment_id}".encode("utf-8")
    digest = hmac.new(
        _effective_razorpay_secret().encode("utf-8"),
        message,
        digestmod="sha256",
    ).hexdigest()
    return digest


async def _get_or_create_student_meta(db: AsyncSession, user_id: int) -> AdminStudentMeta:
    meta = (
        await db.execute(
            select(AdminStudentMeta).where(AdminStudentMeta.user_id == user_id)
        )
    ).scalar_one_or_none()

    if meta:
        return meta

    meta = AdminStudentMeta(
        user_id=user_id,
        department="General",
        batch="2024-28",
        blocked=False,
        face_status="not_registered",
    )
    db.add(meta)
    await db.flush()
    return meta


@router.delete("/delete-account")
async def delete_account(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user["id"]))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    delete_user_face_data(roll_number=user.roll_number, email=user.email)
    user.is_deleted = True
    await db.commit()

    return {"message": "Account deleted"}


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user["id"]))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    meta = await _get_or_create_student_meta(db, user.id)
    await db.commit()
    face_verified = str(meta.face_status or "").strip().lower() == "verified"

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "face_verified": face_verified,
        "face_verification_date": meta.updated_at if face_verified else None,
        "roll_number": user.roll_number,
        "course": meta.department,
        "batch": meta.batch,
        "role": user.role,
        "subscription_plan": normalize_plan(user.subscription_plan),
    }


@router.put("/update-profile")
async def update_profile(
    profile_data: UpdateProfileSchema,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user["id"]))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    normalized_name = " ".join((profile_data.name or "").split())
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Name is required")
    normalized_roll = str(profile_data.roll_number or "").strip()
    if not normalized_roll:
        raise HTTPException(status_code=400, detail="Roll number is required")
    normalized_course = " ".join((profile_data.course or "").split())
    if not normalized_course:
        raise HTTPException(status_code=400, detail="Course is required")
    normalized_batch = " ".join((profile_data.batch or "").split())
    if not normalized_batch:
        raise HTTPException(status_code=400, detail="Batch is required")

    duplicate_roll = await db.execute(
        select(User).where(
            User.id != user.id,
            User.is_deleted.is_(False),
            User.roll_number == normalized_roll,
        )
    )
    if duplicate_roll.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Roll number already exists")

    previous_roll = str(user.roll_number or "").strip()
    meta = await _get_or_create_student_meta(db, user.id)
    user.name = normalized_name
    user.roll_number = normalized_roll
    meta.department = normalized_course
    meta.batch = normalized_batch

    try:
        migrate_user_face_data(
            old_roll_number=previous_roll,
            new_roll_number=normalized_roll,
        )
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    await db.commit()
    await db.refresh(user)

    return {
        "message": "Profile updated successfully",
        "name": user.name,
        "roll_number": user.roll_number,
        "course": meta.department,
        "batch": meta.batch,
    }


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordSchema,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    success, error = await change_user_password(
        db=db,
        user_id=current_user["id"],
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    if not success:
        if error == "User not found":
            raise HTTPException(status_code=404, detail=error)
        raise HTTPException(status_code=400, detail=error)

    return {"message": "Password changed successfully"}


@router.get("/subscription", response_model=SubscriptionInfo)
async def get_subscription(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == current_user["id"]))).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _subscription_response(user)


@router.put("/subscription", response_model=SubscriptionInfo)
async def update_subscription(
    payload: SubscriptionPlanUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_plan = normalize_plan(payload.plan)
    if target_plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")

    user = (await db.execute(select(User).where(User.id == current_user["id"]))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if normalize_plan(user.subscription_plan) != target_plan:
        user.subscription_plan = target_plan
        user.subscription_started_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    return _subscription_response(user)


@router.post("/subscription/razorpay/order", response_model=RazorpayOrderResponse)
async def create_razorpay_order(
    payload: RazorpayOrderRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_plan = normalize_plan(payload.plan)
    if target_plan not in VALID_PLANS or target_plan == PLAN_FREE:
        raise HTTPException(status_code=400, detail="Razorpay checkout is only available for paid plans")

    user = (await db.execute(select(User).where(User.id == current_user["id"]))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if normalize_plan(user.subscription_plan) == target_plan:
        raise HTTPException(status_code=400, detail="You are already on this plan")

    amount_paise = int(get_plan_price_paise(target_plan))
    order_id = f"order_{uuid.uuid4().hex[:16]}"

    return RazorpayOrderResponse(
        key=_effective_razorpay_key_id(),
        amount=amount_paise,
        currency="INR",
        plan=target_plan,
        order_id=order_id,
        name="SecureExam Subscriptions",
        description=f"{target_plan.title()} Plan",
    )


@router.post("/subscription/razorpay/confirm", response_model=RazorpayConfirmResponse)
async def confirm_razorpay_payment(
    payload: RazorpayConfirmRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_plan = normalize_plan(payload.plan)
    if target_plan not in VALID_PLANS or target_plan == PLAN_FREE:
        raise HTTPException(status_code=400, detail="Invalid paid plan")

    user = (await db.execute(select(User).where(User.id == current_user["id"]))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.order_id.startswith("order_"):
        raise HTTPException(status_code=400, detail="Invalid order id")

    payment_id = f"pay_{uuid.uuid4().hex[:14]}"
    signature = _compute_signature(payload.order_id, payment_id)

    return RazorpayConfirmResponse(
        razorpay_order_id=payload.order_id,
        razorpay_payment_id=payment_id,
        razorpay_signature=signature,
    )


@router.post("/subscription/razorpay/verify", response_model=SubscriptionInfo)
async def verify_razorpay_payment(
    payload: RazorpayVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_plan = normalize_plan(payload.plan)
    if target_plan not in VALID_PLANS or target_plan == PLAN_FREE:
        raise HTTPException(status_code=400, detail="Invalid paid plan")

    user = (await db.execute(select(User).where(User.id == current_user["id"]))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    expected = _compute_signature(payload.razorpay_order_id, payload.razorpay_payment_id)
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    if normalize_plan(user.subscription_plan) != target_plan:
        user.subscription_plan = target_plan
        user.subscription_started_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)

    return _subscription_response(user)


@router.post("/support-tickets", response_model=SupportTicketResponse)
async def create_support_ticket(
    payload: SupportTicketCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == current_user["id"]))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ticket_id = f"SUP-{uuid.uuid4().hex[:8].upper()}"
    submitted_at = datetime.utcnow()
    log_message = (
        f"[{ticket_id}] Student support ticket | "
        f"user_id={user.id} | name={user.name} | email={user.email} | "
        f"category={payload.category} | priority={payload.priority} | "
        f"subject={payload.subject} | message={payload.message}"
    )

    db.add(
        SupportTicket(
            ticket_id=ticket_id,
            user_id=user.id,
            subject=payload.subject,
            category=payload.category,
            priority=payload.priority,
            message=payload.message,
            status="open",
            created_at=submitted_at,
            updated_at=submitted_at,
        )
    )
    db.add(AdminLog(event_type="Support", message=log_message, created_at=submitted_at))
    await create_notification(
        db,
        user_id=user.id,
        title="Support ticket submitted",
        message=(
            f"Your ticket '{payload.subject}' has been created. "
            "We will notify you when there is progress."
        ),
        notification_type="info",
        link="/my-tickets",
    )
    await db.commit()

    return SupportTicketResponse(
        ticket_id=ticket_id,
        message="Support ticket submitted successfully",
        submitted_at=submitted_at,
    )


@router.get("/support-tickets", response_model=list[SupportTicketItem])
async def list_my_support_tickets(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(SupportTicket)
            .options(selectinload(SupportTicket.replies))
            .where(SupportTicket.user_id == current_user["id"])
            .order_by(SupportTicket.updated_at.desc(), SupportTicket.created_at.desc())
        )
    ).scalars().all()

    return [
        SupportTicketItem(
            id=ticket.id,
            ticket_id=ticket.ticket_id,
            subject=ticket.subject,
            category=ticket.category,
            priority=ticket.priority,
            message=ticket.message,
            status=_normalize_ticket_status(ticket.status),
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            replies=[
                SupportTicketReplyItem(
                    id=reply.id,
                    author_role=reply.author_role,
                    author_name=reply.author_name,
                    message=reply.message,
                    created_at=reply.created_at,
                )
                for reply in ticket.replies
            ],
        )
        for ticket in rows
    ]
