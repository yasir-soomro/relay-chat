from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from backend.model.connection import Connection
from backend.repository.connection_repository import (
    ConnectionConflictError,
    ConnectionRepositoryProtocol,
)
from backend.schemas.connection import (
    BlockResponse,
    ConnectionListResponse,
    ConnectionResponse,
)


class ConnectionManagementError(Exception):
    pass


class ConnectionUserNotFoundError(ConnectionManagementError):
    pass


class ConnectionNotFoundError(ConnectionManagementError):
    pass


class ConnectionPermissionError(ConnectionManagementError):
    pass


class InvalidConnectionTransitionError(ConnectionManagementError):
    pass


class ConnectionBlockedError(ConnectionManagementError):
    pass


class SelfConnectionError(ConnectionManagementError):
    pass


class DuplicateConnectionRequestError(ConnectionManagementError):
    pass


class ConnectionAlreadyExistsError(ConnectionManagementError):
    pass


class ConnectionCooldownNotConfiguredError(ConnectionManagementError):
    pass


class ConnectionCooldownActiveError(ConnectionManagementError):
    def __init__(self, available_at: datetime) -> None:
        self.available_at = available_at
        super().__init__("The request cooldown has not elapsed")


class BlockAlreadyExistsError(ConnectionManagementError):
    pass


class BlockNotFoundError(ConnectionManagementError):
    pass


class ConnectionService:
    def __init__(
        self,
        repository: ConnectionRepositoryProtocol,
        cooldown_seconds: int | None = None,
    ) -> None:
        self._repository = repository
        self._cooldown_seconds = cooldown_seconds

    async def request_connection(
        self,
        requester_id: UUID,
        recipient_id: UUID,
    ) -> ConnectionResponse:
        self._reject_self_connection(requester_id, recipient_id)
        await self._lock_pair(requester_id, recipient_id)
        await self._ensure_not_blocked(requester_id, recipient_id)

        connection = await self._repository.get_by_pair_for_update(
            requester_id,
            recipient_id,
        )
        now = datetime.now(UTC)
        if connection is None:
            connection = self._new_connection(requester_id, recipient_id, now)
            try:
                await self._repository.create_connection(connection)
            except ConnectionConflictError:
                raise DuplicateConnectionRequestError from None
        elif connection.status == "pending":
            raise DuplicateConnectionRequestError
        elif connection.status == "accepted":
            raise ConnectionAlreadyExistsError
        elif connection.status == "rejected":
            connection = await self._retry_rejected_request(
                connection,
                requester_id,
                recipient_id,
                now,
            )
        elif connection.status == "removed":
            await self._repository.retry_request(
                connection,
                requester_id,
                recipient_id,
                now,
            )
        else:
            raise InvalidConnectionTransitionError

        await self._repository.commit()
        return ConnectionResponse.model_validate(connection)

    async def list_incoming_requests(self, user_id: UUID) -> ConnectionListResponse:
        items = await self._repository.list_requests(user_id, incoming=True)
        return ConnectionListResponse(
            items=[ConnectionResponse.model_validate(item) for item in items]
        )

    async def list_outgoing_requests(self, user_id: UUID) -> ConnectionListResponse:
        items = await self._repository.list_requests(user_id, incoming=False)
        return ConnectionListResponse(
            items=[ConnectionResponse.model_validate(item) for item in items]
        )

    async def accept_request(
        self,
        connection_id: UUID,
        recipient_id: UUID,
    ) -> ConnectionResponse:
        connection = await self._get_request_pair(connection_id, recipient_id)
        await self._lock_pair(connection.requester_id, connection.recipient_id)
        await self._ensure_not_blocked(connection.requester_id, connection.recipient_id)
        connection = await self._get_locked_connection(connection_id)
        if connection.recipient_id != recipient_id:
            raise ConnectionPermissionError
        if connection.status != "pending":
            raise InvalidConnectionTransitionError
        await self._repository.update_status(connection, "accepted", datetime.now(UTC))
        await self._repository.commit()
        return ConnectionResponse.model_validate(connection)

    async def reject_request(
        self,
        connection_id: UUID,
        recipient_id: UUID,
    ) -> ConnectionResponse:
        connection = await self._get_request_pair(connection_id, recipient_id)
        await self._lock_pair(connection.requester_id, connection.recipient_id)
        await self._ensure_not_blocked(connection.requester_id, connection.recipient_id)
        connection = await self._get_locked_connection(connection_id)
        if connection.recipient_id != recipient_id:
            raise ConnectionPermissionError
        if connection.status != "pending":
            raise InvalidConnectionTransitionError
        await self._repository.update_status(connection, "rejected", datetime.now(UTC))
        await self._repository.commit()
        return ConnectionResponse.model_validate(connection)

    async def remove_connection(
        self,
        user_id: UUID,
        other_user_id: UUID,
    ) -> ConnectionResponse:
        self._reject_self_connection(user_id, other_user_id)
        await self._lock_pair(user_id, other_user_id)
        await self._ensure_not_blocked(user_id, other_user_id)
        connection = await self._repository.get_by_pair_for_update(
            user_id,
            other_user_id,
        )
        if connection is None:
            raise ConnectionNotFoundError
        if connection.status != "accepted":
            raise InvalidConnectionTransitionError
        await self._repository.update_status(connection, "removed", datetime.now(UTC))
        await self._repository.commit()
        return ConnectionResponse.model_validate(connection)

    async def block_user(self, blocker_id: UUID, blocked_id: UUID) -> BlockResponse:
        self._reject_self_connection(blocker_id, blocked_id)
        await self._lock_pair(blocker_id, blocked_id)
        if await self._repository.is_blocked_between(blocker_id, blocked_id):
            if await self._repository.is_blocked_by(blocker_id, blocked_id):
                raise BlockAlreadyExistsError
            raise ConnectionBlockedError

        connection = await self._repository.get_by_pair_for_update(
            blocker_id,
            blocked_id,
        )
        now = datetime.now(UTC)
        block = await self._repository.create_block(blocker_id, blocked_id)
        if connection is not None and connection.status in {"pending", "accepted"}:
            await self._repository.update_status(connection, "removed", now)
        await self._repository.commit()
        return BlockResponse(
            blocked_user_id=blocked_id, created_at=block.created_at or now
        )

    async def unblock_user(self, blocker_id: UUID, blocked_id: UUID) -> None:
        self._reject_self_connection(blocker_id, blocked_id)
        await self._lock_pair(blocker_id, blocked_id)
        if not await self._repository.delete_block(blocker_id, blocked_id):
            raise BlockNotFoundError
        await self._repository.commit()

    async def list_connections(self, user_id: UUID) -> ConnectionListResponse:
        items = await self._repository.list_accepted(user_id)
        return ConnectionListResponse(
            items=[ConnectionResponse.model_validate(item) for item in items]
        )

    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool:
        return await self._repository.is_blocked_between(first_id, second_id)

    async def _retry_rejected_request(
        self,
        connection: Connection,
        requester_id: UUID,
        recipient_id: UUID,
        now: datetime,
    ) -> Connection:
        if requester_id != connection.requester_id:
            raise InvalidConnectionTransitionError
        if self._cooldown_seconds is None:
            raise ConnectionCooldownNotConfiguredError
        if connection.rejected_at is None:
            raise InvalidConnectionTransitionError
        available_at = connection.rejected_at + timedelta(
            seconds=self._cooldown_seconds
        )
        if now < available_at:
            raise ConnectionCooldownActiveError(available_at)
        await self._repository.retry_request(
            connection,
            requester_id,
            recipient_id,
            now,
        )
        return connection

    async def _get_request_pair(
        self,
        connection_id: UUID,
        actor_id: UUID,
    ) -> Connection:
        connection = await self._repository.get_by_id(connection_id)
        if connection is None:
            raise ConnectionNotFoundError
        if actor_id not in {connection.requester_id, connection.recipient_id}:
            raise ConnectionPermissionError
        return connection

    async def _get_locked_connection(self, connection_id: UUID) -> Connection:
        connection = await self._repository.get_by_id_for_update(connection_id)
        if connection is None:
            raise ConnectionNotFoundError
        return connection

    async def _lock_pair(self, first_id: UUID, second_id: UUID) -> None:
        if not await self._repository.lock_pair_users(first_id, second_id):
            raise ConnectionUserNotFoundError

    async def _ensure_not_blocked(self, first_id: UUID, second_id: UUID) -> None:
        if await self._repository.is_blocked_between(first_id, second_id):
            raise ConnectionBlockedError

    @staticmethod
    def _reject_self_connection(first_id: UUID, second_id: UUID) -> None:
        if first_id == second_id:
            raise SelfConnectionError

    @staticmethod
    def _new_connection(
        requester_id: UUID,
        recipient_id: UUID,
        now: datetime,
    ) -> Connection:
        low_id, high_id = sorted((requester_id, recipient_id))
        return Connection(
            id=uuid4(),
            user_low_id=low_id,
            user_high_id=high_id,
            requester_id=requester_id,
            recipient_id=recipient_id,
            status="pending",
            requested_at=now,
        )
