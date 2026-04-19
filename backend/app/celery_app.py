from app.core.config import (
    CELERY_BROKER_URL,
    CELERY_RESULT_BACKEND,
    CODE_EXECUTION_RESULT_TTL_SECONDS,
)

try:
    from celery import Celery
except ModuleNotFoundError:  # pragma: no cover - depends on local environment
    Celery = None  # type: ignore[assignment]


celery_app = None

if Celery is not None:
    celery_app = Celery(
        "online_examination_system",
        broker=CELERY_BROKER_URL,
        backend=CELERY_RESULT_BACKEND,
    )

    celery_app.conf.update(
        task_track_started=True,
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        result_expires=CODE_EXECUTION_RESULT_TTL_SECONDS,
        task_time_limit=30,
        task_soft_time_limit=20,
        worker_prefetch_multiplier=1,
    )
