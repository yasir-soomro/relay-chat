from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from backend.core.dependencies import get_message_status_service
from backend.core.security import get_current_user
from backend.main import app
from backend.model.user import User
from backend.schemas.message_status import (
    MessageDeliveryBatchResponse,
    MessageReadBatchResponse,
    MessageStatus,
    MessageStatusResponse,
)
from backend.services.auth_service import AuthenticatedUser
from backend.services.message_status_service import MessageStatusPermissionError


class MessageStatusServiceStub:
    def __init__(self) -> None:
        self.calls: list[tuple[object, ...]] = []
        self.reject = False

    @staticmethod
    def _response(message_id: UUID) -> MessageStatusResponse:
        now = datetime.now(UTC)
        return MessageStatusResponse(
            id=message_id,
            status=MessageStatus.READ,
            sent_at=now,
            delivered_at=now,
            read_at=now,
        )

    async def acknowledge_delivery(
        self,
        message_id: UUID,
        recipient_id: UUID,
    ) -> MessageStatusResponse:
        self.calls.append(("delivery", message_id, recipient_id))
        if self.reject:
            raise MessageStatusPermissionError
        return self._response(message_id)

    async def acknowledge_delivery_batch(
        self,
        conversation_id: UUID,
        recipient_id: UUID,
        message_ids: list[UUID],
    ) -> MessageDeliveryBatchResponse:
        self.calls.append(
            ("delivery_batch", conversation_id, recipient_id, message_ids)
        )
        if self.reject:
            raise MessageStatusPermissionError
        return MessageDeliveryBatchResponse(
            items=[self._response(message_id) for message_id in message_ids]
        )

    async def acknowledge_read(
        self,
        message_id: UUID,
        recipient_id: UUID,
    ) -> MessageStatusResponse:
        self.calls.append(("read", message_id, recipient_id))
        if self.reject:
            raise MessageStatusPermissionError
        return self._response(message_id)

    async def acknowledge_read_batch(
        self,
        conversation_id: UUID,
        recipient_id: UUID,
        message_ids: list[UUID],
    ) -> MessageReadBatchResponse:
        self.calls.append(("batch", conversation_id, recipient_id, message_ids))
        if self.reject:
            raise MessageStatusPermissionError
        return MessageReadBatchResponse(
            items=[self._response(message_id) for message_id in message_ids]
        )


@pytest.fixture
def status_actor() -> AuthenticatedUser:
    now = datetime.now(UTC)
    user = User(
        id=uuid4(),
        email="status.actor@example.com",
        username="status_actor",
        display_name="Status Actor",
        password_hash="not-returned",
        created_at=now,
        updated_at=now,
    )
    return AuthenticatedUser(user=user, session_id=uuid4())


@pytest.fixture
async def status_client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_delivery_read_and_batch_acknowledgments_use_current_user(
    status_client: AsyncClient,
    status_actor: AuthenticatedUser,
) -> None:
    service = MessageStatusServiceStub()
    app.dependency_overrides[get_current_user] = lambda: status_actor
    app.dependency_overrides[get_message_status_service] = lambda: service
    message_id = uuid4()
    conversation_id = uuid4()

    delivered = await status_client.post(f"/messages/{message_id}/delivery")
    delivered_batch = await status_client.post(
        f"/conversations/{conversation_id}/messages/delivery",
        json={"message_ids": [str(message_id)]},
    )
    read = await status_client.post(f"/messages/{message_id}/read")
    batch = await status_client.post(
        f"/conversations/{conversation_id}/messages/read",
        json={"message_ids": [str(message_id), str(uuid4())]},
    )

    assert delivered.status_code == 200
    assert delivered_batch.status_code == 200
    assert read.status_code == 200
    assert batch.status_code == 200
    assert service.calls[0] == ("delivery", message_id, status_actor.id)
    assert service.calls[1][:3] == (
        "delivery_batch",
        conversation_id,
        status_actor.id,
    )
    assert service.calls[2] == ("read", message_id, status_actor.id)
    assert service.calls[3][:3] == ("batch", conversation_id, status_actor.id)


@pytest.mark.asyncio
async def test_batch_ack_rejects_duplicate_ids_and_identity_overrides(
    status_client: AsyncClient,
    status_actor: AuthenticatedUser,
) -> None:
    service = MessageStatusServiceStub()
    app.dependency_overrides[get_current_user] = lambda: status_actor
    app.dependency_overrides[get_message_status_service] = lambda: service
    conversation_id, message_id = uuid4(), uuid4()

    duplicate = await status_client.post(
        f"/conversations/{conversation_id}/messages/read",
        json={"message_ids": [str(message_id), str(message_id)]},
    )
    duplicate_delivery = await status_client.post(
        f"/conversations/{conversation_id}/messages/delivery",
        json={"message_ids": [str(message_id), str(message_id)]},
    )
    identity_override = await status_client.post(
        f"/conversations/{conversation_id}/messages/read",
        json={
            "message_ids": [str(message_id)],
            "recipient_id": str(uuid4()),
        },
    )

    assert duplicate.status_code == 422
    assert duplicate_delivery.status_code == 422
    assert identity_override.status_code == 422


@pytest.mark.asyncio
async def test_status_acknowledgment_rejects_non_recipient(
    status_client: AsyncClient,
    status_actor: AuthenticatedUser,
) -> None:
    service = MessageStatusServiceStub()
    service.reject = True
    app.dependency_overrides[get_current_user] = lambda: status_actor
    app.dependency_overrides[get_message_status_service] = lambda: service

    response = await status_client.post(f"/messages/{uuid4()}/delivery")

    assert response.status_code == 403
