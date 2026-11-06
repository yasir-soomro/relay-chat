from datetime import datetime
from typing import Protocol
from uuid import UUID

from sqlalchemy import and_, delete, exists, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.model.connection import Connection, UserBlock
from backend.model.user import User


class ConnectionRepositoryProtocol(Protocol):
    async def lock_pair_users(self, first_id: UUID, second_id: UUID) -> bool: ...

    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool: ...

    async def is_blocked_by(self, blocker_id: UUID, blocked_id: UUID) -> bool: ...

    async def get_by_pair_for_update(
        self,
        first_id: UUID,
        second_id: UUID,
    ) -> Connection | None: ...

    async def get_by_id(self, connection_id: UUID) -> Connection | None: ...

    async def get_by_id_for_update(self, connection_id: UUID) -> Connection | None: ...

    async def create_connection(self, connection: Connection) -> None: ...

    async def update_status(
        self,
        connection: Connection,
        status: str,
        now: datetime,
    ) -> None: ...

    async def retry_request(
        self,
        connection: Connection,
        requester_id: UUID,
        recipient_id: UUID,
        now: datetime,
    ) -> None: ...

    async def list_requests(
        self, user_id: UUID, *, incoming: bool
    ) -> list[Connection]: ...

    async def list_accepted(self, user_id: UUID) -> list[Connection]: ...

    async def create_block(self, blocker_id: UUID, blocked_id: UUID) -> UserBlock: ...

    async def delete_block(self, blocker_id: UUID, blocked_id: UUID) -> bool: ...

    async def commit(self) -> None: ...


class ConnectionConflictError(Exception):
    pass


class ConnectionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def lock_pair_users(self, first_id: UUID, second_id: UUID) -> bool:
        user_ids = sorted({first_id, second_id})
        statement = (
            select(User.id)
            .where(User.id.in_(user_ids))
            .order_by(User.id)
            .with_for_update()
        )
        return len((await self._session.scalars(statement)).all()) == 2

    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool:
        statement = select(
            exists().where(
                or_(
                    and_(
                        UserBlock.blocker_id == first_id,
                        UserBlock.blocked_id == second_id,
                    ),
                    and_(
                        UserBlock.blocker_id == second_id,
                        UserBlock.blocked_id == first_id,
                    ),
                )
            )
        )
        return bool(await self._session.scalar(statement))

    async def is_blocked_by(self, blocker_id: UUID, blocked_id: UUID) -> bool:
        statement = select(
            exists().where(
                UserBlock.blocker_id == blocker_id,
                UserBlock.blocked_id == blocked_id,
            )
        )
        return bool(await self._session.scalar(statement))

    async def get_by_pair_for_update(
        self,
        first_id: UUID,
        second_id: UUID,
    ) -> Connection | None:
        low_id, high_id = sorted((first_id, second_id))
        statement = (
            select(Connection)
            .where(
                Connection.user_low_id == low_id,
                Connection.user_high_id == high_id,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return await self._session.scalar(statement)

    async def get_by_id(self, connection_id: UUID) -> Connection | None:
        return await self._session.get(Connection, connection_id)

    async def get_by_id_for_update(self, connection_id: UUID) -> Connection | None:
        statement = (
            select(Connection)
            .where(Connection.id == connection_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return await self._session.scalar(statement)

    async def create_connection(self, connection: Connection) -> None:
        self._session.add(connection)
        try:
            await self._session.flush()
        except IntegrityError as error:
            await self._session.rollback()
            diagnostic = getattr(getattr(error, "orig", None), "diag", None)
            if (
                getattr(diagnostic, "constraint_name", None)
                == "uq_connections_user_pair"
            ):
                raise ConnectionConflictError from None
            raise

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
        await self._session.flush()

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
        await self._session.flush()

    async def list_requests(self, user_id: UUID, *, incoming: bool) -> list[Connection]:
        owner_column = Connection.recipient_id if incoming else Connection.requester_id
        blocked = exists().where(
            or_(
                and_(
                    UserBlock.blocker_id == Connection.requester_id,
                    UserBlock.blocked_id == Connection.recipient_id,
                ),
                and_(
                    UserBlock.blocker_id == Connection.recipient_id,
                    UserBlock.blocked_id == Connection.requester_id,
                ),
            )
        )
        statement = (
            select(Connection)
            .where(
                owner_column == user_id,
                Connection.status == "pending",
                ~blocked,
            )
            .order_by(Connection.requested_at, Connection.id)
        )
        return list((await self._session.scalars(statement)).all())

    async def list_accepted(self, user_id: UUID) -> list[Connection]:
        blocked = exists().where(
            or_(
                and_(
                    UserBlock.blocker_id == Connection.user_low_id,
                    UserBlock.blocked_id == Connection.user_high_id,
                ),
                and_(
                    UserBlock.blocker_id == Connection.user_high_id,
                    UserBlock.blocked_id == Connection.user_low_id,
                ),
            )
        )
        statement = (
            select(Connection)
            .where(
                or_(
                    Connection.user_low_id == user_id,
                    Connection.user_high_id == user_id,
                ),
                Connection.status == "accepted",
                ~blocked,
            )
            .order_by(Connection.responded_at, Connection.id)
        )
        return list((await self._session.scalars(statement)).all())

    async def create_block(self, blocker_id: UUID, blocked_id: UUID) -> UserBlock:
        block = UserBlock(blocker_id=blocker_id, blocked_id=blocked_id)
        self._session.add(block)
        await self._session.flush()
        return block

    async def delete_block(self, blocker_id: UUID, blocked_id: UUID) -> bool:
        statement = (
            delete(UserBlock)
            .where(
                UserBlock.blocker_id == blocker_id,
                UserBlock.blocked_id == blocked_id,
            )
            .returning(UserBlock.id)
        )
        result = await self._session.execute(statement)
        return result.scalar_one_or_none() is not None

    async def commit(self) -> None:
        await self._session.commit()
