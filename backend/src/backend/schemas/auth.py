from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator

from backend.schemas.user import UserAccountResponse, UserCreate


class RegisterRequest(UserCreate):
    pass


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: SecretStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: Annotated[int, Field(gt=0)]


class RegistrationResponse(BaseModel):
    user: UserAccountResponse


class CurrentAccountResponse(UserAccountResponse):
    pass
