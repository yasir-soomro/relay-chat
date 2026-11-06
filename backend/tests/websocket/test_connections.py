import asyncio
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from backend.model.user import User
from backend.services.auth_service import (
    AuthenticatedUser,
    InvalidAuthenticationTokenError,
)
from backend.websocket.connections import authenticate_first_frame


class FakeWebSocket:
    def __init__(self, first_event: object | None = None) -> None:
        self.first_event = first_event
        self.sent: list[dict[str, object]] = []
        self.close_args: tuple[int, str] | None = None

    async def receive_json(self) -> object:
        if self.first_event is None:
            await asyncio.Event().wait()
        return self.first_event

    async def send_json(self, event: dict[str, object]) -> None:
        self.sent.append(event)

    async def close(self, *, code: int, reason: str) -> None:
        self.close_args = (code, reason)


@pytest.fixture
def authenticated_user() -> AuthenticatedUser:
    now = datetime.now(UTC)
    user = User(
        id=uuid4(),
        email="socket-user@example.com",
        username="socket_user",
        display_name="Socket User",
        password_hash="not-returned",
        created_at=now,
        updated_at=now,
    )
    return AuthenticatedUser(user=user, session_id=uuid4())


@pytest.mark.asyncio
async def test_authentication_timeout_sends_error_and_closes_socket() -> None:
    websocket = FakeWebSocket()

    async def authenticate(_: str) -> AuthenticatedUser:
        raise AssertionError("Authentication must not run before a valid frame")

    user = await authenticate_first_frame(
        websocket,
        authenticate,
        timeout_seconds=0.01,
    )

    assert user is None
    assert websocket.sent[0]["code"] == "authentication_timeout"
    assert websocket.close_args == (4401, "Authentication timeout")


@pytest.mark.asyncio
async def test_valid_first_frame_authenticates_before_socket_is_authorized(
    authenticated_user: AuthenticatedUser,
) -> None:
    websocket = FakeWebSocket({"type": "auth", "access_token": "valid-access-token"})
    authenticated_tokens: list[str] = []

    async def authenticate(token: str) -> AuthenticatedUser:
        authenticated_tokens.append(token)
        return authenticated_user

    user = await authenticate_first_frame(websocket, authenticate, 1)

    assert user is authenticated_user
    assert authenticated_tokens == ["valid-access-token"]
    assert websocket.sent == [
        {"type": "auth.ok", "user_id": str(authenticated_user.id)}
    ]
    assert websocket.close_args is None


@pytest.mark.asyncio
async def test_invalid_or_expired_token_closes_socket() -> None:
    websocket = FakeWebSocket({"type": "auth", "access_token": "expired-access-token"})

    async def authenticate(_: str) -> AuthenticatedUser:
        raise InvalidAuthenticationTokenError

    user = await authenticate_first_frame(websocket, authenticate, 1)

    assert user is None
    assert websocket.sent[0]["code"] == "unauthorized"
    assert websocket.close_args == (4401, "Authentication failed")


@pytest.mark.asyncio
async def test_non_auth_first_event_closes_as_protocol_error() -> None:
    websocket = FakeWebSocket({"type": "subscribe", "conversation_id": str(uuid4())})

    async def authenticate(_: str) -> AuthenticatedUser:
        pytest.fail("Authentication must not run for a non-auth first event")

    user = await authenticate_first_frame(websocket, authenticate, 1)

    assert user is None
    assert websocket.sent[0]["code"] == "invalid_auth_event"
    assert websocket.close_args == (4400, "Invalid authentication event")
