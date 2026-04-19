from datetime import datetime
from typing import Any

from fastapi import WebSocket
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User


async def create_notification(
    db: AsyncSession,
    *,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    link: str | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        link=link,
    )
    db.add(notification)
    await db.flush()
    await notification_broadcaster.broadcast(
        user_id=user_id,
        payload=serialize_notification(notification),
    )
    return notification


def serialize_notification(notification: Notification) -> dict[str, Any]:
    return {
        "id": notification.id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "link": notification.link,
        "is_read": bool(notification.is_read),
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "read_at": notification.read_at.isoformat() if notification.read_at else None,
    }


async def ensure_default_notifications(
    db: AsyncSession,
    *,
    user: User,
) -> None:
    existing_count = (
        await db.execute(
            select(func.count(Notification.id)).where(Notification.user_id == user.id)
        )
    ).scalar_one()

    if existing_count:
        return

    await create_notification(
        db,
        user_id=user.id,
        title="Welcome to SecureExam",
        message=(
            "Your account is ready. Complete your profile, verify your face, "
            "and check upcoming assessments from the dashboard."
        ),
        notification_type="success",
        link="/dashboard",
    )


async def mark_notification_as_read(
    notification: Notification,
) -> Notification:
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.utcnow()
    return notification


class NotificationBroadcaster:
    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(user_id, None)

    async def broadcast(self, *, user_id: int, payload: dict[str, Any]) -> None:
        sockets = list(self._connections.get(user_id, set()))
        stale: list[WebSocket] = []
        message = {"type": "notification.created", "notification": payload}
        for websocket in sockets:
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(user_id, websocket)


notification_broadcaster = NotificationBroadcaster()
