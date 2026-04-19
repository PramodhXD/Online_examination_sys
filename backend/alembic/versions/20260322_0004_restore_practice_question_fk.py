"""Restore practice answer foreign key to practice questions.

Revision ID: 20260322_0004
Revises: 20260322_0003
Create Date: 2026-03-22 23:55:00
"""

import json
from datetime import datetime

import sqlalchemy as sa
from alembic import op


revision = "20260322_0004"
down_revision = "20260322_0003"
branch_labels = None
depends_on = None


def _repair_legacy_practice_answer_links() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()

    practice_answers = sa.Table("practice_answers", metadata, autoload_with=bind)
    practice_attempts = sa.Table("practice_attempts", metadata, autoload_with=bind)
    practice_questions = sa.Table("practice_questions", metadata, autoload_with=bind)
    assessment_question = sa.Table("assessment_question", metadata, autoload_with=bind)

    broken_rows = bind.execute(
        sa.select(
            practice_answers.c.id.label("answer_id"),
            practice_answers.c.attempt_id,
            practice_answers.c.question_id.label("legacy_question_id"),
            practice_attempts.c.category_id.label("practice_category_id"),
            assessment_question.c.question_text,
            assessment_question.c.option_1,
            assessment_question.c.option_2,
            assessment_question.c.option_3,
            assessment_question.c.option_4,
            assessment_question.c.correct_option,
            assessment_question.c.explanation,
        )
        .select_from(
            practice_answers.join(
                practice_attempts,
                practice_attempts.c.id == practice_answers.c.attempt_id,
            ).join(
                assessment_question,
                assessment_question.c.id == practice_answers.c.question_id,
            )
        )
        .where(
            ~sa.exists(
                sa.select(sa.literal(1))
                .select_from(practice_questions)
                .where(practice_questions.c.id == practice_answers.c.question_id)
            )
        )
        .order_by(practice_answers.c.id.asc())
    ).mappings().all()

    if not broken_rows:
        return

    resolved_question_ids: dict[tuple[int, int], int] = {}
    touched_attempt_ids: set[int] = set()

    for row in broken_rows:
        answer_id = int(row["answer_id"])
        attempt_id = int(row["attempt_id"])
        practice_category_id = int(row["practice_category_id"])
        legacy_question_id = int(row["legacy_question_id"])
        key = (practice_category_id, legacy_question_id)

        resolved_question_id = resolved_question_ids.get(key)
        if resolved_question_id is None:
            existing_id = bind.execute(
                sa.select(practice_questions.c.id).where(
                    practice_questions.c.category_id == practice_category_id,
                    practice_questions.c.question_text == row["question_text"],
                    practice_questions.c.option_1 == row["option_1"],
                    practice_questions.c.option_2 == row["option_2"],
                    practice_questions.c.option_3 == row["option_3"],
                    practice_questions.c.option_4 == row["option_4"],
                    practice_questions.c.correct_option == row["correct_option"],
                )
            ).scalar_one_or_none()

            if existing_id is None:
                insert_result = bind.execute(
                    practice_questions.insert().values(
                        category_id=practice_category_id,
                        question_text=row["question_text"],
                        difficulty="Medium",
                        option_1=row["option_1"],
                        option_2=row["option_2"],
                        option_3=row["option_3"],
                        option_4=row["option_4"],
                        correct_option=row["correct_option"],
                        explanation=row["explanation"],
                        created_at=datetime.utcnow(),
                    )
                )
                resolved_question_id = int(insert_result.inserted_primary_key[0])
            else:
                resolved_question_id = int(existing_id)

            resolved_question_ids[key] = resolved_question_id

        bind.execute(
            practice_answers.update()
            .where(practice_answers.c.id == answer_id)
            .values(question_id=resolved_question_id)
        )
        touched_attempt_ids.add(attempt_id)

    for attempt_id in touched_attempt_ids:
        assigned_question_ids = [
            int(question_id)
            for question_id in bind.execute(
                sa.select(practice_answers.c.question_id)
                .where(practice_answers.c.attempt_id == attempt_id)
                .order_by(practice_answers.c.id.asc())
            ).scalars().all()
        ]
        bind.execute(
            practice_attempts.update()
            .where(practice_attempts.c.id == attempt_id)
            .values(assigned_question_ids=json.dumps(assigned_question_ids))
        )


def upgrade() -> None:
    op.drop_constraint(
        "practice_answers_question_id_fkey",
        "practice_answers",
        type_="foreignkey",
    )
    _repair_legacy_practice_answer_links()
    op.create_foreign_key(
        "practice_answers_question_id_fkey",
        "practice_answers",
        "practice_questions",
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
        "assessment_question",
        ["question_id"],
        ["id"],
        ondelete="CASCADE",
    )
