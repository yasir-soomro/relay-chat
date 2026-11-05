from functools import lru_cache
from uuid import UUID

from pwdlib import PasswordHash

from backend.model.user import User
from backend.repository.user_repository import (
    UserRepositoryProtocol,
    UserUniqueConflict,
)
from backend.schemas.user import (
    UserAccountResponse,
    UserCreate,
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


@lru_cache
def _password_hasher() -> PasswordHash:
    return PasswordHash.recommended()


class UserService:
    def __init__(self, repository: UserRepositoryProtocol) -> None:
        self._repository = repository

    async def create_user(self, data: UserCreate) -> UserAccountResponse:
        email = str(data.email).lower()
        if await self._repository.email_exists(email):
            raise UserAlreadyExistsError("email")
        if await self._repository.username_exists(data.username):
            raise UserAlreadyExistsError("username")

        user = User(
            email=email,
            username=data.username,
            display_name=data.display_name,
            password_hash=_password_hasher().hash(data.password.get_secret_value()),
            bio=data.bio,
        )
        try:
            await self._repository.create(user)
            await self._repository.commit()
        except UserUniqueConflict as error:
            raise UserAlreadyExistsError(error.field) from None
        return UserAccountResponse.model_validate(user)

    async def get_public_profile(self, user_id: UUID) -> UserPublicProfile:
        user = await self._repository.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError("User not found")
        return UserPublicProfile.model_validate(user)

    async def get_account_profile(
        self,
        user_id: UUID,
        authenticated_user_id: UUID,
    ) -> UserAccountResponse:
        self._ensure_owner(user_id, authenticated_user_id)
        user = await self._repository.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError("User not found")
        return UserAccountResponse.model_validate(user)

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
