from uuid import UUID, uuid4

from backend.model.conversation import Conversation
from backend.repository.conversation_repository import (
    ConversationConflictError,
    ConversationRepositoryProtocol,
)
from backend.schemas.conversation import (
    ConversationListItemResponse,
    ConversationListResponse,
    ConversationResponse,
)


class ConversationManagementError(Exception):
    pass


class ConversationUserNotFoundError(ConversationManagementError):
    pass


class ConversationNotFoundError(ConversationManagementError):
    pass


class ConversationPermissionError(ConversationManagementError):
    pass


class SelfConversationError(ConversationManagementError):
    pass


class ConversationService:
    def __init__(self, repository: ConversationRepositoryProtocol) -> None:
        self._repository = repository

    async def create_or_get(
        self,
        user_id: UUID,
        recipient_id: UUID,
    ) -> tuple[ConversationResponse, bool]:
        if user_id == recipient_id:
            raise SelfConversationError
        await self._authorize_creation(user_id, recipient_id)
        conversation = await self._repository.get_by_pair(user_id, recipient_id)
        if conversation is not None:
            await self._repository.commit()
            return ConversationResponse.model_validate(conversation), False

        low_id, high_id = sorted((user_id, recipient_id))
        conversation = Conversation(
            id=uuid4(),
            user_low_id=low_id,
            user_high_id=high_id,
        )
        try:
            await self._repository.create(conversation)
        except ConversationConflictError:
            await self._authorize_creation(user_id, recipient_id)
            conversation = await self._repository.get_by_pair(user_id, recipient_id)
            if conversation is None:
                raise
            await self._repository.commit()
            return ConversationResponse.model_validate(conversation), False

        await self._repository.commit()
        return ConversationResponse.model_validate(conversation), True

    async def list_conversations(self, user_id: UUID) -> ConversationListResponse:
        conversations = await self._repository.list_for_user_with_unread_counts(user_id)
        return ConversationListResponse(
            items=[
                ConversationListItemResponse(
                    **ConversationResponse.model_validate(conversation).model_dump(),
                    unread_count=unread_count,
                )
                for conversation, unread_count in conversations
            ]
        )

    async def get_conversation(
        self,
        conversation_id: UUID,
        user_id: UUID,
    ) -> ConversationResponse:
        conversation = await self._repository.get_by_id(conversation_id)
        if conversation is None or user_id not in {
            conversation.user_low_id,
            conversation.user_high_id,
        }:
            raise ConversationNotFoundError
        return ConversationResponse.model_validate(conversation)

    async def _authorize_creation(
        self,
        user_id: UUID,
        recipient_id: UUID,
    ) -> None:
        if not await self._repository.lock_pair_users(user_id, recipient_id):
            raise ConversationUserNotFoundError
        if await self._repository.is_blocked_between(user_id, recipient_id):
            raise ConversationNotFoundError
        if await self._repository.get_connection_status(user_id, recipient_id) != (
            "accepted"
        ):
            raise ConversationPermissionError
