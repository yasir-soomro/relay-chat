from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from backend.model.connection import Connection, UserBlock
from backend.model.conversation import Conversation
from backend.model.user import User
from backend.repository.conversation_repository import ConversationRepository
from backend.repository.user_repository import UserRepository


@pytest.mark.asyncio
async def test_conversation_pair_is_unique_and_history_survives_removal_and_block(
    postgres_test_engine: AsyncEngine,
) -> None:
    token = uuid4().hex
    first = User(
        id=uuid4(),
        email=f"conversation-a-{token}@example.com",
        username=f"conv_a_{token[:16]}",
        display_name="Conversation A",
        password_hash="$argon2id$integration-test-hash",
    )
    second = User(
        id=uuid4(),
        email=f"conversation-b-{token}@example.com",
        username=f"conv_b_{token[:16]}",
        display_name="Conversation B",
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
            relationship = Connection(
                user_low_id=low_id,
                user_high_id=high_id,
                requester_id=first.id,
                recipient_id=second.id,
                status="accepted",
                requested_at=datetime.now(UTC),
            )
            session.add(relationship)
            await session.flush()
            repository = ConversationRepository(session)
            assert await repository.lock_pair_users(first.id, second.id)
            assert await repository.get_connection_status(first.id, second.id) == (
                "accepted"
            )

            conversation = Conversation(
                user_low_id=low_id,
                user_high_id=high_id,
            )
            await repository.create(conversation)
            await repository.commit()
            persisted = await repository.get_by_pair(second.id, first.id)
            assert persisted is not None
            assert persisted.id == conversation.id

            with pytest.raises(IntegrityError):
                async with session.begin_nested():
                    session.add(
                        Conversation(
                            user_low_id=low_id,
                            user_high_id=high_id,
                        )
                    )
                    await session.flush()

            relationship.status = "removed"
            session.add(UserBlock(blocker_id=first.id, blocked_id=second.id))
            await session.flush()
            assert await repository.is_blocked_between(first.id, second.id)
            assert await repository.get_by_id(conversation.id) is not None
            listed = await repository.list_for_user(first.id)
            assert len(listed) == 1
            assert (await session.scalars(select(Conversation))).all() == [conversation]
        await transaction.rollback()
