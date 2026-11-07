from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from backend.model.connection import UserBlock
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


@pytest.mark.asyncio
async def test_user_discovery_prefix_pagination_and_block_exclusion(
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
    blocked_by_owner, blocked_owner = users[1], users[3]

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
            session.add_all(
                [
                    UserBlock(blocker_id=owner.id, blocked_id=blocked_by_owner.id),
                    UserBlock(blocker_id=blocked_owner.id, blocked_id=owner.id),
                ]
            )
            await session.flush()

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
                f"{prefix}_c",
            ]
            assert [user.username for user in second_page] == [
                f"{prefix}_e",
            ]
        await transaction.rollback()
