# Relay backend

The backend uses FastAPI, asynchronous SQLAlchemy, PostgreSQL, and `uv`.
Run the following commands from `backend/`.

## Local configuration

Copy `.env.example` to `.env` and set local PostgreSQL connection values. Set
`AUTH_JWT_SECRET` to a random secret of at least 32 bytes; never use the
example value or commit `.env`. Configure `AUTH_ALLOWED_ORIGINS` as a
comma-separated list of trusted browser origins. `APP_ENV=production` enables
the Secure flag on refresh-token cookies.

## Run and test

```powershell
uv sync
uv run uvicorn backend.main:app --reload
uv run pytest
uv run ruff check src tests migrations
uv run mypy src/backend
```

The health endpoint is available at `GET /health`.

## Authentication

The REST API supports registration and email/password login. Access tokens are
JWT Bearer tokens with a 15-minute default lifetime. Login and refresh issue
rotating, opaque refresh tokens in a Secure-as-configured, HttpOnly,
SameSite=Strict cookie scoped to `/auth`. Set `AUTH_ALLOWED_ORIGINS` to the
trusted front-end origin(s); login, refresh, and logout require a matching
`Origin` header.

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

Refresh tokens are stored only as hashes. Reuse of a rotated token revokes its
session. Password recovery and email verification are not implemented.

## Database configuration and migrations

Keep database credentials in the local `.env`. The async database connection
uses `asyncpg`, SSL, and disabled prepared-statement caching for Supabase
transaction pooling. Verify connectivity with:

```powershell
uv run pytest tests/integration/test_database_connection.py
```

Repository integration tests require an isolated PostgreSQL test database in
`TEST_DATABASE_URL`; they never use the application `.env` database:

```powershell
$env:TEST_DATABASE_URL = "postgresql+asyncpg://..."
uv run pytest tests/integration/test_user_repository.py
```

Create, inspect, apply, or roll back migrations with:

```powershell
uv run alembic revision --autogenerate -m "describe schema change"
uv run alembic current
uv run alembic heads
uv run alembic history
uv run alembic upgrade head
uv run alembic downgrade -1
```