# Analytics API — Tier 1

Status: implemented on `feature/dashboard-usability-fixes`. Analytics uses stored account, publication, rental, payment and listing-view dates. On 5 October 2026, the school project's synthetic dataset was designated as the demo history; the former September deployment-date cutoffs were removed.

## Endpoints

Related content permissions: review editing is limited to the original author, and listing editing to its current owner, including when that user is an admin. Editing cannot change `reviewerID` or `ownerUserID`; omitted or unchanged IDs are accepted. Admins retain permission to delete content and dismiss reports.

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
- **Demo history uses stored dates without a global tracking cutoff.** An empty event period returns zero; a missing date cannot place an event in a period. Undefined percentage changes and missing or invalid days-on-market dates remain unavailable. The former `analytics.lifecycle-tracking-start` and `analytics.view-tracking-start` settings are no longer used, and responses do not emit cutoff-based `coverage` metadata.

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
    "photoGalleryViews": { "availability": "unavailable", "value": null, "unit": "count", "basis": "period", "definition": "...", "reason": "A listing stores a single photograph, ..." }
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

S = snapshot, P = period, P† = period metric built on lifecycle timestamps (see limitation 8),
P‡ = period metric built on recorded listing views (see limitation 11).

### Owner summary (`scope: owner`)

| Key | Unit | Basis | Definition |
|---|---|---|---|
| `listingCount` | count | S | Listings the caller currently owns. |
| `activeTenancyCount` | count | S | Owned listings with status `active` whose tenancy covers `asOf`: start inclusive, end exclusive. Expired/future tenancies and missing date bounds do not count. |
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
| `averageOccupancyRateChange` | percentage_points | P | Change in `averageOccupancyRate` vs the previous period, in **percentage points** (not %). A zero baseline is valid: 0% → 50% is +50 percentage points. Unavailable only when there are no listings. |
| `tenantsInPeriodCount` / `tenantsInPeriodChange` | count / percent | P | Distinct tenants whose accepted tenancy overlapped the period, and the change vs the previous period. |
| `newListingCount` | count | P† | Listings the caller published in the period. |
| `offersSentCount` / `offersAcceptedCount` / `terminationsCount` | count | P† | Offers sent, offers accepted and tenancies terminated in the period. |
| `offersSentChange` | percent | P† | Offers sent vs the previous period of the same length, using recorded offer dates. Unavailable when the previous period had no offers because relative growth from zero is undefined. |
| `averageDaysOnMarket` | days | P† | Average elapsed days from publication to the first accepted offer per listing, where that first acceptance is in the selected period. Missing, reversed, future or indeterminate acceptance dates are excluded. |

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
| `occupancyStatus` | status | S | `occupied` if an `active` rental covers `asOf` (start inclusive, end exclusive), else `vacant`. Uses the recorded termination time when present, otherwise lease expiry. |
| `listingViews` | count | P‡ | Times the listing detail page was opened in the period, counting repeat visits separately. An owner opening their own listing is not recorded. |
| `uniqueListingViewers` | count | P‡ | Distinct signed-in people who opened the listing in the period; repeat visits by one person count once. |
| `photoGalleryViews` | count | P | **Unavailable.** A listing stores a single photograph, so there is no gallery to browse. |
| `daysOnMarket` | days | S | Elapsed days from publication to the first accepted offer, independent of the selected period. Never falls back to today or the lease start. Pending, missing-date, reversed-date and future-date cases are unavailable with an explanation; an actual same-time acceptance is a measured zero. |
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
7. **Admin access uses the `role` column on `users`.** Accounts are `USER` by default; `ADMIN` is granted with SQL (see `docs/db/changes/`). The moderation endpoints (`/api/*/admin/**`, banning, dismissing flags) are admin-only too, while raising a flag stays open to any signed-in user so reporting still works. Legacy account provisioning (`POST /api/users/add`) is admin-only; JSON cannot assign account IDs or roles, and new accounts default to `USER`. Public registration continues through `/auth/signup`; privileged role assignment remains an explicit database-administration operation.
8. **Lifecycle metrics (marked P†) use each record's event dates.** Creation, acceptance and termination counts are filtered by `created_at`, `accepted_at` and `terminated_at`. Publication dates must precede accepted offers for days on market to be valid. The synthetic demo history has no deployment-date cutoff: periods before September are calculated normally, with zero when no dated events fall in the period. Undated events are excluded from period counts; they are not assigned invented dates by the analytics service. Missing, reversed, future or indeterminate publication/acceptance dates still make days on market unavailable. Any assigned historical demo dates are synthetic, not recovered timestamps.
9. **The server sets these timestamps, never the client.** Creation times are recorded on insert. Acceptance is recorded the first time a rental becomes `active`, and termination the first time it becomes `terminated`; later saves never overwrite them. The API ignores these fields in requests.
10. **Timestamps use the same column type as the existing dates** (`timestamp without time zone`, written in the backend's local time zone). All backends should run in Asia/Singapore time, as the existing rental and payment dates already assume.
11. **Listing views (marked P‡) use the stored `viewed_at` timestamps.** Views are recorded in `public.listing_view` (`docs/db/changes/2026-09-29_add_listing_view_table.sql`), one row per view. Empty periods return zero, including periods before the former September cutoff. This treats the retained synthetic dataset as the demo history; it does not recover real visits that were never recorded.
    - The view is recorded by the server from the token and its own clock: `POST /api/listings/{listingId}/views` reads neither a viewer nor a time from the request. It returns 204 whether or not a row was stored, and the app calls it fire-and-forget so a failure never breaks the listing page.
    - **An owner opening their own listing is not recorded**, so owners cannot inflate their own counts. This means `listingViews` is visits by other people, not total traffic.
    - `uniqueListingViewers` counts distinct signed-in viewers. Listings require a login to open, so in practice every view has an identity; the `userid` column is nullable only so an anonymous view could be counted later.
    - Repeat visits count separately in `listingViews` and once in `uniqueListingViewers`. Nothing deduplicates rapid refreshes, so treat `listingViews` as "opens", not "people".
    - `photoGalleryViews` stays unavailable: a listing stores one photograph (`listings.listingpicture`), so there is no gallery. The `listing_view.kind` column reserves `'photo'` so this needs no further migration once multi-image listings exist.

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

### Publication-to-acceptance dates

The listing envelope exposes `listedAt` and `firstAcceptedAt` (ISO instants, nullable). The UI shows both dates beside **Days on market**. Listing creation publishes immediately in the current app, so the server-owned `listings.created_at` is the publication timestamp. Acceptance uses the server-owned `rentals.accepted_at`, not `rental_date` (lease start). New publications and acceptances already record these through the existing lifecycle flow; this fix needs no schema change.

An accepted historical rental with an unknown acceptance date makes the first acceptance indeterminate, even if a later dated acceptance exists. Such a listing is excluded from the owner/platform average, as are records missing publication dates. Do not backfill from lease dates or the date of a migration; historical dates require a verified source.

### Dashboard navigation

- Owner: **Overview**, **Rent**, **Occupancy**, **Offers**, **Properties**.
- Admin: **Overview**, **Rentals**, **Users**, **Safety**.
- Property: **Overview**, **Offers**, **Payments**, **Occupancy**.

Only the selected section scrolls. The tabs and period selector remain visible, switching tabs resets the section to its top, and the chosen period is retained. Wider screens use a bounded content width and up to four metric tiles per row; narrower screens wrap the tabs and use two tiles per row. Listing views and unique viewers remain in the property's Overview.
