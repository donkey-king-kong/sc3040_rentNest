-- READ ONLY. Export the full result as JSON before running the backfill.
-- Repeat afterward to check coverage and preservation of existing rows.
-- Run as an authorized role able to see all listings and amenities.
SELECT l.listingid,
       l.latitude,
       l.longitude,
       count(a.id) AS amenity_count,
       count(a.id) FILTER (WHERE a.amenity_type = 'school') AS schools,
       count(a.id) FILTER (WHERE a.amenity_type = 'hawker_centre') AS hawker_centres,
       count(a.id) FILTER (WHERE a.amenity_type = 'bus_stop') AS bus_stops,
       md5(coalesce(
           string_agg(to_jsonb(a)::text, E'\n' ORDER BY a.id)
               FILTER (WHERE a.id IS NOT NULL), ''
       )) AS amenity_fingerprint
FROM public.listings l
LEFT JOIN public.listing_nearby_amenities a ON a.listing_id = l.listingid
GROUP BY l.listingid, l.latitude, l.longitude
ORDER BY l.listingid;
