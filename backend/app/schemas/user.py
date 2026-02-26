from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    roll_number: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    roll_number: str
    role: Optional[str] = None
    subscription_plan: str = "FREE"

    class Config:
        from_attributes = True


class UpdateProfileSchema(BaseModel):
    name: str


class ChangePasswordSchema(BaseModel):
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class SubscriptionPlanUpdate(BaseModel):
    plan: str


class SubscriptionInfo(BaseModel):
    plan: str
    started_at: Optional[datetime] = None
    monthly_assessment_limit: Optional[int] = None
    allow_certificates: bool
    allow_leaderboard: bool
    allow_pdf_reports: bool


class RazorpayOrderRequest(BaseModel):
    plan: str


class RazorpayOrderResponse(BaseModel):
    key: str
    amount: int
    currency: str
    plan: str
    order_id: str
    name: str
    description: str


class RazorpayConfirmRequest(BaseModel):
    plan: str
    order_id: str


class RazorpayConfirmResponse(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RazorpayVerifyRequest(BaseModel):
    plan: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
