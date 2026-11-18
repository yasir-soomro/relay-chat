from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from backend.model.user import User
from backend.repository.user_repository import UserRepository


@pytest.mark.asyncio
async def test_user_repository_reads_and_updates_postgres_user(
    postgres_test_session: AsyncSession,
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
    repository = UserRepository(postgres_test_session)
    await repository.create(user)
    await postgres_test_session.flush()
    loaded = await repository.get_by_id(user_id)
    assert loaded is not None
    assert loaded.email == user.email
    assert await repository.email_exists(user.email.upper())
    assert await repository.username_exists(user.username.upper())

    await repository.update_profile(loaded, {"bio": "Updated"})
    await postgres_test_session.flush()
    assert loaded.bio == "Updated"


@pytest.mark.asyncio
async def test_user_discovery_prefix_pagination(
    postgres_test_engine: AsyncEngine,
) -> None:
    token = uuid4().hex
    prefix = f"disc{token[:8]}"
    users = [
        User(
            id=uuid4(),
            email=f"discovery-{token}-{suffix}@example.com",
            username=f"{prefix}_{suffix}",
            display_name=f"Discovery {suffix}",
            password_hash="$argon2id$integration-test-hash",
        )
        for suffix in ("a", "b", "c", "d", "e", "owner")
    ]
    owner = users[-1]
    async with postgres_test_engine.connect() as connection:
        transaction = await connection.begin()
        async with AsyncSession(
            connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            repository = UserRepository(session)
            for user in users:
                await repository.create(user)
            first_page = await repository.discover_users(
                owner.id,
                query=prefix.upper(),
                limit=2,
                cursor=None,
            )
            second_page = await repository.discover_users(
                owner.id,
                query=prefix,
                limit=2,
                cursor=first_page[-1].username,
            )

            assert [user.username for user in first_page] == [
                f"{prefix}_a",
                f"{prefix}_b",
            ]
            assert [user.username for user in second_page] == [
                f"{prefix}_c",
                f"{prefix}_d",
            ]
        await transaction.rollback()
