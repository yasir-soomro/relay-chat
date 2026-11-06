from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from backend.model.conversation import Conversation
from backend.model.message import Message
from backend.services.message_service import (
    MessageAuthorPermissionError,
    MessageNotFoundError,
    MessagePaginationError,
    MessagePermissionError,
    MessageService,
    MessageStateConflictError,
)


class MemoryMessageRepository:
    def __init__(self, conversation: Conversation) -> None:
        self.conversation = conversation
        self.messages: dict[UUID, Message] = {}
        self.commits = 0

    async def get_conversation(self, conversation_id: UUID) -> Conversation | None:
        return self.conversation if conversation_id == self.conversation.id else None

    async def create(self, message: Message) -> None:
        now = datetime.now(UTC)
        message.created_at = now
        message.sent_at = now
        message.updated_at = now
        self.messages[message.id] = message

    async def create_or_get_by_client_id(
        self,
        message: Message,
    ) -> tuple[Message, bool]:
        existing = next(
            (
                item
                for item in self.messages.values()
                if item.conversation_id == message.conversation_id
                and item.sender_id == message.sender_id
                and item.client_message_id == message.client_message_id
            ),
            None,
        )
        if existing is not None:
            return existing, False
        await self.create(message)
        return message, True

    async def list_for_conversation(
        self,
        conversation_id: UUID,
        *,
        limit: int,
        before: tuple[datetime, UUID] | None,
    ) -> list[Message]:
        messages = [
            item
            for item in self.messages.values()
            if item.conversation_id == conversation_id
            and (before is None or (item.created_at, item.id) < before)
        ]
        return sorted(
            messages,
            key=lambda item: (item.created_at, item.id),
            reverse=True,
        )[:limit]

    async def get_by_id(
        self,
        message_id: UUID,
        *,
        for_update: bool = False,
    ) -> Message | None:
        return self.messages.get(message_id)

    async def update_content(self, message: Message, content: str) -> None:
        message.content = content
        message.updated_at = datetime.now(UTC)

    async def soft_delete(self, message: Message, deleted_at: datetime) -> None:
        message.content = None
        message.deleted_at = deleted_at
        message.updated_at = deleted_at

    async def commit(self) -> None:
        self.commits += 1


class MemoryConversationRepository:
    def __init__(self) -> None:
        self.user_ids: set[UUID] = set()
        self.connection_status: dict[tuple[UUID, UUID], str] = {}
        self.blocks: set[tuple[UUID, UUID]] = set()

    @staticmethod
    def pair(first_id: UUID, second_id: UUID) -> tuple[UUID, UUID]:
        low_id, high_id = sorted((first_id, second_id))
        return low_id, high_id

    async def lock_pair_users(self, first_id: UUID, second_id: UUID) -> bool:
        return first_id in self.user_ids and second_id in self.user_ids

    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool:
        return self.pair(first_id, second_id) in self.blocks

    async def get_connection_status(
        self,
        first_id: UUID,
        second_id: UUID,
    ) -> str | None:
        return self.connection_status.get(self.pair(first_id, second_id))


@pytest.fixture
def message_setup() -> tuple[
    UUID,
    UUID,
    UUID,
    Conversation,
    MemoryMessageRepository,
    MemoryConversationRepository,
    MessageService,
]:
    sender_id, recipient_id, stranger_id = uuid4(), uuid4(), uuid4()
    low_id, high_id = sorted((sender_id, recipient_id))
    conversation = Conversation(
        id=uuid4(),
        user_low_id=low_id,
        user_high_id=high_id,
        created_at=datetime.now(UTC),
    )
    messages = MemoryMessageRepository(conversation)
    conversations = MemoryConversationRepository()
    conversations.user_ids.update({sender_id, recipient_id, stranger_id})
    conversations.connection_status[conversations.pair(sender_id, recipient_id)] = (
        "accepted"
    )
    service = MessageService(messages, conversations)
    return (
        sender_id,
        recipient_id,
        stranger_id,
        conversation,
        messages,
        conversations,
        service,
    )


@pytest.mark.asyncio
async def test_send_persists_as_sent_for_offline_retrieval(
    message_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        MemoryMessageRepository,
        MemoryConversationRepository,
        MessageService,
    ],
) -> None:
    sender_id, recipient_id, _, conversation, repository, _, service = message_setup

    message = await service.send_message(conversation.id, sender_id, "Hello")
    page = await service.list_messages(
        conversation.id,
        recipient_id,
        limit=10,
        cursor=None,
    )

    assert message.content == "Hello"
    assert message.status == "sent"
    assert [item.id for item in page.items] == [message.id]
    assert repository.commits == 1


@pytest.mark.asyncio
async def test_idempotent_send_returns_original_message_for_retries(
    message_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        MemoryMessageRepository,
        MemoryConversationRepository,
        MessageService,
    ],
) -> None:
    sender_id, _, _, conversation, repository, _, service = message_setup
    client_message_id = uuid4()

    original, created, recipient_id = await service.send_message_idempotently(
        conversation.id,
        sender_id,
        "Original",
        client_message_id,
    )
    retry, retry_created, retry_recipient_id = await service.send_message_idempotently(
        conversation.id,
        sender_id,
        "Changed retry payload",
        client_message_id,
    )

    assert created is True
    assert retry_created is False
    assert retry.id == original.id
    assert retry.content == "Original"
    assert recipient_id != sender_id
    assert retry_recipient_id == recipient_id
    assert len(repository.messages) == 1
    assert repository.commits == 2


@pytest.mark.asyncio
@pytest.mark.parametrize("restriction", ["removed", "blocked"])
async def test_send_requires_accepted_unblocked_connection(
    restriction: str,
    message_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        MemoryMessageRepository,
        MemoryConversationRepository,
        MessageService,
    ],
) -> None:
    sender_id, recipient_id, _, conversation, _, connections, service = message_setup
    existing = await service.send_message(conversation.id, sender_id, "History")
    pair = connections.pair(sender_id, recipient_id)
    if restriction == "removed":
        connections.connection_status[pair] = "removed"
    else:
        connections.blocks.add(pair)

    history = await service.list_messages(
        conversation.id,
        recipient_id,
        limit=10,
        cursor=None,
    )
    assert [message.id for message in history.items] == [existing.id]

    with pytest.raises(MessagePermissionError):
        await service.send_message(conversation.id, sender_id, "No")


@pytest.mark.asyncio
async def test_message_access_requires_conversation_participant(
    message_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        MemoryMessageRepository,
        MemoryConversationRepository,
        MessageService,
    ],
) -> None:
    sender_id, _, stranger_id, conversation, _, _, service = message_setup

    with pytest.raises(MessageNotFoundError):
        await service.list_messages(
            conversation.id,
            stranger_id,
            limit=10,
            cursor=None,
        )
    with pytest.raises(MessageNotFoundError):
        await service.send_message(conversation.id, stranger_id, "Intrusion")

    message = await service.send_message(conversation.id, sender_id, "Private")
    with pytest.raises(MessageNotFoundError):
        await service.get_message(message.id, stranger_id)


@pytest.mark.asyncio
async def test_cursor_pagination_returns_stable_pages_and_rejects_bad_cursor(
    message_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        MemoryMessageRepository,
        MemoryConversationRepository,
        MessageService,
    ],
) -> None:
    sender_id, _, _, conversation, _, _, service = message_setup
    sent = [
        await service.send_message(conversation.id, sender_id, f"message {index}")
        for index in range(3)
    ]

    first = await service.list_messages(
        conversation.id,
        sender_id,
        limit=2,
        cursor=None,
    )
    second = await service.list_messages(
        conversation.id,
        sender_id,
        limit=2,
        cursor=first.next_cursor,
    )

    assert {item.id for item in first.items}.isdisjoint(
        {item.id for item in second.items}
    )
    assert len(first.items) == 2
    assert len(second.items) == 1
    assert first.next_cursor is not None
    assert second.next_cursor is None
    assert len(sent) == 3
    combined = first.items + second.items
    assert [(item.created_at, item.id) for item in combined] == sorted(
        ((item.created_at, item.id) for item in combined),
        reverse=True,
    )

    with pytest.raises(MessagePaginationError):
        await service.list_messages(
            conversation.id,
            sender_id,
            limit=2,
            cursor="bad-cursor",
        )


@pytest.mark.asyncio
async def test_only_author_can_edit_or_soft_delete_and_tombstone_is_preserved(
    message_setup: tuple[
        UUID,
        UUID,
        UUID,
        Conversation,
        MemoryMessageRepository,
        MemoryConversationRepository,
        MessageService,
    ],
) -> None:
    sender_id, recipient_id, _, conversation, repository, _, service = message_setup
    message = await service.send_message(conversation.id, sender_id, "Original")

    with pytest.raises(MessageAuthorPermissionError):
        await service.edit_message(message.id, recipient_id, "Unauthorized")
    with pytest.raises(MessageAuthorPermissionError):
        await service.delete_message(message.id, recipient_id)

    edited = await service.edit_message(message.id, sender_id, "Edited")
    assert edited.content == "Edited"
    deleted = await service.delete_message(message.id, sender_id)
    assert deleted.content is None
    assert deleted.deleted_at is not None
    assert repository.messages[message.id].id == message.id

    with pytest.raises(MessageStateConflictError):
        await service.edit_message(message.id, sender_id, "Restore")
    with pytest.raises(MessageStateConflictError):
        await service.delete_message(message.id, sender_id)
