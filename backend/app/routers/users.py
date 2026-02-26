import hmac
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from app.core.subscription import (
    PLAN_FREE,
    VALID_PLANS,
    get_plan_config,
    get_plan_price_paise,
    normalize_plan,
)
from app.db.session import get_db
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
    UpdateProfileSchema,
)
from app.services.password_service import change_user_password
from app.utils.face_storage import delete_user_face_data
from app.utils.jwt import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


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
    return RAZORPAY_KEY_ID or "rzp_test_checkout"


def _effective_razorpay_secret() -> str:
    return RAZORPAY_KEY_SECRET or "local_no_deduction_secret"


def _compute_signature(order_id: str, payment_id: str) -> str:
    message = f"{order_id}|{payment_id}".encode("utf-8")
    digest = hmac.new(
        _effective_razorpay_secret().encode("utf-8"),
        message,
        digestmod="sha256",
    ).hexdigest()
    return digest


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


@router.get("/me")
async def get_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user["id"]))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "roll_number": user.roll_number,
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

    duplicate = await db.execute(
        select(User).where(
            User.id != user.id,
            User.is_deleted.is_(False),
            func.lower(func.trim(User.name)) == normalized_name.lower(),
        )
    )
    if duplicate.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Name already exists")

    user.name = normalized_name

    await db.commit()
    await db.refresh(user)

    return {
        "message": "Profile updated successfully",
        "name": user.name,
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
