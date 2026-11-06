from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from backend.core.dependencies import get_connection_service
from backend.core.security import get_current_user
from backend.main import app
from backend.model.user import User
from backend.schemas.connection import (
    BlockResponse,
    ConnectionListResponse,
    ConnectionResponse,
    ConnectionStatus,
)
from backend.services.auth_service import AuthenticatedUser
from backend.services.connection_service import ConnectionCooldownNotConfiguredError


class ConnectionServiceStub:
    def __init__(self) -> None:
        self.request_call: tuple[UUID, UUID] | None = None
        self.block_call: tuple[UUID, UUID] | None = None
        self.actions: list[tuple[str, UUID, UUID | None]] = []

    @staticmethod
    def _response(
        requester_id: UUID,
        recipient_id: UUID,
        state: ConnectionStatus,
    ) -> ConnectionResponse:
        return ConnectionResponse(
            id=uuid4(),
            requester_id=requester_id,
            recipient_id=recipient_id,
            status=state,
            requested_at=datetime.now(UTC),
            responded_at=None,
            rejected_at=None,
            removed_at=None,
        )

    async def request_connection(
        self,
        requester_id: UUID,
        recipient_id: UUID,
    ) -> ConnectionResponse:
        self.request_call = (requester_id, recipient_id)
        return self._response(requester_id, recipient_id, ConnectionStatus.PENDING)

    async def list_incoming_requests(self, user_id: UUID) -> ConnectionListResponse:
        self.actions.append(("incoming", user_id, None))
        return ConnectionListResponse(items=[])

    async def list_outgoing_requests(self, user_id: UUID) -> ConnectionListResponse:
        self.actions.append(("outgoing", user_id, None))
        return ConnectionListResponse(items=[])

    async def accept_request(
        self,
        connection_id: UUID,
        recipient_id: UUID,
    ) -> ConnectionResponse:
        self.actions.append(("accept", recipient_id, connection_id))
        return self._response(recipient_id, uuid4(), ConnectionStatus.ACCEPTED)

    async def reject_request(
        self,
        connection_id: UUID,
        recipient_id: UUID,
    ) -> ConnectionResponse:
        self.actions.append(("reject", recipient_id, connection_id))
        return self._response(uuid4(), recipient_id, ConnectionStatus.REJECTED)

    async def remove_connection(
        self,
        user_id: UUID,
        other_user_id: UUID,
    ) -> ConnectionResponse:
        self.actions.append(("remove", user_id, other_user_id))
        return self._response(user_id, other_user_id, ConnectionStatus.REMOVED)

    async def block_user(self, blocker_id: UUID, blocked_id: UUID) -> BlockResponse:
        self.block_call = (blocker_id, blocked_id)
        return BlockResponse(blocked_user_id=blocked_id, created_at=datetime.now(UTC))

    async def unblock_user(self, blocker_id: UUID, blocked_id: UUID) -> None:
        self.block_call = (blocker_id, blocked_id)

    async def list_connections(self, user_id: UUID) -> ConnectionListResponse:
        self.actions.append(("connections", user_id, None))
        return ConnectionListResponse(items=[])


class UnconfiguredCooldownServiceStub(ConnectionServiceStub):
    async def request_connection(
        self,
        requester_id: UUID,
        recipient_id: UUID,
    ) -> ConnectionResponse:
        raise ConnectionCooldownNotConfiguredError


@pytest.fixture
def connection_actor() -> AuthenticatedUser:
    now = datetime.now(UTC)
    user = User(
        id=uuid4(),
        email="actor@example.com",
        username="actor_user",
        display_name="Actor",
        password_hash="not-returned",
        bio=None,
        created_at=now,
        updated_at=now,
    )
    return AuthenticatedUser(user=user, session_id=uuid4())


@pytest.fixture
async def connection_client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_connection_routes_require_authentication(
    connection_client: AsyncClient,
) -> None:
    response = await connection_client.post(
        "/connections/requests",
        json={"recipient_id": str(uuid4())},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_request_uses_principal_id_and_rejects_identity_override(
    connection_client: AsyncClient,
    connection_actor: AuthenticatedUser,
) -> None:
    service = ConnectionServiceStub()
    app.dependency_overrides[get_current_user] = lambda: connection_actor
    app.dependency_overrides[get_connection_service] = lambda: service
    recipient_id = uuid4()

    response = await connection_client.post(
        "/connections/requests",
        json={"recipient_id": str(recipient_id)},
    )

    assert response.status_code == 201
    assert service.request_call == (connection_actor.id, recipient_id)
    assert response.json()["requester_id"] == str(connection_actor.id)

    invalid = await connection_client.post(
        "/connections/requests",
        json={"recipient_id": str(recipient_id), "requester_id": str(uuid4())},
    )
    assert invalid.status_code == 422


@pytest.mark.asyncio
async def test_block_route_uses_authenticated_user_as_blocker(
    connection_client: AsyncClient,
    connection_actor: AuthenticatedUser,
) -> None:
    service = ConnectionServiceStub()
    app.dependency_overrides[get_current_user] = lambda: connection_actor
    app.dependency_overrides[get_connection_service] = lambda: service
    blocked_id = uuid4()

    response = await connection_client.post(f"/connections/{blocked_id}/block")

    assert response.status_code == 200
    assert service.block_call == (connection_actor.id, blocked_id)


@pytest.mark.asyncio
async def test_rejected_request_retry_is_explicitly_unavailable_until_configured(
    connection_client: AsyncClient,
    connection_actor: AuthenticatedUser,
) -> None:
    app.dependency_overrides[get_current_user] = lambda: connection_actor
    app.dependency_overrides[get_connection_service] = lambda: (
        UnconfiguredCooldownServiceStub()
    )

    response = await connection_client.post(
        "/connections/requests",
        json={"recipient_id": str(uuid4())},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Connection request cooldown is not configured"


@pytest.mark.asyncio
async def test_request_lifecycle_and_lists_use_authenticated_identity(
    connection_client: AsyncClient,
    connection_actor: AuthenticatedUser,
) -> None:
    service = ConnectionServiceStub()
    app.dependency_overrides[get_current_user] = lambda: connection_actor
    app.dependency_overrides[get_connection_service] = lambda: service
    connection_id = uuid4()
    other_user_id = uuid4()

    incoming = await connection_client.get("/connections/requests/incoming")
    outgoing = await connection_client.get("/connections/requests/outgoing")
    accepted = await connection_client.get("/connections")
    accepted_action = await connection_client.post(
        f"/connections/requests/{connection_id}/accept"
    )
    rejected_action = await connection_client.post(
        f"/connections/requests/{connection_id}/reject"
    )
    removed = await connection_client.delete(f"/connections/{other_user_id}")
    unblocked = await connection_client.delete(f"/connections/{other_user_id}/block")

    assert incoming.status_code == outgoing.status_code == accepted.status_code == 200
    assert accepted_action.status_code == rejected_action.status_code == 200
    assert removed.status_code == 200
    assert unblocked.status_code == 204
    assert service.actions == [
        ("incoming", connection_actor.id, None),
        ("outgoing", connection_actor.id, None),
        ("connections", connection_actor.id, None),
        ("accept", connection_actor.id, connection_id),
        ("reject", connection_actor.id, connection_id),
        ("remove", connection_actor.id, other_user_id),
    ]
    assert service.block_call == (connection_actor.id, other_user_id)
