from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from backend.model.conversation import Conversation
from backend.model.message import Message, MessageStatus
from backend.model.user import User
from backend.repository.message_status_repository import MessageStatusRepository
from backend.repository.user_repository import UserRepository
from backend.services.message_status_service import (
    MessageStatusPermissionError,
    MessageStatusService,
)


@pytest.mark.asyncio
async def test_delivery_read_and_batch_acknowledgments_persist(
    postgres_test_engine: AsyncEngine,
) -> None:
    token = uuid4().hex
    sender = User(
        id=uuid4(),
        email=f"status-sender-{token}@example.com",
        username=f"status_s_{token[:16]}",
        display_name="Status Sender",
        password_hash="$argon2id$integration-test-hash",
    )
    recipient = User(
        id=uuid4(),
        email=f"status-recipient-{token}@example.com",
        username=f"status_r_{token[:16]}",
        display_name="Status Recipient",
        password_hash="$argon2id$integration-test-hash",
    )
    low_id, high_id = sorted((sender.id, recipient.id))
    conversation = Conversation(
        id=uuid4(),
        user_low_id=low_id,
        user_high_id=high_id,
    )
    now = datetime.now(UTC)
    delivered_message = Message(
        id=uuid4(),
        conversation_id=conversation.id,
        sender_id=sender.id,
        content="Delivered",
        status=MessageStatus.SENT.value,
        sent_at=now,
    )
    batch_message = Message(
        id=uuid4(),
        conversation_id=conversation.id,
        sender_id=sender.id,
        content="Batch read",
        status=MessageStatus.SENT.value,
        sent_at=now,
    )

    async with postgres_test_engine.connect() as connection:
        transaction = await connection.begin()
        async with AsyncSession(
            connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            await UserRepository(session).create(sender)
            await UserRepository(session).create(recipient)
            session.add_all([conversation, delivered_message, batch_message])
            await session.flush()
            service = MessageStatusService(MessageStatusRepository(session))

            with pytest.raises(MessageStatusPermissionError):
                await service.acknowledge_delivery(
                    delivered_message.id,
                    sender.id,
                )

            delivered = await service.acknowledge_delivery(
                delivered_message.id,
                recipient.id,
            )
            repeated_delivery = await service.acknowledge_delivery(
                delivered_message.id,
                recipient.id,
            )
            assert delivered.status == MessageStatus.DELIVERED
            assert delivered.delivered_at is not None
            assert repeated_delivery.delivered_at == delivered.delivered_at

            batch_delivery = await service.acknowledge_delivery_batch(
                conversation.id,
                recipient.id,
                [batch_message.id],
            )
            assert len(batch_delivery.items) == 1
            assert batch_delivery.items[0].status == MessageStatus.DELIVERED
            repeated_batch_delivery = await service.acknowledge_delivery_batch(
                conversation.id,
                recipient.id,
                [batch_message.id],
            )
            assert (
                repeated_batch_delivery.items[0].delivered_at
                == batch_delivery.items[0].delivered_at
            )

            read = await service.acknowledge_read(
                delivered_message.id,
                recipient.id,
            )
            assert read.status == MessageStatus.READ
            assert read.read_at is not None

            batch = await service.acknowledge_read_batch(
                conversation.id,
                recipient.id,
                [batch_message.id],
            )
            assert len(batch.items) == 1
            assert batch.items[0].status == MessageStatus.READ
            assert batch.items[0].delivered_at == batch.items[0].read_at
        await transaction.rollback()
