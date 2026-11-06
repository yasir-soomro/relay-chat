# Relay Frontend Technical Specification

## 1. Purpose, scope, and authority

This specification defines frontend responsibilities and implementation
expectations for Relay. It is the frontend guide for developers and
AI-assisted implementation. The [Root Product Specification](../spec.md)
defines product behavior; the [Backend Technical Specification](../backend/spec.md)
defines backend contracts and behavior. This document may refine frontend
presentation and architecture, but must not contradict either specification
or invent backend endpoints and product rules.

The frontend provides responsive browser experiences for account access,
profiles, connection management, private conversations, real-time messaging,
and offline message recovery. It consumes the existing REST API and WebSocket
contracts. It does not own authorization, persist domain records, or replace
backend business rules.

In scope:

- Next.js App Router application using TypeScript and Tailwind CSS.
- Public and authenticated navigation and layouts.
- REST-based account, profile, connection, conversation, and message workflows.
- Authenticated WebSocket messaging and message-status synchronization.
- Responsive, accessible, tested user interfaces.
- Avatar presentation support with local/generated placeholders.

Out of scope unless separately approved: backend implementation, group chats,
media/file upload, calls, presence, reactions, search beyond an approved
discovery API, push notifications, and profile-image upload.

An item marked **Open** is unresolved and must not be silently treated as a
confirmed product, API, or deployment decision.

## 2. Approved technology and principles

### Technology

- Next.js with the App Router.
- TypeScript with strict type checking.
- Tailwind CSS for responsive styling and design tokens.
- REST APIs for durable account, profile, connection, conversation, and
  message-history operations.
- WebSockets for authenticated real-time events defined by the Backend
  Specification.

Do not introduce a state-management, data-fetching, animation, form, icon,
component, or testing dependency without checking existing workspace tooling
and obtaining approval where it adds a dependency.

### Engineering principles

- Prefer React Server Components for static composition and non-interactive
  rendering. Use Client Components only for browser state, forms, live
  transport, and interactive controls.
- Keep feature logic close to its feature; keep shared UI and infrastructure
  generic and small.
- Use typed request/response boundaries. Do not expose ORM models or guess
  response fields.
- Treat all client-side checks as user experience only; backend authorization
  remains authoritative.
- Do not put access tokens, refresh tokens, passwords, or message content in
  URLs, analytics, console logs, or error telemetry.

## 3. Architecture and recommended folder structure

Use the App Router under `src/app/`. A recommended organization is:

```text
src/
├── app/
│   ├── (public)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (authenticated)/
│   │   ├── layout.tsx
│   │   └── app/
│   │       ├── page.tsx
│   │       ├── discover/page.tsx
│   │       ├── connections/page.tsx
│   │       ├── conversations/page.tsx
│   │       ├── conversations/[conversationId]/page.tsx
│   │       ├── profile/page.tsx
│   │       └── users/[userId]/page.tsx
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── not-found.tsx
├── components/
│   ├── layout/
│   ├── navigation/
│   └── ui/
├── features/
│   ├── auth/
│   ├── users/
│   ├── connections/
│   ├── conversations/
│   └── messaging/
├── hooks/
├── lib/
│   ├── api/
│   ├── auth/
│   ├── websocket/
│   ├── config/
│   └── utils/
└── styles/
```

This is a recommended boundary, not a requirement to create empty folders.
Organize by feature when doing so makes ownership clearer. Keep route files
focused on composition and metadata; feature components and hooks own their
interactive behavior. Keep backend DTO types in a dedicated API module and
share them rather than duplicating divergent definitions.

## 4. App Router pages, routes, and navigation

Recommended frontend routes:

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Product introduction and sign-in/register entry points |
| `/login` | Public | Email/password authentication |
| `/register` | Public | Account registration |
| `/app` | Authenticated | Signed-in landing page and useful conversation/connection entry points |
| `/app/discover` | Authenticated | User discovery, when a supported discovery contract is available |
| `/app/users/[userId]` | Authenticated | Public profile and eligible connection actions |
| `/app/profile` | Authenticated | View/update the signed-in user's profile |
| `/app/connections` | Authenticated | Incoming/outgoing requests, accepted connections, block controls |
| `/app/conversations` | Authenticated | Conversation list |
| `/app/conversations/[conversationId]` | Authenticated | Conversation history and composer |

These are frontend routes, not API endpoints. Preserve selected route and
conversation context during in-app navigation where safe. Use `next/link` for
internal navigation; use buttons for actions. Route changes must not place
tokens or private message content in URLs. Unknown routes render a useful
not-found page.

The discovery page depends on an approved and implemented backend discovery
list/search contract. The currently documented backend profile route retrieves
a known user by ID; it does not define a discovery-list endpoint. Do not call
an invented path or expose a nonfunctional search control before that contract
exists.

## 5. Layouts and shared navigation

### Public layout

- A lightweight public header with Relay branding and `next/link` links to
  sign-in and registration.
- A focused content area suitable for introduction and account forms.
- A consistent footer containing only approved product/legal links; legal
  policies and their content remain open.

### Authenticated layout

- Persistent application navigation with clear current-page indication.
- Desktop: compact sidebar or equivalent primary navigation plus a top
  account area; keep the conversation workspace spacious.
- Mobile: compact header and accessible navigation menu; conversation list
  and active conversation should use screen space efficiently.
- Footer may be omitted on dense messaging routes; do not force layout chrome
  into the conversation viewport.

Shared layout components include `Navbar`, `Footer`, `AppSidebar` or its
mobile equivalent, page headings, breadcrumbs where useful, and a
`ConversationShell`. Navigation must expose the same destinations across
breakpoints without hiding essential actions.

## 6. Shared components and feature boundaries

### Shared UI

Create accessible, composable primitives for buttons, links, text inputs,
password inputs, labels, form errors, avatars, badges, cards, dialogs,
dropdowns, skeletons, banners, empty states, and toast/inline feedback. A
primitive should not own feature-specific API calls or business policy.

### Feature components

- **Auth:** login/register forms, password visibility control, validation and
  submission states.
- **Users:** profile summary, editable profile form, avatar placeholder.
- **Connections:** request rows, incoming/outgoing tabs or sections, accepted
  connection list, block/unblock and remove confirmation controls.
- **Conversations:** conversation list item, participant identity, unread
  state only if provided by a contract, and conversation header.
- **Messaging:** message list, message item, status label, composer, edit and
  delete actions, history pagination and recovery state.

Feature components consume typed feature hooks or server-provided data. Do
not duplicate API calls, authorization assumptions, or status-transition
logic in individual pages.

## 7. Authentication and protected routes

The backend supports registration, email/password login, a short-lived bearer
access token, and a rotating opaque refresh token stored in an HttpOnly,
SameSite=Strict cookie scoped to `/auth`. Logout revokes the active session.
Protected REST operations use the verified bearer token; identity is never
sent as a user-controlled field.

Frontend behavior:

1. Registration submits the approved user fields and reports validation or
   duplicate-account errors without exposing sensitive input.
2. Login sends credentials to the existing auth endpoint and keeps the
   returned access token in memory; do not persist it in local storage,
   session storage, IndexedDB, or a URL.
3. Refresh requests include browser credentials so the HttpOnly cookie can be
   sent. The browser never reads or constructs that cookie.
4. On application initialization or an expired access token, attempt the
   approved refresh flow and then load the current account. A failed refresh
   clears in-memory identity and routes to sign-in.
5. Logout calls the backend and clears local in-memory auth and WebSocket
   state even when the network fails; communicate when server-side revocation
   could not be confirmed.
6. Route guards are a UX boundary. Every protected resource is still loaded
   through the authenticated backend contract.

Do not render private user data while auth initialization is unresolved.
Avoid refresh loops: one refresh attempt should be coordinated across
concurrent requests, followed by at most one retry of an eligible request.
Never retry a non-idempotent message creation through REST without a
client-supported idempotency contract.

The preferred deployment is same-origin frontend/API or a trusted
same-origin reverse proxy. The backend currently enforces `Origin` on login,
refresh, and logout, but does not define general CORS behavior. Cross-origin
cookie settings, CORS allow-credentials, and production frontend/API origins
must be approved and verified before using a cross-origin deployment.

## 8. User discovery and profiles

Authenticated users may view public profiles unless either user has blocked
the other. Public profile UI exposes only the approved public fields:
username, display name, bio, and user ID as needed for routing. Never render
email or credentials on another user's profile. The signed-in user's account
view may render their own email.

The profile editor supports username, display name, and bio only. Preserve
backend validation (username 3-30 lowercase letters, digits, or underscores;
display name 1-50 characters; bio up to 160 characters). Display server-side
validation and uniqueness errors near relevant controls. Do not imply email
or password editing is available.

Discovery must use a backend-approved list/search contract and pagination.
Until that contract is available, mark discovery UI as blocked/incomplete
rather than inventing a REST path, query parameter, filtering behavior, or
ordering rule. An ID-based public-profile route may be used only when the ID
is obtained through a valid, existing product flow.

## 9. Connection management

The connection experience lets the user:

- View incoming and outgoing pending requests and accepted connections.
- Send a request, accept or reject an incoming request, and remove an
  accepted connection.
- Block and unblock a user, with clear confirmation for disruptive actions.

Use the authenticated actor from the current session. Only the request
recipient may accept or reject; the backend remains authoritative for all
permissions and state transitions. Reflect pending, accepted, rejected, and
removed outcomes using backend response state and errors.

Removal and blocking preserve conversation history, but stop new sends until
there is an accepted, unblocked connection. Keep existing conversation
history accessible to its participants. After unblock, do not imply that the
connection was restored; a new request and acceptance are required.

The rejected-request cooldown duration is open. Do not display a countdown,
enable a retry at an assumed time, or configure a client-side duration. Show
the backend's explicit unavailable/cooldown result without suggesting the
policy is known.

## 10. Conversations and real-time messaging

Relay supports one-to-one conversations only. A user can create or retrieve a
conversation with an accepted, unblocked connection, list conversations, and
open an existing conversation. Existing participants retain access to history
after removal or blocking; they cannot send new messages while the connection
is removed or blocked.

The conversation view should:

- Present messages in a readable, chronological visual flow while honoring
  the backend's newest-first cursor pages.
- Load older history incrementally without discarding the scroll position or
  duplicating records.
- Identify the message author and show status only as confirmed by backend
  data or an explicit local transient state.
- Permit edit/delete only on the current user's messages and show the
  backend's deleted-message tombstone.
- Keep sending disabled or explain the restriction when the backend reports
  that the connection is no longer eligible.

No typing indicators, presence, group conversations, attachments, or push
notifications are defined by the approved scope.

## 11. REST and WebSocket contracts

### REST

Use only the backend's documented routes and schemas. The current backend
contract includes:

| Capability | Method and endpoint |
|---|---|
| Auth | `POST /auth/register`; `POST /auth/login`; `POST /auth/refresh`; `POST /auth/logout`; `GET /auth/me` |
| Profile | `GET /users/me`; `PATCH /users/me`; `GET /users/{user_id}` |
| Connections | `POST /connections/requests`; `GET /connections/requests/incoming`; `GET /connections/requests/outgoing`; `POST /connections/requests/{connection_id}/accept`; `POST /connections/requests/{connection_id}/reject`; `DELETE /connections/{other_user_id}`; `POST /connections/{other_user_id}/block`; `DELETE /connections/{other_user_id}/block`; `GET /connections` |
| Conversations | `POST /conversations`; `GET /conversations`; `GET /conversations/{conversation_id}` |
| Messages | `POST /conversations/{conversation_id}/messages`; `GET /conversations/{conversation_id}/messages`; `GET /messages/{message_id}`; `PATCH /messages/{message_id}`; `DELETE /messages/{message_id}`; `POST /messages/{message_id}/delivery`; `POST /messages/{message_id}/read`; `POST /conversations/{conversation_id}/messages/delivery`; `POST /conversations/{conversation_id}/messages/read` |

History uses `limit` (1-100; default 50) and opaque `cursor`. Pages are
newest-first with stable `(created_at, id)` ordering. Follow `next_cursor`
until null and merge recovered records by message ID. Do not infer or add
query parameters or response fields.

The backend returns standard HTTP errors. Preserve useful user-facing error
messages where safe, but do not display raw exception traces, database details,
or submitted secret values. Handle 401 by coordinating refresh; distinguish
permission, not-found, conflict, validation, and service-unavailable outcomes
only where confirmed by the response contract.

### WebSocket

Connect to `/ws`; send an `auth` event with the access token as the first
frame within the configured default 10-second deadline. Never place tokens in
the URL or send a client-supplied user ID. Reconnect requires fresh
authentication and restoring each authorized subscription.

Supported client events:

- `auth`
- `subscribe` and `unsubscribe` with `conversation_id`
- `message.send` with `conversation_id`, UUID `client_message_id`, and
  non-empty `content`
- `message.delivery_ack` with `conversation_id` and `message_id`
- `message.delivery_ack_batch` and `message.read_ack` with a
  `conversation_id` and 1-100 unique `message_ids`

Supported server events are `auth.ok`, `subscribed`, `unsubscribed`,
`message.sent`, `message.received`, `message.status`, and `error`. Follow the
Backend Specification's event schemas and error behavior; unknown fields are
not accepted.

Persisting a message precedes backend broadcast. Use the same
`client_message_id` for a retried WebSocket send so the backend returns the
original message without duplicating it. Never create a new idempotency key
for an automatic retry of the same user action. The REST send endpoint has no
documented idempotency key; do not automatically retry it on ambiguous
failure.

`Sending` is client-side transient only. Display `Sent` only after a persisted
message result; display `Delivered` or `Read` only after the server status
confirms it. Recipient device acknowledgments advance global status, which
may be synchronized to all connected devices. Do not store or present
per-device delivery status.

On disconnect, show a reconnecting state, attempt bounded reconnects with
backoff, then require fresh authentication and restore subscriptions. The
backend manager is in-memory and supports a single application process only;
the frontend must not promise delivery across backend instances. There is no
server-side event replay. After reconnection, recover content through the
existing REST history endpoint and merge by message ID. Do not reprocess
duplicate messages as new conversation items.

## 12. State management and data fetching

Use the smallest state mechanism that meets the feature need. Keep transient
form, menu, and dialog state local to components. Share authenticated identity,
API client configuration, and WebSocket lifecycle only where multiple routes
need them. Do not introduce a global store without demonstrated need and
approval.

- Use Server Components for non-sensitive static composition and metadata.
- Fetch user-specific API data only through a design that has access to the
  verified frontend auth state; do not assume server components can read a
  backend-only HttpOnly cookie.
- Centralize base URL, authorization headers, `credentials` policy, JSON
  serialization, and safe error mapping in a typed API client.
- Keep the access token in memory and inject it only as a bearer header on
  approved API requests and the first WebSocket authentication frame.
- Avoid caching user-specific/private responses in shared server caches. Make
  cache behavior explicit; use no-store semantics for private account and
  message data unless a reviewed design proves isolation.
- Abort obsolete fetches when routes change and protect against stale
  responses overwriting newer state.
- Use cursor-based history pagination rather than loading an unbounded
  conversation.
- Treat WebSocket events as transport updates; reconcile them by stable
  message ID with REST data.

The frontend hosting model, API origin, and server-side versus browser-side
data-fetching boundary are **Open**. Resolve them before implementing a
cross-origin auth/session flow.

## 13. Responsive design

Design mobile-first and verify small phone, large phone, tablet, laptop, and
wide desktop layouts. Use flexible layouts, content-driven breakpoints, and
Tailwind responsive utilities rather than fixed page widths.

- Prevent horizontal overflow in navigation, profiles, forms, and message
  content.
- Keep touch targets comfortably usable and provide sufficient spacing.
- On narrow screens, prioritize the active conversation; provide a clear
  route back to the conversation list.
- On larger screens, use available space for persistent navigation and a
  conversation list/detail layout where appropriate.
- Keep composer controls visible with the virtual keyboard open and respect
  safe-area insets where needed.
- Ensure long usernames, URLs, and message text wrap without breaking the
  layout.

## 14. Design system and interaction

Define a small set of semantic design tokens in Tailwind for color, spacing,
type scale, radii, borders, shadows, and focus states. Use tokens consistently
instead of page-specific arbitrary values. Prefer a neutral, calm visual
language with clear distinction between primary actions, secondary actions,
destructive actions, and status information; exact brand palette and visual
identity are **Open**.

Use a legible system or approved web font with a consistent type scale and
line-height. Establish predictable page widths, spacing rhythm, component
density, message spacing, and form layout. Keep decorative effects restrained
so message content remains primary.

Use lightweight CSS transitions for hover, focus, disclosure, and route-level
feedback. Avoid layout-thrashing animation and large animation dependencies.
Respect `prefers-reduced-motion`; provide non-animated state changes when
requested by the operating system.

## 15. Loading, error, empty, offline, and reconnecting states

Every data-backed view must define the following states as applicable:

- **Loading:** use route `loading.tsx`, skeletons, or local progress indicators
  that preserve layout and avoid flicker.
- **Error:** show a useful recovery action, preserve safe user input, and
  avoid raw server/stack details.
- **Empty:** explain the next valid action, such as starting an approved
  discovery or connection workflow; do not fabricate results.
- **Offline:** clearly distinguish loss of network from backend rejection.
  Do not imply an offline send was persisted or queued.
- **Reconnecting:** show WebSocket reconnect status without blocking REST
  history access where available.
- **Sending:** display a local transient state; transition only after a
  persisted server result. On ambiguous failure, allow a deliberate retry
  using the same client message ID.
- **Permission/state conflict:** reflect backend denial and refresh the
  relevant connection/conversation state without optimistic success.

Avoid destructive optimistic updates for message edits/deletes or connection
actions unless rollback behavior is explicit and tested.

## 16. Avatar and future image support

Provide an avatar component that can render initials or a deterministic
placeholder from approved public profile fields. Define a stable shape that
can later accept an image URL, alt text, and size, but do not create an upload
UI, storage integration, image endpoint, or image field in API requests until
approved backend support exists. Do not fetch arbitrary user-controlled
remote image URLs without an approved security and privacy policy.

## 17. Accessibility

Meet WCAG 2.2 AA as the target, subject to project acceptance decisions.
Provide semantic landmarks and heading order, keyboard-accessible navigation
and dialogs, visible focus, associated form labels, descriptive error
announcements, and accessible names for icon-only buttons.

Use sufficient text and non-text contrast. Do not convey message status,
connection state, or errors by color alone. Ensure dynamic message arrivals,
status updates, reconnecting banners, and form errors are announced
appropriately without overwhelming assistive technology. Respect reduced
motion and browser zoom; support keyboard-only use and screen-reader labels.

## 18. Performance and optimization

- Keep client bundles small; avoid converting whole layouts to Client
  Components.
- Lazy-load non-critical interactive modules where useful, without delaying
  core navigation or messaging.
- Paginate history and avoid redundant polling or duplicate WebSocket
  subscriptions.
- Reuse a single authenticated WebSocket connection per browser session
  unless a reviewed need requires otherwise; close it on logout/unmount.
- Avoid rerendering the entire history list for a single status update.
- Use stable IDs and keys for message and conversation lists.
- Use optimized image handling only when approved image sources exist.
- Measure before introducing memoization or additional caching.

Numeric performance budgets and supported browser/device matrix are **Open**.

## 19. Testing standards

Use the frontend test tools selected by the eventual project setup; the exact
test runner and browser automation framework are **Open**. Do not add a
dependency before reviewing the frontend package configuration.

Required coverage:

- Unit tests for API client serialization, auth refresh coordination, event
  parsing, message deduplication, and status rendering logic.
- Component tests for forms, validation, permission-sensitive controls,
  loading/error/empty states, and keyboard behavior.
- Route/integration tests for sign-in/out, guarded pages, profile editing,
  connection lifecycle, conversation opening, history pagination, edits,
  deletes, and acknowledgments.
- WebSocket tests for first-frame authentication, reconnect/resubscription,
  participant-visible events, send deduplication, status updates, offline
  history recovery, and failure handling.
- Responsive and accessibility checks for primary pages and the conversation
  workflow.

Tests must use isolated fixtures and must not depend on production data or
secrets. Mock network boundaries for component tests; use a controlled backend
test environment for contract and end-to-end coverage. Verify that private
messages, tokens, and credentials are absent from logs, analytics, and error
screens.

## 20. Acceptance criteria

| ID | Criterion |
|---|---|
| FAC-001 | Public pages provide clear sign-in and registration navigation; authenticated routes do not show private data before authentication state is resolved. |
| FAC-002 | Registration, login, refresh, current-account loading, and logout use existing backend contracts; tokens are not persisted in browser storage or URLs. |
| FAC-003 | Public profiles expose only approved fields; only the owner sees account fields and can edit the approved profile properties. |
| FAC-004 | Connection requests, decisions, removals, blocking, and unblocking reflect backend outcomes; removed/blocked connections cannot send new messages while history is retained. |
| FAC-005 | Conversation creation/list/detail use the existing one-to-one APIs and never present group-chat functionality. |
| FAC-006 | Message history follows opaque cursors, preserves stable order, merges duplicate IDs, and remains participant-scoped by backend authorization. |
| FAC-007 | WebSocket auth is the first frame; reconnect authenticates again and restores subscriptions; unauthorized messages are not rendered. |
| FAC-008 | Sending, Sent, Delivered, and Read labels follow the approved lifecycle and do not claim delivery before backend confirmation. |
| FAC-009 | Offline recovery uses REST history without claiming server replay or a client-side offline-send queue. |
| FAC-010 | Loading, error, empty, offline, reconnecting, and permission-denied states are implemented for the relevant workflows. |
| FAC-011 | Primary workflows are usable on mobile, tablet, and desktop with keyboard and assistive-technology support and reduced-motion behavior. |
| FAC-012 | Tests verify relevant feature behavior, API/WebSocket contracts, privacy boundaries, and responsive/accessibility requirements. |

## 21. Assumptions and open decisions

### Assumptions

- The backend is authoritative for identity, permissions, connection state,
  conversation participation, and message status.
- The frontend will use the REST and WebSocket contracts documented in the
  Backend Specification and backend README; no route is added here.
- Offline recipients recover persisted messages from REST history; the
  backend does not replay missed WebSocket messages.
- This specification describes browser UI and does not add backend features.

### Open decisions

1. Backend user discovery/list/search endpoint, query, pagination, and
   ordering contract.
2. Frontend deployment topology, API base URL, same-origin proxy setup, and
   cross-origin credential/CORS policy.
3. Exact frontend authentication bootstrap and refresh coordination across
   tabs; backend refresh tokens are rotated and session-scoped.
4. Whether to adopt a shared state/data-fetching library, and which one.
5. Frontend test runner, component-testing tools, and browser automation.
6. Brand palette, typography, visual identity, and final design tokens.
7. Legal footer links/content and terms/privacy requirements.
8. Numeric performance budgets and supported browser/device matrix.
9. Client-side message retention/cache policy and treatment of locally
   displayed deleted-message tombstones after reload.
10. Accessibility conformance target and formal verification tooling.
11. Rate limiting, abuse controls, and ingress request-body limits are not
    defined by the backend decision set; frontend controls cannot substitute
    for server-side policy.
12. Profile image URL contract, trust policy, and upload support.
13. Exact discovery empty-state and onboarding behavior until discovery API
    availability is decided.

Resolve these decisions before implementing behavior that depends on them.