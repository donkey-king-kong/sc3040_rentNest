-- Only removes the three retired cache columns from public.listings.
-- Stop ALL old backend instances first, including teammates' instances.
-- Rebuild/deploy the updated backend before restarting: old binaries using
-- ddl-auto=update can recreate the columns, and old listing queries need them.
-- Keep a current backup. Any stored summary text is permanently discarded.
-- Run this entire file in the intended Supabase project's SQL Editor.
-- No CASCADE, table deletion, listing deletion, or sequence reset.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.listings
    DROP COLUMN IF EXISTS ai_summary RESTRICT,
    DROP COLUMN IF EXISTS ai_summary_key RESTRICT,
    DROP COLUMN IF EXISTS ai_summary_updated_at RESTRICT;

COMMIT;

-- Expected: zero rows. Repeat after starting the rebuilt backend.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'listings'
  AND column_name IN ('ai_summary', 'ai_summary_key', 'ai_summary_updated_at');
