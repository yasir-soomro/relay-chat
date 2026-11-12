from datetime import UTC, datetime
from typing import ClassVar, Literal, Protocol
from uuid import UUID

from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.model.connection import UserBlock
from backend.model.user import User

UserUniqueField = Literal["email", "username"]


class UserUniqueConflict(Exception):
    def __init__(self, field: UserUniqueField) -> None:
        self.field = field
        super().__init__(f"User {field} already exists")


class UserRepositoryProtocol(Protocol):
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    async def get_by_email(self, email: str) -> User | None: ...

    async def email_exists(self, email: str) -> bool: ...

    async def username_exists(
        self,
        username: str,
        *,
        excluding_user_id: UUID | None = None,
    ) -> bool: ...

    async def create(self, user: User) -> User: ...

    async def update_profile(
        self, user: User, fields: dict[str, str | None]
    ) -> User: ...

    async def discover_users(
        self,
        requester_id: UUID,
        *,
        query: str | None,
        limit: int,
        cursor: str | None,
    ) -> list[User]: ...

    async def commit(self) -> None: ...


class UserRepository:
    _UNIQUE_CONSTRAINTS: ClassVar[dict[str, UserUniqueField]] = {
        "uq_users_email_normalized": "email",
        "uq_users_username_normalized": "username",
    }

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self._session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(func.lower(User.email) == email.lower())
        return await self._session.scalar(statement)

    async def email_exists(self, email: str) -> bool:
        statement = (
            select(User.id).where(func.lower(User.email) == email.lower()).limit(1)
        )
        return (await self._session.scalar(statement)) is not None

    async def username_exists(
        self,
        username: str,
        *,
        excluding_user_id: UUID | None = None,
    ) -> bool:
        statement = select(User.id).where(func.lower(User.username) == username.lower())
        if excluding_user_id is not None:
            statement = statement.where(User.id != excluding_user_id)
        return (await self._session.scalar(statement.limit(1))) is not None

    async def create(self, user: User) -> User:
        self._session.add(user)
        await self._flush()
        return user

    async def update_profile(
        self,
        user: User,
        fields: dict[str, str | None],
    ) -> User:
        for field, value in fields.items():
            setattr(user, field, value)
        user.updated_at = datetime.now(UTC)
        await self._flush()
        return user

    async def discover_users(
        self,
        requester_id: UUID,
        *,
        query: str | None,
        limit: int,
        cursor: str | None,
    ) -> list[User]:
        blocked_relationship = exists(
            select(UserBlock.id).where(
                or_(
                    and_(
                        UserBlock.blocker_id == requester_id,
                        UserBlock.blocked_id == User.id,
                    ),
                    and_(
                        UserBlock.blocker_id == User.id,
                        UserBlock.blocked_id == requester_id,
                    ),
                )
            )
        )
        statement = select(User).where(
            User.id != requester_id,
            ~blocked_relationship,
        )
        if query is not None:
            statement = statement.where(
                User.username.startswith(query.lower(), autoescape=True)
            )
        if cursor is not None:
            statement = statement.where(User.username > cursor)
        statement = statement.order_by(User.username.asc()).limit(limit)
        return list((await self._session.scalars(statement)).all())

    async def commit(self) -> None:
        try:
            await self._session.commit()
        except IntegrityError as error:
            await self._session.rollback()
            self._raise_known_unique_conflict(error)
            raise

    async def _flush(self) -> None:
        try:
            await self._session.flush()
        except IntegrityError as error:
            await self._session.rollback()
            self._raise_known_unique_conflict(error)
            raise

    @classmethod
    def _raise_known_unique_conflict(cls, error: IntegrityError) -> None:
        original_error = getattr(error, "orig", None)
        diagnostic = getattr(original_error, "diag", None)
        constraint_name = getattr(diagnostic, "constraint_name", None) or getattr(
            original_error,
            "constraint_name",
            None,
        )
        field = (
            cls._UNIQUE_CONSTRAINTS.get(constraint_name)
            if isinstance(constraint_name, str)
            else None
        )
        if field is not None:
            raise UserUniqueConflict(field) from None
