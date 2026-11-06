# Relay Frontend Implementation Roadmap

## 1. Purpose and planning rules

This roadmap sequences frontend implementation under the approved
[Frontend Specification](./spec.md) and [Root Product Specification](../spec.md).
Those documents define the requirements and product behavior; this plan
describes a practical order of work and verification checkpoints.

- Use Next.js App Router, TypeScript, Tailwind CSS, REST, and WebSockets as
  approved. Do not select additional libraries until existing project tooling
  and open decisions have been reviewed.
- Keep each phase small enough to build, test, and review before depending on
  it in the next phase.
- Verify responsive behavior, accessibility, and performance throughout
  implementation rather than postponing them to release.
- Do not invent backend routes or unresolved product behavior. A blocked
  dependency must be recorded and raised for a decision.
- Each milestone requires its acceptance checks and relevant tests to pass
  before dependent work is treated as complete.

## 2. Phase overview

| Phase | Outcome | Depends on |
|---|---|---|
| F0 — Decisions and repository readiness | Frontend workspace and blocking contract decisions are understood | Approved Frontend Specification |
| F1 — Project foundation | Runnable, type-safe Next.js App Router baseline and quality gates | F0 |
| F2 — Design system and application shell | Shared visual primitives, public/authenticated layouts, responsive navigation | F1 |
| F3 — API and authentication foundation | Typed REST boundary, safe auth lifecycle, protected route experience | F1, F2, API/auth decisions in F0 |
| F4 — Profiles and connections | Profile views/editing and connection lifecycle UI | F3; discovery API decision for discovery list |
| F5 — Conversations and REST messaging | Conversation list/detail, paginated history, message mutations and acknowledgments | F3, F4 |
| F6 — WebSocket and recovery | Authenticated real-time messages, status sync, reconnect and REST recovery | F5, backend WebSocket contract |
| F7 — Integrated quality and release readiness | Cross-workflow verification, accessibility, performance, and deployment checks | F0–F6 and required open decisions resolved |

## 3. F0 — Decisions and repository readiness

**Goal:** Confirm the implementation boundary before choosing tools or
building features.

1. Inspect the repository for an existing frontend package, Next.js
   configuration, Tailwind setup, lint/type-check commands, and test tooling.
   Reuse established conventions; do not overwrite unrelated work.
2. Confirm frontend hosting and API origin, same-origin proxy assumptions,
   and how browser requests send the HttpOnly refresh cookie. Resolve
   cross-origin CORS and credential behavior before relying on it.
3. Confirm the frontend auth bootstrap and refresh coordination model,
   including whether multiple tabs need coordinated refresh behavior.
4. Confirm the backend discovery list/search contract and availability before
   committing to a working discovery feature.
5. Select the test runner and browser/component tools only after reviewing
   existing project dependencies. Record proposed additions for approval.
6. Record remaining visual identity, legal links, accessibility target,
   supported-browser matrix, and performance-budget decisions; use
   specification defaults until a decision is required.

**Exit checks:** The frontend workspace and existing conventions are known;
implementation blockers are explicit; no API path or dependency has been
guessed.

**Verification:** Capture the baseline build, lint, type-check, and test
commands that already exist. If no frontend project exists, record that fact
and establish the approved scaffold only after dependency/version choices are
reviewed.

## 4. F1 — Project foundation

**Depends on:** F0.

1. Establish the Next.js App Router, TypeScript strictness, Tailwind CSS, and
   agreed package scripts using the repository's existing package manager
   and conventions.
2. Create only the needed source boundaries for `app`, shared components,
   feature modules, hooks, and API/auth/WebSocket utilities as described in
   the Frontend Specification.
3. Add root metadata, global styles, semantic design-token placeholders,
   environment configuration boundaries, and a not-found/error/loading
   baseline.
4. Establish typed environment access for public API configuration. Never
   expose server secrets or backend database settings to browser bundles.
5. Add baseline automated checks and a minimal render/navigation smoke test
   using the approved test tooling.

**Milestone M1 — Runnable foundation:** Development and production builds
work; TypeScript and lint checks pass; no secret configuration enters the
client bundle.

**Verification:** Build, type-check, lint, test smoke route, inspect produced
client configuration, and open the shell at narrow and wide viewport sizes.

## 5. F2 — Design system and application shell

**Depends on:** F1.

1. Define semantic Tailwind tokens for color roles, typography, spacing,
   borders, radii, focus, and elevation. Keep brand-specific values isolated
   until approved.
2. Build accessible, feature-neutral primitives: buttons, links, inputs,
   labels, form errors, badges, cards, dialogs, dropdowns, banners, skeletons,
   empty states, and avatar placeholders.
3. Build the public layout with consistent `Navbar`, footer, page width, and
   content spacing.
4. Build the authenticated shell with responsive primary navigation, account
   area, and a conversation workspace boundary.
5. Use `next/link` for internal route navigation and buttons for actions.
6. Add restrained CSS transitions and honor `prefers-reduced-motion`.

**Milestone M2 — Reusable shell:** Public and authenticated layout patterns
are consistent and usable by keyboard, screen reader, mobile, tablet, and
desktop users.

**Verification:** Component tests for interactions and focus states; visual
review at phone, tablet, and desktop breakpoints; reduced-motion check;
accessibility checks for landmarks, labels, contrast, and keyboard operation.

## 6. F3 — REST client, authentication, and protected routes

**Depends on:** F1 and F2; auth origin/session decisions from F0.

1. Define TypeScript API DTOs from the existing backend schemas and a small
   typed REST client for base URL, bearer authorization, credentials policy,
   serialization, cancellation, and safe error mapping.
2. Implement registration, login, refresh, current-account loading, and
   logout against the existing endpoints only.
3. Keep the access token in memory. Use the browser's HttpOnly refresh cookie
   through the approved origin/credentials arrangement; never read or persist
   the cookie or put tokens in URLs or browser storage.
4. Coordinate concurrent refresh attempts and cap protected-request retries.
   Do not automatically retry a non-idempotent REST message send after an
   ambiguous network failure.
5. Add public auth pages and an authenticated layout/guard that withholds
   private content until initialization completes. Treat client guards as
   presentation, not authorization.
6. Implement validation, duplicate-account, unauthorized, network, loading,
   and session-expired states without echoing passwords or raw exceptions.

**Milestone M3 — Secure account flow:** Registration/login establishes the
authenticated experience; refresh and logout clear or restore the UI without
persisting bearer tokens.

**Verification:** Unit tests for API request construction and refresh
coordination; route/component tests for login, registration, initialization,
expiry, and logout; assert tokens and credentials are absent from storage,
URLs, logs, and errors. Test the approved same-origin/cross-origin setup in a
controlled browser environment.

## 7. F4 — Profiles, discovery, and connections

**Depends on:** F3.

1. Implement current-account and public-profile pages using the existing
   account/profile endpoints. Keep owner-only fields out of public profile
   views.
2. Implement owner-only username, display-name, and bio editing with the
   backend's length/format constraints and server-side conflict feedback.
3. Implement accepted connections and incoming/outgoing request lists,
   send/accept/reject, removal, block, and unblock actions against existing
   routes.
4. Confirm disruptive remove/block actions and reflect only backend-confirmed
   state. Preserve access to existing conversation history and clearly show
   that unblock does not restore a connection.
5. Do not show guessed retry cooldown timers. Explain backend unavailable or
   conflict responses without asserting an unresolved duration.
6. Build discovery list/search only after the backend discovery endpoint,
   pagination, and ordering are approved and available. Until then, keep the
   dependency visibly blocked; do not fake results or call an invented route.
7. Provide reusable profile summaries and deterministic local avatar
   placeholders; do not implement image upload.

**Milestone M4 — Account and connection workflows:** Profiles and connection
actions work from backend-confirmed data; discovery is either contract-backed
or explicitly held pending.

**Verification:** Test public-versus-owner field boundaries, profile
validation, request lifecycle, blocked/removed states, history-preserving
navigation, loading/empty/error states, and responsive layouts.

## 8. F5 — Conversations and REST messaging

**Depends on:** F3 and F4.

1. Implement the conversation list and one-to-one create-or-get flow using
   existing conversation routes.
2. Build the conversation route, header, message list, composer, message
   actions, and participant layout. Do not expose group-chat controls.
3. Load history with `limit` and opaque `cursor`, respecting newest-first
   `(created_at, id)` ordering. Fetch older pages incrementally and preserve
   scroll position.
4. Merge records by stable message ID so pagination overlap and later
   real-time updates do not duplicate displayed messages.
5. Send REST messages and implement author-only edit/delete plus recipient
   single/batch delivery and read acknowledgments using current REST routes.
6. Present the deleted-message tombstone and only show `Sent`, `Delivered`,
   and `Read` states when confirmed. `Sending` remains local and transient.
7. Keep existing conversation history accessible after connection removal
   or blocking, but reflect send rejection rather than optimistic success.
8. Add responsive message-list/composer behavior and long-content handling.

**Milestone M5 — REST conversation workflow:** A user can open an eligible
one-to-one conversation, page history, send and manage their own messages,
and display recipient status without inventing API fields.

**Verification:** Test cursor exhaustion and overlap deduplication, ordering,
send failure ambiguity, author/recipient permissions, status presentation,
tombstones, and the removed/blocked history case. Exercise the workflow at
mobile, tablet, and desktop sizes.

## 9. F6 — WebSocket messaging and offline recovery

**Depends on:** F5 and the approved backend WebSocket event contract.

1. Implement a focused WebSocket client/manager with one authenticated
   connection per browser session, lifecycle cleanup, event parsing, and
   typed event dispatch.
2. Send `auth` as the first frame with the in-memory access token, then
   subscribe to the currently authorized conversation. Never place tokens or
   user IDs in the URL or client event payload.
3. Integrate `message.send` using one stable `client_message_id` per user
   action; reuse that ID on retries and reconcile `message.sent` and
   `message.received` by message ID.
4. Process only approved status events and recipient acknowledgments.
   Synchronize global status without per-device status records.
5. On disconnect, surface reconnecting/offline state, use bounded backoff,
   reauthenticate, and restore subscriptions after reconnection.
6. Recover missed message content through the existing paginated REST
   history endpoint. The server does not replay missed WebSocket events; do
   not implement a local offline-send queue or claim unsaved messages were
   delivered.
7. Handle protocol/auth failures and operation errors according to the
   backend event contract. Avoid leaking error details or message content to
   logs.

**Milestone M6 — Realtime and recovery:** Messages persist before being
shown as sent; reconnect restores authorized subscriptions and REST recovery
merges missed records without duplicates.

**Verification:** Test first-frame auth, unauthorized subscription handling,
send retries with stable IDs, event ordering, duplicate events, multiple
status updates, reconnect/resubscribe, offline REST recovery, logout cleanup,
and transport failures. Test with multiple browser sessions against the
documented single-process backend limitation.

## 10. F7 — Integrated quality, optimization, and production readiness

**Depends on:** F0–F6 and resolution of decisions required by deployed
workflows.

1. Run integrated registration-to-connection-to-conversation-to-message
   workflows, including blocking, removal, offline recovery, and device
   status synchronization.
2. Complete unit, component, route/integration, WebSocket, and controlled
   browser tests using only the tools approved in F0.
3. Verify keyboard and screen-reader operation, contrast, focus behavior,
   reduced motion, browser zoom, and responsive layouts across the supported
   device/browser matrix.
4. Measure route loading and client bundle composition. Reduce unnecessary
   Client Components and JavaScript; paginate message history and avoid
   redundant subscriptions or polling.
5. Verify private data is not shared through server caches and that tokens,
   credentials, and message bodies do not reach logs, analytics, URLs, or
   error screens.
6. Validate production environment variables, API origin, HttpOnly cookie
   behavior, HTTPS deployment assumptions, and application ingress settings.
7. Record remaining open backend/API or deployment dependencies. Do not mark
   discovery or cross-origin auth complete until its contract and deployment
   configuration pass.

**Milestone M7 — Frontend release candidate:** All implemented flows meet
their acceptance criteria, release checks pass, and unresolved limitations
are explicitly documented.

**Verification:** Run the full frontend quality pipeline and controlled
end-to-end suite; perform final responsive, accessibility, privacy, and
performance review. Numeric performance budgets and browser support remain
open until approved.

## 11. Cross-phase verification and dependency gates

- Every phase includes type checking, linting, and relevant automated tests
  before merge or progression. The exact commands come from the selected
  frontend project configuration.
- At each feature milestone, verify mobile and desktop behavior, loading and
  error states, keyboard access, and absence of sensitive data leakage.
- Test backend contracts against documented schemas. A changed or missing
  endpoint is a backend dependency, not a reason to invent a frontend
  workaround.
- Keep discovery blocked until its backend list/search contract is approved.
- Keep cross-origin auth blocked until origin, CORS, cookie, and credential
  behavior is approved and tested.
- Keep release readiness conditional on operational choices required for the
  selected deployment, including same-origin routing and request-size or
  abuse protections at the approved ingress boundary.

## 12. Milestone summary

| Milestone | Demonstrable outcome |
|---|---|
| M1 | Runnable Next.js foundation with quality gates |
| M2 | Responsive public and authenticated shell with reusable accessible UI |
| M3 | Secure authentication and protected-route UX |
| M4 | Profiles and backend-backed connection management |
| M5 | REST conversation and message workflows |
| M6 | Authenticated WebSocket messaging and REST-based offline recovery |
| M7 | Integrated, accessible, responsive, performance-reviewed release candidate |
