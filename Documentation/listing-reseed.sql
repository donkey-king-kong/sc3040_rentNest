-- RentNest approved demo listing import, 2026-10-12.
-- Run the ENTIRE file in the intended TEST Supabase SQL Editor.
-- Writes exactly 19 new listings. No old IDs, tenants, history, or amenities.
-- All imported listings are unflagged, as explicitly requested.
-- Stop backend/app writes first. Retain the verified pre-reset backup.
-- Refuses nonempty reset tables, insufficient users, and reruns.
-- On error: nothing is committed; use ROLLBACK if your session remains aborted.
-- Identity sequences can advance even on rollback; gaps are expected.
-- Contains backed-up property details/photo URLs. Keep private; do not publish.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL timezone = 'UTC';

LOCK TABLE public.users IN SHARE MODE;
LOCK TABLE public.listings, public.rentals, public.request, public.payment,
    public.chathistory, public.reviews, public.listing_view,
    public.listing_nearby_amenities IN ACCESS EXCLUSIVE MODE;

CREATE TEMP TABLE rentnest_seed_mapping (
    source_listing_id bigint PRIMARY KEY,
    new_listing_id bigint UNIQUE NOT NULL,
    owner_user_id bigint NOT NULL
) ON COMMIT DROP;

DO $seed$
DECLARE
    source_row public.listings%ROWTYPE;
    owner_ids bigint[];
    new_id bigint;
    position integer := 0;
    properties jsonb;
BEGIN
    IF EXISTS (SELECT 1 FROM public.listings)
        OR EXISTS (SELECT 1 FROM public.rentals)
        OR EXISTS (SELECT 1 FROM public.request)
        OR EXISTS (SELECT 1 FROM public.payment)
        OR EXISTS (SELECT 1 FROM public.chathistory)
        OR EXISTS (SELECT 1 FROM public.reviews)
        OR EXISTS (SELECT 1 FROM public.listing_view)
        OR EXISTS (SELECT 1 FROM public.listing_nearby_amenities) THEN
        RAISE EXCEPTION 'Seed refused: listings and all seven related reset tables must be empty.';
    END IF;

    SELECT array_agg(userid ORDER BY userid) INTO owner_ids
    FROM (SELECT userid FROM public.users ORDER BY userid LIMIT 10) owners;
    IF coalesce(array_length(owner_ids, 1), 0) < 10 THEN
        RAISE EXCEPTION 'Seed refused: at least ten existing users are required.';
    END IF;

    properties := $properties$
[
  {
    "beds": 2,
    "name": "Toa Payoh Two-Bedroom HDB",
    "size": 650,
    "type": "HDB",
    "floor": 8,
    "price": 2700,
    "postal": 310085,
    "bathroom": 1,
    "latitude": 1.336285,
    "location": "85 Lorong 4 Toa Payoh, Toa Payoh",
    "listingid": 38,
    "longitude": 103.848429,
    "description": "Two-bedroom HDB flat at 85 Lorong 4 Toa Payoh, with one bathroom and 650 sq ft of living space. A practical home with room for dining and everyday living.",
    "unit_number": "08-312",
    "listingpicture": "https://images.unsplash.com/photo-1611818831327-de3982fe1420?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 4,
    "name": "Orchard Road Condo",
    "size": 2400,
    "type": "Condo",
    "floor": 15,
    "price": 16500,
    "postal": 239694,
    "bathroom": 4,
    "latitude": 1.29973,
    "location": "Grange Road",
    "listingid": 39,
    "longitude": 103.835588,
    "description": "A 2,400 sq ft apartment along Grange Road, offering 4 bedrooms and four bathrooms. Located on floor 15, with space to arrange a lounge and dining area.",
    "unit_number": "15-05",
    "listingpicture": "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 3,
    "name": "Tampines Three-Bedroom HDB",
    "size": 900,
    "type": "HDB",
    "floor": 12,
    "price": 3850,
    "postal": 520132,
    "bathroom": 2,
    "latitude": 1.346739,
    "location": "Tampines Street 43",
    "listingid": 40,
    "longitude": 103.955937,
    "description": "Three-bedroom HDB flat along Tampines Street 43. This floor-12 home offers 900 sq ft and two bathrooms, with a layout suited to everyday living.",
    "unit_number": "12-450",
    "listingpicture": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 3,
    "name": "The Vales Condo",
    "size": 1280,
    "type": "Condo",
    "floor": 6,
    "price": 7400,
    "postal": 544628,
    "bathroom": 2,
    "latitude": 1.396756898094273,
    "location": "87 Anchorvale Crescent",
    "listingid": 41,
    "longitude": 103.8934620370307,
    "description": "Located at 87 Anchorvale Crescent, this apartment has 3 bedrooms, two bathrooms and 1,280 sq ft of space. A comfortable base for a household to make its own.",
    "unit_number": "06-18",
    "listingpicture": "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 2,
    "name": "Queenstown Two-Bedroom HDB",
    "size": 700,
    "type": "HDB",
    "floor": 4,
    "price": 3100,
    "postal": 140055,
    "bathroom": 2,
    "latitude": 1.293383,
    "location": "Commonwealth Avenue",
    "listingid": 42,
    "longitude": 103.809331,
    "description": "Two-bedroom HDB flat at Commonwealth Avenue, with two bathrooms and 700 sq ft of living space. A practical home with room for dining and everyday living.",
    "unit_number": "04-22",
    "listingpicture": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 3,
    "name": "East Coast Condo",
    "size": 1460,
    "type": "Condo",
    "floor": 10,
    "price": 9200,
    "postal": 449282,
    "bathroom": 3,
    "latitude": 1.304829,
    "location": "Marine Parade Road",
    "listingid": 43,
    "longitude": 103.909545,
    "description": "A 1,460 sq ft apartment along Marine Parade Road, offering 3 bedrooms and three bathrooms. Located on floor 10, with space to arrange a lounge and dining area.",
    "unit_number": "10-08",
    "listingpicture": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 3,
    "name": "Yishun Three-Bedroom HDB",
    "size": 950,
    "type": "HDB",
    "floor": 9,
    "price": 4250,
    "postal": 760231,
    "bathroom": 2,
    "latitude": 1.434071,
    "location": "Yishun Ring Road",
    "listingid": 44,
    "longitude": 103.837079,
    "description": "Three-bedroom HDB flat along Yishun Ring Road. This floor-9 home offers 950 sq ft and two bathrooms, with a layout suited to everyday living.",
    "unit_number": "09-101",
    "listingpicture": "https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 4,
    "name": "Bukit Timah Terrace House",
    "size": 2200,
    "type": "Landed",
    "floor": 2,
    "price": 9500,
    "postal": 277676,
    "bathroom": 3,
    "latitude": 1.311316,
    "location": "Jalan Kampong Chantek",
    "listingid": 45,
    "longitude": 103.795243,
    "description": "Spacious inter-terrace house in prestigious Bukit Timah area. Minutes to Sixth Avenue MRT and elite schools. Private garden and car porch included.",
    "unit_number": "N/A",
    "listingpicture": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 4,
    "name": "Ang Mo Kio Four-Bedroom HDB",
    "size": 1540,
    "type": "HDB",
    "floor": 6,
    "price": 7600,
    "postal": 560528,
    "bathroom": 3,
    "latitude": 1.372598,
    "location": "528 Ang Mo Kio Avenue 10, Ang Mo Kio",
    "listingid": 46,
    "longitude": 103.854878,
    "description": "Located at 528 Ang Mo Kio Avenue 10, this HDB flat has 4 bedrooms, three bathrooms and 1,540 sq ft of space. A comfortable base for a household to make its own.",
    "unit_number": "06-567",
    "listingpicture": "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 4,
    "name": "Novena Condo",
    "size": 1880,
    "type": "Condo",
    "floor": 18,
    "price": 12500,
    "postal": 307591,
    "bathroom": 3,
    "latitude": 1.316991,
    "location": "Thomson Road",
    "listingid": 47,
    "longitude": 103.843867,
    "description": "Four-bedroom apartment at Thomson Road, with three bathrooms and 1,880 sq ft of living space. A practical home with room for dining and everyday living.",
    "unit_number": "18-03",
    "listingpicture": "https://images.unsplash.com/photo-1499955085172-a104c9463ece?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 2,
    "name": "Sengkang Family Flat",
    "size": 740,
    "type": "HDB",
    "floor": 8,
    "price": 2800,
    "postal": 540127,
    "bathroom": 2,
    "latitude": 1.390594,
    "location": "127 Rivervale Street, Sengkang",
    "listingid": 48,
    "longitude": 103.902214,
    "description": "A 740 sq ft HDB flat along 127 Rivervale Street, offering 2 bedrooms and two bathrooms. Located on floor 8, with space to arrange a lounge and dining area.",
    "unit_number": "08-101",
    "listingpicture": "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 2,
    "name": "Tampines Condo",
    "size": 980,
    "type": "Condo",
    "floor": 9,
    "price": 5800,
    "postal": 528460,
    "bathroom": 2,
    "latitude": 1.34409,
    "location": "51 Tampines Lane, Tampines",
    "listingid": 49,
    "longitude": 103.948084,
    "description": "Two-bedroom apartment along 51 Tampines Lane. This floor-9 home offers 980 sq ft and two bathrooms, with a layout suited to everyday living.",
    "unit_number": "09-102",
    "listingpicture": "https://images.unsplash.com/photo-1556020685-ae41abfc9365?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 1,
    "name": "Woodlands Compact Flat",
    "size": 450,
    "type": "HDB",
    "floor": 10,
    "price": 2000,
    "postal": 730301,
    "bathroom": 1,
    "latitude": 1.431505,
    "location": "301 Woodlands Street 31, Woodlands",
    "listingid": 50,
    "longitude": 103.773516,
    "description": "Located at 301 Woodlands Street 31, this HDB flat has 1 bedrooms, one bathroom and 450 sq ft of space. A comfortable base for a household to make its own.",
    "unit_number": "10-103",
    "listingpicture": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 4,
    "name": "Changi Spacious Condo",
    "size": 2180,
    "type": "Condo",
    "floor": 6,
    "price": 11000,
    "postal": 509064,
    "bathroom": 4,
    "latitude": 1.366919,
    "location": "212 Loyang Avenue, Changi",
    "listingid": 51,
    "longitude": 103.970689,
    "description": "Four-bedroom apartment at 212 Loyang Avenue, with four bathrooms and 2,180 sq ft of living space. A practical home with room for dining and everyday living.",
    "unit_number": "06-104",
    "listingpicture": "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 2,
    "name": "Hougang Bright Two-Bedroom Condo",
    "size": 860,
    "type": "Condo",
    "floor": 8,
    "price": 5200,
    "postal": 534785,
    "bathroom": 2,
    "latitude": 1.370736,
    "location": "1189 Upper Serangoon Road, Hougang",
    "listingid": 54,
    "longitude": 103.895121,
    "description": "A 860 sq ft apartment along 1189 Upper Serangoon Road, offering 2 bedrooms and two bathrooms. Located on floor 8, with space to arrange a lounge and dining area.",
    "unit_number": "08-12",
    "listingpicture": "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 2,
    "name": "Katong Balcony Condo",
    "size": 1050,
    "type": "Condo",
    "floor": 11,
    "price": 7600,
    "postal": 439957,
    "bathroom": 2,
    "latitude": 1.301376,
    "location": "1 Amber Gardens, Katong",
    "listingid": 55,
    "longitude": 103.898167,
    "description": "Two-bedroom apartment along 1 Amber Gardens. This floor-11 home offers 1,050 sq ft and two bathrooms, with a layout suited to everyday living.",
    "unit_number": "11-04",
    "listingpicture": "https://images.unsplash.com/photo-1612320648993-61c1cd604b71?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 2,
    "name": "Holland Two-Bedroom Balcony Condo",
    "size": 1120,
    "type": "Condo",
    "floor": 11,
    "price": 8500,
    "postal": 278743,
    "bathroom": 2,
    "latitude": 1.310512,
    "location": "12 Holland Hill, Holland",
    "listingid": 56,
    "longitude": 103.80069,
    "description": "Located at 12 Holland Hill, this apartment has 2 bedrooms, two bathrooms and 1,120 sq ft of space. A comfortable base for a household to make its own.",
    "unit_number": "11-08",
    "listingpicture": "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 2,
    "name": "Tampines Corner Condo",
    "size": 810,
    "type": "Condo",
    "floor": 6,
    "price": 5000,
    "postal": 528462,
    "bathroom": 1,
    "latitude": 1.344056,
    "location": "47 Tampines Lane, Tampines",
    "listingid": 57,
    "longitude": 103.947394,
    "description": "Two-bedroom apartment at 47 Tampines Lane, with one bathroom and 810 sq ft of living space. A practical home with room for dining and everyday living.",
    "unit_number": "06-06",
    "listingpicture": "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fm=jpg&w=1200&q=85"
  },
  {
    "beds": 1,
    "name": "River Valley Compact City Condo",
    "size": 650,
    "type": "Condo",
    "floor": 15,
    "price": 5400,
    "postal": 237988,
    "bathroom": 1,
    "latitude": 1.294162,
    "location": "2 Martin Place, River Valley",
    "listingid": 58,
    "longitude": 103.838428,
    "description": "A 650 sq ft apartment along 2 Martin Place, offering 1 bedrooms and one bathroom. Located on floor 15, with space to arrange a lounge and dining area.",
    "unit_number": "15-05",
    "listingpicture": "https://images.unsplash.com/photo-1651766231259-cdaafe69acd8?auto=format&fm=jpg&w=1200&q=85"
  }
]
$properties$::jsonb;
    IF jsonb_array_length(properties) <> 19 THEN
        RAISE EXCEPTION 'Seed refused: expected exactly nineteen source properties.';
    END IF;

    FOR source_row IN
        SELECT * FROM jsonb_populate_recordset(NULL::public.listings, properties)
        ORDER BY listingid
    LOOP
        INSERT INTO public.listings (
            bathroom, beds, description, flagged, floor, listingpicture,
            location, name, postal, price, size, type, unit_number,
            owneruserid, tenantuserid, created_at, latitude, longitude
        ) VALUES (
            source_row.bathroom, source_row.beds, source_row.description,
            false, source_row.floor, source_row.listingpicture,
            source_row.location, source_row.name, source_row.postal,
            source_row.price, source_row.size, source_row.type,
            source_row.unit_number, owner_ids[(position / 2) + 1],
            NULL, transaction_timestamp() AT TIME ZONE 'UTC',
            source_row.latitude, source_row.longitude
        ) RETURNING listingid INTO new_id;

        INSERT INTO pg_temp.rentnest_seed_mapping
        VALUES (source_row.listingid, new_id, owner_ids[(position / 2) + 1]);
        position := position + 1;
    END LOOP;

    IF position <> 19 OR (SELECT count(*) FROM public.listings) <> 19 THEN
        RAISE EXCEPTION 'Seed verification failed: expected nineteen listings.';
    END IF;
END;
$seed$;

-- Save this output to identify the new listing IDs and assigned owners.
SELECT source_listing_id, new_listing_id, owner_user_id
FROM pg_temp.rentnest_seed_mapping
ORDER BY source_listing_id;

COMMIT;
