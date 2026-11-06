from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from uuid import UUID, uuid4

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from backend.core.config import Settings, get_settings
from backend.model.user import User
from backend.repository.auth_repository import AuthRepositoryProtocol
from backend.repository.user_repository import (
    UserRepositoryProtocol,
    UserUniqueConflict,
)
from backend.schemas.auth import LoginRequest
from backend.schemas.user import UserAccountResponse, UserCreate

JWT_ALGORITHM = "HS256"
REFRESH_TOKEN_COOKIE = "relay_refresh_token"  # nosec B105
JWT_ISSUER = "relay"
JWT_AUDIENCE = "relay-api"


class InvalidCredentialsError(Exception):
    pass


class InvalidAuthenticationTokenError(Exception):
    pass


class RefreshTokenReuseError(Exception):
    pass


class AuthenticationConfigurationError(Exception):
    pass


class UserAlreadyExistsError(Exception):
    def __init__(self, field: str) -> None:
        self.field = field
        super().__init__(f"User {field} already exists")


@lru_cache
def _password_hasher() -> PasswordHash:
    return PasswordHash.recommended()


@lru_cache
def _dummy_password_hash() -> str:
    return _password_hasher().hash(secrets.token_urlsafe(32))


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class AccessTokenClaims:
    user_id: UUID
    session_id: UUID


@dataclass(frozen=True)
class AuthenticatedUser:
    user: User
    session_id: UUID

    @property
    def id(self) -> UUID:
        return self.user.id


@dataclass(frozen=True)
class IssuedTokens:
    access_token: str
    refresh_token: str
    expires_in: int
    refresh_expires_at: datetime


class AuthService:
    def __init__(
        self,
        user_repository: UserRepositoryProtocol,
        auth_repository: AuthRepositoryProtocol,
        settings: Settings | None = None,
    ) -> None:
        self._user_repository = user_repository
        self._auth_repository = auth_repository
        self._settings = settings or get_settings()

    async def register(self, data: UserCreate) -> UserAccountResponse:
        email = str(data.email).strip().lower()
        if await self._user_repository.email_exists(email):
            raise UserAlreadyExistsError("email")
        if await self._user_repository.username_exists(data.username):
            raise UserAlreadyExistsError("username")

        user = User(
            email=email,
            username=data.username,
            display_name=data.display_name,
            password_hash=_password_hasher().hash(data.password.get_secret_value()),
            bio=data.bio,
        )
        try:
            await self._user_repository.create(user)
            await self._user_repository.commit()
        except UserUniqueConflict as error:
            raise UserAlreadyExistsError(error.field) from None
        return UserAccountResponse.model_validate(user)

    async def login(
        self, data: LoginRequest
    ) -> tuple[UserAccountResponse, IssuedTokens, UUID]:
        self._secret()
        user = await self._user_repository.get_by_email(str(data.email).lower())
        password_hash = (
            user.password_hash if user is not None else _dummy_password_hash()
        )
        password_valid = _password_hasher().verify(
            data.password.get_secret_value(),
            password_hash,
        )
        if user is None or not password_valid:
            raise InvalidCredentialsError

        now = datetime.now(UTC)
        refresh_expires_at = now + timedelta(
            days=self._settings.auth_refresh_token_expire_days
        )
        refresh_token = secrets.token_urlsafe(48)
        auth_session = await self._auth_repository.create_session(
            user.id,
            hash_refresh_token(refresh_token),
            refresh_expires_at,
        )
        await self._auth_repository.commit()
        access_token, expires_in = self._issue_access_token(
            user.id, auth_session.id, now
        )
        return (
            UserAccountResponse.model_validate(user),
            IssuedTokens(access_token, refresh_token, expires_in, refresh_expires_at),
            auth_session.id,
        )

    async def refresh(self, token: str | None) -> tuple[IssuedTokens, UUID]:
        if not token:
            raise InvalidAuthenticationTokenError
        self._secret()

        now = datetime.now(UTC)
        token_hash = hash_refresh_token(token)
        session_id = await self._auth_repository.get_refresh_token_session_id(
            token_hash
        )
        if session_id is None:
            raise InvalidAuthenticationTokenError

        auth_session = await self._auth_repository.get_session_for_update(session_id)
        if auth_session is None:
            raise InvalidAuthenticationTokenError

        token_record = await self._auth_repository.get_refresh_token_for_update(
            token_hash
        )
        if token_record is None or token_record.session_id != session_id:
            raise InvalidAuthenticationTokenError

        if token_record.used_at is not None:
            if auth_session.revoked_at is None:
                await self._auth_repository.revoke_session(auth_session, now)
                await self._auth_repository.commit()
                raise RefreshTokenReuseError
            raise InvalidAuthenticationTokenError

        if (
            token_record.revoked_at is not None
            or token_record.expires_at <= now
            or auth_session.revoked_at is not None
            or auth_session.expires_at <= now
        ):
            raise InvalidAuthenticationTokenError

        refresh_token = secrets.token_urlsafe(48)
        refresh_expires_at = now + timedelta(
            days=self._settings.auth_refresh_token_expire_days
        )
        await self._auth_repository.rotate_refresh_token(
            auth_session,
            token_record,
            hash_refresh_token(refresh_token),
            refresh_expires_at,
            now,
        )
        await self._auth_repository.commit()
        access_token, expires_in = self._issue_access_token(
            auth_session.user_id,
            auth_session.id,
            now,
        )
        return (
            IssuedTokens(access_token, refresh_token, expires_in, refresh_expires_at),
            auth_session.id,
        )

    async def authenticate_access_token(self, token: str) -> AuthenticatedUser:
        claims = self._decode_access_token(token)
        now = datetime.now(UTC)
        if not await self._auth_repository.is_session_active(claims.session_id, now):
            raise InvalidAuthenticationTokenError
        user = await self._user_repository.get_by_id(claims.user_id)
        if user is None:
            raise InvalidAuthenticationTokenError
        return AuthenticatedUser(user=user, session_id=claims.session_id)

    async def logout(self, session_id: UUID) -> None:
        auth_session = await self._auth_repository.get_session_for_update(session_id)
        if auth_session is None:
            raise InvalidAuthenticationTokenError
        await self._auth_repository.revoke_session(auth_session, datetime.now(UTC))
        await self._auth_repository.commit()

    def _secret(self) -> str:
        secret = self._settings.auth_jwt_secret.get_secret_value()
        if len(secret.encode("utf-8")) < 32:
            raise AuthenticationConfigurationError(
                "AUTH_JWT_SECRET must contain at least 32 bytes"
            )
        return secret

    def _issue_access_token(
        self,
        user_id: UUID,
        session_id: UUID,
        now: datetime,
    ) -> tuple[str, int]:
        expires_in = self._settings.auth_access_token_expire_minutes * 60
        expires_at = now + timedelta(seconds=expires_in)
        token = jwt.encode(
            {
                "sub": str(user_id),
                "sid": str(session_id),
                "jti": str(uuid4()),
                "iat": now,
                "exp": expires_at,
                "iss": JWT_ISSUER,
                "aud": JWT_AUDIENCE,
            },
            self._secret(),
            algorithm=JWT_ALGORITHM,
        )
        return token, expires_in

    def _decode_access_token(self, token: str) -> AccessTokenClaims:
        try:
            payload = jwt.decode(
                token,
                self._secret(),
                algorithms=[JWT_ALGORITHM],
                issuer=JWT_ISSUER,
                audience=JWT_AUDIENCE,
                options={"require": ["sub", "sid", "jti", "iat", "exp", "iss", "aud"]},
            )
            user_id = UUID(payload["sub"])
            session_id = UUID(payload["sid"])
            UUID(payload["jti"])
        except InvalidTokenError, KeyError, TypeError, ValueError:
            raise InvalidAuthenticationTokenError from None
        return AccessTokenClaims(user_id=user_id, session_id=session_id)
