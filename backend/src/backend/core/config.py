from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    db_user: str
    db_password: SecretStr
    db_host: str
    db_port: Annotated[int, Field(gt=0, le=65535)]
    db_name: str
    db_ssl: Literal[
        "disable", "allow", "prefer", "require", "verify-ca", "verify-full"
    ] = "require"
    auth_jwt_secret: SecretStr = SecretStr("")
    auth_access_token_expire_minutes: Annotated[int, Field(gt=0)] = 15
    auth_refresh_token_expire_days: Annotated[int, Field(gt=0)] = 30
    ws_auth_timeout_seconds: Annotated[int, Field(gt=0)] = 10
    connection_request_cooldown_hours: Annotated[int, Field(gt=0)] = 168
    app_env: Literal["development", "test", "production"] = "development"
    auth_allowed_origins: str = "http://localhost:5173"

    @property
    def allowed_origins(self) -> frozenset[str]:
        return frozenset(
            origin.strip().rstrip("/")
            for origin in self.auth_allowed_origins.split(",")
            if origin.strip()
        )

    @property
    def auth_cookie_secure(self) -> bool:
        return self.app_env == "production"


def validate_production_settings(settings: Settings) -> None:
    if settings.app_env != "production":
        return

    if not all(
        value.strip()
        for value in (settings.db_user, settings.db_host, settings.db_name)
    ):
        raise ValueError("DB_USER, DB_HOST, and DB_NAME must not be empty")
    if len(settings.auth_jwt_secret.get_secret_value().encode("utf-8")) < 32:
        raise ValueError("AUTH_JWT_SECRET must contain at least 32 bytes")
    if not settings.db_password.get_secret_value():
        raise ValueError("DB_PASSWORD must not be empty")
    if settings.db_ssl in {"disable", "allow", "prefer"}:
        raise ValueError("DB_SSL must require encrypted connections in production")

    origins = settings.allowed_origins
    if not origins or "*" in origins:
        raise ValueError(
            "AUTH_ALLOWED_ORIGINS must contain explicit production origins"
        )
    for origin in origins:
        parsed = urlsplit(origin)
        try:
            port = parsed.port
        except ValueError:
            raise ValueError(
                "AUTH_ALLOWED_ORIGINS must contain valid HTTPS origins"
            ) from None
        if (
            parsed.scheme != "https"
            or not parsed.netloc
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path
            or parsed.query
            or parsed.fragment
            or parsed.hostname in {"localhost", "127.0.0.1", "::1"}
            or (port is not None and not 1 <= port <= 65535)
        ):
            raise ValueError(
                "AUTH_ALLOWED_ORIGINS must contain HTTPS origins without paths"
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
