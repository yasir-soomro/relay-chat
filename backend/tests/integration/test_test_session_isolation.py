from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from backend.model.user import User


@pytest.mark.asyncio
async def test_test_session_rollback_removes_committed_test_data(
    postgres_test_engine: AsyncEngine,
) -> None:
    user_id = uuid4()
    token = uuid4().hex
    user = User(
        id=user_id,
        email=f"rollback-{token}@example.com",
        username=f"rollback_{token[:16]}",
        display_name="Rollback Test",
        password_hash="$argon2id$integration-test-hash",
    )
    async with postgres_test_engine.connect() as connection:
        transaction = await connection.begin()
        try:
            async with AsyncSession(
                connection,
                expire_on_commit=False,
                join_transaction_mode="create_savepoint",
            ) as session:
                session.add(user)
                await session.flush()
                await session.commit()
                assert await session.get(User, user_id) is not None
        finally:
            if transaction.is_active:
                await transaction.rollback()

    async with (
        postgres_test_engine.connect() as connection,
        AsyncSession(connection) as verification_session,
    ):
        persisted_id = await verification_session.scalar(
            select(User.id).where(User.id == user_id)
        )

    assert persisted_id is None
