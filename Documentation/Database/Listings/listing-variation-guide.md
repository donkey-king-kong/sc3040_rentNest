# Listing Price and Layout Revision

## Scope

The user approved revising all 68 Condo/HDB listings in the latest 69-row
export, including the original listings. The single landed property, ID 66,
stays completely unchanged. This is synthetic demo inventory, not verified
market pricing or verified floor plans. No demo labels appear in descriptions.

| Type | Count | Monthly Rent (SGD) | Bedrooms | Bathrooms | Size (sq ft) |
| --- | ---: | --- | --- | --- | --- |
| Condo | 22 | 5,000-20,000 | 1-5 | 1-5 | 650-3,500 |
| HDB | 46 | 2,000-8,000 | 1-4 | 1-3 | 450-1,600 |

The data uses coupled property profiles rather than independently randomized
fields. Smaller homes have fewer rooms and lower asking rents; the larger,
higher-priced examples are less common. Condo prices have 21 distinct values
and sizes have 22; HDB prices have 36 distinct values and sizes have 18.
Larger Orchard-area condos occupy the upper condo price range. A few larger
Bishan/Ang Mo Kio HDB examples exercise the upper HDB range.

Review [listing-variation-preview.csv](listing-variation-preview.csv) for the exact values, titles and
descriptions by listing ID. Every description matches its revised room counts
and square footage. Titles with old bedroom counts or HDB room-count labels
are revised; misleading "Spacious"/"Compact"/"Cosy" labels are adjusted where
needed. We do not infer an official HDB flat model from a synthetic bedroom count.

## Run the Update

1. Retain a fresh backup of the current database.
2. Stop backend/app writes and confirm the intended test Supabase project.
3. Run the entire [update-listing-variations.sql](update-listing-variations.sql) in SQL Editor.
4. Require successful completion through COMMIT and retain the 68-row results.
5. Run the read-only checks below and reload the app.

Do NOT rerun [listing-reseed.sql](listing-reseed.sql) or [demo-listings-50.sql](demo-listings-50.sql). Those are fresh-import
scripts, not update scripts. Do NOT rerun [update-demo-listing-descriptions.sql](update-demo-listing-descriptions.sql)
after this revision; it is a historical description-only step with old numeric
values. This update uses the latest export, in which those description changes
had already been applied.

Only `price`, `beds`, `bathroom`, `size`, `name`, and `description` may change.
The script preserves all IDs, owners, photos, coordinates, addresses, postal
codes, property types, floors, unit numbers, flags, tenants and timestamps.
No schema or sequence changes occur, and other tables are not written.

Targets are matched by exported listing ID, type, address, postal code, floor,
unit, owner and photo reference. All six editable fields must match either
the complete exported state or the complete proposed state. Missing records,
edited data, non-vacant targets, or any rental linked to a target abort the
entire transaction rather than overwrite recent app activity. If it refuses,
share the error and a fresh export; do not remove the guards.

Already revised rows are accepted, so repeating the successful update changes
nothing. An error rolls back the transaction; use `ROLLBACK;` if your SQL session
remains aborted. A lock timeout means another session may be using a target
table. After COMMIT, ROLLBACK cannot undo the revision.

The two temporary tables are session-local and automatically dropped at commit.
If Supabase warns about missing RLS, "Run without RLS" applies to these temporary
tables and does not disable RLS on any existing table.

## Verification

These queries use the IDs in the supplied export. Additional listings created
later are not included in the revision or its validation ranges.

```sql
SELECT type, count(*) AS listings,
       min(price) AS min_price, max(price) AS max_price,
       array_agg(DISTINCT beds ORDER BY beds) AS bedroom_counts,
       array_agg(DISTINCT bathroom ORDER BY bathroom) AS bathroom_counts,
       min(size) AS min_sqft, max(size) AS max_sqft
FROM public.listings
WHERE listingid BETWEEN 59 AND 127 AND type IN ('Condo','HDB')
GROUP BY type;

SELECT listingid,name,price,beds,bathroom,size
FROM public.listings WHERE listingid = 66;
```

Expect the ranges and counts in the table above. Landed ID 66 remains
`Bukit Timah Terrace House`, SGD 9,500/month, 4 bedrooms, 3 bathrooms, 2,200 sq ft.
The original 69 records remain 69; this update inserts or deletes nothing.

Rerun [database-read-only-audit.sql](../Audits/database-read-only-audit.sql). In the app, check price/bed/bath/size
filters and matching card/detail descriptions. Nearby amenities are unchanged
because locations are unchanged. Government/AI pricing estimates can differ
from the synthetic asking prices; the update does not rewrite pricing services.

## Fresh Import Sources

[listing-reseed.sql](listing-reseed.sql), [demo-listings-50.sql](demo-listings-50.sql), and [demo-listings-50-data.json](demo-listings-50-data.json)
now contain the same revised property profiles for future clean test databases.
The landed source remains unchanged. A fresh seed allocates new listing IDs;
this exported-ID update is not intended to be run against those new IDs.
Keep historical restore backups separate from these revised seed fixtures.

## Validation

Tested on a disposable local PostgreSQL database with the actual restored
schema, retired columns removed, the supplied 69 property records, synthetic
users and representative related activity:

- All 68 target rows revised to exact proposed values; total remains 69.
- Landed row unchanged in every field.
- Every non-approved field preserved in every listing.
- All ten other application tables and the listing identity sequence unchanged.
- Bedroom, bathroom and size references in descriptions match the data.
- Both property types cover every approved numeric range.
- Repeat execution performs no changes.
- Edited fields, missing targets and linked rentals refuse changes.
- An injected failure after UPDATE rolls back all writes.
- Both revised seeds run in sequence, produce the same 68 profiles, and refuse
  a repeated append import.
- Disposable validation database removed; restored backup untouched.

No live Supabase updates, browser checks, or native app checks were performed.
No application source code was changed for this task.
