from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import Settings, get_settings
from backend.DB.session import get_db_session
from backend.repository.auth_repository import AuthRepository
from backend.repository.user_repository import UserRepository
from backend.services.auth_service import AuthService
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
    return UserService(UserRepository(session))
