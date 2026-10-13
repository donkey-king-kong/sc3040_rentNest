-- RentNest data audit. PostgreSQL / Supabase.
-- READ ONLY: one SELECT statement; no schema or data changes.
-- Run the whole file in Supabase SQL Editor with an authorized role that can
-- read all public tables. RLS/permissions can otherwise hide rows.
-- Output contains counts and at most 20 numeric IDs per finding, not personal
-- details, passwords, tokens, payment amounts, or message/review text.
-- ERROR = invalid relationship/value or contradiction with the current flow.
-- REVIEW = ambiguous legacy data or a design/workflow limitation, not a repair instruction.
-- INFO = inventory or an expected nullable field.
-- Zero-count findings are included. Samples are sorted by ID, not recency.
-- Dates are timestamp-without-time-zone in most supplied tables. This audit
-- compares stored dates only; it does not assume a timezone or invent dates.
-- Schema source: the user-supplied public schema, 2026-10-12.

WITH
inventory AS (
    SELECT 'users' AS table_name, count(*) AS row_count FROM public.users
    UNION ALL SELECT 'roles', count(*) FROM public.roles
    UNION ALL SELECT 'listings', count(*) FROM public.listings
    UNION ALL SELECT 'rentals', count(*) FROM public.rentals
    UNION ALL SELECT 'request', count(*) FROM public.request
    UNION ALL SELECT 'chathistory', count(*) FROM public.chathistory
    UNION ALL SELECT 'payment', count(*) FROM public.payment
    UNION ALL SELECT 'reviews', count(*) FROM public.reviews
    UNION ALL SELECT 'listing_view', count(*) FROM public.listing_view
    UNION ALL SELECT 'postal_code_coordinates', count(*) FROM public.postal_code_coordinates
    UNION ALL SELECT 'listing_nearby_amenities', count(*) FROM public.listing_nearby_amenities
),
rules (table_name, code, severity, explanation) AS (
    VALUES
    ('users', 'USER_NAME_BLANK', 'ERROR', 'Name is blank; no name values are exported.'),
    ('users', 'USER_ROLE_REVIEW', 'REVIEW', 'Role is missing/blank or outside USER, OWNER, ADMIN; confirm supported roles before changing.'),
    ('users', 'USER_CREATED_AT_MISSING', 'REVIEW', 'Creation timestamp missing; do not backfill with a guessed historical date.'),
    ('listings', 'LISTING_OWNER_INVALID', 'ERROR', 'Owner is missing or does not resolve to a user.'),
    ('listings', 'LISTING_TENANT_INVALID', 'ERROR', 'Non-null tenant does not resolve to a user; zero is not a substitute for NULL.'),
    ('listings', 'LISTING_OWNER_IS_TENANT', 'ERROR', 'Listing owner and tenant are the same user.'),
    ('listings', 'LISTING_CORE_FIELDS_MISSING', 'REVIEW', 'Name, location, or type is blank; inspect whether this is an incomplete listing.'),
    ('listings', 'LISTING_PRICE_INVALID', 'ERROR', 'Monthly asking price is missing or not positive.'),
    ('listings', 'LISTING_DIMENSIONS_REVIEW', 'REVIEW', 'Size/beds/bathrooms missing or nonpositive; confirm room-listing conventions.'),
    ('listings', 'LISTING_COORDINATES_INVALID', 'ERROR', 'Only one coordinate is present, or coordinates are outside geographic bounds.'),
    ('listings', 'LISTING_OCCUPANCY_WITHOUT_ACTIVE_RENTAL', 'REVIEW', 'Tenant is set but no active rental exists; may reflect termination not clearing occupancy.'),
    ('listings', 'LISTING_TENANT_NULL', 'INFO', 'Null listing tenant is valid for a vacant property; not a cleanup target by itself.'),
    ('rentals', 'RENTAL_LISTING_INVALID', 'ERROR', 'Listing is missing or cannot be resolved.'),
    ('rentals', 'RENTAL_TENANT_INVALID', 'ERROR', 'Tenant is missing or cannot be resolved; supplied schema has no tenant foreign key.'),
    ('rentals', 'RENTAL_OWNER_IS_TENANT', 'ERROR', 'Rental tenant equals listing owner; investigate legacy acceptance overwrites.'),
    ('rentals', 'RENTAL_STATUS_REVIEW', 'REVIEW', 'Status is not exactly pending, active, or terminated; current lifecycle handlers use exact strings.'),
    ('rentals', 'RENTAL_MONEY_INVALID', 'ERROR', 'Rent is missing/nonpositive or deposit is missing/negative; zero deposit is not automatically invalid.'),
    ('rentals', 'RENTAL_DATES_INVALID', 'ERROR', 'Start/end missing or expiry is not after start.'),
    ('rentals', 'ACTIVE_TENANT_MISMATCH', 'ERROR', 'Active rental tenant differs from listing tenant, including a missing listing tenant.'),
    ('rentals', 'ACCEPTANCE_TIMESTAMP_MISSING', 'REVIEW', 'Active/terminated rental lacks accepted_at; externally inserted legacy records may lack provenance.'),
    ('rentals', 'TERMINATED_TIMESTAMP_MISSING', 'ERROR', 'Terminated rental lacks terminated_at; the current acceptance command records it.'),
    ('rentals', 'UNTERMINATED_WITH_TIMESTAMP', 'ERROR', 'A non-terminated rental has terminated_at.'),
    ('rentals', 'PENDING_WITH_ACCEPTANCE', 'REVIEW', 'Pending rental has accepted_at; verify its actual state.'),
    ('rentals', 'LIFECYCLE_DATE_ORDER', 'REVIEW', 'Creation follows acceptance or termination precedes acceptance; verify timestamp provenance.'),
    ('rentals', 'TERMINATED_WITHOUT_ACCEPTED_REQUEST', 'REVIEW', 'Terminated rental has no terminated request; could be a legacy direct update.'),
    ('rentals', 'ACTIVE_WITHOUT_TERMINATED_AT', 'INFO', 'An active rental with NULL terminated_at is expected.'),
    ('request', 'REQUEST_RENTAL_INVALID', 'ERROR', 'Rental link is missing or cannot be resolved.'),
    ('request', 'REQUEST_STATUS_REVIEW', 'REVIEW', 'Status is not exactly Pending, terminated, or rejected; current decision API uses these strings.'),
    ('request', 'REQUEST_REFUND_INVALID', 'ERROR', 'Refund is negative or missing. Zero is a valid no-refund agreement.'),
    ('request', 'REQUEST_REFUND_JS_PRECISION', 'REVIEW', 'Refund exceeds JavaScript safe integer range; existing frontend JSON may lose precision.'),
    ('request', 'ACCEPTED_REQUEST_RENTAL_CONFLICT', 'ERROR', 'Terminated request links to a rental that is not terminated or lacks terminated_at.'),
    ('request', 'PENDING_REQUEST_RENTAL_CONFLICT', 'ERROR', 'Pending request links to a rental that is not active or already has terminated_at.'),
    ('request', 'REJECTED_REQUEST_RENTAL_CONFLICT', 'REVIEW', 'Rejected request links to a non-active rental; current rejection leaves the lease active.'),
    ('request', 'REQUEST_CHAT_MISSING', 'REVIEW', 'Request has no linked chat card; may be an incomplete external insert.'),
    ('request', 'REJECTED_REQUEST_REPROPOSAL_LIMIT', 'REVIEW', 'Rejected request is retained; UNIQUE rentalid prevents a second request. This is a design limit, not corrupt data.'),
    ('chathistory', 'CHAT_PARTICIPANT_INVALID', 'ERROR', 'Sender/receiver missing or cannot be resolved.'),
    ('chathistory', 'CHAT_SELF_MESSAGE', 'REVIEW', 'Sender and receiver are identical; verify whether intentional.'),
    ('chathistory', 'CHAT_DATE_MISSING', 'REVIEW', 'Message timestamp missing; ordering/display may fail. Do not guess a historical timestamp.'),
    ('chathistory', 'CHAT_LINK_INVALID', 'ERROR', 'A non-null request or rental link cannot be resolved.'),
    ('chathistory', 'CHAT_BOTH_LINK_TYPES', 'REVIEW', 'Both request and rental links set; current creation uses one card type per message.'),
    ('chathistory', 'CHAT_EMPTY_WITHOUT_CARD', 'ERROR', 'No nonblank message and neither a request nor rental card link.'),
    ('chathistory', 'REQUEST_CHAT_PARTICIPANTS_MISMATCH', 'ERROR', 'Termination card is not sent from linked listing owner to linked rental tenant.'),
    ('chathistory', 'OFFER_CHAT_PARTICIPANTS_MISMATCH', 'REVIEW', 'Rental-linked message is not owner-to-tenant; verify its intended message type.'),
    ('chathistory', 'CHAT_TEXT_NULL_WITH_CARD', 'INFO', 'NULL text on a linked card is expected, not missing ordinary chat content.'),
    ('payment', 'PAYMENT_RENTAL_INVALID', 'ERROR', 'Rental is missing or cannot be resolved.'),
    ('payment', 'PAYMENT_AMOUNT_INVALID', 'ERROR', 'Payment amount is missing or nonpositive.'),
    ('payment', 'PAYMENT_DATE_MISSING', 'ERROR', 'Payment date missing; current rent accounting relies on its month.'),
    ('payment', 'PAYMENT_AMOUNT_DIFFERS_FROM_RENT', 'REVIEW', 'Amount differs from rental monthly price; investigate deposit/adjustment/legacy entries before changing.'),
    ('payment', 'PAYMENT_DUPLICATE_RENT_MONTH', 'REVIEW', 'Several payments in one rental/month; could be duplicates or split payments. Do not delete automatically.'),
    ('payment', 'PAYMENT_OUTSIDE_LEASE_MONTHS', 'REVIEW', 'Payment month falls outside contractual start/expiry months; payment date is used as billing month.'),
    ('reviews', 'REVIEW_USER_INVALID', 'ERROR', 'Reviewer or reviewed user does not resolve.'),
    ('reviews', 'REVIEW_RATING_REVIEW', 'REVIEW', 'Rating outside 1..5; confirm rating scale.'),
    ('reviews', 'REVIEW_SELF', 'REVIEW', 'Reviewer and reviewed user match.'),
    ('listing_view', 'VIEW_LINK_INVALID', 'ERROR', 'Listing is invalid, or a non-null user does not resolve. Anonymous user NULL is permitted.'),
    ('listing_view', 'VIEW_KIND_BLANK', 'REVIEW', 'View kind is blank.'),
    ('listing_nearby_amenities', 'AMENITY_VALUES_INVALID', 'ERROR', 'Missing listing, invalid coordinates, negative distance, or nonpositive rank.')
),
observations AS (
    SELECT 'users' AS table_name, u.userid AS record_id, x.code
    FROM public.users u
    CROSS JOIN LATERAL (VALUES
        ('USER_NAME_BLANK', nullif(btrim(u.name), '') IS NULL),
        ('USER_ROLE_REVIEW', u.role IS NULL OR u.role NOT IN ('USER', 'OWNER', 'ADMIN')),
        ('USER_CREATED_AT_MISSING', u.created_at IS NULL)
    ) x(code, applies) WHERE x.applies
    UNION ALL
    SELECT 'listings', l.listingid, x.code
    FROM public.listings l
    LEFT JOIN public.users o ON o.userid = l.owneruserid
    LEFT JOIN public.users t ON t.userid = l.tenantuserid
    CROSS JOIN LATERAL (VALUES
        ('LISTING_OWNER_INVALID', o.userid IS NULL),
        ('LISTING_TENANT_INVALID', l.tenantuserid IS NOT NULL AND t.userid IS NULL),
        ('LISTING_OWNER_IS_TENANT', l.owneruserid = l.tenantuserid),
        ('LISTING_CORE_FIELDS_MISSING', nullif(btrim(l.name), '') IS NULL OR nullif(btrim(l.location), '') IS NULL OR nullif(btrim(l.type), '') IS NULL),
        ('LISTING_PRICE_INVALID', l.price IS NULL OR l.price <= 0),
        ('LISTING_DIMENSIONS_REVIEW', l.size IS NULL OR l.size <= 0 OR l.beds IS NULL OR l.beds <= 0 OR l.bathroom IS NULL OR l.bathroom <= 0),
        ('LISTING_COORDINATES_INVALID', (l.latitude IS NULL) <> (l.longitude IS NULL) OR l.latitude NOT BETWEEN -90 AND 90 OR l.longitude NOT BETWEEN -180 AND 180),
        ('LISTING_OCCUPANCY_WITHOUT_ACTIVE_RENTAL', l.tenantuserid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.rentals r WHERE r.listingid = l.listingid AND r.status = 'active')),
        ('LISTING_TENANT_NULL', l.tenantuserid IS NULL)
    ) x(code, applies) WHERE x.applies
    UNION ALL
    SELECT 'rentals', r.rentalid, x.code
    FROM public.rentals r
    LEFT JOIN public.listings l ON l.listingid = r.listingid
    LEFT JOIN public.users t ON t.userid = r.tenant_userid
    CROSS JOIN LATERAL (VALUES
        ('RENTAL_LISTING_INVALID', l.listingid IS NULL),
        ('RENTAL_TENANT_INVALID', t.userid IS NULL),
        ('RENTAL_OWNER_IS_TENANT', r.tenant_userid = l.owneruserid),
        ('RENTAL_STATUS_REVIEW', r.status IS NULL OR r.status NOT IN ('pending', 'active', 'terminated')),
        ('RENTAL_MONEY_INVALID', r.rental_price IS NULL OR r.rental_price <= 0 OR r.deposit_price IS NULL OR r.deposit_price < 0),
        ('RENTAL_DATES_INVALID', r.rental_date IS NULL OR r.lease_expiry IS NULL OR r.lease_expiry <= r.rental_date),
        ('ACTIVE_TENANT_MISMATCH', r.status = 'active' AND l.listingid IS NOT NULL AND r.tenant_userid IS DISTINCT FROM l.tenantuserid),
        ('ACCEPTANCE_TIMESTAMP_MISSING', r.status IN ('active', 'terminated') AND r.accepted_at IS NULL),
        ('TERMINATED_TIMESTAMP_MISSING', r.status = 'terminated' AND r.terminated_at IS NULL),
        ('UNTERMINATED_WITH_TIMESTAMP', r.status IS DISTINCT FROM 'terminated' AND r.terminated_at IS NOT NULL),
        ('PENDING_WITH_ACCEPTANCE', r.status = 'pending' AND r.accepted_at IS NOT NULL),
        ('LIFECYCLE_DATE_ORDER', r.created_at > r.accepted_at OR r.terminated_at < r.accepted_at),
        ('TERMINATED_WITHOUT_ACCEPTED_REQUEST', r.status = 'terminated' AND NOT EXISTS (SELECT 1 FROM public.request q WHERE q.rentalid = r.rentalid AND q.status = 'terminated')),
        ('ACTIVE_WITHOUT_TERMINATED_AT', r.status = 'active' AND r.terminated_at IS NULL)
    ) x(code, applies) WHERE x.applies
    UNION ALL
    SELECT 'request', q.requestid, x.code
    FROM public.request q
    LEFT JOIN public.rentals r ON r.rentalid = q.rentalid
    CROSS JOIN LATERAL (VALUES
        ('REQUEST_RENTAL_INVALID', r.rentalid IS NULL),
        ('REQUEST_STATUS_REVIEW', q.status IS NULL OR q.status NOT IN ('Pending', 'terminated', 'rejected')),
        ('REQUEST_REFUND_INVALID', q.refund_amount IS NULL OR q.refund_amount < 0),
        ('REQUEST_REFUND_JS_PRECISION', q.refund_amount > 9007199254740991),
        ('ACCEPTED_REQUEST_RENTAL_CONFLICT', q.status = 'terminated' AND r.rentalid IS NOT NULL AND (r.status IS DISTINCT FROM 'terminated' OR r.terminated_at IS NULL)),
        ('PENDING_REQUEST_RENTAL_CONFLICT', q.status = 'Pending' AND r.rentalid IS NOT NULL AND (r.status IS DISTINCT FROM 'active' OR r.terminated_at IS NOT NULL)),
        ('REJECTED_REQUEST_RENTAL_CONFLICT', q.status = 'rejected' AND r.rentalid IS NOT NULL AND r.status IS DISTINCT FROM 'active'),
        ('REQUEST_CHAT_MISSING', NOT EXISTS (SELECT 1 FROM public.chathistory c WHERE c.requestid = q.requestid)),
        ('REJECTED_REQUEST_REPROPOSAL_LIMIT', q.status = 'rejected')
    ) x(code, applies) WHERE x.applies
    UNION ALL
    SELECT 'chathistory', c.messageid, x.code
    FROM public.chathistory c
    LEFT JOIN public.users s ON s.userid = c.senderid
    LEFT JOIN public.users d ON d.userid = c.receiverid
    LEFT JOIN public.request q ON q.requestid = c.requestid
    LEFT JOIN public.rentals qr ON qr.rentalid = q.rentalid
    LEFT JOIN public.listings ql ON ql.listingid = qr.listingid
    LEFT JOIN public.rentals r ON r.rentalid = c.rentalid
    LEFT JOIN public.listings l ON l.listingid = r.listingid
    CROSS JOIN LATERAL (VALUES
        ('CHAT_PARTICIPANT_INVALID', s.userid IS NULL OR d.userid IS NULL),
        ('CHAT_SELF_MESSAGE', c.senderid = c.receiverid),
        ('CHAT_DATE_MISSING', c.date IS NULL),
        ('CHAT_LINK_INVALID', (c.requestid IS NOT NULL AND q.requestid IS NULL) OR (c.rentalid IS NOT NULL AND r.rentalid IS NULL)),
        ('CHAT_BOTH_LINK_TYPES', c.requestid IS NOT NULL AND c.rentalid IS NOT NULL),
        ('CHAT_EMPTY_WITHOUT_CARD', nullif(btrim(c.message), '') IS NULL AND c.requestid IS NULL AND c.rentalid IS NULL),
        ('REQUEST_CHAT_PARTICIPANTS_MISMATCH', qr.rentalid IS NOT NULL AND ql.listingid IS NOT NULL AND (c.senderid IS DISTINCT FROM ql.owneruserid OR c.receiverid IS DISTINCT FROM qr.tenant_userid)),
        ('OFFER_CHAT_PARTICIPANTS_MISMATCH', r.rentalid IS NOT NULL AND l.listingid IS NOT NULL AND (c.senderid IS DISTINCT FROM l.owneruserid OR c.receiverid IS DISTINCT FROM r.tenant_userid)),
        ('CHAT_TEXT_NULL_WITH_CARD', c.message IS NULL AND (c.requestid IS NOT NULL OR c.rentalid IS NOT NULL))
    ) x(code, applies) WHERE x.applies
    UNION ALL
    SELECT 'payment', p.payment_id, x.code
    FROM (
        SELECT p.*, count(*) OVER (PARTITION BY rentalid, date_trunc('month', date)) AS month_count
        FROM public.payment p
    ) p
    LEFT JOIN public.rentals r ON r.rentalid = p.rentalid
    CROSS JOIN LATERAL (VALUES
        ('PAYMENT_RENTAL_INVALID', r.rentalid IS NULL),
        ('PAYMENT_AMOUNT_INVALID', p.amount IS NULL OR p.amount <= 0),
        ('PAYMENT_DATE_MISSING', p.date IS NULL),
        ('PAYMENT_AMOUNT_DIFFERS_FROM_RENT', p.amount <> r.rental_price),
        ('PAYMENT_DUPLICATE_RENT_MONTH', p.rentalid IS NOT NULL AND p.date IS NOT NULL AND p.month_count > 1),
        ('PAYMENT_OUTSIDE_LEASE_MONTHS', date_trunc('month', p.date) < date_trunc('month', r.rental_date) OR date_trunc('month', p.date) > date_trunc('month', r.lease_expiry))
    ) x(code, applies) WHERE x.applies
    UNION ALL
    SELECT 'reviews', v.reviewid, x.code
    FROM public.reviews v
    LEFT JOIN public.users a ON a.userid = v.reviewerid
    LEFT JOIN public.users b ON b.userid = v.userid
    CROSS JOIN LATERAL (VALUES
        ('REVIEW_USER_INVALID', a.userid IS NULL OR b.userid IS NULL),
        ('REVIEW_RATING_REVIEW', v.rating IS NULL OR v.rating NOT BETWEEN 1 AND 5),
        ('REVIEW_SELF', v.reviewerid = v.userid)
    ) x(code, applies) WHERE x.applies
    UNION ALL
    SELECT 'listing_view', v.id, x.code
    FROM public.listing_view v
    LEFT JOIN public.listings l ON l.listingid = v.listingid
    LEFT JOIN public.users u ON u.userid = v.userid
    CROSS JOIN LATERAL (VALUES
        ('VIEW_LINK_INVALID', l.listingid IS NULL OR (v.userid IS NOT NULL AND u.userid IS NULL)),
        ('VIEW_KIND_BLANK', nullif(btrim(v.kind), '') IS NULL)
    ) x(code, applies) WHERE x.applies
    UNION ALL
    SELECT 'listing_nearby_amenities', a.id, 'AMENITY_VALUES_INVALID'
    FROM public.listing_nearby_amenities a
    LEFT JOIN public.listings l ON l.listingid = a.listing_id
    WHERE l.listingid IS NULL OR a.latitude NOT BETWEEN -90 AND 90
        OR a.longitude NOT BETWEEN -180 AND 180 OR a.distance_meters < 0
        OR a.distance_meters = 'NaN'::double precision
        OR a.distance_meters = 'Infinity'::double precision OR a.rank <= 0
),
ranked AS (
    SELECT table_name, code, record_id,
        row_number() OVER (PARTITION BY table_name, code ORDER BY record_id) AS sample_rank
    FROM observations
),
summary AS (
    SELECT table_name, code, count(*) AS affected_rows,
        array_agg(record_id ORDER BY record_id) FILTER (WHERE sample_rank <= 20) AS sample_ids
    FROM ranked GROUP BY table_name, code
),
report AS (
    SELECT 'INVENTORY' AS section, 'INFO' AS severity, table_name, 'ROW_COUNT' AS check_code,
        row_count AS affected_rows, ARRAY[]::bigint[] AS sample_ids,
        'Rows visible to the executing role. RLS or permissions may limit coverage.' AS explanation
    FROM inventory
    UNION ALL
    SELECT 'CHECK', r.severity, r.table_name, r.code, coalesce(s.affected_rows, 0),
        coalesce(s.sample_ids, ARRAY[]::bigint[]), r.explanation
    FROM rules r LEFT JOIN summary s USING (table_name, code)
)
SELECT section, severity, table_name, check_code, affected_rows, sample_ids, explanation,
    statement_timestamp() AS audit_run_at
FROM report
ORDER BY CASE section WHEN 'INVENTORY' THEN 0 ELSE 1 END,
    CASE severity WHEN 'ERROR' THEN 0 WHEN 'REVIEW' THEN 1 ELSE 2 END,
    table_name, check_code;
