from datetime import UTC, datetime
from uuid import UUID

from backend.model.message import Message, MessageStatus
from backend.repository.message_status_repository import (
    MessageStatusRepositoryProtocol,
)
from backend.schemas.message_status import (
    MessageDeliveryBatchResponse,
    MessageReadBatchResponse,
    MessageStatusResponse,
)


class MessageStatusManagementError(Exception):
    pass


class MessageStatusNotFoundError(MessageStatusManagementError):
    pass


class MessageStatusPermissionError(MessageStatusManagementError):
    pass


class MessageStatusService:
    def __init__(self, repository: MessageStatusRepositoryProtocol) -> None:
        self._repository = repository

    async def acknowledge_delivery(
        self,
        message_id: UUID,
        recipient_id: UUID,
        *,
        conversation_id: UUID | None = None,
    ) -> MessageStatusResponse:
        status, _ = await self.acknowledge_delivery_with_context(
            message_id,
            recipient_id,
            conversation_id=conversation_id,
        )
        return status

    async def acknowledge_delivery_with_context(
        self,
        message_id: UUID,
        recipient_id: UUID,
        *,
        conversation_id: UUID | None = None,
    ) -> tuple[MessageStatusResponse, UUID]:
        message = await self._get_recipient_message(
            message_id,
            recipient_id,
            conversation_id=conversation_id,
        )
        if message.status == MessageStatus.SENT.value:
            now = max(datetime.now(UTC), message.sent_at)
            await self._repository.set_status(
                message,
                MessageStatus.DELIVERED,
                delivered_at=now,
                read_at=None,
            )
            await self._repository.commit()
        return MessageStatusResponse.model_validate(message), message.conversation_id

    async def acknowledge_read(
        self,
        message_id: UUID,
        recipient_id: UUID,
    ) -> MessageStatusResponse:
        status, _ = await self.acknowledge_read_with_context(message_id, recipient_id)
        return status

    async def acknowledge_read_with_context(
        self,
        message_id: UUID,
        recipient_id: UUID,
    ) -> tuple[MessageStatusResponse, UUID]:
        message = await self._get_recipient_message(message_id, recipient_id)
        if message.status != MessageStatus.READ.value:
            now = datetime.now(UTC)
            delivered_at = message.delivered_at or max(now, message.sent_at)
            read_at = max(now, delivered_at)
            await self._repository.set_status(
                message,
                MessageStatus.READ,
                delivered_at=delivered_at,
                read_at=read_at,
            )
            await self._repository.commit()
        return MessageStatusResponse.model_validate(message), message.conversation_id

    async def acknowledge_delivery_batch(
        self,
        conversation_id: UUID,
        recipient_id: UUID,
        message_ids: list[UUID],
    ) -> MessageDeliveryBatchResponse:
        if (
            not message_ids
            or len(message_ids) > 100
            or len(set(message_ids)) != len(message_ids)
        ):
            raise MessageStatusNotFoundError
        conversation = await self._repository.get_conversation(conversation_id)
        if conversation is None or recipient_id not in {
            conversation.user_low_id,
            conversation.user_high_id,
        }:
            raise MessageStatusNotFoundError
        messages = await self._repository.get_messages_for_update(
            conversation_id,
            message_ids,
        )
        if len(messages) != len(message_ids):
            raise MessageStatusNotFoundError
        if any(message.sender_id == recipient_id for message in messages):
            raise MessageStatusPermissionError
        if any(
            message.sender_id
            not in {
                conversation.user_low_id,
                conversation.user_high_id,
            }
            for message in messages
        ):
            raise MessageStatusNotFoundError

        now = datetime.now(UTC)
        changed = False
        for message in messages:
            if message.status == MessageStatus.SENT.value:
                await self._repository.set_status(
                    message,
                    MessageStatus.DELIVERED,
                    delivered_at=max(now, message.sent_at),
                    read_at=None,
                )
                changed = True
        if changed:
            await self._repository.commit()
        return MessageDeliveryBatchResponse(
            items=[
                MessageStatusResponse.model_validate(message) for message in messages
            ]
        )

    async def acknowledge_read_batch(
        self,
        conversation_id: UUID,
        recipient_id: UUID,
        message_ids: list[UUID],
    ) -> MessageReadBatchResponse:
        if (
            not message_ids
            or len(message_ids) > 100
            or len(set(message_ids)) != len(message_ids)
        ):
            raise MessageStatusNotFoundError
        conversation = await self._repository.get_conversation(conversation_id)
        if conversation is None or recipient_id not in {
            conversation.user_low_id,
            conversation.user_high_id,
        }:
            raise MessageStatusNotFoundError
        messages = await self._repository.get_messages_for_update(
            conversation_id,
            message_ids,
        )
        if len(messages) != len(message_ids):
            raise MessageStatusNotFoundError
        if any(message.sender_id == recipient_id for message in messages):
            raise MessageStatusPermissionError
        if any(
            message.sender_id
            not in {
                conversation.user_low_id,
                conversation.user_high_id,
            }
            for message in messages
        ):
            raise MessageStatusNotFoundError

        now = datetime.now(UTC)
        changed = False
        for message in messages:
            if message.status != MessageStatus.READ.value:
                delivered_at = message.delivered_at or max(now, message.sent_at)
                await self._repository.set_status(
                    message,
                    MessageStatus.READ,
                    delivered_at=delivered_at,
                    read_at=max(now, delivered_at),
                )
                changed = True
        if changed:
            await self._repository.commit()
        return MessageReadBatchResponse(
            items=[
                MessageStatusResponse.model_validate(message) for message in messages
            ]
        )

    async def _get_recipient_message(
        self,
        message_id: UUID,
        recipient_id: UUID,
        *,
        conversation_id: UUID | None = None,
    ) -> Message:
        message = await self._repository.get_message_for_update(message_id)
        if message is None:
            raise MessageStatusNotFoundError
        conversation = await self._repository.get_conversation(message.conversation_id)
        if (
            conversation is None
            or (
                conversation_id is not None
                and message.conversation_id != conversation_id
            )
            or recipient_id
            not in {
                conversation.user_low_id,
                conversation.user_high_id,
            }
        ):
            raise MessageStatusNotFoundError
        if message.sender_id not in {
            conversation.user_low_id,
            conversation.user_high_id,
        }:
            raise MessageStatusNotFoundError
        if message.sender_id == recipient_id:
            raise MessageStatusPermissionError
        return message
