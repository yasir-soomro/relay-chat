from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.model.conversation import Conversation
from backend.model.message import Message


class MessageRepositoryProtocol(Protocol):
    async def get_conversation(self, conversation_id: UUID) -> Conversation | None: ...

    async def create(self, message: Message) -> None: ...

    async def create_or_get_by_client_id(
        self, message: Message
    ) -> tuple[Message, bool]: ...

    async def list_for_conversation(
        self,
        conversation_id: UUID,
        *,
        limit: int,
        before: tuple[datetime, UUID] | None,
    ) -> list[Message]: ...

    async def get_by_id(
        self, message_id: UUID, *, for_update: bool = False
    ) -> Message | None: ...

    async def update_content(self, message: Message, content: str) -> None: ...

    async def soft_delete(self, message: Message, deleted_at: datetime) -> None: ...

    async def commit(self) -> None: ...


class MessageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_conversation(self, conversation_id: UUID) -> Conversation | None:
        return await self._session.get(Conversation, conversation_id)

    async def create(self, message: Message) -> None:
        self._session.add(message)
        await self._session.flush()

    async def create_or_get_by_client_id(
        self, message: Message
    ) -> tuple[Message, bool]:
        if message.client_message_id is None:
            raise ValueError("client_message_id is required for idempotent creation")

        statement = (
            pg_insert(Message)
            .values(
                id=message.id,
                conversation_id=message.conversation_id,
                sender_id=message.sender_id,
                client_message_id=message.client_message_id,
                content=message.content,
                status=message.status,
                sent_at=message.sent_at,
            )
            .on_conflict_do_nothing(
                constraint="uq_messages_conversation_sender_client_message_id"
            )
            .returning(Message.id)
        )
        inserted_id = await self._session.scalar(statement)
        if inserted_id is not None:
            persisted = await self._session.get(Message, inserted_id)
            if persisted is None:
                raise RuntimeError("Persisted message was not found")
            return persisted, True

        existing_statement = select(Message).where(
            Message.conversation_id == message.conversation_id,
            Message.sender_id == message.sender_id,
            Message.client_message_id == message.client_message_id,
        )
        existing = await self._session.scalar(existing_statement)
        if existing is None:
            raise RuntimeError("Conflicting message was not found")
        return existing, False

    async def list_for_conversation(
        self,
        conversation_id: UUID,
        *,
        limit: int,
        before: tuple[datetime, UUID] | None,
    ) -> list[Message]:
        statement = select(Message).where(Message.conversation_id == conversation_id)
        if before is not None:
            created_at, message_id = before
            statement = statement.where(
                or_(
                    Message.created_at < created_at,
                    and_(
                        Message.created_at == created_at,
                        Message.id < message_id,
                    ),
                )
            )
        statement = statement.order_by(
            Message.created_at.desc(), Message.id.desc()
        ).limit(limit)
        return list((await self._session.scalars(statement)).all())

    async def get_by_id(
        self,
        message_id: UUID,
        *,
        for_update: bool = False,
    ) -> Message | None:
        statement = select(Message).where(Message.id == message_id)
        if for_update:
            statement = statement.with_for_update()
        return await self._session.scalar(statement)

    async def update_content(self, message: Message, content: str) -> None:
        message.content = content
        message.updated_at = datetime.now(UTC)
        await self._session.flush()

    async def soft_delete(self, message: Message, deleted_at: datetime) -> None:
        message.content = None
        message.deleted_at = deleted_at
        message.updated_at = deleted_at
        await self._session.flush()

    async def commit(self) -> None:
        await self._session.commit()
