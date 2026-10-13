# Remove Listing AI Summary Columns

## Approved Scope

Remove only these columns from `public.listings`:

- `ai_summary`
- `ai_summary_key`
- `ai_summary_updated_at`

No listing rows, other listing columns, other tables, or sequences are removed.
Stored summary values, if any, are permanently discarded.

The updated backend has no mappings, getters/setters, repository writes,
background generation service, or configuration group for this retired cache.
The old column-creation script has been removed and the listing seed no longer
references the columns.

Recommendation cards retain factual template summaries and market notes.
The response keeps `ai.summaries = "off"` and item `summarySource = "template"`.
The raw listing response no longer includes `aiSummary`. Chat summaries, Ask AI,
AI pricing, AI search parsing/reranking, and normal nearby amenities are unchanged.
The removed `AmenityLookup` adapter was only used by AI listing-summary generation,
not the existing listing-detail amenity service.

## Deployment Order

1. Keep a current backup of the intended database. The earlier verified backup
   predates the new seed listings, so retain a fresh backup before applying DDL
   if recovery of the current data state is needed.
2. Stop every old backend connected to this shared database, including teammates'
   local processes and any deployed instances. Stop app writers.
3. Build the updated backend from this working tree using Java 21:

   ```bash
   mvn clean package -DskipTests
   ```

   Run from the `RentNest` backend directory. Do not restart an old JAR or branch.
4. In the intended Supabase SQL Editor, run the entire file
   `RentNest/scripts/drop-listing-ai-summary-columns.sql`.
   It uses a transaction, short lock timeout, explicit `public.listings`, and
   `RESTRICT`, never `CASCADE`. Dependencies cause failure rather than deletion.
5. Confirm success. The final verification query must return zero rows.
   On an error, issue `ROLLBACK;` if the session remains aborted, then investigate.
6. Restart only rebuilt, updated backend instances. Repeat the verification query
   below after startup. Check existing listings and recommendation results.

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'listings'
  AND column_name IN ('ai_summary', 'ai_summary_key', 'ai_summary_updated_at');

SELECT count(*) AS listing_count FROM public.listings;
```

Expected: zero matching columns; listing count unchanged (19 at the user's last
verification, unless further listings have since been created).

Hibernate `ddl-auto=update` does not remove old columns by itself. Conversely,
the old backend still maps these columns and can recreate them. The new code
prevents recreation only when all connected backends use the updated model.
Obsolete `rentnest.ai.summary.*` settings in untracked local configuration are
ignored and can be removed; they cannot reenable the deleted service.

Do not rerun the reset or seed SQL for this change. This is a column-only migration.
After commit, ROLLBACK cannot restore discarded cache values. Do not roll the
backend back to an older version against the changed schema.

## Validation

- 212 backend tests passed with Java 21, no failures/errors/skips in the selected
  suite. Paid `OpenRouterLiveTest` was explicitly excluded; opt-in
  `*LiveCheck` tests were not run.
- Command: `mvn clean test -Dtest='*Test,*Tests,!OpenRouterLiveTest'
  -Drentnest.ai.enabled=false -Dspring.sql.init.mode=never`.
- Regression coverage retains factual summaries when other AI stages are enabled,
  reports summaries as off, and reflects listing edits without a cache write.
- A Hibernate SessionFactory startup/restart test with `hbm2ddl.auto=update` on
  isolated H2 verifies the columns are neither initially created nor recreated
  after removal; listing insert/read/update operations remain usable.
- Actual migration executed twice on a disposable local PostgreSQL clone.
  Every other public column definition and all 11 tables' remaining values
  matched before/after fingerprints.
- A dependent-view test verified RESTRICT refusal and complete DDL rollback.
- The adapted seed inserted 19 unflagged, vacant listings with the expected
  owner distribution into that clone after removal.
- Local restored source backup remained unchanged; test clones were removed.
- Initial default-Java-26 test run hit Mockito instrumentation incompatibility;
  the clean Java-21 suite above passed.

Supabase has not been accessed or modified by the assistant for this removal.
The user must still run the migration and verify the deployed backend.
No rendered UI checks, commits, or pushes were performed.
