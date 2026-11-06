# Relay Backend Technical Specification

## 1. Purpose and authority

This document is the implementation guide for AI coding assistants and developers working on the Relay backend. It defines backend structure, responsibilities, constraints, and verification expectations.

The [Root Product Specification](../spec.md) is authoritative for product behavior. This document may explain how backend responsibilities support that behavior, but it must not add or contradict product requirements. Where either specification marks a decision open, implementers must not guess: record the dependency, seek an approved decision, and keep the affected behavior isolated until it is resolved.

Use the roadmap in [the root development plan](../plan.md) for product-level sequencing. This document does not prescribe frontend or backend project plans, delivery dates, or deployment technologies.

## 2. Technology stack and architecture

### Confirmed stack

- Language: Python.
- Web framework: FastAPI.
- Relational database: PostgreSQL.
- Application capabilities: authentication and authorization, REST APIs, and WebSockets.
- Architecture: layered, with separate routes, services, repositories, schemas, models, and database responsibilities.
- Tests: pytest, organized into unit, integration, API, and WebSocket suites. Database integration tests must use a real PostgreSQL test database.

Do not introduce a different database, web framework, API transport, or test framework without an approved change to this specification.

### Architectural shape

The application has a thin transport layer, an application/service layer for use-case coordination and business rules, and a persistence layer for database access. Models represent persisted/domain data; schemas represent validated API input and output. Shared infrastructure such as configuration, security dependencies, and database lifecycle belongs in its designated shared modules.

The architecture must make these responsibilities visible in code. Routes must not implement product workflows, services must not issue database queries, and repositories must not own transport or product-policy decisions.

## 3. Project structure and file responsibilities

Create and maintain this backend layout:

```text
backend/
├── src/
│   └── backend/
│       ├── main.py
│       ├── core/
│       ├── model/
│       ├── routes/
│       │   └── v1/
│       ├── schemas/
│       ├── services/
│       ├── DB/
│       └── repository/
│
├── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── api/
│   └── websocket/
│
├── pyproject.toml
└── README.md
```

Responsibilities:

| Path | Responsibility |
|---|---|
| `src/backend/main.py` | Construct and configure the FastAPI application, register routes, manage application lifecycle, and expose the application object. Keep business behavior out of this module. |
| `src/backend/core/` | Shared settings/configuration, authentication and authorization dependencies, and security helpers. Keep feature-specific errors with their services and transport mappings with routes. |
| `src/backend/model/` | SQLAlchemy persistence models. Keep API request/response representations in `schemas/`. |
| `src/backend/routes/` | Versioned REST route handlers and future WebSocket transport handlers. Parse/validate transport input, establish caller context, invoke services, and translate service outcomes to HTTP responses. |
| `src/backend/schemas/` | Request, response, and WebSocket message data shapes, with boundary validation and serialization rules. Schemas must not perform database access or contain workflow logic. |
| `src/backend/services/` | Use-case orchestration and product business rules. Services call repositories through defined interfaces, coordinate operations, and raise or return explicit application outcomes. |
| `src/backend/DB/` | PostgreSQL engine, session lifecycle, declarative base, and shared database infrastructure. |
| `src/backend/repository/` | Persistence operations and queries. Repositories encapsulate database access and return data/results needed by services; they do not enforce route-specific behavior. |
| `migrations/` | Alembic-managed, ordered, reviewable database schema changes. |
| `tests/unit/` | Fast tests of isolated service/domain behavior using controlled dependencies; do not require a live PostgreSQL database unless the test is explicitly an integration test. |
| `tests/integration/` | Tests of repository/database behavior and cross-layer persistence using a real PostgreSQL test database. |
| `tests/api/` | Tests of REST request/response behavior, validation, authentication/authorization outcomes, and integration with application services. |
| `tests/websocket/` | Tests of WebSocket connection handling, message validation, authorization, and agreed delivery behavior. |
| `pyproject.toml` | Python project metadata, dependencies, and agreed tooling configuration. Keep dependency choices and version policies explicit and reviewable. |
| `README.md` | Backend setup, configuration, migration, test, and run instructions, once the related technical decisions are made. |

Add modules as needed within these directories, grouped by cohesive feature or concern. Preserve the required directory names and case, including `model/` and `DB/`. Keep user, authentication, and connection modules feature-specific within each layer; avoid duplicate workflows and oversized catch-all modules.

## 4. Layer responsibilities and dependency rules

### Routes and transport handlers

- Define transport boundaries for REST and WebSocket interactions.
- Use schemas to validate and serialize external data.
- Obtain the authenticated principal through shared authentication mechanisms.
- Perform only transport-level coordination and delegate product operations to services.
- Do not contain SQL, repository queries, or business workflows.
- Do not trust caller-supplied identity or ownership fields where identity must come from the authenticated principal.

### Services

- Implement product use cases and enforce business rules consistently, regardless of whether a use case was initiated through REST or WebSocket.
- Coordinate repository calls and relevant application-level checks.
- Enforce eligibility rules at the operation boundary, including accepted-connection requirements and blocking for messaging (FR-011, BR-003, BR-006).
- Preserve the specified behavior for profile ownership, request lifecycle, connection removal, message authorship, and private access (FR-004–FR-013; BR-001–BR-007).
- Do not issue SQL, use ORM query APIs, or otherwise perform database queries directly. Delegate persistence to repositories.
- Return explicit outcomes or raise documented application exceptions; do not silently substitute success or empty data for failed operations.

### Repositories

- Own PostgreSQL queries and persistence mapping.
- Provide focused operations required by services; avoid exposing transport concepts.
- Do not decide whether a user is allowed to perform a product action. Services enforce policy and use repository results as facts.
- Use parameterized query mechanisms provided by the selected database library; never build executable SQL by interpolating untrusted input.

### Models and schemas

- Models express persisted/domain concepts; schemas define external representations.
- Do not expose persistence models directly as public API contracts.
- Validate external values at the boundary and apply relevant domain invariants in the service/domain layer.
- Avoid duplicating business rules across route handlers, schemas, and repositories.

### Database infrastructure and migrations

- Database session/connection creation, configuration, and lifecycle belong in `src/backend/DB/`.
- Repositories receive database access through explicit dependencies rather than creating independent global connections.
- Schema changes must be represented by ordered migrations. Do not rely on application startup to silently mutate a production schema.
- A migration must be reviewed with its affected models, repositories, and tests. Migration tool, rollback policy, and production migration procedure remain open.

### Dependency direction

Allowed direction:

```text
Routes / WebSocket handlers -> Services -> Repositories -> DB infrastructure
                           -> Schemas
Services -> Models and repository interfaces
Repositories -> Models and DB infrastructure
Core shared dependencies -> consumed by application layers as needed
```

Lower layers must not import route handlers. Repositories must not import services. Services must not import transport handlers or issue database queries. Avoid circular imports; define shared types at the narrowest appropriate boundary.

## 5. Database and data management

### PostgreSQL responsibilities

PostgreSQL is the source of durable application data. The backend must persist enough information to support the root specification's user/profile, connection request and accepted/removed relationship, blocking, private conversation/message history, message status, and multiple-active-device requirements.

This is a set of product concepts, not a prescribed schema. Table design, key strategy, normalization, ORM/data-access library, PostgreSQL version, indexes, and retention policy are open decisions and must not be inferred from this list.

### Integrity and consistency

- Enforce data integrity for relationships and ownership, including message authorship and conversation participation.
- Protect private messages from access by unrelated users (NFR-002, NFR-007, NFR-010).
- Preserve chat history when a connection is removed (FR-009, BR-005).
- Ensure that message sending cannot bypass accepted-connection and blocking rules, including when state changes concurrently (FR-011, BR-003, BR-006).
- Coordinate multi-record operations so externally visible state does not represent a partially completed product action. Choose exact transaction boundaries with the data model and document them in implementation.
- Do not delete history as a side effect of connection removal or blocking. Whether users may view existing conversation history while a block is active remains unspecified (BR-006).
- Follow the approved edit/deletion behavior in BR-007. Do not invent message expiry or offline-delivery guarantees; those remain open under BR-008.

### Migrations and test data

- Keep database schema changes in migrations and review them for safe application to existing data.
- Tests must not depend on production data or use a production database.
- Integration tests that verify PostgreSQL behavior must connect to a real PostgreSQL test database, not an in-memory substitute or mocked repository.
- Test setup and teardown must isolate test data and leave the test database in a known state.
- The method for provisioning and resetting test PostgreSQL, migration execution policy, and test-data factories are open technical decisions.

## 6. Authentication and authorization

Authentication and authorization are required capabilities (FR-001; NFR-001, NFR-006–NFR-009, NFR-012). The REST authentication contract is approved below; the WebSocket handshake and product-specific authorization rules remain subject to the decisions noted in this specification.

### Required behavior

- Identify an authenticated principal for every operation requiring authentication.
- Deny protected operations when authentication is absent or invalid; never treat an unauthenticated caller as an authenticated user.
- Derive user identity from the authenticated principal for ownership-sensitive operations.
- Enforce authorization in the service/application boundary as well as at the transport boundary where appropriate; a route-level check alone must not permit alternate entry points to bypass a rule.
- Enforce profile-owner-only editing (FR-004, BR-002).
- Restrict private conversation access to participants (NFR-007).
- Enforce message authorship for editing and deletion (FR-012, FR-013, BR-007, NFR-012).
- Require an accepted connection and no applicable block before allowing new messages (FR-011, BR-003, BR-006, NFR-008).
- Apply blocking in both directions for messaging and profile visibility (FR-010, BR-006, NFR-009).
- Apply public profile visibility without requiring a connection for authenticated users, subject to blocking rules (FR-003, BR-001).

### Approved REST authentication contract

The following authentication contract is approved for the backend REST API:

- Register with a normalized email, username, display name, and password. Enforce unique email and username and hash passwords with Argon2.
- Authenticate with email and password. Return a signed JWT access token with the immutable user UUID in `sub`; use HS256, a required issuer/audience and token identifier, and a configurable 15-minute default lifetime.
- Create an independent server-side authentication session for every login. Generate cryptographically random opaque refresh tokens, store only their SHA-256 hashes, and use a configurable 30-day default lifetime.
- Put refresh tokens only in Secure-as-configured, HttpOnly, SameSite=Strict cookies scoped to `/auth`. Require an exact allowlisted `Origin` on login, refresh, and logout requests. Do not cache token responses.
- Rotate refresh tokens on use. Reuse of a rotated token revokes its owning session and its remaining refresh tokens. Logout revokes only the authenticated session.
- Validate the JWT and its associated active session before resolving the current user from PostgreSQL. Protected operations use that principal's user UUID, never an identity supplied by the request.
- Keep email verification and password-recovery workflows out of scope. Use environment configuration for secrets and never log or return passwords, token values, hashes, or signing secrets.

The JWT signing key must be configured outside source control and contain at least 32 bytes. The local browser origin defaults to `http://localhost:5173`; deployments must set their trusted origins explicitly.

## 7. REST API and WebSocket architecture

### REST APIs

- Organize REST routes by cohesive product capability, such as profiles/discovery, connections, and conversations/messages. Exact route paths, resource naming, API versioning, pagination, and response contracts are open.
- Keep each handler thin: validate input, establish caller context, call a service, and map the result to an HTTP response.
- Use request and response schemas; do not return database models directly.
- Ensure that every operation is authorized and that list/detail operations do not leak records outside the caller's access.
- Use explicit HTTP outcomes for success and failure. Exact status-code mapping and error response envelope are open and must be documented consistently before API implementation is treated as stable.

The REST surface must support the product capabilities in the root specification, including user discovery/profile access and owner editing, connection requests and decisions, connection removal and blocking, and authorized message operations. The precise API shape is not defined by this document.

### WebSockets

- WebSocket endpoint: `GET /ws` (WebSocket upgrade).
- Accept a new socket without credentials, then require a JSON `auth` event as the first frame. Its `access_token` is validated by the existing JWT and active-session service; user identity comes only from the verified token. Never put tokens in the URL or accept a client-supplied user ID.
- The authentication deadline is configured by the positive integer `WS_AUTH_TIMEOUT_SECONDS`, default `10`. Timeout, invalid credentials, revoked/expired sessions, and a non-auth first frame reject and close the connection.
- Client events are `auth`, `subscribe`, `unsubscribe`, `message.send`, `message.delivery_ack`, and `message.read_ack`. Subscribe/unsubscribe events contain `conversation_id`. Sending also requires a UUID `client_message_id` and non-empty `content`. Delivery acknowledgment contains `conversation_id` and `message_id`; read acknowledgment contains `conversation_id` and 1–100 `message_ids`. Unknown fields are rejected.
- Server events are `auth.ok`, `subscribed`, `unsubscribed`, `message.sent`, `message.received`, `message.status`, and `error`. Errors use `{ "type": "error", "code": "...", "detail": "..." }`. Authentication and protocol failures close the socket; message and permission failures return an error and keep it open.
- A conversation can be subscribed to only by a participant. Existing participants retain subscription/history access after connection removal or blocking; the existing message service still rejects new sends unless the connection is accepted and unblocked. Message sending persists and commits before any broadcast.
- `client_message_id` is unique per sender and conversation. Repeated sends with the same key return the original persisted message and do not rebroadcast it as a new incoming message. REST sends without a key retain their existing behavior.
- `sent` means persisted. A recipient-owned device acknowledgment advances the message globally to `delivered` or `read`; sender-device acknowledgments do not. Status changes are sent to subscribed participant devices, and subscription sends current status records for the conversation. No per-device status is stored.
- Each socket serializes its outbound events in FIFO order. There is no ordering guarantee across devices. Reconnects require fresh authentication and clients restore subscriptions by resubscribing, which revalidates participant access.
- Messages remain persisted while recipients are offline. The server does not buffer or replay missed message events; clients recover messages using the REST history API. Subscription status synchronization sends statuses, not message content/history.
- The connection manager is in-memory and supports multiple devices only within a single application process. Multi-instance coordination/brokering is not supported or selected.
- Keep WebSocket handlers focused on connection lifecycle and transport. Delegate message persistence, status transitions, connection eligibility, and participant authorization to existing services. Private events are limited to authenticated participants (NFR-002, NFR-007, NFR-010).

### Cross-transport consistency

REST and WebSocket entry points must invoke the same use-case rules. A user must not be able to bypass connection, block, ownership, or participant authorization by choosing a different transport.

## 8. Business logic and service responsibilities

Group services around product use cases rather than individual routes or database tables. The precise module names are not prescribed. At minimum, the service layer must provide clear ownership for:

- **Identity/profile use cases:** user discovery, public profile access, and owner-only profile updates (FR-002–FR-004; BR-001–BR-002).
- **Connection use cases:** request, accept, reject, retry after the approved cooldown, remove, and block (FR-005–FR-010; BR-004–BR-006).
- **Messaging use cases:** private message creation, authorized history access, author-only edit/delete, and supported message statuses (FR-011–FR-015; BR-003, BR-007, BR-009).
- **Delivery/device use cases:** offline delivery and multiple active devices (FR-014, FR-016; BR-008, BR-010).

These are responsibility groupings, not a requirement to create exactly four service classes.

Service operations must:

1. Receive explicit inputs and authenticated actor context.
2. Load required state through repositories.
3. Apply the relevant business rules.
4. Coordinate persistence and transaction boundaries.
5. Return explicit results for the route/transport layer to serialize.

The root specification marks the rejected-request cooldown duration, offline delivery guarantees, and per-device status aggregation as open. Services must not embed guessed values or behavior for these decisions. Message statuses are persisted only as Sent, Delivered, or Read; Sending is client-side transient. A recipient delivery acknowledgment advances Sent to Delivered, and a recipient read acknowledgment advances Sent or Delivered to Read, recording delivery if needed. Statuses do not regress and repeated acknowledgments are idempotent. The approved BR-007 edit/deletion behavior is defined in the root specification.

Connection records represent the current state for a canonical unordered user pair and are retained when a connection is removed. Directional block records are independent. Blocking cancels pending requests and marks an accepted connection removed while retaining any conversation/history data. Unblocking removes the block only; it does not restore the former connection. A new accepted request is required before messaging resumes. The retry cooldown has no default: rejected-request retries return an explicit configuration error until an approved `CONNECTION_REQUEST_COOLDOWN_SECONDS` value is configured.

## 9. Error handling, validation, and security

### Validation and errors

- Validate untrusted REST and WebSocket inputs at the transport boundary using schemas.
- Apply domain validation in services for rules that depend on current state, ownership, connection status, block status, or authorship.
- Reject invalid requests explicitly and consistently. Do not silently drop fields, return success-shaped fallbacks, or conceal internal failures as ordinary empty results.
- Centralize exception-to-transport mapping so REST and WebSocket behavior is predictable. Do not expose stack traces, SQL, internal paths, credentials, or other sensitive implementation details to clients.
- Log unexpected failures with safe diagnostic context and preserve the original error for operational diagnosis.
- Define exact error categories, HTTP status mapping, WebSocket error payloads, and public error wording as an API contract decision before implementation.

### Security practices

- Follow secure Python practices and the principle of least privilege.
- Treat all client-supplied values, identifiers, and event payloads as untrusted.
- Use parameterized database operations.
- Enforce authentication, ownership, conversation participation, connection eligibility, blocking, and message authorship on every relevant operation.
- Keep secrets out of source control, test fixtures, logs, and error responses.
- Do not expose private message content through profile, discovery, or unrelated conversation responses.
- Avoid logging message bodies, credentials, authentication tokens, or other private content.
- Use dependency versions that are explicitly declared and maintained in project configuration; update them through review rather than ad hoc environment changes.
- Transport encryption, credential hashing/session protection, rate limiting, abuse controls, CORS/origin policy, security headers, and secret-management mechanisms require approved technical decisions where not already established by the hosting environment.

## 10. Logging and configuration management

### Logging

- Configure shared application logging centrally through `src/backend/core/` if/when required; avoid scattered ad hoc prints.
- Emit useful diagnostic context for failures and lifecycle events without logging secrets, credentials, access tokens, or private message content.
- Keep logs useful for tracing an operation across route, service, and repository boundaries. Correlation identifiers and the logging format/transport are open technical decisions.
- Do not catch and suppress broad exceptions. Handle errors at a boundary only when the failure can be translated, enriched safely, or recovered from according to an approved rule.

### Configuration

- Keep configuration access centralized and typed; application modules should not read process environment directly throughout the codebase.
- Separate configuration by deployment/test context without embedding environment-specific values in source.
- Validate required settings when the application starts and report missing/invalid configuration explicitly without printing secret values.
- Do not commit credentials or secrets. The configuration source, secret manager, environment naming, and local development provisioning remain open decisions.

## 11. Testing strategy and coding standards

### Test organization and requirements

Use pytest and the required test layout:

- **Unit (`tests/unit/`):** Test service rules and domain behavior in isolation. Cover both permitted and denied outcomes, including authorization-sensitive logic.
- **Integration (`tests/integration/`):** Test repositories, persistence, transaction behavior, migrations where practical, and data integrity against a real PostgreSQL test database.
- **API (`tests/api/`):** Test REST validation, authentication, authorization, response behavior, and use-case integration.
- **WebSocket (`tests/websocket/`):** Test connection authentication, event validation, participant authorization, errors, and agreed real-time delivery behavior.

### Verification standards

- Map tests to relevant root specification IDs (FR, BR, NFR, and AC) so product behavior is traceable.
- Test positive and negative authorization cases, including cross-user profile edits, non-participant conversation access, message edits/deletions by non-authors, messaging without an accepted connection, and both directions of a block.
- Verify that removing a connection preserves history and prevents new messages.
- Verify offline delivery, statuses, and multiple active devices against approved decisions; do not encode assumptions for open behavior.
- Include regression tests when changing shared authorization, connection eligibility, or message behavior.
- Keep unit tests deterministic and independent of external services. Use the real PostgreSQL test database for database integration tests as required; do not substitute mocks or an in-memory database for those tests.
- Keep tests isolated, readable, and explicit about setup and expected outcomes.
- The exact lint, formatting, static typing, coverage, and CI tools/thresholds are open technical decisions; do not invent numeric quality gates.

### Python Coding Conventions

- Follow PEP 8 and standard Python naming conventions.
- Add type hints to public functions and important service/repository boundaries.
- Keep modules and functions small, cohesive, and easy to understand.
- Use `async` for I/O operations supported by asynchronous libraries; never block the event loop with synchronous I/O.
- Use regular `def` for CPU-bound and purely synchronous logic. Handle blocking libraries without blocking asynchronous request processing.
- Use explicit exceptions and clear return contracts.
- Avoid global mutable state, unnecessary abstractions, duplicated logic, and broad `except` blocks.
- Keep comments minimal and meaningful.
- Do not introduce unapproved dependencies or make unresolved technology choices without approval.

## 12. Open technical decisions

The following decisions must be recorded before implementing the affected contracts. The root product decisions remain authoritative; technical decisions cannot resolve product questions by assumption.

| Decision | Affected areas | Dependency / note |
|---|---|---|
| Python version and dependency/version policy | `pyproject.toml`, CI, runtime | Select a supported version and reproducible dependency-management approach. |
| PostgreSQL version, ORM or query library, and driver (including async support) | Models, repositories, DB lifecycle, migrations, tests | Must support the required PostgreSQL integration testing and appropriate async I/O. |
| Migration tool and migration/rollback procedure | `migrations/`, release process | Must support reviewable, ordered schema changes. |
| Authorization representation and reusable policy/dependency conventions | Core, services, routes | Must enforce root ownership, participant, connection, and block rules. |
| API route paths, versioning, pagination, status codes, and error response contract | REST routes and schemas | Define before clients rely on API contracts. |
| WebSocket authentication handshake, event names/payloads, acknowledgements, errors, reconnection, ordering, and delivery model | WebSocket routes, schemas, services | Must remain consistent with root decisions for delivery and statuses. |
| Multi-instance WebSocket coordination or messaging infrastructure | WebSocket runtime and offline delivery | No broker or coordination technology is selected by this specification. |
| Data model details, transaction boundaries, key strategy, indexing, and retention | Models, repositories, migrations | Preserve privacy, ownership, accepted-connection rules, and removed-connection history. |
| Root product decisions: cooldown duration; edit/delete visibility; offline expiry/retry and guarantees; status semantics; cross-device synchronization | Services, APIs, persistence, tests | See the open decisions in Section 12 of the root specification. |
| Configuration and secret source; logging format/transport and correlation identifiers | Core, operations | Must not expose secrets or private message content. |
| Test PostgreSQL provisioning/reset strategy; fixtures and migration use | Integration tests, developer setup, CI | Integration tests must use real PostgreSQL. |
| Lint, formatting, typing, coverage, and CI tools and thresholds | `pyproject.toml`, CI | Select explicitly; no thresholds are implied here. |
| Hosting, deployment, health checks, and operational procedures | Application lifecycle and release | Not selected by the product specification or this backend guide. |

## Implementation checklist

Before considering a backend feature complete:

1. Confirm its behavior against the root specification and any approved decisions.
2. Keep transport, business logic, persistence, and data contracts in their designated layers.
3. Enforce authorization in a way that cannot be bypassed through another route or transport.
4. Add or update tests in the appropriate pytest suite, using real PostgreSQL for database integration tests.
5. Add migrations for schema changes and update backend setup documentation when required.
6. Verify that errors are explicit, logs contain no secrets/private content, and no open decision has been silently assumed.
