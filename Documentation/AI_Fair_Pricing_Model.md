# AI Fair-Pricing Model (AIFPM)

## What it does

AIFPM estimates a fair market rent for a property and shows three price bands
around it, in the style of a marketplace price guide:

| Band      | Tolerance around fair price |
|-----------|-----------------------------|
| Excellent | ±5%                         |
| Great     | ±10%                        |
| Good      | ±15%                        |

- **Owners** see the fair price and bands under the price field while creating
  or editing a listing, and can apply the fair price with one tap.
- **Tenants** see the same bands on the listing page, with the asking price
  marked, the band it falls in, and the signed premium versus the fair price.

## Data sources

| Property type | Source | Comparable set |
|---------------|--------|----------------|
| HDB           | HDB rental approvals, data.gov.sg (`d_c9f57187485a850908655db0e8cfe651`) | Same street, same flat type |
| Condo / Apt   | URA PMI_Resi_Rental (last 2 years)           | Same project, same bedroom count; falls back to 500 m radius |
| Landed        | URA PMI_Resi_Rental (last 2 years)           | Within 1 km |

The postal code is geocoded with OneMap. Road names are normalised to HDB's
abbreviations (STREET → ST, AVENUE → AVE, NORTH → NTH, ...) before querying the
HDB dataset. Bedrooms are mapped to HDB flat types: 1 → 2-ROOM, 2 → 3-ROOM,
3 → 4-ROOM (5-ROOM when floor area ≥ 1150 sqft), 4+ → EXECUTIVE.

## Methodology

1. **Adjust** each comparable to the subject property.
   - Size: rent × (subject sqft / typical comparable sqft)^0.5, clamped to ±25%.
     Applied to private property only, since the HDB dataset has no floor area.
   - Floor: ±0.4% per floor relative to floor 10, clamped to ±6%.
2. **Weight** each comparable by recency with a 12-month half-life, so a
   contract from two years ago counts a quarter as much as one from this month.
3. **Trim** outliers outside 1.5 × IQR of the adjusted rents.
4. **Fair price** = weighted median of what remains, rounded to $10.
5. **Bands** = fair price ± 5 / 10 / 15%.
6. **Verdict** = narrowest band containing the asking price, or "outside
   typical range", plus the signed percentage difference.

A minimum of 3 comparables is required. Confidence is reported as low (< 8),
medium (8–14) or high (15+) comparables. Comparable sets are cached for 10
minutes per postal code and flat type so the live form cannot exceed OneMap's
rate limit.

## Demo data

Listings whose postal code has fewer than 3 real comparables (or whose market
data call fails) are priced from 24 simulated transactions instead
(`DemoTransactionGenerator`). Simulated rents start from typical Singapore rents
for the property type and bedroom count, with a rough location premium by postal
sector and deterministic noise, so a listing always gets the same numbers. These
estimates have `dataSource: "DEMO"` and the card says "Simulated demo
transactions (not real market data)". Real data is always used when there is
enough of it. Demo data is on by default; set `pricing.demo-data.enabled=false`
to use real data only. Nothing is written to the database.

## Room rentals (AI room-type detection)

HDB and URA only publish whole-unit rentals, and listings have no room/unit
field. For an existing listing, `RoomTypeClassifier` sends the title and
description to Gemini (JSON output with a fixed schema) and gets back:

- `unitType`: `WHOLE_UNIT`, `MASTER_ROOM` or `COMMON_ROOM`;
- `wholeUnitBedrooms`: bedrooms in the flat the room is in, if the listing says.

Rooms are priced from the real whole-unit comparables scaled by a room share
that depends on property type and the whole unit's bedrooms (master / common):

| Whole unit | Master | Common |
|---|---|---|
| HDB 3-ROOM or smaller | 49% | 32% |
| HDB 4-ROOM | 41% | 26% |
| HDB 5-ROOM / Executive | 40% | 26% |
| Condo, 2 bedrooms or fewer | 52% | 31% |
| Condo, 3 bedrooms | 41% | 25% |
| Condo, 4+ bedrooms | 26% | 16% |
| Landed | 22% | 15% |

Derivation (June 2026): national median room rents from the Hozuko room-rent
snapshot (Jun 2026, 1,979 listings: HDB master $1,400 / common $900, condo
$2,170 / $1,300, landed $1,800 / $1,200) divided by official whole-unit medians
for the same period: HDB rental approvals on data.gov.sg, Apr-Jun 2026 (3-ROOM
$2,850, 4-ROOM $3,400, 5-ROOM $3,500; 8,670 approvals) and URA private rental
contracts, 2026 Q2 (2-bed $4,200, 3-bed $5,300, 4-bed $8,200, landed $8,000).
Room medians are asking rents, whole-unit medians are approved/contracted rents,
so the shares may slightly overstate what rooms actually let for. When the flat
size isn't stated, a 3-bedroom unit (HDB 4-ROOM) is assumed, and the listing's
own floor area is ignored because it is the room's. Without a Gemini key, or if the call fails, keyword matching
("master", "common room", "room for rent", "4-room flat" ...) is used instead.
The response carries `unitType`, `unitTypeSource` ("AI" / "keywords") and
`rentShare`, and the card shows "Priced as a master room (detected by AI...)".

The owner Create/Edit form still prices the whole unit; room detection runs on
saved listings only.

## AI explanation layer (Gemini)

The statistical model cannot read free text. After the bands load on a listing
page, the app calls a second endpoint that sends Google Gemini
(`gemini-3.8-flash` by default) the model's output, the listing's attributes
and the owner's description. Gemini writes 2–4 sentences on how the asking rent
compares with the fair rent, whether features in the description (renovation,
furnishing, view) could justify a premium, and one thing the tenant should
check. The description is passed as untrusted data, and the model is told not
to invent facts.

- Configure with `GEMINI_API_KEY` (in `application.properties` or the
  environment); get a key from Google AI Studio. `GEMINI_MODEL` overrides the
  model. Without a key the card shows "AI explanations are not configured" and
  everything else works as before.
- Calls the REST `generateContent` endpoint via `RestTemplate`; no SDK needed.
- Explanations are cached for 6 hours per listing, price and description.

```
GET /api/pricing/listing/{listingId}/explanation
{ "available": true, "explanation": "...", "model": "gemini-3.8-flash" }
```

## What the model does not see

The model prices a *typical* unit of this type, in this estate, at this floor
and size. It cannot see renovation, furnishing, view or lease term. That is
deliberate: the bands tell a tenant the size of the premium, and the tenant
judges whether the unit's condition is worth it. Recommended next inputs, in
order of value:

1. Furnishing level (unfurnished / partial / full).
2. Renovated in the last N years.
3. Measured room shares (from room-rental data, if a source becomes available).

## API

```
GET /api/pricing/listing/{listingId}
GET /api/pricing/estimate?type=HDB&postal=520201&beds=2&size=700&floor=8&price=2800
```

Both require a bearer token. Response shape:

```json
{
  "available": true,
  "fairPrice": 2880,
  "tiers": [
    {"name": "EXCELLENT", "tolerancePercent": 5,  "low": 2740, "high": 3020},
    {"name": "GREAT",     "tolerancePercent": 10, "low": 2590, "high": 3170},
    {"name": "GOOD",      "tolerancePercent": 15, "low": 2450, "high": 3310}
  ],
  "askingPrice": 2800,
  "percentDiffFromFair": -2.8,
  "tier": "EXCELLENT",
  "confidence": "HIGH",
  "comparableCount": 702,
  "dataSource": "HDB",
  "basis": "3-ROOM HDB flats along TAMPINES ST 21",
  "periodStart": "2021-01",
  "periodEnd": "2026-08",
  "floorAdjustment": "-0.8% for floor 8",
  "sizeAdjustment": "No size adjustment applied.",
  "message": "Excellent price: within 5% of the fair market rent (3% below)."
}
```

## Verifying against live data

```
export JAVA_HOME=<path to a JDK 21>
cd RentNest
mvn test -Dtest=FairPricingLiveCheck -Dpricing.live=true
```

This reads from the public datasets and the shared database; it writes nothing.
The unit tests (`FairPricingServiceTest`, `FairPricingControllerTest`) need no
network. Note the test suite requires JDK 21: the project's Mockito cannot
instrument Java 26.
