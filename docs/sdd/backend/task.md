# Relay Backend Development Tasks

## Purpose and authority

This task breakdown translates the approved [Root Product Specification](../spec.md), [root development plan](../plan.md), [Backend Technical Specification](./spec.md), and [backend implementation roadmap](./plan.md) into trackable work. Those documents remain authoritative; this file does not create additional product requirements or technology choices.

Tasks are grouped in implementation order. Dependencies use task IDs from this document. A task is complete only when its acceptance criteria pass and its specification references are satisfied.

### Priority and status

- **P0 — Foundation:** decisions and enabling work on the critical path.
- **P1 — Core V1:** required product capabilities and their direct verification.
- **P2 — Dependent/release:** real-time delivery, cross-device completion, and integrated release gates. P2 indicates sequence, not optional scope.
- **Pending:** not started; no unresolved decision currently blocks starting the task.
- **In Progress:** actively being worked.
- **Completed:** acceptance criteria verified.
- **Blocked:** cannot proceed until a stated dependency or unresolved decision is resolved.

All tasks start as Pending unless an unresolved decision already blocks implementation. No implementation work is represented as completed.

## Phase 0 — Decisions and preparation

| ID | Task and expected outcome | Priority | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|---|
| BT-001 | Resolve Python version, dependency/version policy, and agreed project tooling. Record approved choices for a reproducible Python project. | P0 | — | Decisions are documented and sufficient to configure `pyproject.toml`; no unapproved dependency is assumed. | Pending |
| BT-002 | Resolve PostgreSQL version, database access/model/driver choices, migration tooling, and real PostgreSQL test provisioning. | P0 | — | Decisions are documented and support PostgreSQL integration tests against a real test database. | Pending |
| BT-003 | Resolve authentication and account lifecycle requirements, including the authentication contract and credential/session behavior needed for implementation. | P0 | — | Product and technical decisions needed for protected operations are approved and recorded; unresolved aspects remain explicit. | Completed — approved REST authentication contract is recorded in the Backend Specification; recovery and email verification remain out of scope. |
| BT-004 | Resolve public-profile access and the profile fields/visibility rules. | P0 | — | Authenticated-only viewing, profile fields, validation, and public/owner response fields are approved and recorded against BR-001/FR-003. | Completed — approved profile contract recorded in the root specification. |
| BT-005 | Resolve the rejected-request cooldown duration and measurement. | P0 | — | The cooldown rule needed to implement and test retries is approved and recorded (BR-004). | Pending |
| BT-006 | Resolve block effects on existing connections, pending requests, conversations, and history. | P0 | — | Decisions needed for block behavior are recorded without extending beyond the root specification's questions (BR-006). | Pending |
| BT-042 | Resolve message edit/deletion visibility, offline-delivery guarantees, status meanings/transitions, and cross-device behavior. | P0 | — | Decisions corresponding to BR-007–BR-010 are approved or explicitly deferred from affected release scope. | Pending |
| BT-007 | Approve REST API conventions and contracts, including routes, responses, errors, and pagination needed by the approved product behaviors. | P0 | BT-003 | The REST contracts needed by upcoming work are documented; no route, payload, or error behavior is assumed implicitly. | In Progress — authentication and required User routes are implemented; broader product API conventions remain open. |
| BT-037 | Approve the WebSocket authentication handshake, event/payload contract, acknowledgements, errors, reconnection, ordering, and coordination expectations. | P0 | BT-003, BT-006, BT-042 | WebSocket contract decisions are documented and consistent with approved authentication, blocking, message status, offline delivery, and device behavior. | Blocked — BT-006, BT-042 |
| BT-008 | Resolve backend hosting, deployment, configuration/secret source, and operational procedures needed for production readiness. | P2 | — | Decisions for the target environment are recorded, including applicable deployment and rollback expectations. | Pending |

## Phase 1 — Project and architecture foundation

| ID | Task and expected outcome | Priority | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|---|
| BT-009 | Establish the required backend directory structure and FastAPI application entry point with clear layered boundaries. | P0 | BT-001 | Required folders/files from the Backend Specification are present; app construction works; route, service, repository, schema, model, and DB responsibilities are distinct. | Blocked — BT-001 |
| BT-010 | Establish pytest suite structure and shared test conventions for unit, integration, API, and WebSocket tests. | P0 | BT-001, BT-009 | Pytest discovers the four required test areas; test configuration is documented; database integration tests are designated for real PostgreSQL. | Blocked — BT-001 |
| BT-011 | Establish shared configuration, application error handling, logging setup, and dependency wiring in the approved core/application structure. | P0 | BT-009, BT-001 | Settings are centralized and validated; failures are explicit; logs and client errors do not disclose secrets or private message content. | Blocked — BT-001 |

## Phase 2 — PostgreSQL persistence and authentication

| ID | Task and expected outcome | Priority | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|---|
| BT-012 | Implement PostgreSQL connection/session lifecycle, initial models/repositories, and ordered migrations for the first user/profile data required by approved decisions. | P0 | BT-002, BT-009 | Repositories own database queries; services do not query directly; migrations can create the required schema on PostgreSQL. | Blocked — BT-002 |
| BT-013 | Add repository, migration, and persistence integration tests against a real PostgreSQL test database. | P0 | BT-002, BT-010, BT-012 | Tests use PostgreSQL rather than mocks or an in-memory substitute, isolate test data, and verify migrations and persistence behavior. | Blocked — BT-002 |
| BT-014 | Implement authenticated-principal handling and shared authorization foundations according to the approved authentication decision. | P0 | BT-003, BT-009, BT-012 | Protected operations reject absent/invalid authentication; actor identity comes from the authenticated principal, not caller-supplied ownership data. | In Progress — JWT/session dependencies and route wiring are implemented; PostgreSQL migration/application verification is blocked by database authentication failures. |
| BT-015 | Test authentication and authorization foundations, including unauthenticated/invalid callers and actor identity handling. | P0 | BT-010, BT-014 | Unit/API checks verify expected allow/deny outcomes under the approved authentication contract; tests do not encode unresolved behavior. | In Progress — unit/API auth flows pass; real PostgreSQL persistence verification remains blocked by database access. |

## Phase 3 — Profiles, discovery, and connections

| ID | Task and expected outcome | Priority | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|---|
| BT-016 | Implement profile discovery, public profile access, and owner-only profile updates through services and repositories. | P1 | BT-004, BT-012, BT-014 | Authenticated discovery works; a user can view another user's public profile as approved; only the owner can edit it. (FR-002–FR-004, BR-001–BR-002) | Blocked — BT-012 and BT-014; User routes are mounted but persistence and end-to-end PostgreSQL verification are incomplete. |
| BT-017 | Test profile/discovery behavior, including public visibility, profile-owner edit, and denied cross-user edit. | P1 | BT-010, BT-013, BT-015, BT-016 | Tests cover permitted and denied behavior and reflect the approved visibility decision. (AC-001, AC-002) | Blocked — BT-013, BT-015, and BT-016. |
| BT-018 | Implement connection request, acceptance, and rejection. | P1 | BT-012, BT-014 | Requesters can send requests and recipients can accept or reject them. (FR-005–FR-007) | Blocked — BT-002, BT-003 |
| BT-019 | Test connection request, acceptance, and rejection behavior. | P1 | BT-010, BT-013, BT-018 | Unit and PostgreSQL integration tests verify the requester and recipient outcomes. (AC-003) | Blocked — BT-018 |
| BT-038 | Implement request retry after the approved cooldown. | P1 | BT-005, BT-012, BT-014, BT-018 | A rejected request cannot be retried before the approved cooldown and can be retried after it elapses. (FR-008, BR-004) | Blocked — BT-005 |
| BT-039 | Test rejected-request cooldown boundaries. | P1 | BT-010, BT-013, BT-038 | Tests verify retry denial before and permission after the approved cooldown. (AC-004) | Blocked — BT-038 |
| BT-040 | Implement connection removal while preserving chat history and preventing new messages between former connections. | P1 | BT-012, BT-014, BT-018 | Removing an accepted connection preserves its history and prevents either former connection from sending new messages. (FR-009, BR-005) | Blocked — BT-018 |
| BT-041 | Test connection removal, history preservation, and new-message denial. | P1 | BT-010, BT-013, BT-040 | PostgreSQL integration and service tests confirm history remains and neither user can send a new message after removal. (AC-007) | Blocked — BT-040 |
| BT-043 | Implement blocking so messaging is prevented in both directions and each user's profile is hidden from the other. | P1 | BT-006, BT-012, BT-014, BT-016 | Blocking enforces bidirectional message denial and mutual profile hiding; any other effects follow only approved BR-006 decisions. (FR-010, BR-006) | Blocked — BT-006 |
| BT-044 | Test blocking in both directions for messaging and profile visibility. | P1 | BT-010, BT-013, BT-043 | Tests verify bidirectional message denial and mutual profile hiding; effects on existing state match approved decisions only. (AC-006, AC-008) | Blocked — BT-043 |
| BT-020 | Expose approved profile, discovery, and connection operations through REST routes and schemas. | P1 | BT-007, BT-014, BT-016, BT-018, BT-038, BT-040, BT-043 | Routes validate inputs, use authenticated identity, call services, and serialize approved contracts; no business workflow or database query is placed in routes. | Blocked — BT-007 |
| BT-021 | Test profile and connection REST APIs, including validation, authentication, authorization, responses, and service integration. | P1 | BT-010, BT-020 | API tests cover the supported operations and relevant denial cases; expected results match approved API contracts. | Blocked — BT-007 |

## Phase 4 — Connected messaging and REST operations

| ID | Task and expected outcome | Priority | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|---|
| BT-022 | Implement private conversation/message persistence and service operations for sending and authorized history access. | P1 | BT-012, BT-018, BT-040, BT-043, BT-014 | Messages are associated with their conversation participants; only accepted connections without an applicable block can exchange new messages; unrelated users cannot access private messages. (FR-011, BR-003, NFR-002, NFR-007–NFR-010) | Blocked — BT-012, BT-014, BT-018, BT-040, BT-043 |
| BT-023 | Test connected messaging and private access using unit and real-PostgreSQL integration coverage. | P1 | BT-013, BT-022, BT-041, BT-044 | Tests verify accepted-connection send, denied send without a connection, denied send after removal or block, and participant-only history access. (AC-005–AC-008) | Blocked — BT-022 |
| BT-024 | Implement author-only message editing and deletion using the approved recipient-visible and history/audit behavior. | P1 | BT-042, BT-022 | Authors can edit/delete their messages; another user cannot; visible results follow the approved BR-007 decision. (FR-012–FR-013, BR-007) | Blocked — BT-042 |
| BT-025 | Test message edit/delete behavior and authorship authorization. | P1 | BT-010, BT-023, BT-024 | Tests cover author success and non-author denial; visibility/history assertions match the approved decision. (AC-009) | Blocked — BT-042 |
| BT-026 | Implement Sending, Sent, Delivered, and Read status behavior using approved meanings and transition rules. | P1 | BT-042, BT-022 | All four supported statuses are represented and transitions/aggregation follow approved BR-009 decisions. (FR-015, BR-009) | Blocked — BT-042 |
| BT-027 | Test status transitions and status behavior across recipient devices according to the approved rules. | P1 | BT-010, BT-026 | Tests exercise each applicable status and approved multi-device aggregation without asserting undefined semantics. (AC-011) | Blocked — BT-042 |
| BT-028 | Expose approved messaging, history, edit/delete, and status operations through REST. | P1 | BT-007, BT-022, BT-024, BT-026 | Handlers use schemas and shared services; the authenticated caller cannot bypass connection, blocking, participant, or authorship rules. | Blocked — BT-007 |
| BT-029 | Test messaging REST behavior, including authorization, validation, message operations, and approved status responses. | P1 | BT-010, BT-023, BT-025, BT-027, BT-028 | API tests cover successful and denied operations and conform to the approved REST contract. | Blocked — BT-007 |

## Phase 5 — WebSocket real-time transport

| ID | Task and expected outcome | Priority | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|---|
| BT-030 | Implement authenticated WebSocket handlers and schemas that delegate messaging operations to the same services as REST. | P1 | BT-037, BT-014, BT-022 | Events are validated and authorized against the authenticated user and conversation; handler code contains no product workflow or database query; private events are participant-only. | Blocked — BT-037 |
| BT-031 | Test WebSocket authentication, payload validation, authorization, error behavior, and cross-transport consistency. | P1 | BT-010, BT-023, BT-030 | WebSocket tests cover allowed/denied access, unrelated-user privacy, and service-rule parity with REST under the approved event contract. | Blocked — BT-037 |

## Phase 6 — Offline delivery and multiple active devices

| ID | Task and expected outcome | Priority | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|---|
| BT-032 | Implement offline message delivery under approved delivery, expiry, retry, and delivery-event rules. | P2 | BT-042, BT-022, BT-030 | A message sent while its recipient is offline can be delivered when the recipient can receive it; behavior conforms to approved BR-008 decisions. (FR-014, BR-008) | Blocked — BT-042 |
| BT-033 | Test offline delivery and its persistence/transport behavior. | P2 | BT-013, BT-031, BT-032 | PostgreSQL integration and WebSocket tests verify the agreed offline scenario and delivery guarantees. (AC-010) | Blocked — BT-042 |
| BT-034 | Implement multiple active-device support and approved cross-device state behavior. | P2 | BT-042, BT-014, BT-026, BT-030 | Multiple devices may be active for one user; state synchronization follows approved BR-009/BR-010 decisions. (FR-016, BR-009–BR-010) | Blocked — BT-042 |
| BT-035 | Test multi-device activity, message statuses, and cross-device changes. | P2 | BT-013, BT-027, BT-031, BT-034 | Tests verify multiple active devices and agreed synchronization/status outcomes without inventing undefined behavior. (AC-011–AC-012) | Blocked — BT-042 |

## Phase 7 — Integrated security and production readiness

| ID | Task and expected outcome | Priority | Depends on | Acceptance criteria | Status |
|---|---|---|---|---|---|
| BT-036 | Run integrated security/privacy and V1 backend acceptance verification; resolve release-scope decision gates and confirm deployment readiness. | P2 | BT-008, BT-015, BT-017, BT-019, BT-021, BT-023, BT-025, BT-027, BT-029, BT-031, BT-033, BT-035, BT-037, BT-039, BT-041, BT-044 | Relevant root acceptance criteria pass; privacy, ownership, participant, connection, block, and authorship denials pass; migrations and configuration follow approved procedures; secrets/private content are absent from logs and client errors; open decisions affecting V1 have approved dispositions. | Blocked — prerequisite tasks and BT-008 |

## Tracking notes

- Update a task's status when work starts, becomes blocked, or meets all acceptance criteria. Record the reason when changing a task to Blocked.
- Keep dependencies current if approved scope changes; do not mark a dependent task complete while a required decision remains unresolved.
- A task may be split further during implementation only when the split preserves its specification references and acceptance outcome and does not create duplicate work.
- Do not add technologies, product rules, performance targets, or out-of-scope capabilities without an approved specification change.
