from pydantic import SecretStr

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
