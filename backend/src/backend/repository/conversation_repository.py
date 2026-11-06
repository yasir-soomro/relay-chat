from typing import Protocol
from uuid import UUID

from sqlalchemy import and_, exists, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.model.connection import Connection, UserBlock
from backend.model.conversation import Conversation
from backend.model.user import User


class ConversationRepositoryProtocol(Protocol):
    async def lock_pair_users(self, first_id: UUID, second_id: UUID) -> bool: ...

    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool: ...

    async def get_connection_status(
        self, first_id: UUID, second_id: UUID
    ) -> str | None: ...

    async def get_by_pair(
        self, first_id: UUID, second_id: UUID
    ) -> Conversation | None: ...

    async def get_by_id(self, conversation_id: UUID) -> Conversation | None: ...

    async def create(self, conversation: Conversation) -> None: ...

    async def list_for_user(self, user_id: UUID) -> list[Conversation]: ...

    async def commit(self) -> None: ...


class ConversationConflictError(Exception):
    pass


class ConversationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def lock_pair_users(self, first_id: UUID, second_id: UUID) -> bool:
        user_ids = sorted({first_id, second_id})
        statement = (
            select(User.id)
            .where(User.id.in_(user_ids))
            .order_by(User.id)
            .with_for_update()
        )
        return len((await self._session.scalars(statement)).all()) == 2

    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool:
        statement = select(
            exists().where(
                or_(
                    and_(
                        UserBlock.blocker_id == first_id,
                        UserBlock.blocked_id == second_id,
                    ),
                    and_(
                        UserBlock.blocker_id == second_id,
                        UserBlock.blocked_id == first_id,
                    ),
                )
            )
        )
        return bool(await self._session.scalar(statement))

    async def get_connection_status(
        self,
        first_id: UUID,
        second_id: UUID,
    ) -> str | None:
        low_id, high_id = sorted((first_id, second_id))
        statement = select(Connection.status).where(
            Connection.user_low_id == low_id,
            Connection.user_high_id == high_id,
        )
        return await self._session.scalar(statement)

    async def get_by_pair(
        self,
        first_id: UUID,
        second_id: UUID,
    ) -> Conversation | None:
        low_id, high_id = sorted((first_id, second_id))
        statement = select(Conversation).where(
            Conversation.user_low_id == low_id,
            Conversation.user_high_id == high_id,
        )
        return await self._session.scalar(statement)

    async def get_by_id(self, conversation_id: UUID) -> Conversation | None:
        return await self._session.get(Conversation, conversation_id)

    async def create(self, conversation: Conversation) -> None:
        self._session.add(conversation)
        try:
            await self._session.flush()
        except IntegrityError as error:
            await self._session.rollback()
            diagnostic = getattr(getattr(error, "orig", None), "diag", None)
            if (
                getattr(diagnostic, "constraint_name", None)
                == "uq_conversations_user_pair"
            ):
                raise ConversationConflictError from None
            raise

    async def list_for_user(self, user_id: UUID) -> list[Conversation]:
        statement = (
            select(Conversation)
            .where(
                or_(
                    Conversation.user_low_id == user_id,
                    Conversation.user_high_id == user_id,
                )
            )
            .order_by(Conversation.created_at.desc(), Conversation.id)
        )
        return list((await self._session.scalars(statement)).all())

    async def commit(self) -> None:
        await self._session.commit()
