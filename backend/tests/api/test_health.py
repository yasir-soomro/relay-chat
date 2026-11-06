import httpx
import pytest
from sqlalchemy.exc import SQLAlchemyError

from backend.DB.session import get_db_session
from backend.main import app


class ReadyDatabaseSession:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.statement: object | None = None

    async def execute(self, statement: object) -> None:
        self.statement = statement
        if self.error is not None:
            raise self.error


@pytest.mark.asyncio
async def test_health_check() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_readiness_check_reports_database_availability() -> None:
    session = ReadyDatabaseSession()

    async def provide_session():
        yield session

    app.dependency_overrides[get_db_session] = provide_session
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            response = await client.get("/health/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
    assert session.statement is not None


@pytest.mark.asyncio
async def test_readiness_check_hides_database_failure_details() -> None:
    session = ReadyDatabaseSession(SQLAlchemyError("private connection details"))

    async def provide_session():
        yield session

    app.dependency_overrides[get_db_session] = provide_session
    try:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            response = await client.get("/health/ready")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {"status": "not_ready"}
    assert "private connection details" not in response.text
