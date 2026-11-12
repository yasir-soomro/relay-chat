from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from backend.model.conversation import Conversation
from backend.model.message import Message, MessageStatus
from backend.model.user import User
from backend.repository.message_repository import MessageRepository
from backend.repository.user_repository import UserRepository


@pytest.mark.asyncio
async def test_message_persistence_pagination_edit_and_soft_delete(
    postgres_test_engine: AsyncEngine,
) -> None:
    token = uuid4().hex
    first = User(
        id=uuid4(),
        email=f"message-a-{token}@example.com",
        username=f"msg_a_{token[:16]}",
        display_name="Message A",
        password_hash="$argon2id$integration-test-hash",
    )
    second = User(
        id=uuid4(),
        email=f"message-b-{token}@example.com",
        username=f"msg_b_{token[:16]}",
        display_name="Message B",
        password_hash="$argon2id$integration-test-hash",
    )
    low_id, high_id = sorted((first.id, second.id))
    conversation = Conversation(
        id=uuid4(),
        user_low_id=low_id,
        user_high_id=high_id,
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
            session.add(conversation)
            await session.flush()
            repository = MessageRepository(session)
            base_time = datetime.now(UTC)
            messages = [
                Message(
                    id=uuid4(),
                    conversation_id=conversation.id,
                    sender_id=first.id,
                    content=f"message {index}",
                    status=MessageStatus.SENT.value,
                    created_at=base_time + timedelta(seconds=index),
                    updated_at=base_time + timedelta(seconds=index),
                )
                for index in range(3)
            ]
            for message in messages:
                await repository.create(message)
            await repository.commit()

            first_page = await repository.list_for_conversation(
                conversation.id,
                limit=2,
                before=None,
            )
            assert [item.id for item in first_page] == [
                messages[2].id,
                messages[1].id,
            ]
            second_page = await repository.list_for_conversation(
                conversation.id,
                limit=2,
                before=(first_page[-1].created_at, first_page[-1].id),
            )
            assert [item.id for item in second_page] == [messages[0].id]

            target = await repository.get_by_id(messages[2].id, for_update=True)
            assert target is not None
            await repository.update_content(target, "edited")
            await repository.commit()
            target = await repository.get_by_id(target.id)
            assert target is not None
            assert target.content == "edited"

            target = await repository.get_by_id(target.id, for_update=True)
            assert target is not None
            deleted_at = datetime.now(UTC)
            await repository.soft_delete(target, deleted_at)
            await repository.commit()
            retained = await repository.get_by_id(target.id)
            assert retained is not None
            assert retained.content is None
            assert retained.deleted_at is not None
            assert (
                len(
                    await repository.list_for_conversation(
                        conversation.id,
                        limit=10,
                        before=None,
                    )
                )
                == 3
            )
        await transaction.rollback()


@pytest.mark.asyncio
async def test_message_client_id_is_unique_per_conversation_and_sender(
    postgres_test_engine: AsyncEngine,
) -> None:
    token = uuid4().hex
    sender = User(
        id=uuid4(),
        email=f"dedup-a-{token}@example.com",
        username=f"dedup_a_{token[:16]}",
        display_name="Dedup A",
        password_hash="$argon2id$integration-test-hash",
    )
    recipient = User(
        id=uuid4(),
        email=f"dedup-b-{token}@example.com",
        username=f"dedup_b_{token[:16]}",
        display_name="Dedup B",
        password_hash="$argon2id$integration-test-hash",
    )
    low_id, high_id = sorted((sender.id, recipient.id))
    conversation = Conversation(
        id=uuid4(),
        user_low_id=low_id,
        user_high_id=high_id,
    )
    client_message_id = uuid4()
    now = datetime.now(UTC)

    async with postgres_test_engine.connect() as connection:
        transaction = await connection.begin()
        async with AsyncSession(
            connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            await UserRepository(session).create(sender)
            await UserRepository(session).create(recipient)
            session.add(conversation)
            await session.flush()
            repository = MessageRepository(session)

            first, first_created = await repository.create_or_get_by_client_id(
                Message(
                    id=uuid4(),
                    conversation_id=conversation.id,
                    sender_id=sender.id,
                    client_message_id=client_message_id,
                    content="first",
                    status=MessageStatus.SENT.value,
                    sent_at=now,
                )
            )
            await repository.commit()
            retry, retry_created = await repository.create_or_get_by_client_id(
                Message(
                    id=uuid4(),
                    conversation_id=conversation.id,
                    sender_id=sender.id,
                    client_message_id=client_message_id,
                    content="retry",
                    status=MessageStatus.SENT.value,
                    sent_at=now,
                )
            )
            await repository.commit()

            assert first_created is True
            assert retry_created is False
            assert retry.id == first.id
            assert retry.content == "first"
        await transaction.rollback()
