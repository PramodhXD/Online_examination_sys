import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.admin import AdminStudentMeta
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.notification_service import create_notification
from app.utils.security import hash_password


PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 8 characters long and include at least one "
    "uppercase letter, one lowercase letter, one number, and one special character"
)


def _validate_password_strength(password: str) -> str | None:
    candidate = password or ""
    if len(candidate) < 8:
        return PASSWORD_POLICY_MESSAGE
    if not re.search(r"[A-Z]", candidate):
        return PASSWORD_POLICY_MESSAGE
    if not re.search(r"[a-z]", candidate):
        return PASSWORD_POLICY_MESSAGE
    if not re.search(r"\d", candidate):
        return PASSWORD_POLICY_MESSAGE
    if not re.search(r"[^A-Za-z0-9]", candidate):
        return PASSWORD_POLICY_MESSAGE
    return None


async def create_user(db: AsyncSession, user: UserCreate):
    normalized_name = " ".join((user.name or "").split())
    normalized_email = str(user.email or "").strip().lower()
    normalized_roll_number = str(user.roll_number or "").strip()
    normalized_course = " ".join((user.course or "").split())
    normalized_batch = " ".join((user.batch or "").split())

    if not normalized_name:
        return None, "Name is required"
    if not normalized_email:
        return None, "Email is required"
    if not normalized_roll_number:
        return None, "Roll number is required"
    if not normalized_course:
        return None, "Course is required"
    if not normalized_batch:
        return None, "Batch is required"

    password_error = _validate_password_strength(user.password)
    if password_error:
        return None, password_error

    result = await db.execute(select(User).where(User.email == normalized_email))
    if result.scalar_one_or_none():
        return None, "Email already exists"

    result = await db.execute(
        select(User).where(User.roll_number == normalized_roll_number)
    )
    if result.scalar_one_or_none():
        return None, "Roll number already exists"

    new_user = User(
        name=normalized_name,
        email=normalized_email,
        roll_number=normalized_roll_number,
        hashed_password=hash_password(user.password),
        role="student",
        is_deleted=False,
    )

    db.add(new_user)
    await db.flush()

    db.add(
        AdminStudentMeta(
            user_id=new_user.id,
            department=normalized_course,
            batch=normalized_batch,
            blocked=False,
            face_status="not_registered",
        )
    )

    await create_notification(
        db,
        user_id=new_user.id,
        title="Welcome to SecureExam",
        message=(
            "Registration completed successfully. Start with face verification "
            "and explore available practice or assessment modules."
        ),
        notification_type="success",
        link="/dashboard",
    )

    await db.commit()
    await db.refresh(new_user)

    return new_user, None
