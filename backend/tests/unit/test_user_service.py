from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from backend.model.user import User
from backend.schemas.user import UserProfileUpdate
from backend.services.user_service import (
    UserNotFoundError,
    UserPermissionError,
    UserService,
)


class InMemoryUserRepository:
    def __init__(self) -> None:
        self.users: dict[UUID, User] = {}
        self.read_count = 0
        self.commit_count = 0

    async def get_by_id(self, user_id: UUID) -> User | None:
        self.read_count += 1
        return self.users.get(user_id)

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
        self.commit_count += 1


def seed_user(
    repository: InMemoryUserRepository,
    *,
    email: str = "relay.user@example.com",
    username: str = "relay_user",
    bio: str | None = None,
) -> User:
    now = datetime.now(UTC)
    user = User(
        id=uuid4(),
        email=email,
        username=username,
        display_name="Relay User",
        password_hash="test-only-hash",
        bio=bio,
        created_at=now,
        updated_at=now,
    )
    repository.users[user.id] = user
    return user


class NoBlockChecker:
    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool:
        return False


@pytest.mark.asyncio
async def test_only_owner_can_update_profile() -> None:
    repository = InMemoryUserRepository()
    service = UserService(repository, NoBlockChecker())
    owner = seed_user(repository)
    reads_before = repository.read_count

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
    service = UserService(repository, NoBlockChecker())
    owner = seed_user(repository)

    public_profile = await service.get_public_profile(owner.id, owner.id)

    assert public_profile.id == owner.id
    assert not hasattr(public_profile, "email")


class BlockChecker:
    def __init__(self, blocked: bool) -> None:
        self.blocked = blocked
        self.checked_pair: tuple[UUID, UUID] | None = None

    async def is_blocked_between(self, first_id: UUID, second_id: UUID) -> bool:
        self.checked_pair = (first_id, second_id)
        return self.blocked


@pytest.mark.asyncio
async def test_blocked_profiles_are_hidden_in_both_directions() -> None:
    repository = InMemoryUserRepository()
    owner = seed_user(repository)
    viewer = seed_user(
        repository,
        email="viewer@example.com",
        username="viewer_user",
    )
    checker = BlockChecker(blocked=True)
    service = UserService(repository, checker)

    for requester_id, profile_id in ((viewer.id, owner.id), (owner.id, viewer.id)):
        with pytest.raises(UserNotFoundError):
            await service.get_public_profile(profile_id, requester_id)
        assert checker.checked_pair == (profile_id, requester_id)


@pytest.mark.asyncio
async def test_profile_update_changes_only_submitted_fields() -> None:
    repository = InMemoryUserRepository()
    service = UserService(repository, NoBlockChecker())
    owner = seed_user(repository, bio="Original bio")

    updated = await service.update_profile(
        owner.id,
        owner.id,
        UserProfileUpdate.model_validate({"bio": None}),
    )

    assert updated.bio is None
    assert updated.username == "relay_user"
    assert updated.display_name == "Relay User"
    assert updated.email == "relay.user@example.com"
    assert repository.commit_count == 1
