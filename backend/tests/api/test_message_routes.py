from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import SQLAlchemyError

from backend.core.dependencies import get_message_service
from backend.core.security import get_current_user
from backend.main import app
from backend.model.user import User
from backend.schemas.message import (
    MessageListResponse,
    MessageResponse,
    MessageStatus,
)
from backend.services.auth_service import AuthenticatedUser
from backend.services.message_service import MessageAuthorPermissionError


class MessageServiceStub:
    def __init__(self) -> None:
        now = datetime.now(UTC)
        self.message = MessageResponse(
            id=uuid4(),
            conversation_id=uuid4(),
            sender_id=uuid4(),
            content="Hello",
            status=MessageStatus.SENT,
            created_at=now,
            updated_at=now,
            sent_at=now,
            delivered_at=None,
            read_at=None,
            deleted_at=None,
        )
        self.calls: list[tuple[object, ...]] = []
        self.reject_edits = False

    async def send_message(
        self,
        conversation_id: UUID,
        sender_id: UUID,
        content: str,
    ) -> MessageResponse:
        self.calls.append(("send", conversation_id, sender_id, content))
        return self.message.model_copy(
            update={"conversation_id": conversation_id, "sender_id": sender_id}
        )

    async def list_messages(
        self,
        conversation_id: UUID,
        user_id: UUID,
        *,
        limit: int,
        cursor: str | None,
    ) -> MessageListResponse:
        self.calls.append(("list", conversation_id, user_id, limit, cursor))
        return MessageListResponse(items=[self.message], next_cursor="next")

    async def get_message(self, message_id: UUID, user_id: UUID) -> MessageResponse:
        self.calls.append(("get", message_id, user_id))
        return self.message

    async def edit_message(
        self,
        message_id: UUID,
        user_id: UUID,
        content: str,
    ) -> MessageResponse:
        self.calls.append(("edit", message_id, user_id, content))
        if self.reject_edits:
            raise MessageAuthorPermissionError
        return self.message.model_copy(update={"content": content})

    async def delete_message(
        self,
        message_id: UUID,
        user_id: UUID,
    ) -> MessageResponse:
        self.calls.append(("delete", message_id, user_id))
        return self.message.model_copy(
            update={"content": None, "deleted_at": datetime.now(UTC)}
        )


class FailingMessageService:
    async def list_messages(
        self,
        conversation_id: UUID,
        user_id: UUID,
        *,
        limit: int,
        cursor: str | None,
    ) -> MessageListResponse:
        del conversation_id, user_id, limit, cursor
        raise SQLAlchemyError("private database diagnostic")


@pytest.fixture
def message_actor() -> AuthenticatedUser:
    now = datetime.now(UTC)
    user = User(
        id=uuid4(),
        email="message.actor@example.com",
        username="message_actor",
        display_name="Message Actor",
        password_hash="not-returned",
        created_at=now,
        updated_at=now,
    )
    return AuthenticatedUser(user=user, session_id=uuid4())


@pytest.fixture
async def message_client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_message_routes_require_authentication(
    message_client: AsyncClient,
) -> None:
    response = await message_client.get(f"/messages/{uuid4()}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_send_uses_principal_and_rejects_sender_override(
    message_client: AsyncClient,
    message_actor: AuthenticatedUser,
) -> None:
    service = MessageServiceStub()
    app.dependency_overrides[get_current_user] = lambda: message_actor
    app.dependency_overrides[get_message_service] = lambda: service
    conversation_id = uuid4()

    response = await message_client.post(
        f"/conversations/{conversation_id}/messages",
        json={"content": "Hello"},
    )

    assert response.status_code == 201
    assert service.calls[-1] == (
        "send",
        conversation_id,
        message_actor.id,
        "Hello",
    )
    assert response.json()["sender_id"] == str(message_actor.id)

    invalid = await message_client.post(
        f"/conversations/{conversation_id}/messages",
        json={"content": "Hello", "sender_id": str(uuid4())},
    )
    assert invalid.status_code == 422


@pytest.mark.asyncio
async def test_list_messages_uses_cursor_pagination(
    message_client: AsyncClient,
    message_actor: AuthenticatedUser,
) -> None:
    service = MessageServiceStub()
    app.dependency_overrides[get_current_user] = lambda: message_actor
    app.dependency_overrides[get_message_service] = lambda: service
    conversation_id = uuid4()

    response = await message_client.get(
        f"/conversations/{conversation_id}/messages?limit=7&cursor=older"
    )

    assert response.status_code == 200
    assert service.calls[-1] == (
        "list",
        conversation_id,
        message_actor.id,
        7,
        "older",
    )
    assert response.json()["next_cursor"] == "next"


@pytest.mark.asyncio
async def test_message_history_database_failure_is_safe_and_correlatable(
    message_client: AsyncClient,
    message_actor: AuthenticatedUser,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: message_actor
    app.dependency_overrides[get_message_service] = FailingMessageService

    response = await message_client.get(
        f"/conversations/{uuid4()}/messages?limit=50"
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Database temporarily unavailable."
    assert response.json()["request_id"] == response.headers["X-Request-ID"]
    assert "private database diagnostic" not in response.text


@pytest.mark.asyncio
async def test_get_edit_delete_routes_delegate_with_authenticated_actor(
    message_client: AsyncClient,
    message_actor: AuthenticatedUser,
) -> None:
    service = MessageServiceStub()
    app.dependency_overrides[get_current_user] = lambda: message_actor
    app.dependency_overrides[get_message_service] = lambda: service
    message_id = service.message.id

    got = await message_client.get(f"/messages/{message_id}")
    edited = await message_client.patch(
        f"/messages/{message_id}",
        json={"content": "Edited"},
    )
    deleted = await message_client.delete(f"/messages/{message_id}")

    assert got.status_code == 200
    assert edited.json()["content"] == "Edited"
    assert deleted.json()["content"] is None
    assert [call[0] for call in service.calls] == ["get", "edit", "delete"]
    assert service.calls[1][2] == message_actor.id
    assert service.calls[2][2] == message_actor.id


@pytest.mark.asyncio
async def test_authorization_error_is_mapped_to_forbidden(
    message_client: AsyncClient,
    message_actor: AuthenticatedUser,
) -> None:
    service = MessageServiceStub()
    service.reject_edits = True
    app.dependency_overrides[get_current_user] = lambda: message_actor
    app.dependency_overrides[get_message_service] = lambda: service
    response = await message_client.patch(
        f"/messages/{service.message.id}",
        json={"content": "Unauthorized"},
    )

    assert response.status_code == 403
