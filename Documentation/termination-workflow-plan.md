# Lease Termination Workflow

Status: Implemented; automated QA passed. Native/responsive visual verification remains partial.
Date: 2026-10-12. Branch: `rental-termination` from `main`.
Planning owners: Product Owner, Software Architect, Tech Lead. No further approval gate.

## Approved Scope

Repair the existing owner-submits, tenant-decides workflow. Tenant acceptance ends the
active lease immediately; rejection leaves it active. Preserve tenant identity and make
the decision atomic. Include working rejection, request-specific card state and polish,
refund validation, participant permissions, and duplicate guards.

Excluded: tenant initiation, scheduled termination, refund tables or settlement tracking,
billing changes, re-letting, multi-request redesign, schema changes, and existing-data repair.

## Workflow and UX

1. Owner opens Inbox -> property -> Manage Tenant -> tenant (Tenant Overview) -> Terminate Lease.
2. Choose Refund tenant with a positive whole-dollar SGD amount, or No refund (`0`).
   Cents, negative amounts, invalid numbers, and amounts outside supported integer limits
   are invalid; the existing API uses Java `long`, not decimal money.
3. Submit the request and open the tenant chat. Submission alone does not terminate the lease.
4. Tenant uses Accept or Reject on that request's card. Acceptance ends the lease immediately;
   rejection leaves the rental unchanged. The owner cannot decide their own request.
5. Both participants see the persisted outcome. A refund amount is an agreement only:
   RentNest does not transfer funds, create a payment row, or confirm a refund was processed.

Cards use their own request with server-derived rental details, clear status text, readable amount hierarchy,
and accessible actions without nested chat-bubble clutter. Include loading, retry, error,
and busy states; disable duplicate actions and hide decision controls after a final outcome.

## API and Persistence

| Action | Contract and effect |
| --- | --- |
| Create (existing path) | `POST /api/requests/terminationrequest/{rentalid}/{refundAmount}`; authenticated rental owner only; active rental; atomically creates a `Pending` request and linked chat message. |
| Read | `GET /api/requests/{id}`; rental participants only. |
| Decide (new) | `POST /api/requests/{id}/decision` with `{"decision":"accept"}` or `{"decision":"reject"}`; authenticated rental tenant only; returns the persisted request. |
| Accept | Request status becomes `terminated`; rental status becomes `terminated` and `terminatedAt` is set in the same transaction. Tenant identity and other rental terms are preserved. |
| Reject | Request status becomes `rejected`; rental status, timestamp, and tenant identity remain unchanged. |

The server owns transitions, validates decisions and amounts, locks the rental for competing
commands, and prevents legacy mutation routes from bypassing the workflow. Repeating the
same completed decision returns its outcome; an opposite decision conflicts. Invalid input,
missing authentication, forbidden access, missing records, and state conflicts use appropriate
400/401/403/404/409 responses. Neither decision inserts a `payment` row.

**Retained limitation:** the unchanged one-to-one schema permits one retained request per
rental, including a rejected request. Rejection does not allow another proposal for that rental.
Duplicate creation conflicts even after rejection. Existing inconsistent records are not repaired
by this change; an inconsistent accepted outcome can require separate reconciliation.

## Tickets

Priorities are Product Owner assignments; Tech Lead coordinates execution.
Implementation and automated acceptance checks are complete; platform gaps are listed below.

### TERM-01: Atomic Backend Workflow

- Owner: Senior Backend Engineer. Priority: P0. Status: implemented; independent QA passed.
- Scope: existing creation path, decision endpoint, tenant preservation, permissions, validation, duplicate and legacy-write guards.
- Dependencies: approved scope; existing request/rental schema.
- Implementation notes: authenticated actor, rental lock, transactional creation/decision, exact persisted statuses; no payment writes or data repair.
- Acceptance: only owner creates and tenant decides; accept is immediate and atomic; reject preserves rental; duplicate/conflicting actions cannot corrupt identity or state.
- Validation: QA checks role matrix, invalid inputs, rollback, concurrent/repeated decisions, duplicate creation after rejection, and unchanged payment rows.
- Documentation impact: API, persistence, and retained limitations in this plan and frontend guide.

### TERM-02: Form and Request Card

- Owner: Senior Frontend Engineer; Frontend Engineer implements with UI/UX Designer guidance. Priority: P1. Status: implemented; automated QA passed; visual checks partial.
- Scope: existing owner entry, whole-dollar form, request-specific cards, working Accept/Reject, accessible styling and error/busy states.
- Dependencies: TERM-01 contract; approved existing navigation.
- Implementation notes: bind actions to the card request ID and linked rental; call the decision endpoint, never send replacement tenant/rental data.
- Acceptance: correct card updates after either decision; positive integer refund or explicit zero; owner cannot decide; loading/failure/duplicate taps are handled; status never claims payment.
- Validation: QA checks request-only messages, independent cards, reload persistence, wrong-role controls, invalid amounts, failures/retries, narrow layouts and accessibility.
- Documentation impact: owner navigation, tenant actions, amount rules and limitations in `frontend/README.md`.

### TERM-03: QA and Release Validation

- Owner: QA Engineer; Tech Lead owns release decision. Priority: P1. Status: automated checks passed; platform validation limits documented.
- Scope: immediate per-ticket acceptance checks, integrated journeys and focused regression evidence.
- Dependencies: validate TERM-01 and TERM-02 as each is handed off; documentation review after TERM-04.
- Implementation notes: use isolated fixtures; record actual commands/results and platform gaps; main coordinator updates final validation.
- Acceptance: each ticket has acceptance evidence; no unresolved blocking defects; excluded behavior is not introduced.
- Validation: run the checklist below plus offer/chat/payment regressions; report failures before closing tickets.
- Documentation impact: final evidence and remaining gaps, pending main coordinator update.

### TERM-04: Approved Documentation

- Owner: Technical Writer. Priority: P2. Status: documentation updated and checked against implementation.
- Scope: only `Documentation/termination-workflow-plan.md` and `frontend/README.md`.
- Dependencies: approved scope and current TERM-01/TERM-02 contracts.
- Implementation notes: replace superseded proposals; preserve unrelated frontend guide content; no commits or other file changes.
- Acceptance: concise scope/tickets, accurate route/API/statuses/refund rules, explicit rejection limitation and exclusions.
- Validation: compare docs with current changes and approved scope; QA/main coordinator confirms final accuracy.
- Documentation impact: these two files only.

## Execution and Validation Checklist

Sequence: TERM-01 and TERM-02 coordinate on the contract; QA validates each immediately
on handoff. TERM-04 documents current behavior. TERM-03 closes only after integrated
validation and the main coordinator's final update. No open product decisions.

- [x] Approved owner-only, immediate-decision scope recorded.
- [x] Documentation updated within the two-file ownership boundary.
- [x] Backend acceptance: authorization, atomicity, identity preservation, rollback and conflicts.
- [x] Frontend automated acceptance: owner submit, tenant accept/reject, separate cards, reload and errors.
- [x] Whole-dollar positive refund and No refund `0`; invalid/decimal/oversized inputs rejected.
- [x] One retained request enforced, including after rejection; decisions do not call payment persistence.
- [ ] Narrow-screen/accessibility checks and offer/chat/payment regression checks.
- [x] QA findings addressed and main coordinator records final validation results.

## Validation Results

- Java 21: `mvn '-Dtest=*Test,*Tests,!OpenRouterLiveTest' test` passed 215 tests.
  Includes 47 real-service termination tests on disposable H2 for identity preservation,
  permissions, concurrency, rollback, rejection, and generic-update regressions.
- Two unrelated OpenRouter live tests failed TLS certificate-chain validation during the
  full run and were excluded from the passing run. PostgreSQL-specific locking was not tested.
- Frontend: `./node_modules/.bin/jest --config jest.termination.config.cjs --runInBand`
  passed 62 tests across three suites, using mocked native components and HTTP.
- Independent QA found and verified fixes for an overly broad rental-update guard,
  stale form-load responses, post-unmount navigation, and misleading ended-offer labels.
- Read-only browser checks at 878 x 489 verified owner navigation, form validation,
  and an existing Accepted card's content. Screenshot capture failed in the browser renderer.
  The Android emulator session could not load chats due to API errors, so native card
  screenshots, small-screen/large-text visual checks, and iOS verification remain outstanding.
- UI detector reported no findings. This is not a substitute for the outstanding visual checks.
- No shared database writes, schema migrations, historical data repairs, commits, or pushes performed.

The new endpoint requires the updated backend; deploy/restart backend and frontend together.
Generic request writes are now rejected in favor of the authorized creation/decision commands.
Protected rental fields cannot be changed through generic updates, but owner-authorized
payment-history-only updates with unchanged rental terms remain supported.
