from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import ALGORITHM, SECRET_KEY
from app.db.session import get_db
from app.models.admin import AdminStudentMeta
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationDeleteResponse,
    NotificationItem,
    NotificationListResponse,
    NotificationReadResponse,
)
from app.services.notification_service import (
    ensure_default_notifications,
    mark_notification_as_read,
    notification_broadcaster,
)
from app.utils.jwt import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _serialize_notification(notification: Notification) -> NotificationItem:
    return NotificationItem(
        id=notification.id,
        title=notification.title,
        message=notification.message,
        type=notification.type,
        link=notification.link,
        is_read=notification.is_read,
        created_at=notification.created_at,
        read_at=notification.read_at,
    )


async def _resolve_websocket_user(
    websocket: WebSocket,
    db: AsyncSession,
) -> User | None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        await websocket.close(code=4401)
        return None

    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not user or user.is_deleted:
        await websocket.close(code=4401)
        return None

    student_meta = (
        await db.execute(
            select(AdminStudentMeta).where(AdminStudentMeta.user_id == user.id)
        )
    ).scalar_one_or_none()
    if student_meta and bool(student_meta.blocked):
        await websocket.close(code=4403)
        return None

    return user


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = (
        await db.execute(select(User).where(User.id == current_user["id"]))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await ensure_default_notifications(db, user=user)
    await db.commit()

    items = (
        await db.execute(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(limit)
        )
    ).scalars().all()

    unread_count = (
        await db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user.id,
                Notification.is_read.is_(False),
            )
        )
    ).scalar_one()

    return NotificationListResponse(
        items=[_serialize_notification(item) for item in items],
        unread_count=unread_count,
    )


@router.put("/{notification_id}/read", response_model=NotificationReadResponse)
async def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notification = (
        await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user["id"],
            )
        )
    ).scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    await mark_notification_as_read(notification)
    await db.commit()
    await db.refresh(notification)

    return NotificationReadResponse(
        message="Notification marked as read",
        notification=_serialize_notification(notification),
    )


@router.delete("/{notification_id}", response_model=NotificationDeleteResponse)
async def delete_notification(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notification = (
        await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == current_user["id"],
            )
        )
    ).scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    await db.delete(notification)
    await db.commit()

    return NotificationDeleteResponse(
        message="Notification deleted",
        notification_id=notification_id,
    )


@router.websocket("/ws")
async def notifications_websocket(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    user = await _resolve_websocket_user(websocket, db)
    if not user:
        return

    await notification_broadcaster.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_broadcaster.disconnect(user.id, websocket)
    except Exception:
        notification_broadcaster.disconnect(user.id, websocket)
