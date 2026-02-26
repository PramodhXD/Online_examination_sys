import asyncio

from app.models import admin as admin_models  # noqa: F401
from app.models.exam_assignment import ExamAssignment  # noqa: F401

from app.db.startup_tasks import run_startup_db_tasks


if __name__ == "__main__":
    asyncio.run(run_startup_db_tasks())
