-- Adds listing view tracking, so the per-listing analytics can report how much attention a
-- property receives (listing views) and how many different people looked at it (unique viewers).
--
-- Additive and safe for other branches: this only creates a new table. No existing table,
-- column or constraint is changed, so code that does not know about it is unaffected.
--
-- One row per view event. Rows are only ever inserted, never updated or deleted.
--
-- Views cannot be backfilled: counts start from the moment this ships. Periods that end before
-- then report as unavailable rather than zero, the same way the lifecycle metrics do.
--
-- Type matches the existing date columns (rental_date, payment.date): timestamp(6) without time zone.
-- Always write public.<table>: Supabase also has its own auth.users table.

-- ON DELETE matters here, because admins delete reported listings (ListingsService.deleteListing
-- is a hard delete). Without it, removing a listing anyone had viewed would fail on the foreign key.
--   listingid ON DELETE CASCADE  - views describe a listing, so they go when it goes
--   userid    ON DELETE SET NULL - if an account is ever removed the view still counts towards
--                                  listingViews; it only stops counting towards uniqueListingViewers
CREATE TABLE IF NOT EXISTS public.listing_view (
    id         BIGSERIAL    PRIMARY KEY,
    listingid  BIGINT       NOT NULL REFERENCES public.listings(listingid) ON DELETE CASCADE,
    userid     BIGINT       NULL     REFERENCES public.users(userid)       ON DELETE SET NULL,
    viewed_at  TIMESTAMP(6) NOT NULL,
    kind       VARCHAR(20)  NOT NULL
);

-- Every analytics query filters by listing and by period, so index both together.
CREATE INDEX IF NOT EXISTS idx_listing_view_listing_time
    ON public.listing_view (listingid, viewed_at);

-- kind is 'listing' today. 'photo' is reserved for photo gallery views, which need
-- multi-image listings first; keeping the column means that needs no further migration.
--
-- userid is nullable so an unauthenticated view could still be counted. Listings currently
-- require a login to open, so in practice it is always populated.

-- Check: the table and its five columns should be listed
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'listing_view' ORDER BY ordinal_position;

-- Undo:
-- DROP TABLE public.listing_view;
