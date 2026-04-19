"""Initial schema baseline.

Revision ID: 20260320_0001
Revises:
Create Date: 2026-03-20 22:00:00
"""

from alembic import op

from app.db.base import Base
import app.models  # noqa: F401


revision = "20260320_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
