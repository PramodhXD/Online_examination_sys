import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS, RUN_STARTUP_DB_TASKS
from app.db.startup_tasks import run_startup_db_tasks
from app.models import admin as admin_models  # noqa: F401
from app.models.exam_assignment import ExamAssignment  # noqa: F401
from app.routers import admin, assessment, auth, dashboard, face, practice, users

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Online Examination System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    if not RUN_STARTUP_DB_TASKS:
        return

    logger.warning(
        "RUN_STARTUP_DB_TASKS is enabled. Schema/data bootstrapping will run at app startup."
    )
    await run_startup_db_tasks()


app.include_router(auth.router)
app.include_router(face.router)
app.include_router(users.router)
app.include_router(practice.router)
app.include_router(assessment.router)
app.include_router(dashboard.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"status": "Backend running"}
