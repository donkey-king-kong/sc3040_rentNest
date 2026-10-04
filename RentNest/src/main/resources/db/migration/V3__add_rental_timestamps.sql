-- Add optional lifecycle columns without inventing dates for historical rentals.
-- The shared database migration is documented in
-- docs/db/changes/2026-09-17_add_lifecycle_timestamps.sql.
-- Run schema changes only through the team's documented database process.
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(6) NULL;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP(6) NULL;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMP(6) NULL;

-- Undo (only if this migration added the columns):
-- ALTER TABLE public.rentals DROP COLUMN terminated_at;
-- ALTER TABLE public.rentals DROP COLUMN accepted_at;
-- ALTER TABLE public.rentals DROP COLUMN created_at;
