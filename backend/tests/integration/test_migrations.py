import pytest
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncEngine


@pytest.mark.asyncio
async def test_database_has_current_migration_head_and_schema(
    postgres_test_engine: AsyncEngine,
) -> None:
    async with postgres_test_engine.connect() as connection:
        revision = await connection.scalar(
            text("SELECT version_num FROM alembic_version")
        )
        table_names = await connection.run_sync(
            lambda sync_connection: set(inspect(sync_connection).get_table_names())
        )

    assert revision == "20261109_09_unread_counts"
    assert {
        "auth_refresh_tokens",
        "auth_sessions",
        "connections",
        "conversations",
        "messages",
        "user_blocks",
        "users",
    }.issubset(table_names)
    assert "notifications" not in table_names
    async with postgres_test_engine.connect() as connection:
        index_names = await connection.run_sync(
            lambda sync_connection: {
                index["name"]
                for index in inspect(sync_connection).get_indexes("messages")
            }
        )
    assert "ix_messages_unread_conversation_sender" in index_names
