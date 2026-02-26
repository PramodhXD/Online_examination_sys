from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException

from app.models.user import User
from app.utils.security import verify_password
from app.utils.jwt import create_access_token


async def authenticate_user(db: AsyncSession, email: str, password: str):
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    # ❌ User not found
    if not user:
        return None

    # 🚫 Block deleted users
    if user.is_deleted:
        raise HTTPException(
            status_code=403,
            detail="Account has been deleted"
        )

    # ❌ Invalid password
    if not verify_password(password, user.hashed_password):
        return None

    # ✅ Create JWT token
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role
        }
    )

    # ✅ Return structured response
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
