from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from backend.model.connection import Connection, UserBlock
from backend.model.conversation import Conversation
from backend.model.message import Message
from backend.model.user import User
from backend.repository.conversation_repository import ConversationRepository
from backend.repository.notification_repository import NotificationRepository
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
            listed = await repository.list_for_user_with_unread_counts(first.id)
            assert len(listed) == 1
            assert listed[0][1] == 0
            assert (await session.scalars(select(Conversation))).all() == [conversation]
        await transaction.rollback()


@pytest.mark.asyncio
async def test_unread_aggregation_counts_only_incoming_unread_messages(
    postgres_test_engine: AsyncEngine,
) -> None:
    token = uuid4().hex
    first = User(
        id=uuid4(),
        email=f"unread-a-{token}@example.com",
        username=f"unread_a_{token[:16]}",
        display_name="Unread A",
        password_hash="$argon2id$integration-test-hash",
    )
    second = User(
        id=uuid4(),
        email=f"unread-b-{token}@example.com",
        username=f"unread_b_{token[:16]}",
        display_name="Unread B",
        password_hash="$argon2id$integration-test-hash",
    )
    outsider = User(
        id=uuid4(),
        email=f"unread-c-{token}@example.com",
        username=f"unread_c_{token[:16]}",
        display_name="Unread C",
        password_hash="$argon2id$integration-test-hash",
    )

    async with postgres_test_engine.connect() as connection:
        transaction = await connection.begin()
        async with AsyncSession(
            connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            await UserRepository(session).create(first)
            await UserRepository(session).create(second)
            await UserRepository(session).create(outsider)
            conversation = Conversation(
                user_low_id=min(first.id, second.id),
                user_high_id=max(first.id, second.id),
            )
            unrelated = Conversation(
                user_low_id=min(second.id, outsider.id),
                user_high_id=max(second.id, outsider.id),
            )
            session.add_all([conversation, unrelated])
            await session.flush()
            now = datetime.now(UTC)
            session.add_all(
                [
                    Message(
                        conversation_id=conversation.id,
                        sender_id=second.id,
                        content="incoming sent",
                        status="sent",
                        sent_at=now,
                    ),
                    Message(
                        conversation_id=conversation.id,
                        sender_id=second.id,
                        content="incoming delivered",
                        status="delivered",
                        sent_at=now,
                        delivered_at=now,
                    ),
                    Message(
                        conversation_id=conversation.id,
                        sender_id=second.id,
                        content="already read",
                        status="read",
                        sent_at=now,
                        delivered_at=now,
                        read_at=now,
                    ),
                    Message(
                        conversation_id=conversation.id,
                        sender_id=first.id,
                        content="outgoing",
                        status="sent",
                        sent_at=now,
                    ),
                    Message(
                        conversation_id=unrelated.id,
                        sender_id=outsider.id,
                        content="other conversation",
                        status="sent",
                        sent_at=now,
                    ),
                ]
            )
            await session.flush()

            repository = ConversationRepository(session)
            listed = await repository.list_for_user_with_unread_counts(first.id)
            assert [(item.id, count) for item, count in listed] == [
                (conversation.id, 2)
            ]
            assert (
                await NotificationRepository(session).count_unread_for_user(first.id)
                == 2
            )
            assert (
                await NotificationRepository(session).count_unread_for_user(second.id)
                == 2
            )

            incoming = await session.scalar(
                select(Message).where(Message.content == "incoming delivered")
            )
            assert incoming is not None
            incoming.status = "read"
            incoming.read_at = now
            await session.flush()
            assert (
                await NotificationRepository(session).count_unread_for_user(first.id)
                == 1
            )

        await transaction.rollback()
