import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(ENV_FILE)


def _get_env(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None:
        return None
    return value.strip()


def require_env(name: str) -> str:
    value = _get_env(name)
    if value is None or not value.strip():
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _env_bool(name: str, default: bool = False) -> bool:
    value = _get_env(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = _get_env(name)
    if value is None:
        return default
    return int(value)


def _csv_env(name: str) -> list[str]:
    value = _get_env(name) or ""
    return [item.strip() for item in value.split(",") if item.strip()]


def _to_sync_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    if database_url.startswith("sqlite+aiosqlite://"):
        return database_url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    return database_url


DATABASE_URL = require_env("DATABASE_URL")
DATABASE_SYNC_URL = _to_sync_database_url(DATABASE_URL)
SQL_ECHO = _env_bool("SQL_ECHO", default=False)

SECRET_KEY = require_env("SECRET_KEY")
ALGORITHM = _get_env("ALGORITHM") or "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = _env_int("ACCESS_TOKEN_EXPIRE_MINUTES", 60)
CORS_ORIGINS = _csv_env("CORS_ORIGINS")

SMTP_HOST = _get_env("SMTP_HOST")
SMTP_PORT = _env_int("SMTP_PORT", 587)
SMTP_USER = _get_env("SMTP_USER")
SMTP_PASS = _get_env("SMTP_PASS")
SMTP_FROM = _get_env("SMTP_FROM") or SMTP_USER

RAZORPAY_KEY_ID = _get_env("RAZORPAY_KEY_ID") or ""
RAZORPAY_KEY_SECRET = _get_env("RAZORPAY_KEY_SECRET") or ""
REDIS_URL = _get_env("REDIS_URL") or "redis://localhost:6379/0"
CELERY_BROKER_URL = _get_env("CELERY_BROKER_URL") or REDIS_URL
CELERY_RESULT_BACKEND = _get_env("CELERY_RESULT_BACKEND") or REDIS_URL
CODE_EXECUTION_RESULT_TTL_SECONDS = _env_int("CODE_EXECUTION_RESULT_TTL_SECONDS", 3600)
