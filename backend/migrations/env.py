import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import Connection as DBConnection

from backend.DB.base import Base
from backend.DB.session import build_database_url, dispose_engine, get_engine
from backend.model import (  # noqa: F401
    AuthRefreshToken,
    AuthSession,
    Connection,
    Conversation,
    Message,
    User,
    UserBlock,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=build_database_url().render_as_string(hide_password=True),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: DBConnection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = get_engine()
    try:
        async with engine.connect() as connection:
            await connection.run_sync(do_run_migrations)
    finally:
        await dispose_engine()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
