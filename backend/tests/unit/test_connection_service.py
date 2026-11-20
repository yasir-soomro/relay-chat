from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from backend.model.connection import Connection
from backend.repository.connection_repository import ConnectionConflictError
from backend.schemas.connection import ConnectionStatus
from backend.services.connection_service import (
    ConnectionAlreadyExistsError,
    ConnectionCooldownActiveError,
    ConnectionPermissionError,
    ConnectionService,
    ConnectionUserNotFoundError,
    DuplicateConnectionRequestError,
    InvalidConnectionTransitionError,
    SelfConnectionError,
)


class MemoryConnectionRepository:
    def __init__(self, user_ids: set[UUID]) -> None:
        self.user_ids = user_ids
        self.connections: dict[tuple[UUID, UUID], Connection] = {}
        self.connections_by_id: dict[UUID, Connection] = {}

    @staticmethod
    def _pair(first_id: UUID, second_id: UUID) -> tuple[UUID, UUID]:
        low_id, high_id = sorted((first_id, second_id))
        return low_id, high_id

    async def lock_pair_users(self, first_id: UUID, second_id: UUID) -> bool:
        return first_id in self.user_ids and second_id in self.user_ids

    async def get_by_pair_for_update(
        self,
        first_id: UUID,
        second_id: UUID,
    ) -> Connection | None:
        return self.connections.get(self._pair(first_id, second_id))

    async def get_by_id(self, connection_id: UUID) -> Connection | None:
        return self.connections_by_id.get(connection_id)

    async def get_by_id_for_update(self, connection_id: UUID) -> Connection | None:
        return await self.get_by_id(connection_id)

    async def create_connection(self, connection: Connection) -> None:
        pair = self._pair(connection.user_low_id, connection.user_high_id)
        if pair in self.connections:
            raise ConnectionConflictError
        self.connections[pair] = connection
        self.connections_by_id[connection.id] = connection

    async def update_status(
        self,
        connection: Connection,
        status: str,
        now: datetime,
    ) -> None:
        connection.status = status
        if status in {"accepted", "rejected"}:
            connection.responded_at = now
        if status == "rejected":
            connection.rejected_at = now
        if status == "removed":
            connection.removed_at = now

    async def retry_request(
        self,
        connection: Connection,
        requester_id: UUID,
        recipient_id: UUID,
        now: datetime,
    ) -> None:
        connection.requester_id = requester_id
        connection.recipient_id = recipient_id
        connection.status = "pending"
        connection.requested_at = now
        connection.responded_at = None
        connection.rejected_at = None
        connection.removed_at = None

    async def list_requests(self, user_id: UUID, *, incoming: bool) -> list[Connection]:
        column = "recipient_id" if incoming else "requester_id"
        return [
            item
            for item in self.connections.values()
            if getattr(item, column) == user_id and item.status == "pending"
        ]

    async def list_accepted(self, user_id: UUID) -> list[Connection]:
        return [
            item
            for item in self.connections.values()
            if user_id in {item.user_low_id, item.user_high_id}
            and item.status == "accepted"
        ]

    async def commit(self) -> None:
        return None


@pytest.fixture
def participants() -> tuple[UUID, UUID, UUID]:
    return uuid4(), uuid4(), uuid4()


def new_service(
    participants: tuple[UUID, UUID, UUID],
    cooldown_hours: int = 168,
) -> tuple[ConnectionService, MemoryConnectionRepository]:
    repository = MemoryConnectionRepository(set(participants))
    return ConnectionService(repository, cooldown_hours), repository


@pytest.mark.asyncio
async def test_request_prevents_self_duplicate_and_unregistered_user(
    participants: tuple[UUID, UUID, UUID],
) -> None:
    first, second, _ = participants
    service, repository = new_service(participants)

    with pytest.raises(SelfConnectionError):
        await service.request_connection(first, first)

    request = await service.request_connection(first, second)
    assert request.status == ConnectionStatus.PENDING
    with pytest.raises(DuplicateConnectionRequestError):
        await service.request_connection(first, second)
    with pytest.raises(DuplicateConnectionRequestError):
        await service.request_connection(second, first)
    with pytest.raises(ConnectionUserNotFoundError):
        await service.request_connection(first, uuid4())
    assert len(repository.connections) == 1


@pytest.mark.asyncio
async def test_only_recipient_can_accept_or_reject_pending_request(
    participants: tuple[UUID, UUID, UUID],
) -> None:
    first, second, outsider = participants
    service, _ = new_service(participants)
    request = await service.request_connection(first, second)

    with pytest.raises(ConnectionPermissionError):
        await service.accept_request(request.id, first)
    with pytest.raises(ConnectionPermissionError):
        await service.reject_request(request.id, outsider)

    accepted = await service.accept_request(request.id, second)
    assert accepted.status == ConnectionStatus.ACCEPTED
    with pytest.raises(ConnectionAlreadyExistsError):
        await service.request_connection(first, second)
    with pytest.raises(InvalidConnectionTransitionError):
        await service.cancel_request(request.id, first)
    with pytest.raises(InvalidConnectionTransitionError):
        await service.reject_request(request.id, second)


@pytest.mark.asyncio
async def test_requester_can_cancel_pending_request_and_send_again(
    participants: tuple[UUID, UUID, UUID],
) -> None:
    first, second, outsider = participants
    service, repository = new_service(participants)
    request = await service.request_connection(first, second)

    with pytest.raises(ConnectionPermissionError):
        await service.cancel_request(request.id, second)
    with pytest.raises(ConnectionPermissionError):
        await service.cancel_request(request.id, outsider)

    cancelled = await service.cancel_request(request.id, first)

    assert cancelled.status == ConnectionStatus.REMOVED
    assert cancelled.removed_at is not None
    assert not (await service.list_outgoing_requests(first)).items
    assert len(repository.connections) == 1

    resent = await service.request_connection(first, second)

    assert resent.id == request.id
    assert resent.status == ConnectionStatus.PENDING
    assert resent.removed_at is None
    assert resent.rejected_at is None


@pytest.mark.asyncio
async def test_rejection_retry_observes_cooldown_and_original_requester(
    participants: tuple[UUID, UUID, UUID],
) -> None:
    first, second, _ = participants
    service, repository = new_service(participants)
    request = await service.request_connection(first, second)
    rejected = await service.reject_request(request.id, second)
    rejection_time = rejected.rejected_at
    assert rejection_time is not None
    assert rejection_time.tzinfo == UTC

    with pytest.raises(InvalidConnectionTransitionError):
        await service.cancel_request(request.id, first)
    with pytest.raises(ConnectionCooldownActiveError) as error:
        await service.request_connection(first, second)
    assert error.value.retry_at == rejection_time + timedelta(hours=168)

    stored = repository.connections[(min(first, second), max(first, second))]
    stored.rejected_at = rejection_time - timedelta(hours=168)
    retried = await service.request_connection(first, second)
    assert retried.id == request.id
    assert retried.status == ConnectionStatus.PENDING
    assert retried.rejected_at is None

    rejected_again = await service.reject_request(request.id, second)
    assert rejected_again.rejected_at is not None
    assert rejected_again.rejected_at > rejection_time
    with pytest.raises(ConnectionCooldownActiveError) as error:
        await service.request_connection(first, second)
    assert error.value.retry_at == rejected_again.rejected_at + timedelta(hours=168)


@pytest.mark.asyncio
async def test_only_original_requester_can_retry_a_rejected_request(
    participants: tuple[UUID, UUID, UUID],
) -> None:
    first, second, _ = participants
    service, repository = new_service(participants)
    request = await service.request_connection(first, second)
    await service.reject_request(request.id, second)

    with pytest.raises(InvalidConnectionTransitionError):
        await service.request_connection(second, first)

    assert (
        repository.connections[(min(first, second), max(first, second))].status
        == "rejected"
    )


@pytest.mark.asyncio
async def test_rejection_retry_uses_configured_cooldown_hours(
    participants: tuple[UUID, UUID, UUID],
) -> None:
    first, second, _ = participants
    service, _ = new_service(participants, cooldown_hours=72)
    request = await service.request_connection(first, second)
    rejected = await service.reject_request(request.id, second)

    assert rejected.rejected_at is not None
    with pytest.raises(ConnectionCooldownActiveError) as error:
        await service.request_connection(first, second)
    assert error.value.retry_at == rejected.rejected_at + timedelta(hours=72)


@pytest.mark.asyncio
async def test_remove_preserves_relationship_record_and_allows_new_request(
    participants: tuple[UUID, UUID, UUID],
) -> None:
    first, second, _ = participants
    service, repository = new_service(participants)
    request = await service.request_connection(first, second)
    await service.accept_request(request.id, second)

    removed = await service.remove_connection(first, second)

    assert removed.status == ConnectionStatus.REMOVED
    assert len(repository.connections) == 1
    assert not (await service.list_connections(first)).items
    with pytest.raises(InvalidConnectionTransitionError):
        await service.remove_connection(first, second)

    new_request = await service.request_connection(second, first)
    assert new_request.id == request.id
    assert new_request.requester_id == second
    assert new_request.status == ConnectionStatus.PENDING

    assert not (await service.list_connections(first)).items
    accepted = await service.accept_request(new_request.id, first)
    assert accepted.status == ConnectionStatus.ACCEPTED
    assert len((await service.list_connections(first)).items) == 1
