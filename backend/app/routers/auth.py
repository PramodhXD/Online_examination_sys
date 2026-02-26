from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    VerifyOtpRequest,
)
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import authenticate_user
from app.services.otp_store import OtpRateLimitError, clear_otp, save_otp, verify_otp
from app.services.password_service import reset_user_password
from app.services.user_service import create_user
from app.utils.email import send_email
from app.utils.otp import generate_otp

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    new_user, error = await create_user(db, user)

    if error:
        raise HTTPException(status_code=400, detail=error)

    return new_user


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await authenticate_user(db, data.email, data.password)

    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return result


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    otp = generate_otp()
    try:
        save_otp(data.email, otp)
    except OtpRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc))

    send_email(
        to_email=data.email,
        subject="Password Reset OTP",
        body=(
            f"\nYour OTP for password reset is: {otp}\n\n"
            "This OTP is valid for 10 minutes.\n"
            "If you did not request this, please ignore this email.\n"
        ),
    )

    return {"message": "OTP sent successfully"}


@router.post("/verify-otp")
async def verify_otp_api(data: VerifyOtpRequest):
    if not verify_otp(data.email, data.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    return {"message": "OTP verified"}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    if not verify_otp(data.email, data.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    success = await reset_user_password(db, data.email, data.new_password)

    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    clear_otp(data.email)

    return {"message": "Password reset successful"}
