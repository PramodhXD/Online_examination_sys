from app.celery_app import celery_app
from app.services.code_execution import execute_code_task  # noqa: F401

app = celery_app
