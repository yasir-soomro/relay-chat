from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

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


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
