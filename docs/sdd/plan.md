# Relay Development Roadmap

## Purpose

This roadmap sequences delivery of Relay V1 as defined in the [Root Product Specification](./spec.md). It is a product-level development plan, not a backend or frontend implementation plan. It introduces no additional product requirements, technologies, or delivery dates.

Work should proceed through the phases below in order. A phase may overlap with the next only when its listed dependencies are satisfied and the shared behavior is agreed.

## Development phases and implementation sequence

### Phase 1 — Resolve scope and prepare

**Sequence**

1. Confirm the V1 scope against the root specification.
2. Resolve or explicitly defer open decisions that affect the features about to be built. In particular, clarify authentication and account lifecycle expectations before relying on authenticated access; profile fields and visibility before finalizing profiles; and the rejected-request cooldown before verifying retries.
3. Define acceptance checks for any still-open behavior before it becomes a release dependency. Do not infer a rule from an open item.
4. Establish a shared verification approach and an integrated development environment suitable for exercising complete user workflows.

**Milestone M1 — V1 scope ready:** The team can trace planned work to the root specification, and any decisions needed for the initial capabilities are recorded.

### Phase 2 — User access, discovery, and profiles

**Sequence**

1. Deliver the authenticated-user prerequisite in line with the agreed account scope.
2. Deliver user discovery and public profile viewing (FR-002, FR-003).
3. Deliver profile editing with profile-owner-only access (FR-004, BR-002).
4. Verify the public-visibility and profile-field decisions before considering profile behavior complete.

**Dependencies:** Later connection and messaging workflows depend on users being available to discover. Connection and message authorization also depend on a reliable user identity and profile ownership boundary.

**Milestone M2 — Users discoverable:** An authenticated user can discover and view another user's public profile and edit only their own profile.

### Phase 3 — Connection lifecycle and safety controls

**Sequence**

1. Deliver connection requests and recipient acceptance or rejection (FR-005–FR-007).
2. Deliver retry after rejection once the cooldown rule is decided (FR-008, BR-004).
3. Deliver connection removal, preserving existing chat history and preventing new messages (FR-009, BR-005).
4. Deliver blocking, including bidirectional messaging prevention and mutual profile hiding (FR-010, BR-006).
5. Verify connection and block rules before enabling messaging.

**Dependencies:** Messaging depends on accepted-connection state. Removal and blocking must be applied to messaging eligibility; blocking must also be applied to profile visibility. Decisions about block effects on existing conversations, history, and pending requests are required to complete those affected behaviors.

**Milestone M3 — Connection controls complete:** Request, acceptance, rejection, retry, removal, and blocking satisfy their specified outcomes and are verified as messaging prerequisites.

### Phase 4 — Connected messaging

**Sequence**

1. Deliver private conversations and message sending for accepted connections only (FR-011, BR-003).
2. Verify that users without an accepted connection, removed connections, and blocked users cannot exchange new messages.
3. Deliver author-only message editing and deletion (FR-012, FR-013, BR-007) after deciding the user-visible outcomes of those actions.
4. Deliver the Sending, Sent, Delivered, and Read statuses (FR-015) after defining their event meanings and transitions (BR-009).

**Dependencies:** This phase depends on M2 identity and M3 connection eligibility. Editing and deletion depend on message authorship being distinguishable. Status behavior depends on its open definitions; do not treat labels alone as complete behavior.

**Milestone M4 — Connected messaging complete:** Users can privately message accepted connections, authors can edit or delete their own messages, and the agreed statuses behave as specified.

### Phase 5 — Offline delivery and multiple active devices

**Sequence**

1. Extend message delivery so a recipient can receive messages sent while offline (FR-014, BR-008).
2. Support more than one active device per user (FR-016, BR-010).
3. Verify status behavior and delivery in the presence of multiple active devices after resolving their interaction and aggregation rules.
4. Verify how profile, connection, message, edit, deletion, and sign-out state behave across devices to the extent required by the agreed scope.

**Dependencies:** This phase builds on connected messaging. Delivery guarantees, message expiry/retry behavior, status semantics, and cross-device behavior must be decided before their corresponding outcomes can be accepted.

**Milestone M5 — Delivery and devices verified:** Offline delivery and multiple active devices pass the agreed acceptance checks.

## Major milestones at a glance

| Milestone | Outcome | Depends on |
|---|---|---|
| M1 — V1 scope ready | V1 scope and decisions needed for upcoming work are clear. | Root specification review |
| M2 — Users discoverable | Authenticated users can discover and view profiles, with owner-only editing. | M1 |
| M3 — Connection controls complete | Connection lifecycle and blocking rules are usable and verified. | M2 |
| M4 — Connected messaging complete | Accepted connections can message; edit, delete, and status behavior is verified. | M3 and relevant open decisions |
| M5 — Delivery and devices verified | Offline delivery and multiple active devices are verified. | M4 and relevant open decisions |
| M6 — V1 release ready | Integrated acceptance, privacy/security checks, and release review pass. | M1–M5 |

## Feature dependency summary

- Authenticated user access is a prerequisite for the authenticated workflows in the specification; account lifecycle details remain open.
- Discovery and user identity precede connection requests.
- An accepted connection is required before new private messages can be sent.
- Connection removal and blocking must prevent new messages; blocking must also hide profiles.
- Message editing and deletion depend on identifying the author and require the open user-visible behavior to be decided.
- Offline delivery depends on message sending. Its guarantees and expiry/retry behavior remain open.
- Message statuses depend on agreed definitions of Sending, Sent, Delivered, and Read.
- Multiple active devices depend on user access and connected messaging; cross-device state and status rules remain open.
- Release acceptance depends on all V1 requirements and acceptance criteria in the root specification, including decisions for any open behavior included in release scope.

## Testing and verification strategy

1. **Requirement traceability:** Maintain a link between work items, tests, and the relevant FR, BR, NFR, or AC in the root specification. Treat unapproved behavior as a decision, not an implicit requirement.
2. **Feature verification:** Verify each capability as it is delivered: profile visibility and edit ownership; request, accept, reject, cooldown retry; removal and preserved history; blocking; messaging eligibility; author-only edits/deletions; statuses; offline delivery; and multiple active devices.
3. **Rule and boundary verification:** Test both allowed and denied outcomes, especially unauthorized profile edits, messaging without an accepted connection, messaging after removal, and messaging/profile visibility across a block.
4. **Workflow verification:** Exercise the complete discover-to-connect-to-message flow, as well as removal, blocking, offline receipt, and multi-device use.
5. **Integration verification:** Re-run affected workflows when connection state, privacy controls, message behavior, or device behavior are integrated. Ensure one user's private messages are not exposed to unrelated users.
6. **Acceptance verification:** Use the acceptance criteria in Section 11 of the root specification as the release checklist. Where an AC depends on an open decision, finalize that decision and its expected result before marking the criterion passed.
7. **Regression verification:** Re-run relevant existing checks after changes to shared identity, connection, or messaging behavior, with special attention to access restrictions and preserved chat history.

No numeric performance, availability, capacity, or retention targets are set by this roadmap; the root specification records these as open decisions.

## Integration and deployment stages

1. **Feature integration:** Integrate each phase's work into a shared product build and verify its stated milestone before treating the phase as complete.
2. **End-to-end integration:** After M5, verify the full V1 workflows together, including denied actions and state changes across connections, messages, and active devices.
3. **Release candidate verification:** Run the root specification's acceptance checks and privacy/security checks against an integrated release candidate. Confirm all release-scope open decisions have documented outcomes.
4. **Deployment readiness:** Review the release candidate against M6, confirm known limitations and unresolved decisions are documented, and prepare the agreed deployment and rollback procedures. Deployment mechanisms and rollout strategy are not specified here.
5. **V1 deployment:** Deploy only after release readiness is approved. Verify the deployed product against the agreed smoke checks for authenticated access, profile/connection behavior, private messaging, and offline/device workflows.

## Release gate

V1 is ready for release when:

- All in-scope requirements in the root specification have been implemented and verified against their acceptance criteria.
- Access rules for profile editing, private conversations, message authorship, connections, and blocking pass verification.
- Offline delivery and multiple active devices pass their agreed checks.
- Any open decision affecting V1 behavior has been resolved or explicitly excluded from the release scope with product approval.
- The integrated release candidate passes the release checks above.
