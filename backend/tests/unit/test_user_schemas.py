from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from backend.model.user import User
from backend.schemas.user import (
    UserAccountResponse,
    UserCreate,
    UserProfileUpdate,
    UserPublicProfile,
)


def valid_user_data(**overrides: object) -> dict[str, object]:
    return {
        "email": "  Relay.User@Example.COM ",
        "username": "relay_user",
        "display_name": "Relay User",
        "password": "a-secure-password",
        **overrides,
    }


def test_user_create_normalizes_email_and_hides_password() -> None:
    data = UserCreate.model_validate(valid_user_data())

    assert str(data.email) == "relay.user@example.com"
    assert data.password.get_secret_value() == "a-secure-password"
    assert "a-secure-password" not in repr(data)


@pytest.mark.parametrize(
    "username",
    ["ab", "Ausername", "bad-name", "user name", "x" * 31],
)
def test_user_create_rejects_invalid_username(username: str) -> None:
    with pytest.raises(ValidationError):
        UserCreate.model_validate(valid_user_data(username=username))


@pytest.mark.parametrize(
    "overrides",
    [
        {"email": "not-an-email"},
        {"display_name": ""},
        {"display_name": "x" * 51},
        {"bio": "x" * 161},
        {"password": "x" * 11},
        {"password": "x" * 129},
        {"unexpected": "field"},
    ],
)
def test_user_create_rejects_invalid_or_unapproved_fields(
    overrides: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        UserCreate.model_validate(valid_user_data(**overrides))


def test_profile_update_requires_a_field_and_forbids_credentials() -> None:
    with pytest.raises(ValidationError):
        UserProfileUpdate.model_validate({})
    with pytest.raises(ValidationError):
        UserProfileUpdate.model_validate({"email": "new@example.com"})
    with pytest.raises(ValidationError):
        UserProfileUpdate.model_validate({"password": "another-secure-password"})
    with pytest.raises(ValidationError):
        UserProfileUpdate.model_validate({"username": None})


def test_profile_update_preserves_omitted_fields_and_allows_clearing_bio() -> None:
    update = UserProfileUpdate.model_validate({"bio": None})

    assert update.model_dump(exclude_unset=True) == {"bio": None}


def test_public_and_owner_responses_expose_only_approved_fields() -> None:
    now = datetime.now(UTC)
    user = User(
        id=uuid4(),
        email="private@example.com",
        username="relay_user",
        display_name="Relay User",
        password_hash="internal-password-hash",
        bio=None,
        created_at=now,
        updated_at=now,
    )

    public = UserPublicProfile.model_validate(user).model_dump()
    account = UserAccountResponse.model_validate(user).model_dump()

    assert set(public) == {"id", "username", "display_name", "bio"}
    assert set(account) == {
        "id",
        "email",
        "username",
        "display_name",
        "bio",
        "created_at",
        "updated_at",
    }
    assert "password_hash" not in public
    assert "password_hash" not in account
