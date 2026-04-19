from datetime import datetime, timedelta

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from app.db.session import get_db
from app.models.admin import AdminStudentMeta
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

BLOCKED_ACCOUNT_MESSAGE = "Account is blocked by admin"


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        resolved_user_id = int(user_id)
        user = (
            await db.execute(select(User).where(User.id == resolved_user_id))
        ).scalar_one_or_none()

        if not user or user.is_deleted:
            raise HTTPException(status_code=401, detail="Invalid token")

        student_meta = (
            await db.execute(
                select(AdminStudentMeta).where(AdminStudentMeta.user_id == user.id)
            )
        ).scalar_one_or_none()
        if student_meta and bool(student_meta.blocked):
            raise HTTPException(status_code=403, detail=BLOCKED_ACCOUNT_MESSAGE)

        return {
            "id": user.id,
            "role": user.role,
            "email": user.email,
            "name": user.name,
        }

    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")
