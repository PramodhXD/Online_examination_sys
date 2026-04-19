"""Add persisted proctoring fields to live attempts.

Revision ID: 20260322_0003
Revises: 20260321_0002
Create Date: 2026-03-22 23:20:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260322_0003"
down_revision = "20260321_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "assessment_attempt",
        sa.Column("tab_switches", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "assessment_attempt",
        sa.Column("fullscreen_exits", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "assessment_attempt",
        sa.Column("webcam_alerts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "assessment_attempt",
        sa.Column("proctor_alert_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "assessment_attempt",
        sa.Column("last_proctor_event", sa.Text(), nullable=True),
    )
    op.add_column(
        "assessment_attempt",
        sa.Column("last_proctor_event_at", sa.TIMESTAMP(), nullable=True),
    )

    op.add_column(
        "practice_attempts",
        sa.Column("tab_switches", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "practice_attempts",
        sa.Column("fullscreen_exits", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "practice_attempts",
        sa.Column("webcam_alerts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "practice_attempts",
        sa.Column("proctor_alert_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "practice_attempts",
        sa.Column("last_proctor_event", sa.Text(), nullable=True),
    )
    op.add_column(
        "practice_attempts",
        sa.Column("last_proctor_event_at", sa.DateTime(), nullable=True),
    )

    op.alter_column("assessment_attempt", "tab_switches", server_default=None)
    op.alter_column("assessment_attempt", "fullscreen_exits", server_default=None)
    op.alter_column("assessment_attempt", "webcam_alerts", server_default=None)
    op.alter_column("assessment_attempt", "proctor_alert_count", server_default=None)
    op.alter_column("practice_attempts", "tab_switches", server_default=None)
    op.alter_column("practice_attempts", "fullscreen_exits", server_default=None)
    op.alter_column("practice_attempts", "webcam_alerts", server_default=None)
    op.alter_column("practice_attempts", "proctor_alert_count", server_default=None)


def downgrade() -> None:
    op.drop_column("practice_attempts", "last_proctor_event_at")
    op.drop_column("practice_attempts", "last_proctor_event")
    op.drop_column("practice_attempts", "proctor_alert_count")
    op.drop_column("practice_attempts", "webcam_alerts")
    op.drop_column("practice_attempts", "fullscreen_exits")
    op.drop_column("practice_attempts", "tab_switches")

    op.drop_column("assessment_attempt", "last_proctor_event_at")
    op.drop_column("assessment_attempt", "last_proctor_event")
    op.drop_column("assessment_attempt", "proctor_alert_count")
    op.drop_column("assessment_attempt", "webcam_alerts")
    op.drop_column("assessment_attempt", "fullscreen_exits")
    op.drop_column("assessment_attempt", "tab_switches")
