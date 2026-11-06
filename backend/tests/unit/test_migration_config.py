from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory

from backend import model  # noqa: F401
from backend.DB.base import Base
from backend.model.message import Message


def test_alembic_config_uses_migrations_directory_and_model_metadata() -> None:
    config = Config("alembic.ini")
    scripts = ScriptDirectory.from_config(config)

    assert Path(scripts.dir).resolve() == Path("migrations").resolve()
    assert set(Base.metadata.tables) == {
        "auth_refresh_tokens",
        "auth_sessions",
        "connections",
        "conversations",
        "messages",
        "users",
        "user_blocks",
    }
    assert config.get_main_option("sqlalchemy.url") is None
    assert Message.__table__.c.client_message_id.nullable is True
    assert scripts.get_current_head() == "20261108_07_ws"
