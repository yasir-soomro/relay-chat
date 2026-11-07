from typing import Protocol
from uuid import UUID

from backend.model.user import User
from backend.repository.user_repository import UserUniqueConflict
from backend.schemas.user import (
    UserAccountResponse,
    UserDiscoveryResponse,
    UserProfileUpdate,
    UserPublicProfile,
)


class UserNotFoundError(Exception):
    pass


class UserPermissionError(Exception):
    pass


class UserAlreadyExistsError(Exception):
    def __init__(self, field: str) -> None:
        self.field = field
        super().__init__(f"User {field} already exists")


class ProfileBlockChecker(Protocol):
    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool: ...


class UserProfileRepositoryProtocol(Protocol):
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    async def username_exists(
        self,
        username: str,
        *,
        excluding_user_id: UUID | None = None,
    ) -> bool: ...

    async def update_profile(
        self,
        user: User,
        fields: dict[str, str | None],
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


class UserService:
    def __init__(
        self,
        repository: UserProfileRepositoryProtocol,
        block_checker: ProfileBlockChecker,
    ) -> None:
        self._repository = repository
        self._block_checker = block_checker

    async def get_public_profile(
        self,
        user_id: UUID,
        requester_id: UUID,
    ) -> UserPublicProfile:
        if await self._block_checker.is_blocked_between(user_id, requester_id):
            raise UserNotFoundError("User not found")
        user = await self._repository.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError("User not found")
        return UserPublicProfile.model_validate(user)

    async def discover_users(
        self,
        requester_id: UUID,
        *,
        query: str | None,
        limit: int,
        cursor: str | None,
    ) -> UserDiscoveryResponse:
        users = await self._repository.discover_users(
            requester_id,
            query=query.lower() if query is not None else None,
            limit=limit + 1,
            cursor=cursor,
        )
        has_more = len(users) > limit
        page = users[:limit]
        return UserDiscoveryResponse(
            items=[UserPublicProfile.model_validate(user) for user in page],
            next_cursor=page[-1].username if has_more else None,
        )

    async def update_profile(
        self,
        user_id: UUID,
        authenticated_user_id: UUID,
        data: UserProfileUpdate,
    ) -> UserAccountResponse:
        self._ensure_owner(user_id, authenticated_user_id)
        user = await self._repository.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError("User not found")

        fields = data.model_dump(exclude_unset=True)
        username = fields.get("username")
        if isinstance(username, str) and await self._repository.username_exists(
            username,
            excluding_user_id=user_id,
        ):
            raise UserAlreadyExistsError("username")

        try:
            await self._repository.update_profile(user, fields)
            await self._repository.commit()
        except UserUniqueConflict as error:
            raise UserAlreadyExistsError(error.field) from None
        return UserAccountResponse.model_validate(user)

    @staticmethod
    def _ensure_owner(user_id: UUID, authenticated_user_id: UUID) -> None:
        if user_id != authenticated_user_id:
            raise UserPermissionError(
                "Only the profile owner may perform this operation"
            )
