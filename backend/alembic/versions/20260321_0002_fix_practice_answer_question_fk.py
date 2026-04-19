"""Fix practice answer question foreign key.

Revision ID: 20260321_0002
Revises: 20260320_0001
Create Date: 2026-03-21 00:30:00
"""

from alembic import op


revision = "20260321_0002"
down_revision = "20260320_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "practice_answers_question_id_fkey",
        "practice_answers",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "practice_answers_question_id_fkey",
        "practice_answers",
        "assessment_question",
        ["question_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "practice_answers_question_id_fkey",
        "practice_answers",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "practice_answers_question_id_fkey",
        "practice_answers",
        "practice_questions",
        ["question_id"],
        ["id"],
        ondelete="CASCADE",
    )
