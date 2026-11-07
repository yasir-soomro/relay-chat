import threading
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
import pytest
from pwdlib import PasswordHash
from pydantic import SecretStr

from backend.core.config import Settings
from backend.model.auth_session import AuthRefreshToken, AuthSession
from backend.model.user import User
from backend.repository.user_repository import UserUniqueConflict
from backend.schemas.auth import LoginRequest
from backend.schemas.user import UserCreate
from backend.services.auth_service import (
    JWT_ALGORITHM,
    JWT_AUDIENCE,
    JWT_ISSUER,
    AuthenticationConfigurationError,
    AuthService,
    InvalidAuthenticationTokenError,
    InvalidCredentialsError,
    RefreshTokenReuseError,
    UserAlreadyExistsError,
    hash_refresh_token,
)

TEST_SECRET = "test-only-signing-secret-that-is-at-least-32-bytes"


def make_test_settings() -> Settings:
    return Settings(
        db_user="test",
        db_password=SecretStr("test-password"),
        db_host="localhost",
        db_port=5432,
        db_name="test",
        auth_jwt_secret=SecretStr(TEST_SECRET),
    )


class MemoryUserRepository:
    def __init__(self) -> None:
        self.users: dict[UUID, User] = {}

    async def get_by_id(self, user_id: UUID) -> User | None:
        return self.users.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return next((u for u in self.users.values() if u.email == email.lower()), None)

    async def email_exists(self, email: str) -> bool:
        return await self.get_by_email(email) is not None

    async def username_exists(
        self,
        username: str,
        *,
        excluding_user_id: UUID | None = None,
    ) -> bool:
        return any(
            user.id != excluding_user_id and user.username.lower() == username.lower()
            for user in self.users.values()
        )

    async def create(self, user: User) -> User:
        if await self.email_exists(user.email):
            raise UserUniqueConflict("email")
        if await self.username_exists(user.username):
            raise UserUniqueConflict("username")
        user.id = uuid4()
        user.created_at = datetime.now(UTC)
        user.updated_at = user.created_at
        self.users[user.id] = user
        return user

    async def update_profile(
        self,
        user: User,
        fields: dict[str, str | None],
    ) -> User:
        for field, value in fields.items():
            setattr(user, field, value)
        return user

    async def commit(self) -> None:
        return None


class MemoryAuthRepository:
    def __init__(self) -> None:
        self.sessions: dict[UUID, AuthSession] = {}
        self.refresh_tokens: dict[str, AuthRefreshToken] = {}

    async def create_session(
        self,
        user_id: UUID,
        refresh_token_hash: str,
        expires_at: datetime,
    ) -> AuthSession:
        now = datetime.now(UTC)
        session = AuthSession(
            id=uuid4(),
            user_id=user_id,
            created_at=now,
            last_used_at=now,
            expires_at=expires_at,
        )
        token = AuthRefreshToken(
            id=uuid4(),
            session_id=session.id,
            token_hash=refresh_token_hash,
            created_at=now,
            expires_at=expires_at,
        )
        self.sessions[session.id] = session
        self.refresh_tokens[refresh_token_hash] = token
        return session

    async def get_refresh_token_for_update(
        self,
        token_hash: str,
    ) -> AuthRefreshToken | None:
        return self.refresh_tokens.get(token_hash)

    async def get_refresh_token_session_id(self, token_hash: str) -> UUID | None:
        token = self.refresh_tokens.get(token_hash)
        return token.session_id if token is not None else None

    async def get_session_for_update(self, session_id: UUID) -> AuthSession | None:
        return self.sessions.get(session_id)

    async def rotate_refresh_token(
        self,
        session: AuthSession,
        old_token: AuthRefreshToken,
        new_token_hash: str,
        expires_at: datetime,
        now: datetime,
    ) -> None:
        new_token = AuthRefreshToken(
            id=uuid4(),
            session_id=session.id,
            token_hash=new_token_hash,
            created_at=now,
            expires_at=expires_at,
        )
        old_token.used_at = now
        old_token.replaced_by_id = new_token.id
        session.last_used_at = now
        session.expires_at = expires_at
        self.refresh_tokens[new_token_hash] = new_token

    async def revoke_session(self, session: AuthSession, now: datetime) -> None:
        session.revoked_at = session.revoked_at or now
        for token in self.refresh_tokens.values():
            if token.session_id == session.id and token.revoked_at is None:
                token.revoked_at = now

    async def is_session_active(self, session_id: UUID, now: datetime) -> bool:
        session = self.sessions.get(session_id)
        return (
            session is not None
            and session.revoked_at is None
            and session.expires_at > now
        )

    async def commit(self) -> None:
        return None


def make_service() -> tuple[AuthService, MemoryUserRepository, MemoryAuthRepository]:
    users = MemoryUserRepository()
    auth = MemoryAuthRepository()
    return AuthService(users, auth, make_test_settings()), users, auth


def registration_data(email: str = "relay@example.com") -> UserCreate:
    return UserCreate.model_validate(
        {
            "email": email,
            "username": "relay_user",
            "display_name": "Relay User",
            "password": "a-secure-password",
        }
    )


def login_data(
    email: str = "relay@example.com",
    password: str = "a-secure-password",
) -> LoginRequest:
    return LoginRequest.model_validate({"email": email, "password": password})


@pytest.mark.asyncio
async def test_register_hashes_password_and_login_creates_independent_sessions() -> (
    None
):
    service, users, auth = make_service()
    account = await service.register(registration_data())
    stored_user = users.users[account.id]
    assert stored_user.password_hash.startswith("$argon2id$")
    assert PasswordHash.recommended().verify(
        "a-secure-password",
        stored_user.password_hash,
    )

    _, first_tokens, first_session_id = await service.login(
        login_data("RELAY@example.com")
    )
    _, second_tokens, second_session_id = await service.login(login_data())

    assert first_session_id != second_session_id
    assert len(auth.sessions) == 2
    assert first_tokens.refresh_token != second_tokens.refresh_token
    assert hash_refresh_token(first_tokens.refresh_token) in auth.refresh_tokens
    assert first_tokens.refresh_token not in auth.refresh_tokens
    assert first_tokens.expires_in == 15 * 60


@pytest.mark.asyncio
async def test_login_requires_a_configured_jwt_signing_secret() -> None:
    settings = Settings(
        db_user="test",
        db_password=SecretStr("test-password"),
        db_host="localhost",
        db_port=5432,
        db_name="test",
        auth_jwt_secret=SecretStr(""),
    )
    service = AuthService(MemoryUserRepository(), MemoryAuthRepository(), settings)

    await service.register(registration_data())
    with pytest.raises(AuthenticationConfigurationError):
        await service.login(login_data())


@pytest.mark.asyncio
async def test_login_rejects_unknown_email_and_wrong_password() -> None:
    service, _, _ = make_service()
    with pytest.raises(InvalidCredentialsError):
        await service.login(login_data("missing@example.com", "wrong-password"))

    await service.register(registration_data())
    with pytest.raises(InvalidCredentialsError):
        await service.login(login_data(password="wrong-password"))


@pytest.mark.asyncio
async def test_registration_rejects_duplicate_email_and_username() -> None:
    service, _, _ = make_service()
    await service.register(registration_data())

    with pytest.raises(UserAlreadyExistsError) as duplicate_email:
        await service.register(registration_data())
    assert duplicate_email.value.field == "email"

    with pytest.raises(UserAlreadyExistsError) as duplicate_username:
        await service.register(
            UserCreate.model_validate(
                {
                    "email": "second@example.com",
                    "username": "relay_user",
                    "display_name": "Second User",
                    "password": "another-secure-password",
                }
            )
        )
    assert duplicate_username.value.field == "username"


@pytest.mark.asyncio
async def test_refresh_rotates_token_and_reuse_revokes_session() -> None:
    service, users, auth = make_service()
    account = await service.register(registration_data())
    _, original, session_id = await service.login(login_data())

    rotated, rotated_session_id = await service.refresh(original.refresh_token)
    assert rotated_session_id == session_id
    assert rotated.refresh_token != original.refresh_token

    with pytest.raises(RefreshTokenReuseError):
        await service.refresh(original.refresh_token)
    assert auth.sessions[session_id].revoked_at is not None
    with pytest.raises(InvalidAuthenticationTokenError):
        await service.authenticate_access_token(rotated.access_token)
    assert users.users[account.id].id == account.id


@pytest.mark.asyncio
async def test_logout_revokes_only_current_session() -> None:
    service, _, auth = make_service()
    await service.register(registration_data())
    _, first, first_session_id = await service.login(login_data())
    _, second, second_session_id = await service.login(login_data())

    await service.logout(first_session_id)

    with pytest.raises(InvalidAuthenticationTokenError):
        await service.authenticate_access_token(first.access_token)
    assert await auth.is_session_active(second_session_id, datetime.now(UTC))
    assert auth.sessions[first_session_id].revoked_at is not None
    assert (
        auth.refresh_tokens[hash_refresh_token(first.refresh_token)].revoked_at
        is not None
    )
    assert (
        auth.refresh_tokens[hash_refresh_token(second.refresh_token)].revoked_at is None
    )


@pytest.mark.asyncio
async def test_valid_access_token_resolves_its_user_and_session() -> None:
    service, users, auth = make_service()
    account = await service.register(registration_data())
    _, tokens, session_id = await service.login(login_data())

    principal = await service.authenticate_access_token(tokens.access_token)
    claims = jwt.decode(
        tokens.access_token,
        TEST_SECRET,
        algorithms=[JWT_ALGORITHM],
        issuer=JWT_ISSUER,
        audience=JWT_AUDIENCE,
    )

    assert principal.id == account.id
    assert principal.user is users.users[account.id]
    assert principal.session_id == session_id
    assert claims["sub"] == str(account.id)
    assert claims["sid"] == str(session_id)
    assert await auth.is_session_active(session_id, datetime.now(UTC))


@pytest.mark.asyncio
async def test_jwt_signature_expiry_and_claim_validation() -> None:
    service, _, auth = make_service()
    now = datetime.now(UTC)
    user_id = uuid4()
    session = await auth.create_session(user_id, "a" * 64, now + timedelta(days=1))
    claims = {
        "sub": str(user_id),
        "sid": str(session.id),
        "jti": str(uuid4()),
        "iat": now,
        "exp": now - timedelta(seconds=1),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    }
    expired = jwt.encode(claims, TEST_SECRET, algorithm=JWT_ALGORITHM)
    with pytest.raises(InvalidAuthenticationTokenError):
        await service.authenticate_access_token(expired)

    valid_but_tampered = jwt.encode(
        {**claims, "exp": now + timedelta(minutes=5)},
        "another-signing-secret-that-is-at-least-32-bytes",
        algorithm=JWT_ALGORITHM,
    )
    with pytest.raises(InvalidAuthenticationTokenError):
        await service.authenticate_access_token(valid_but_tampered)


@pytest.mark.asyncio
async def test_refresh_expiry_is_enforced() -> None:
    service, _, auth = make_service()
    await service.register(registration_data())
    _, tokens, session_id = await service.login(login_data())
    token_record = auth.refresh_tokens[hash_refresh_token(tokens.refresh_token)]
    token_record.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    auth.sessions[session_id].expires_at = token_record.expires_at

    with pytest.raises(InvalidAuthenticationTokenError):
        await service.refresh(tokens.refresh_token)


@pytest.mark.asyncio
async def test_password_hashing_and_verification_run_off_the_event_loop(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    thread_ids: list[int] = []
    main_thread_id = threading.get_ident()

    class ThreadTrackingHasher:
        def hash(self, password: str) -> str:
            thread_ids.append(threading.get_ident())
            return f"hash:{password}"

        def verify(self, password: str, password_hash: str) -> bool:
            thread_ids.append(threading.get_ident())
            return password_hash == f"hash:{password}"

    monkeypatch.setattr(
        "backend.services.auth_service._password_hasher",
        ThreadTrackingHasher,
    )
    service, _, _ = make_service()

    await service.register(registration_data())
    await service.login(login_data())

    assert len(thread_ids) == 2
    assert all(thread_id != main_thread_id for thread_id in thread_ids)
