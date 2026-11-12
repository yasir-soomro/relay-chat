import asyncio
import json
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.core.config import Settings, get_settings
from backend.DB.session import get_db_session, get_session_factory
from backend.main import app
from backend.model.connection import Connection
from backend.model.message import Message
from backend.model.user import User
from backend.services.auth_service import REFRESH_TOKEN_COOKIE

PASSWORD = "acceptance-test-password"
ORIGIN = "http://localhost:5173"


@dataclass(frozen=True)
class Account:
    id: UUID
    username: str
    email: str
    access_token: str

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"}


@pytest.fixture
async def acceptance_client(
    postgres_test_session: AsyncSession,
) -> AsyncIterator[AsyncClient]:
    bind = postgres_test_session.bind
    assert bind is not None
    websocket_session_factory = async_sessionmaker(
        bind=bind,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    settings = Settings(
        db_user="relay_test",
        db_password="integration-test-password",
        db_host="127.0.0.1",
        db_port=55432,
        db_name="relay_test",
        db_ssl="disable",
        auth_jwt_secret="acceptance-only-secret-that-is-at-least-32-bytes",
        app_env="test",
        connection_request_cooldown_hours=168,
        auth_allowed_origins=ORIGIN,
    )

    async def override_db_session() -> AsyncIterator[AsyncSession]:
        async with AsyncSession(
            bind=bind,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        ) as session:
            yield session

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_session_factory] = lambda: websocket_session_factory
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        try:
            yield client
        finally:
            app.dependency_overrides.clear()


async def create_account(
    client: AsyncClient,
    *,
    suffix: str,
) -> Account:
    unique = uuid4().hex[:12]
    username = f"e2e_{unique}_{suffix}"
    email = f"{username}@example.com"
    registered = await client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "display_name": f"Relay {suffix}",
            "password": PASSWORD,
        },
    )
    assert registered.status_code == 201, registered.text
    assert "password_hash" not in registered.json()["user"]

    logged_in = await client.post(
        "/auth/login",
        headers={"Origin": ORIGIN},
        json={"email": email, "password": PASSWORD},
    )
    assert logged_in.status_code == 200, logged_in.text
    assert REFRESH_TOKEN_COOKIE in logged_in.cookies
    return Account(
        id=UUID(registered.json()["user"]["id"]),
        username=username,
        email=email,
        access_token=logged_in.json()["access_token"],
    )


async def accept_connection(
    client: AsyncClient,
    requester: Account,
    recipient: Account,
) -> UUID:
    requested = await client.post(
        "/connections/requests",
        headers=requester.headers,
        json={"recipient_id": str(recipient.id)},
    )
    assert requested.status_code == 201, requested.text
    accepted = await client.post(
        f"/connections/requests/{requested.json()['id']}/accept",
        headers=recipient.headers,
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["status"] == "accepted"
    return UUID(accepted.json()["id"])


async def create_conversation(
    client: AsyncClient,
    requester: Account,
    recipient: Account,
) -> UUID:
    response = await client.post(
        "/conversations",
        headers=requester.headers,
        json={"recipient_id": str(recipient.id)},
    )
    assert response.status_code == 201, response.text
    return UUID(response.json()["id"])


class ASGIWebSocket:
    def __init__(self) -> None:
        self.incoming: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.outgoing: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.task: asyncio.Task[None] | None = None

    async def connect(self) -> None:
        scope: dict[str, Any] = {
            "type": "websocket",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "scheme": "ws",
            "server": ("testserver", 80),
            "client": ("127.0.0.1", 12345),
            "root_path": "",
            "path": "/ws",
            "raw_path": b"/ws",
            "query_string": b"",
            "headers": [(b"host", b"testserver")],
            "subprotocols": [],
            "state": {},
        }
        self.task = asyncio.create_task(
            app(scope, self._receive, self._send)  # type: ignore[arg-type]
        )
        await self.incoming.put({"type": "websocket.connect"})
        accepted = await self.receive()
        assert accepted["type"] == "websocket.accept"

    async def _receive(self) -> dict[str, Any]:
        return await self.incoming.get()

    async def _send(self, message: dict[str, Any]) -> None:
        await self.outgoing.put(message)

    async def send_json(self, value: dict[str, Any]) -> None:
        await self.incoming.put(
            {"type": "websocket.receive", "text": json.dumps(value)}
        )

    async def receive(self) -> dict[str, Any]:
        return await asyncio.wait_for(self.outgoing.get(), timeout=5)

    async def receive_json(self) -> dict[str, Any]:
        message = await self.receive()
        assert message["type"] == "websocket.send"
        return json.loads(message["text"])

    async def close(self) -> None:
        if self.task is None or self.task.done():
            return
        await self.incoming.put(
            {"type": "websocket.disconnect", "code": 1000, "reason": ""}
        )
        await asyncio.wait_for(self.task, timeout=5)


async def authenticated_socket(account: Account) -> ASGIWebSocket:
    socket = ASGIWebSocket()
    await socket.connect()
    await socket.send_json({"type": "auth", "access_token": account.access_token})
    authenticated = await socket.receive_json()
    assert authenticated == {"type": "auth.ok", "user_id": str(account.id)}
    return socket


@pytest.mark.asyncio
async def test_authentication_registration_login_refresh_and_logout(
    acceptance_client: AsyncClient,
    postgres_test_session: AsyncSession,
) -> None:
    response = await acceptance_client.post(
        "/auth/register",
        json={
            "email": " ACCEPTANCE-AUTH@example.com ",
            "username": f"e2e_auth_{uuid4().hex[:12]}",
            "display_name": "Auth Acceptance",
            "password": PASSWORD,
        },
    )
    assert response.status_code == 201
    account = response.json()["user"]
    assert account["email"] == "acceptance-auth@example.com"
    persisted_user = await postgres_test_session.get(User, UUID(account["id"]))
    assert persisted_user is not None
    assert persisted_user.password_hash != PASSWORD

    unauthorized = await acceptance_client.get("/auth/me")
    assert unauthorized.status_code == 401
    login = await acceptance_client.post(
        "/auth/login",
        headers={"Origin": ORIGIN},
        json={"email": account["email"], "password": PASSWORD},
    )
    assert login.status_code == 200
    assert login.headers["cache-control"] == "no-store"
    assert "httponly" in login.headers["set-cookie"].lower()
    assert login.json()["token_type"] == "bearer"
    access_token = login.json()["access_token"]
    refresh_token = login.cookies[REFRESH_TOKEN_COOKIE]
    me = await acceptance_client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me.status_code == 200
    assert me.json()["id"] == account["id"]

    refreshed = await acceptance_client.post(
        "/auth/refresh",
        headers={
            "Origin": ORIGIN,
            "Cookie": f"{REFRESH_TOKEN_COOKIE}={refresh_token}",
        },
    )
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"] != access_token
    rotated_refresh_token = refreshed.cookies[REFRESH_TOKEN_COOKIE]

    invalid_token = await acceptance_client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert invalid_token.status_code == 401
    logout = await acceptance_client.post(
        "/auth/logout",
        headers={
            "Origin": ORIGIN,
            "Authorization": f"Bearer {refreshed.json()['access_token']}",
        },
    )
    assert logout.status_code == 204
    after_logout = await acceptance_client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {refreshed.json()['access_token']}"},
    )
    assert after_logout.status_code == 401
    reused_refresh = await acceptance_client.post(
        "/auth/refresh",
        headers={
            "Origin": ORIGIN,
            "Cookie": f"{REFRESH_TOKEN_COOKIE}={rotated_refresh_token}",
        },
    )
    assert reused_refresh.status_code == 401


@pytest.mark.asyncio
async def test_user_discovery_pagination_profiles_and_block_filtering(
    acceptance_client: AsyncClient,
) -> None:
    viewer = await create_account(acceptance_client, suffix="viewer")
    profiles = [
        await create_account(acceptance_client, suffix=f"member{index}")
        for index in range(3)
    ]

    first_page = await acceptance_client.get(
        "/api/v1/users/discover",
        headers=viewer.headers,
        params={"q": "e2e_", "limit": 1},
    )
    assert first_page.status_code == 200
    assert len(first_page.json()["items"]) == 1
    cursor = first_page.json()["next_cursor"]
    assert cursor is not None
    second_page = await acceptance_client.get(
        "/api/v1/users/discover",
        headers=viewer.headers,
        params={"q": "e2e_", "limit": 2, "cursor": cursor},
    )
    assert second_page.status_code == 200
    discovered_ids = {
        item["id"] for item in first_page.json()["items"] + second_page.json()["items"]
    }
    assert str(viewer.id) not in discovered_ids
    assert {str(profile.id) for profile in profiles} <= discovered_ids

    profile = await acceptance_client.get(
        f"/users/{profiles[0].id}",
        headers=viewer.headers,
    )
    assert profile.status_code == 200
    assert profile.json()["id"] == str(profiles[0].id)
    assert "email" not in profile.json()
    before_profile_update = await acceptance_client.get(
        "/users/me",
        headers=viewer.headers,
    )
    assert before_profile_update.status_code == 200
    own_profile = await acceptance_client.patch(
        "/users/me",
        headers=viewer.headers,
        json={"display_name": "Updated Viewer"},
    )
    assert own_profile.status_code == 200
    assert own_profile.json()["display_name"] == "Updated Viewer"
    assert (
        own_profile.json()["updated_at"] >= before_profile_update.json()["updated_at"]
    )

    blocked = await acceptance_client.post(
        f"/connections/{profiles[0].id}/block",
        headers=viewer.headers,
    )
    assert blocked.status_code == 200
    hidden_profile = await acceptance_client.get(
        f"/users/{profiles[0].id}",
        headers=viewer.headers,
    )
    assert hidden_profile.status_code == 404
    filtered = await acceptance_client.get(
        "/api/v1/users/discover",
        headers=viewer.headers,
        params={"q": "e2e_", "limit": 50},
    )
    assert str(profiles[0].id) not in {item["id"] for item in filtered.json()["items"]}
    reverse_hidden = await acceptance_client.get(
        f"/users/{viewer.id}",
        headers=profiles[0].headers,
    )
    assert reverse_hidden.status_code == 404
    unblocked = await acceptance_client.delete(
        f"/connections/{profiles[0].id}/block",
        headers=viewer.headers,
    )
    assert unblocked.status_code == 204
    visible_again = await acceptance_client.get(
        f"/users/{profiles[0].id}",
        headers=viewer.headers,
    )
    assert visible_again.status_code == 200


@pytest.mark.asyncio
async def test_connection_cooldown_conversation_messaging_and_security(
    acceptance_client: AsyncClient,
    postgres_test_session: AsyncSession,
) -> None:
    requester = await create_account(acceptance_client, suffix="requester")
    recipient = await create_account(acceptance_client, suffix="recipient")
    outsider = await create_account(acceptance_client, suffix="outsider")

    request = await acceptance_client.post(
        "/connections/requests",
        headers=requester.headers,
        json={"recipient_id": str(recipient.id)},
    )
    assert request.status_code == 201
    duplicate = await acceptance_client.post(
        "/connections/requests",
        headers=recipient.headers,
        json={"recipient_id": str(requester.id)},
    )
    assert duplicate.status_code == 409
    rejected = await acceptance_client.post(
        f"/connections/requests/{request.json()['id']}/reject",
        headers=recipient.headers,
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"

    blocked_retry = await acceptance_client.post(
        "/connections/requests",
        headers=requester.headers,
        json={"recipient_id": str(recipient.id)},
    )
    assert blocked_retry.status_code == 409
    assert blocked_retry.json()["detail"]["code"] == (
        "connection_request_cooldown_active"
    )
    assert blocked_retry.json()["detail"]["retry_at"].endswith("+00:00")
    reverse_retry = await acceptance_client.post(
        "/connections/requests",
        headers=recipient.headers,
        json={"recipient_id": str(requester.id)},
    )
    assert reverse_retry.status_code == 409

    rejected_record = await postgres_test_session.get(
        Connection, UUID(rejected.json()["id"])
    )
    assert rejected_record is not None
    first_rejection_time = rejected_record.rejected_at
    assert first_rejection_time is not None
    expected_retry_at = first_rejection_time + timedelta(hours=168)
    assert (
        datetime.fromisoformat(blocked_retry.json()["detail"]["retry_at"])
        == expected_retry_at
    )
    rejected_record.rejected_at = datetime.now(UTC) - timedelta(days=8)
    await postgres_test_session.flush()
    retried = await acceptance_client.post(
        "/connections/requests",
        headers=requester.headers,
        json={"recipient_id": str(recipient.id)},
    )
    assert retried.status_code == 201
    assert retried.json()["status"] == "pending"
    rejected_again = await acceptance_client.post(
        f"/connections/requests/{retried.json()['id']}/reject",
        headers=recipient.headers,
    )
    assert rejected_again.status_code == 200
    second_rejection_time = datetime.fromisoformat(rejected_again.json()["rejected_at"])
    assert second_rejection_time > first_rejection_time
    still_blocked = await acceptance_client.post(
        "/connections/requests",
        headers=requester.headers,
        json={"recipient_id": str(recipient.id)},
    )
    assert still_blocked.status_code == 409

    rejected_record.rejected_at = datetime.now(UTC) - timedelta(days=8)
    await postgres_test_session.flush()
    accepted_request = await acceptance_client.post(
        "/connections/requests",
        headers=requester.headers,
        json={"recipient_id": str(recipient.id)},
    )
    assert accepted_request.status_code == 201
    accepted = await acceptance_client.post(
        f"/connections/requests/{accepted_request.json()['id']}/accept",
        headers=recipient.headers,
    )
    assert accepted.status_code == 200

    conversation_id = await create_conversation(
        acceptance_client,
        requester,
        recipient,
    )
    requester_conversations = await acceptance_client.get(
        "/conversations",
        headers=requester.headers,
    )
    recipient_conversations = await acceptance_client.get(
        "/conversations",
        headers=recipient.headers,
    )
    assert requester_conversations.status_code == 200
    assert recipient_conversations.status_code == 200
    requester_item = requester_conversations.json()["items"][0]
    assert set(requester_item) == {
        "id",
        "user_low_id",
        "user_high_id",
        "created_at",
        "unread_count",
    }
    assert requester_item["id"] == str(conversation_id)
    assert requester_item["unread_count"] == 0
    assert recipient_conversations.json()["items"][0]["unread_count"] == 0
    assert (
        await acceptance_client.get(
            "/api/v1/notifications/unread-count",
            headers=recipient.headers,
        )
    ).json() == {"total_unread_count": 0}
    duplicate_conversation = await acceptance_client.post(
        "/conversations",
        headers=recipient.headers,
        json={"recipient_id": str(requester.id)},
    )
    assert duplicate_conversation.status_code == 200
    assert duplicate_conversation.json()["id"] == str(conversation_id)
    recipient_detail = await acceptance_client.get(
        f"/conversations/{conversation_id}",
        headers=recipient.headers,
    )
    assert recipient_detail.status_code == 200
    assert recipient_detail.json() == {
        "id": str(conversation_id),
        "user_low_id": str(min(requester.id, recipient.id)),
        "user_high_id": str(max(requester.id, recipient.id)),
        "created_at": recipient_detail.json()["created_at"],
    }
    assert isinstance(recipient_detail.json()["created_at"], str)
    assert (
        await acceptance_client.get(
            "/conversations",
            headers=requester.headers,
        )
    ).json()["items"][0]["id"] == str(conversation_id)
    denied_conversation = await acceptance_client.get(
        f"/conversations/{conversation_id}",
        headers=outsider.headers,
    )
    assert denied_conversation.status_code == 404
    unauthenticated_list = await acceptance_client.get("/conversations")
    unauthenticated_detail = await acceptance_client.get(
        f"/conversations/{conversation_id}"
    )
    assert unauthenticated_list.status_code == 401
    assert unauthenticated_detail.status_code == 401

    sent = await acceptance_client.post(
        f"/conversations/{conversation_id}/messages",
        headers=requester.headers,
        json={"content": "Persisted acceptance message"},
    )
    assert sent.status_code == 201
    message_id = UUID(sent.json()["id"])
    assert sent.json()["status"] == "sent"
    assert (
        await acceptance_client.get(
            "/conversations",
            headers=recipient.headers,
        )
    ).json()["items"][0]["unread_count"] == 1
    assert (
        await acceptance_client.get(
            "/api/v1/notifications/unread-count",
            headers=recipient.headers,
        )
    ).json() == {"total_unread_count": 1}
    assert (
        await acceptance_client.get(
            "/api/v1/notifications/unread-count",
            headers=requester.headers,
        )
    ).json() == {"total_unread_count": 0}
    outsider_history = await acceptance_client.get(
        f"/conversations/{conversation_id}/messages",
        headers=outsider.headers,
    )
    assert outsider_history.status_code == 404
    outsider_read = await acceptance_client.get(
        f"/messages/{message_id}",
        headers=outsider.headers,
    )
    assert outsider_read.status_code == 404
    wrong_editor = await acceptance_client.patch(
        f"/messages/{message_id}",
        headers=recipient.headers,
        json={"content": "Unauthorized edit"},
    )
    assert wrong_editor.status_code == 403
    edited = await acceptance_client.patch(
        f"/messages/{message_id}",
        headers=requester.headers,
        json={"content": "Edited acceptance message"},
    )
    assert edited.status_code == 200
    assert edited.json()["content"] == "Edited acceptance message"
    assert edited.json()["updated_at"] >= sent.json()["updated_at"]
    retrieved_edited = await acceptance_client.get(
        f"/messages/{message_id}",
        headers=recipient.headers,
    )
    assert retrieved_edited.status_code == 200
    assert retrieved_edited.json()["content"] == "Edited acceptance message"
    wrong_deleter = await acceptance_client.delete(
        f"/messages/{message_id}",
        headers=recipient.headers,
    )
    assert wrong_deleter.status_code == 403

    delivered = await acceptance_client.post(
        f"/messages/{message_id}/delivery",
        headers=recipient.headers,
    )
    assert delivered.status_code == 200
    assert delivered.json()["status"] == "delivered"
    read = await acceptance_client.post(
        f"/messages/{message_id}/read",
        headers=recipient.headers,
    )
    assert read.status_code == 200
    assert read.json()["status"] == "read"
    assert (
        await acceptance_client.get(
            "/conversations",
            headers=recipient.headers,
        )
    ).json()["items"][0]["unread_count"] == 0
    assert (
        await acceptance_client.get(
            "/api/v1/notifications/unread-count",
            headers=recipient.headers,
        )
    ).json() == {"total_unread_count": 0}
    non_recipient_ack = await acceptance_client.post(
        f"/messages/{message_id}/read",
        headers=requester.headers,
    )
    assert non_recipient_ack.status_code == 403
    deleted = await acceptance_client.delete(
        f"/messages/{message_id}",
        headers=requester.headers,
    )
    assert deleted.status_code == 200
    assert deleted.json()["content"] is None
    assert deleted.json()["deleted_at"] is not None
    assert deleted.json()["updated_at"] == deleted.json()["deleted_at"]
    retrieved_deleted = await acceptance_client.get(
        f"/messages/{message_id}",
        headers=recipient.headers,
    )
    assert retrieved_deleted.status_code == 200
    assert retrieved_deleted.json()["content"] is None

    removed = await acceptance_client.delete(
        f"/connections/{recipient.id}",
        headers=requester.headers,
    )
    assert removed.status_code == 200
    retained_history = await acceptance_client.get(
        f"/conversations/{conversation_id}/messages",
        headers=recipient.headers,
    )
    assert retained_history.status_code == 200
    assert retained_history.json()["items"][0]["id"] == str(message_id)
    after_removal = await acceptance_client.post(
        f"/conversations/{conversation_id}/messages",
        headers=requester.headers,
        json={"content": "Must be denied after removal"},
    )
    assert after_removal.status_code == 403

    new_connection = await accept_connection(
        acceptance_client,
        recipient,
        requester,
    )
    assert new_connection == UUID(accepted_request.json()["id"])
    block = await acceptance_client.post(
        f"/connections/{recipient.id}/block",
        headers=requester.headers,
    )
    assert block.status_code == 200
    reverse_blocked_message = await acceptance_client.post(
        f"/conversations/{conversation_id}/messages",
        headers=requester.headers,
        json={"content": "Must also be denied in the other direction"},
    )
    assert reverse_blocked_message.status_code == 403
    blocked_message = await acceptance_client.post(
        f"/conversations/{conversation_id}/messages",
        headers=recipient.headers,
        json={"content": "Must be denied while blocked"},
    )
    assert blocked_message.status_code == 403
    assert (
        await acceptance_client.get(
            f"/users/{requester.id}",
            headers=recipient.headers,
        )
    ).status_code == 404
    unblocked = await acceptance_client.delete(
        f"/connections/{recipient.id}/block",
        headers=requester.headers,
    )
    assert unblocked.status_code == 204
    # Unblocking restores profile visibility, not the terminated connection.
    assert (
        await acceptance_client.get(
            f"/users/{requester.id}",
            headers=recipient.headers,
        )
    ).status_code == 200
    still_disconnected = await acceptance_client.post(
        f"/conversations/{conversation_id}/messages",
        headers=recipient.headers,
        json={"content": "Must be denied after unblock"},
    )
    assert still_disconnected.status_code == 403


@pytest.mark.asyncio
async def test_message_history_empty_deleted_and_large_cursor_pages(
    acceptance_client: AsyncClient,
    postgres_test_session: AsyncSession,
) -> None:
    sender = await create_account(acceptance_client, suffix="hist_send")
    recipient = await create_account(acceptance_client, suffix="hist_recv")
    outsider = await create_account(acceptance_client, suffix="hist_out")
    await accept_connection(acceptance_client, sender, recipient)
    conversation_id = await create_conversation(acceptance_client, sender, recipient)

    empty_sender = await create_account(acceptance_client, suffix="empty_send")
    empty_recipient = await create_account(acceptance_client, suffix="empty_recv")
    await accept_connection(acceptance_client, empty_sender, empty_recipient)
    empty_conversation_id = await create_conversation(
        acceptance_client, empty_sender, empty_recipient
    )

    empty_history = await acceptance_client.get(
        f"/conversations/{empty_conversation_id}/messages",
        headers=empty_sender.headers,
    )
    assert empty_history.status_code == 200, empty_history.text
    assert empty_history.json() == {"items": [], "next_cursor": None}

    base_time = datetime(2026, 1, 1, tzinfo=UTC)
    messages = [
        Message(
            id=uuid4(),
            conversation_id=conversation_id,
            sender_id=sender.id,
            content=f"history item {index}" if index != 61 else None,
            status="sent",
            created_at=base_time + timedelta(seconds=index),
            sent_at=base_time + timedelta(seconds=index),
            updated_at=base_time + timedelta(seconds=index),
            deleted_at=base_time + timedelta(seconds=index) if index == 61 else None,
        )
        for index in range(105)
    ]
    postgres_test_session.add_all(messages)
    await postgres_test_session.flush()

    unauthenticated = await acceptance_client.get(
        f"/conversations/{conversation_id}/messages"
    )
    assert unauthenticated.status_code == 401
    unauthorized = await acceptance_client.get(
        f"/conversations/{conversation_id}/messages",
        headers=outsider.headers,
    )
    assert unauthorized.status_code == 404
    invalid_cursor = await acceptance_client.get(
        f"/conversations/{conversation_id}/messages",
        headers=recipient.headers,
        params={"cursor": "not-a-valid-cursor"},
    )
    assert invalid_cursor.status_code == 422
    invalid_limit = await acceptance_client.get(
        f"/conversations/{conversation_id}/messages",
        headers=recipient.headers,
        params={"limit": 101},
    )
    assert invalid_limit.status_code == 422

    pages: list[dict[str, Any]] = []
    cursor: str | None = None
    while True:
        response = await acceptance_client.get(
            f"/conversations/{conversation_id}/messages",
            headers=recipient.headers,
            params={"limit": 50, **({"cursor": cursor} if cursor else {})},
        )
        assert response.status_code == 200, response.text
        page = response.json()
        pages.extend(page["items"])
        cursor = page["next_cursor"]
        if cursor is None:
            break

    assert len(pages) == 105
    assert [len(pages[:50]), len(pages[50:100]), len(pages[100:])] == [50, 50, 5]
    expected_ids = [str(message.id) for message in reversed(messages)]
    assert [message["id"] for message in pages] == expected_ids
    deleted = next(item for item in pages if item["id"] == str(messages[61].id))
    assert deleted["content"] is None
    assert deleted["deleted_at"] is not None


@pytest.mark.asyncio
async def test_websocket_auth_real_time_multi_device_and_offline_recovery(
    acceptance_client: AsyncClient,
) -> None:
    sender = await create_account(acceptance_client, suffix="ws_sender")
    recipient = await create_account(acceptance_client, suffix="ws_recipient")
    outsider = await create_account(acceptance_client, suffix="ws_outsider")
    await accept_connection(acceptance_client, sender, recipient)
    conversation_id = await create_conversation(
        acceptance_client,
        sender,
        recipient,
    )

    invalid_socket = ASGIWebSocket()
    await invalid_socket.connect()
    await invalid_socket.send_json({"type": "auth", "access_token": "invalid"})
    invalid_auth = await invalid_socket.receive_json()
    assert invalid_auth["type"] == "error"
    assert invalid_auth["code"] == "unauthorized"
    await invalid_socket.receive()
    await invalid_socket.close()

    sender_socket = await authenticated_socket(sender)
    recipient_device_one = await authenticated_socket(recipient)
    recipient_device_two = await authenticated_socket(recipient)
    outsider_socket = await authenticated_socket(outsider)
    sockets = [
        sender_socket,
        recipient_device_one,
        recipient_device_two,
        outsider_socket,
    ]
    try:
        for socket in sockets[:3]:
            await socket.send_json(
                {"type": "subscribe", "conversation_id": str(conversation_id)}
            )
            subscribed = await socket.receive_json()
            assert subscribed == {
                "type": "subscribed",
                "conversation_id": str(conversation_id),
            }
        await outsider_socket.send_json(
            {"type": "subscribe", "conversation_id": str(conversation_id)}
        )
        outsider_denied = await outsider_socket.receive_json()
        assert outsider_denied["type"] == "error"
        assert outsider_denied["code"] == "not_found"

        client_message_id = uuid4()
        send_event = {
            "type": "message.send",
            "conversation_id": str(conversation_id),
            "client_message_id": str(client_message_id),
            "content": "Real-time message",
        }
        await sender_socket.send_json(send_event)
        sender_ack = await sender_socket.receive_json()
        delivered_one = await recipient_device_one.receive_json()
        delivered_two = await recipient_device_two.receive_json()
        assert sender_ack["type"] == "message.sent"
        message_id = sender_ack["message"]["id"]
        assert delivered_one["type"] == delivered_two["type"] == "message.received"
        assert (
            delivered_one["message"]["id"]
            == delivered_two["message"]["id"]
            == message_id
        )

        await sender_socket.send_json(send_event)
        duplicate_ack = await sender_socket.receive_json()
        assert duplicate_ack["type"] == "message.sent"
        assert duplicate_ack["message"]["id"] == message_id
        assert recipient_device_one.outgoing.empty()
        assert recipient_device_two.outgoing.empty()
        persisted = await acceptance_client.get(
            f"/conversations/{conversation_id}/messages",
            headers=sender.headers,
        )
        assert persisted.status_code == 200
        assert len(persisted.json()["items"]) == 1

        await recipient_device_one.send_json(
            {
                "type": "message.delivery_ack",
                "conversation_id": str(conversation_id),
                "message_id": message_id,
            }
        )
        delivered_events = [
            await socket.receive_json()
            for socket in (sender_socket, recipient_device_one, recipient_device_two)
        ]
        assert all(event["type"] == "message.status" for event in delivered_events)
        assert all(
            event["status"]["status"] == "delivered" for event in delivered_events
        )

        await recipient_device_two.send_json(
            {
                "type": "message.read_ack",
                "conversation_id": str(conversation_id),
                "message_ids": [message_id],
            }
        )
        read_events = [
            await socket.receive_json()
            for socket in (sender_socket, recipient_device_one, recipient_device_two)
        ]
        assert all(event["type"] == "message.status" for event in read_events)
        assert all(event["status"]["status"] == "read" for event in read_events)

        await recipient_device_one.close()
        await recipient_device_two.close()
        offline_client_message_id = uuid4()
        await sender_socket.send_json(
            {
                **send_event,
                "client_message_id": str(offline_client_message_id),
                "content": "Message sent while recipient offline",
            }
        )
        offline_sent = await sender_socket.receive_json()
        assert offline_sent["type"] == "message.sent"

        reconnected_device = await authenticated_socket(recipient)
        sockets.append(reconnected_device)
        await reconnected_device.send_json(
            {"type": "subscribe", "conversation_id": str(conversation_id)}
        )
        assert (await reconnected_device.receive_json())["type"] == "subscribed"
        status_snapshot = [
            await reconnected_device.receive_json(),
            await reconnected_device.receive_json(),
        ]
        assert all(event["type"] == "message.status" for event in status_snapshot)
        assert reconnected_device.outgoing.empty()
        history = await acceptance_client.get(
            f"/conversations/{conversation_id}/messages",
            headers=recipient.headers,
        )
        assert history.status_code == 200
        assert any(
            item["id"] == offline_sent["message"]["id"]
            and item["content"] == "Message sent while recipient offline"
            for item in history.json()["items"]
        )
        assert len(history.json()["items"]) == 2
    finally:
        for socket in sockets:
            await socket.close()
