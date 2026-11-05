# Relay

Relay is a chat application. The backend is a FastAPI service using asynchronous
SQLAlchemy and PostgreSQL; its source, migrations, tests, and setup instructions
are in [`backend/`](./backend/).

## Backend quick start

Requirements: Python 3.14+ and [uv](https://docs.astral.sh/uv/).

```powershell
cd backend
uv sync
Copy-Item .env.example .env
```

Set the local database values in `backend/.env`, and replace
`AUTH_JWT_SECRET` with a random value of at least 32 bytes. Keep `.env`
private; do not commit real credentials.

Start the API and run checks from `backend/`:

```powershell
uv run uvicorn backend.main:app --reload
uv run pytest
uv run ruff check src tests migrations
uv run mypy src/backend
```

The health endpoint is `GET /health`. Authentication endpoints and database
migration instructions are documented in the [backend README](./backend/README.md).
