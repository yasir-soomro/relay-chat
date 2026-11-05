from datetime import datetime
from typing import Protocol
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.model.auth_session import AuthRefreshToken, AuthSession


class AuthRepositoryProtocol(Protocol):
    async def create_session(
        self,
        user_id: UUID,
        refresh_token_hash: str,
        expires_at: datetime,
    ) -> AuthSession: ...

    async def get_refresh_token_for_update(
        self,
        token_hash: str,
    ) -> AuthRefreshToken | None: ...

    async def get_refresh_token_session_id(self, token_hash: str) -> UUID | None: ...

    async def get_session_for_update(self, session_id: UUID) -> AuthSession | None: ...

    async def rotate_refresh_token(
        self,
        session: AuthSession,
        old_token: AuthRefreshToken,
        new_token_hash: str,
        expires_at: datetime,
        now: datetime,
    ) -> None: ...

    async def revoke_session(self, session: AuthSession, now: datetime) -> None: ...

    async def is_session_active(self, session_id: UUID, now: datetime) -> bool: ...

    async def commit(self) -> None: ...


class AuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_session(
        self,
        user_id: UUID,
        refresh_token_hash: str,
        expires_at: datetime,
    ) -> AuthSession:
        auth_session = AuthSession(user_id=user_id, expires_at=expires_at)
        self._session.add(auth_session)
        await self._session.flush()
        self._session.add(
            AuthRefreshToken(
                session_id=auth_session.id,
                token_hash=refresh_token_hash,
                expires_at=expires_at,
            )
        )
        await self._session.flush()
        return auth_session

    async def get_refresh_token_for_update(
        self,
        token_hash: str,
    ) -> AuthRefreshToken | None:
        statement = (
            select(AuthRefreshToken)
            .where(AuthRefreshToken.token_hash == token_hash)
            .with_for_update()
        )
        return await self._session.scalar(statement)

    async def get_refresh_token_session_id(self, token_hash: str) -> UUID | None:
        statement = select(AuthRefreshToken.session_id).where(
            AuthRefreshToken.token_hash == token_hash
        )
        return await self._session.scalar(statement)

    async def get_session_for_update(self, session_id: UUID) -> AuthSession | None:
        statement = (
            select(AuthSession).where(AuthSession.id == session_id).with_for_update()
        )
        return await self._session.scalar(statement)

    async def rotate_refresh_token(
        self,
        session: AuthSession,
        old_token: AuthRefreshToken,
        new_token_hash: str,
        expires_at: datetime,
        now: datetime,
    ) -> None:
        new_token = AuthRefreshToken(
            session_id=session.id,
            token_hash=new_token_hash,
            expires_at=expires_at,
        )
        self._session.add(new_token)
        await self._session.flush()
        old_token.used_at = now
        old_token.replaced_by_id = new_token.id
        session.last_used_at = now
        session.expires_at = expires_at
        await self._session.flush()

    async def revoke_session(self, session: AuthSession, now: datetime) -> None:
        session.revoked_at = session.revoked_at or now
        statement = (
            select(AuthRefreshToken)
            .where(
                AuthRefreshToken.session_id == session.id,
                AuthRefreshToken.revoked_at.is_(None),
            )
            .with_for_update()
        )
        tokens = (await self._session.scalars(statement)).all()
        for token in tokens:
            token.revoked_at = now
        await self._session.flush()

    async def is_session_active(self, session_id: UUID, now: datetime) -> bool:
        statement = select(AuthSession.id).where(
            AuthSession.id == session_id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        )
        return (await self._session.scalar(statement)) is not None

    async def commit(self) -> None:
        await self._session.commit()
