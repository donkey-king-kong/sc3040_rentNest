# Import the Backed-Up Demo Listings

## What It Does

LATEST REVISION: Condo/HDB prices, layouts and matching copy now follow
[listing-variation-guide.md](listing-variation-guide.md); the landed property remains unchanged.
For the existing populated database, run [update-listing-variations.sql](update-listing-variations.sql),
not this fresh-import seed.

[listing-reseed.sql](listing-reseed.sql) imports the 19 backed-up properties as new, vacant,
unflagged listings. It assigns two to each existing user in ascending user ID
order, stopping after 19 properties. With current users, IDs 1-9 get two each
and ID 10 gets one. Users after that get none.

Listing IDs are generated normally, not reused or reset. The result grid maps
each old property ID to its new listing ID and owner ID.

Photos, coordinates, addresses and property identities come from the backup.
Condo/HDB descriptions, prices, room counts, sizes and related titles have since
been revised as approved; this is no longer an exact copy of those backup fields.
All flags are false. Tenant is NULL, and creation timestamps
record the new import time in UTC. The seed no longer references the retired
listing AI-summary columns and works without them.

Users, roles, and postal-coordinate data are not modified. Rental/activity
tables remain empty; historical amenities are not restored.

## Run in Supabase

1. Retain the verified `rentnest-before-reset.dump` backup. Stop backend/app
   writes and confirm the intended test project.
2. Open SQL Editor and run the ENTIRE [listing-reseed.sql](listing-reseed.sql) file, not a fragment.
3. Confirm successful completion through COMMIT. Retain the 19-row mapping grid.
   A result grid without a successful commit is not proof of completion.
4. Run the checks below, then rerun [database-read-only-audit.sql](../Audits/database-read-only-audit.sql).

The script refuses to run if any reset table contains rows or fewer than ten
users exist. It does not delete data to resolve a failed prerequisite. It also
refuses a second successful import. Do not remove its guards to bypass errors.

On an SQL error, no listing rows are committed. If your SQL session remains
aborted, issue `ROLLBACK;` before investigating. A lock timeout means another
session may be using a locked table; stop writers before retrying.
Identity sequence gaps after failed attempts are normal and must not be reset.

```sql
SELECT count(*) AS listings,
       count(*) FILTER (WHERE flagged) AS flagged,
       count(*) FILTER (WHERE tenantuserid IS NOT NULL) AS assigned_tenants
FROM public.listings;

SELECT owneruserid, count(*) AS listing_count,
       array_agg(listingid ORDER BY listingid) AS listing_ids
FROM public.listings
GROUP BY owneruserid
ORDER BY owneruserid;
```

Expected: 19 listings, 0 flagged, 0 assigned tenants. Ten owners: nine with two
listings and the last with one.

## Regenerate Amenities

SQL import does not execute Java listing-creation hooks. Restart the backend,
reload the app, then open each imported listing's detail screen. The existing
GET `/api/gov/nearby-amenities/{listingId}` starts background computation when
no cached amenities exist. Alternatively, an authenticated POST to
`/api/gov/nearby-amenities/{listingId}/precompute` performs the existing
computation; use new listing IDs from the mapping, not old IDs.

Check the screen and backend logs for external API failures. All source listings
have coordinates, but that does not guarantee external services will return data.
The old total of 131 amenities is not a required target: current external results
may differ. A READY response with an empty list is not proof every API succeeded.

```sql
SELECT l.listingid, count(a.id) AS cached_amenity_count
FROM public.listings l
LEFT JOIN public.listing_nearby_amenities a ON a.listing_id = l.listingid
GROUP BY l.listingid
ORDER BY l.listingid;
```

Once this baseline is verified, exercise offers, rentals, payments, and termination
through the UI. Also create one additional listing manually to test the creation
flow; this SQL import cannot validate that flow.

## Original Import Validation

The checks below describe the original backup-preserving import. See
[listing-variation-guide.md](listing-variation-guide.md) for validation of the revised synthetic profiles.

Tested against a disposable local PostgreSQL copy with the actual restored schema:

- Successful 19-row import with generated IDs and correct owner distribution.
- Exact preservation of the selected property fields, including photo references.
- All records unflagged, vacant, with new timestamps.
- Users, roles, and postal-coordinate records unchanged.
- Owners with nonconsecutive IDs receive the correct grouping.
- Fewer than ten users and every nonempty reset table block insertion.
- Replay refuses to duplicate records.
- An injected error after the first insert rolls back all inserted rows.
- Local backup source unchanged; disposable test databases removed.

The view/amenity empty-state guards were tested with deliberately orphaned
fixtures in the disposable database only, since actual foreign keys otherwise
require a listing. No target constraints were disabled.

The user has confirmed the Supabase import and expected owner/count results.
Rendered app/amenity validation remains pending. Do not rerun the seed on the
populated target to remove the summary columns; use the separate column-removal
migration described in [listing-summary-removal.md](../../Features/listing-summary-removal.md).

## Data Handling

The SQL embeds backed-up property content and photo references. Keep it private;
it is not a public seed dataset. No user names, contacts, passwords, or chat
content were exported. Old photo URLs still depend on the original assets.

After COMMIT, ROLLBACK cannot undo the import. Do not blindly truncate tables if
new app activity has started; review IDs and dependencies first. Keep the original
verified backup unchanged outside Git.
