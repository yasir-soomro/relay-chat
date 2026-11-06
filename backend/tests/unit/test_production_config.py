import pytest

from backend.core.config import Settings, validate_production_settings


def production_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "db_user": "relay",
        "db_password": "production-password",
        "db_host": "db.example.com",
        "db_port": 5432,
        "db_name": "relay",
        "db_ssl": "require",
        "auth_jwt_secret": "a-production-signing-secret-with-32-bytes",
        "app_env": "production",
        "auth_allowed_origins": "https://relay.example.com",
    }
    values.update(overrides)
    return Settings.model_validate(values)


def test_production_settings_accept_secure_explicit_configuration() -> None:
    validate_production_settings(production_settings())


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"auth_jwt_secret": "short"}, "AUTH_JWT_SECRET"),
        ({"db_password": ""}, "DB_PASSWORD"),
        ({"db_host": " "}, "DB_USER, DB_HOST, and DB_NAME"),
        ({"db_ssl": "disable"}, "DB_SSL"),
        ({"auth_allowed_origins": "*"}, "AUTH_ALLOWED_ORIGINS"),
        ({"auth_allowed_origins": "http://relay.example.com"}, "HTTPS origins"),
        ({"auth_allowed_origins": "https://localhost:5173"}, "HTTPS origins"),
    ],
)
def test_production_settings_reject_insecure_configuration(
    overrides: dict[str, object],
    message: str,
) -> None:
    with pytest.raises(ValueError, match=message):
        validate_production_settings(production_settings(**overrides))
