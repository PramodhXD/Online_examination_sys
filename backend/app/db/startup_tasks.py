from sqlalchemy import inspect, text

from app.db.base import Base
from app.db.session import engine


async def run_startup_db_tasks() -> None:
    async with engine.begin() as conn:
        async def column_exists(table_name: str, column_name: str) -> bool:
            def check(sync_conn) -> bool:
                columns = inspect(sync_conn).get_columns(table_name)
                return any(col["name"] == column_name for col in columns)

            return await conn.run_sync(check)

        async def add_column_if_missing(
            table_name: str, column_name: str, column_definition: str
        ) -> None:
            if not await column_exists(table_name, column_name):
                await conn.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN {column_definition}")
                )

        await conn.run_sync(Base.metadata.create_all)

        await add_column_if_missing(
            "assessment_question",
            "explanation",
            "explanation TEXT",
        )
        await add_column_if_missing(
            "assessment_category",
            "exam_type",
            "exam_type TEXT DEFAULT 'ASSESSMENT'",
        )
        await conn.execute(
            text(
                "UPDATE assessment_category "
                "SET exam_type = 'ASSESSMENT' "
                "WHERE exam_type IS NULL OR TRIM(exam_type) = ''"
            )
        )

        await add_column_if_missing(
            "assessment_category",
            "status",
            "status TEXT DEFAULT 'draft'",
        )
        await conn.execute(
            text(
                "UPDATE assessment_category "
                "SET status = 'draft' "
                "WHERE status IS NULL OR TRIM(status) = ''"
            )
        )

        await add_column_if_missing(
            "assessment_category",
            "attempt_limit",
            "attempt_limit INTEGER DEFAULT 1",
        )
        await conn.execute(
            text(
                "UPDATE assessment_category "
                "SET attempt_limit = 1 "
                "WHERE attempt_limit IS NULL OR attempt_limit < 0"
            )
        )

        await add_column_if_missing(
            "users",
            "subscription_plan",
            "subscription_plan TEXT DEFAULT 'FREE'",
        )
        await conn.execute(
            text(
                "UPDATE users "
                "SET subscription_plan = 'FREE' "
                "WHERE subscription_plan IS NULL OR TRIM(subscription_plan) = ''"
            )
        )

        await add_column_if_missing(
            "users",
            "subscription_started_at",
            "subscription_started_at TIMESTAMP",
        )
        await conn.execute(
            text(
                "UPDATE users "
                "SET subscription_started_at = CURRENT_TIMESTAMP "
                "WHERE subscription_started_at IS NULL"
            )
        )

        await add_column_if_missing(
            "assessment_attempt",
            "certificate_issued_by_admin",
            "certificate_issued_by_admin BOOLEAN DEFAULT FALSE",
        )
        await conn.execute(
            text(
                "UPDATE assessment_attempt "
                "SET certificate_issued_by_admin = FALSE "
                "WHERE certificate_issued_by_admin IS NULL"
            )
        )
