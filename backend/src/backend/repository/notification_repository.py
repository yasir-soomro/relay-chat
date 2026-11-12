from typing import Protocol
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.model.conversation import Conversation
from backend.model.message import Message


class NotificationRepositoryProtocol(Protocol):
    async def count_unread_for_user(self, user_id: UUID) -> int: ...


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def count_unread_for_user(self, user_id: UUID) -> int:
        incoming_from_participant = or_(
            and_(
                Conversation.user_low_id == user_id,
                Message.sender_id == Conversation.user_high_id,
            ),
            and_(
                Conversation.user_high_id == user_id,
                Message.sender_id == Conversation.user_low_id,
            ),
        )
        statement = (
            select(func.count(Message.id))
            .select_from(Conversation)
            .join(
                Message,
                and_(
                    Message.conversation_id == Conversation.id,
                    incoming_from_participant,
                    Message.status != "read",
                ),
            )
            .where(
                or_(
                    Conversation.user_low_id == user_id,
                    Conversation.user_high_id == user_id,
                )
            )
        )
        return int(await self._session.scalar(statement) or 0)
