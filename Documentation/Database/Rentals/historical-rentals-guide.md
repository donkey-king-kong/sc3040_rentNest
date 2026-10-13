# Populate Historical Rentals and Payments

## Ready to Run

The approved dataset and SQL are prepared. **No shared Supabase data has been
changed by the assistant.** Local PostgreSQL validation passed 39 checks.

Files:

- [seed-historical-rentals.sql](seed-historical-rentals.sql): self-contained SQL, including the exact manifest.
- [historical-rentals-preview.md](historical-rentals-preview.md): every assignment, date, before/after dialogue
  edit, offer, and payment.
- [historical-rentals.json](historical-rentals.json): machine-readable source/target records.
- [historical-rental-payment-seed-plan.md](../../Plans/historical-rental-payment-seed-plan.md): approved schedule and scope.

This batch represents fictional demo activity, not actions actually taken by
these account holders. It creates final accepted records, not a live replay of
the application's payment and acceptance endpoints.

## Expected Changes

| Item | Change |
|---|---:|
| Accepted rentals | 35 new rows |
| Owner-sent offer cards | 35 new chat rows |
| Simulated payments | 225 new rows |
| Payment total | S$1,031,250 |
| Listing tenant references | 35 assigned |
| Listing creation timestamps | 34 backdated |
| Existing message timestamps | 204 backdated |
| Existing message texts | 78 timing-related revisions |
| Existing message IDs | All preserved |
| Listing 115 and its six messages | Creation timestamp and messages preserved |

Starting with the supplied 210 chats and empty rentals/payment tables, final
counts are **245 chats, 35 rentals, and 225 payments**. Unrelated existing chats
are preserved and increase that chat total accordingly.

No users, ownership, asking prices, descriptions, images, amenities, requests,
reviews, account timestamps, or schema definitions are changed.

## Run in Supabase

1. Take a **fresh backup** and confirm the intended RentNest project. The earlier
   pre-reset backup does not contain the current discussions.
2. Pause all application/backend writers. The script locks public application
   tables in a stable order and verifies protected-table fingerprints. Locks
   time out after five seconds; statements time out after 120 seconds.
   Use an authorized database-owner connection in the SQL Editor, not a
   restricted application-user connection. RLS-filtered reads must not conceal
   records from the checks.
3. Open [seed-historical-rentals.sql](seed-historical-rentals.sql) in the SQL Editor. Run the **entire file**
   unchanged first. Near the top it contains:

   ```sql
   INSERT INTO hist_settings VALUES (false);
   ```

   This is a dry run. It creates temporary objects and obtains locks, but does
   not insert or update business records and does not consume identity values.
   Expect:

   ```text
   DRY RUN PASSED: no changes | 35 | 35 | 225 | 1031250
   ```

   The columns after the result are planned rentals, planned offer messages,
   planned payments, and planned payment total. The per-listing result shows
   null rental IDs because nothing has been inserted.

4. If the dry run passes, change **only that setting** to:

   ```sql
   INSERT INTO hist_settings VALUES (true);
   ```

   Run the **whole file again**, including `BEGIN` and `COMMIT`. Expect:

   ```text
   APPLIED | 35 | 35 | 225 | 1031250
   ```

   The per-listing result now includes the generated rental IDs. IDs need not
   start at 1 or be contiguous. Supabase may show the final per-listing result
   instead of the summary; inspect both results where available.
   Confirm the whole execution succeeded, including the final commit.

5. Change the setting back to false and run the whole file again. An intact
   batch returns:

   ```text
   ALREADY APPLIED: no changes | 35 | 35 | 225 | 1031250
   ```

   Those numbers describe the batch, not additional inserts. A repeated apply
   also performs no writes. Later ordinary replies, unrelated rentals, and
   payments after the frozen October history are preserved. Changes to a
   seeded rental's terms/status or its source records cause refusal; the
   script does not overwrite subsequent real lifecycle changes.
6. Run the checks below, resume writers, and refresh the app.

**Do not rerun [seed-enquiry-discussions.sql](../Enquiries/seed-enquiry-discussions.sql) after this batch.** Its original
October-only timestamps and exact-match checks have been superseded. Keep that
file as a historical artifact, not a repair tool.

## Dates and Payments

History is frozen at **12 October 2026, 18:00, Asia/Singapore**. Re-running later
does not generate additional months. Acceptance dates cover June 2025 through
October 2026 and respect both participants' creation dates. Durations vary from
12 to 36 calendar months; none has expired at the cutoff.

For the 34 backdated discussions: listing creation precedes the enquiry;
messages precede the offer; the offer precedes payment and acceptance; acceptance
and lease start coincide. Full-rent payments occur once in the start month,
then at 10:00 on the first of each subsequent calendar month through October.
This uses the app's calendar-month convention, not anniversary billing or
prorated first months. There are no missed months in these demo histories.

Rent and `deposit_price` both equal one month's asking rent. The current
"Pay deposit" UI sends `rentalPrice`, and `payment` has no type or billing-period
column. Therefore the 35 initial simulated payments are included in the 225
rows; there is **no separate additional deposit payment**. The other 190 rows
are subsequent monthly payments. Do not interpret this as a deposit accounting
ledger or proof that separate deposit funds were collected.

Listing 115 is the exception: Batman's "next month" conversation remains
unchanged, the offer is accepted on 12 October, and the lease begins at noon on
1 November. Only the October initial simulated payment is recorded. It is not
labeled November rent, and no future monthly payments are added. The listing
tenant reference is assigned because the app reserves a property on acceptance,
even for an upcoming lease.

The offset-free exports are treated as Singapore wall-clock values. The script
sets `Asia/Singapore` locally and supports both timestamp and timestamptz
columns, preserving fractional seconds. If the export's actual convention
differs, stop and reconcile it rather than bypassing timestamp guards.

## Verification

Run immediately after applying, before other activity changes these totals:

```sql
SELECT
  (SELECT count(*) FROM public.chathistory) AS chats,
  (SELECT count(*) FROM public.rentals) AS rentals,
  (SELECT count(*) FROM public.payment) AS payments,
  (SELECT sum(amount) FROM public.payment) AS payment_total_sgd;
```

Expected for the supplied starting state: `245, 35, 225, 1031250`.

Check participant links and monthly histories:

```sql
SELECT r.listingid, r.rentalid, l.owneruserid, r.tenant_userid,
       l.tenantuserid, r.status, r.created_at, r.accepted_at,
       r.rental_date, r.lease_expiry, count(p.payment_id) AS payments,
       coalesce(sum(p.amount), 0) AS amount_sgd
FROM public.rentals r
JOIN public.listings l USING (listingid)
LEFT JOIN public.payment p USING (rentalid)
GROUP BY r.rentalid, l.owneruserid, l.tenantuserid
ORDER BY r.listingid;
```

Every rental should be active, with matching rental/listing tenant IDs.
Compare each row to the script's per-listing output or preview. For example:
listing 67 has 17 payments totaling S$129,200; listing 93 has one payment of
S$4,350; listing 115 has one initial payment of S$5,850.

These integrity checks should return no rows:

```sql
SELECT r.rentalid
FROM public.rentals r JOIN public.listings l USING (listingid)
WHERE r.tenant_userid IS DISTINCT FROM l.tenantuserid
   OR r.tenant_userid = l.owneruserid
   OR r.accepted_at < l.created_at
   OR r.accepted_at < r.created_at
   OR r.rental_date < r.accepted_at
   OR r.lease_expiry <= r.rental_date;

SELECT listingid, count(*)
FROM public.rentals WHERE status IN ('pending', 'active')
GROUP BY listingid HAVING count(*) > 1;

SELECT rentalid, date_trunc('month', date), count(*)
FROM public.payment
GROUP BY rentalid, date_trunc('month', date) HAVING count(*) > 1;
```

In the app, verify:

- User 26 and owner 5: listing 67's older accepted offer and 17-month history.
- User 39 and owner 18: listing 93's recent acceptance, after the owner's signup.
- User 2 and owner 31: listing 115's unchanged enquiry, accepted card, November
  start, and one initial payment. Do not infer that Batman already moved in.
- User 31 can own listing 115 while renting listing 77 from user 10.
- Offer cards resolve their own property/tenant, dates are ordered correctly,
  tenant overviews show payments, and owner dashboards show historical months.
- Selected properties are no longer offered as vacant. Do not manually send
  another offer or payment while checking this batch.

Native rendering and shared-database application checks have not been run.
No frontend or backend source changes are part of this delivery.

## Refusals and Recovery

The script aborts for changed/missing source chats, unexpected messages in a
selected pair, changed participant metadata, listing ownership/price/address/
flags/occupancy drift, nonempty starting rentals/payments, partial batches,
duplicate seeded payments, incorrect chronology, missing or altered constraints,
missing generated IDs, lock contention, permissions, or unexpected write effects.

Schema checks intentionally require the known migrated rental constraints.
An equivalent but differently expressed constraint may also be refused. Inspect
the schema and error before adapting the script; do not remove the checks or
rerun the migration blindly.

A preflight error writes no business rows. Any write or postcondition error
rolls back the entire transaction. If the editor remains in an aborted
transaction, run `ROLLBACK;` before retrying. Failed insert attempts can consume
identity sequence values, so gaps do not imply partial committed data.

After a successful commit, `ROLLBACK` cannot undo the batch. Stop writers and
review a targeted reversal or coordinated restore from the fresh backup,
accounting for later activity. No automatic destructive cleanup is included.

## Local Validation

Validated on PostgreSQL 18.6 in a uniquely named disposable database on
127.0.0.1. Connection environment overrides were cleared, and the database was
dropped afterward. The restored backup was inspected read-only for column names
and types; it was not altered. No remote database connection was used.

The fixture included the exact selected user/listing metadata and all 210 chats,
plus unrelated users, a listing, chat, request, review, and amenity-cache row.
It modeled the required IDs, lengths, foreign keys, rental-status constraint,
partial uniqueness, and one-offer-per-rental linkage. It is not a full copy of
Supabase RLS policies, triggers, or every production table.

All 39 checks passed:

| Checks | Coverage |
|---|---|
| 1-4 | Dry run, exact apply, repeat apply, preservation of later activity |
| 5-14 | Missing/changed chats, ownership/price/occupancy/flags/accounts, unexpected replies and duplicates |
| 15-21 | Nonempty starting tables, missing/duplicate payments, missing offer, changed contract/chat |
| 22-29 | Missing/wrong index, missing/weakened status check, missing FK, cascade deletion, missing identity, obsolete global uniqueness |
| 30-34 | ID collision and protected/listing/chat/payment trigger-effect rollback |
| 35-39 | Timestamptz compatibility, malformed payment dates, text-status compatibility, future events, lock contention |

Manifest SHA-256:
`22c4178a09947f412effa5957aa47e3f8929e9dd8e901222906b08f03c2a5c49`.

Default dry-run SQL SHA-256:
`4919a49fa20ec02250de237e94b0d0720a5601b9b67406a1ccfea02749dcc0cf`.
Changing the apply setting intentionally changes the SQL checksum.
