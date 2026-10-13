# Enquiry Discussion Seed Plan

Status: approved; dataset, SQL, and guide prepared and locally validated.
Shared database execution has not been performed.

## Product Scope

Populate realistic pre-offer discussions for 35 of the 69 exported listings
(half rounded up). Assignments below are prospective interest only: do not set
`listings.tenantuserid`, create rentals, send offers, create requests, record
payments, or add reviews.

Each discussion starts with a tenant-sent listing-linked enquiry followed by
ordinary messages in both directions. Plan 6-8 messages per discussion, varying
availability, viewing arrangements, move-in timing, lease preferences, and rent
questions. Stop at arranging a viewing or considering the property, never at an
offer, acceptance, deposit commitment, or confirmed tenancy.

## Source Findings

- Supplied listing export: 69 listings, IDs 59-127; all unflagged with null
  `tenantuserid`. This is not proof that there are no pending/active rentals:
  validate those against the live database before insertion.
- Supplied user export: 55 accounts. Exclude Admin (14) and Photo Tester (57)
  from these discussions. Listings 85 and 86 belong to Admin and are not selected.
- Keep the supplied message 209: user 2 to owner 31 about listing 115 at
  `2026-10-12 17:01:58.855`, text `Hi is this available?`.
- No full current chat or rental export was supplied. Do not assume selected
  participant pairs have empty conversations.
- The export includes old AI-summary keys. Ignore them; this task makes no
  schema changes and does not populate those fields.
- Source reviewed: README, listing enquiry guide, ChatHistory model, and
  ChatHistoryService. Messages must contain 1-255 characters, enquiry recipients
  must own the listing, and snapshots use listing name and location.
- Do not copy passwords, email addresses, phone numbers, or profile URLs into
  deliverables. Only participant IDs/names and necessary listing facts are used.

## Proposed Assignments

Selected across original and newer listings, neighbourhoods, prices, and property
types, including the landed property. Each prospective tenant below is distinct.
Actual listing ownership remains unchanged.

| Listing | Property | Owner ID / Name | Prospective Tenant ID / Name |
|---|---|---|---|
| 59 | Toa Payoh Two-Bedroom HDB | 1 / Superman | 22 / Marcus Ho |
| 61 | Tampines Three-Bedroom HDB | 2 / Batman | 23 / Divya Krishnan |
| 63 | Queenstown Two-Bedroom HDB | 3 / Green Lantern | 24 / Leila Hamid |
| 66 | Bukit Timah Terrace House | 4 / Wonder Woman | 25 / Ethan Koh |
| 67 | Ang Mo Kio Four-Bedroom HDB | 5 / The Flash | 26 / Mei Ling Chan |
| 69 | Sengkang Family Flat | 6 / Spiderman | 27 / Farah Abdullah |
| 71 | Woodlands Compact Flat | 7 / Iron Man | 28 / Vikram Rao |
| 73 | Hougang Bright Two-Bedroom Condo | 8 / Thor | 29 / Nadia Hassan |
| 75 | Holland Two-Bedroom Balcony Condo | 9 / Black Widow | 30 / Wei Jie Ng |
| 77 | River Valley Compact City Condo | 10 / Captain America | 31 / Olivia Tan |
| 79 | Cosy Ang Mo Kio Apartment - 12 | 11 / Doctor Strange | 32 / Ravi Kumar |
| 81 | Welcoming Bishan Apartment - 63 | 12 / Black Panther | 33 / Grace Chua |
| 83 | Bright Bishan Apartment - 31 | 13 / Aquaman | 34 / Amir Hakim |
| 87 | Quiet Bishan Flat - 102 | 15 / Dobin Kim | 35 / Natalie Wong |
| 89 | Cosy Bishan Flat - 104 | 16 / Daniel Tan | 36 / Ryan Low |
| 90 | Spacious Orchard / Oxley Apartment - 19 | 16 / Daniel Tan | 37 / Ananya Sharma |
| 91 | Welcoming Orchard / Oxley Apartment - 27 | 17 / Sarah Lim | 38 / Jia Min Tay |
| 93 | Bright Jurong West Flat - 474 | 18 / Marcus Lee | 39 / Darren Yeo |
| 95 | Spacious Jurong West Flat - 476 | 21 / Sophie Lee | 40 / Hannah Lim |
| 97 | Quiet Jurong West Flat - 478 | 22 / Marcus Ho | 41 / Zahir Osman |
| 99 | Cosy Jurong West Flat - 480 | 23 / Divya Krishnan | 42 / Isabelle Tan |
| 101 | Welcoming Jurong West Flat - 482 | 24 / Leila Hamid | 43 / Sean Chew |
| 103 | Bright Jurong West Flat - 484 | 25 / Ethan Koh | 44 / Kavitha Pillai |
| 105 | Spacious Jurong West Flat - 486 | 26 / Mei Ling Chan | 45 / Alicia Foo |
| 107 | Quiet Jurong West Flat - 488 | 27 / Farah Abdullah | 46 / Shawn Tan |
| 109 | Cosy Jurong West Flat - 490 | 28 / Vikram Rao | 47 / Melissa Seah |
| 111 | Welcoming Jurong East Flat - 101 | 29 / Nadia Hassan | 48 / Imran Ismail |
| 113 | Bright Jurong East Flat - 103 | 30 / Wei Jie Ng | 49 / Leonard Sim |
| 115 | Spacious Jurong East Flat - 105 | 31 / Olivia Tan | 2 / Batman |
| 117 | Quiet Jurong East Flat - 107 | 32 / Ravi Kumar | 51 / Aaron Wong |
| 119 | Cosy Jurong East Flat - 109 | 33 / Grace Chua | 52 / Kenneth Goh |
| 121 | Welcoming Jurong East Flat - 111 | 34 / Amir Hakim | 53 / Sarah Quek |
| 123 | Bright Jurong East Flat - 113 | 35 / Natalie Wong | 54 / Rohan Mehta |
| 125 | Comfortable Jurong East Flat - 115 | 36 / Ryan Low | 55 / Michelle Ng |
| 127 | Quiet Jurong East Flat - 201 | 37 / Ananya Sharma | 56 / Fiona Chia |

This includes owner-as-prospect examples: Batman owns listing 61 but enquires
about Olivia's 115; Olivia owns 115 but enquires about Captain America's 77.

## Architecture and Presentation

- Write only new `public.chathistory` records, using generated message IDs.
- Opening message: `listingid`, `listing_name_snapshot`, and
  `listing_address_snapshot` identify the selected listing; `rentalid` and
  `requestid` stay null.
- Replies: all three listing-context columns, `rentalid`, and `requestid` stay
  null. Their existing sender/receiver pair identifies the conversation.
- Preserve message 209 exactly and append its discussion instead of adding
  another opening enquiry.
- Use existing chat card and ordinary bubble rendering. No UI changes required.
- Use actual exported prices, locations, and numeric room counts when needed.
  Do not infer room counts from marketing titles or invent transport distances,
  included amenities, or legal occupancy eligibility.
- Date messages after both users and the listing exist; continue 209 strictly
  after its timestamp. Keep strict chronological order and no future messages.
  Check database/session timezone before selecting final times.
- Generate a transactional Supabase SQL script with preflight checks. Validate
  ownership, flags, vacancy, current-rental absence, and listing facts.
- Reject unexpected existing history for selected pairs instead of overwriting
  it or mixing fabricated replies with new real messages. Request a targeted
  chat export only if this check finds additional history.
- Make a completed rerun a no-op; abort on ambiguous partial batches. Use a
  documented fingerprint/manifest to identify this batch without adding new
  permanent tables or assigning fixed message IDs.
- Account for concurrent writes with transaction locking or a paused-writer
  run procedure. Use a backup and test the script on an isolated database first.

## Tickets and Validation Gates

### DISC-1: Author Discussion Dataset

- Owner: Backend Engineer; Product Owner reviews scope/content.
- Priority: P2.
- Scope: these 35 assignments and varied 6-8-message discussions.
- Dependencies: approval of this plan.
- Implementation notes: retain message 209; use current schema, real listing
  facts, short natural messages, and stable per-discussion ordering.
- Acceptance criteria: tenant starts every discussion; correct owner receives
  it; no self-enquiries; no offers or tenancy commitments; no sensitive account
  fields; all selected listings represented exactly once.
- Validation: QA checks assignments against both exports, validates every
  message's 1-255-character length, reviews dialogue and chronology, and checks
  listing context exists only on opening enquiries.
- Documentation impact: readable discussion preview and assignment manifest.

### DISC-2: Build Guarded SQL

- Owner: Senior Backend Engineer; Tech Lead coordinates.
- Priority: P2.
- Scope: insert-only transaction, read-only preflight, rerun protection, and
  post-insert verification queries.
- Dependencies: DISC-1 and its QA gate.
- Implementation notes: snapshot matches exported/live facts; preserve existing
  IDs and rows; insert only missing batch records after state validation.
- Acceptance criteria: no changes outside new chat rows; 209 unchanged; no
  duplicate openings; unexpected ownership/history/rental state aborts the
  transaction; complete rerun adds zero rows.
- Validation: QA runs first-run and repeat-run tests on an isolated PostgreSQL
  fixture, tests rollback on drift/partial state, compares before/after
  fingerprints for existing rows and protected tables.
- Documentation impact: SQL usage, expected counts, refusal conditions.

### DISC-3: Handoff and Runbook

- Owner: Technical Writer; QA confirms acceptance results.
- Priority: P2.
- Scope: concise Supabase run instructions and post-run checks.
- Dependencies: DISC-2 and its QA gate.
- Implementation notes: deliver files in Documentation; no shared database
  access is assumed, and no credentials are requested for offline preparation.
- Acceptance criteria: user can preview discussions and execute the reviewed
  SQL; backup/rollback guidance clearly distinguishes rollback before commit
  from any later cleanup; limitations and exact insertion counts are recorded.
- Validation: cross-check instructions and verification queries with the tested
  SQL and manifest. After execution, spot-check opening cards and replies in
  the app without using the offer action.
- Documentation impact: final guide and validation results.

## Approval and Open Assumptions

Propose 35 total discussions, including the existing listing-115 example
(34 new openings plus continuation of the existing one). No pending offers,
rentals, reviews, payments, or occupancy changes are in scope.

The user approved these assignments and scope. The existing participant history,
rental state, and timezone remain execution-time preflight checks, not assumptions
that the exports establish.

No shared database has been modified, and no application source or existing
staged merge changes have been altered by this task.

## Delivery Results

- DISC-1 complete: 35 distinct participant pairs/listings; six messages per
  discussion, 210 total. Exactly 209 new rows and 34 new listing attachments.
  Message 209 remains the existing opening for listing 115.
- DISC-1 QA: assignment, ownership, role, message-length, listing-fact, and
  creation-date checks passed. Conversation text is in
  [enquiry-discussions-preview.md](../Database/Enquiries/enquiry-discussions-preview.md); exact records are in
  [enquiry-discussions.json](../Database/Enquiries/enquiry-discussions.json).
- DISC-2 complete: [seed-enquiry-discussions.sql](../Database/Enquiries/seed-enquiry-discussions.sql) defaults to a non-persistent
  dry run; apply mode inserts chat rows only. It performs its checks under
  short-lived locks and detects completed or partial batches.
- DISC-2 QA: 21 checks passed in an isolated local PostgreSQL 18.6 database,
  including first application, reruns, drift, conflicting history, active and
  pending rentals, identity collisions, trigger side-effect rollback, and
  timezone-aware column compatibility. The disposable database was removed.
- DISC-3 complete: [enquiry-discussions-guide.md](../Database/Enquiries/enquiry-discussions-guide.md) contains run instructions,
  refusal handling, verification, backup notes, and native spot checks.
- Remaining deployment checks: target Supabase dry run and post-insert app check.
  No shared database rows were inserted, and no offer was sent.
