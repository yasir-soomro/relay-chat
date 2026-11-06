from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from backend.model.conversation import Conversation
from backend.services.conversation_service import (
    ConversationNotFoundError,
    ConversationPermissionError,
    ConversationService,
    ConversationUserNotFoundError,
    SelfConversationError,
)


class MemoryConversationRepository:
    def __init__(self, user_ids: set[UUID]) -> None:
        self.user_ids = user_ids
        self.connection_status: dict[tuple[UUID, UUID], str] = {}
        self.blocks: set[tuple[UUID, UUID]] = set()
        self.conversations: dict[UUID, Conversation] = {}
        self.pairs: dict[tuple[UUID, UUID], Conversation] = {}
        self.commits = 0

    @staticmethod
    def _pair(first_id: UUID, second_id: UUID) -> tuple[UUID, UUID]:
        low_id, high_id = sorted((first_id, second_id))
        return low_id, high_id

    async def lock_pair_users(self, first_id: UUID, second_id: UUID) -> bool:
        return first_id in self.user_ids and second_id in self.user_ids

    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool:
        return self._pair(first_id, second_id) in self.blocks

    async def get_connection_status(
        self,
        first_id: UUID,
        second_id: UUID,
    ) -> str | None:
        return self.connection_status.get(self._pair(first_id, second_id))

    async def get_by_pair(
        self,
        first_id: UUID,
        second_id: UUID,
    ) -> Conversation | None:
        return self.pairs.get(self._pair(first_id, second_id))

    async def get_by_id(self, conversation_id: UUID) -> Conversation | None:
        return self.conversations.get(conversation_id)

    async def create(self, conversation: Conversation) -> None:
        pair = self._pair(conversation.user_low_id, conversation.user_high_id)
        conversation.created_at = datetime.now(UTC)
        self.pairs[pair] = conversation
        self.conversations[conversation.id] = conversation

    async def list_for_user(self, user_id: UUID) -> list[Conversation]:
        return [
            conversation
            for conversation in self.conversations.values()
            if user_id in {conversation.user_low_id, conversation.user_high_id}
        ]

    async def commit(self) -> None:
        self.commits += 1


@pytest.fixture
def conversation_setup() -> tuple[UUID, UUID, UUID, MemoryConversationRepository]:
    user_id, recipient_id, stranger_id = uuid4(), uuid4(), uuid4()
    repository = MemoryConversationRepository({user_id, recipient_id, stranger_id})
    repository.connection_status[repository._pair(user_id, recipient_id)] = "accepted"
    return user_id, recipient_id, stranger_id, repository


@pytest.mark.asyncio
async def test_create_or_get_is_idempotent_and_canonicalizes_pair(
    conversation_setup: tuple[UUID, UUID, UUID, MemoryConversationRepository],
) -> None:
    user_id, recipient_id, _, repository = conversation_setup
    service = ConversationService(repository)

    first, created = await service.create_or_get(user_id, recipient_id)
    second, created_again = await service.create_or_get(recipient_id, user_id)

    assert created
    assert not created_again
    assert first == second
    assert first.user_low_id < first.user_high_id
    assert len(repository.conversations) == 1


@pytest.mark.asyncio
async def test_creation_requires_existing_accepted_unblocked_connection(
    conversation_setup: tuple[UUID, UUID, UUID, MemoryConversationRepository],
) -> None:
    user_id, recipient_id, stranger_id, repository = conversation_setup
    service = ConversationService(repository)

    with pytest.raises(ConversationPermissionError):
        await service.create_or_get(user_id, stranger_id)

    repository.blocks.add(repository._pair(user_id, recipient_id))
    with pytest.raises(ConversationNotFoundError):
        await service.create_or_get(user_id, recipient_id)

    with pytest.raises(SelfConversationError):
        await service.create_or_get(user_id, user_id)


@pytest.mark.asyncio
async def test_creation_rejects_unknown_participants(
    conversation_setup: tuple[UUID, UUID, UUID, MemoryConversationRepository],
) -> None:
    user_id, _, _, repository = conversation_setup
    service = ConversationService(repository)

    with pytest.raises(ConversationUserNotFoundError):
        await service.create_or_get(user_id, uuid4())


@pytest.mark.asyncio
async def test_only_participants_can_retrieve_and_list_conversations(
    conversation_setup: tuple[UUID, UUID, UUID, MemoryConversationRepository],
) -> None:
    user_id, recipient_id, stranger_id, repository = conversation_setup
    service = ConversationService(repository)
    conversation, _ = await service.create_or_get(user_id, recipient_id)

    assert await service.get_conversation(UUID(str(conversation.id)), recipient_id)
    assert len((await service.list_conversations(user_id)).items) == 1
    assert not (await service.list_conversations(stranger_id)).items

    with pytest.raises(ConversationNotFoundError):
        await service.get_conversation(conversation.id, stranger_id)


@pytest.mark.asyncio
@pytest.mark.parametrize("state", ["removed", "blocked"])
async def test_history_remains_accessible_after_connection_removal_or_block(
    state: str,
    conversation_setup: tuple[UUID, UUID, UUID, MemoryConversationRepository],
) -> None:
    user_id, recipient_id, _, repository = conversation_setup
    service = ConversationService(repository)
    conversation, _ = await service.create_or_get(user_id, recipient_id)

    pair = repository._pair(user_id, recipient_id)
    expected_error: type[Exception] = ConversationPermissionError
    if state == "removed":
        repository.connection_status[pair] = "removed"
    else:
        repository.blocks.add(pair)
        expected_error = ConversationNotFoundError

    assert await service.get_conversation(conversation.id, user_id)
    assert len((await service.list_conversations(recipient_id)).items) == 1
    with pytest.raises(expected_error):
        await service.create_or_get(user_id, recipient_id)
