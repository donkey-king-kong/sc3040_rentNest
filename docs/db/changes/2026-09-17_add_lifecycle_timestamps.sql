-- Adds lifecycle timestamps for analytics: when accounts and listings are created, and when
-- offers are sent, accepted and terminated.
--
-- Additive and safe for other branches: every column is optional (NULL allowed), and older code
-- simply ignores columns it does not know about.
--
-- Existing rows stay NULL. Nothing is backfilled, because the true dates are unknown; analytics
-- report these metrics as covering only the period after tracking started.
--
-- Applied to the shared database at 2026-09-17 02:25 SGT; analytics treat 02:26 SGT as the start of tracking.
-- Type matches the existing date columns (rental_date, payment.date): timestamp(6) without time zone.
-- Always write public.<table>: Supabase also has its own auth.users table.

ALTER TABLE public.users    ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP(6) NULL;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP(6) NULL;
ALTER TABLE public.rentals  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP(6) NULL;
ALTER TABLE public.rentals  ADD COLUMN IF NOT EXISTS accepted_at   TIMESTAMP(6) NULL;
ALTER TABLE public.rentals  ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP(6) NULL;

-- Check: all five columns should be listed
-- SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns
--  WHERE table_schema = 'public' AND column_name IN ('created_at', 'accepted_at', 'terminated_at')
--  ORDER BY table_name, column_name;

-- Undo:
-- ALTER TABLE public.rentals  DROP COLUMN terminated_at;
-- ALTER TABLE public.rentals  DROP COLUMN accepted_at;
-- ALTER TABLE public.rentals  DROP COLUMN created_at;
-- ALTER TABLE public.listings DROP COLUMN created_at;
-- ALTER TABLE public.users    DROP COLUMN created_at;
