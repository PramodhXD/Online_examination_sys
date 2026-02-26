from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.user import User
from app.schemas.user import UserCreate
from app.utils.security import hash_password


async def create_user(db: AsyncSession, user: UserCreate):
    normalized_name = " ".join((user.name or "").split())
    if not normalized_name:
        return None, "Name is required"

    # Check email
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalar_one_or_none():
        return None, "Email already exists"

    # Check roll number
    result = await db.execute(
        select(User).where(User.roll_number == user.roll_number)
    )
    if result.scalar_one_or_none():
        return None, "Roll number already exists"

    # Check name (case-insensitive, active users only)
    existing_name = await db.execute(
        select(User).where(
            User.is_deleted.is_(False),
            func.lower(func.trim(User.name)) == normalized_name.lower(),
        )
    )
    if existing_name.scalar_one_or_none():
        return None, "Name already exists"

    new_user = User(
        name=normalized_name,
        email=user.email,
        roll_number=user.roll_number,
        hashed_password=hash_password(user.password),

        # ✅ Explicitly set role
        role="student",

        # ✅ Explicitly set is_deleted
        is_deleted=False
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return new_user, None
