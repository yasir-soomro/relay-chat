# Relay Root Product Specification

## 1. Purpose and authority

This document defines the product-level requirements for Relay V1, a real-time communication application. It describes **what Relay must do**, not how it must be designed or implemented.

This is the root product specification. Product, design, engineering, and quality work should use it as the source of truth for V1 scope and behavior. More detailed specifications may refine these requirements but must not contradict them. A change to a confirmed product decision or to this document's V1 commitments requires an explicit product decision and an update to this specification.

Requirements are identified as:

- **FR** — Functional requirement
- **BR** — Business rule
- **NFR** — Non-functional requirement
- **AC** — Acceptance criterion

An item marked **Open** is unresolved and must not be treated as a confirmed behavior.

## 2. Product overview and vision

Relay is a real-time communication application for authenticated users. Users can discover other users, view public profiles, request and establish connections, and exchange private messages with users to whom they are connected.

Relay's vision is to make it straightforward for people to discover one another and communicate privately, while giving users control over their profiles, connections, and messages.

## 3. Problem statement and objectives

People need a way to find other users, establish mutual permission to communicate, and have private conversations that remain usable when a recipient is offline or uses multiple active devices. Without explicit connection and blocking controls, users may lack clarity and control over who can contact them.

V1 objectives:

1. Enable users to discover users and view their public profiles.
2. Make connection establishment depend on a request and acceptance.
3. Restrict new messaging to accepted connections.
4. Give users controls to reject and later retry requests, remove connections, and block users.
5. Support private messaging, including editing and deleting one's own messages.
6. Support offline delivery, message status visibility, and multiple active devices.

## 4. Target users and use cases

### Target users

- **Authenticated user:** A person using Relay who can discover users, manage their own profile and connections, and message accepted connections.
- **Connection requester:** An authenticated user asking another user to establish a connection.
- **Connection recipient:** An authenticated user deciding whether to accept or reject a request.
- **Connected user:** Either participant in an accepted connection who can exchange private messages with the other participant.

### Primary use cases

- Find another user and view their profile.
- Request a connection, then have the other user accept or reject it.
- Retry a rejected request after the applicable cooldown.
- Exchange, edit, and delete messages with an accepted connection.
- Continue to receive messages after being offline.
- Use more than one active device for a Relay account.
- Remove a connection while retaining the existing chat history.
- Block a user to prevent messaging and hide profiles from both users.

## 5. Product scope

### V1 scope

V1 includes the capabilities represented by the functional requirements in this document:

- Authenticated user access.
- User discovery and publicly viewable profiles.
- Profile editing by the profile owner.
- Connection requests, acceptance, rejection, and retry after a cooldown.
- Private messaging restricted to accepted connections.
- Connection removal that preserves chat history and prevents new messages.
- Blocking that prevents messaging and hides the users' profiles from one another.
- Editing and deleting one's own messages.
- Offline message delivery.
- The message statuses Sending, Sent, Delivered, and Read.
- Multiple active devices.

### Not specified as V1 scope

No additional capabilities are committed by this specification. Examples not defined here include group conversations, media or file sharing, calls, presence indicators, message reactions, search, contact import, moderation tools, and notification channels. Their inclusion or exclusion from a future release is an open product decision; this list does not assert a permanent product limitation.

## 6. Functional requirements

### Identity, discovery, and profiles

| ID | Requirement |
|---|---|
| FR-001 | Relay must make its communication and connection capabilities available to authenticated users. |
| FR-002 | Relay must let an authenticated user discover other users. |
| FR-003 | Relay must let a user view another user's public profile without first establishing a connection. |
| FR-004 | Relay must let a user edit their own profile. Relay must not let a user edit another user's profile. |

### User profile data

- Email is the normalized, unique login identifier and is not included in public profile responses.
- Usernames are unique, lowercase, and contain only lowercase letters, numbers, and underscores (3–30 characters).
- Display names contain 1–50 characters. Bios are optional and limited to 160 characters.
- Password input is 12–128 characters; only an Argon2 password hash is persisted. Password hashes are never returned.
- User IDs are UUIDs. Creation and update timestamps are generated by the system.
- Public profiles expose only ID, username, display name, and bio. The account-owner response additionally exposes email and creation/update timestamps.
- Profile updates may change username, display name, and bio only. Email and password changes are separate operations.
- Profile viewing requires authentication. An accepted connection is not required, subject to the blocking rule in BR-006.

### Connections

| ID | Requirement |
|---|---|
| FR-005 | Relay must let a user send a connection request to another user. |
| FR-006 | Relay must let the request recipient accept a connection request. |
| FR-007 | Relay must let the request recipient reject a connection request. |
| FR-008 | Relay must allow a rejected request to be sent again after a cooldown. |
| FR-009 | Relay must let a user remove an accepted connection. Removing a connection must preserve the existing chat history and prevent new messages between the former connections. |
| FR-010 | Relay must let a user block another user. Blocking must prevent messaging between the users and hide each user's profile from the other. |

### Messaging

| ID | Requirement |
|---|---|
| FR-011 | Relay must let users exchange private messages only when they have an accepted connection. |
| FR-012 | Relay must let a user edit messages that they authored. |
| FR-013 | Relay must let a user delete messages that they authored. |
| FR-014 | Relay must support delivery of messages when the recipient is offline. |
| FR-015 | Relay must support the message statuses Sending, Sent, Delivered, and Read. |
| FR-016 | Relay must support multiple active devices for a user. |

## 7. Business rules

| ID | Rule |
|---|---|
| BR-001 | An authenticated user may view a profile without an accepted connection, subject to the blocking rule in BR-006. Unauthenticated profile viewing is not allowed. |
| BR-002 | Only the owner of a profile may edit that profile. |
| BR-003 | An accepted connection is required for users to send new private messages to one another. |
| BR-004 | A rejected request may be retried by its original requester after 168 hours have elapsed from the UTC rejection timestamp. A retry before expiry is denied and reports when it becomes available. |
| BR-005 | Removing a connection does not erase its chat history, but neither former connection may send new messages to the other while the connection is removed. |
| BR-006 | A block prevents messages in both directions and hides each blocked user's profile from the other. Blocking terminates an accepted connection and cancels pending requests between the users without deleting chat history. Unblocking restores profile visibility but does not restore connection status; a new request must be accepted before messaging resumes. |
| BR-007 | A user may edit or delete only messages they authored. Editing replaces the current content without retaining prior versions. Deletion retains the message record as a visible deleted-message placeholder and clears its content; no deletion expiry is defined. |
| BR-008 | Messages are persisted before delivery and remain stored while a recipient is offline. After reconnecting and restoring authorized subscriptions, missed messages are recovered through paginated REST conversation history; the server does not replay missed WebSocket events. Expiry and retry limits remain **Open**. |
| BR-009 | Sending is a client-side transient state and is not persisted by the backend. A message successfully persisted by the backend has status Sent. Acknowledgment by any recipient device advances Sent to Delivered; recipient read acknowledgment advances Sent or Delivered to Read, recording delivery if needed. Statuses do not regress, repeated acknowledgments are idempotent, and global status changes synchronize across active recipient devices. Per-device status records are not created. |
| BR-010 | A user may have multiple active devices. Reconnection requires fresh WebSocket authentication and resubscription, and message status changes synchronize to connected participant devices. Other cross-device behavior for sessions, edits, deletions, and sign-out remains **Open**. |

## 8. Core user workflows

These workflows describe required product outcomes. They do not prescribe screens, APIs, storage, or other implementation details. Unresolved behavior remains subject to Section 12.

### Discover and connect

1. An authenticated user discovers another user and views that user's public profile.
2. The user sends a connection request.
3. The recipient accepts or rejects the request.
4. On acceptance, the users become connected and may message one another.
5. On rejection, the requester may send another request after the cooldown has elapsed.

### Message a connection

1. A user opens a conversation with an accepted connection.
2. The user sends a private message.
3. Relay presents the applicable supported message status.
4. The author may edit or delete their own message.
5. If the recipient is offline, Relay supports delivery when the recipient can receive messages.

### Remove a connection

1. A user removes an accepted connection.
2. The users can no longer send new messages to one another.
3. The chat history remains preserved.

### Block a user

1. A user blocks another user.
2. The users can no longer message one another.
3. Neither user's profile is visible to the other.
4. Any accepted connection is terminated, pending requests are cancelled, and chat history is retained.
5. Unblocking restores profile visibility only; the users must establish a new accepted connection before messaging resumes.

## 9. Non-functional requirements

No numeric performance, availability, capacity, or retention targets have been confirmed. The requirements below specify observable quality outcomes without introducing such targets.

| ID | Requirement |
|---|---|
| NFR-001 | Relay must enforce profile-edit ownership and messaging eligibility consistently across all user-facing ways of performing those actions. |
| NFR-002 | Relay must preserve the association between a private message and its conversation participants so that the message is not presented as a conversation message to unrelated users. |
| NFR-003 | Relay must keep the supported message status labels distinguishable to users; it must not present one status as another. Status semantics and global recipient-device aggregation follow BR-009. |
| NFR-004 | Relay must preserve chat history when a connection is removed, as required by FR-009. |
| NFR-005 | Relay must persist messages independently of recipient connectivity and support recovery through REST conversation history and multiple active devices. Expiry, retry limits, availability, and delivery targets remain **Open**. |

## 10. Security and privacy requirements

| ID | Requirement |
|---|---|
| NFR-006 | Relay must restrict profile editing to the profile owner. |
| NFR-007 | Relay must restrict private conversation access to the conversation participants. |
| NFR-008 | Relay must prevent a user from sending messages to another user unless an accepted connection exists and no blocking rule prevents messaging. |
| NFR-009 | Relay must enforce blocking in both directions for messaging and profile visibility. |
| NFR-010 | Relay must not expose one user's private messages as public profile information. |
| NFR-011 | Relay must honor the profile's public visibility for authenticated users who are not blocked. Unauthenticated profile viewing is not allowed. |
| NFR-012 | Relay must not allow a user to edit or delete another user's message. |

The approved V1 REST authentication and account-access contract is recorded in the Backend Specification: email/password registration and login, JWT Bearer access tokens, independent revocable sessions, and rotating HttpOnly refresh-token cookies. Email verification and password recovery are out of scope. Data-retention periods, audit requirements, and regulatory commitments remain open.

## 11. Acceptance criteria

The following criteria provide externally observable checks for the V1 requirements. A criterion passes only when the described result is observed.

| ID | Acceptance criterion |
|---|---|
| AC-001 | Given an authenticated user, when they discover a user with no accepted connection, then they can view that user's public profile unless either user has blocked the other. (FR-002, FR-003, BR-001, BR-006) |
| AC-002 | Given two users, when one edits their own profile, then the edit is allowed; when they attempt to edit the other's profile, then the edit is not allowed. (FR-004, BR-002) |
| AC-003 | Given two users without an accepted connection, when one sends a connection request, then the recipient can accept or reject it. (FR-005–FR-007) |
| AC-004 | Given a rejected request, when the original requester retries before 168 hours have elapsed, then retry is denied with its UTC availability timestamp; at or after expiry, retry is allowed. A subsequent rejection starts a new 168-hour cooldown. (FR-008, BR-004) |
| AC-005 | Given an accepted connection, when either user sends a message and no block applies, then the other user can receive it as a private conversation message. (FR-011, BR-003, NFR-007, NFR-008) |
| AC-006 | Given users without an accepted connection, or users blocked from one another, when either user attempts to send a message, then no new message is sent to the other. (FR-010, FR-011, BR-003, BR-006) |
| AC-007 | Given an accepted connection with chat history, when either user removes the connection, then the history remains and neither user can send a new message to the other. (FR-009, BR-005) |
| AC-008 | Given two users, when one blocks the other, then messaging is prevented in both directions and neither can view the other's profile. (FR-010, BR-006) |
| AC-009 | Given a message authored by a user, when that author edits or deletes it, then the action applies to their message; another user cannot edit or delete it. (FR-012, FR-013, BR-007, NFR-012) |
| AC-010 | Given a message sent while its recipient is offline, when the recipient reconnects and restores the conversation subscription, then they can recover the persisted message through paginated REST history without server-side WebSocket replay. (FR-014, BR-008) |
| AC-011 | Given a message, Sending is transient; after persistence the message is Sent; acknowledgment by any recipient device advances it to Delivered, and recipient read acknowledgment advances it to Read without regression. Read acknowledgment also records delivery if needed; global status changes synchronize across recipient devices. (FR-015, BR-009) |
| AC-012 | Given a user with multiple active devices, Relay permits those devices to be active for the same user; reconnecting devices reauthenticate and resubscribe, and connected devices receive global message-status changes. Other cross-device behavior remains open under BR-010. (FR-016, BR-010) |

## 12. Assumptions, constraints, and open decisions

### Confirmed constraints

- This specification is product-level and implementation-independent.
- V1 includes the functional capabilities listed in Section 5.
- The confirmed decisions listed in the product context are treated as binding requirements here.
- No performance targets or additional business rules are inferred.

### Assumptions

- "User" in this specification means an authenticated Relay user unless a requirement explicitly discusses public profile viewing.
- "Connection" means a relationship established after a connection request is accepted.
- A "private message" is intended for the participants in the corresponding conversation, not for public profile display.

### Open decisions

The following items require product decisions before dependent details can be finalized:

1. Offline message expiry and retry behavior (BR-008).
2. Delivery availability targets beyond durable persistence and REST-history recovery (BR-008).
3. Cross-device behavior for profile and connection changes, edits, deletions, and sign-out (BR-010).
4. Additional account lifecycle workflows beyond the approved backend REST authentication contract (for example, email verification or password recovery), which remain out of scope unless separately approved.
5. Whether additional messaging capabilities or user-safety features are part of V1.
6. Performance, availability, scale, accessibility, data retention, and compliance targets.
7. User-facing content and notifications for connection and messaging events.
