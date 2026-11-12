import ipaddress
import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool


def _validated_test_database_url(configured_url: str) -> URL:
    url = make_url(configured_url)
    if url.drivername != "postgresql+asyncpg":
        raise ValueError("TEST_DATABASE_URL must use postgresql+asyncpg")
    if url.query:
        raise ValueError("TEST_DATABASE_URL must not contain connection overrides")

    try:
        host = ipaddress.ip_address(url.host or "")
    except ValueError:
        raise ValueError(
            "TEST_DATABASE_URL must use a numeric loopback address"
        ) from None

    if not host.is_loopback:
        raise ValueError("TEST_DATABASE_URL must use a loopback address")
    if url.username != "relay_test" or url.database != "relay_test":
        raise ValueError(
            "TEST_DATABASE_URL must use the dedicated relay_test role and database"
        )
    return url


@pytest_asyncio.fixture
async def postgres_test_engine() -> AsyncIterator[AsyncEngine]:
    configured_url = os.getenv("TEST_DATABASE_URL")
    if not configured_url:
        pytest.skip("Set TEST_DATABASE_URL to an isolated PostgreSQL test database")

    url = _validated_test_database_url(configured_url)

    engine = create_async_engine(
        url.update_query_dict({"prepared_statement_cache_size": "0"}),
        connect_args={
            "ssl": os.getenv("TEST_DB_SSL", "disable"),
            "statement_cache_size": 0,
        },
        poolclass=NullPool,
    )
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def postgres_test_session(
    postgres_test_engine: AsyncEngine,
) -> AsyncIterator[AsyncSession]:
    async with postgres_test_engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(
            connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        try:
            yield session
        finally:
            try:
                await session.close()
            finally:
                if transaction.is_active:
                    await transaction.rollback()
