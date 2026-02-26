import os


os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://test_user:test_pass@localhost/test_db"
)
