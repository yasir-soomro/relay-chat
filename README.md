# Relay

Relay is a private one-to-one messaging application. Its backend uses FastAPI,
asynchronous SQLAlchemy, PostgreSQL, and WebSockets. Backend source, tests,
migrations, setup, API, and deployment documentation live in
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

## Frontend specifications

The frontend is a Next.js App Router application using TypeScript and Tailwind
CSS. It includes public pages, authenticated account and connection workflows,
theme-aware responsive layouts, and one-to-one messaging through the existing
REST and WebSocket APIs. Messaging history is recovered through paginated REST
requests after reconnect; the server does not replay missed WebSocket events.
Frontend requirements and implementation sequencing are documented separately:

- [Frontend Technical Specification](./docs/sdd/frontend/spec.md) — scope,
  architecture, routes, API boundaries, UX, accessibility, and open decisions.
- [Frontend Implementation Roadmap](./docs/sdd/frontend/plan.md) — phases,
  dependencies, milestones, and verification criteria.

The [Root Product Specification](./docs/sdd/spec.md) and
[Backend Technical Specification](./docs/sdd/backend/spec.md) remain the
authoritative product and backend references.

## Run the frontend

Requirements: Node.js 20.9+ and npm. Configure `RELAY_API_ORIGIN` in
`frontend/.env.local` when the backend is not at its default local address.
The backend must allow the frontend origin through `AUTH_ALLOWED_ORIGINS`.
See the [frontend README](./frontend/README.md) for authentication, theme, and
development details.

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`.

## Production readiness

Deployment remains an operator-controlled step. Before deploying, configure a
production PostgreSQL database, apply reviewed migrations, set strong secrets
and allowed origins, and verify the hosting platform's health checks, logs,
backups, restore process, and rollback procedure. Never use a production
database for integration tests; `TEST_DATABASE_URL` must point to a dedicated,
isolated test database.

The current automated checks do not include Playwright browser tests. Add and
run browser coverage for authentication, messaging, and responsive layouts
before treating browser behavior as verified. Security dependency auditing
requires access to the package advisory service.

## Verification

Run the frontend checks from `frontend/`:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Run the backend checks from `backend/`:

```powershell
uv run pytest
uv run ruff check .
uv run mypy src
uv run bandit -q -r src
uv run pip-audit --skip-editable
```

Repository integration tests require an isolated PostgreSQL database set in
`TEST_DATABASE_URL`; see the [backend README](./backend/README.md). Recent
local verification passed backend unit/API/WebSocket tests (132 passed); 17
database integration tests were skipped because no isolated test database was
configured. Frontend lint, TypeScript, production build, and targeted messaging
tests passed. The full frontend suite found a mobile-navigation focus test
assumption that has since been corrected; rerun the full suite before release.
Backend mypy passed. Ruff formatting reports two existing formatting issues in
tests, and the dependency audit could not reach PyPI in the restricted network
environment. These results are diagnostic and are not a release sign-off.
