# Analytics API — Tier 1

Status: implemented on branch `feature/analytics-tier1`. Tier 1 uses data the app already stored; lifecycle timestamps (Tier 2) were added on 17 Sep 2026. There is still no event tracking.

## Endpoints

| Method | Path | Who can call it |
|---|---|---|
| GET | `/api/analytics/owner/summary?from=&to=` | Any logged-in user. Returns analytics for the caller's own listings. |
| GET | `/api/analytics/owner/listings/{listingId}?from=&to=` | The listing's owner. |
| GET | `/api/analytics/admin/summary?from=&to=` | Users whose `role` is `ADMIN`. |

Send the JWT as `Authorization: Bearer <token>`, the same as other endpoints.

### Rules

- **Identity comes from the token.** The backend never reads an `ownerId` or `userId` sent by the client.
- **`from` and `to` are required.** Both must be ISO-8601 date-times with an offset, e.g. `2026-01-01T00:00:00+08:00` or `2025-12-31T16:00:00Z`.
  - The period is applied as `[from, to)`: `from` is included, `to` is excluded.
  - It is returned normalised to UTC.
  - The period must be at most 366 days, and `from` must be before `to`.
- **Snapshot metrics ignore the period.** They describe the current state at `asOf`. Only metrics with `basis: "period"` are filtered by `from`/`to`.
- **Monthly buckets** use `analytics.time-zone` (default `Asia/Singapore`).

### Status codes

| Code | When | Body |
|---|---|---|
| 200 | Success | Response below |
| 400 | Missing, malformed, reversed or too-long period | `{"error":"INVALID_PERIOD","message":"..."}` |
| 401 | No valid login | empty |
| 403 | Non-admin calling `/admin/summary` | `{"error":"FORBIDDEN","message":"..."}` |
| 404 | Listing does not exist **or** belongs to someone else (identical response) | `{"error":"NOT_FOUND","message":"Listing not found."}` |

The 401 only applies to `/api/analytics/**`. Other routes keep their existing 403 for unauthenticated requests.

## Response shape

```json
{
  "schemaVersion": 1,
  "scope": "owner | listing | platform",
  "asOf": "2026-09-15T13:25:34.346Z",
  "period": { "from": "2025-12-31T16:00:00Z", "to": "2026-03-31T16:00:00Z", "boundary": "[from,to)", "timeZone": "Asia/Singapore" },
  "listing": { "listingId": 2, "name": "A2", "type": "HDB", "location": "...", "price": 2000, "listingPicture": "..." },
  "metrics": {
    "listingCount": { "availability": "available", "value": 3, "unit": "count", "basis": "snapshot", "definition": "...", "reason": null },
    "listingViews": { "availability": "unavailable", "value": null, "unit": "count", "basis": "period", "definition": "...", "reason": "Not tracked yet: ..." }
  },
  "series": {
    "monthlyRecordedRentPayments": {
      "availability": "available", "unit": "SGD", "basis": "period", "definition": "...", "reason": null,
      "points": [ { "bucket": "2026-01", "value": 1500 }, { "bucket": "2026-02", "value": 0 } ]
    }
  }
}
```

`listing` is only present on the per-listing endpoint.

**How the UI should read a metric:**
- `available` with value `0` is a real, measured zero.
- `unavailable` means the value could not be calculated. `value` is `null` and `reason` explains why. Show "not available", never 0.
- Rates (e.g. `occupancyRate`) are `unavailable` when there is nothing to divide by, such as an owner with no listings.

## Metric dictionary

S = snapshot, P = period, P† = period metric built on lifecycle timestamps (see limitation 8).

### Owner summary (`scope: owner`)

| Key | Unit | Basis | Definition |
|---|---|---|---|
| `listingCount` | count | S | Listings the caller currently owns. |
| `activeTenancyCount` | count | S | Owned listings with a rental in status `active`. |
| `occupancyRate` | percent | S | `activeTenancyCount / listingCount`, to 1 decimal place. |
| `rentalRecordCount` | count | S | Rental records (offers) in any status. |
| `pendingRentalRecordCount` | count | S | Status `pending`. |
| `acceptedRentalRecordCount` | count | S | Status `active` or `terminated`. |
| `terminatedRentalRecordCount` | count | S | Status `terminated`. |
| `acceptanceRate` | percent | S | `accepted / all rental records`. Pending offers count as not accepted. |
| `tenantsHostedCount` | count | S | Distinct tenants on accepted rentals. |
| `averageTenancyMonths` | months | S | Average of `rentalDate → leaseExpiry` over accepted rentals. See the notes below. |
| `ownerReviewCount` | count | S | Reviews about the caller. |
| `ownerAverageRating` | rating_out_of_5 | S | Average rating of those reviews, to 2 decimal places. |
| `recordedRentPaymentCount` | count | P | Payment rows with a billing-month date in the period. |
| `recordedRentPaymentTotal` | SGD | P | Sum of those payment amounts. |
| `recordedRentPaymentTotalChange` / `recordedRentPaymentCountChange` | percent | P | Change vs the previous period of the same length, by billing month. Unavailable when the previous period had nothing. Works on existing data, no tracking needed. |
| `averageOccupancyRate` | percent | P | Share of the period the listings were occupied: time covered by accepted rentals ÷ (listings × period length). Overlapping rentals on one listing are merged. Uses the listings that exist now. |
| `averageOccupancyRateChange` | percentage_points | P | Change in `averageOccupancyRate` vs the previous period, in **percentage points** (not %). Unavailable when the previous period had no occupancy. |
| `tenantsInPeriodCount` / `tenantsInPeriodChange` | count / percent | P | Distinct tenants whose accepted tenancy overlapped the period, and the change vs the previous period. |
| `newListingCount` | count | P† | Listings the caller published in the period. |
| `offersSentCount` / `offersAcceptedCount` / `terminationsCount` | count | P† | Offers sent, offers accepted and tenancies terminated in the period. |
| `offersSentChange` | percent | P† | Offers sent vs the previous period of the same length. Unavailable unless both periods are fully tracked and the previous one had at least one offer. |
| `averageDaysOnMarket` | days | P† | For offers accepted in the period: average days from publishing the listing to accepting. Listings published before tracking are excluded. |

| Series | Basis | Points |
|---|---|---|
| `monthlyRecordedRentPayments` | P | One point per month in the period, `yyyy-MM`. Months with no payments are 0. |
| `tenancyDurationDistribution` | S | `<3`, `3-6`, `6-12`, `12-24`, `>=24` months. Lower bounds are inclusive. |
| `monthlyOccupancyRate` | P | Occupancy percentage per calendar month, same definition as `averageOccupancyRate`. Unavailable with no listings. |

Status matching ignores case and surrounding whitespace.

### Per listing (`scope: listing`)

Includes every rental, tenancy and payment metric above, scoped to one listing, plus:

| Key | Unit | Basis | Definition |
|---|---|---|---|
| `occupancyStatus` | status | S | `occupied` if the listing has an `active` rental, else `vacant`. |
| `listingViews` | count | P | **Unavailable.** Not tracked yet. |
| `daysOnMarket` | days | S | Days from publishing to the first accepted offer, or until now if not yet rented. Unavailable for listings published before tracking started. |
| `offersSentCount` / `offersAcceptedCount` / `terminationsCount` | count | P† | As in the owner summary, for this listing. |
| `averageOccupancyRate` / `averageOccupancyRateChange`, payment changes | | P | As in the owner summary, for this one listing. |

| Series | Basis | Points |
|---|---|---|
| `monthlyRecordedRentPayments` | P | As above. |
| `monthlyOccupancy` | P | `occupied` / `vacant` per month. A month is occupied if an accepted rental's start-to-expiry range overlaps it. |

### Platform (`scope: platform`, admin only)

| Key | Unit | Basis | Definition |
|---|---|---|---|
| `registeredUserCount` | count | S | All users. |
| `listingCount` | count | S | All listings. |
| `ownerUserCount` | count | S | Users owning at least 1 listing. |
| `tenantUserCount` | count | S | Users who are the tenant on at least 1 accepted rental. Overlaps with owners, so segments don't add up to the total. |
| `bannedUserCount` / `userBanRate` | count / percent | S | Users with `flagged = 2`, and that count divided by all users. |
| `flaggedUserCount` | count | S | Users with `flagged = 1`. |
| `flaggedListingCount` / `flaggedReviewCount` | count | S | Items currently flagged. This is **not** the number of reports submitted. |
| rental metrics | | S | Same as the owner summary, platform-wide. |
| `terminationRate` | percent | S | `terminated / accepted`. |
| `recordedRentPaymentCount` / `Total` | count / SGD | P | Platform-wide. |
| `newUserCount` / `newListingCount` | count | P† | Accounts created and listings published in the period. |
| `newUserCountChange` / `newListingCountChange` | percent | P† | Change vs the previous period of the same length (same rules as `offersSentChange`). |
| `offersSentCount` / `offersAcceptedCount` / `terminationsCount`, `averageDaysOnMarket` | | P† | As in the owner summary, platform-wide. |
| `reportResolutionRate` | | | **Unavailable.** No report records or resolution timestamps. |

| Series | Basis | Points |
|---|---|---|
| `monthlyRecordedRentPayments` | P | As above. |
| `flaggedItemsByType` | S | `listings`, `users`, `reviews`. |
| `userDistribution` | S | `Owners only`, `Tenants only`, `Both`, `Neither`. Every user is in exactly one group, so the groups add up to `registeredUserCount`. |

The platform summary also returns `recordedRentPaymentTotalChange` and `recordedRentPaymentCountChange`, as in the owner summary.

## Known limitations (read before labelling the UI)

1. **Payment dates are billing months, not transaction times.** `Payment.date` is the month the payment is for, as sent by the app. Label the chart "rent recorded by billing month", not "income received".
2. **Payment amounts are whole numbers with no currency field.** Currency is SGD (`analytics.currency`), confirmed by the team on 16 September 2026. Payments have no failed or refunded state. Deposits aren't in the payment table, and termination refunds (`Requests.refundAmount`) aren't subtracted. Don't call the total "revenue" or "profit".
3. **Terminated tenancy lengths depend on a frontend convention.** The chat screen overwrites `leaseExpiry` with the termination date when a termination is accepted. If that flow changes, `averageTenancyMonths` and `monthlyOccupancy` change meaning.
4. **`listing.tenant` is not used.** It isn't cleared on termination, so occupancy comes from rental status instead.
5. **Each listing probably has at most one rental.** `Rentals` → `Listings` is `@OneToOne`, so per-listing offer counts are usually 0 or 1.
6. **Reviews are about users, not listings.** There is no per-listing rating.
7. **Admin access uses the `role` column on `users`.** Accounts are `USER` by default; `ADMIN` is granted with SQL (see `docs/db/changes/`). The moderation endpoints (`/api/*/admin/**`, banning, dismissing flags) are admin-only too, while raising a flag stays open to any signed-in user so reporting still works.
8. **Lifecycle metrics (marked P†) only count from when tracking started: 17 Sep 2026, 02:26 SGT.** The `created_at`, `accepted_at` and `terminated_at` columns were added then (`docs/db/changes/2026-09-17_add_lifecycle_timestamps.sql`), and older rows were not backfilled. For a period that starts before then, these metrics carry `coverage: {start, end, complete: false}` and the app shows "Tracked since ...". For a period that ends before then, they are unavailable, not zero. The start time is set by `analytics.lifecycle-tracking-start`.
9. **The server sets these timestamps, never the client.** Creation times are recorded on insert. Acceptance is recorded the first time a rental becomes `active`, and termination the first time it becomes `terminated`; later saves never overwrite them. The API ignores these fields in requests.
10. **Timestamps use the same column type as the existing dates** (`timestamp without time zone`, written in the backend's local time zone). All backends should run in Asia/Singapore time, as the existing rental and payment dates already assume.

## Frontend screens

| Screen | How to reach it |
|---|---|
| `app/OwnerAnalyticsScreen.jsx` | Profile tab, then **Analytics** |
| `app/ListingAnalyticsScreen.jsx` | Owner analytics, then a property under **By property** |
| `app/AdminAnalyticsScreen.jsx` | Admin Management, then **Platform Analytics** |

All three use `components/analytics/AnalyticsKit.jsx`, which provides:
- the `useAnalytics` data hook
- stat tiles (tap one to show its definition)
- meters, bar charts and the occupancy strip, each with tap-to-read values and a table view
- the 3M/6M/12M period selector

Run the frontend tests with `npx jest components/analytics --watchAll=false`.

## Frontend integration example

This is the pattern `useAnalytics` implements, shown standalone. It follows the app's existing axios and AsyncStorage pattern.

```jsx
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

// Last 12 months, sent with the device's offset
const toOffsetIso = (d) => {
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00:00` +
         `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
};

export async function fetchOwnerSummary() {
  const token = await AsyncStorage.getItem('token');
  const to = new Date(); to.setDate(to.getDate() + 1);           // include today
  const from = new Date(to); from.setFullYear(from.getFullYear() - 1);
  const response = await axios.get(`${API_BASE_URL}${ENDPOINTS.ANALYTICS_OWNER_SUMMARY}`, {
    params: { from: toOffsetIso(from), to: toOffsetIso(to) },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// Render helper: never turn "unavailable" into 0
export const formatMetric = (metric) => {
  if (!metric) return '—';
  if (metric.availability !== 'available') return 'Not available';
  if (metric.unit === 'percent') return `${metric.value}%`;
  if (metric.unit === 'SGD') return `S$${Number(metric.value).toLocaleString()}`;
  return String(metric.value);
};
```

The period from tomorrow minus one year to tomorrow is 365 days, or 366 across a leap day. Both are within the 366-day limit.

## Tests

Tests live in `RentNest/src/test/java/RentNest/RentNest/AnalyticsControllerIntegrationTest.java`. They run through the real JWT filter chain and JPA queries against a disposable in-memory H2 database, using synthetic fixtures only, and never connect to Supabase. They cover:

- 401, 403 and identical 404s for foreign and missing listings
- Ignoring client-supplied `ownerId`/`userId`
- Owner isolation
- Every aggregate checked against hand-calculated fixture values
- Available zeros vs unavailable rates
- `[from,to)` boundaries and equivalent offsets
- Invalid periods
- Singapore-time month bucketing
- Unchanged 403 behaviour on non-analytics routes

```bash
cd RentNest
mvn test -Dtest=AnalyticsControllerIntegrationTest
```

On JDK 22 or newer, Mockito and Byte Buddy need `"-DargLine=-Dnet.bytebuddy.experimental=true"`. The project targets Java 21.
