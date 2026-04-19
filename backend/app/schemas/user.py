from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    roll_number: str
    course: str
    batch: str
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


class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    face_verified: bool = False
    face_verification_date: Optional[datetime] = None
    roll_number: str
    course: str
    batch: str
    role: Optional[str] = None
    subscription_plan: str = "FREE"

    class Config:
        from_attributes = True


class UpdateProfileSchema(BaseModel):
    name: str
    roll_number: str
    course: str
    batch: str


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


class SupportTicketCreate(BaseModel):
    subject: str = Field(..., min_length=5, max_length=120)
    category: str = Field(default="general", max_length=50)
    priority: str = Field(default="medium", max_length=20)
    message: str = Field(..., min_length=10, max_length=2000)


class SupportTicketResponse(BaseModel):
    ticket_id: str
    message: str
    submitted_at: datetime


class SupportTicketReplyItem(BaseModel):
    id: int
    author_role: str
    author_name: str
    message: str
    created_at: datetime


class SupportTicketItem(BaseModel):
    id: int
    ticket_id: str
    subject: str
    category: str
    priority: str
    message: str
    status: str
    created_at: datetime
    updated_at: datetime
    replies: list[SupportTicketReplyItem] = []
