# Relay backend

The backend is a Python 3.14+ application using FastAPI, SQLAlchemy's async
API, PostgreSQL, Alembic, and `uv`. Run commands from `backend/`.

## Architecture

Application code is in `src/backend/`, grouped by responsibility:

```text
src/backend/
├── main.py
├── core/          # settings, authentication dependencies, security
├── model/         # SQLAlchemy models
├── routes/v1/     # versioned HTTP endpoints
├── schemas/       # API validation and response models
├── services/      # use cases and business rules
├── repository/    # SQL queries and persistence
└── DB/            # engine, session and declarative base
```

Routes delegate workflows to services. Services use repositories for
persistence; repositories own SQLAlchemy queries. Migrations and tests are
kept in `migrations/` and `tests/`.

## Configure, run, and verify

Copy `.env.example` to `.env` and set local PostgreSQL connection values. Set
`AUTH_JWT_SECRET` to a random secret of at least 32 bytes; never commit `.env`.
Configure `AUTH_ALLOWED_ORIGINS` as a comma-separated list of trusted browser
origins. `APP_ENV=production` enables Secure refresh-token cookies.

| Variable | Required | Default / notes |
|---|---:|---|
| `DB_USER` | Yes | PostgreSQL user |
| `DB_PASSWORD` | Yes | Secret setting; never log or commit it |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | Yes | Integer from 1 to 65535 |
| `DB_NAME` | Yes | PostgreSQL database |
| `DB_SSL` | No | `require`; production also accepts `verify-ca` and `verify-full` |
| `AUTH_JWT_SECRET` | Auth required | At least 32 bytes; generate a random value |
| `AUTH_ACCESS_TOKEN_EXPIRE_MINUTES` | No | `15`, positive integer |
| `AUTH_REFRESH_TOKEN_EXPIRE_DAYS` | No | `30`, positive integer |
| `WS_AUTH_TIMEOUT_SECONDS` | No | `10`, positive integer |
| `APP_ENV` | No | `development`; use `production` for deployments |
| `AUTH_ALLOWED_ORIGINS` | No | `http://localhost:5173`; comma-separated origins |
| `CONNECTION_REQUEST_COOLDOWN_HOURS` | No | `168`, positive integer |

Settings are read from the process environment and `backend/.env`; environment
variables override the file. Production startup requires nonempty database
identity fields/password, a sufficiently long JWT secret, encrypted DB
transport, and explicit HTTPS browser origins without paths or localhost.

```powershell
uv sync
uv run uvicorn backend.main:app --reload
```

`GET /health` is a liveness check and retains its existing response contract.
Use `GET /health/ready` as the deployment readiness probe; it executes a
database check and returns `503` without connection details when PostgreSQL is
unavailable. The application validates configuration at startup, emits
structured JSON logs, and disposes its SQLAlchemy engine during graceful
shutdown.

Rejected connection requests can be retried by the original requester after
the configured cooldown. Attempts before expiry return HTTP `409` with
`detail.code` set to `connection_request_cooldown_active` and `detail.retry_at`
containing the UTC retry timestamp.

## Production deployment

Set environment variables through the deployment platform's secret/config
store; do not bake credentials into images or commit `.env`. At minimum,
configure `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_SSL=require` (or a verifying SSL mode), a random `AUTH_JWT_SECRET` of at
least 32 bytes, `APP_ENV=production`, and explicit `AUTH_ALLOWED_ORIGINS`
values using HTTPS origins. Production startup rejects placeholder-strength
JWT secrets, empty database passwords, SSL modes that permit plaintext, and
wildcard, localhost, or non-HTTPS browser origins. `APP_ENV=production`
enables Secure refresh-token cookies.

Apply and verify Alembic migrations as a separate deployment step before
serving traffic. Route readiness checks through `/health/ready`, while
orchestrators can use `/health` for liveness. WebSocket connections are held
in process memory: run one application process/instance unless coordinated
multi-instance support is separately approved and implemented.

`AUTH_ALLOWED_ORIGINS` is enforced on login, refresh, and logout endpoints.
General browser CORS policy and application rate limits/abuse controls are
not configured: their policies remain open in the Backend Specification.
Until approved, deploy behind a same-origin frontend/reverse proxy and apply
any perimeter controls at the hosting layer without treating them as
application-level guarantees. The app does not set a maximum HTTP message-body
size; configure an appropriate limit at the trusted ingress.

Run tests and quality checks with:

```powershell
uv run pytest
uv run ruff check src tests migrations
uv run ruff format --check src tests migrations
uv run mypy src/backend tests
uv run bandit -r src/backend
uv run pip-audit
```

## Authentication

The REST API supports registration and email/password login. Access tokens
expire after 15 minutes by default. Login and refresh issue rotating opaque
refresh tokens in a Secure-as-configured, HttpOnly, SameSite=Strict cookie
scoped to `/auth`. Login, refresh, and logout require a matching `Origin`
header. REST APIs derive the acting user from the verified bearer token;
request schemas reject unknown fields, and validation responses omit submitted
input values.

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

Only refresh-token hashes are stored. Reuse of a rotated token revokes its
session. Password recovery and email verification are not implemented.

## Users and profiles

The authenticated account endpoints return account fields only to the owner.
Public profile responses omit email and credentials; either-direction blocks
hide a profile. Profile updates are owner-only.

```text
GET   /users/me
PATCH /users/me
GET   /users/{user_id}
```

## Connections and blocking

Authenticated users can send, accept, reject, and remove connection requests;
list incoming/outgoing requests and accepted connections; and block/unblock
users. A block cancels pending requests, terminates an accepted connection,
and hides profiles in both directions. Unblocking restores profile visibility
but does not reinstate connection status; a new request must be accepted before
the users can connect again. Connection rows are retained when removed, and
blocking does not delete chat history.

The original requester can retry a rejected request after
`CONNECTION_REQUEST_COOLDOWN_HOURS` (default `168`) has elapsed since its UTC
rejection timestamp. Configure a positive integer to change the duration.
Attempts before expiry return HTTP `409` with
`detail.code=connection_request_cooldown_active` and the UTC availability time
in `detail.retry_at`.

```text
POST   /connections/requests
GET    /connections/requests/incoming
GET    /connections/requests/outgoing
POST   /connections/requests/{connection_id}/accept
POST   /connections/requests/{connection_id}/reject
DELETE /connections/{other_user_id}
POST   /connections/{other_user_id}/block
DELETE /connections/{other_user_id}/block
GET    /connections
```

## Conversations

Authenticated users can create or retrieve a one-to-one conversation with an
accepted, unblocked connection, list their conversations, and retrieve a
conversation by ID. Create/detail responses contain only the conversation ID,
participant IDs, and creation time. Existing conversation records remain
available to their participants after a connection is removed or a user is
blocked; those states do not permit creating a new conversation.

```text
POST /conversations
GET  /conversations
GET  /conversations/{conversation_id}
```

Conversation-list items include database-backed `unread_count` values.
`GET /api/v1/notifications/unread-count` returns the authenticated user's total
unread incoming-message count. Messages in Sent or Delivered state count;
messages in Read state do not. The endpoint and conversation list aggregate
counts in PostgreSQL without loading message histories.

The conversation module does not implement message delivery.

## Messages

Authenticated participants can send messages to a conversation, retrieve
conversation history with a cursor and page size, retrieve individual messages,
edit their own messages, and soft-delete their own messages. Message contents
are persisted for later retrieval when a recipient is offline. On reconnect,
clients recover history through the paginated REST endpoint; the server does
not replay missed WebSocket events. Expiry and retry limits are undefined.
New messages require an accepted connection and no block. A successfully
persisted message has status `sent`; acknowledgment by any recipient device
advances the global status monotonically to `delivered`, and a recipient read
acknowledgment advances it to `read`. A read acknowledgment also records
delivery if needed. Status changes synchronize to connected recipient devices.
Acknowledgments are idempotent. `sending` is client-side only. Edits replace
current content without retaining prior versions. Deletion retains the record
and returns a visible tombstone with no content.

```text
POST   /conversations/{conversation_id}/messages
GET    /conversations/{conversation_id}/messages?limit=50&cursor=...
GET    /messages/{message_id}
PATCH  /messages/{message_id}
DELETE /messages/{message_id}
POST   /messages/{message_id}/delivery
POST   /messages/{message_id}/read
POST   /conversations/{conversation_id}/messages/delivery
POST   /conversations/{conversation_id}/messages/read
```

History pages are ordered newest first by `(created_at, id)`; `next_cursor` is
opaque and can be passed to retrieve the next page. Clients should fetch until
`next_cursor` is null and merge recovered records by message ID to deduplicate
overlapping recovery scans. Batch read and delivery acknowledgments accept up
to 100 message IDs in one conversation.

Only conversation participants can retrieve history or individual messages.
Only the sender can edit or soft-delete a message. Only the recipient can
acknowledge delivery or reading; the sender's device cannot advance its own
message status. A batch acknowledgment is validated atomically.

## WebSocket messaging

Clients connect to `/ws`, then send an `auth` event containing an access token
as their first frame. The default positive authentication deadline is 10
seconds; configure it with `WS_AUTH_TIMEOUT_SECONDS`. Every reconnect requires
fresh authentication and clients resubscribe to conversations.

Supported events are `subscribe`, `unsubscribe`, `message.send`,
`message.delivery_ack`, `message.delivery_ack_batch`, and `message.read_ack`.
Batch delivery and read acknowledgments accept up to 100 unique message IDs.
Every inbound event rejects unknown fields. `auth` is accepted only as the
first frame; reconnecting requires authentication and subscription restoration.
Each send requires a
`client_message_id` UUID; retries with the same sender, conversation, and key
return the original message without a duplicate incoming event. WebSocket
sends use the same connection/block checks and persistence service as REST.
Recipient acknowledgments advance global message status, which is synchronized
to connected devices subscribed to that conversation.

Messages sent while a recipient is offline remain available through REST
history at `GET /conversations/{conversation_id}/messages`. After reconnecting,
clients should fetch pages until `next_cursor` is null and merge messages by
their stable message `id`; pages are newest-first and ordered by
`(created_at, id)`. This makes overlapping recovery scans safe to deduplicate.
Missed WebSocket messages are not buffered or replayed. Subscribing sends the
current status records, not message history. Connection management is in-memory
and supports devices connected to one application process only; multi-instance
WebSocket coordination is not implemented.

## Database and migrations

Database credentials belong in the local `.env`. The async PostgreSQL engine
uses `asyncpg`, SSL, disabled prepared-statement caching, and a bounded pool
with connection pre-ping for Supabase transaction pooling. The default pool
allows five persistent connections and five temporary overflow connections
per application worker. Verify test database connectivity with:

```powershell
uv run pytest tests/integration/test_database_connection.py
```

Repository integration tests require a dedicated PostgreSQL database on a
loopback address. The test fixture rejects non-PostgreSQL URLs, remote hosts,
and any role/database other than `relay_test`. It never uses the application
`.env` connection. Create the role and an initially empty database on a local
PostgreSQL server using a local administrator account; do not use development
or production credentials or point this URL at a shared database.

For a disposable local Windows cluster, create a new dedicated data directory
(stop if it already exists), initialize PostgreSQL, bind it only to loopback,
and create the test database:

```powershell
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$dataRoot = Join-Path $env:LOCALAPPDATA "RelayChat\postgres-test"
if (Test-Path $dataRoot) { throw "Refusing to reuse an existing data directory." }
New-Item -ItemType Directory -Path $dataRoot | Out-Null
& "$pgBin\initdb.exe" -D "$dataRoot\data" -U relay_test --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C --no-instructions
& "$pgBin\pg_ctl.exe" -D "$dataRoot\data" -l "$dataRoot\postgresql.log" -o "-h 127.0.0.1 -p 55432 -c listen_addresses=127.0.0.1 -c ssl=off" start
& "$pgBin\createdb.exe" -h 127.0.0.1 -p 55432 -U relay_test -O relay_test relay_test
```

Trust authentication is only for this disposable, loopback-bound test
instance; never bind it to a public interface. Set the test connection URL:

```powershell
$env:TEST_DATABASE_URL = "postgresql+asyncpg://relay_test@127.0.0.1:55432/relay_test"
$env:TEST_DB_SSL = "disable"
```

If using a separately secured local server instead, use a unique test-only
password and URL-encode it in `TEST_DATABASE_URL`. Never copy credentials
from `backend/.env`.

The Alembic CLI reads the standard `DB_*` settings. Set all database values
explicitly to the same test-only target before invoking it, so it cannot fall
back to `backend/.env`:

```powershell
$env:DB_USER = "relay_test"
$env:DB_PASSWORD = "not-used-with-local-trust-auth"
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "55432"
$env:DB_NAME = "relay_test"
$env:DB_SSL = "disable"
uv run alembic upgrade head
uv run alembic current
```

The integration session fixture encloses each test in an outer transaction
and rolls it back after the test, including when repository code commits
through a savepoint. Verify the migration head and run the complete
integration suite with:

```powershell
uv run pytest tests/integration
```

The PostgreSQL-backed end-to-end acceptance workflows exercise authentication,
discovery and blocking, connection cooldown/removal, conversations, message
ownership and status transitions, WebSocket multi-device delivery, and offline
history recovery through the real application routes and services:

```powershell
uv run pytest tests/integration/test_acceptance_workflows.py
```

Run the full backend suite with the same test database environment:

```powershell
uv run pytest
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
