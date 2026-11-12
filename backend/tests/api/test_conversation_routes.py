from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from backend.core.dependencies import get_conversation_service
from backend.core.security import get_current_user
from backend.main import app
from backend.model.conversation import Conversation
from backend.model.user import User
from backend.schemas.conversation import (
    ConversationListItemResponse,
    ConversationListResponse,
    ConversationResponse,
)
from backend.services.auth_service import AuthenticatedUser
from backend.services.conversation_service import ConversationNotFoundError


class ConversationServiceStub:
    def __init__(self) -> None:
        self.create_call: tuple[UUID, UUID] | None = None
        self.list_call: UUID | None = None
        self.get_call: tuple[UUID, UUID] | None = None
        self.created = True
        self.conversation = Conversation(
            id=uuid4(),
            user_low_id=uuid4(),
            user_high_id=uuid4(),
            created_at=datetime.now(UTC),
        )

    async def create_or_get(
        self,
        user_id: UUID,
        recipient_id: UUID,
    ) -> tuple[ConversationResponse, bool]:
        self.create_call = (user_id, recipient_id)
        return ConversationResponse.model_validate(self.conversation), self.created

    async def list_conversations(self, user_id: UUID) -> ConversationListResponse:
        self.list_call = user_id
        return ConversationListResponse(
            items=[
                ConversationListItemResponse(
                    **ConversationResponse.model_validate(
                        self.conversation
                    ).model_dump(),
                    unread_count=3,
                )
            ]
        )

    async def get_conversation(
        self,
        conversation_id: UUID,
        user_id: UUID,
    ) -> ConversationResponse:
        self.get_call = (conversation_id, user_id)
        if conversation_id != self.conversation.id:
            raise ConversationNotFoundError
        return ConversationResponse.model_validate(self.conversation)


@pytest.fixture
def conversation_actor() -> AuthenticatedUser:
    now = datetime.now(UTC)
    user = User(
        id=uuid4(),
        email="conversation.actor@example.com",
        username="conversation_actor",
        display_name="Conversation Actor",
        password_hash="not-returned",
        created_at=now,
        updated_at=now,
    )
    return AuthenticatedUser(user=user, session_id=uuid4())


@pytest.fixture
async def conversation_client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_conversation_routes_require_authentication(
    conversation_client: AsyncClient,
) -> None:
    response = await conversation_client.get("/conversations")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_uses_authenticated_identity_and_rejects_identity_override(
    conversation_client: AsyncClient,
    conversation_actor: AuthenticatedUser,
) -> None:
    service = ConversationServiceStub()
    app.dependency_overrides[get_current_user] = lambda: conversation_actor
    app.dependency_overrides[get_conversation_service] = lambda: service
    recipient_id = uuid4()

    response = await conversation_client.post(
        "/conversations",
        json={"recipient_id": str(recipient_id)},
    )

    assert response.status_code == 201
    assert service.create_call == (conversation_actor.id, recipient_id)
    assert "email" not in response.json()

    invalid = await conversation_client.post(
        "/conversations",
        json={
            "recipient_id": str(recipient_id),
            "user_id": str(uuid4()),
        },
    )
    assert invalid.status_code == 422


@pytest.mark.asyncio
async def test_existing_conversation_returns_ok_without_private_user_fields(
    conversation_client: AsyncClient,
    conversation_actor: AuthenticatedUser,
) -> None:
    service = ConversationServiceStub()
    service.created = False
    app.dependency_overrides[get_current_user] = lambda: conversation_actor
    app.dependency_overrides[get_conversation_service] = lambda: service
    response = await conversation_client.post(
        "/conversations",
        json={"recipient_id": str(service.conversation.user_high_id)},
    )

    assert response.status_code == 200
    assert "email" not in response.json()
    assert "password_hash" not in response.json()


@pytest.mark.asyncio
async def test_list_and_get_use_authenticated_user(
    conversation_client: AsyncClient,
    conversation_actor: AuthenticatedUser,
) -> None:
    service = ConversationServiceStub()
    app.dependency_overrides[get_current_user] = lambda: conversation_actor
    app.dependency_overrides[get_conversation_service] = lambda: service

    listed = await conversation_client.get("/conversations")
    retrieved = await conversation_client.get(
        f"/conversations/{service.conversation.id}"
    )

    assert listed.status_code == 200
    assert service.list_call == conversation_actor.id
    assert listed.json()["items"][0]["unread_count"] == 3
    assert retrieved.status_code == 200
    assert service.get_call == (service.conversation.id, conversation_actor.id)


@pytest.mark.asyncio
async def test_get_hides_conversations_from_nonparticipants(
    conversation_client: AsyncClient,
    conversation_actor: AuthenticatedUser,
) -> None:
    service = ConversationServiceStub()
    app.dependency_overrides[get_current_user] = lambda: conversation_actor
    app.dependency_overrides[get_conversation_service] = lambda: service
    unknown_id = uuid4()

    response = await conversation_client.get(f"/conversations/{unknown_id}")

    assert response.status_code == 404
