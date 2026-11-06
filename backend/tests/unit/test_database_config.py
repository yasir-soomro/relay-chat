import pytest
from pydantic import SecretStr, ValidationError

from backend.core.config import Settings
from backend.DB.session import build_database_url


def test_settings_validate_database_configuration() -> None:
    settings = Settings(
        db_user="relay-test",
        db_password="test-password",
        db_host="localhost",
        db_port=5432,
        db_name="relay-test",
        db_ssl="require",
    )

    assert settings.db_user == "relay-test"
    assert settings.db_password == SecretStr("test-password")
    assert settings.db_port == 5432
    assert settings.db_ssl == "require"
    assert settings.ws_auth_timeout_seconds == 10


@pytest.mark.parametrize("timeout", [0, -1])
def test_settings_reject_nonpositive_websocket_auth_timeout(timeout: int) -> None:
    with pytest.raises(ValidationError):
        Settings(
            db_user="relay-test",
            db_password="test-password",
            db_host="localhost",
            db_port=5432,
            db_name="relay-test",
            ws_auth_timeout_seconds=timeout,
        )


def test_settings_load_websocket_auth_timeout_from_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WS_AUTH_TIMEOUT_SECONDS", "17")

    settings = Settings(
        db_user="relay-test",
        db_password=SecretStr("test-password"),
        db_host="localhost",
        db_port=5432,
        db_name="relay-test",
    )

    assert settings.ws_auth_timeout_seconds == 17


def test_settings_reject_invalid_websocket_auth_timeout_environment_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WS_AUTH_TIMEOUT_SECONDS", "not-an-integer")

    with pytest.raises(ValidationError):
        Settings(
            db_user="relay-test",
            db_password="test-password",
            db_host="localhost",
            db_port=5432,
            db_name="relay-test",
        )


def test_database_url_escapes_password_and_disables_prepared_cache() -> None:
    settings = Settings(
        db_user="relay-test",
        db_password="test@password:/?%#",
        db_host="localhost",
        db_port=5432,
        db_name="relay-test",
    )

    url = build_database_url(settings)
    rendered = url.render_as_string(hide_password=False)

    assert url.drivername == "postgresql+asyncpg"
    assert url.password == "test@password:/?%#"
    assert url.query["prepared_statement_cache_size"] == "0"
    assert settings.db_password.get_secret_value() not in rendered
    assert url.render_as_string(hide_password=True).startswith(
        "postgresql+asyncpg://relay-test:***@localhost:5432/relay-test"
    )
