-- TEST DATA ONLY: revise 68 Condo/HDB listings from the approved export.
-- Run the ENTIRE file in TEST Supabase SQL Editor after a fresh backup.
-- Stop app/backend writes first. No insert/delete/schema/sequence changes.
-- Only price, beds, bathroom, size, name and description may change.
-- The landed listing and all other listing fields remain untouched.
-- Missing/edited targets or linked rentals abort the entire transaction.
-- Already revised rows are accepted; repeat execution is a no-op.
-- Temporary tables are session-local and dropped on commit; no RLS changes.
-- See listing-variation-guide.md. Do not rerun either listing import.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE public.listings IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.rentals IN SHARE MODE;

CREATE TEMP TABLE rentnest_variation_changes (
    listingid bigint PRIMARY KEY,
    identity_fields jsonb NOT NULL,
    before_fields jsonb NOT NULL,
    after_fields jsonb NOT NULL
) ON COMMIT DROP;

INSERT INTO pg_temp.rentnest_variation_changes
SELECT * FROM jsonb_populate_recordset(
    NULL::pg_temp.rentnest_variation_changes,
    $changes$
[
  {
    "listingid": 59,
    "identity_fields": {
      "type": "HDB",
      "location": "85 Lorong 4 Toa Payoh, Toa Payoh",
      "postal": 310085,
      "floor": 8,
      "unit_number": "08-312",
      "owneruserid": 1,
      "listingpicture": "https://images.unsplash.com/photo-1611818831327-de3982fe1420?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 2650,
      "beds": 3,
      "bathroom": 2,
      "size": 1001,
      "name": "Toa Payoh HDB 4-Room",
      "description": "Well-maintained three-bedroom HDB flat at Lorong 4 Toa Payoh, with two bathrooms and 1,001 sq ft of living space."
    },
    "after_fields": {
      "price": 2700,
      "beds": 2,
      "bathroom": 1,
      "size": 650,
      "name": "Toa Payoh Two-Bedroom HDB",
      "description": "Two-bedroom HDB flat at 85 Lorong 4 Toa Payoh, with one bathroom and 650 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 60,
    "identity_fields": {
      "type": "Condo",
      "location": "Grange Road",
      "postal": 239694,
      "floor": 15,
      "unit_number": "15-05",
      "owneruserid": 1,
      "listingpicture": "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 5500,
      "beds": 2,
      "bathroom": 2,
      "size": 850,
      "name": "Orchard Road Condo",
      "description": "Luxurious condo unit along Grange Road, walking distance to Orchard MRT. Full condo facilities including pool, gym and BBQ pits."
    },
    "after_fields": {
      "price": 16500,
      "beds": 4,
      "bathroom": 4,
      "size": 2400,
      "name": "Orchard Road Condo",
      "description": "A 2,400 sq ft apartment along Grange Road, offering 4 bedrooms and four bathrooms. Located on floor 15, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 61,
    "identity_fields": {
      "type": "HDB",
      "location": "Tampines Street 43",
      "postal": 520132,
      "floor": 12,
      "unit_number": "12-450",
      "owneruserid": 2,
      "listingpicture": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3200,
      "beds": 4,
      "bathroom": 2,
      "size": 1184,
      "name": "Tampines HDB 5-Room",
      "description": "Spacious 5-room HDB in mature Tampines estate. Near Tampines Mall, IKEA, and Giant. Well-connected via bus and MRT."
    },
    "after_fields": {
      "price": 3850,
      "beds": 3,
      "bathroom": 2,
      "size": 900,
      "name": "Tampines Three-Bedroom HDB",
      "description": "Three-bedroom HDB flat along Tampines Street 43. This floor-12 home offers 900 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 62,
    "identity_fields": {
      "type": "Condo",
      "location": "87 Anchorvale Crescent",
      "postal": 544628,
      "floor": 6,
      "unit_number": "06-18",
      "owneruserid": 2,
      "listingpicture": "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3800,
      "beds": 3,
      "bathroom": 2,
      "size": 1100,
      "name": "The Vales Condo",
      "description": "Sample 3-bedroom executive condominium listing at The Vales, 87 Anchorvale Crescent, Sengkang. Unit details and asking rent are illustrative"
    },
    "after_fields": {
      "price": 7400,
      "beds": 3,
      "bathroom": 2,
      "size": 1280,
      "name": "The Vales Condo",
      "description": "Located at 87 Anchorvale Crescent, this apartment has 3 bedrooms, two bathrooms and 1,280 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 63,
    "identity_fields": {
      "type": "HDB",
      "location": "Commonwealth Avenue",
      "postal": 140055,
      "floor": 4,
      "unit_number": "04-22",
      "owneruserid": 3,
      "listingpicture": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 2200,
      "beds": 2,
      "bathroom": 1,
      "size": 721,
      "name": "Queenstown HDB 3-Room",
      "description": "Cosy 3-room HDB in Queenstown, one of Singapore most established estates. Short walk to Queenstown MRT. Surrounded by parks and food options."
    },
    "after_fields": {
      "price": 3100,
      "beds": 2,
      "bathroom": 2,
      "size": 700,
      "name": "Queenstown Two-Bedroom HDB",
      "description": "Two-bedroom HDB flat at Commonwealth Avenue, with two bathrooms and 700 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 64,
    "identity_fields": {
      "type": "Condo",
      "location": "Marine Parade Road",
      "postal": 449282,
      "floor": 10,
      "unit_number": "10-08",
      "owneruserid": 3,
      "listingpicture": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4200,
      "beds": 3,
      "bathroom": 2,
      "size": 980,
      "name": "East Coast Condo",
      "description": "Bright and airy condo near East Coast Park. Walking distance to Parkway Parade and Marine Parade food centre. Great for families and beach lovers."
    },
    "after_fields": {
      "price": 9200,
      "beds": 3,
      "bathroom": 3,
      "size": 1460,
      "name": "East Coast Condo",
      "description": "A 1,460 sq ft apartment along Marine Parade Road, offering 3 bedrooms and three bathrooms. Located on floor 10, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 65,
    "identity_fields": {
      "type": "HDB",
      "location": "Yishun Ring Road",
      "postal": 760231,
      "floor": 9,
      "unit_number": "09-101",
      "owneruserid": 4,
      "listingpicture": "https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 2600,
      "beds": 3,
      "bathroom": 2,
      "size": 1001,
      "name": "Yishun HDB 4-Room",
      "description": "Well-kept 4-room HDB in Yishun. Near Yishun MRT, Northpoint City mall, and community clubs. Ideal for families."
    },
    "after_fields": {
      "price": 4250,
      "beds": 3,
      "bathroom": 2,
      "size": 950,
      "name": "Yishun Three-Bedroom HDB",
      "description": "Three-bedroom HDB flat along Yishun Ring Road. This floor-9 home offers 950 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 67,
    "identity_fields": {
      "type": "HDB",
      "location": "528 Ang Mo Kio Avenue 10, Ang Mo Kio",
      "postal": 560528,
      "floor": 6,
      "unit_number": "06-567",
      "owneruserid": 5,
      "listingpicture": "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3000,
      "beds": 4,
      "bathroom": 2,
      "size": 1184,
      "name": "Ang Mo Kio HDB 5-Room",
      "description": "Four-bedroom HDB flat at Ang Mo Kio Avenue 10, with two bathrooms and 1,184 sq ft of living space. Located on the sixth floor."
    },
    "after_fields": {
      "price": 7600,
      "beds": 4,
      "bathroom": 3,
      "size": 1540,
      "name": "Ang Mo Kio Four-Bedroom HDB",
      "description": "Located at 528 Ang Mo Kio Avenue 10, this HDB flat has 4 bedrooms, three bathrooms and 1,540 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 68,
    "identity_fields": {
      "type": "Condo",
      "location": "Thomson Road",
      "postal": 307591,
      "floor": 18,
      "unit_number": "18-03",
      "owneruserid": 5,
      "listingpicture": "https://images.unsplash.com/photo-1499955085172-a104c9463ece?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4800,
      "beds": 2,
      "bathroom": 2,
      "size": 900,
      "name": "Novena Condo",
      "description": "High floor condo unit along Thomson Road with panoramic city views. Walking distance to Novena MRT and Square 2 mall. Close to major hospitals."
    },
    "after_fields": {
      "price": 12500,
      "beds": 4,
      "bathroom": 3,
      "size": 1880,
      "name": "Novena Condo",
      "description": "Four-bedroom apartment at Thomson Road, with three bathrooms and 1,880 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 69,
    "identity_fields": {
      "type": "HDB",
      "location": "127 Rivervale Street, Sengkang",
      "postal": 540127,
      "floor": 8,
      "unit_number": "08-101",
      "owneruserid": 6,
      "listingpicture": "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 1800,
      "beds": 3,
      "bathroom": 2,
      "size": 950,
      "name": "Sengkang Family Flat",
      "description": "Three-bedroom HDB flat in Sengkang with 950 sq ft of living space and two bathrooms. Situated on the eighth floor, with room for a family to settle in comfortably."
    },
    "after_fields": {
      "price": 2800,
      "beds": 2,
      "bathroom": 2,
      "size": 740,
      "name": "Sengkang Family Flat",
      "description": "A 740 sq ft HDB flat along 127 Rivervale Street, offering 2 bedrooms and two bathrooms. Located on floor 8, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 70,
    "identity_fields": {
      "type": "Condo",
      "location": "51 Tampines Lane, Tampines",
      "postal": 528460,
      "floor": 9,
      "unit_number": "09-102",
      "owneruserid": 6,
      "listingpicture": "https://images.unsplash.com/photo-1556020685-ae41abfc9365?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 2400,
      "beds": 2,
      "bathroom": 2,
      "size": 1100,
      "name": "Tampines Condo",
      "description": "Two-bedroom condominium in Tampines with 1,100 sq ft of living space and two bathrooms. A ninth-floor home with generous space for a couple or small family."
    },
    "after_fields": {
      "price": 5800,
      "beds": 2,
      "bathroom": 2,
      "size": 980,
      "name": "Tampines Condo",
      "description": "Two-bedroom apartment along 51 Tampines Lane. This floor-9 home offers 980 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 71,
    "identity_fields": {
      "type": "HDB",
      "location": "301 Woodlands Street 31, Woodlands",
      "postal": 730301,
      "floor": 10,
      "unit_number": "10-103",
      "owneruserid": 7,
      "listingpicture": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 900,
      "beds": 1,
      "bathroom": 1,
      "size": 450,
      "name": "Woodlands Compact Flat",
      "description": "One-bedroom HDB flat in Woodlands with 450 sq ft of living space and one bathroom. A compact tenth-floor home suited to a single tenant or couple."
    },
    "after_fields": {
      "price": 2000,
      "beds": 1,
      "bathroom": 1,
      "size": 450,
      "name": "Woodlands Compact Flat",
      "description": "Located at 301 Woodlands Street 31, this HDB flat has 1 bedrooms, one bathroom and 450 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 72,
    "identity_fields": {
      "type": "Condo",
      "location": "212 Loyang Avenue, Changi",
      "postal": 509064,
      "floor": 6,
      "unit_number": "06-104",
      "owneruserid": 7,
      "listingpicture": "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4200,
      "beds": 3,
      "bathroom": 3,
      "size": 1800,
      "name": "Changi Spacious Condo",
      "description": "Three-bedroom condominium at Loyang Avenue in Changi, with 1,800 sq ft of living space and three bathrooms. A sixth-floor home with room for a larger household."
    },
    "after_fields": {
      "price": 11000,
      "beds": 4,
      "bathroom": 4,
      "size": 2180,
      "name": "Changi Spacious Condo",
      "description": "Four-bedroom apartment at 212 Loyang Avenue, with four bathrooms and 2,180 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 73,
    "identity_fields": {
      "type": "Condo",
      "location": "1189 Upper Serangoon Road, Hougang",
      "postal": 534785,
      "floor": 8,
      "unit_number": "08-12",
      "owneruserid": 8,
      "listingpicture": "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3300,
      "beds": 2,
      "bathroom": 2,
      "size": 820,
      "name": "Hougang Bright Two-Bedroom Condo",
      "description": "Two-bedroom apartment with two bathrooms and a separate dining corner. The second bedroom can be used as a study or guest room."
    },
    "after_fields": {
      "price": 5200,
      "beds": 2,
      "bathroom": 2,
      "size": 860,
      "name": "Hougang Bright Two-Bedroom Condo",
      "description": "A 860 sq ft apartment along 1189 Upper Serangoon Road, offering 2 bedrooms and two bathrooms. Located on floor 8, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 74,
    "identity_fields": {
      "type": "Condo",
      "location": "1 Amber Gardens, Katong",
      "postal": 439957,
      "floor": 11,
      "unit_number": "11-04",
      "owneruserid": 8,
      "listingpicture": "https://images.unsplash.com/photo-1612320648993-61c1cd604b71?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 5200,
      "beds": 2,
      "bathroom": 2,
      "size": 960,
      "name": "Katong Balcony Condo",
      "description": "Two-bedroom apartment with a balcony beside the living room. Both bedrooms are set away from the main entrance."
    },
    "after_fields": {
      "price": 7600,
      "beds": 2,
      "bathroom": 2,
      "size": 1050,
      "name": "Katong Balcony Condo",
      "description": "Two-bedroom apartment along 1 Amber Gardens. This floor-11 home offers 1,050 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 75,
    "identity_fields": {
      "type": "Condo",
      "location": "12 Holland Hill, Holland",
      "postal": 278743,
      "floor": 11,
      "unit_number": "11-08",
      "owneruserid": 9,
      "listingpicture": "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4700,
      "beds": 2,
      "bathroom": 2,
      "size": 990,
      "name": "Holland Two-Bedroom Balcony Condo",
      "description": "Two-bedroom apartment with two bathrooms and a balcony. The enclosed kitchen keeps the main living area open for dining and relaxing."
    },
    "after_fields": {
      "price": 8500,
      "beds": 2,
      "bathroom": 2,
      "size": 1120,
      "name": "Holland Two-Bedroom Balcony Condo",
      "description": "Located at 12 Holland Hill, this apartment has 2 bedrooms, two bathrooms and 1,120 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 76,
    "identity_fields": {
      "type": "Condo",
      "location": "47 Tampines Lane, Tampines",
      "postal": 528462,
      "floor": 6,
      "unit_number": "06-06",
      "owneruserid": 9,
      "listingpicture": "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3600,
      "beds": 2,
      "bathroom": 2,
      "size": 850,
      "name": "Tampines Corner Condo",
      "description": "Two-bedroom apartment with a corner living area and a compact balcony. A separate kitchen provides additional storage."
    },
    "after_fields": {
      "price": 5000,
      "beds": 2,
      "bathroom": 1,
      "size": 810,
      "name": "Tampines Corner Condo",
      "description": "Two-bedroom apartment at 47 Tampines Lane, with one bathroom and 810 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 77,
    "identity_fields": {
      "type": "Condo",
      "location": "2 Martin Place, River Valley",
      "postal": 237988,
      "floor": 15,
      "unit_number": "15-05",
      "owneruserid": 10,
      "listingpicture": "https://images.unsplash.com/photo-1651766231259-cdaafe69acd8?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4500,
      "beds": 1,
      "bathroom": 1,
      "size": 650,
      "name": "River Valley Compact City Condo",
      "description": "One-bedroom city apartment with an enclosed kitchen and balcony. The living room has space for a dining table and a work corner."
    },
    "after_fields": {
      "price": 5400,
      "beds": 1,
      "bathroom": 1,
      "size": 650,
      "name": "River Valley Compact City Condo",
      "description": "A 650 sq ft apartment along 2 Martin Place, offering 1 bedrooms and one bathroom. Located on floor 15, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 78,
    "identity_fields": {
      "type": "Condo",
      "location": "12 ANG MO KIO CENTRAL 3, Singapore 567746",
      "postal": 567746,
      "floor": 3,
      "unit_number": "03-01",
      "owneruserid": 10,
      "listingpicture": "https://images.unsplash.com/photo-1611818831327-de3982fe1420?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4300,
      "beds": 2,
      "bathroom": 2,
      "size": 875,
      "name": "Bright Ang Mo Kio Apartment - 12",
      "description": "Two-bedroom apartment at 12 Ang Mo Kio Central 3, with two bathrooms and 875 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
    },
    "after_fields": {
      "price": 6100,
      "beds": 2,
      "bathroom": 2,
      "size": 930,
      "name": "Bright Ang Mo Kio Apartment - 12",
      "description": "Two-bedroom apartment along 12 Ang Mo Kio Central 3. This floor-3 home offers 930 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 79,
    "identity_fields": {
      "type": "Condo",
      "location": "12 ANG MO KIO AVENUE 2, Singapore 567697",
      "postal": 567697,
      "floor": 4,
      "unit_number": "04-02",
      "owneruserid": 11,
      "listingpicture": "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4400,
      "beds": 2,
      "bathroom": 2,
      "size": 900,
      "name": "Cosy Ang Mo Kio Apartment - 12",
      "description": "Two-bedroom apartment along 12 Ang Mo Kio Avenue 2. This fourth-floor home offers 900 sq ft, two bathrooms and a practical layout with space for a work corner."
    },
    "after_fields": {
      "price": 8200,
      "beds": 3,
      "bathroom": 3,
      "size": 1340,
      "name": "Cosy Ang Mo Kio Apartment - 12",
      "description": "Located at 12 Ang Mo Kio Avenue 2, this apartment has 3 bedrooms, three bathrooms and 1,340 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 80,
    "identity_fields": {
      "type": "Condo",
      "location": "61 BISHAN STREET 21, Singapore 574044",
      "postal": 574044,
      "floor": 2,
      "unit_number": "02-03",
      "owneruserid": 11,
      "listingpicture": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 5100,
      "beds": 3,
      "bathroom": 2,
      "size": 1175,
      "name": "Spacious Bishan Apartment - 61",
      "description": "A 1,175 sq ft apartment at 61 Bishan Street 21, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
    },
    "after_fields": {
      "price": 7200,
      "beds": 3,
      "bathroom": 2,
      "size": 1210,
      "name": "Spacious Bishan Apartment - 61",
      "description": "Three-bedroom apartment at 61 Bishan Street 21, with two bathrooms and 1,210 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 81,
    "identity_fields": {
      "type": "Condo",
      "location": "63 BISHAN STREET 21, Singapore 574045",
      "postal": 574045,
      "floor": 3,
      "unit_number": "03-04",
      "owneruserid": 12,
      "listingpicture": "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4600,
      "beds": 2,
      "bathroom": 2,
      "size": 850,
      "name": "Welcoming Bishan Apartment - 63",
      "description": "Two-bedroom apartment at 63 Bishan Street 21, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 850 sq ft."
    },
    "after_fields": {
      "price": 5700,
      "beds": 2,
      "bathroom": 2,
      "size": 890,
      "name": "Welcoming Bishan Apartment - 63",
      "description": "A 890 sq ft apartment along 63 Bishan Street 21, offering 2 bedrooms and two bathrooms. Located on floor 3, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 82,
    "identity_fields": {
      "type": "Condo",
      "location": "61 BRIGHT HILL DRIVE, Singapore 579653",
      "postal": 579653,
      "floor": 4,
      "unit_number": "04-05",
      "owneruserid": 12,
      "listingpicture": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4200,
      "beds": 2,
      "bathroom": 2,
      "size": 875,
      "name": "Quiet Bishan Apartment - 61",
      "description": "Two-bedroom apartment along 61 Bright Hill Drive, offering 875 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
    },
    "after_fields": {
      "price": 5000,
      "beds": 1,
      "bathroom": 1,
      "size": 710,
      "name": "Quiet Bishan Apartment - 61",
      "description": "One-bedroom apartment along 61 Bright Hill Drive. This floor-4 home offers 710 sq ft and one bathroom, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 83,
    "identity_fields": {
      "type": "Condo",
      "location": "31 BISHAN STREET 11, Singapore 579819",
      "postal": 579819,
      "floor": 2,
      "unit_number": "02-06",
      "owneruserid": 13,
      "listingpicture": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4900,
      "beds": 3,
      "bathroom": 2,
      "size": 1150,
      "name": "Bright Bishan Apartment - 31",
      "description": "Located at 31 Bishan Street 11, this second-floor apartment has 3 bedrooms, two bathrooms and 1,150 sq ft of space. The layout separates dining from the main lounge."
    },
    "after_fields": {
      "price": 9800,
      "beds": 4,
      "bathroom": 3,
      "size": 1720,
      "name": "Bright Bishan Apartment - 31",
      "description": "Located at 31 Bishan Street 11, this apartment has 4 bedrooms, three bathrooms and 1,720 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 84,
    "identity_fields": {
      "type": "Condo",
      "location": "33 BISHAN STREET 11, Singapore 579820",
      "postal": 579820,
      "floor": 3,
      "unit_number": "03-07",
      "owneruserid": 13,
      "listingpicture": "https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4400,
      "beds": 2,
      "bathroom": 2,
      "size": 925,
      "name": "Cosy Bishan Apartment - 33",
      "description": "Two-bedroom apartment at 33 Bishan Street 11, with two bathrooms and 925 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
    },
    "after_fields": {
      "price": 7900,
      "beds": 3,
      "bathroom": 2,
      "size": 1380,
      "name": "Cosy Bishan Apartment - 33",
      "description": "Three-bedroom apartment at 33 Bishan Street 11, with two bathrooms and 1,380 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 85,
    "identity_fields": {
      "type": "Condo",
      "location": "35 BISHAN STREET 11, Singapore 579821",
      "postal": 579821,
      "floor": 4,
      "unit_number": "04-08",
      "owneruserid": 14,
      "listingpicture": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 4500,
      "beds": 2,
      "bathroom": 2,
      "size": 850,
      "name": "Spacious Bishan Apartment - 35",
      "description": "Two-bedroom apartment along 35 Bishan Street 11. This fourth-floor home offers 850 sq ft, two bathrooms and a practical layout with space for a work corner."
    },
    "after_fields": {
      "price": 6400,
      "beds": 2,
      "bathroom": 2,
      "size": 1010,
      "name": "Comfortable Bishan Apartment - 35",
      "description": "A 1,010 sq ft apartment along 35 Bishan Street 11, offering 2 bedrooms and two bathrooms. Located on floor 4, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 86,
    "identity_fields": {
      "type": "HDB",
      "location": "101 BISHAN STREET 12, Singapore 570101",
      "postal": 570101,
      "floor": 2,
      "unit_number": "02-09",
      "owneruserid": 14,
      "listingpicture": "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3900,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Welcoming Bishan Flat - 101",
      "description": "A 1,025 sq ft HDB flat at 101 Bishan Street 12, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
    },
    "after_fields": {
      "price": 8000,
      "beds": 4,
      "bathroom": 3,
      "size": 1600,
      "name": "Welcoming Bishan Flat - 101",
      "description": "Four-bedroom HDB flat along 101 Bishan Street 12. This floor-2 home offers 1,600 sq ft and three bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 87,
    "identity_fields": {
      "type": "HDB",
      "location": "102 BISHAN STREET 12, Singapore 570102",
      "postal": 570102,
      "floor": 3,
      "unit_number": "03-10",
      "owneruserid": 15,
      "listingpicture": "https://images.unsplash.com/photo-1499955085172-a104c9463ece?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 2900,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Quiet Bishan Flat - 102",
      "description": "Two-bedroom HDB flat at 102 Bishan Street 12, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 800 sq ft."
    },
    "after_fields": {
      "price": 4950,
      "beds": 3,
      "bathroom": 2,
      "size": 1100,
      "name": "Quiet Bishan Flat - 102",
      "description": "Located at 102 Bishan Street 12, this HDB flat has 3 bedrooms, two bathrooms and 1,100 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 88,
    "identity_fields": {
      "type": "HDB",
      "location": "103 BISHAN STREET 12, Singapore 570103",
      "postal": 570103,
      "floor": 4,
      "unit_number": "04-11",
      "owneruserid": 15,
      "listingpicture": "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3600,
      "beds": 3,
      "bathroom": 2,
      "size": 1075,
      "name": "Bright Bishan Flat - 103",
      "description": "Three-bedroom HDB flat along 103 Bishan Street 12, offering 1,075 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
    },
    "after_fields": {
      "price": 7100,
      "beds": 4,
      "bathroom": 2,
      "size": 1480,
      "name": "Bright Bishan Flat - 103",
      "description": "Four-bedroom HDB flat at 103 Bishan Street 12, with two bathrooms and 1,480 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 89,
    "identity_fields": {
      "type": "HDB",
      "location": "104 BISHAN STREET 12, Singapore 570104",
      "postal": 570104,
      "floor": 2,
      "unit_number": "02-12",
      "owneruserid": 16,
      "listingpicture": "https://images.unsplash.com/photo-1556020685-ae41abfc9365?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3100,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Cosy Bishan Flat - 104",
      "description": "Located at 104 Bishan Street 12, this second-floor HDB flat has 2 bedrooms, two bathrooms and 750 sq ft of space. The layout separates dining from the main lounge."
    },
    "after_fields": {
      "price": 3500,
      "beds": 2,
      "bathroom": 2,
      "size": 860,
      "name": "Cosy Bishan Flat - 104",
      "description": "A 860 sq ft HDB flat along 104 Bishan Street 12, offering 2 bedrooms and two bathrooms. Located on floor 2, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 90,
    "identity_fields": {
      "type": "Condo",
      "location": "19 OXLEY ROAD, Singapore 238619",
      "postal": 238619,
      "floor": 3,
      "unit_number": "03-13",
      "owneruserid": 16,
      "listingpicture": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 6200,
      "beds": 2,
      "bathroom": 2,
      "size": 875,
      "name": "Spacious Orchard / Oxley Apartment - 19",
      "description": "Two-bedroom apartment at 19 Oxley Road, with two bathrooms and 875 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
    },
    "after_fields": {
      "price": 17500,
      "beds": 4,
      "bathroom": 4,
      "size": 2650,
      "name": "Spacious Orchard / Oxley Apartment - 19",
      "description": "Four-bedroom apartment along 19 Oxley Road. This floor-3 home offers 2,650 sq ft and four bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 91,
    "identity_fields": {
      "type": "Condo",
      "location": "27 OXLEY ROAD, Singapore 238621",
      "postal": 238621,
      "floor": 4,
      "unit_number": "04-14",
      "owneruserid": 17,
      "listingpicture": "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 6300,
      "beds": 2,
      "bathroom": 2,
      "size": 900,
      "name": "Welcoming Orchard / Oxley Apartment - 27",
      "description": "Two-bedroom apartment along 27 Oxley Road. This fourth-floor home offers 900 sq ft, two bathrooms and a practical layout with space for a work corner."
    },
    "after_fields": {
      "price": 20000,
      "beds": 5,
      "bathroom": 5,
      "size": 3500,
      "name": "Welcoming Orchard / Oxley Apartment - 27",
      "description": "Located at 27 Oxley Road, this apartment has 5 bedrooms, five bathrooms and 3,500 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 92,
    "identity_fields": {
      "type": "Condo",
      "location": "5 CUSCADEN WALK, Singapore 249696",
      "postal": 249696,
      "floor": 2,
      "unit_number": "02-15",
      "owneruserid": 17,
      "listingpicture": "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 6500,
      "beds": 3,
      "bathroom": 2,
      "size": 1175,
      "name": "Quiet Orchard Apartment - 5",
      "description": "A 1,175 sq ft apartment at 5 Cuscaden Walk, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
    },
    "after_fields": {
      "price": 19000,
      "beds": 5,
      "bathroom": 4,
      "size": 2980,
      "name": "Quiet Orchard Apartment - 5",
      "description": "Five-bedroom apartment at 5 Cuscaden Walk, with four bathrooms and 2,980 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 93,
    "identity_fields": {
      "type": "HDB",
      "location": "474 JURONG WEST STREET 41, Singapore 640474",
      "postal": 640474,
      "floor": 3,
      "unit_number": "03-16",
      "owneruserid": 18,
      "listingpicture": "https://images.unsplash.com/photo-1612320648993-61c1cd604b71?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3000,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Bright Jurong West Flat - 474",
      "description": "Two-bedroom HDB flat at 474 Jurong West Street 41, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 750 sq ft."
    },
    "after_fields": {
      "price": 4350,
      "beds": 3,
      "bathroom": 2,
      "size": 1150,
      "name": "Bright Jurong West Flat - 474",
      "description": "A 1,150 sq ft HDB flat along 474 Jurong West Street 41, offering 3 bedrooms and two bathrooms. Located on floor 3, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 94,
    "identity_fields": {
      "type": "HDB",
      "location": "475 JURONG WEST STREET 41, Singapore 640475",
      "postal": 640475,
      "floor": 4,
      "unit_number": "04-17",
      "owneruserid": 18,
      "listingpicture": "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3700,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Cosy Jurong West Flat - 475",
      "description": "Three-bedroom HDB flat along 475 Jurong West Street 41, offering 1,025 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
    },
    "after_fields": {
      "price": 3000,
      "beds": 2,
      "bathroom": 1,
      "size": 650,
      "name": "Cosy Jurong West Flat - 475",
      "description": "Two-bedroom HDB flat along 475 Jurong West Street 41. This floor-4 home offers 650 sq ft and one bathroom, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 95,
    "identity_fields": {
      "type": "HDB",
      "location": "476 JURONG WEST STREET 41, Singapore 640476",
      "postal": 640476,
      "floor": 2,
      "unit_number": "02-18",
      "owneruserid": 21,
      "listingpicture": "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3200,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Spacious Jurong West Flat - 476",
      "description": "Located at 476 Jurong West Street 41, this second-floor HDB flat has 2 bedrooms, two bathrooms and 800 sq ft of space. The layout separates dining from the main lounge."
    },
    "after_fields": {
      "price": 4750,
      "beds": 3,
      "bathroom": 2,
      "size": 1200,
      "name": "Spacious Jurong West Flat - 476",
      "description": "Located at 476 Jurong West Street 41, this HDB flat has 3 bedrooms, two bathrooms and 1,200 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 96,
    "identity_fields": {
      "type": "HDB",
      "location": "477 JURONG WEST STREET 41, Singapore 640477",
      "postal": 640477,
      "floor": 3,
      "unit_number": "03-19",
      "owneruserid": 21,
      "listingpicture": "https://images.unsplash.com/photo-1651766231259-cdaafe69acd8?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3900,
      "beds": 3,
      "bathroom": 2,
      "size": 1075,
      "name": "Welcoming Jurong West Flat - 477",
      "description": "Three-bedroom HDB flat at 477 Jurong West Street 41, with two bathrooms and 1,075 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
    },
    "after_fields": {
      "price": 3400,
      "beds": 2,
      "bathroom": 2,
      "size": 700,
      "name": "Welcoming Jurong West Flat - 477",
      "description": "Two-bedroom HDB flat at 477 Jurong West Street 41, with two bathrooms and 700 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 97,
    "identity_fields": {
      "type": "HDB",
      "location": "478 JURONG WEST STREET 41, Singapore 640478",
      "postal": 640478,
      "floor": 4,
      "unit_number": "04-20",
      "owneruserid": 22,
      "listingpicture": "https://images.unsplash.com/photo-1611818831327-de3982fe1420?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 2900,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Quiet Jurong West Flat - 478",
      "description": "Two-bedroom HDB flat along 478 Jurong West Street 41. This fourth-floor home offers 750 sq ft, two bathrooms and a practical layout with space for a work corner."
    },
    "after_fields": {
      "price": 3700,
      "beds": 3,
      "bathroom": 2,
      "size": 900,
      "name": "Quiet Jurong West Flat - 478",
      "description": "A 900 sq ft HDB flat along 478 Jurong West Street 41, offering 3 bedrooms and two bathrooms. Located on floor 4, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 98,
    "identity_fields": {
      "type": "HDB",
      "location": "479 JURONG WEST STREET 41, Singapore 640479",
      "postal": 640479,
      "floor": 2,
      "unit_number": "02-21",
      "owneruserid": 22,
      "listingpicture": "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3600,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Bright Jurong West Flat - 479",
      "description": "A 1,025 sq ft HDB flat at 479 Jurong West Street 41, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
    },
    "after_fields": {
      "price": 5350,
      "beds": 4,
      "bathroom": 2,
      "size": 1400,
      "name": "Bright Jurong West Flat - 479",
      "description": "Four-bedroom HDB flat along 479 Jurong West Street 41. This floor-2 home offers 1,400 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 99,
    "identity_fields": {
      "type": "HDB",
      "location": "480 JURONG WEST STREET 41, Singapore 640480",
      "postal": 640480,
      "floor": 3,
      "unit_number": "03-22",
      "owneruserid": 23,
      "listingpicture": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3100,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Cosy Jurong West Flat - 480",
      "description": "Two-bedroom HDB flat at 480 Jurong West Street 41, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 800 sq ft."
    },
    "after_fields": {
      "price": 3100,
      "beds": 2,
      "bathroom": 2,
      "size": 740,
      "name": "Cosy Jurong West Flat - 480",
      "description": "Located at 480 Jurong West Street 41, this HDB flat has 2 bedrooms, two bathrooms and 740 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 100,
    "identity_fields": {
      "type": "HDB",
      "location": "481 JURONG WEST STREET 41, Singapore 640481",
      "postal": 640481,
      "floor": 4,
      "unit_number": "04-23",
      "owneruserid": 23,
      "listingpicture": "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3800,
      "beds": 3,
      "bathroom": 2,
      "size": 1075,
      "name": "Spacious Jurong West Flat - 481",
      "description": "Three-bedroom HDB flat along 481 Jurong West Street 41, offering 1,075 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
    },
    "after_fields": {
      "price": 4350,
      "beds": 3,
      "bathroom": 2,
      "size": 1000,
      "name": "Spacious Jurong West Flat - 481",
      "description": "Three-bedroom HDB flat at 481 Jurong West Street 41, with two bathrooms and 1,000 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 101,
    "identity_fields": {
      "type": "HDB",
      "location": "482 JURONG WEST STREET 41, Singapore 640482",
      "postal": 640482,
      "floor": 2,
      "unit_number": "02-24",
      "owneruserid": 24,
      "listingpicture": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3300,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Welcoming Jurong West Flat - 482",
      "description": "Located at 482 Jurong West Street 41, this second-floor HDB flat has 2 bedrooms, two bathrooms and 750 sq ft of space. The layout separates dining from the main lounge."
    },
    "after_fields": {
      "price": 2600,
      "beds": 1,
      "bathroom": 1,
      "size": 480,
      "name": "Welcoming Jurong West Flat - 482",
      "description": "A 480 sq ft HDB flat along 482 Jurong West Street 41, offering 1 bedrooms and one bathroom. Located on floor 2, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 102,
    "identity_fields": {
      "type": "HDB",
      "location": "483 JURONG WEST STREET 41, Singapore 640483",
      "postal": 640483,
      "floor": 3,
      "unit_number": "03-25",
      "owneruserid": 24,
      "listingpicture": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3500,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Quiet Jurong West Flat - 483",
      "description": "Three-bedroom HDB flat at 483 Jurong West Street 41, with two bathrooms and 1,025 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
    },
    "after_fields": {
      "price": 4000,
      "beds": 3,
      "bathroom": 2,
      "size": 1050,
      "name": "Quiet Jurong West Flat - 483",
      "description": "Three-bedroom HDB flat along 483 Jurong West Street 41. This floor-3 home offers 1,050 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 103,
    "identity_fields": {
      "type": "HDB",
      "location": "484 JURONG WEST AVENUE 1, Singapore 640484",
      "postal": 640484,
      "floor": 4,
      "unit_number": "04-26",
      "owneruserid": 25,
      "listingpicture": "https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3000,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Bright Jurong West Flat - 484",
      "description": "Two-bedroom HDB flat along 484 Jurong West Avenue 1. This fourth-floor home offers 800 sq ft, two bathrooms and a practical layout with space for a work corner."
    },
    "after_fields": {
      "price": 5550,
      "beds": 4,
      "bathroom": 3,
      "size": 1540,
      "name": "Bright Jurong West Flat - 484",
      "description": "Located at 484 Jurong West Avenue 1, this HDB flat has 4 bedrooms, three bathrooms and 1,540 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 104,
    "identity_fields": {
      "type": "HDB",
      "location": "485 JURONG WEST AVENUE 1, Singapore 640485",
      "postal": 640485,
      "floor": 2,
      "unit_number": "02-27",
      "owneruserid": 25,
      "listingpicture": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3700,
      "beds": 3,
      "bathroom": 2,
      "size": 1075,
      "name": "Cosy Jurong West Flat - 485",
      "description": "A 1,075 sq ft HDB flat at 485 Jurong West Avenue 1, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
    },
    "after_fields": {
      "price": 3400,
      "beds": 2,
      "bathroom": 2,
      "size": 860,
      "name": "Cosy Jurong West Flat - 485",
      "description": "Two-bedroom HDB flat at 485 Jurong West Avenue 1, with two bathrooms and 860 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 105,
    "identity_fields": {
      "type": "HDB",
      "location": "486 JURONG WEST AVENUE 1, Singapore 640486",
      "postal": 640486,
      "floor": 3,
      "unit_number": "03-28",
      "owneruserid": 26,
      "listingpicture": "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3200,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Spacious Jurong West Flat - 486",
      "description": "Two-bedroom HDB flat at 486 Jurong West Avenue 1, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 750 sq ft."
    },
    "after_fields": {
      "price": 4550,
      "beds": 3,
      "bathroom": 2,
      "size": 1100,
      "name": "Spacious Jurong West Flat - 486",
      "description": "A 1,100 sq ft HDB flat along 486 Jurong West Avenue 1, offering 3 bedrooms and two bathrooms. Located on floor 3, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 106,
    "identity_fields": {
      "type": "HDB",
      "location": "487 JURONG WEST AVENUE 1, Singapore 640487",
      "postal": 640487,
      "floor": 4,
      "unit_number": "04-29",
      "owneruserid": 26,
      "listingpicture": "https://images.unsplash.com/photo-1499955085172-a104c9463ece?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3900,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Welcoming Jurong West Flat - 487",
      "description": "Three-bedroom HDB flat along 487 Jurong West Avenue 1, offering 1,025 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
    },
    "after_fields": {
      "price": 3300,
      "beds": 2,
      "bathroom": 1,
      "size": 650,
      "name": "Welcoming Jurong West Flat - 487",
      "description": "Two-bedroom HDB flat along 487 Jurong West Avenue 1. This floor-4 home offers 650 sq ft and one bathroom, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 107,
    "identity_fields": {
      "type": "HDB",
      "location": "488 JURONG WEST AVENUE 1, Singapore 640488",
      "postal": 640488,
      "floor": 2,
      "unit_number": "02-30",
      "owneruserid": 27,
      "listingpicture": "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 2900,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Quiet Jurong West Flat - 488",
      "description": "Located at 488 Jurong West Avenue 1, this second-floor HDB flat has 2 bedrooms, two bathrooms and 800 sq ft of space. The layout separates dining from the main lounge."
    },
    "after_fields": {
      "price": 4200,
      "beds": 3,
      "bathroom": 2,
      "size": 1150,
      "name": "Quiet Jurong West Flat - 488",
      "description": "Located at 488 Jurong West Avenue 1, this HDB flat has 3 bedrooms, two bathrooms and 1,150 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 108,
    "identity_fields": {
      "type": "HDB",
      "location": "489 JURONG WEST AVENUE 1, Singapore 640489",
      "postal": 640489,
      "floor": 3,
      "unit_number": "03-31",
      "owneruserid": 27,
      "listingpicture": "https://images.unsplash.com/photo-1556020685-ae41abfc9365?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3600,
      "beds": 3,
      "bathroom": 2,
      "size": 1075,
      "name": "Bright Jurong West Flat - 489",
      "description": "Three-bedroom HDB flat at 489 Jurong West Avenue 1, with two bathrooms and 1,075 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
    },
    "after_fields": {
      "price": 2950,
      "beds": 2,
      "bathroom": 2,
      "size": 700,
      "name": "Bright Jurong West Flat - 489",
      "description": "Two-bedroom HDB flat at 489 Jurong West Avenue 1, with two bathrooms and 700 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 109,
    "identity_fields": {
      "type": "HDB",
      "location": "490 JURONG WEST AVENUE 1, Singapore 640490",
      "postal": 640490,
      "floor": 4,
      "unit_number": "04-32",
      "owneruserid": 28,
      "listingpicture": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3100,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Cosy Jurong West Flat - 490",
      "description": "Two-bedroom HDB flat along 490 Jurong West Avenue 1. This fourth-floor home offers 750 sq ft, two bathrooms and a practical layout with space for a work corner."
    },
    "after_fields": {
      "price": 4600,
      "beds": 3,
      "bathroom": 2,
      "size": 1200,
      "name": "Cosy Jurong West Flat - 490",
      "description": "A 1,200 sq ft HDB flat along 490 Jurong West Avenue 1, offering 3 bedrooms and two bathrooms. Located on floor 4, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 110,
    "identity_fields": {
      "type": "HDB",
      "location": "491 JURONG WEST AVENUE 1, Singapore 640491",
      "postal": 640491,
      "floor": 2,
      "unit_number": "02-33",
      "owneruserid": 28,
      "listingpicture": "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3800,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Spacious Jurong West Flat - 491",
      "description": "A 1,025 sq ft HDB flat at 491 Jurong West Avenue 1, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
    },
    "after_fields": {
      "price": 5650,
      "beds": 4,
      "bathroom": 2,
      "size": 1400,
      "name": "Spacious Jurong West Flat - 491",
      "description": "Four-bedroom HDB flat along 491 Jurong West Avenue 1. This floor-2 home offers 1,400 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 111,
    "identity_fields": {
      "type": "HDB",
      "location": "101 JURONG EAST STREET 13, Singapore 600101",
      "postal": 600101,
      "floor": 3,
      "unit_number": "03-34",
      "owneruserid": 29,
      "listingpicture": "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3300,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Welcoming Jurong East Flat - 101",
      "description": "Two-bedroom HDB flat at 101 Jurong East Street 13, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 800 sq ft."
    },
    "after_fields": {
      "price": 3400,
      "beds": 2,
      "bathroom": 2,
      "size": 740,
      "name": "Welcoming Jurong East Flat - 101",
      "description": "Located at 101 Jurong East Street 13, this HDB flat has 2 bedrooms, two bathrooms and 740 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 112,
    "identity_fields": {
      "type": "HDB",
      "location": "102 JURONG EAST STREET 13, Singapore 600102",
      "postal": 600102,
      "floor": 4,
      "unit_number": "04-35",
      "owneruserid": 29,
      "listingpicture": "https://images.unsplash.com/photo-1612320648993-61c1cd604b71?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3500,
      "beds": 3,
      "bathroom": 2,
      "size": 1075,
      "name": "Quiet Jurong East Flat - 102",
      "description": "Three-bedroom HDB flat along 102 Jurong East Street 13, offering 1,075 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
    },
    "after_fields": {
      "price": 3800,
      "beds": 3,
      "bathroom": 2,
      "size": 950,
      "name": "Quiet Jurong East Flat - 102",
      "description": "Three-bedroom HDB flat at 102 Jurong East Street 13, with two bathrooms and 950 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 113,
    "identity_fields": {
      "type": "HDB",
      "location": "103 JURONG EAST STREET 13, Singapore 600103",
      "postal": 600103,
      "floor": 2,
      "unit_number": "02-36",
      "owneruserid": 30,
      "listingpicture": "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3000,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Bright Jurong East Flat - 103",
      "description": "Located at 103 Jurong East Street 13, this second-floor HDB flat has 2 bedrooms, two bathrooms and 750 sq ft of space. The layout separates dining from the main lounge."
    },
    "after_fields": {
      "price": 2350,
      "beds": 1,
      "bathroom": 1,
      "size": 550,
      "name": "Bright Jurong East Flat - 103",
      "description": "A 550 sq ft HDB flat along 103 Jurong East Street 13, offering 1 bedrooms and one bathroom. Located on floor 2, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 114,
    "identity_fields": {
      "type": "HDB",
      "location": "104 JURONG EAST STREET 13, Singapore 600104",
      "postal": 600104,
      "floor": 3,
      "unit_number": "03-37",
      "owneruserid": 30,
      "listingpicture": "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3700,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Cosy Jurong East Flat - 104",
      "description": "Three-bedroom HDB flat at 104 Jurong East Street 13, with two bathrooms and 1,025 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
    },
    "after_fields": {
      "price": 4200,
      "beds": 3,
      "bathroom": 2,
      "size": 1000,
      "name": "Cosy Jurong East Flat - 104",
      "description": "Three-bedroom HDB flat along 104 Jurong East Street 13. This floor-3 home offers 1,000 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 115,
    "identity_fields": {
      "type": "HDB",
      "location": "105 JURONG EAST STREET 13, Singapore 600105",
      "postal": 600105,
      "floor": 4,
      "unit_number": "04-38",
      "owneruserid": 31,
      "listingpicture": "https://images.unsplash.com/photo-1651766231259-cdaafe69acd8?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3200,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Spacious Jurong East Flat - 105",
      "description": "Two-bedroom HDB flat along 105 Jurong East Street 13. This fourth-floor home offers 800 sq ft, two bathrooms and a practical layout with space for a work corner."
    },
    "after_fields": {
      "price": 5850,
      "beds": 4,
      "bathroom": 3,
      "size": 1540,
      "name": "Spacious Jurong East Flat - 105",
      "description": "Located at 105 Jurong East Street 13, this HDB flat has 4 bedrooms, three bathrooms and 1,540 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 116,
    "identity_fields": {
      "type": "HDB",
      "location": "106 JURONG EAST STREET 13, Singapore 600106",
      "postal": 600106,
      "floor": 2,
      "unit_number": "02-39",
      "owneruserid": 31,
      "listingpicture": "https://images.unsplash.com/photo-1611818831327-de3982fe1420?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3900,
      "beds": 3,
      "bathroom": 2,
      "size": 1075,
      "name": "Welcoming Jurong East Flat - 106",
      "description": "A 1,075 sq ft HDB flat at 106 Jurong East Street 13, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
    },
    "after_fields": {
      "price": 3700,
      "beds": 2,
      "bathroom": 2,
      "size": 860,
      "name": "Welcoming Jurong East Flat - 106",
      "description": "Two-bedroom HDB flat at 106 Jurong East Street 13, with two bathrooms and 860 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 117,
    "identity_fields": {
      "type": "HDB",
      "location": "107 JURONG EAST STREET 13, Singapore 600107",
      "postal": 600107,
      "floor": 3,
      "unit_number": "03-40",
      "owneruserid": 32,
      "listingpicture": "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 2900,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Quiet Jurong East Flat - 107",
      "description": "Two-bedroom HDB flat at 107 Jurong East Street 13, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 750 sq ft."
    },
    "after_fields": {
      "price": 4000,
      "beds": 3,
      "bathroom": 2,
      "size": 1050,
      "name": "Quiet Jurong East Flat - 107",
      "description": "A 1,050 sq ft HDB flat along 107 Jurong East Street 13, offering 3 bedrooms and two bathrooms. Located on floor 3, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 118,
    "identity_fields": {
      "type": "HDB",
      "location": "108 JURONG EAST STREET 13, Singapore 600108",
      "postal": 600108,
      "floor": 4,
      "unit_number": "04-41",
      "owneruserid": 32,
      "listingpicture": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3600,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Bright Jurong East Flat - 108",
      "description": "Three-bedroom HDB flat along 108 Jurong East Street 13, offering 1,025 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
    },
    "after_fields": {
      "price": 2850,
      "beds": 2,
      "bathroom": 1,
      "size": 650,
      "name": "Bright Jurong East Flat - 108",
      "description": "Two-bedroom HDB flat along 108 Jurong East Street 13. This floor-4 home offers 650 sq ft and one bathroom, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 119,
    "identity_fields": {
      "type": "HDB",
      "location": "109 JURONG EAST STREET 13, Singapore 600109",
      "postal": 600109,
      "floor": 2,
      "unit_number": "02-42",
      "owneruserid": 33,
      "listingpicture": "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3100,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Cosy Jurong East Flat - 109",
      "description": "Located at 109 Jurong East Street 13, this second-floor HDB flat has 2 bedrooms, two bathrooms and 800 sq ft of space. The layout separates dining from the main lounge."
    },
    "after_fields": {
      "price": 4400,
      "beds": 3,
      "bathroom": 2,
      "size": 1100,
      "name": "Cosy Jurong East Flat - 109",
      "description": "Located at 109 Jurong East Street 13, this HDB flat has 3 bedrooms, two bathrooms and 1,100 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 120,
    "identity_fields": {
      "type": "HDB",
      "location": "110 JURONG EAST STREET 13, Singapore 600110",
      "postal": 600110,
      "floor": 3,
      "unit_number": "03-43",
      "owneruserid": 33,
      "listingpicture": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3800,
      "beds": 3,
      "bathroom": 2,
      "size": 1075,
      "name": "Spacious Jurong East Flat - 110",
      "description": "Three-bedroom HDB flat at 110 Jurong East Street 13, with two bathrooms and 1,075 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
    },
    "after_fields": {
      "price": 3250,
      "beds": 2,
      "bathroom": 2,
      "size": 700,
      "name": "Comfortable Jurong East Flat - 110",
      "description": "Two-bedroom HDB flat at 110 Jurong East Street 13, with two bathrooms and 700 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 121,
    "identity_fields": {
      "type": "HDB",
      "location": "111 JURONG EAST STREET 13, Singapore 600111",
      "postal": 600111,
      "floor": 4,
      "unit_number": "04-44",
      "owneruserid": 34,
      "listingpicture": "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3300,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Welcoming Jurong East Flat - 111",
      "description": "Two-bedroom HDB flat along 111 Jurong East Street 13. This fourth-floor home offers 750 sq ft, two bathrooms and a practical layout with space for a work corner."
    },
    "after_fields": {
      "price": 4800,
      "beds": 3,
      "bathroom": 2,
      "size": 1150,
      "name": "Welcoming Jurong East Flat - 111",
      "description": "A 1,150 sq ft HDB flat along 111 Jurong East Street 13, offering 3 bedrooms and two bathrooms. Located on floor 4, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 122,
    "identity_fields": {
      "type": "HDB",
      "location": "112 JURONG EAST STREET 13, Singapore 600112",
      "postal": 600112,
      "floor": 2,
      "unit_number": "02-45",
      "owneruserid": 34,
      "listingpicture": "https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3500,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Quiet Jurong East Flat - 112",
      "description": "A 1,025 sq ft HDB flat at 112 Jurong East Street 13, featuring 3 bedrooms and two bathrooms. A generous shared living area makes room for everyday family life."
    },
    "after_fields": {
      "price": 5200,
      "beds": 4,
      "bathroom": 2,
      "size": 1400,
      "name": "Quiet Jurong East Flat - 112",
      "description": "Four-bedroom HDB flat along 112 Jurong East Street 13. This floor-2 home offers 1,400 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 123,
    "identity_fields": {
      "type": "HDB",
      "location": "113 JURONG EAST STREET 13, Singapore 600113",
      "postal": 600113,
      "floor": 3,
      "unit_number": "03-46",
      "owneruserid": 35,
      "listingpicture": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3000,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Bright Jurong East Flat - 113",
      "description": "Two-bedroom HDB flat at 113 Jurong East Street 13, set on the third floor. Includes two bathrooms, an enclosed kitchen and a family lounge within 800 sq ft."
    },
    "after_fields": {
      "price": 2950,
      "beds": 2,
      "bathroom": 2,
      "size": 740,
      "name": "Bright Jurong East Flat - 113",
      "description": "Located at 113 Jurong East Street 13, this HDB flat has 2 bedrooms, two bathrooms and 740 sq ft of space. A comfortable base for a household to make its own."
    }
  },
  {
    "listingid": 124,
    "identity_fields": {
      "type": "HDB",
      "location": "114 JURONG EAST STREET 13, Singapore 600114",
      "postal": 600114,
      "floor": 4,
      "unit_number": "04-47",
      "owneruserid": 35,
      "listingpicture": "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3700,
      "beds": 3,
      "bathroom": 2,
      "size": 1075,
      "name": "Cosy Jurong East Flat - 114",
      "description": "Three-bedroom HDB flat along 114 Jurong East Street 13, offering 1,075 sq ft and two bathrooms. Comfortable bedrooms and a dining nook make a welcoming home."
    },
    "after_fields": {
      "price": 4000,
      "beds": 3,
      "bathroom": 2,
      "size": 900,
      "name": "Cosy Jurong East Flat - 114",
      "description": "Three-bedroom HDB flat at 114 Jurong East Street 13, with two bathrooms and 900 sq ft of living space. A practical home with room for dining and everyday living."
    }
  },
  {
    "listingid": 125,
    "identity_fields": {
      "type": "HDB",
      "location": "115 JURONG EAST STREET 13, Singapore 600115",
      "postal": 600115,
      "floor": 2,
      "unit_number": "02-48",
      "owneruserid": 36,
      "listingpicture": "https://images.unsplash.com/photo-1499955085172-a104c9463ece?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3200,
      "beds": 2,
      "bathroom": 2,
      "size": 750,
      "name": "Spacious Jurong East Flat - 115",
      "description": "Located at 115 Jurong East Street 13, this second-floor HDB flat has 2 bedrooms, two bathrooms and 750 sq ft of space. The layout separates dining from the main lounge."
    },
    "after_fields": {
      "price": 2450,
      "beds": 1,
      "bathroom": 1,
      "size": 480,
      "name": "Comfortable Jurong East Flat - 115",
      "description": "A 480 sq ft HDB flat along 115 Jurong East Street 13, offering 1 bedrooms and one bathroom. Located on floor 2, with space to arrange a lounge and dining area."
    }
  },
  {
    "listingid": 126,
    "identity_fields": {
      "type": "HDB",
      "location": "116 JURONG EAST STREET 13, Singapore 600116",
      "postal": 600116,
      "floor": 3,
      "unit_number": "03-49",
      "owneruserid": 36,
      "listingpicture": "https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 3900,
      "beds": 3,
      "bathroom": 2,
      "size": 1025,
      "name": "Welcoming Jurong East Flat - 116",
      "description": "Three-bedroom HDB flat at 116 Jurong East Street 13, with two bathrooms and 1,025 sq ft of living space. Separate living and dining areas offer room to relax and entertain."
    },
    "after_fields": {
      "price": 4400,
      "beds": 3,
      "bathroom": 2,
      "size": 950,
      "name": "Welcoming Jurong East Flat - 116",
      "description": "Three-bedroom HDB flat along 116 Jurong East Street 13. This floor-3 home offers 950 sq ft and two bathrooms, with a layout suited to everyday living."
    }
  },
  {
    "listingid": 127,
    "identity_fields": {
      "type": "HDB",
      "location": "201 JURONG EAST STREET 21, Singapore 600201",
      "postal": 600201,
      "floor": 4,
      "unit_number": "04-50",
      "owneruserid": 37,
      "listingpicture": "https://images.unsplash.com/photo-1556020685-ae41abfc9365?auto=format&fm=jpg&w=1200&q=85"
    },
    "before_fields": {
      "price": 2900,
      "beds": 2,
      "bathroom": 2,
      "size": 800,
      "name": "Quiet Jurong East Flat - 201",
      "description": "Two-bedroom HDB flat along 201 Jurong East Street 21. This fourth-floor home offers 800 sq ft, two bathrooms and a practical layout with space for a work corner."
    },
    "after_fields": {
      "price": 5400,
      "beds": 4,
      "bathroom": 3,
      "size": 1540,
      "name": "Quiet Jurong East Flat - 201",
      "description": "Located at 201 Jurong East Street 21, this HDB flat has 4 bedrooms, three bathrooms and 1,540 sq ft of space. A comfortable base for a household to make its own."
    }
  }
]
$changes$::jsonb);

CREATE TEMP TABLE rentnest_variation_before ON COMMIT DROP AS
SELECT listingid, to_jsonb(l) AS original FROM public.listings l;

DO $revise$
DECLARE
    changed integer;
    allowed text[] := ARRAY['price','beds','bathroom','size','name','description'];
BEGIN
    IF (SELECT count(*) FROM pg_temp.rentnest_variation_changes) <> 68 THEN
        RAISE EXCEPTION 'Revision refused: expected 68 change records.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_temp.rentnest_variation_changes c
        LEFT JOIN public.listings l USING (listingid)
        WHERE l.listingid IS NULL
           OR NOT (to_jsonb(l) @> c.identity_fields)
           OR NOT (to_jsonb(l) @> c.before_fields OR to_jsonb(l) @> c.after_fields)
           OR l.tenantuserid IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Revision refused: exported listing identity, vacancy or values no longer match. Nothing changed.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.rentals r
        JOIN pg_temp.rentnest_variation_changes c ON c.listingid = r.listingid
    ) THEN
        RAISE EXCEPTION 'Revision refused: a target has rental history. Review it before changing its advertised layout or price.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_temp.rentnest_variation_changes c
        CROSS JOIN LATERAL jsonb_populate_record(NULL::public.listings, c.after_fields) p
        WHERE c.after_fields - allowed <> '{}'::jsonb
           OR NOT (c.after_fields ?& allowed)
           OR p.price IS NULL OR p.beds IS NULL OR p.bathroom IS NULL OR p.size IS NULL
           OR p.name IS NULL OR length(btrim(p.name)) NOT BETWEEN 1 AND 255
           OR p.description IS NULL OR length(btrim(p.description)) NOT BETWEEN 1 AND 255
           OR p.description LIKE 'FICTIONAL DEMO:%'
           OR c.identity_fields->>'type' NOT IN ('Condo','HDB')
           OR (c.identity_fields->>'type' = 'Condo'
               AND (p.price NOT BETWEEN 5000 AND 20000 OR p.beds NOT BETWEEN 1 AND 5
                    OR p.bathroom NOT BETWEEN 1 AND 5 OR p.size NOT BETWEEN 650 AND 3500))
           OR (c.identity_fields->>'type' = 'HDB'
               AND (p.price NOT BETWEEN 2000 AND 8000 OR p.beds NOT BETWEEN 1 AND 4
                    OR p.bathroom NOT BETWEEN 1 AND 3 OR p.size NOT BETWEEN 450 AND 1600))
    ) THEN
        RAISE EXCEPTION 'Revision refused: proposed values fall outside the approved scope or ranges.';
    END IF;

    UPDATE public.listings l
    SET price = p.price, beds = p.beds, bathroom = p.bathroom,
        size = p.size, name = p.name, description = p.description
    FROM pg_temp.rentnest_variation_changes c
    CROSS JOIN LATERAL jsonb_populate_record(NULL::public.listings, c.after_fields) p
    WHERE l.listingid = c.listingid
      AND NOT (to_jsonb(l) @> c.after_fields);
    GET DIAGNOSTICS changed = ROW_COUNT;

    IF EXISTS (
        SELECT 1 FROM pg_temp.rentnest_variation_before b
        FULL JOIN public.listings l USING (listingid)
        LEFT JOIN pg_temp.rentnest_variation_changes c USING (listingid)
        WHERE l.listingid IS NULL OR b.listingid IS NULL
           OR (c.listingid IS NULL AND to_jsonb(l) IS DISTINCT FROM b.original)
           OR (c.listingid IS NOT NULL AND (
               (to_jsonb(l) - allowed) IS DISTINCT FROM (b.original - allowed)
               OR NOT (to_jsonb(l) @> c.after_fields)))
    ) THEN
        RAISE EXCEPTION 'Verification failed: changes differ from the approved 68-row revision.';
    END IF;
    RAISE NOTICE 'Revised % listings; all 68 targets match the proposed data.', changed;
END;
$revise$;

SELECT l.listingid,l.type,l.name,l.price,l.beds,l.bathroom,l.size,l.description
FROM public.listings l
JOIN pg_temp.rentnest_variation_changes c USING (listingid)
ORDER BY l.listingid;

COMMIT;
