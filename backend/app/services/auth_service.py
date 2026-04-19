from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.admin import AdminStudentMeta
from app.models.user import User
from app.utils.jwt import create_access_token
from app.utils.security import verify_password


BLOCKED_ACCOUNT_MESSAGE = "Account is blocked by admin"


async def authenticate_user(db: AsyncSession, email: str, password: str):
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if not user:
        return None

    if user.is_deleted:
        raise HTTPException(
            status_code=403,
            detail="Account has been deleted",
        )

    student_meta = (
        await db.execute(
            select(AdminStudentMeta).where(AdminStudentMeta.user_id == user.id)
        )
    ).scalar_one_or_none()
    if student_meta and bool(student_meta.blocked):
        raise HTTPException(
            status_code=403,
            detail=BLOCKED_ACCOUNT_MESSAGE,
        )

    if not verify_password(password, user.hashed_password):
        return None

    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
        }
    )

    return {
        "access_token": token,
        "role": user.role,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "roll_number": user.roll_number,
            "role": user.role,
            "subscription_plan": user.subscription_plan or "FREE",
        },
    }
