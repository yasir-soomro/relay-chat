from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr

from backend.core.config import Settings, get_settings
from backend.core.dependencies import get_auth_service, get_user_service
from backend.core.security import get_current_user
from backend.main import app
from backend.model.user import User
from backend.schemas.auth import LoginRequest
from backend.schemas.user import (
    UserAccountResponse,
    UserCreate,
    UserProfileUpdate,
    UserPublicProfile,
)
from backend.services.auth_service import (
    AuthenticatedUser,
    InvalidAuthenticationTokenError,
    IssuedTokens,
    UserAlreadyExistsError,
)


@pytest.fixture
def api_settings() -> Settings:
    return Settings(
        db_user="test",
        db_password=SecretStr("test-password"),
        db_host="localhost",
        db_port=5432,
        db_name="test",
        auth_jwt_secret=SecretStr("test-only-signing-secret-that-is-at-least-32-bytes"),
        app_env="production",
    )


@pytest.fixture
def account() -> User:
    now = datetime.now(UTC)
    return User(
        id=uuid4(),
        email="relay@example.com",
        username="relay_user",
        display_name="Relay User",
        password_hash="never-return-this",
        bio=None,
        created_at=now,
        updated_at=now,
    )


class AuthServiceStub:
    def __init__(self, *, duplicate_registration: bool = False) -> None:
        self.logout_session: UUID | None = None
        self.duplicate_registration = duplicate_registration

    async def register(self, data: UserCreate) -> UserAccountResponse:
        if self.duplicate_registration:
            raise UserAlreadyExistsError("email")
        now = datetime.now(UTC)
        return UserAccountResponse(
            id=uuid4(),
            email=data.email,
            username=data.username,
            display_name=data.display_name,
            bio=data.bio,
            created_at=now,
            updated_at=now,
        )

    async def login(
        self,
        data: LoginRequest,
    ) -> tuple[None, IssuedTokens, UUID]:
        tokens = IssuedTokens(
            access_token="signed-access-token",
            refresh_token="opaque-refresh-secret",
            expires_in=900,
            refresh_expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        return None, tokens, uuid4()

    async def refresh(self, token: str | None) -> tuple[IssuedTokens, UUID]:
        raise InvalidAuthenticationTokenError

    async def logout(self, session_id: UUID) -> None:
        self.logout_session = session_id


class UserServiceStub:
    def __init__(self, account: User) -> None:
        self.account = account
        self.updated_ids: tuple[UUID, UUID] | None = None
        self.profile_request: tuple[UUID, UUID] | None = None

    async def get_public_profile(
        self,
        user_id: UUID,
        requester_id: UUID,
    ) -> UserPublicProfile:
        self.profile_request = (user_id, requester_id)
        return UserPublicProfile.model_validate(self.account)

    async def update_profile(
        self,
        user_id: UUID,
        requester_id: UUID,
        data: UserProfileUpdate,
    ) -> UserAccountResponse:
        self.updated_ids = (user_id, requester_id)
        if data.username is not None:
            self.account.username = data.username
        return UserAccountResponse.model_validate(self.account)


@pytest.fixture
async def api_client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_auth_and_user_routes_require_bearer_auth(
    api_client: AsyncClient,
) -> None:
    me_response = await api_client.get("/auth/me")
    user_response = await api_client.get("/users/me")

    assert me_response.status_code == 401
    assert user_response.status_code == 401
    assert me_response.headers["www-authenticate"] == "Bearer"


@pytest.mark.asyncio
async def test_registration_returns_account_without_password_hash(
    api_client: AsyncClient,
) -> None:
    app.dependency_overrides[get_auth_service] = lambda: AuthServiceStub()

    response = await api_client.post(
        "/auth/register",
        json={
            "email": " Relay@Example.com ",
            "username": "relay_user",
            "display_name": "Relay User",
            "password": "a-secure-password",
        },
    )

    assert response.status_code == 201
    assert response.json()["user"]["email"] == "relay@example.com"
    assert "password_hash" not in response.json()["user"]


@pytest.mark.asyncio
async def test_registration_maps_duplicate_account_to_conflict(
    api_client: AsyncClient,
) -> None:
    app.dependency_overrides[get_auth_service] = lambda: AuthServiceStub(
        duplicate_registration=True
    )

    response = await api_client.post(
        "/auth/register",
        json={
            "email": "relay@example.com",
            "username": "relay_user",
            "display_name": "Relay User",
            "password": "a-secure-password",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "User email already exists"


@pytest.mark.asyncio
async def test_validation_errors_do_not_echo_submitted_credentials(
    api_client: AsyncClient,
) -> None:
    sensitive_value = "submitted-input-value-for-test"

    response = await api_client.post(
        "/auth/register",
        json={
            "email": "not-an-email",
            "username": "x",
            "display_name": "Relay User",
            "password": [sensitive_value],
        },
    )

    assert response.status_code == 422
    assert sensitive_value not in response.text
    assert all(
        "input" not in item and "ctx" not in item for item in response.json()["detail"]
    )


@pytest.mark.asyncio
async def test_login_uses_secure_httponly_strict_refresh_cookie(
    api_client: AsyncClient,
    api_settings: Settings,
) -> None:
    auth_stub = AuthServiceStub()
    app.dependency_overrides[get_auth_service] = lambda: auth_stub
    app.dependency_overrides[get_settings] = lambda: api_settings

    response = await api_client.post(
        "/auth/login",
        headers={"Origin": "http://localhost:5173"},
        json={"email": "relay@example.com", "password": "a-secure-password"},
    )

    cookie = response.headers["set-cookie"]
    assert response.status_code == 200
    assert response.json() == {
        "access_token": "signed-access-token",
        "token_type": "bearer",
        "expires_in": 900,
    }
    assert "relay_refresh_token=opaque-refresh-secret" in cookie
    assert "httponly" in cookie.lower()
    assert "secure" in cookie.lower()
    assert "samesite=strict" in cookie.lower()
    assert "path=/auth" in cookie.lower()
    assert "opaque-refresh-secret" not in response.text
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["pragma"] == "no-cache"


@pytest.mark.asyncio
async def test_invalid_refresh_clears_cookie_and_disallowed_origin_is_rejected(
    api_client: AsyncClient,
    api_settings: Settings,
) -> None:
    auth_stub = AuthServiceStub()
    app.dependency_overrides[get_auth_service] = lambda: auth_stub
    app.dependency_overrides[get_settings] = lambda: api_settings

    denied = await api_client.post(
        "/auth/refresh",
        headers={"Origin": "https://attacker.example"},
    )
    invalid = await api_client.post(
        "/auth/refresh",
        headers={
            "Origin": "http://localhost:5173",
            "Cookie": "relay_refresh_token=expired-token",
        },
    )

    assert denied.status_code == 403
    assert invalid.status_code == 401
    deletion_cookie = invalid.headers["set-cookie"].lower()
    assert "relay_refresh_token=" in deletion_cookie
    assert "max-age=0" in deletion_cookie
    assert "httponly" in deletion_cookie
    assert "secure" in deletion_cookie


@pytest.mark.asyncio
async def test_profile_update_uses_authenticated_user_id_and_hides_password_hash(
    api_client: AsyncClient,
    account: User,
) -> None:
    authenticated_user = AuthenticatedUser(user=account, session_id=uuid4())
    user_service = UserServiceStub(account)
    app.dependency_overrides[get_current_user] = lambda: authenticated_user
    app.dependency_overrides[get_user_service] = lambda: user_service

    response = await api_client.patch(
        "/users/me",
        json={"username": "updated_user"},
    )

    assert response.status_code == 200
    assert user_service.updated_ids == (account.id, account.id)
    assert response.json()["username"] == "updated_user"
    assert "password_hash" not in response.json()


@pytest.mark.asyncio
async def test_public_profile_route_uses_authenticated_viewer_and_public_schema(
    api_client: AsyncClient,
    account: User,
) -> None:
    viewer = User(
        id=uuid4(),
        email="viewer@example.com",
        username="viewer_user",
        display_name="Viewer",
        password_hash="not-returned",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    user_service = UserServiceStub(account)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user=viewer,
        session_id=uuid4(),
    )
    app.dependency_overrides[get_user_service] = lambda: user_service

    response = await api_client.get(f"/users/{account.id}")

    assert response.status_code == 200
    assert user_service.profile_request == (account.id, viewer.id)
    assert response.json() == {
        "id": str(account.id),
        "username": account.username,
        "display_name": account.display_name,
        "bio": account.bio,
    }


@pytest.mark.asyncio
async def test_profile_update_rejects_client_supplied_user_identity(
    api_client: AsyncClient,
    account: User,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user=account,
        session_id=uuid4(),
    )
    app.dependency_overrides[get_user_service] = lambda: UserServiceStub(account)

    response = await api_client.patch(
        "/users/me",
        json={"username": "updated_user", "user_id": str(uuid4())},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_logout_revokes_principal_session_and_clears_refresh_cookie(
    api_client: AsyncClient,
    api_settings: Settings,
    account: User,
) -> None:
    auth_stub = AuthServiceStub()
    session_id = uuid4()
    app.dependency_overrides[get_auth_service] = lambda: auth_stub
    app.dependency_overrides[get_settings] = lambda: api_settings
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user=account,
        session_id=session_id,
    )

    response = await api_client.post(
        "/auth/logout",
        headers={"Origin": "http://localhost:5173"},
    )

    cookie = response.headers["set-cookie"].lower()
    assert response.status_code == 204
    assert auth_stub.logout_session == session_id
    assert "relay_refresh_token=" in cookie
    assert "max-age=0" in cookie
    assert "httponly" in cookie
    assert "secure" in cookie
