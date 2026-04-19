from datetime import datetime

from pydantic import BaseModel


class NotificationItem(BaseModel):
    id: int
    title: str
    message: str
    type: str
    link: str | None = None
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: list[NotificationItem]
    unread_count: int


class NotificationReadResponse(BaseModel):
    message: str
    notification: NotificationItem


class NotificationDeleteResponse(BaseModel):
    message: str
    notification_id: int
