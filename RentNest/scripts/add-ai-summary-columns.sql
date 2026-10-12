-- Adds the cached per-listing AI summary columns used by the recommendation feature.
--
-- Only needed when the application starts with spring.jpa.hibernate.ddl-auto=validate,
-- which run-local.sh does. Starting once with ddl-auto=update (as in
-- application.properties.example) lets Hibernate add these columns itself.
--
-- All three are nullable: a listing with no generated summary simply falls back to the
-- factual template, so this migration is safe to run on a populated database and needs
-- no backfill.
--
--   psql "$DATABASE_URL" -f scripts/add-ai-summary-columns.sql

ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS ai_summary            varchar(600),
    ADD COLUMN IF NOT EXISTS ai_summary_key        varchar(64),
    ADD COLUMN IF NOT EXISTS ai_summary_updated_at timestamp(6) with time zone;
