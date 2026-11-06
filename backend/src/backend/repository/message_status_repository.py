from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.model.conversation import Conversation
from backend.model.message import Message, MessageStatus


class MessageStatusRepositoryProtocol(Protocol):
    async def get_message_for_update(self, message_id: UUID) -> Message | None: ...

    async def get_messages_for_update(
        self,
        conversation_id: UUID,
        message_ids: list[UUID],
    ) -> list[Message]: ...

    async def get_conversation(self, conversation_id: UUID) -> Conversation | None: ...

    async def set_status(
        self,
        message: Message,
        status: MessageStatus,
        *,
        delivered_at: datetime | None,
        read_at: datetime | None,
    ) -> None: ...

    async def commit(self) -> None: ...


class MessageStatusRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_message_for_update(self, message_id: UUID) -> Message | None:
        statement = (
            select(Message)
            .where(Message.id == message_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return await self._session.scalar(statement)

    async def get_messages_for_update(
        self,
        conversation_id: UUID,
        message_ids: list[UUID],
    ) -> list[Message]:
        statement = (
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.id.in_(message_ids),
            )
            .order_by(Message.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return list((await self._session.scalars(statement)).all())

    async def get_conversation(self, conversation_id: UUID) -> Conversation | None:
        return await self._session.get(Conversation, conversation_id)

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
        await self._session.commit()
