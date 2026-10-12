-- Update descriptions only for the 50 listings in the supplied export.
-- HISTORICAL STEP: superseded by update-listing-variations.sql.
-- Do not rerun after the approved price/layout revision; guards use old values.
-- Run the entire file in TEST Supabase SQL Editor after a current backup.
-- Do NOT rerun the 50-listing import. No insert/delete/schema/sequence changes.
-- Matches exact exported IDs plus address, name and descriptive numeric fields.
-- Refuses missing/mismatched rows or descriptions edited since the export.
-- Already-updated descriptions are accepted; a rerun is a no-op.
-- No user-facing demo text; fictional provenance remains in the guide.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE public.listings IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE rentnest_description_changes (
    listingid bigint PRIMARY KEY,
    name text NOT NULL,
    postal integer NOT NULL,
    location text NOT NULL,
    beds integer NOT NULL,
    bathroom integer NOT NULL,
    size integer NOT NULL,
    floor integer NOT NULL,
    type text NOT NULL,
    old_description text NOT NULL,
    new_description text NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp.rentnest_description_changes
SELECT * FROM jsonb_populate_recordset(
    NULL::pg_temp.rentnest_description_changes,
    $changes$
[
  {
    "listingid": 78,
    "name": "Bright Ang Mo Kio Apartment - 12",
    "postal": 567746,
    "location": "12 ANG MO KIO CENTRAL 3, Singapore 567746",
    "beds": 2,
    "bathroom": 2,
    "size": 875,
    "floor": 3,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Ang Mo Kio. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom apartment at 12 Ang Mo Kio Central 3, with two bathrooms and 875 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
  },
  {
    "listingid": 79,
    "name": "Cosy Ang Mo Kio Apartment - 12",
    "postal": 567697,
    "location": "12 ANG MO KIO AVENUE 2, Singapore 567697",
    "beds": 2,
    "bathroom": 2,
    "size": 900,
    "floor": 4,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Ang Mo Kio. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom apartment along 12 Ang Mo Kio Avenue 2. This fourth-floor home offers 900 sq ft, two bathrooms and a practical layout with space for a work corner."
  },
  {
    "listingid": 80,
    "name": "Spacious Bishan Apartment - 61",
    "postal": 574044,
    "location": "61 BISHAN STREET 21, Singapore 574044",
    "beds": 3,
    "bathroom": 2,
    "size": 1175,
    "floor": 2,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Bishan. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "A 1,175 sq ft apartment at 61 Bishan Street 21, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
  },
  {
    "listingid": 81,
    "name": "Welcoming Bishan Apartment - 63",
    "postal": 574045,
    "location": "63 BISHAN STREET 21, Singapore 574045",
    "beds": 2,
    "bathroom": 2,
    "size": 850,
    "floor": 3,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Bishan. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom apartment at 63 Bishan Street 21, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 850 sq ft."
  },
  {
    "listingid": 82,
    "name": "Quiet Bishan Apartment - 61",
    "postal": 579653,
    "location": "61 BRIGHT HILL DRIVE, Singapore 579653",
    "beds": 2,
    "bathroom": 2,
    "size": 875,
    "floor": 4,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Bishan. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom apartment along 61 Bright Hill Drive, offering 875 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
  },
  {
    "listingid": 83,
    "name": "Bright Bishan Apartment - 31",
    "postal": 579819,
    "location": "31 BISHAN STREET 11, Singapore 579819",
    "beds": 3,
    "bathroom": 2,
    "size": 1150,
    "floor": 2,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Bishan. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Located at 31 Bishan Street 11, this second-floor apartment has 3 bedrooms, two bathrooms and 1,150 sq ft of space. The layout separates dining from the main lounge."
  },
  {
    "listingid": 84,
    "name": "Cosy Bishan Apartment - 33",
    "postal": 579820,
    "location": "33 BISHAN STREET 11, Singapore 579820",
    "beds": 2,
    "bathroom": 2,
    "size": 925,
    "floor": 3,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Bishan. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom apartment at 33 Bishan Street 11, with two bathrooms and 925 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
  },
  {
    "listingid": 85,
    "name": "Spacious Bishan Apartment - 35",
    "postal": 579821,
    "location": "35 BISHAN STREET 11, Singapore 579821",
    "beds": 2,
    "bathroom": 2,
    "size": 850,
    "floor": 4,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Bishan. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom apartment along 35 Bishan Street 11. This fourth-floor home offers 850 sq ft, two bathrooms and a practical layout with space for a work corner."
  },
  {
    "listingid": 86,
    "name": "Welcoming Bishan Flat - 101",
    "postal": 570101,
    "location": "101 BISHAN STREET 12, Singapore 570101",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Bishan. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "A 1,025 sq ft HDB flat at 101 Bishan Street 12, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
  },
  {
    "listingid": 87,
    "name": "Quiet Bishan Flat - 102",
    "postal": 570102,
    "location": "102 BISHAN STREET 12, Singapore 570102",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Bishan. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat at 102 Bishan Street 12, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 800 sq ft."
  },
  {
    "listingid": 88,
    "name": "Bright Bishan Flat - 103",
    "postal": 570103,
    "location": "103 BISHAN STREET 12, Singapore 570103",
    "beds": 3,
    "bathroom": 2,
    "size": 1075,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Bishan. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat along 103 Bishan Street 12, offering 1,075 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
  },
  {
    "listingid": 89,
    "name": "Cosy Bishan Flat - 104",
    "postal": 570104,
    "location": "104 BISHAN STREET 12, Singapore 570104",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Bishan. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Located at 104 Bishan Street 12, this second-floor HDB flat has 2 bedrooms, two bathrooms and 750 sq ft of space. The layout separates dining from the main lounge."
  },
  {
    "listingid": 90,
    "name": "Spacious Orchard / Oxley Apartment - 19",
    "postal": 238619,
    "location": "19 OXLEY ROAD, Singapore 238619",
    "beds": 2,
    "bathroom": 2,
    "size": 875,
    "floor": 3,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Orchard / Oxley. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom apartment at 19 Oxley Road, with two bathrooms and 875 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
  },
  {
    "listingid": 91,
    "name": "Welcoming Orchard / Oxley Apartment - 27",
    "postal": 238621,
    "location": "27 OXLEY ROAD, Singapore 238621",
    "beds": 2,
    "bathroom": 2,
    "size": 900,
    "floor": 4,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Orchard / Oxley. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom apartment along 27 Oxley Road. This fourth-floor home offers 900 sq ft, two bathrooms and a practical layout with space for a work corner."
  },
  {
    "listingid": 92,
    "name": "Quiet Orchard Apartment - 5",
    "postal": 249696,
    "location": "5 CUSCADEN WALK, Singapore 249696",
    "beds": 3,
    "bathroom": 2,
    "size": 1175,
    "floor": 2,
    "type": "Condo",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Orchard. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "A 1,175 sq ft apartment at 5 Cuscaden Walk, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
  },
  {
    "listingid": 93,
    "name": "Bright Jurong West Flat - 474",
    "postal": 640474,
    "location": "474 JURONG WEST STREET 41, Singapore 640474",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong West. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat at 474 Jurong West Street 41, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 750 sq ft."
  },
  {
    "listingid": 94,
    "name": "Cosy Jurong West Flat - 475",
    "postal": 640475,
    "location": "475 JURONG WEST STREET 41, Singapore 640475",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong West. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat along 475 Jurong West Street 41, offering 1,025 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
  },
  {
    "listingid": 95,
    "name": "Spacious Jurong West Flat - 476",
    "postal": 640476,
    "location": "476 JURONG WEST STREET 41, Singapore 640476",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong West. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Located at 476 Jurong West Street 41, this second-floor HDB flat has 2 bedrooms, two bathrooms and 800 sq ft of space. The layout separates dining from the main lounge."
  },
  {
    "listingid": 96,
    "name": "Welcoming Jurong West Flat - 477",
    "postal": 640477,
    "location": "477 JURONG WEST STREET 41, Singapore 640477",
    "beds": 3,
    "bathroom": 2,
    "size": 1075,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong West. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat at 477 Jurong West Street 41, with two bathrooms and 1,075 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
  },
  {
    "listingid": 97,
    "name": "Quiet Jurong West Flat - 478",
    "postal": 640478,
    "location": "478 JURONG WEST STREET 41, Singapore 640478",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong West. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat along 478 Jurong West Street 41. This fourth-floor home offers 750 sq ft, two bathrooms and a practical layout with space for a work corner."
  },
  {
    "listingid": 98,
    "name": "Bright Jurong West Flat - 479",
    "postal": 640479,
    "location": "479 JURONG WEST STREET 41, Singapore 640479",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong West. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "A 1,025 sq ft HDB flat at 479 Jurong West Street 41, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
  },
  {
    "listingid": 99,
    "name": "Cosy Jurong West Flat - 480",
    "postal": 640480,
    "location": "480 JURONG WEST STREET 41, Singapore 640480",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong West. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat at 480 Jurong West Street 41, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 800 sq ft."
  },
  {
    "listingid": 100,
    "name": "Spacious Jurong West Flat - 481",
    "postal": 640481,
    "location": "481 JURONG WEST STREET 41, Singapore 640481",
    "beds": 3,
    "bathroom": 2,
    "size": 1075,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong West. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat along 481 Jurong West Street 41, offering 1,075 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
  },
  {
    "listingid": 101,
    "name": "Welcoming Jurong West Flat - 482",
    "postal": 640482,
    "location": "482 JURONG WEST STREET 41, Singapore 640482",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong West. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Located at 482 Jurong West Street 41, this second-floor HDB flat has 2 bedrooms, two bathrooms and 750 sq ft of space. The layout separates dining from the main lounge."
  },
  {
    "listingid": 102,
    "name": "Quiet Jurong West Flat - 483",
    "postal": 640483,
    "location": "483 JURONG WEST STREET 41, Singapore 640483",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong West. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat at 483 Jurong West Street 41, with two bathrooms and 1,025 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
  },
  {
    "listingid": 103,
    "name": "Bright Jurong West Flat - 484",
    "postal": 640484,
    "location": "484 JURONG WEST AVENUE 1, Singapore 640484",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong West. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat along 484 Jurong West Avenue 1. This fourth-floor home offers 800 sq ft, two bathrooms and a practical layout with space for a work corner."
  },
  {
    "listingid": 104,
    "name": "Cosy Jurong West Flat - 485",
    "postal": 640485,
    "location": "485 JURONG WEST AVENUE 1, Singapore 640485",
    "beds": 3,
    "bathroom": 2,
    "size": 1075,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong West. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "A 1,075 sq ft HDB flat at 485 Jurong West Avenue 1, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
  },
  {
    "listingid": 105,
    "name": "Spacious Jurong West Flat - 486",
    "postal": 640486,
    "location": "486 JURONG WEST AVENUE 1, Singapore 640486",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong West. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat at 486 Jurong West Avenue 1, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 750 sq ft."
  },
  {
    "listingid": 106,
    "name": "Welcoming Jurong West Flat - 487",
    "postal": 640487,
    "location": "487 JURONG WEST AVENUE 1, Singapore 640487",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong West. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat along 487 Jurong West Avenue 1, offering 1,025 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
  },
  {
    "listingid": 107,
    "name": "Quiet Jurong West Flat - 488",
    "postal": 640488,
    "location": "488 JURONG WEST AVENUE 1, Singapore 640488",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong West. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Located at 488 Jurong West Avenue 1, this second-floor HDB flat has 2 bedrooms, two bathrooms and 800 sq ft of space. The layout separates dining from the main lounge."
  },
  {
    "listingid": 108,
    "name": "Bright Jurong West Flat - 489",
    "postal": 640489,
    "location": "489 JURONG WEST AVENUE 1, Singapore 640489",
    "beds": 3,
    "bathroom": 2,
    "size": 1075,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong West. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat at 489 Jurong West Avenue 1, with two bathrooms and 1,075 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
  },
  {
    "listingid": 109,
    "name": "Cosy Jurong West Flat - 490",
    "postal": 640490,
    "location": "490 JURONG WEST AVENUE 1, Singapore 640490",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong West. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat along 490 Jurong West Avenue 1. This fourth-floor home offers 750 sq ft, two bathrooms and a practical layout with space for a work corner."
  },
  {
    "listingid": 110,
    "name": "Spacious Jurong West Flat - 491",
    "postal": 640491,
    "location": "491 JURONG WEST AVENUE 1, Singapore 640491",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong West. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "A 1,025 sq ft HDB flat at 491 Jurong West Avenue 1, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
  },
  {
    "listingid": 111,
    "name": "Welcoming Jurong East Flat - 101",
    "postal": 600101,
    "location": "101 JURONG EAST STREET 13, Singapore 600101",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong East. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat at 101 Jurong East Street 13, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 800 sq ft."
  },
  {
    "listingid": 112,
    "name": "Quiet Jurong East Flat - 102",
    "postal": 600102,
    "location": "102 JURONG EAST STREET 13, Singapore 600102",
    "beds": 3,
    "bathroom": 2,
    "size": 1075,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong East. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat along 102 Jurong East Street 13, offering 1,075 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
  },
  {
    "listingid": 113,
    "name": "Bright Jurong East Flat - 103",
    "postal": 600103,
    "location": "103 JURONG EAST STREET 13, Singapore 600103",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong East. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Located at 103 Jurong East Street 13, this second-floor HDB flat has 2 bedrooms, two bathrooms and 750 sq ft of space. The layout separates dining from the main lounge."
  },
  {
    "listingid": 114,
    "name": "Cosy Jurong East Flat - 104",
    "postal": 600104,
    "location": "104 JURONG EAST STREET 13, Singapore 600104",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong East. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat at 104 Jurong East Street 13, with two bathrooms and 1,025 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
  },
  {
    "listingid": 115,
    "name": "Spacious Jurong East Flat - 105",
    "postal": 600105,
    "location": "105 JURONG EAST STREET 13, Singapore 600105",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong East. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat along 105 Jurong East Street 13. This fourth-floor home offers 800 sq ft, two bathrooms and a practical layout with space for a work corner."
  },
  {
    "listingid": 116,
    "name": "Welcoming Jurong East Flat - 106",
    "postal": 600106,
    "location": "106 JURONG EAST STREET 13, Singapore 600106",
    "beds": 3,
    "bathroom": 2,
    "size": 1075,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong East. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "A 1,075 sq ft HDB flat at 106 Jurong East Street 13, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
  },
  {
    "listingid": 117,
    "name": "Quiet Jurong East Flat - 107",
    "postal": 600107,
    "location": "107 JURONG EAST STREET 13, Singapore 600107",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong East. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat at 107 Jurong East Street 13, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 750 sq ft."
  },
  {
    "listingid": 118,
    "name": "Bright Jurong East Flat - 108",
    "postal": 600108,
    "location": "108 JURONG EAST STREET 13, Singapore 600108",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong East. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat along 108 Jurong East Street 13, offering 1,025 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
  },
  {
    "listingid": 119,
    "name": "Cosy Jurong East Flat - 109",
    "postal": 600109,
    "location": "109 JURONG EAST STREET 13, Singapore 600109",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong East. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Located at 109 Jurong East Street 13, this second-floor HDB flat has 2 bedrooms, two bathrooms and 800 sq ft of space. The layout separates dining from the main lounge."
  },
  {
    "listingid": 120,
    "name": "Spacious Jurong East Flat - 110",
    "postal": 600110,
    "location": "110 JURONG EAST STREET 13, Singapore 600110",
    "beds": 3,
    "bathroom": 2,
    "size": 1075,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong East. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat at 110 Jurong East Street 13, with two bathrooms and 1,075 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
  },
  {
    "listingid": 121,
    "name": "Welcoming Jurong East Flat - 111",
    "postal": 600111,
    "location": "111 JURONG EAST STREET 13, Singapore 600111",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong East. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat along 111 Jurong East Street 13. This fourth-floor home offers 750 sq ft, two bathrooms and a practical layout with space for a work corner."
  },
  {
    "listingid": 122,
    "name": "Quiet Jurong East Flat - 112",
    "postal": 600112,
    "location": "112 JURONG EAST STREET 13, Singapore 600112",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong East. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "A 1,025 sq ft HDB flat at 112 Jurong East Street 13, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
  },
  {
    "listingid": 123,
    "name": "Bright Jurong East Flat - 113",
    "postal": 600113,
    "location": "113 JURONG EAST STREET 13, Singapore 600113",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong East. Separate living and dining areas. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat at 113 Jurong East Street 13, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 800 sq ft."
  },
  {
    "listingid": 124,
    "name": "Cosy Jurong East Flat - 114",
    "postal": 600114,
    "location": "114 JURONG EAST STREET 13, Singapore 600114",
    "beds": 3,
    "bathroom": 2,
    "size": 1075,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong East. A practical layout with a study corner. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat along 114 Jurong East Street 13, offering 1,075 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
  },
  {
    "listingid": 125,
    "name": "Spacious Jurong East Flat - 115",
    "postal": 600115,
    "location": "115 JURONG EAST STREET 13, Singapore 600115",
    "beds": 2,
    "bathroom": 2,
    "size": 750,
    "floor": 2,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong East. Generous shared living space. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Located at 115 Jurong East Street 13, this second-floor HDB flat has 2 bedrooms, two bathrooms and 750 sq ft of space. The layout separates dining from the main lounge."
  },
  {
    "listingid": 126,
    "name": "Welcoming Jurong East Flat - 116",
    "postal": 600116,
    "location": "116 JURONG EAST STREET 13, Singapore 600116",
    "beds": 3,
    "bathroom": 2,
    "size": 1025,
    "floor": 3,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 3-bedroom home in Jurong East. An enclosed kitchen and family lounge. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Three-bedroom HDB flat at 116 Jurong East Street 13, with two bathrooms and 1,025 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
  },
  {
    "listingid": 127,
    "name": "Quiet Jurong East Flat - 201",
    "postal": 600201,
    "location": "201 JURONG EAST STREET 21, Singapore 600201",
    "beds": 2,
    "bathroom": 2,
    "size": 800,
    "floor": 4,
    "type": "HDB",
    "old_description": "FICTIONAL DEMO: [RN50-20261012] 2-bedroom home in Jurong East. Comfortable bedrooms and a dining nook. Rent, size, floor and unit are invented; not an actual offer. Reused photo is illustrative.",
    "new_description": "Two-bedroom HDB flat along 201 Jurong East Street 21. This fourth-floor home offers 800 sq ft, two bathrooms and a practical layout with space for a work corner."
  }
]
$changes$::jsonb);

CREATE TEMP TABLE rentnest_description_before ON COMMIT DROP AS
SELECT listingid, to_jsonb(l) AS original FROM public.listings l;

DO $update$
DECLARE
    changed integer;
BEGIN
    IF (SELECT count(*) FROM pg_temp.rentnest_description_changes) <> 50
       OR EXISTS (
           SELECT 1 FROM pg_temp.rentnest_description_changes c
           LEFT JOIN public.listings l ON l.listingid = c.listingid
           WHERE l.listingid IS NULL
              OR ROW(l.name,l.postal,l.location,l.beds,l.bathroom,l.size,l.floor,l.type)
                 IS DISTINCT FROM ROW(c.name,c.postal,c.location,c.beds,c.bathroom,c.size,c.floor,c.type)
              OR l.description IS NULL
              OR l.description NOT IN (c.old_description,c.new_description)
              OR length(c.new_description) NOT BETWEEN 1 AND 255
       ) THEN
        RAISE EXCEPTION 'Description update refused: the 50 exported listings no longer match. Nothing changed.';
    END IF;

    UPDATE public.listings l SET description = c.new_description
    FROM pg_temp.rentnest_description_changes c
    WHERE l.listingid = c.listingid
      AND l.description IS DISTINCT FROM c.new_description;
    GET DIAGNOSTICS changed = ROW_COUNT;

    IF EXISTS (
        SELECT 1 FROM pg_temp.rentnest_description_before b
        FULL JOIN public.listings l ON l.listingid = b.listingid
        LEFT JOIN pg_temp.rentnest_description_changes c
          ON c.listingid = b.listingid
        WHERE l.listingid IS NULL OR b.listingid IS NULL
           OR (to_jsonb(l) - 'description') IS DISTINCT FROM (b.original - 'description')
           OR (c.listingid IS NULL AND to_jsonb(l) IS DISTINCT FROM b.original)
           OR (c.listingid IS NOT NULL AND l.description IS DISTINCT FROM c.new_description)
    ) THEN
        RAISE EXCEPTION 'Verification failed: something other than the intended descriptions changed.';
    END IF;
    RAISE NOTICE 'Updated % descriptions; all 50 now match the approved text.', changed;
END;
$update$;

SELECT l.listingid,l.name,l.description
FROM public.listings l
JOIN pg_temp.rentnest_description_changes c USING (listingid)
ORDER BY l.listingid;

COMMIT;
