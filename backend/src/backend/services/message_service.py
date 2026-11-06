import base64
import binascii
from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID, uuid4

from backend.model.conversation import Conversation
from backend.model.message import Message, MessageStatus
from backend.repository.message_repository import MessageRepositoryProtocol
from backend.schemas.message import (
    MessageListResponse,
    MessageResponse,
)


class MessageManagementError(Exception):
    pass


class MessageNotFoundError(MessageManagementError):
    pass


class MessagePermissionError(MessageManagementError):
    pass


class MessageAuthorPermissionError(MessageManagementError):
    pass


class MessageStateConflictError(MessageManagementError):
    pass


class MessagePaginationError(MessageManagementError):
    pass


class MessageConnectionRepositoryProtocol(Protocol):
    async def lock_pair_users(self, first_id: UUID, second_id: UUID) -> bool: ...

    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool: ...

    async def get_connection_status(
        self, first_id: UUID, second_id: UUID
    ) -> str | None: ...


class MessageService:
    def __init__(
        self,
        message_repository: MessageRepositoryProtocol,
        conversation_repository: MessageConnectionRepositoryProtocol,
    ) -> None:
        self._messages = message_repository
        self._conversations = conversation_repository

    async def send_message(
        self,
        conversation_id: UUID,
        sender_id: UUID,
        content: str,
    ) -> MessageResponse:
        message, _, _ = await self._send_message(
            conversation_id,
            sender_id,
            content,
            client_message_id=None,
        )
        return message

    async def send_message_idempotently(
        self,
        conversation_id: UUID,
        sender_id: UUID,
        content: str,
        client_message_id: UUID,
    ) -> tuple[MessageResponse, bool, UUID]:
        return await self._send_message(
            conversation_id,
            sender_id,
            content,
            client_message_id=client_message_id,
        )

    async def _send_message(
        self,
        conversation_id: UUID,
        sender_id: UUID,
        content: str,
        *,
        client_message_id: UUID | None,
    ) -> tuple[MessageResponse, bool, UUID]:
        conversation = await self._get_participant_conversation(
            conversation_id,
            sender_id,
        )
        other_id = (
            conversation.user_high_id
            if conversation.user_low_id == sender_id
            else conversation.user_low_id
        )
        if not await self._conversations.lock_pair_users(sender_id, other_id):
            raise MessageNotFoundError
        if await self._conversations.is_blocked_between(sender_id, other_id):
            raise MessagePermissionError
        if (
            await self._conversations.get_connection_status(sender_id, other_id)
            != "accepted"
        ):
            raise MessagePermissionError

        message = Message(
            id=uuid4(),
            conversation_id=conversation_id,
            sender_id=sender_id,
            client_message_id=client_message_id,
            content=content,
            status=MessageStatus.SENT.value,
            sent_at=datetime.now(UTC),
        )
        if client_message_id is None:
            await self._messages.create(message)
            created = True
        else:
            message, created = await self._messages.create_or_get_by_client_id(message)
        await self._messages.commit()
        return MessageResponse.model_validate(message), created, other_id

    async def list_messages(
        self,
        conversation_id: UUID,
        user_id: UUID,
        *,
        limit: int,
        cursor: str | None,
    ) -> MessageListResponse:
        await self._get_participant_conversation(conversation_id, user_id)
        if not 1 <= limit <= 100:
            raise MessagePaginationError
        before = self._decode_cursor(cursor) if cursor is not None else None
        rows = await self._messages.list_for_conversation(
            conversation_id,
            limit=limit + 1,
            before=before,
        )
        has_more = len(rows) > limit
        page = rows[:limit]
        next_cursor = self._encode_cursor(page[-1]) if has_more and page else None
        return MessageListResponse(
            items=[MessageResponse.model_validate(item) for item in page],
            next_cursor=next_cursor,
        )

    async def get_message(self, message_id: UUID, user_id: UUID) -> MessageResponse:
        message = await self._get_participant_message(message_id, user_id)
        return MessageResponse.model_validate(message)

    async def edit_message(
        self,
        message_id: UUID,
        user_id: UUID,
        content: str,
    ) -> MessageResponse:
        message = await self._get_participant_message(
            message_id,
            user_id,
            for_update=True,
        )
        self._ensure_author(message, user_id)
        if message.deleted_at is not None:
            raise MessageStateConflictError
        await self._messages.update_content(message, content)
        await self._messages.commit()
        return MessageResponse.model_validate(message)

    async def delete_message(
        self,
        message_id: UUID,
        user_id: UUID,
    ) -> MessageResponse:
        message = await self._get_participant_message(
            message_id,
            user_id,
            for_update=True,
        )
        self._ensure_author(message, user_id)
        if message.deleted_at is not None:
            raise MessageStateConflictError
        await self._messages.soft_delete(message, datetime.now(UTC))
        await self._messages.commit()
        return MessageResponse.model_validate(message)

    async def _get_participant_conversation(
        self,
        conversation_id: UUID,
        user_id: UUID,
    ) -> Conversation:
        conversation = await self._messages.get_conversation(conversation_id)
        if conversation is None or user_id not in {
            conversation.user_low_id,
            conversation.user_high_id,
        }:
            raise MessageNotFoundError
        return conversation

    async def _get_participant_message(
        self,
        message_id: UUID,
        user_id: UUID,
        *,
        for_update: bool = False,
    ) -> Message:
        message = await self._messages.get_by_id(message_id, for_update=for_update)
        if message is None:
            raise MessageNotFoundError
        await self._get_participant_conversation(message.conversation_id, user_id)
        return message

    @staticmethod
    def _ensure_author(message: Message, user_id: UUID) -> None:
        if message.sender_id != user_id:
            raise MessageAuthorPermissionError

    @staticmethod
    def _encode_cursor(message: Message) -> str:
        value = f"{message.created_at.isoformat()}|{message.id}"
        return base64.urlsafe_b64encode(value.encode()).decode().rstrip("=")

    @staticmethod
    def _decode_cursor(cursor: str) -> tuple[datetime, UUID]:
        if len(cursor) > 256:
            raise MessagePaginationError
        try:
            padding = "=" * (-len(cursor) % 4)
            decoded = base64.b64decode(
                cursor + padding,
                altchars=b"-_",
                validate=True,
            ).decode()
            timestamp, message_id = decoded.split("|", maxsplit=1)
            parsed_at = datetime.fromisoformat(timestamp)
            if parsed_at.tzinfo is None:
                raise ValueError("Cursor timestamp must include a timezone")
            return parsed_at, UUID(message_id)
        except (
            ValueError,
            UnicodeDecodeError,
            binascii.Error,
        ):
            raise MessagePaginationError from None
