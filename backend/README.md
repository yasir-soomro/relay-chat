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

```powershell
uv sync
uv run uvicorn backend.main:app --reload
```

The health endpoint is `GET /health`. Run tests and quality checks with:

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
header.

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

Only refresh-token hashes are stored. Reuse of a rotated token revokes its
session. Password recovery and email verification are not implemented.

## Connections and blocking

Authenticated users can send, accept, reject, and remove connection requests;
list incoming/outgoing requests and accepted connections; and block/unblock
users. A block cancels pending requests, terminates an accepted connection,
and hides profiles in both directions. Unblocking restores profile visibility
but does not reinstate connection status; a new request must be accepted before
the users can connect again. Connection rows are retained when removed, and
blocking does not delete chat history.

The rejected-request cooldown duration is unresolved. Do not configure
`CONNECTION_REQUEST_COOLDOWN_SECONDS` until a duration is approved. While it is
unset, first-time requests work, but retrying a rejected request returns an
explicit service-unavailable response.

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
conversation by ID. Conversation responses contain only the conversation ID,
participant IDs, and creation time. Existing conversation records remain
available to their participants after a connection is removed or a user is
blocked; those states do not permit creating a new conversation.

```text
POST /conversations
GET  /conversations
GET  /conversations/{conversation_id}
```

The conversation module does not implement message delivery.

## Messages

Authenticated participants can send messages to a conversation, retrieve
conversation history with a cursor and page size, retrieve individual messages,
edit their own messages, and soft-delete their own messages. Message contents
are persisted for later retrieval when a recipient is offline; no expiry or
delivery guarantee is defined. New messages require an accepted connection
and no block. A successfully persisted message has status `sent`; recipient
device delivery and read acknowledgments advance it monotonically to
`delivered` and `read`. A read acknowledgment also records delivery if needed.
Acknowledgments are idempotent. `sending` is client-side only. Per-device
status aggregation remains undefined. Edits replace current content without
retaining prior versions. Deletion retains the record and returns a visible
tombstone with no content.

```text
POST   /conversations/{conversation_id}/messages
GET    /conversations/{conversation_id}/messages?limit=50&cursor=...
GET    /messages/{message_id}
PATCH  /messages/{message_id}
DELETE /messages/{message_id}
POST   /messages/{message_id}/delivery
POST   /messages/{message_id}/read
POST   /conversations/{conversation_id}/messages/read
```

History pages are ordered newest first; `next_cursor` is opaque and can be
passed to retrieve the next page. Batch read acknowledgments accept up to 100
message IDs in one conversation.

## WebSocket messaging

Clients connect to `/ws`, then send an `auth` event containing an access token
as their first frame. The default positive authentication deadline is 10
seconds; configure it with `WS_AUTH_TIMEOUT_SECONDS`. Every reconnect requires
fresh authentication and clients resubscribe to conversations.

Supported events are `subscribe`, `unsubscribe`, `message.send`,
`message.delivery_ack`, and `message.read_ack`. Each send requires a
`client_message_id` UUID; retries with the same sender, conversation, and key
return the original message without a duplicate incoming event. WebSocket
sends use the same connection/block checks and persistence service as REST.
Recipient acknowledgments advance global message status, which is synchronized
to connected devices subscribed to that conversation.

Messages sent while a recipient is offline remain available through REST
history; missed WebSocket messages are not buffered or replayed. Subscribing
sends the current status records, not message history. Connection management is
in-memory and supports devices connected to one application process only;
multi-instance WebSocket coordination is not implemented.

## Database and migrations

Database credentials belong in the local `.env`. The async PostgreSQL engine
uses `asyncpg`, SSL, and disabled prepared-statement caching for Supabase
transaction pooling. Verify configured database connectivity with:

```powershell
uv run pytest tests/integration/test_database_connection.py
```

Repository integration tests require an isolated PostgreSQL test database in
`TEST_DATABASE_URL`; they never use the application `.env` database:

```powershell
$env:TEST_DATABASE_URL = "postgresql+asyncpg://..."
uv run pytest tests/integration
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
