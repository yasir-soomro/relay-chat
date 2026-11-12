from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from backend.model.connection import Connection, UserBlock
from backend.model.user import User
from backend.repository.connection_repository import ConnectionRepository
from backend.repository.user_repository import UserRepository
from backend.services.connection_service import (
    ConnectionCooldownActiveError,
    ConnectionService,
    InvalidConnectionTransitionError,
)


@pytest.mark.asyncio
async def test_connection_and_block_state_persist_without_deleting_relationship(
    postgres_test_engine: AsyncEngine,
) -> None:
    token = uuid4().hex
    first = User(
        id=uuid4(),
        email=f"connection-a-{token}@example.com",
        username=f"conn_a_{token[:16]}",
        display_name="Connection A",
        password_hash="$argon2id$integration-test-hash",
    )
    second = User(
        id=uuid4(),
        email=f"connection-b-{token}@example.com",
        username=f"conn_b_{token[:16]}",
        display_name="Connection B",
        password_hash="$argon2id$integration-test-hash",
    )
    low_id, high_id = sorted((first.id, second.id))

    async with postgres_test_engine.connect() as connection:
        transaction = await connection.begin()
        async with AsyncSession(
            connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            await UserRepository(session).create(first)
            await UserRepository(session).create(second)
            repository = ConnectionRepository(session)

            assert await repository.lock_pair_users(first.id, second.id)
            relationship = Connection(
                user_low_id=low_id,
                user_high_id=high_id,
                requester_id=first.id,
                recipient_id=second.id,
                status="pending",
                requested_at=datetime.now(UTC),
            )
            await repository.create_connection(relationship)
            await repository.commit()
            await repository.update_status(
                relationship,
                "accepted",
                datetime.now(UTC),
            )
            await repository.commit()
            assert len(await repository.list_accepted(first.id)) == 1

            await repository.create_block(first.id, second.id)
            await repository.update_status(
                relationship,
                "removed",
                datetime.now(UTC),
            )
            await repository.commit()
            assert await repository.is_blocked_between(first.id, second.id)
            assert not await repository.list_accepted(first.id)

            with pytest.raises(IntegrityError):
                async with session.begin_nested():
                    session.add(UserBlock(blocker_id=second.id, blocked_id=first.id))
                    await session.flush()

            assert await repository.delete_block(first.id, second.id)
            await repository.commit()
            retained = await repository.get_by_pair_for_update(first.id, second.id)
            assert retained is not None
            assert retained.status == "removed"
            assert not await repository.is_blocked_between(first.id, second.id)
        await transaction.rollback()


@pytest.mark.asyncio
async def test_rejected_request_cooldown_persists_and_restarts(
    postgres_test_session: AsyncSession,
) -> None:
    token = uuid4().hex
    first = User(
        id=uuid4(),
        email=f"cooldown-a-{token}@example.com",
        username=f"cooldown_a_{token[:15]}",
        display_name="Cooldown A",
        password_hash="$argon2id$integration-test-hash",
    )
    second = User(
        id=uuid4(),
        email=f"cooldown-b-{token}@example.com",
        username=f"cooldown_b_{token[:15]}",
        display_name="Cooldown B",
        password_hash="$argon2id$integration-test-hash",
    )
    await UserRepository(postgres_test_session).create(first)
    await UserRepository(postgres_test_session).create(second)

    repository = ConnectionRepository(postgres_test_session)
    service = ConnectionService(repository)
    request = await service.request_connection(first.id, second.id)
    rejected = await service.reject_request(request.id, second.id)
    first_rejected_at = rejected.rejected_at

    assert first_rejected_at is not None
    assert first_rejected_at.utcoffset() == timedelta(0)
    with pytest.raises(ConnectionCooldownActiveError) as error:
        await service.request_connection(first.id, second.id)
    assert error.value.retry_at == first_rejected_at + timedelta(hours=168)
    with pytest.raises(InvalidConnectionTransitionError):
        await service.request_connection(second.id, first.id)

    stored = await repository.get_by_pair_for_update(first.id, second.id)
    assert stored is not None
    stored.rejected_at = datetime.now(UTC) - timedelta(hours=168)
    await repository.commit()

    retried = await service.request_connection(first.id, second.id)
    assert retried.id == request.id
    assert retried.status == "pending"
    assert retried.rejected_at is None

    rejected_again = await service.reject_request(request.id, second.id)
    second_rejected_at = rejected_again.rejected_at
    assert second_rejected_at is not None
    assert second_rejected_at > first_rejected_at
    with pytest.raises(ConnectionCooldownActiveError) as error:
        await service.request_connection(first.id, second.id)
    assert error.value.retry_at == second_rejected_at + timedelta(hours=168)
