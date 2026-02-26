from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.utils.security import hash_password, verify_password

async def reset_user_password(
    db: AsyncSession,
    email: str,
    new_password: str
):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        return False

    user.hashed_password = hash_password(new_password)
    await db.commit()
    return True


async def change_user_password(
    db: AsyncSession,
    user_id: int,
    current_password: str,
    new_password: str,
):
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = result.scalar_one_or_none()

    if not user:
        return False, "User not found"

    if not verify_password(current_password, user.hashed_password):
        return False, "Current password is incorrect"

    if current_password == new_password:
        return False, "New password must be different from current password"

    user.hashed_password = hash_password(new_password)
    await db.commit()
    return True, None
