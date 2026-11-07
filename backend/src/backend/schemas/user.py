from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)

Username = Annotated[str, Field(min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$")]
DisplayName = Annotated[str, Field(min_length=1, max_length=50)]
Bio = Annotated[str, Field(max_length=160)]


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    username: Username
    display_name: DisplayName
    password: SecretStr = Field(min_length=12, max_length=128)
    bio: Bio | None = None

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: Username | None = None
    display_name: DisplayName | None = None
    bio: Bio | None = None

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> UserProfileUpdate:
        supplied_fields = self.model_fields_set.intersection(
            {"username", "display_name", "bio"}
        )
        if not supplied_fields:
            raise ValueError("At least one profile field must be provided")
        if any(
            field in self.model_fields_set and getattr(self, field) is None
            for field in ("username", "display_name")
        ):
            raise ValueError("Username and display_name cannot be null")
        return self


class UserPublicProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    display_name: str
    bio: str | None


class UserDiscoveryResponse(BaseModel):
    items: list[UserPublicProfile]
    next_cursor: str | None


class UserAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    username: str
    display_name: str
    bio: str | None
    created_at: datetime
    updated_at: datetime
