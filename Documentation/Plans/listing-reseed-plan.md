# Listing Reseed Plan

## Product Summary

Reuse the 19 property records in the verified local backup without restoring
historical tenancy or activity. The user selected two listings per existing user
in ascending user ID order, with generated listing IDs (option 1).

This is a test-data import, not evidence that listing creation works through the UI.
No Supabase writes are authorized by this planning document alone.

## Architecture and Source Findings

- Read source properties from local `rentnest_restore_check.public.listings`,
  ordered by original listing ID. The local backup contains 19 records.
- Resolve owners from the target database's existing users at execution time,
  ordered by user ID. Assign source rows 1-2 to user rank 1, 3-4 to rank 2, etc.
- The first ten backup users are IDs 1-10, role USER, unflagged. If the target
  matches, users 1-9 receive two records each and user 10 receives one.
- `ListingsService.saveListing` requires an existing user, not an OWNER role.
- Preserve descriptive fields, photo references, and coordinates.
  Set every imported listing's flagged field to false, including original
  listing 50, as explicitly approved by the user.
- Do not insert original listing IDs or reset sequences. Record the mapping from
  source ID to generated target ID and owner ID.
- Tenant stays NULL. Use the import timestamp for new created_at values.
  The seed no longer references retired listing AI-summary columns.
  This creates new demo listings, not a historical restoration.
- SQL bypasses Java creation hooks. Amenities must be regenerated separately:
  opening the detail screen calls GET /api/gov/nearby-amenities/{listingId},
  which initiates missing computations. An authenticated POST to
  /api/gov/nearby-amenities/{listingId}/precompute is also available.
- All 19 source records have coordinates. External service availability still
  affects generation; READY with no rows does not prove every source succeeded.

## UX Scope

No frontend changes. Reload the app after import. Verify owner listing lists,
vacant state, photos, and amenities. All 19 imported records are unflagged.

## Tickets

### SEED-1: Prepare Guarded Listing Import

- Owner: Backend Engineer; engineering review by Tech Lead.
- Priority: P2.
- Scope: Produce a standalone Supabase SQL import from the local backup, with
  only property fields and no user credentials or personal user records.
- Dependencies: Approval of this plan; readable local backup.
- Implementation notes: One transaction; explicit column list; safely escaped
  property values; target users ranked numerically; abort unless all reset
  activity tables and listings are empty and at least ten users exist. Lock
  relevant tables with a short timeout so concurrent writes cannot invalidate
  the empty-state checks. Abort on replay rather than duplicate listings.
- Acceptance: Exactly 19 inserted listings, 10 owners distributed 2 x 9 + 1,
  generated IDs, NULL tenants, preserved property values, false flags,
  fresh timestamps, and an old-to-new ID mapping.
- Validation: QA immediately tests in a separate disposable local database:
  successful import, nonconsecutive user IDs, insufficient users, existing
  activity/listings, replay refusal, and unchanged retained tables.
- Documentation impact: Include import scope, sensitive-data precautions,
  execution instructions, mapping output, and rollback limitations.

### SEED-2: Validate App Behavior and Amenities

- Owner: QA Engineer; Backend Engineer investigates defects.
- Priority: P2.
- Scope: Validate imported data against the audit and existing app workflow.
- Dependencies: SEED-1 passes local QA; user executes the approved target import.
- Implementation notes: Do not restore old amenity rows. Trigger generation
  through listing detail screens or the existing authenticated endpoint.
- Acceptance: Expected owner distribution, vacant listings, supported property
  display, amenity generation checked per listing; failures recorded separately.
  No rentals/payments/requests/chats/reviews are recreated by the import.
- Validation: Run read-only audit; inspect DB counts and ID mappings; check
  external API logs when amenities are empty. Manually create one additional
  listing through the UI as a distinct creation-flow test.
- Documentation impact: Record actual results, not assumed readiness.

### SEED-3: Handoff

- Owner: Technical Writer; Tech Lead final review.
- Priority: P2.
- Scope: Short runbook and validation summary.
- Dependencies: SEED-1 local validation; update with SEED-2 outcomes when known.
- Implementation notes: Keep the original backup untouched and outside Git.
  Deliver generated files under Documentation; keep test fixtures elsewhere.
- Acceptance: Clear distinction between prepared SQL, local tests, target
  execution, and amenity verification. No claim that SQL tested UI creation.
- Validation: QA checks instructions against actual tested commands.
- Documentation impact: Runbook only; no application setup changes.

## Execution and Approval

Order: approve plan -> SEED-1 and immediate QA -> runbook -> user executes SQL
in intended test Supabase project -> SEED-2 validation -> final handoff.
No commits, remote writes, or external amenity calls during preparation.

Approved by the user, with the explicit amendment to unflag all imported listings.

## Preparation Results

- SEED-1: Complete. [listing-reseed.sql](../Database/Listings/listing-reseed.sql) generated from the local restored backup.
- Local QA: Passed successful import/property preservation, unchanged retained
  tables, nonconsecutive user IDs, insufficient users, every nonempty-table
  guard, replay refusal, and rollback after an injected mid-import error.
- SEED-3: Preparation handoff complete in [listing-reseed-guide.md](../Database/Listings/listing-reseed-guide.md).
- SEED-2: User confirmed Supabase import and expected ownership/count results.
  App/amenity checks remain pending.
- No Supabase writes or external amenity calls were made. The local source
  backup was not changed; disposable test databases were removed.
