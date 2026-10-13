# Read-Only Database Audit

## Run

1. Open the intended Supabase project, then SQL Editor -> New query.
2. Paste the complete contents of [database-read-only-audit.sql](database-read-only-audit.sql).
3. Run with an authorized database role that can read all listed public tables.
   Row-level security can hide rows and make counts misleading. Do not disable RLS
   or change grants to run this audit; use an appropriately authorized session.
4. Export the single results grid as CSV and share that result for review.

The script contains one SELECT statement. It does not insert, update, delete,
create tables, or change constraints. It may scan large tables; use a quieter
period for a large/shared database and retain the editor's normal timeout.
If a table/column is missing or permission is denied, share the error rather than
modifying the database to make the script run.

## Read the Results

- `INVENTORY`: visible row counts for all 11 supplied tables.
- `ERROR`: invalid values/links or contradictions with the current application flow.
- `REVIEW`: possible legacy-data issues or workflow limitations needing human judgment.
- `INFO`: expected nullable fields, not defects by themselves.
- `affected_rows`: complete visible count for that check, not limited to samples.
- `sample_ids`: first 20 affected primary-key IDs, sorted numerically.

Start with ERROR rows whose count is above zero, then REVIEW rows. A row can trigger
several checks, so adding counts does not produce a unique affected-record total.
Duplicate-payment checks count payment rows in repeated rental/month groups, not
the number of duplicate groups.

Only counts and numeric sample IDs are exported, plus fixed explanations and the
audit run timestamp. No names, passwords, emails, contacts, photos, message text,
review text, or individual payment amounts are returned.

## Interpretation and Limits

The script uses the schema supplied on 2026-10-12 and the current termination
branch's exact status strings: rentals `pending`, `active`, `terminated`; requests
`Pending`, `terminated`, `rejected`. Other values need review, not automatic conversion.

A null listing tenant, an active rental's null termination timestamp, and null
text on a linked chat card are normal. Missing historical dates must not be
replaced with invented dates. Do not automatically delete repeated payments,
change tenant IDs, or overwrite contract terms based on audit flags.

The query is a first-pass data audit, not an exhaustive schema/security audit.
Roles and postal-coordinate tables are counted but do not have detailed checks.
It cannot prove that a payment happened, infer intended tenants after an overwrite,
or reconstruct missing history. Existing one-to-one constraints are reported as
limitations where relevant, not proposed for removal.

PostgreSQL syntax parsing passed, and all 56 rules have corresponding observation
checks. Database execution was not verified: the isolated local PostgreSQL instance
failed during startup. No application/Supabase database was accessed or changed.

Review the results before drafting repairs. Any eventual cleanup should have a
backup, explicit approval, and a separately tested transaction or migration.
