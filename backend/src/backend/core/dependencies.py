from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import Settings, get_settings
from backend.DB.session import get_db_session
from backend.repository.auth_repository import AuthRepository
from backend.repository.connection_repository import ConnectionRepository
from backend.repository.conversation_repository import ConversationRepository
from backend.repository.message_repository import MessageRepository
from backend.repository.message_status_repository import MessageStatusRepository
from backend.repository.user_repository import UserRepository
from backend.services.auth_service import AuthService
from backend.services.connection_service import ConnectionService
from backend.services.conversation_service import ConversationService
from backend.services.message_service import MessageService
from backend.services.message_status_service import MessageStatusService
from backend.services.user_service import UserService


def get_auth_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthService:
    return AuthService(
        UserRepository(session),
        AuthRepository(session),
        settings,
    )


def get_user_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UserService:
    return UserService(
        UserRepository(session),
        ConnectionRepository(session),
    )


def get_connection_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ConnectionService:
    return ConnectionService(
        ConnectionRepository(session),
        settings.connection_request_cooldown_seconds,
    )


def get_conversation_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ConversationService:
    return ConversationService(ConversationRepository(session))


def get_message_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> MessageService:
    return MessageService(
        MessageRepository(session),
        ConversationRepository(session),
    )


def get_message_status_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> MessageStatusService:
    return MessageStatusService(MessageStatusRepository(session))
