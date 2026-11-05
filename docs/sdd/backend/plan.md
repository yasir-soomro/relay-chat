# Relay Backend Implementation Roadmap

## Purpose and authority

This roadmap sequences backend implementation work. Follow the [Root Product Specification](../spec.md) for product behavior and the [Backend Technical Specification](./spec.md) for the approved stack, project structure, layer boundaries, and testing requirements. The [root development plan](../plan.md) provides overall V1 sequencing.

The roadmap does not select unapproved technologies, define API contracts, or duplicate the specifications. Treat unresolved choices in those documents as explicit decision gates: proceed with independent work, but do not implement or accept dependent behavior until its decision is approved.

## Phases and implementation sequence

### Phase 0 — Resolve prerequisites and prepare the workspace

1. Establish the required backend directory structure and confirm responsibility boundaries before adding feature code.
2. Record decisions needed to create a reproducible Python project and test workflow, including Python/dependency policy, database access and migration tooling, and test PostgreSQL provisioning.
3. Identify the product decisions that affect upcoming work. Resolve authentication/account lifecycle before production authentication; profile fields and visibility before finalizing profiles; and connection cooldown semantics before retry behavior is accepted.
4. Define how work and tests will trace to root FR, BR, NFR, and AC identifiers.

**Verification throughout:** Review the proposed structure against the Backend Specification. Confirm that choices are recorded rather than silently assumed.

**Milestone B0 — Foundation ready:** Project and test setup decisions required for initial development are approved, and open items have clear owners or gates.

### Phase 1 — Project and architecture foundation

1. Establish `pyproject.toml`, the FastAPI application entry point, and the required directories.
2. Set up the shared core for typed configuration, application startup, explicit error handling, and safe logging according to approved project choices.
3. Establish dependency injection boundaries for routes, services, repositories, and database infrastructure. Keep route handlers thin and prevent database access in services.
4. Add the initial pytest layout and a minimal test path for unit, API, and WebSocket suites. Prepare the real-PostgreSQL integration-test path once its provisioning method is approved.
5. Document agreed setup and test commands in the backend README as implementation setup requires.

**Dependencies:** B0 decisions needed for project configuration and test execution.

**Verification throughout:** Run available unit/API checks; verify imports and dependency direction; check that startup/configuration failures are explicit and do not disclose secrets.

**Milestone B1 — Application foundation:** The application can be constructed and tested with the required layered structure and no feature-specific business logic in routes or startup code.

### Phase 2 — PostgreSQL persistence and authentication

1. Confirm PostgreSQL version, database access library/driver, model approach, migration tool, transaction conventions, and test-database setup before implementing persistence.
2. Implement database lifecycle and repository foundations in the required locations.
3. Create and test ordered migrations for the data needed by the first user and profile workflows.
4. Resolve the authentication protocol and credential/session lifecycle before implementing production authentication.
5. Implement authenticated-principal handling and authorization dependencies. Derive actor identity from the authenticated principal rather than caller-supplied ownership fields.

**Dependencies:** B1; approved persistence and migration choices; approved authentication decisions. Work on unrelated application scaffolding need not wait for authentication decisions.

**Verification throughout:** Unit-test authentication/authorization rules; run repository and migration integration tests against a real PostgreSQL test database; verify unauthenticated and invalid-authentication behavior.

**Milestone B2 — Persistence and identity foundation:** Database migrations and repositories work against PostgreSQL, and protected backend operations can identify an authenticated principal under the approved authentication contract.

### Phase 3 — Profiles, discovery, and connection lifecycle

1. Implement profile and discovery services and their repositories, applying public visibility and owner-only editing rules (FR-002–FR-004; BR-001–BR-002).
2. Implement connection request, acceptance, and rejection use cases (FR-005–FR-007).
3. Resolve the rejected-request cooldown duration and measurement before implementing and accepting retry behavior (FR-008; BR-004).
4. Implement connection removal so history is preserved and new messages are prevented (FR-009; BR-005).
5. Implement blocking so messaging is prevented in both directions and profiles are hidden from each other (FR-010; BR-006). Resolve effects on pending requests, connection state, and existing conversation/history access before implementing those effects.
6. Expose the approved profile and connection operations through REST routes and schemas. Confirm route, response, error, and pagination conventions before making the API contract stable.

**Dependencies:** B2 for authenticated identity and persistence. Retry depends on the cooldown decision. Block side effects depend on the corresponding BR-006 decisions. Messaging will depend on connection state and block enforcement.

**Verification throughout:** Cover allowed and denied ownership/profile access, request decisions, retry boundaries, removal, history preservation, and both directions of blocking. Run unit tests, real-PostgreSQL integration tests, and API tests for each completed behavior.

**Milestone B3 — User and connection capabilities:** Approved profile and connection workflows are available through services and REST, with their product rules verified.

### Phase 4 — Connected messaging and message operations

1. Implement private message and conversation persistence, ensuring messages are associated with their intended participants.
2. Implement message creation and authorized history access for accepted connections only (FR-011; BR-003).
3. Enforce eligibility at the service/use-case boundary, including the absence of a blocking rule. Ensure removal and block state changes cannot be bypassed by messaging.
4. Implement author-only edit and delete operations (FR-012–FR-013; BR-007) after the recipient-visible and history/audit behavior is decided.
5. Implement the supported statuses Sending, Sent, Delivered, and Read (FR-015) after event definitions and transition rules, including multi-device aggregation, are approved.
6. Expose approved message operations through REST using the shared service rules.

**Dependencies:** B3 and the participant privacy/data model from B2. Edit/delete behavior depends on BR-007 decisions. Status behavior depends on BR-009. Stable REST contracts depend on approved API conventions.

**Verification throughout:** Test participants-only access, non-connection and blocked send denial, removed-connection denial, author-only edit/delete, and approved status transitions. Run unit, PostgreSQL integration, and API tests; add regression tests for shared authorization rules.

**Milestone B4 — Connected messaging:** Authorized connected users can use the approved message operations and statuses, with privacy and denial cases passing.

### Phase 5 — WebSocket real-time transport

1. Approve WebSocket authentication, event names and payloads, acknowledgement/error behavior, ordering, and reconnection expectations before stabilizing the event contract.
2. Add WebSocket transport handlers and schemas that authenticate users, validate inbound events, and delegate all product operations to the same services used by REST.
3. Authorize every event against the authenticated user and conversation; never use possession of an identifier as permission.
4. Verify that private events reach only authorized conversation participants.

**Dependencies:** B2 authenticated identity and B4 messaging services. Delivery, acknowledgement, and ordering semantics depend on approved technical/product decisions.

**Verification throughout:** Use WebSocket tests for authentication, validation, access denial, event handling, and privacy boundaries. Re-run relevant service and REST checks to verify cross-transport consistency.

**Milestone B5 — Real-time transport:** WebSocket interactions use the shared business rules and pass their agreed authorization and event-contract tests.

### Phase 6 — Offline delivery and multiple active devices

1. Resolve the offline-delivery guarantees, expiry/retry policy, and meaning of delivery events (BR-008).
2. Resolve how message statuses transition and aggregate across recipient devices (BR-009).
3. Resolve cross-device session, message-state, edit/delete, connection-state, and sign-out behavior (BR-010).
4. Select any required coordination mechanism only after the WebSocket deployment shape and scale needs are agreed; do not assume a broker or other infrastructure in advance.
5. Implement delivery and device behavior using the approved decisions, reusing message services and enforcing the same authorization rules.

**Dependencies:** B4 messaging and B5 real-time transport; explicit decisions in BR-008–BR-010; approved coordination choices where implementation requires them.

**Verification throughout:** Test messages sent while recipients are offline, agreed status behavior, multiple active devices, and cross-device changes. Use real-PostgreSQL integration tests for persistence behavior and WebSocket tests for delivery and authorization.

**Milestone B6 — Delivery and devices:** Offline delivery and multiple active-device behavior meet their approved acceptance checks.

### Phase 7 — Security, integration, and production readiness

1. Run the complete backend acceptance suite against root specification criteria relevant to backend behavior.
2. Perform an integrated review of authentication, ownership, participant privacy, connection eligibility, blocking, message authorship, and secrets/logging safeguards.
3. Resolve or explicitly exclude from V1 any open product or technical decision that affects release behavior. Do not mark an affected requirement complete while it remains undefined.
4. Verify the migration process, configuration validation, error handling, and operational instructions against the hosting and deployment decisions that have been approved.
5. Complete a release review and deployment verification plan. Deployment platform, rollout strategy, health checks, and rollback procedures remain open until approved.

**Dependencies:** B0–B6; approved decisions for all release-scope behavior; approved deployment and operational choices.

**Verification throughout:** Run unit, real-PostgreSQL integration, API, and WebSocket suites together; test integrated user workflows and denial cases; confirm no private message content or secrets leak into logs or responses.

**Milestone B7 — Backend release ready:** In-scope backend acceptance checks pass, security and privacy rules are verified, migrations and configuration are ready under approved procedures, and remaining open items have explicit release dispositions.

## Dependency and milestone summary

| Milestone | Outcome | Depends on |
|---|---|---|
| B0 — Foundation ready | Required setup choices and decision gates are recorded. | Approved specifications |
| B1 — Application foundation | FastAPI application and layered testable structure are established. | B0 |
| B2 — Persistence and identity foundation | PostgreSQL persistence and approved authentication are verified. | B1; persistence/auth decisions |
| B3 — User and connection capabilities | Profiles, discovery, and connection lifecycle work through services and REST. | B2; affected product/API decisions |
| B4 — Connected messaging | Private messaging and approved message operations/statuses are verified. | B3; edit/delete and status decisions |
| B5 — Real-time transport | WebSockets reuse services and pass privacy/authorization checks. | B2, B4; WebSocket contract decisions |
| B6 — Delivery and devices | Offline delivery and multiple active devices meet agreed behavior. | B4, B5; BR-008–BR-010 and coordination decisions |
| B7 — Backend release ready | Integrated requirements, security, and operational readiness are verified. | B0–B6; release and deployment decisions |

## Testing and integration throughout

- **Unit:** Add pytest coverage as services and domain rules are implemented; test permitted and denied outcomes without depending on external services.
- **Database integration:** Add repository, transaction, migration, and integrity checks against a real PostgreSQL test database. Do not replace these with mocks or an in-memory database.
- **API:** Add tests as REST endpoints are introduced, covering input validation, authentication, authorization, responses, and service integration.
- **WebSocket:** Add tests as event behavior is introduced, covering connection authentication, payload validation, authorization, errors, and agreed delivery behavior.
- **Cross-feature regression:** Re-run affected suites whenever connection, block, privacy, or message behavior changes. Include complete discover-to-connect-to-message, removal, block, offline, and multi-device workflows as their prerequisites are delivered.
- **Traceability:** Link tests and implementation work to root specification FR, BR, NFR, and AC identifiers. Where behavior is open, document the decision before asserting a test expectation.

Integrate continuously within the shared backend application. Verify each milestone before beginning dependent feature acceptance; a milestone is not complete solely because its code has been written.

## Production-readiness gate

Before backend release:

- All backend requirements in the approved V1 scope are verified against the root specification.
- Private data access, profile ownership, message authorship, connection gating, and blocking pass positive and negative checks.
- PostgreSQL migrations and real-database tests pass under the approved process.
- REST and WebSocket transports share the service rules and expose only approved contracts.
- Offline delivery and multiple-device behavior meet resolved product decisions.
- Configuration and error handling are explicit; secrets and private message content are not exposed in logs or client errors.
- Deployment, operational, and rollback procedures follow decisions approved for the target environment.
