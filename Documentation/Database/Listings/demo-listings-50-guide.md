# Append 50 Fictional Demo Listings

## Scope

LATEST REVISION: all 68 Condo/HDB profiles now have varied prices, rooms and
sizes. For the already-imported database, use [update-listing-variations.sql](update-listing-variations.sql)
and [listing-variation-guide.md](listing-variation-guide.md). The seed and source JSON are synchronized.
The description-only instructions and validation below describe the earlier
revision; do not rerun that script after the numeric revision.

The user has already imported the batch: the supplied export contains original
IDs 59-77 and new IDs 78-127. To replace the visible demo text, run
[update-demo-listing-descriptions.sql](update-demo-listing-descriptions.sql), NOT the append seed again.
The update changes only the 50 new descriptions. It checks each exported ID,
name, address, postal code, type, bedroom/bathroom count, size, floor, and old
description before writing. A missing or edited row aborts the entire update.
An already-updated row is accepted, making repeat execution a no-op.
Back up the current database, stop writers, then run the entire update file.
Expect a 50-row result grid with natural property descriptions and a successful
commit. Reload the app afterward.

Run [demo-listings-50.sql](demo-listings-50.sql) to append exactly 50 vacant, unflagged listings to
an untouched 19-listing baseline only. It does not change existing listings or other app data, create
users, restore rental history, or recreate the three retired summary columns.
It creates no permanent tables or columns.

Owners are allocated in ascending actual user ID order, filling each user to
two total listings before moving on. Accounts already owning two or more are
skipped. No accounts are promoted or assigned new roles. This continues the
previous demo allocation across existing accounts, including any admin accounts
that have an available slot. The supplied export confirms IDs 19 and 20 are
skipped: user 10 received one new listing, users 11-18 and 21-36 received two
each, and user 37 received one. Do not assume user IDs are consecutive.

Photos are read from the current 19 listings ordered by listing ID, not from
invented URLs. New listings 1-19 and 20-38 reuse all 19 photo references; 39-50
reuse the first 12. The images are illustrative, not evidence of the actual
building or interior. Their availability and suitability were not visually tested.

All names and rental descriptions are fictional. Prices are synthetic monthly
SGD amounts, sizes are in square feet, and bedroom/bathroom counts, floors,
and unit numbers are invented plausible examples, not verified floor plans or
market valuations. At the user's request, descriptions now use normal property
copy matching the original 19, without demo prefixes, batch markers or photo
disclaimers. This documentation retains the synthetic-data provenance.
No unverified MRT distances, facilities or availability claims were added.

The existing backend derives `demo` from the `FICTIONAL DEMO:` description
prefix. Removing it makes these listings behave like the original 19: the
owner/enquiry controls and nearby/price data requests are no longer bypassed
by sample-listing mode. No frontend or backend code was changed for this revision.

## Address Evidence

[demo-listings-50-sources.csv](demo-listings-50-sources.csv) records the screenshot address, postal code,
OneMap address/building label, coordinates, lookup URL, evidence type, and
distance from the backed-up `postal_code_coordinates` reference.
[demo-listings-50-data.json](demo-listings-50-data.json) is the readable data embedded in the SQL.

The chosen 50 locations are:

- Ang Mo Kio: Grandeur 8 and The Panorama (2).
- Bishan: Bishan 8, Bishan Point, Bishan Loft, and Bishan View (10).
- Orchard/Oxley: two Orchard Court addresses and Angullia Park Residences (3).
- Jurong West: blocks 474-483 on Street 41, and 484-491 on Avenue 1 (18).
- Jurong East: blocks 101-116 on Street 13, and block 201 on Street 21 (17).

These are drawn from the supplied screenshots, excluding the commercial,
transport, hotel, institutional, and holiday-accommodation candidates. More
screenshots supplied additional options, but the batch remains capped at 50.

Nine exact block/road/postal matches were obtained in live OneMap responses on
2026-10-12. Five of those responses included an authentication warning alongside
usable address results; this is recorded in the CSV. Subsequent live requests
were rate-limited (HTTP 429), so no claim is made that all 50 were live-verified.
The other 41 pairs were cross-checked against the project's historical OneMap
address dataset, `RentNest/data/database.json.gz`, associated with the
`onemap_2020` reference source. All 50 coordinates agree with the restored postal
reference within 100 metres. Historical data does not establish current
availability or current building use.

The Jurongville labels differ slightly in spacing/abbreviation between the
screenshots and historical dataset; exact block, road and postal values match.
No coordinates were guessed, and no amenities or walking-time claims were invented.
Postal codes here all have six digits without leading zeroes.

Supplemental web spot checks:

- https://www.99.co/singapore/rent/neighbourhoods/shangri-la?page_num=25
- https://www.99.co/singapore/rent/neighbourhoods/chatsworth?page_num=12
- https://www.edgeprop.sg/hdb/101-jurong-east-street-13
- https://www.propertyguru.com.sg/singapore-property-listing/hdb/jurong-east/jurong-east-street-13_106319/101

These corroborate example building/address pairs, not the fictional rental
figures. The dataset should remain test/demo data, not real advertised inventory.

## Fresh Import Only

Already imported? Use the description update above, not these seed steps.

1. Retain the original verified backup and make a fresh backup of the current
   19-listing baseline if you need to restore this exact state.
2. Stop backend/app writes and confirm the intended test project.
3. Open SQL Editor and run the ENTIRE [demo-listings-50.sql](demo-listings-50.sql) file.
4. If the editor warns about creating tables without RLS, the two objects in
   this script are temporary session-local tables, dropped on commit.
   "Run without RLS" does not change RLS on existing tables.
5. Require successful completion through `COMMIT`, not just a result grid.
   Retain the 50-row mapping of batch index, new ID, owner, photo-source ID,
   postal code, and name.
6. Run the checks below and then [database-read-only-audit.sql](../Audits/database-read-only-audit.sql).

The script refuses any baseline other than 19 listings, any source listing
without a valid owner or HTTPS photo reference, insufficient owner slots, or an
already-present batch. It never clears tables to satisfy prerequisites.
Do not remove the guards to bypass errors.

```sql
SELECT count(*) AS total_listings FROM public.listings;

SELECT count(*) AS batch_listings,
       count(*) FILTER (WHERE flagged) AS flagged,
       count(*) FILTER (WHERE tenantuserid IS NOT NULL) AS occupied,
       count(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS missing_coordinates
FROM public.listings
WHERE listingid BETWEEN 78 AND 127;

SELECT owneruserid, count(*) AS listing_count,
       array_agg(listingid ORDER BY listingid) AS listing_ids
FROM public.listings
GROUP BY owneruserid
ORDER BY owneruserid;
```

Expected: 69 total, 50 in this batch, with 0 flagged, 0 occupied and 0 missing
coordinates in the batch. The ID range above is from the supplied existing
export; for a fresh import, use its returned mapping instead. In that export,
users 1-18 and 21-36 have two each, and user 37 has one. New IDs are generated
normally and need not be consecutive.

On failure, the transaction rolls back the batch. If SQL Editor leaves the
session aborted, run `ROLLBACK;` before investigating. Identity sequences can
advance on failed attempts: gaps are harmless. After a successful commit,
`ROLLBACK` cannot undo the batch. Rerunning is intentionally rejected.
The seed uses source name/postal matching and the 19-row baseline guard to
reject duplicates, independent of description wording. Retain the ID mapping
for batch identification.
This is a one-off seed, not a permanent import ledger or synchronization tool.

## Amenities and App Validation

SQL does not call backend creation hooks. Restart the updated backend and open
each new listing's detail page to invoke the existing nearby-amenities flow.
Use the new IDs from the mapping. Check backend logs and results for external
service failures; empty amenities are not proof that all upstream calls succeeded.
No external amenity requests were made as part of this import preparation.

Confirm photos display, neighbourhoods and map pins match, and cards show the
new property descriptions without the sample label. Then exercise rental offers, payments and termination through the
UI. Create a separate listing manually to test the creation workflow itself:
this SQL seed cannot validate app-side creation behavior.

## Local Validation

Validated on a disposable local PostgreSQL database using the schema from
`rentnest_restore_check`, with the retired columns removed. User records were
synthetic; the restored backup and Supabase were not modified.

- Exactly 50 new listings and 69 total.
- Original 19 listings unchanged in every column.
- All ten other app tables unchanged, including representative activity rows.
- Correct photo cycle, owner distribution and nonconsecutive-user-ID handling.
- All 50 source field sets preserved; no null coordinates or tenant assignments.
- No removed summary columns required or created.
- Duplicate execution, insufficient owner slots, missing photos and unexpected
  baseline counts rejected without row changes.
- Invalid data at the tenth insertion rolled back all earlier insertions.
- Disposable validation databases removed after testing.

The first test setup encountered an existing `public` schema; schema restoration
was adjusted within the disposable database and the full tests then passed.
No native/web visual checks, live Supabase execution, or image URL availability
checks were performed. Concurrent execution is serialized by the listings lock;
concurrency itself was not separately stress-tested.

### Description Revision Checks

Tested the description update in a fresh disposable PostgreSQL database using
the supplied 69 listing records, synthetic users, and the restored schema with
the three retired columns removed:

- Exactly 50 descriptions changed; original 19 listings unchanged.
- Every non-description field remained identical across all 69 rows.
- Update rerun produced no changes.
- Unexpected user-edited text or missing target rows aborted without changes.
- The revised append seed produced the same new descriptions and rejected replay.
- All 50 descriptions are distinct, 149-172 characters long, and their numerical
  details match the associated listing records.

No Supabase data was changed by the assistant. UI behavior above is established
from the existing code; a rendered frontend test was not performed.
