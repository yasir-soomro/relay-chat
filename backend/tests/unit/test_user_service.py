from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from pwdlib import PasswordHash

from backend.model.user import User
from backend.repository.user_repository import UserUniqueConflict
from backend.schemas.user import UserCreate, UserProfileUpdate
from backend.services.user_service import (
    UserAlreadyExistsError,
    UserPermissionError,
    UserService,
)


class InMemoryUserRepository:
    def __init__(self) -> None:
        self.users: dict[UUID, User] = {}
        self.read_count = 0

    async def get_by_id(self, user_id: UUID) -> User | None:
        self.read_count += 1
        return self.users.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return next(
            (
                user
                for user in self.users.values()
                if user.email.lower() == email.lower()
            ),
            None,
        )

    async def email_exists(self, email: str) -> bool:
        return any(user.email.lower() == email.lower() for user in self.users.values())

    async def username_exists(
        self,
        username: str,
        *,
        excluding_user_id: UUID | None = None,
    ) -> bool:
        return any(
            user.id != excluding_user_id and user.username.lower() == username.lower()
            for user in self.users.values()
        )

    async def create(self, user: User) -> User:
        if await self.email_exists(user.email):
            raise UserUniqueConflict("email")
        if await self.username_exists(user.username):
            raise UserUniqueConflict("username")
        user.id = uuid4()
        user.created_at = datetime.now(UTC)
        user.updated_at = user.created_at
        self.users[user.id] = user
        return user

    async def update_profile(
        self,
        user: User,
        fields: dict[str, str | None],
    ) -> User:
        for field, value in fields.items():
            setattr(user, field, value)
        user.updated_at = datetime.now(UTC)
        return user

    async def commit(self) -> None:
        return None


def create_data(**overrides: object) -> UserCreate:
    return UserCreate.model_validate(
        {
            "email": "Relay.User@example.com",
            "username": "relay_user",
            "display_name": "Relay User",
            "password": "a-secure-password",
            **overrides,
        }
    )


@pytest.mark.asyncio
async def test_create_user_hashes_password_with_argon2() -> None:
    repository = InMemoryUserRepository()
    response = await UserService(repository).create_user(create_data())
    stored_user = repository.users[response.id]

    assert stored_user.password_hash.startswith("$argon2id$")
    assert PasswordHash.recommended().verify(
        "a-secure-password",
        stored_user.password_hash,
    )
    assert response.email == "relay.user@example.com"


@pytest.mark.asyncio
async def test_create_user_rejects_normalized_email_and_username_duplicates() -> None:
    repository = InMemoryUserRepository()
    service = UserService(repository)
    await service.create_user(create_data())

    with pytest.raises(UserAlreadyExistsError) as email_error:
        await service.create_user(create_data(email="RELAY.USER@example.com"))
    assert email_error.value.field == "email"

    with pytest.raises(UserAlreadyExistsError) as username_error:
        await service.create_user(
            create_data(email="another@example.com", username="relay_user")
        )
    assert username_error.value.field == "username"


@pytest.mark.asyncio
async def test_only_owner_can_read_or_update_account_profile() -> None:
    repository = InMemoryUserRepository()
    service = UserService(repository)
    owner = await service.create_user(create_data())
    reads_before = repository.read_count

    with pytest.raises(UserPermissionError):
        await service.get_account_profile(owner.id, uuid4())
    with pytest.raises(UserPermissionError):
        await service.update_profile(
            owner.id,
            uuid4(),
            UserProfileUpdate.model_validate({"display_name": "Changed"}),
        )

    assert repository.read_count == reads_before


@pytest.mark.asyncio
async def test_public_and_owner_profile_responses_are_separated() -> None:
    repository = InMemoryUserRepository()
    service = UserService(repository)
    owner = await service.create_user(create_data())

    public_profile = await service.get_public_profile(owner.id)
    account_profile = await service.get_account_profile(owner.id, owner.id)

    assert public_profile.id == owner.id
    assert not hasattr(public_profile, "email")
    assert account_profile.email == "relay.user@example.com"


@pytest.mark.asyncio
async def test_profile_update_changes_only_submitted_fields() -> None:
    repository = InMemoryUserRepository()
    service = UserService(repository)
    owner = await service.create_user(create_data(bio="Original bio"))

    updated = await service.update_profile(
        owner.id,
        owner.id,
        UserProfileUpdate.model_validate({"bio": None}),
    )

    assert updated.bio is None
    assert updated.username == "relay_user"
    assert updated.display_name == "Relay User"
    assert updated.email == "relay.user@example.com"
