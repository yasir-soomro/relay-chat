from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from backend.model.user import User
from backend.repository.user_repository import UserRepository


@pytest.mark.asyncio
async def test_user_repository_reads_and_updates_postgres_user(
    postgres_test_engine: AsyncEngine,
) -> None:
    user_id = uuid4()
    token = uuid4().hex
    user = User(
        id=user_id,
        email=f"relay-test-{token}@example.com",
        username=f"test_{token[:20]}",
        display_name="Repository Test",
        password_hash="$argon2id$integration-test-hash",
    )
    async with postgres_test_engine.connect() as connection:
        transaction = await connection.begin()
        async with AsyncSession(
            connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            repository = UserRepository(session)
            await repository.create(user)
            await session.flush()
            loaded = await repository.get_by_id(user_id)
            assert loaded is not None
            assert loaded.email == user.email
            assert await repository.email_exists(user.email.upper())
            assert await repository.username_exists(user.username.upper())

            await repository.update_profile(loaded, {"bio": "Updated"})
            await session.flush()
            assert loaded.bio == "Updated"
        await transaction.rollback()
