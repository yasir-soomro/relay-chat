import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.pool import NullPool


@pytest_asyncio.fixture
async def postgres_test_engine() -> AsyncIterator[AsyncEngine]:
    configured_url = os.getenv("TEST_DATABASE_URL")
    if not configured_url:
        pytest.skip("Set TEST_DATABASE_URL to an isolated PostgreSQL test database")

    url = make_url(configured_url)
    if url.drivername != "postgresql+asyncpg":
        raise ValueError("TEST_DATABASE_URL must use postgresql+asyncpg")

    engine = create_async_engine(
        url.update_query_dict({"prepared_statement_cache_size": "0"}),
        connect_args={
            "ssl": os.getenv("TEST_DB_SSL", "require"),
            "statement_cache_size": 0,
        },
        poolclass=NullPool,
    )
    try:
        yield engine
    finally:
        await engine.dispose()
