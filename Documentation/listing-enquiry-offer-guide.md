# Listing Enquiries, Offers, and Rental History

## Deployment

This change requires both the backend update and the explicit PostgreSQL
migration. Do not deploy the new UI against an old backend. No shared Supabase
database was changed during implementation.

1. Back up the intended database and confirm the backup is restorable.
2. Stop **all** old backend instances and other writers. Old Hibernate one-to-one
   mappings can recreate the global rental uniqueness constraint.
3. Review and run `RentNest/scripts/migrate-listing-enquiries.sql` in Supabase SQL
   Editor as an authorized schema owner. It is transactional, repeatable, and
   rejects inconsistent statuses, missing associations, conflicting current
   rentals and mismatched occupancy. It does not repair or discard data.
4. Build/start the updated backend with Java 21, then deploy/reload the frontend.
5. Verify the constraints after restart, then exercise the flows below.

If preflight fails, do not bypass it or truncate data. Inspect the reported
conditions and agree on an explicit reconciliation before retrying.

```sql
SELECT indexdef FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'uq_listing_current_rental';

SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('public.rentals'::regclass, 'public.chathistory'::regclass)
ORDER BY table_name, conname;

SELECT listingid, count(*)
FROM public.rentals
WHERE status IN ('pending', 'active')
GROUP BY listingid HAVING count(*) > 1;
```

The last query must return no rows. `rentals.listingid` must not have a global
single-column unique constraint/index. The partial unique index covers
`pending` and `active`. The enquiry FK uses `ON DELETE SET NULL`; the rental FK
uses `ON DELETE RESTRICT`, replacing the legacy cascade into rental history.

Hibernate update alone is not this migration. Fresh databases also need the
explicit migration after table creation to install the partial index and FK
actions.

## User Flow

- Message Owner opens the pair's existing conversation and prepares a removable
  name/address preview. Opening chat never sends an enquiry.
- Sending saves the text, listing reference, and server-copied name/address.
  Each message can identify a different property in the same conversation.
- A failed message retains its listing reference for retry. Ordinary messages
  have no listing, rental or request reference.
- Sent previews keep their original name/address after listing edits. Deleted
  listings keep the snapshot, display "Listing no longer available", and cannot
  be opened. A stale detail URL shows an unavailable screen.
- The owner opens Send rental offer and explicitly chooses a property. The list
  contains their eligible owned properties, with enquired-about properties first.
  It does not include properties they merely rent.
- Offer this property on an enquiry preselects that property when still eligible.
  General offer entry never defaults to the first property.
- The confirmation preview names the property/address, recipient and terms.
  Each sent offer and acceptance dialog resolves its own rental ID.
- If an enquiry listing cannot load, chat explains that plain text can still be
  sent. If an offer's property becomes unavailable, choose another eligible one.
  If options cannot load, close/reopen the form to retry; reopening resets its
  fields. Failed submission preserves the entered fields and refreshes options.
  Rent and deposit use positive whole-dollar amounts.

## Data and API Contracts

`chathistory` adds nullable `listingid`, `listing_name_snapshot` and
`listing_address_snapshot`. Existing messages remain unchanged/null; no guessed
backfill. Snapshots are intentionally historical text, not a copied full listing.

`POST /api/chathistory` accepts optional `listingID` alongside existing message
fields. Public sends require the authenticated sender, a different existing
recipient, and text of 1-255 characters. Listing enquiries must target that
listing's owner. Clients cannot manufacture rental/request system cards or
choose stored snapshot values. System termination/offer messages are still
created through their own transactional workflows.

Chat responses expose `listingId`, `listingNameSnapshot` and
`listingAddressSnapshot`. Null `listingId` with a saved name indicates a
deleted-property enquiry; null snapshots indicate ordinary/legacy messages.

`GET /api/rentals/offer-options?recipientID=...` derives the owner from login.
Response: an array of `listingId`, `name`, `address`, `price`, `enquired`.
Only unflagged vacant properties with an unflagged owner and no pending/active
rental qualify. A recipient may own other properties.

The existing createRentalOffer endpoint now checks owner/sender, recipient,
tenant identity, positive integer rent/deposit, and ordered lease dates.
Creation always writes pending status with no invented payment-history text.
Rental and chat creation commit together. Acceptance uses the stored tenant
and listing, not replacement participant IDs submitted by a client.

Generic rental creation/deletion are blocked. Generic updates permit only the
owner's payment-history text without replacing the contract, participants or
lifecycle. Listing edits require the current owner and cannot transfer ownership.

## Rental History and Deletion

Rentals now have a many-to-one relationship to their listing. Any number of
terminated rentals can remain; at most one pending/active rental can exist.
Canonical non-null statuses are database-checked so unexpected values cannot
bypass the partial index. New lifecycle states need an explicit future migration.

Offer, acceptance and termination operations lock the listing before the rental.
Accepted termination clears current listing occupancy in the same transaction
as the rental/request decision. The terminated rental keeps its tenant and all
history. Repeated old decisions cannot clear a subsequent tenant. Rejection
leaves the active tenancy and occupancy unchanged.

Listing-only rental lookup returns the pending/active rental. Listing-plus-tenant
lookup and tenant-management lists return the active tenancy. Historical cards
use exact rental IDs. Payments remain attached to those IDs, including when the
same tenant rents the same property again.
Stale tenant-overview links verify active status, owner and tenant before showing
tenancy actions, so an old tenant link cannot terminate a subsequent tenancy.

Authorized deletion of an enquiry-only property preserves messages/snapshots;
its amenity cache and listing views follow existing database cascade rules.
Any rental history or occupied listing blocks deletion. The rental FK also
protects history against direct SQL deletion.

## Validation

Local results (2026-10-12): 223 backend tests and 75 frontend tests passed.
Paid/live OpenRouter testing was excluded. PostgreSQL migration checks passed
in a disposable database, which was removed afterward. No application data was
seeded, no shared database migration was executed, and no commit or push was made.
Independent UI review identified a stale form-response race and missing
whole-dollar validation feedback. Both were corrected and scored resolved in
the targeted verdict pass; populated lease dates were readable in the recaptures.
This verdict covers those findings, not blanket native or production approval.

Run from the backend directory with Java 21:

```bash
mvn test -Dtest='*Test,*Tests,!OpenRouterLiveTest' \
  -Drentnest.ai.enabled=false -Dspring.sql.init.mode=never
```

Run from the repository root:

```bash
python3 RentNest/scripts/test-listing-enquiry-migration.py
```

The PostgreSQL test creates and drops a uniquely named local scratch database.
It removes inherited PG connection settings and uses the local `/tmp` socket;
it does not connect to Supabase or alter the restored backup database.

Run from `frontend/RentNest`:

```bash
./node_modules/.bin/jest --config jest.termination.config.cjs --runInBand
```

Coverage includes separate enquiries, immutable snapshots, no auto-send,
attachment removal, chat-switch reset, eligible options, exact offer cards,
concurrent offers/decisions, failed-write rollback, repeated termination after
re-letting, repeat tenants, and Hibernate restart without global uniqueness.
PostgreSQL tests cover direct-write constraints, migration replay/preflight,
history protection and deleted-preview preservation.

Rendered Expo web checks used synthetic in-memory API fixtures at 390x844 and
1440x900. They verified previews, property preselection, dialog identity, no
horizontal page overflow and no runtime errors. They do not substitute for
native keyboard, screen-reader, or live Supabase end-to-end validation.

## Remaining Boundaries

- No data seeding, review-policy change, future termination scheduling, or
  offer decline/cancellation/expiry was added. Pending offers remain blocking
  until resolved through supported lifecycle behavior.
- The existing payment simulation remains separate from acceptance. A recorded
  payment followed by a failed acceptance is not atomic; the UI reports failure
  and warns to check status before retrying. No real money is moved and no new
  payment-idempotency design is claimed.
- Message retries are not server-idempotent. If a response is lost after commit,
  a manual retry can duplicate the message; it still preserves the listing.
- Historical payment presentation is not a new archival UI. This change keeps
  current tenancy lookups unambiguous and existing records linked correctly.
- Native device visual/accessibility checks and shared-database deployment
  verification remain release checks.

Rollback before migration commit is automatic. After multiple rentals exist
for one listing, restoring the old one-to-one schema is **not** a safe automatic
rollback. Stop writers and restore a coordinated backup or make an explicit
reconciliation plan; never delete history merely to restore uniqueness.
