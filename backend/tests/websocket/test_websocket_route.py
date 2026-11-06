from contextlib import AbstractAsyncContextManager
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from backend.core.config import Settings, get_settings
from backend.DB.session import get_session_factory
from backend.main import app
from backend.model.user import User
from backend.services.auth_service import AuthenticatedUser


class EmptySession(AbstractAsyncContextManager[object]):
    async def __aenter__(self) -> object:
        return object()

    async def __aexit__(self, *args: object) -> None:
        return None


class EmptySessionFactory:
    def __call__(self) -> EmptySession:
        return EmptySession()


def test_websocket_route_authenticates_first_frame_and_returns_verified_identity(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    now = datetime.now(UTC)
    user = User(
        id=uuid4(),
        email="verified-socket@example.com",
        username="verified_socket",
        display_name="Verified Socket",
        password_hash="not-returned",
        created_at=now,
        updated_at=now,
    )
    authenticated_user = AuthenticatedUser(user=user, session_id=uuid4())

    class AuthServiceStub:
        def __init__(self, *_: object) -> None:
            pass

        async def authenticate_access_token(self, token: str) -> AuthenticatedUser:
            assert token == "valid-token"
            return authenticated_user

    monkeypatch.setattr(
        "backend.routes.v1.websocket.AuthService",
        AuthServiceStub,
    )
    app.dependency_overrides[get_settings] = lambda: Settings(
        db_user="test",
        db_password=SecretStr("test-password"),
        db_host="localhost",
        db_port=5432,
        db_name="test",
        auth_jwt_secret=SecretStr("test-only-signing-secret-that-is-at-least-32-bytes"),
    )
    app.dependency_overrides[get_session_factory] = EmptySessionFactory

    try:
        with (
            TestClient(app) as client,
            client.websocket_connect("/ws") as websocket,
        ):
            websocket.send_json({"type": "auth", "access_token": "valid-token"})
            event = websocket.receive_json()
            assert event == {
                "type": "auth.ok",
                "user_id": str(authenticated_user.id),
            }
    finally:
        app.dependency_overrides.clear()
