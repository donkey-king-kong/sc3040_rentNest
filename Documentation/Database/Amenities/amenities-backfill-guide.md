# Missing Amenity Backfill

## Scope

Populate empty caches through the existing backend without clearing the table
or refreshing populated listings. The supplied 69-listing inventory had rows
for IDs 60, 67, 70, 99 and 127, leaving 64 candidates. Use a fresh inventory:
more listings may already have been populated by normal app use.

No application logic, schema, listing values, or existing cache records are
changed by this utility itself. The authenticated GET endpoint starts the
backend's existing background generation for empty caches. The utility never
calls the force-refresh POST endpoint.

## Before Running

1. Retain a current database backup.
2. Run one updated backend connected to the intended test Supabase database.
   Ensure its external data API credentials are configured. Keep this backend
   running throughout the backfill.
3. Stop other app/detail-page activity and refresh jobs. Let existing background
   jobs finish before taking the snapshot. Do not run concurrent backfill tools.
4. In Supabase SQL Editor run [amenities-backfill-inventory.sql](amenities-backfill-inventory.sql) with a role that
   can see all listings and amenities.
5. Export its complete results as JSON to
   `Documentation/Database/Amenities/amenities-before.json` in this project.

The query includes only listing IDs, coordinates, per-category counts and
fingerprints of amenity rows. It does not export user credentials or chat data.
Keep this baseline file unchanged for the post-run comparison.

## Preview and Run

From the project root:

```bash
python3 RentNest/scripts/backfill-missing-amenities.py \
  --inventory Documentation/Database/Amenities/amenities-before.json \
  --dry-run
```

This makes no network requests or database changes. Check the target IDs/count.
Then run:

```bash
python3 RentNest/scripts/backfill-missing-amenities.py \
  --base-url http://localhost:8080 \
  --inventory Documentation/Database/Amenities/amenities-before.json
```

Use the actual backend origin if it differs. HTTPS is required for non-loopback
addresses. The script refuses redirects so credentials cannot be forwarded.

Type `BACKFILL` to confirm the test target. Enter an existing **app account**
email and password at the local prompts, not the Supabase database password.
Passwords are hidden; credentials and the resulting token are not saved in the
CSV or printed. Do not paste them into chat or place them in command arguments.

The script skips every originally populated listing and missing/invalid
coordinates. It sends authenticated GET requests for eligible IDs, one HTTP
request at a time, with short polling intervals and a five-minute polling
deadline per listing. HTTP/network/authentication errors stop the batch without
automatic retries. A time limit or interruption does not cancel a backend job
that has already started.

A timestamped CSV report is written to Documentation and flushed after each
listing. Reports are never overwritten. On a stopped run, listings after the
last report entry have not been processed by this invocation.

## Endpoint Limitations

The current backend returns `READY` as soon as any amenity row exists, even if
other category computations are still running. Therefore this utility serializes
HTTP requests, **not necessarily the underlying background jobs**. It cannot
guarantee one generation job at a time without a backend completion-status change.

- `skipped_existing`: no amenity request was made for that listing.
- `skipped_missing_coordinates`: correct the listing coordinates separately.
- `rows_observed_review_completion`: rows exist, possibly pre-existing since
  the snapshot or a partial result. This is not proof all categories succeeded.
- `empty_result_review_logs`: no rows; either none nearby or an external API
  failed. The backend temporarily caches empty results for ten minutes.
- `stopped_review_logs`: request failure, timeout or interruption. Check logs.

Any nonempty cache is preserved by the GET endpoint, including partial caches.
This task does not repair partial existing caches or force-refresh anything.
The server internally deletes rows for an empty target before computing; under
the quiet single-backend conditions above there are no rows there to delete.
Its empty check is not a cross-instance atomic lock. Do not run other backend
instances/jobs against the same targets during this operation.

The source services search within 500 metres and retain up to five schools,
five hawker centres and five bus stops. Zero rows in a category can be valid.
Errors are swallowed per category in the existing backend, so an HTTP 200
alone cannot prove success. Inspect `[NearbyAmenities]` warning/completion logs
and wait for jobs to finish before taking the final snapshot. Do not repeatedly
retry empty results while APIs are failing.

## Verify Preservation and Coverage

Run the same inventory SQL again after generation settles. Export as
`Documentation/Database/Amenities/amenities-after.json`, then run:

```bash
python3 RentNest/scripts/backfill-missing-amenities.py \
  --inventory Documentation/Database/Amenities/amenities-before.json \
  --after-inventory Documentation/Database/Amenities/amenities-after.json
```

This comparison makes no API calls. It verifies the count and complete-row
fingerprint for every originally populated listing and reports listings still
without rows. It also flags additions/removals in the listing inventory.

If fingerprints changed, investigate other app/backfill activity rather than
deleting or restoring rows blindly. Fingerprints only verify existing-row
preservation; they do not establish correctness of the new external data.

For a subsequent missing-only pass, use a **fresh** inventory as the new baseline
so newly populated listings are skipped. Retain the original baseline separately.
Share reports or inventory results for review, never account credentials.

## Validation

- Eleven offline tests passed: GET-only polling, empty-result labeling, timeout,
  malformed responses, URL/redirect restrictions, sanitized HTTP errors, duplicate
  inventory rejection, existing-row skipping, stop-on-error, dry run, and
  before/after fingerprint comparison.
- Inventory SQL executed successfully against the locally restored PostgreSQL
  schema without writes.
- No live Supabase calls, government data API calls, or authenticated backend
  generation were performed during preparation.
- Live completion and preservation checks remain to be run using the steps above.
