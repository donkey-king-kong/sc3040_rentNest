-- Run with old backend instances stopped, before starting the updated backend.
-- PostgreSQL only. Does not repair inconsistent data or delete application rows.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE public.listings, public.rentals, public.chathistory IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.rentals WHERE status IS NULL
               OR status NOT IN ('pending', 'active', 'terminated')
               OR listingid IS NULL OR tenant_userid IS NULL)
       OR EXISTS (SELECT 1 FROM public.rentals r
                  LEFT JOIN public.listings l USING (listingid)
                  LEFT JOIN public.users u ON u.userid = r.tenant_userid
                  WHERE l.listingid IS NULL OR u.userid IS NULL OR l.owneruserid = r.tenant_userid)
       OR EXISTS (SELECT listingid FROM public.rentals
                  WHERE status IN ('pending', 'active') GROUP BY listingid HAVING count(*) > 1)
       OR EXISTS (SELECT 1 FROM public.rentals r JOIN public.listings l USING (listingid)
                  WHERE r.status = 'active' AND r.tenant_userid IS DISTINCT FROM l.tenantuserid)
       OR EXISTS (SELECT 1 FROM public.listings l WHERE l.tenantuserid IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM public.rentals r WHERE r.listingid = l.listingid
                                  AND r.status = 'active' AND r.tenant_userid = l.tenantuserid))
    THEN
        RAISE EXCEPTION 'Rental/occupancy preflight failed. Reconcile explicitly before migration.';
    END IF;
END $$;

-- Remove only single-column global uniqueness, regardless of Hibernate's name.
DO $$
DECLARE item record; listing_att smallint;
BEGIN
    SELECT attnum INTO listing_att FROM pg_attribute
    WHERE attrelid = 'public.rentals'::regclass AND attname = 'listingid';
    FOR item IN SELECT conname FROM pg_constraint
                WHERE conrelid = 'public.rentals'::regclass AND contype = 'u'
                  AND conkey = ARRAY[listing_att]
    LOOP
        EXECUTE format('ALTER TABLE public.rentals DROP CONSTRAINT %I RESTRICT', item.conname);
    END LOOP;
    FOR item IN SELECT conname FROM pg_constraint
                WHERE conrelid = 'public.rentals'::regclass AND contype = 'f'
                  AND conkey = ARRAY[listing_att]
    LOOP
        EXECUTE format('ALTER TABLE public.rentals DROP CONSTRAINT %I RESTRICT', item.conname);
    END LOOP;
    FOR item IN SELECT i.indexrelid::regclass AS index_name FROM pg_index i
                WHERE i.indrelid = 'public.rentals'::regclass AND i.indisunique
                  AND NOT i.indisprimary AND i.indpred IS NULL
                  AND i.indnkeyatts = 1 AND i.indkey[0] = listing_att
    LOOP
        EXECUTE format('DROP INDEX %s RESTRICT', item.index_name);
    END LOOP;
END $$;

-- The legacy FK cascaded listing deletion into rental history.
ALTER TABLE public.rentals ADD CONSTRAINT rentals_listing_history_fk
    FOREIGN KEY (listingid) REFERENCES public.listings(listingid) ON DELETE RESTRICT;
ALTER TABLE public.rentals DROP CONSTRAINT IF EXISTS rentals_canonical_status;
ALTER TABLE public.rentals ADD CONSTRAINT rentals_canonical_status
    CHECK (status IS NOT NULL AND status IN ('pending', 'active', 'terminated'));
ALTER TABLE public.rentals ALTER COLUMN listingid SET NOT NULL;
DROP INDEX IF EXISTS public.uq_listing_current_rental;
CREATE UNIQUE INDEX uq_listing_current_rental ON public.rentals (listingid)
    WHERE status IN ('pending', 'active');

ALTER TABLE public.chathistory
    ADD COLUMN IF NOT EXISTS listingid bigint,
    ADD COLUMN IF NOT EXISTS listing_name_snapshot text,
    ADD COLUMN IF NOT EXISTS listing_address_snapshot text;

-- Replace Hibernate-created enquiry FK if a developer started the new model first.
DO $$
DECLARE item record; listing_att smallint;
BEGIN
    SELECT attnum INTO listing_att FROM pg_attribute
    WHERE attrelid = 'public.chathistory'::regclass AND attname = 'listingid';
    FOR item IN SELECT conname FROM pg_constraint
                WHERE conrelid = 'public.chathistory'::regclass AND contype = 'f'
                  AND conkey = ARRAY[listing_att]
    LOOP
        EXECUTE format('ALTER TABLE public.chathistory DROP CONSTRAINT %I RESTRICT', item.conname);
    END LOOP;
END $$;
ALTER TABLE public.chathistory ADD CONSTRAINT chathistory_enquiry_listing_fk
    FOREIGN KEY (listingid) REFERENCES public.listings(listingid) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS chathistory_enquiry_listing_idx ON public.chathistory(listingid);
COMMIT;

SELECT indexdef FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'uq_listing_current_rental';
