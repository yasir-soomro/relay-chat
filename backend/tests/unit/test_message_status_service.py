from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from backend.model.conversation import Conversation
from backend.model.message import Message, MessageStatus
from backend.services.message_status_service import (
    MessageStatusNotFoundError,
    MessageStatusPermissionError,
    MessageStatusService,
)


class MemoryMessageStatusRepository:
    def __init__(
        self,
        conversation: Conversation,
        messages: list[Message],
    ) -> None:
        self.conversation = conversation
        self.messages = {message.id: message for message in messages}
        self.commits = 0

    async def get_message_for_update(self, message_id: UUID) -> Message | None:
        return self.messages.get(message_id)

    async def get_messages_for_update(
        self,
        conversation_id: UUID,
        message_ids: list[UUID],
    ) -> list[Message]:
        return sorted(
            [
                message
                for message_id in message_ids
                if (message := self.messages.get(message_id)) is not None
                and message.conversation_id == conversation_id
            ],
            key=lambda item: item.id,
        )

    async def get_conversation(self, conversation_id: UUID) -> Conversation | None:
        return self.conversation if conversation_id == self.conversation.id else None

    async def set_status(
        self,
        message: Message,
        status: MessageStatus,
        *,
        delivered_at: datetime | None,
        read_at: datetime | None,
    ) -> None:
        message.status = status.value
        message.delivered_at = delivered_at
        message.read_at = read_at
        message.updated_at = datetime.now(UTC)

    async def commit(self) -> None:
        self.commits += 1


@pytest.fixture
def status_setup() -> tuple[
    UUID,
    UUID,
    UUID,
    Conversation,
    Message,
    Message,
    MemoryMessageStatusRepository,
    MessageStatusService,
]:
    sender_id, recipient_id, stranger_id = uuid4(), uuid4(), uuid4()
    low_id, high_id = sorted((sender_id, recipient_id))
    now = datetime.now(UTC)
    conversation = Conversation(
        id=uuid4(),
        user_low_id=low_id,
        user_high_id=high_id,
        created_at=now,
    )
    first = Message(
        id=uuid4(),
        conversation_id=conversation.id,
        sender_id=sender_id,
        content="first",
        status=MessageStatus.SENT.value,
        created_at=now,
        updated_at=now,
        sent_at=now,
    )
    second = Message(
        id=uuid4(),
        conversation_id=conversation.id,
        sender_id=sender_id,
        content="second",
        status=MessageStatus.SENT.value,
        created_at=now,
        updated_at=now,
        sent_at=now,
    )
    repository = MemoryMessageStatusRepository(conversation, [first, second])
    service = MessageStatusService(repository)
    return (
        sender_id,
        recipient_id,
        stranger_id,
        conversation,
        first,
        second,
        repository,
        service,
    )


@pytest.mark.asyncio
async def test_delivery_acknowledgment_is_recipient_only_idempotent_and_monotonic(
    status_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        Message,
        Message,
        MemoryMessageStatusRepository,
        MessageStatusService,
    ],
) -> None:
    sender_id, recipient_id, _, _, message, _, repository, service = status_setup

    with pytest.raises(MessageStatusPermissionError):
        await service.acknowledge_delivery(message.id, sender_id)
    with pytest.raises(MessageStatusNotFoundError):
        await service.acknowledge_delivery(message.id, uuid4())
    with pytest.raises(MessageStatusNotFoundError):
        await service.acknowledge_delivery(
            message.id,
            recipient_id,
            conversation_id=uuid4(),
        )

    delivered = await service.acknowledge_delivery(message.id, recipient_id)
    delivered_at = delivered.delivered_at
    repeated = await service.acknowledge_delivery(message.id, recipient_id)
    assert delivered.status == MessageStatus.DELIVERED
    assert delivered.delivered_at is not None
    assert repeated.delivered_at == delivered_at
    assert repository.commits == 1

    read = await service.acknowledge_read(message.id, recipient_id)
    read_at = read.read_at
    late_delivery = await service.acknowledge_delivery(message.id, recipient_id)
    assert read.status == MessageStatus.READ
    assert read.read_at is not None
    assert late_delivery.status == MessageStatus.READ
    assert late_delivery.read_at == read_at
    assert repository.commits == 2


@pytest.mark.asyncio
async def test_batch_delivery_is_recipient_only_and_idempotent(
    status_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        Message,
        Message,
        MemoryMessageStatusRepository,
        MessageStatusService,
    ],
) -> None:
    (
        sender_id,
        recipient_id,
        stranger_id,
        conversation,
        first,
        second,
        repository,
        service,
    ) = status_setup

    with pytest.raises(MessageStatusPermissionError):
        await service.acknowledge_delivery_batch(
            conversation.id,
            sender_id,
            [first.id],
        )
    with pytest.raises(MessageStatusNotFoundError):
        await service.acknowledge_delivery_batch(
            conversation.id,
            stranger_id,
            [first.id],
        )
    with pytest.raises(MessageStatusNotFoundError):
        await service.acknowledge_delivery_batch(
            conversation.id,
            recipient_id,
            [first.id, uuid4()],
        )

    result = await service.acknowledge_delivery_batch(
        conversation.id,
        recipient_id,
        [first.id, second.id],
    )
    repeated = await service.acknowledge_delivery_batch(
        conversation.id,
        recipient_id,
        [first.id, second.id],
    )

    assert len(result.items) == 2
    assert all(item.status == MessageStatus.DELIVERED for item in result.items)
    assert all(item.status == MessageStatus.DELIVERED for item in repeated.items)
    assert repository.commits == 1


@pytest.mark.asyncio
async def test_read_ack_from_sent_marks_delivered_and_read_idempotently(
    status_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        Message,
        Message,
        MemoryMessageStatusRepository,
        MessageStatusService,
    ],
) -> None:
    _, recipient_id, _, _, message, _, repository, service = status_setup

    result = await service.acknowledge_read(message.id, recipient_id)
    repeated = await service.acknowledge_read(message.id, recipient_id)

    assert result.status == MessageStatus.READ
    assert result.delivered_at == result.read_at
    assert repeated.read_at == result.read_at
    assert repository.commits == 1


@pytest.mark.asyncio
async def test_batch_read_is_atomic_recipient_scoped_and_idempotent(
    status_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        Message,
        Message,
        MemoryMessageStatusRepository,
        MessageStatusService,
    ],
) -> None:
    (
        sender_id,
        recipient_id,
        stranger_id,
        conversation,
        first,
        second,
        repository,
        service,
    ) = status_setup

    with pytest.raises(MessageStatusNotFoundError):
        await service.acknowledge_read_batch(
            conversation.id,
            stranger_id,
            [first.id],
        )
    with pytest.raises(MessageStatusPermissionError):
        await service.acknowledge_read_batch(
            conversation.id,
            sender_id,
            [first.id],
        )
    with pytest.raises(MessageStatusNotFoundError):
        await service.acknowledge_read_batch(
            conversation.id,
            recipient_id,
            [first.id, uuid4()],
        )

    result = await service.acknowledge_read_batch(
        conversation.id,
        recipient_id,
        [first.id, second.id],
    )
    repeated = await service.acknowledge_read_batch(
        conversation.id,
        recipient_id,
        [first.id, second.id],
    )

    assert len(result.items) == 2
    assert all(item.status == MessageStatus.READ for item in result.items)
    assert all(item.status == MessageStatus.READ for item in repeated.items)
    assert repository.commits == 1
