-- Append exactly 50 FICTIONAL DEMO listings to the existing 19.
-- Run the ENTIRE file in your TEST Supabase SQL Editor after a fresh backup.
-- Stop app/backend writes first. This script does not delete or update rows.
-- Keeps existing IDs; cycles photos from the 19 current listings by listingid.
-- Fills owners to two listings each in ascending actual userid order.
-- No new users, rental/activity rows, amenities, or permanent schema objects.
-- See demo-listings-50-guide.md and demo-listings-50-sources.csv for provenance.
-- If SQL Editor warns about RLS, these are session-local TEMP tables only.
-- No existing RLS settings are changed. Errors roll back all inserted rows.
-- Sequence gaps after failed attempts are normal; do not reset sequences.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL timezone = 'UTC';

LOCK TABLE public.users IN SHARE MODE;
LOCK TABLE public.listings IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE rentnest_demo50_before ON COMMIT DROP AS
SELECT * FROM public.listings;

CREATE TEMP TABLE rentnest_demo50_mapping (
    batch_index integer PRIMARY KEY,
    listing_id bigint UNIQUE NOT NULL,
    owner_id bigint NOT NULL,
    photo_source_listing_id bigint NOT NULL,
    postal integer NOT NULL,
    name text NOT NULL
) ON COMMIT DROP;

DO $seed$
DECLARE
    properties jsonb := $properties$
[
  {
    "name": "Bright Ang Mo Kio Apartment - 12",
    "type": "Condo",
    "floor": 3,
    "unit_number": "03-01",
    "location": "12 ANG MO KIO CENTRAL 3, Singapore 567746",
    "postal": 567746,
    "price": 6100,
    "size": 930,
    "beds": 2,
    "bathroom": 2,
    "description": "Two-bedroom apartment along 12 Ang Mo Kio Central 3. This floor-3 home offers 930 sq ft and two bathrooms, with a layout suited to everyday living.",
    "latitude": 1.376147134487095,
    "longitude": 103.8472793323979
  },
  {
    "name": "Cosy Ang Mo Kio Apartment - 12",
    "type": "Condo",
    "floor": 4,
    "unit_number": "04-02",
    "location": "12 ANG MO KIO AVENUE 2, Singapore 567697",
    "postal": 567697,
    "price": 8200,
    "size": 1340,
    "beds": 3,
    "bathroom": 3,
    "description": "Located at 12 Ang Mo Kio Avenue 2, this apartment has 3 bedrooms, three bathrooms and 1,340 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.376027406314523,
    "longitude": 103.8347306665461
  },
  {
    "name": "Spacious Bishan Apartment - 61",
    "type": "Condo",
    "floor": 2,
    "unit_number": "02-03",
    "location": "61 BISHAN STREET 21, Singapore 574044",
    "postal": 574044,
    "price": 7200,
    "size": 1210,
    "beds": 3,
    "bathroom": 2,
    "description": "Three-bedroom apartment at 61 Bishan Street 21, with two bathrooms and 1,210 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.349180338466708,
    "longitude": 103.8467025723217
  },
  {
    "name": "Welcoming Bishan Apartment - 63",
    "type": "Condo",
    "floor": 3,
    "unit_number": "03-04",
    "location": "63 BISHAN STREET 21, Singapore 574045",
    "postal": 574045,
    "price": 5700,
    "size": 890,
    "beds": 2,
    "bathroom": 2,
    "description": "A 890 sq ft apartment along 63 Bishan Street 21, offering 2 bedrooms and two bathrooms. Located on floor 3, with space to arrange a lounge and dining area.",
    "latitude": 1.349476444934552,
    "longitude": 103.8470381242835
  },
  {
    "name": "Quiet Bishan Apartment - 61",
    "type": "Condo",
    "floor": 4,
    "unit_number": "04-05",
    "location": "61 BRIGHT HILL DRIVE, Singapore 579653",
    "postal": 579653,
    "price": 5000,
    "size": 710,
    "beds": 1,
    "bathroom": 1,
    "description": "One-bedroom apartment along 61 Bright Hill Drive. This floor-4 home offers 710 sq ft and one bathroom, with a layout suited to everyday living.",
    "latitude": 1.359659384785255,
    "longitude": 103.8326919669199
  },
  {
    "name": "Bright Bishan Apartment - 31",
    "type": "Condo",
    "floor": 2,
    "unit_number": "02-06",
    "location": "31 BISHAN STREET 11, Singapore 579819",
    "postal": 579819,
    "price": 9800,
    "size": 1720,
    "beds": 4,
    "bathroom": 3,
    "description": "Located at 31 Bishan Street 11, this apartment has 4 bedrooms, three bathrooms and 1,720 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.347521836844581,
    "longitude": 103.8520478175324
  },
  {
    "name": "Cosy Bishan Apartment - 33",
    "type": "Condo",
    "floor": 3,
    "unit_number": "03-07",
    "location": "33 BISHAN STREET 11, Singapore 579820",
    "postal": 579820,
    "price": 7900,
    "size": 1380,
    "beds": 3,
    "bathroom": 2,
    "description": "Three-bedroom apartment at 33 Bishan Street 11, with two bathrooms and 1,380 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.34682504729819,
    "longitude": 103.8525790520322
  },
  {
    "name": "Comfortable Bishan Apartment - 35",
    "type": "Condo",
    "floor": 4,
    "unit_number": "04-08",
    "location": "35 BISHAN STREET 11, Singapore 579821",
    "postal": 579821,
    "price": 6400,
    "size": 1010,
    "beds": 2,
    "bathroom": 2,
    "description": "A 1,010 sq ft apartment along 35 Bishan Street 11, offering 2 bedrooms and two bathrooms. Located on floor 4, with space to arrange a lounge and dining area.",
    "latitude": 1.347049,
    "longitude": 103.852277
  },
  {
    "name": "Welcoming Bishan Flat - 101",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-09",
    "location": "101 BISHAN STREET 12, Singapore 570101",
    "postal": 570101,
    "price": 8000,
    "size": 1600,
    "beds": 4,
    "bathroom": 3,
    "description": "Four-bedroom HDB flat along 101 Bishan Street 12. This floor-2 home offers 1,600 sq ft and three bathrooms, with a layout suited to everyday living.",
    "latitude": 1.344859,
    "longitude": 103.848401
  },
  {
    "name": "Quiet Bishan Flat - 102",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-10",
    "location": "102 BISHAN STREET 12, Singapore 570102",
    "postal": 570102,
    "price": 4950,
    "size": 1100,
    "beds": 3,
    "bathroom": 2,
    "description": "Located at 102 Bishan Street 12, this HDB flat has 3 bedrooms, two bathrooms and 1,100 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.345143123347699,
    "longitude": 103.8479908052591
  },
  {
    "name": "Bright Bishan Flat - 103",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-11",
    "location": "103 BISHAN STREET 12, Singapore 570103",
    "postal": 570103,
    "price": 7100,
    "size": 1480,
    "beds": 4,
    "bathroom": 2,
    "description": "Four-bedroom HDB flat at 103 Bishan Street 12, with two bathrooms and 1,480 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.345512491321055,
    "longitude": 103.8483141623863
  },
  {
    "name": "Cosy Bishan Flat - 104",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-12",
    "location": "104 BISHAN STREET 12, Singapore 570104",
    "postal": 570104,
    "price": 3500,
    "size": 860,
    "beds": 2,
    "bathroom": 2,
    "description": "A 860 sq ft HDB flat along 104 Bishan Street 12, offering 2 bedrooms and two bathrooms. Located on floor 2, with space to arrange a lounge and dining area.",
    "latitude": 1.345675,
    "longitude": 103.848033
  },
  {
    "name": "Spacious Orchard / Oxley Apartment - 19",
    "type": "Condo",
    "floor": 3,
    "unit_number": "03-13",
    "location": "19 OXLEY ROAD, Singapore 238619",
    "postal": 238619,
    "price": 17500,
    "size": 2650,
    "beds": 4,
    "bathroom": 4,
    "description": "Four-bedroom apartment along 19 Oxley Road. This floor-3 home offers 2,650 sq ft and four bathrooms, with a layout suited to everyday living.",
    "latitude": 1.298668,
    "longitude": 103.841687
  },
  {
    "name": "Welcoming Orchard / Oxley Apartment - 27",
    "type": "Condo",
    "floor": 4,
    "unit_number": "04-14",
    "location": "27 OXLEY ROAD, Singapore 238621",
    "postal": 238621,
    "price": 20000,
    "size": 3500,
    "beds": 5,
    "bathroom": 5,
    "description": "Located at 27 Oxley Road, this apartment has 5 bedrooms, five bathrooms and 3,500 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.298417,
    "longitude": 103.841405
  },
  {
    "name": "Quiet Orchard Apartment - 5",
    "type": "Condo",
    "floor": 2,
    "unit_number": "02-15",
    "location": "5 CUSCADEN WALK, Singapore 249696",
    "postal": 249696,
    "price": 19000,
    "size": 2980,
    "beds": 5,
    "bathroom": 4,
    "description": "Five-bedroom apartment at 5 Cuscaden Walk, with four bathrooms and 2,980 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.303614,
    "longitude": 103.829242
  },
  {
    "name": "Bright Jurong West Flat - 474",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-16",
    "location": "474 JURONG WEST STREET 41, Singapore 640474",
    "postal": 640474,
    "price": 4350,
    "size": 1150,
    "beds": 3,
    "bathroom": 2,
    "description": "A 1,150 sq ft HDB flat along 474 Jurong West Street 41, offering 3 bedrooms and two bathrooms. Located on floor 3, with space to arrange a lounge and dining area.",
    "latitude": 1.348097,
    "longitude": 103.724184
  },
  {
    "name": "Cosy Jurong West Flat - 475",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-17",
    "location": "475 JURONG WEST STREET 41, Singapore 640475",
    "postal": 640475,
    "price": 3000,
    "size": 650,
    "beds": 2,
    "bathroom": 1,
    "description": "Two-bedroom HDB flat along 475 Jurong West Street 41. This floor-4 home offers 650 sq ft and one bathroom, with a layout suited to everyday living.",
    "latitude": 1.348098,
    "longitude": 103.725087
  },
  {
    "name": "Spacious Jurong West Flat - 476",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-18",
    "location": "476 JURONG WEST STREET 41, Singapore 640476",
    "postal": 640476,
    "price": 4750,
    "size": 1200,
    "beds": 3,
    "bathroom": 2,
    "description": "Located at 476 Jurong West Street 41, this HDB flat has 3 bedrooms, two bathrooms and 1,200 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.347716,
    "longitude": 103.724184
  },
  {
    "name": "Welcoming Jurong West Flat - 477",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-19",
    "location": "477 JURONG WEST STREET 41, Singapore 640477",
    "postal": 640477,
    "price": 3400,
    "size": 700,
    "beds": 2,
    "bathroom": 2,
    "description": "Two-bedroom HDB flat at 477 Jurong West Street 41, with two bathrooms and 700 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.347716,
    "longitude": 103.725087
  },
  {
    "name": "Quiet Jurong West Flat - 478",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-20",
    "location": "478 JURONG WEST STREET 41, Singapore 640478",
    "postal": 640478,
    "price": 3700,
    "size": 900,
    "beds": 3,
    "bathroom": 2,
    "description": "A 900 sq ft HDB flat along 478 Jurong West Street 41, offering 3 bedrooms and two bathrooms. Located on floor 4, with space to arrange a lounge and dining area.",
    "latitude": 1.347353,
    "longitude": 103.723952
  },
  {
    "name": "Bright Jurong West Flat - 479",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-21",
    "location": "479 JURONG WEST STREET 41, Singapore 640479",
    "postal": 640479,
    "price": 5350,
    "size": 1400,
    "beds": 4,
    "bathroom": 2,
    "description": "Four-bedroom HDB flat along 479 Jurong West Street 41. This floor-2 home offers 1,400 sq ft and two bathrooms, with a layout suited to everyday living.",
    "latitude": 1.347203,
    "longitude": 103.724501
  },
  {
    "name": "Cosy Jurong West Flat - 480",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-22",
    "location": "480 JURONG WEST STREET 41, Singapore 640480",
    "postal": 640480,
    "price": 3100,
    "size": 740,
    "beds": 2,
    "bathroom": 2,
    "description": "Located at 480 Jurong West Street 41, this HDB flat has 2 bedrooms, two bathrooms and 740 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.346848,
    "longitude": 103.724042
  },
  {
    "name": "Spacious Jurong West Flat - 481",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-23",
    "location": "481 JURONG WEST STREET 41, Singapore 640481",
    "postal": 640481,
    "price": 4350,
    "size": 1000,
    "beds": 3,
    "bathroom": 2,
    "description": "Three-bedroom HDB flat at 481 Jurong West Street 41, with two bathrooms and 1,000 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.346846,
    "longitude": 103.72523
  },
  {
    "name": "Welcoming Jurong West Flat - 482",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-24",
    "location": "482 JURONG WEST STREET 41, Singapore 640482",
    "postal": 640482,
    "price": 2600,
    "size": 480,
    "beds": 1,
    "bathroom": 1,
    "description": "A 480 sq ft HDB flat along 482 Jurong West Street 41, offering 1 bedrooms and one bathroom. Located on floor 2, with space to arrange a lounge and dining area.",
    "latitude": 1.347203,
    "longitude": 103.724769
  },
  {
    "name": "Quiet Jurong West Flat - 483",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-25",
    "location": "483 JURONG WEST STREET 41, Singapore 640483",
    "postal": 640483,
    "price": 4000,
    "size": 1050,
    "beds": 3,
    "bathroom": 2,
    "description": "Three-bedroom HDB flat along 483 Jurong West Street 41. This floor-3 home offers 1,050 sq ft and two bathrooms, with a layout suited to everyday living.",
    "latitude": 1.347353,
    "longitude": 103.72532
  },
  {
    "name": "Bright Jurong West Flat - 484",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-26",
    "location": "484 JURONG WEST AVENUE 1, Singapore 640484",
    "postal": 640484,
    "price": 5550,
    "size": 1540,
    "beds": 4,
    "bathroom": 3,
    "description": "Located at 484 Jurong West Avenue 1, this HDB flat has 4 bedrooms, three bathrooms and 1,540 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.348209,
    "longitude": 103.726358
  },
  {
    "name": "Cosy Jurong West Flat - 485",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-27",
    "location": "485 JURONG WEST AVENUE 1, Singapore 640485",
    "postal": 640485,
    "price": 3400,
    "size": 860,
    "beds": 2,
    "bathroom": 2,
    "description": "Two-bedroom HDB flat at 485 Jurong West Avenue 1, with two bathrooms and 860 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.348347,
    "longitude": 103.727243
  },
  {
    "name": "Spacious Jurong West Flat - 486",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-28",
    "location": "486 JURONG WEST AVENUE 1, Singapore 640486",
    "postal": 640486,
    "price": 4550,
    "size": 1100,
    "beds": 3,
    "bathroom": 2,
    "description": "A 1,100 sq ft HDB flat along 486 Jurong West Avenue 1, offering 3 bedrooms and two bathrooms. Located on floor 3, with space to arrange a lounge and dining area.",
    "latitude": 1.348726,
    "longitude": 103.726333
  },
  {
    "name": "Welcoming Jurong West Flat - 487",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-29",
    "location": "487 JURONG WEST AVENUE 1, Singapore 640487",
    "postal": 640487,
    "price": 3300,
    "size": 650,
    "beds": 2,
    "bathroom": 1,
    "description": "Two-bedroom HDB flat along 487 Jurong West Avenue 1. This floor-4 home offers 650 sq ft and one bathroom, with a layout suited to everyday living.",
    "latitude": 1.348725,
    "longitude": 103.727243
  },
  {
    "name": "Quiet Jurong West Flat - 488",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-30",
    "location": "488 JURONG WEST AVENUE 1, Singapore 640488",
    "postal": 640488,
    "price": 4200,
    "size": 1150,
    "beds": 3,
    "bathroom": 2,
    "description": "Located at 488 Jurong West Avenue 1, this HDB flat has 3 bedrooms, two bathrooms and 1,150 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.349082,
    "longitude": 103.726196
  },
  {
    "name": "Bright Jurong West Flat - 489",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-31",
    "location": "489 JURONG WEST AVENUE 1, Singapore 640489",
    "postal": 640489,
    "price": 2950,
    "size": 700,
    "beds": 2,
    "bathroom": 2,
    "description": "Two-bedroom HDB flat at 489 Jurong West Avenue 1, with two bathrooms and 700 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.349175,
    "longitude": 103.72724
  },
  {
    "name": "Cosy Jurong West Flat - 490",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-32",
    "location": "490 JURONG WEST AVENUE 1, Singapore 640490",
    "postal": 640490,
    "price": 4600,
    "size": 1200,
    "beds": 3,
    "bathroom": 2,
    "description": "A 1,200 sq ft HDB flat along 490 Jurong West Avenue 1, offering 3 bedrooms and two bathrooms. Located on floor 4, with space to arrange a lounge and dining area.",
    "latitude": 1.349589,
    "longitude": 103.72724
  },
  {
    "name": "Spacious Jurong West Flat - 491",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-33",
    "location": "491 JURONG WEST AVENUE 1, Singapore 640491",
    "postal": 640491,
    "price": 5650,
    "size": 1400,
    "beds": 4,
    "bathroom": 2,
    "description": "Four-bedroom HDB flat along 491 Jurong West Avenue 1. This floor-2 home offers 1,400 sq ft and two bathrooms, with a layout suited to everyday living.",
    "latitude": 1.349587,
    "longitude": 103.726315
  },
  {
    "name": "Welcoming Jurong East Flat - 101",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-34",
    "location": "101 JURONG EAST STREET 13, Singapore 600101",
    "postal": 600101,
    "price": 3400,
    "size": 740,
    "beds": 2,
    "bathroom": 2,
    "description": "Located at 101 Jurong East Street 13, this HDB flat has 2 bedrooms, two bathrooms and 740 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.337011,
    "longitude": 103.738787
  },
  {
    "name": "Quiet Jurong East Flat - 102",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-35",
    "location": "102 JURONG EAST STREET 13, Singapore 600102",
    "postal": 600102,
    "price": 3800,
    "size": 950,
    "beds": 3,
    "bathroom": 2,
    "description": "Three-bedroom HDB flat at 102 Jurong East Street 13, with two bathrooms and 950 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.336097,
    "longitude": 103.738219
  },
  {
    "name": "Bright Jurong East Flat - 103",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-36",
    "location": "103 JURONG EAST STREET 13, Singapore 600103",
    "postal": 600103,
    "price": 2350,
    "size": 550,
    "beds": 1,
    "bathroom": 1,
    "description": "A 550 sq ft HDB flat along 103 Jurong East Street 13, offering 1 bedrooms and one bathroom. Located on floor 2, with space to arrange a lounge and dining area.",
    "latitude": 1.336687,
    "longitude": 103.738059
  },
  {
    "name": "Cosy Jurong East Flat - 104",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-37",
    "location": "104 JURONG EAST STREET 13, Singapore 600104",
    "postal": 600104,
    "price": 4200,
    "size": 1000,
    "beds": 3,
    "bathroom": 2,
    "description": "Three-bedroom HDB flat along 104 Jurong East Street 13. This floor-3 home offers 1,000 sq ft and two bathrooms, with a layout suited to everyday living.",
    "latitude": 1.336585,
    "longitude": 103.737623
  },
  {
    "name": "Spacious Jurong East Flat - 105",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-38",
    "location": "105 JURONG EAST STREET 13, Singapore 600105",
    "postal": 600105,
    "price": 5850,
    "size": 1540,
    "beds": 4,
    "bathroom": 3,
    "description": "Located at 105 Jurong East Street 13, this HDB flat has 4 bedrooms, three bathrooms and 1,540 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.337387,
    "longitude": 103.738528
  },
  {
    "name": "Welcoming Jurong East Flat - 106",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-39",
    "location": "106 JURONG EAST STREET 13, Singapore 600106",
    "postal": 600106,
    "price": 3700,
    "size": 860,
    "beds": 2,
    "bathroom": 2,
    "description": "Two-bedroom HDB flat at 106 Jurong East Street 13, with two bathrooms and 860 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.33725,
    "longitude": 103.737675
  },
  {
    "name": "Quiet Jurong East Flat - 107",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-40",
    "location": "107 JURONG EAST STREET 13, Singapore 600107",
    "postal": 600107,
    "price": 4000,
    "size": 1050,
    "beds": 3,
    "bathroom": 2,
    "description": "A 1,050 sq ft HDB flat along 107 Jurong East Street 13, offering 3 bedrooms and two bathrooms. Located on floor 3, with space to arrange a lounge and dining area.",
    "latitude": 1.337755,
    "longitude": 103.738093
  },
  {
    "name": "Bright Jurong East Flat - 108",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-41",
    "location": "108 JURONG EAST STREET 13, Singapore 600108",
    "postal": 600108,
    "price": 2850,
    "size": 650,
    "beds": 2,
    "bathroom": 1,
    "description": "Two-bedroom HDB flat along 108 Jurong East Street 13. This floor-4 home offers 650 sq ft and one bathroom, with a layout suited to everyday living.",
    "latitude": 1.33838,
    "longitude": 103.737283
  },
  {
    "name": "Cosy Jurong East Flat - 109",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-42",
    "location": "109 JURONG EAST STREET 13, Singapore 600109",
    "postal": 600109,
    "price": 4400,
    "size": 1100,
    "beds": 3,
    "bathroom": 2,
    "description": "Located at 109 Jurong East Street 13, this HDB flat has 3 bedrooms, two bathrooms and 1,100 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.338362,
    "longitude": 103.735911
  },
  {
    "name": "Comfortable Jurong East Flat - 110",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-43",
    "location": "110 JURONG EAST STREET 13, Singapore 600110",
    "postal": 600110,
    "price": 3250,
    "size": 700,
    "beds": 2,
    "bathroom": 2,
    "description": "Two-bedroom HDB flat at 110 Jurong East Street 13, with two bathrooms and 700 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.338871,
    "longitude": 103.736219
  },
  {
    "name": "Welcoming Jurong East Flat - 111",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-44",
    "location": "111 JURONG EAST STREET 13, Singapore 600111",
    "postal": 600111,
    "price": 4800,
    "size": 1150,
    "beds": 3,
    "bathroom": 2,
    "description": "A 1,150 sq ft HDB flat along 111 Jurong East Street 13, offering 3 bedrooms and two bathrooms. Located on floor 4, with space to arrange a lounge and dining area.",
    "latitude": 1.338776,
    "longitude": 103.735604
  },
  {
    "name": "Quiet Jurong East Flat - 112",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-45",
    "location": "112 JURONG EAST STREET 13, Singapore 600112",
    "postal": 600112,
    "price": 5200,
    "size": 1400,
    "beds": 4,
    "bathroom": 2,
    "description": "Four-bedroom HDB flat along 112 Jurong East Street 13. This floor-2 home offers 1,400 sq ft and two bathrooms, with a layout suited to everyday living.",
    "latitude": 1.33921,
    "longitude": 103.735824
  },
  {
    "name": "Bright Jurong East Flat - 113",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-46",
    "location": "113 JURONG EAST STREET 13, Singapore 600113",
    "postal": 600113,
    "price": 2950,
    "size": 740,
    "beds": 2,
    "bathroom": 2,
    "description": "Located at 113 Jurong East Street 13, this HDB flat has 2 bedrooms, two bathrooms and 740 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.338798,
    "longitude": 103.734808
  },
  {
    "name": "Cosy Jurong East Flat - 114",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-47",
    "location": "114 JURONG EAST STREET 13, Singapore 600114",
    "postal": 600114,
    "price": 4000,
    "size": 900,
    "beds": 3,
    "bathroom": 2,
    "description": "Three-bedroom HDB flat at 114 Jurong East Street 13, with two bathrooms and 900 sq ft of living space. A practical home with room for dining and everyday living.",
    "latitude": 1.339214,
    "longitude": 103.73461
  },
  {
    "name": "Comfortable Jurong East Flat - 115",
    "type": "HDB",
    "floor": 2,
    "unit_number": "02-48",
    "location": "115 JURONG EAST STREET 13, Singapore 600115",
    "postal": 600115,
    "price": 2450,
    "size": 480,
    "beds": 1,
    "bathroom": 1,
    "description": "A 480 sq ft HDB flat along 115 Jurong East Street 13, offering 1 bedrooms and one bathroom. Located on floor 2, with space to arrange a lounge and dining area.",
    "latitude": 1.339791,
    "longitude": 103.735503
  },
  {
    "name": "Welcoming Jurong East Flat - 116",
    "type": "HDB",
    "floor": 3,
    "unit_number": "03-49",
    "location": "116 JURONG EAST STREET 13, Singapore 600116",
    "postal": 600116,
    "price": 4400,
    "size": 950,
    "beds": 3,
    "bathroom": 2,
    "description": "Three-bedroom HDB flat along 116 Jurong East Street 13. This floor-3 home offers 950 sq ft and two bathrooms, with a layout suited to everyday living.",
    "latitude": 1.339708,
    "longitude": 103.734698
  },
  {
    "name": "Quiet Jurong East Flat - 201",
    "type": "HDB",
    "floor": 4,
    "unit_number": "04-50",
    "location": "201 JURONG EAST STREET 21, Singapore 600201",
    "postal": 600201,
    "price": 5400,
    "size": 1540,
    "beds": 4,
    "bathroom": 3,
    "description": "Located at 201 Jurong East Street 21, this HDB flat has 4 bedrooms, three bathrooms and 1,540 sq ft of space. A comfortable base for a household to make its own.",
    "latitude": 1.336406,
    "longitude": 103.743075
  }
]
$properties$::jsonb;
    source_row public.listings%ROWTYPE;
    owner_ids bigint[];
    photo_ids bigint[];
    photos text[];
    position integer := 0;
    new_id bigint;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.listings l
        JOIN jsonb_populate_recordset(NULL::public.listings, properties) p
          ON l.name = p.name AND l.postal = p.postal
    ) THEN
        RAISE EXCEPTION 'Import refused: this RN50 batch is already present.';
    END IF;
    IF (SELECT count(*) FROM public.listings) <> 19 THEN
        RAISE EXCEPTION 'Import refused: expected exactly 19 existing source listings. Do not remove this guard.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.listings
        WHERE listingpicture IS NULL OR btrim(listingpicture) = ''
           OR listingpicture !~ '^https://[^[:space:]]+$'
    ) THEN
        RAISE EXCEPTION 'Import refused: all 19 source listings need an HTTPS photo URL.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.listings l
        LEFT JOIN public.users u ON u.userid = l.owneruserid
        WHERE u.userid IS NULL
    ) THEN
        RAISE EXCEPTION 'Import refused: existing listing has a missing or invalid owner.';
    END IF;
    SELECT array_agg(listingid ORDER BY listingid),
           array_agg(listingpicture ORDER BY listingid)
    INTO photo_ids, photos FROM public.listings;

    SELECT array_agg(userid ORDER BY userid, slot) INTO owner_ids
    FROM (
        SELECT u.userid, slots.slot
        FROM public.users u
        CROSS JOIN LATERAL generate_series(
            1, greatest(0, 2 - (
                SELECT count(*)::integer FROM public.listings l
                WHERE l.owneruserid = u.userid
            ))
        ) AS slots(slot)
        ORDER BY u.userid, slots.slot
        LIMIT 50
    ) available;
    IF coalesce(cardinality(owner_ids), 0) <> 50 THEN
        RAISE EXCEPTION 'Import refused: fewer than 50 available owner slots (maximum two listings per user).';
    END IF;
    IF jsonb_array_length(properties) <> 50 THEN
        RAISE EXCEPTION 'Import refused: expected exactly 50 source properties.';
    END IF;

    FOR source_row IN
        SELECT (jsonb_populate_record(NULL::public.listings, entry.value)).*
        FROM jsonb_array_elements(properties) WITH ORDINALITY AS entry(value, ord)
        ORDER BY entry.ord
    LOOP
        IF source_row.name IS NULL OR source_row.location IS NULL
            OR source_row.postal IS NULL OR source_row.postal NOT BETWEEN 100000 AND 999999
            OR source_row.latitude IS NULL OR source_row.latitude NOT BETWEEN 1.15 AND 1.5
            OR source_row.longitude IS NULL OR source_row.longitude NOT BETWEEN 103.55 AND 104.1
            OR source_row.price IS NULL OR source_row.price <= 0
            OR source_row.size IS NULL OR source_row.size <= 0
            OR source_row.beds IS NULL OR source_row.beds <= 0
            OR source_row.bathroom IS NULL OR source_row.bathroom <= 0
            OR source_row.floor IS NULL OR source_row.floor < 1
            OR source_row.type IS NULL OR source_row.type NOT IN ('HDB', 'Condo', 'Landed')
            OR source_row.description IS NULL
            OR btrim(source_row.description) = '' THEN
            RAISE EXCEPTION 'Import refused: invalid property at batch position %.', position + 1;
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.listings
            WHERE name = source_row.name AND postal = source_row.postal
        ) THEN
            RAISE EXCEPTION 'Import refused: duplicate listing name/postal at position %.', position + 1;
        END IF;
        INSERT INTO public.listings (
            bathroom, beds, description, flagged, floor, listingpicture,
            location, name, postal, price, size, type, unit_number,
            owneruserid, tenantuserid, created_at, latitude, longitude
        ) VALUES (
            source_row.bathroom, source_row.beds, source_row.description,
            false, source_row.floor, photos[(position % 19) + 1],
            source_row.location, source_row.name, source_row.postal,
            source_row.price, source_row.size, source_row.type,
            source_row.unit_number, owner_ids[position + 1],
            NULL, transaction_timestamp() AT TIME ZONE 'UTC',
            source_row.latitude, source_row.longitude
        ) RETURNING listingid INTO new_id;

        INSERT INTO pg_temp.rentnest_demo50_mapping VALUES (
            position + 1, new_id, owner_ids[position + 1],
            photo_ids[(position % 19) + 1], source_row.postal, source_row.name
        );
        position := position + 1;
    END LOOP;

    IF position <> 50 OR (SELECT count(*) FROM public.listings) <> 69 THEN
        RAISE EXCEPTION 'Import verification failed: expected 50 new and 69 total listings.';
    END IF;
    IF EXISTS (
        SELECT * FROM pg_temp.rentnest_demo50_before
        EXCEPT
        SELECT * FROM public.listings
    ) THEN
        RAISE EXCEPTION 'Import verification failed: an existing listing changed.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.listings
        WHERE owneruserid IN (SELECT owner_id FROM pg_temp.rentnest_demo50_mapping)
        GROUP BY owneruserid HAVING count(*) > 2
    ) THEN
        RAISE EXCEPTION 'Import verification failed: an assigned owner exceeds two listings.';
    END IF;
END;
$seed$;

-- Retain this 50-row mapping. Wait for successful COMMIT as well.
SELECT * FROM pg_temp.rentnest_demo50_mapping ORDER BY batch_index;
COMMIT;
