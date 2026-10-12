# Populate Enquiry Discussions

## Historical Rental Follow-On

The enquiry-only batch has been populated. The approved follow-on in
`historical-rentals-guide.md` backdates 34 discussions and adds accepted offers
and payment history. **After applying that follow-on, do not rerun
`seed-enquiry-discussions.sql`.** Its original exact-match timestamps are
superseded; it is not a repair tool for the updated history.

## What This Adds

- 35 listing discussions with six messages each.
- 209 new chat rows: 34 listing-linked opening enquiries and 175 ordinary replies.
- Existing message 209 is the opening enquiry for listing 115; it is not inserted,
  rewritten, or assigned a new ID. Five replies continue that discussion.
- No offers, rentals, termination requests, payments, reviews, or tenant
  assignments. No existing chat rows are updated or deleted.
- Admin and Photo Tester are excluded. Owners can also enquire about another
  owner's property.

Files:

- `enquiry-discussions-preview.md`: every discussion, participant, and timestamp.
- `enquiry-discussions.json`: exact dataset and assignment manifest.
- `seed-enquiry-discussions.sql`: self-contained Supabase script, including the
  manifest. No import or separate JSON upload is needed.
- `enquiry-discussion-seed-plan.md`: approved scope and assignments.

This is a demo-data batch, not messages actually sent by the named account
holders. The chats use natural language without demo labels in message bodies.

## Run in Supabase

1. Take a fresh backup of the target database and confirm you are in the intended
   RentNest project. The earlier pre-reset backup is not a current backup.
2. Pause application/backend writers while running the batch. Short table locks
   keep validation and insertion consistent; they time out after five seconds
   instead of waiting indefinitely. No running service is stopped by this file.
3. Open `seed-enquiry-discussions.sql` in the Supabase SQL Editor and run the
   **whole file unchanged first**. Its default setting is:

   ```sql
   INSERT INTO seed_settings VALUES (false);
   ```

   This is a dry run: temporary work tables and locks only, no persistent rows
   inserted. Expect `DRY RUN PASSED: no changes`, 35 discussions, 1 existing
   message, 209 planned new messages, and 0 inserted messages.
   In the per-listing result, listing 115 has 1 matching message and the other
   selected listings have 0.

4. If the dry run passes, change that single setting to:

   ```sql
   INSERT INTO seed_settings VALUES (true);
   ```

   Run the **whole file** again. It repeats validation before writing. Expect
   `APPLIED`, 209 inserted messages, and 6 matching messages for each of the 35
   listings. The result table is printed just before the final `COMMIT`.
   Confirm the entire SQL execution succeeded, not merely an intermediate result.

5. Rerun in dry-run mode to verify. An intact completed batch returns
   `ALREADY APPLIED: no changes`, 210 existing messages, and 0 inserted messages.
   A rerun in apply mode also inserts nothing. Additional real replies after a
   successful batch are preserved and do not prevent this no-op check.
6. Resume the app and refresh chats. Check user 2 / owner 31 for the existing
   listing-115 enquiry and five replies. Check user 22 / owner 1 for a new
   listing-59 card followed by five ordinary messages.
   View listing should open the assigned property. Do not tap Send rental offer
   or Offer this property as part of this seed.

## Dates and Timezone

All planned timestamps are on **12 October 2026, Singapore time**. New discussions
begin between 14:20 and 16:36. Listing 115 keeps the supplied timestamp
`17:01:58.855` and ends at `17:36:58.855`.

The script sets the session timezone locally to `Asia/Singapore`. Timestamp
columns without timezone retain those literal wall-clock values. For
timezone-aware columns, PostgreSQL converts using Singapore time. It does not
alter the existing message 209 to force a match.

The offset-free export does not independently prove the database's original
timezone convention. These times assume its supplied values represent Singapore
wall-clock time. If that convention is incorrect, stop and regenerate the dates;
do not bypass the checks. All messages are checked against account/listing
creation dates and the current time. There are no historical messages before
the exported listing creation dates.

## When the Script Refuses to Run

The transaction refuses to insert if:

- Message 209 is missing or its sender, recipient, text, timestamp, listing
  reference, snapshots, or null rental/request fields differ.
- A selected account or listing is missing, flagged, renamed, transferred,
  occupied, repriced, or has changed address. Both participants must remain
  ordinary USER accounts.
- A selected listing has a pending, active, null-status, or unrecognised-status
  rental. Only terminated rental history is allowed.
- A selected pair already has messages other than the exact message 209.
  This checks both directions, even if those messages concerned another listing.
- Only part of the batch exists, or matching messages have duplicates.
- Dates are in the future or precede creation timestamps.
- Locks cannot be obtained promptly, schema/permissions differ, or an ID
  sequence produces a duplicate key.

On a refusal, do not delete history or remove guards to force insertion. If the
error names existing conversations, export both directions for those pairs so
the discussion can be adjusted. For example, listing 59 uses users 1 and 22:

```sql
SELECT messageid, date, message, senderid, receiverid, listingid,
       listing_name_snapshot, listing_address_snapshot, rentalid, requestid
FROM public.chathistory
WHERE (senderid = 1 AND receiverid = 22)
   OR (senderid = 22 AND receiverid = 1)
ORDER BY date, messageid;
```

An SQL error rolls back the batch's row changes. If the editor connection remains
in an aborted transaction, run `ROLLBACK;` before retrying. PostgreSQL identity
sequences can have gaps after a failed insertion; that is normal and does not
mean partial chat rows were committed.

After a successful commit, do not broadly delete chat history to undo this
batch. Review a targeted cleanup against the manifest and any subsequent real
messages first. No automatic destructive cleanup is included.

## Verification

The script compares all pre-existing chat rows and fingerprints of users,
listings, rentals, requests, payments, and reviews before and after insertion.
Any detected change to those protected records aborts the transaction. It checks
that exactly 209 rows were added and that all 210 expected messages match.
Generated identity values are used; existing IDs and sequences are not reset.

Exact batch membership is determined by sender/recipient, timestamp, message
text, listing reference and both snapshots, with null rental/request references.
Message 209 must also match its original ID. This does not add permanent tracking
tables or new schema columns.

Local validation uses a disposable PostgreSQL database populated from the
non-sensitive export fields and representative existing records. It does not
connect to Supabase or change shared data. Native app rendering and the target
database's actual policies/triggers still require the dry run and app spot check.

All 21 local PostgreSQL 18.6 checks passed: dry run, initial insertion, repeated
application, later real replies, missing/changed existing enquiry, owner/price/
occupancy/flag drift, pending/active/unknown rental states, conflicting history,
creation-date mismatch, partial/duplicate batches, identity collision rollback,
unexpected trigger side-effect rollback, and timezone-aware columns.

Dataset SHA-256:
`7516d4522c3c7e833a1ac96bf1ee778272d2e54e6eed89ab913a918a0edee785`.
Default dry-run SQL SHA-256:
`be84aa9088954767afdc5dca2ac9fdb0d88d59edfae30c80782c9a9d5a775f82`.
Changing the apply setting intentionally changes the SQL checksum.
