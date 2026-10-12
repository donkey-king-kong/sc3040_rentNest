# Listing Enquiries and Offer Selection

Status: approved by the user and implemented on `rental-termination`.
Local automated and isolated web validation are recorded in
`listing-enquiry-offer-guide.md`; native-device and shared-database deployment
checks remain release gates.

## Product Summary

Make it clear which property a prospective tenant is enquiring about and which
property an owner offers. Keep one conversation per user pair, with any number
of listing-specific enquiry messages. A user may own properties and rent from
another owner; permissions depend on the selected listing, not a global role.

Product Owner priorities: P1 for persistent enquiry context and correct offer
creation/acceptance and successive rental history; P2 for rollout documentation. No demo-data insertion,
review-policy change, conversation redesign, or payment-business-rule change.

User stories:
- As a prospective tenant, I can enquire about two properties in the same chat
  and both parties can distinguish the enquiries after reopening it.
- As an owner, I can offer one of my eligible properties, including a property
  not previously enquired about, and confirm its identity before sending.
- As a recipient, I can accept the exact offer shown, even when other offers
  exist in the conversation.
- As an owner, I can re-let a property after termination without overwriting its
  previous tenancy, messages, requests or payments.
- As a chat participant, I can identify an enquired-about property from its saved
  name/address even after the property is renamed or deleted.

## Source-Grounded Architecture (Pre-Implementation Findings)

- `HomeListingScreen.handleChat` currently passes only the participant IDs.
- `ChatHistory` stores sender, receiver, text, date, and optional rental/request
  references. It has no listing reference or separate conversation entity.
- `ChatHistoryRepository` groups messages by participant pair.
- `ChatsScreen2` uses `listing[0]` when sending an offer. Its listing-ID endpoint
  includes properties the user owns OR rents, so it cannot define eligibility.
- Offer cards currently share a single `rental` state. Multiple fetches overwrite
  it; rendering and acceptance must be keyed by each message's rental ID.
- `Rentals.listings` is one-to-one. A listing with any rental history cannot
  receive another rental row under the current unique constraint. Replace this
  relationship with many-to-one and enforce uniqueness only for current rentals.
- `RequestsService.decideTermination` currently preserves listing occupancy
  when marking the rental terminated. Re-letting requires clearing current
  occupancy transactionally while retaining the rental's historical tenant ID.
- Rental lookups by listing and by listing/tenant return a single Optional.
  TenantOverview and tenant-payment reads depend on these lookups; explicitly
  distinguish current tenancy from historical rental IDs, including when the
  same tenant rents the same property again.
- Offer creation already writes a rental and chat card transactionally, but
  needs authenticated ownership, recipient, eligibility and input validation.
- Acceptance must use the stored recipient and listing, not replacement IDs
  supplied by the client.
- The build has no Flyway dependency. Files in `db/migration` alone do not
  guarantee execution; provide an explicit SQL migration and rollout steps.

### Data and API Contracts

1. Add nullable `chathistory.listingid`, a many-to-one foreign key to
   `listings.listingid`, with a nonunique index. Many enquiries may reference
   the same property. Also add nullable `listing_name_snapshot` and
   `listing_address_snapshot`. Existing rows remain null; no historical inference.
2. Use `ON DELETE SET NULL` for the new enquiry reference. Enquiries and snapshot
   fields survive deletion. A real snapshot distinguishes an unavailable enquiry
   from an ordinary text message after its listing reference becomes null.
   Do not cascade deletion into chats, rentals, requests or payments.
3. Extend chat creation with optional `listingID`; expose `listingId` and a
   compact snapshot plus current availability in responses. Copy name/address
   from the server's listing record in the message-creation transaction; reject
   or ignore client-supplied snapshot fields. Never refresh saved snapshots from
   later listing edits. An offer uses current server-validated property data.
4. An enquiry is sent by an authenticated user to the referenced property's
   owner, never to themselves. Reject invalid/deleted listings, wrong recipients,
   sender impersonation, and enquiry payloads mixed with rental/request links.
   Ordinary text remains supported. Opening chat performs no message write.
5. Proposed `GET /api/rentals/offer-options?recipientID=...` uses the authenticated
   sender. Return property ID/name/address and whether the recipient previously
   sent a listing-linked enquiry about it in this conversation.
6. Eligible properties: owned by the caller, unflagged, vacant, and without a
   pending or active rental. Terminated history alone does not block an offer.
   A flagged owner is not eligible. Recipient must exist and differ
   from caller; owning properties does not disqualify the recipient.
7. Revalidate eligibility under a listing-row lock when creating an offer.
   Keep rental/card creation atomic and reject conflicting submissions with a
   clear conflict response. A partial unique index remains the final safeguard.
   Audit overlapping rental write paths for bypasses of these invariants.
8. Retain existing offer routes where practical. Authenticate the sender and
   verify any legacy sender/tenant fields against the authoritative identities.
   Validate positive supported monetary values and valid ordered lease dates.
9. Accept only as the stored tenant, lock/revalidate the pending rental and
   listing, and update rental/listing atomically. Never replace tenant identity
   from the submitted body. No acceptance success UI on failure.
10. Replace only the global unique constraint on `rentals.listingid`; keep the
    foreign key and unrelated constraints. Map Rentals.listings as many-to-one,
    and create the following PostgreSQL index:

    ```sql
    CREATE UNIQUE INDEX uq_listing_current_rental
    ON public.rentals (listingid)
    WHERE status IN ('pending', 'active');
    ```

    Enforce non-null, canonical rental statuses (`pending`, `active`, `terminated`)
    with a database check, so null or unexpected status values cannot bypass the
    index. Preflight existing values, associations, occupancy and duplicates;
    abort and report inconsistencies rather than silently repair them. No change
    to request status vocabulary. New rental lifecycle states need an explicit
    future migration and corresponding application behavior.
11. On accepted termination, under a consistent shared lock order, confirm
    current occupancy matches the rental tenant, clear listings.tenantuserid,
    and update rental/request together. Preserve rentals.tenant_userid, dates,
    payments and messages. Rejection leaves occupancy and active rental unchanged.
    A replay of an old decision must not clear a later tenant or change history.
12. Define current listing lookup as the single pending/active rental, not an
    arbitrary historical row. Current tenant/payment screens resolve the active
    rental and verify the tenant; historical cards/actions use exact rental IDs.
    Keep payment records attached to their original rental; never combine two
    tenancies because listing and tenant IDs happen to match. Adapt affected
    tenant-management, termination-entry and payment-screen consumers together.
13. Deletion: enquiry-only references must not block authorized deletion. Handle
    disposable listing-owned caches/views transactionally as appropriate after
    checking their actual FKs; preserve unrelated listings and their data. Keep
    deletion blocked with a clear conflict for properties with rental history,
    including pending/active rentals, to preserve existing rental references.
    Supporting removal of rental-backed listings requires a separate archival
    design; snapshots alone do not solve all existing foreign-key dependencies.

## UX Summary

Visitor mode: Operate. Preserve the existing React Native/Expo chat appearance.
No new image assets, design-system replacement, or unrelated screen polish.

- Message Owner opens the existing chat with a removable property attachment
  above the composer. Validate the route property against server data.
- A sent enquiry displays its property name/address with its text, separately
  from ordinary message grouping. The attachment survives reload and retry.
  Sent previews use the saved snapshot, not mutable listing titles.
- Sending clears the attachment only on success. Opening/reopening or cancelling
  the composer never sends an enquiry automatically.
- The owner can start an offer from an enquiry, preselecting that property if
  still eligible, or use the general form with no implicit selection.
- Selector groups: "Enquired-about properties" then "Other properties you own".
  Each option shows name/address. No eligible properties produces an explanation,
  not an empty enabled submit form.
- Show selected property, recipient, rent, deposit and lease dates before send.
  Preserve input on errors; disable duplicate taps while a request is pending.
- Each offer card, acceptance action, and associated existing payment modal
  uses that card's rental ID and displays its property and recipient correctly.
- A property that became unavailable is explained and cannot be silently
  replaced by the first option. Existing enquiries remain readable.
- Deleted listings retain the saved preview labelled "Listing no longer
  available"; disable its property navigation. A stale direct link handles 404
  gracefully. A failed deletion must not make the UI pretend the listing vanished.
- Pending/active properties cannot be selected. Accepted termination makes a
  property eligible again when it is otherwise available.
- Include loading/retry states, long property names, keyboard-safe modal layout,
  screen-reader labels, explicit selected states, and adequate touch targets.

## Tickets and Assignments

### ENQ-00: Successive Rental History and Current-Tenancy Integrity
- Owner: Senior Backend Engineer, paired with Senior Frontend Engineer for
  affected consumers. Priority: P1. Complex ticket.
- Scope: guarded rental schema migration, many-to-one mapping, current/history
  query semantics, atomic occupancy release, and affected tenant/payment screens.
- Dependencies: approval of this revised plan.
- Implementation notes: partial unique index plus canonical non-null status
  check; inspect actual constraint names before removing only global listing
  uniqueness; use consistent locking across offer, acceptance and termination.
  No rewrite/delete of old rentals or automatic correction of existing bad data.
- Acceptance criteria: terminated A followed by pending/active B is allowed;
  two pending/active rows for one listing fail even via direct SQL; A's history
  remains intact; repeated old termination cannot affect B; current screens show
  the current tenant and current rental's payments, including repeat tenants.
- Validation: PostgreSQL migration/re-run/rollback and concurrent-write tests,
  invalid-status rejection, unchanged historical rows, JPA restart without
  recreation of global uniqueness, API and affected frontend regression tests.
- Documentation impact: schema constraints, current versus history semantics,
  migration preflight and irreversible-data-shape rollback limitations.

### ENQ-01: Persist Listing-Linked Enquiries
- Owner: Backend Engineer. Priority: P1.
- Scope: migration, ChatHistory model/DTO/service/controller/repository updates,
  server-derived immutable snapshots and deletion behavior.
- Dependencies: approved plan.
- Implementation notes: nullable many-to-one with SET NULL, two snapshot fields,
  explicit migration, no data reset; authenticated sender and recipient
  validation; preserve plain-text contracts and rental-history deletion guards.
- Acceptance criteria: two enquiries can reference different listings in one
  chat; repeated enquiries to one listing work; existing rows stay unchanged;
  malformed/unauthorized enquiries fail without writes; listing edits/deletion
  leave snapshots intact; only genuinely permitted deletions succeed.
- Validation: migration on disposable PostgreSQL, repeated migration, FK/index
  checks, existing-row comparison, concurrent enquiry/deletion tests, immutable
  snapshot checks, cache/view dependency checks and ordinary chat regressions.
- Documentation impact: schema, chat payload and deletion behavior notes.

### ENQ-02: Prepare and Display Enquiries
- Owner: Frontend Engineer. Priority: P1.
- Scope: HomeListingScreen navigation, chat composer attachment and enquiry
  message presentation; use existing visual patterns.
- Dependencies: ENQ-01 API contract and validation.
- Implementation notes: carry property ID in navigation; keep attachment state
  scoped to conversation/draft; retain it in failed-send retry payloads.
- Acceptance criteria: opening sends nothing; removing sends plain text;
  A/B enquiries persist separately; changing chat does not leak attachments;
  deleted-property previews remain readable and cannot navigate to a live detail.
- Validation: component tests for navigation, send/remove/retry and reload;
  narrow-screen and keyboard/accessibility inspection.
- Documentation impact: tenant enquiry workflow.

### ENQ-03: Owner-Only Offer Options and Safe Decisions
- Owner: Senior Backend Engineer. Priority: P1. Complex ticket.
- Scope: eligibility endpoint, transactional offer creation checks, authenticated
  acceptance tied to stored participants, and relevant competing-write guards.
- Dependencies: ENQ-00 for current-rental constraints; ENQ-01 for enquiry grouping.
- Implementation notes: do not reuse the owner-or-tenant listing-ID query;
  preserve current-rental uniqueness, lock/recheck, return explicit
  400/403/404/409 errors.
- Acceptance criteria: only eligible owned properties appear; unrelated owned
  properties remain selectable; wrong-owner/self/spoofed/conflicting offers fail;
  only stored tenant can accept; failure leaves both rental and listing unchanged;
  previously terminated properties can receive new offers without history loss.
- Validation: service/controller tests, concurrent offer attempts in PostgreSQL,
  rollback tests, stale options, dual-role users and repeated acceptance.
- Documentation impact: endpoint, eligibility and successive rental behavior.

### ENQ-04: Explicit Selection and Independent Offer Cards
- Owner: Senior Frontend Engineer. Priority: P1. Complex ticket.
- Scope: grouped property selector, confirmation context, per-rental-ID card
  state and explicit selected-offer state for acceptance/payment dialogs.
- Dependencies: ENQ-02 and ENQ-03.
- Implementation notes: remove `listing[0]`; prevent asynchronous rental fetches
  from changing another card's data or the active modal's target.
- Acceptance criteria: general form requires selection; enquiry action preselects
  only an eligible property; two cards display/action their own rentals; failed
  send/accept retains useful state and never reports success.
- Validation: component tests with out-of-order fetch completion, two offers,
  reversed owner/tenant roles, stale availability, errors and duplicate taps;
  regress existing termination and payment UI without changing payment semantics.
- Documentation impact: owner offer and tenant acceptance workflow.

### ENQ-05: Per-Ticket QA and End-to-End Validation
- Owner: QA Engineer. Priority: P1.
- Scope: independently check each implementation ticket when handed off, then
  test the combined enquiry-to-offer flow.
- Dependencies: starts with ENQ-00, repeats after each ticket; final gate after
  ENQ-04. Do not defer all QA until the end.
- Implementation notes: isolated test databases/accounts; no writes to the shared
  Supabase database during automated tests; inspect existing native UI before edits.
- Acceptance criteria: each ticket has recorded pass/fail evidence; no wrong
  listing/recipient/card mutations; legacy chats and termination remain usable;
  a complete A-termination-to-B-tenancy scenario passes; deleted enquiry-only
  property snapshots survive without deleting history.
- Validation: Java 21 offline backend suite, focused frontend tests via existing
  Jest configuration, then Expo web and available native-device checks. One
  batched visual inspection and at most one post-fix confirmation pass.
- Documentation impact: validation results and any untested platform limitations.

### ENQ-06: Deployment and Handoff
- Owner: Technical Writer. Priority: P2.
- Scope: explicit migration/rebuild order, API/workflow notes, verification
  queries, rollback limits and known constraints.
- Dependencies: validated ENQ-00 through ENQ-04; final QA results.
- Implementation notes: back up first; stop old writers and coordinate explicit
  migration with updated backend deployment; old Hibernate mappings must not
  recreate global rental uniqueness. A rollback cannot restore one-to-one
  uniqueness after multiple historical rentals exist without reconciliation.
  Never automatically remove historical rows to make rollback possible.
- Acceptance criteria: another developer can deploy and verify without clearing
  chats, listings, amenities, users or existing rental records.
- Validation: QA reviews runbook against actual migration and implementation.
- Documentation impact: README link and dedicated feature/deployment guide.

## Execution and Review Gates

Tech Lead sequence: approve -> ENQ-00 -> QA -> ENQ-01 -> QA -> ENQ-02 -> QA -> ENQ-03 -> QA ->
ENQ-04 -> QA -> combined validation -> ENQ-06 documentation review.
Product Owner approves scope changes; Tech Lead resolves engineering tradeoffs.
Role assignments do not imply that separate sub-agent threads have been launched.

No application code, database migration, new seed data, push or merge is
performed during this planning step.

## Agreed Direction and Remaining Boundaries

- Allow successive historical rentals, with only one pending/active rental per
  listing enforced in the database and backend.
- Save name/address snapshots on enquiry messages; SET NULL preserves previews
  when an otherwise deletable listing is removed.
- Rental-backed listings remain protected from hard deletion. This is separate
  from the enquiry FK, which no longer prevents deletion.
- Include per-offer acceptance targeting and backend participant checks because
  explicit selection alone would still allow wrong-card actions.
- Do not implement the currently inactive offer-decline feature, change review
  eligibility, add real payments, or seed chats/reviews/rentals in this task.
  Consequently an unresolved pending offer keeps its property unavailable;
  cancellation/decline/expiry behavior is a separate follow-up, not an automatic
  release or a reason to delete rental history.
- Use the current branch unless the user requests a separate feature branch.

Open product questions: none. The complete revised scope and these boundaries
were approved before implementation.
Final amenity fingerprint verification is still pending a post-run export and
is independent of this feature.
