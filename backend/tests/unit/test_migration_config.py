from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from backend.DB.base import Base


def test_alembic_config_uses_migrations_directory_and_model_metadata() -> None:
    config = Config("alembic.ini")
    scripts = ScriptDirectory.from_config(config)

    assert Path(scripts.dir).resolve() == Path("migrations").resolve()
    assert set(Base.metadata.tables) == {
        "auth_refresh_tokens",
        "auth_sessions",
        "users",
    }
    assert config.get_main_option("sqlalchemy.url") is None
