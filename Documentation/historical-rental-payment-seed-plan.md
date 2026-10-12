# Historical Rental and Payment Seed Plan

Status: approved; manifest, preview, SQL, and guide delivered.
Local PostgreSQL validation passed 39 checks. No shared database execution.

## Product Summary

Continue all 35 approved listing discussions with one owner-sent rental offer
each, accepted by the assigned prospective tenant. Populate monthly payment
history and the listing's tenant reference. Keep the existing assignments,
including owners renting other owners' properties.

The user approved coherent backdating of selected listings and discussions and
confirmed that rentals and payments are empty. That state must still be checked
by the eventual SQL. Do not change account creation dates, ownership, prices,
listing descriptions, amenities, requests, reviews, or the application schema.
Do not add termination events, arrears, refunds, or real money movement.

## Source Evidence

- The latest aggregate export contains 210 distinct message IDs.
- All 210 rows match the original enquiry manifest exactly, after normalizing
  timestamp formatting. Each expected message has exactly one match.
- Actual message IDs are mapped by discussion; do not assume sequential IDs
  within a conversation.
- Both participants' creation timestamps were checked for every proposed date.
  Several owners joined in August or September 2026; user 18 joined on
  5 October 2026. These accounts cannot support older history.
- The proposed acceptances cover every month from June 2025 to October 2026.
  Thirteen are in September 2026 and three in October 2026. Earlier dates are
  limited by account chronology, not by a need to keep the whole batch recent.
- Reviewed README, database schema policy, listing-enquiry architecture guide,
  Rentals and Payment models, PaymentService, RentalsService, and the chat
  payment/acceptance flow.
- The existing staged merge and unrelated files are outside this task.
- Source exports remain local inputs. Do not reproduce account credentials,
  contact information, email addresses, or profile URLs in deliverables.

## Architecture

Use one guarded SQL transaction to:

1. Verify the exported starting state and all selected records.
2. Backdate `created_at` on 34 selected listings, leaving listing 115 unchanged.
3. Update dates and necessary timing-related wording on their 204 discussion
   messages. Keep message IDs, participants, references, and snapshots unchanged.
4. Insert 35 rentals with `status = 'active'`, explicit creation and acceptance
   timestamps, agreed rent/deposit terms, and null `terminated_at` and
   `paymentHistory`.
5. Insert 35 owner-to-tenant chat rows with `message = 'Rental Offer'` and the
   generated rental ID. Listing/request references and snapshots remain null,
   matching the application's offer contract. Do not add a second rental-linked
   acceptance message: acceptance is represented by the rental's state.
6. Set the 35 listing tenant references to the stored rental tenants.
7. Insert the payment history below and verify every postcondition.

The eventual SQL must use the actual PostgreSQL column names and inspect
required column types, identity/default behavior, foreign keys, and the
pending/active rental uniqueness constraint. No schema repair is in scope.
Live endpoints are unsuitable for historical fixtures because they stamp the
current time. SQL creates the final accepted state atomically; it does not claim
to replay authenticated user actions or payment-provider events.

### Chronology

For the 34 adjusted discussions, let A be the proposed acceptance timestamp at
18:00 Singapore time on the date in the table:

- Listing creation: A minus four days.
- Opening enquiry: 14:20 on A minus three days, followed by the original
  0, 4, 11, 18, 26, and 35-minute message offsets.
- Offer creation and offer chat: 17:00 on A minus one day.
- Initial simulated payment: A minus one second.
- Acceptance and lease start: A.
- Expiry: lease start plus the specified number of calendar months.

Both users must exist before the enquiry, and the owner must exist before
listing creation. The stronger check that both users predate the new listing
timestamp also passed for this proposed schedule.

Revise mentions of November, December, "next month", and tentative weekdays
where necessary. Preserve the subject and natural tone of each discussion;
align move-in expectations with the proposed start, and do not claim a viewing
already happened when the conversation only arranged one.

For listing 115, preserve all six existing messages and the listing creation
timestamp exactly, including message 209. Propose the offer at 17:45 on
12 October 2026 and payment/acceptance at 17:59:59/18:00. Lease start is
1 November 2026 at 12:00, matching "next month"; expiry is 1 November 2028.
This is an accepted upcoming lease, not evidence that the tenant has moved in.
Setting its tenant reference follows the app's acceptance behavior, which
reserves the listing even before lease start.

No event may be in the future relative to execution, except contractual lease
starts and expiry dates. Refuse execution before the latest seeded event.
Use a fixed history cutoff of 12 October 2026, not the SQL execution date.

## Approved Payment Convention

- Monthly rent equals the exported asking price; no negotiated discounts.
- Set `depositPrice` to one month's rent as a simple demo contract term for
  every duration. This is not a claim about market or legal deposit standards.
- The current UI says "Pay deposit" but sends `rentalPrice` to monthlyPayment
  immediately before acceptance. The payment table has no type or billing-month
  column. Therefore do not fabricate separate deposit and first-rent rows.
- For each of the 34 already-started leases, the initial simulated payment
  counts as its start-month payment under the app's calendar-month convention.
  Add one full-rent payment at 10:00 on the first day of every subsequent
  calendar month, through October 2026. No proration, missed months, duplicates,
  or anniversary-date billing is modeled.
- For listing 115, record only the app-compatible initial simulated payment
  in October. Its lease has not started, so generate no monthly November rent
  or later payments. Do not label that October row as November rent or as a
  separately typed deposit: the schema cannot represent either distinction.
- Expected total: 225 payment rows, including 35 initial simulated payments
  and 190 subsequent monthly payments. All values equal their rental price.
- This produces paid-through-October histories for the 34 started leases.
  The upcoming lease is a documented exception, with an initial payment but
  no elapsed rental months. No app/payment-model changes are included.

## Proposed Assignment Schedule

Participant names and property details remain those in
`enquiry-discussions-preview.md`. IDs below identify the same assignments.
Lengths are a frozen, varied selection within 12-36 months, not values that
will be randomized again on rerun. All leases remain unexpired at the cutoff.

| Listing | Owner | Tenant | Accepted | Lease Start | Months | Expiry | Payments |
|---|---|---|---|---|---|---|---|
| 59 | 1 | 22 | 2026-04-08 | 2026-04-08 | 18 | 2027-10-08 | 7 |
| 61 | 2 | 23 | 2026-03-09 | 2026-03-09 | 24 | 2028-03-09 | 8 |
| 63 | 3 | 24 | 2026-09-22 | 2026-09-22 | 15 | 2027-12-22 | 2 |
| 66 | 4 | 25 | 2026-09-03 | 2026-09-03 | 30 | 2029-03-03 | 2 |
| 67 | 5 | 26 | 2025-06-20 | 2025-06-20 | 36 | 2028-06-20 | 17 |
| 69 | 6 | 27 | 2026-09-07 | 2026-09-07 | 12 | 2027-09-07 | 2 |
| 71 | 7 | 28 | 2025-07-08 | 2025-07-08 | 27 | 2027-10-08 | 16 |
| 73 | 8 | 29 | 2026-09-11 | 2026-09-11 | 21 | 2028-06-11 | 2 |
| 75 | 9 | 30 | 2026-09-02 | 2026-09-02 | 16 | 2028-01-02 | 2 |
| 77 | 10 | 31 | 2026-09-15 | 2026-09-15 | 33 | 2029-06-15 | 2 |
| 79 | 11 | 32 | 2026-09-18 | 2026-09-18 | 14 | 2027-11-18 | 2 |
| 81 | 12 | 33 | 2026-09-09 | 2026-09-09 | 26 | 2028-11-09 | 2 |
| 83 | 13 | 34 | 2026-09-14 | 2026-09-14 | 19 | 2028-04-14 | 2 |
| 87 | 15 | 35 | 2026-09-21 | 2026-09-21 | 31 | 2029-04-21 | 2 |
| 89 | 16 | 36 | 2026-09-16 | 2026-09-16 | 13 | 2027-10-16 | 2 |
| 90 | 16 | 37 | 2026-09-24 | 2026-09-24 | 28 | 2029-01-24 | 2 |
| 91 | 17 | 38 | 2026-09-28 | 2026-09-28 | 22 | 2028-07-28 | 2 |
| 93 | 18 | 39 | 2026-10-10 | 2026-10-10 | 17 | 2028-03-10 | 1 |
| 95 | 21 | 40 | 2025-09-09 | 2025-09-09 | 25 | 2027-10-09 | 14 |
| 97 | 22 | 41 | 2026-05-06 | 2026-05-06 | 20 | 2028-01-06 | 6 |
| 99 | 23 | 42 | 2025-08-07 | 2025-08-07 | 32 | 2028-04-07 | 15 |
| 101 | 24 | 43 | 2026-10-06 | 2026-10-06 | 12 | 2027-10-06 | 1 |
| 103 | 25 | 44 | 2025-10-08 | 2025-10-08 | 29 | 2028-03-08 | 13 |
| 105 | 26 | 45 | 2025-11-06 | 2025-11-06 | 23 | 2027-10-06 | 12 |
| 107 | 27 | 46 | 2025-12-09 | 2025-12-09 | 18 | 2027-06-09 | 11 |
| 109 | 28 | 47 | 2026-01-07 | 2026-01-07 | 35 | 2028-12-07 | 10 |
| 111 | 29 | 48 | 2025-07-22 | 2025-07-22 | 24 | 2027-07-22 | 16 |
| 113 | 30 | 49 | 2026-02-05 | 2026-02-05 | 16 | 2027-06-05 | 9 |
| 115 | 31 | 2 | 2026-10-12 | 2026-11-01 | 24 | 2028-11-01 | 1 |
| 117 | 32 | 51 | 2025-08-21 | 2025-08-21 | 30 | 2028-02-21 | 15 |
| 119 | 33 | 52 | 2026-03-05 | 2026-03-05 | 15 | 2027-06-05 | 8 |
| 121 | 34 | 53 | 2026-04-09 | 2026-04-09 | 34 | 2029-02-09 | 7 |
| 123 | 35 | 54 | 2026-06-08 | 2026-06-08 | 21 | 2028-03-08 | 5 |
| 125 | 36 | 55 | 2026-07-07 | 2026-07-07 | 13 | 2027-08-07 | 4 |
| 127 | 37 | 56 | 2026-08-06 | 2026-08-06 | 36 | 2029-08-06 | 3 |

## UX Summary

No interface redesign or frontend changes. Existing listing-linked enquiries
remain visible above their text bubbles; offers use existing accepted cards.
Verify chat ordering after backdating, exact offer-card property/tenant identity,
tenant overview payments, and owner dashboard monthly series.
The future start for listing 115 must not be presented as an elapsed tenancy
in validation claims. Any existing dashboard interpretation is documented,
not silently changed by this data task.

## Transaction Safeguards

- Default to dry run with a single explicit apply setting.
- Require a fresh verified backup and paused writers for the shared run.
- Use bounded lock/statement timeouts and deterministic table locking.
- On first application, require empty rentals/payment tables, exact selected
  chat history, unchanged selected listing facts, eligible users, and vacancy.
- Compare all 210 source rows by actual IDs and complete expected values,
  including exact preservation of the six listing-115 messages.
- Abort on missing/duplicate messages, new messages for selected pairs,
  changed dates/text, changed ownership/price/flags, occupied listings,
  unsupported schema, or inconsistent rental constraints.
- Use generated IDs for all new rows and preserve existing IDs/sequences.
  Explain that a rolled-back insert can consume identity values.
- Keep unrelated rows unchanged. Fingerprint protected tables and untouched
  columns/rows before and after; an unexpected trigger side effect must roll
  back the transaction.
- Detect the exact completed batch before testing first-run empty tables.
  A complete unchanged batch is a no-op, including when unrelated later
  records exist. A partial or altered batch aborts; never repair it silently.
- No permanent tracking tables, deletes, truncation, disabling constraints,
  broad upserts, sequence resets, or credentials embedded in SQL.

Expected first-run changes: 34 listing creation timestamps, 35 listing tenant
references, 204 existing message dates with explicitly previewed text edits,
35 new offer messages, 35 rentals, and 225 payments. Total chat count becomes
245 when starting from the supplied 210 rows. Preserve the other 34 listings.

## Tickets

### HIST-1: Freeze Historical Manifest and Dialogue Preview

- Owner: Backend Engineer; Product Owner owns terms/scope; Architect reviews
  chronology and contracts; Tech Lead coordinates.
- Priority: P2.
- Scope: exact before/after mappings, schedule above, offer and payment records.
- Dependencies: approval of this plan.
- Implementation notes: frozen values, actual source message IDs, safe
  non-sensitive metadata, review every timing-related dialogue change.
- Acceptance criteria: all 35 assignments intact; 12-36-month terms; chronology
  valid against both accounts; 115 unchanged; exact payment count/totals.
- Validation: QA immediately checks all mappings, lengths, chronology, monthly
  coverage, non-expiry, uniqueness, and preservation before HIST-2 starts.
- Documentation impact: readable final preview plus machine-readable manifest.

### HIST-2: Implement Guarded SQL and Isolated Validation

- Owner: Senior Backend Engineer; QA Engineer owns validation; Tech Lead reviews.
- Priority: P2.
- Scope: transactional seed, dry-run report, rerun/refusal rules, verification.
- Dependencies: HIST-1 and its QA acceptance.
- Implementation notes: inspect target-compatible schema; use generated IDs;
  match before/after states exactly; preserve protected data and constraints.
- Acceptance criteria: exact intended changes only; dry run writes no business
  rows; repeated apply creates nothing; any failed guard rolls back all changes.
- Validation: QA immediately tests first apply, dry run, repeated apply, partial
  batches, source drift, recent accounts, future timestamps, occupied listings,
  nonempty starting rental/payment tables, duplicate offers/payments, missing
  constraints, identity collisions, lock failure, and trigger side effects.
  Test supported timestamp types using explicit Singapore interpretation.
- Documentation impact: SQL, expected counts/totals, validation results.

### HIST-3: Runbook and Application Handoff

- Owner: Technical Writer; QA Engineer validates instructions and release gates.
- Priority: P2.
- Scope: backup, preview, dry run, apply, verification, and app spot checks.
- Dependencies: HIST-2 and its QA acceptance.
- Implementation notes: distinguish local validation from shared execution;
  include per-rental monthly counts and aggregate payment totals.
- Acceptance criteria: user can run the whole SQL with one clear apply setting;
  limitations and pre/post-commit recovery are explicit; no shared execution
  claimed without evidence.
- Validation: QA cross-checks the guide against tested script output. Following
  user execution, inspect an old rental, a recent-account rental, owner-as-tenant
  assignments, and listing 115's upcoming lease.
- Documentation impact: final guide and note that the old enquiry seed must
  not be rerun after backdating; its exact-match assumptions are superseded.

Execution order: approval -> HIST-1 -> QA gate -> HIST-2 -> QA gate -> HIST-3
-> user-controlled Supabase dry run/apply -> application checks.
Role assignments do not imply that separate agents have already run reviews.

## Validation Status and Approval

Completed planning checks: 210/210 exact source-message matches, unique actual
IDs, all account-date bounds, proposed expiry dates, and 225 payment-row count.
These are read-only planning checks, not SQL or live application validation.

The user approved the schedule and these concrete defaults before implementation:
asking-price rents; one-month deposit terms without a separate deposit payment;
calendar-month payments through October; and listing 115 accepted in October
with a November start and one initial simulated payment.

No additional data export is needed unless implementation preflight finds
schema ambiguity or changes since the supplied snapshots.

## Delivery Results

- HIST-1 complete: `historical-rentals.json` and
  `historical-rentals-preview.md` preserve every source message ID and all six
  listing-115 messages. The 204 redated messages include 78 timing-related text
  changes. Validation confirmed all assignments, context, message lengths,
  account chronology, 17 acceptance months, 12-36-month terms, and no expired
  leases at the cutoff.
- HIST-2 complete: `seed-historical-rentals.sql` defaults to dry run. It updates
  only the approved existing fields, creates 35 rentals/35 offers/225 payments,
  and verifies S$1,031,250 in payment history. Exact completed runs are no-ops;
  changed or partial states are refused.
- HIST-2 QA: all 39 isolated PostgreSQL 18.6 checks passed, covering successful
  execution, reruns, drift, partial/duplicate records, schema safeguards,
  generated IDs, trigger side effects, timestamp types, malformed monthly
  schedules, future events, and lock contention. Scratch databases were dropped.
- HIST-3 complete: `historical-rentals-guide.md` documents backup, dry-run/apply
  settings, expected results, independent queries, app checks, recovery, payment
  semantics, checksums, and the superseded enquiry script.
- Role responsibilities and QA gates were handled in the current session;
  separate agents were not launched.
- Remaining deployment gates: user-controlled Supabase dry run/apply and
  application spot checks. No application source, staged merge, credentials,
  account timestamps, or shared database rows were changed by this delivery.
