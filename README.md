# Relay

Relay is a private one-to-one messaging backend. The backend is built with
FastAPI, asynchronous SQLAlchemy, PostgreSQL, and WebSockets. The backend
source, tests, migrations, setup, API, and deployment documentation live in
[`backend/`](./backend/).

## Backend quick start

Requirements: Python 3.14+ and [uv](https://docs.astral.sh/uv/).

```powershell
cd backend
uv sync
Copy-Item .env.example .env
```

Set the local PostgreSQL connection values in `backend/.env`, then run:

```powershell
uv run alembic upgrade head
uv run uvicorn backend.main:app --reload
```

The app is available at `http://127.0.0.1:8000`; OpenAPI documentation is at
`/docs`. Configure a random `AUTH_JWT_SECRET` of at least 32 bytes. Keep `.env`
private and never commit real credentials.

## Backend modules

- **Authentication and users:** account registration, login, rotating refresh
  tokens, session logout, and protected profile operations.
- **Connections:** request/accept/reject/remove connections, blocking, and
  unblocking.
- **Conversations:** private one-to-one conversations for accepted,
  unblocked connections.
- **Messages:** persistent message history, cursor pagination, author-only
  edit and soft-delete, and recipient delivery/read acknowledgments.
- **WebSockets:** authenticated, participant-scoped real-time messaging with
  multiple devices supported within one application process.
- **Offline recovery:** messages remain persisted while a recipient is
  offline; clients recover them through paginated REST history after
  reconnecting. The server does not replay missed WebSocket messages.

The backend README contains configuration, API routes, authorization behavior,
test commands, migration procedures, production requirements, and known
limitations.

## Verification

From `backend/`:

```powershell
uv run pytest --cov=backend --cov-report=term-missing:skip-covered
uv run ruff check src tests migrations
uv run ruff format --check src tests migrations
uv run mypy src/backend
uv run bandit -q -r src/backend
uv run pip-audit --skip-editable
```

Repository integration tests require an isolated PostgreSQL database set in
`TEST_DATABASE_URL`; see the [backend README](./backend/README.md).
