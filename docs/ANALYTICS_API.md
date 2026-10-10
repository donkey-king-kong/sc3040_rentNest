# Analytics API

The analytics endpoints return metrics used by the owner, property and admin dashboards.

## Access and periods

Send the JWT in `Authorization: Bearer <token>`.

| GET endpoint | Access |
|---|---|
| `/api/analytics/owner/summary` | Signed-in user's own properties |
| `/api/analytics/owner/listings/{listingId}` | Property owner only |
| `/api/analytics/admin/summary` | User with the `ADMIN` role |

Pass either `from` and `to` as ISO-8601 date-times with offsets, or `period=lifetime`. These options cannot be combined. Ranges include `from` and exclude `to`; `from` must precede `to`. There is no maximum range length. Monthly buckets use `analytics.time-zone`, defaulting to `Asia/Singapore`.

The dashboards request a fixed past-year range. The API also supports lifetime: property lifetime starts at its stored publication date when available, while owner and platform lifetime use the earliest stored date in their authorized scope.

Responses contain `schemaVersion`, `scope`, `asOf`, `period`, `metrics` and `series`. The property response also contains `listing`, including `listedAt` and `firstAcceptedAt`. Metrics include `availability`, `value`, `unit`, `basis`, `definition` and an optional `reason`. An unavailable value is `null`, not zero. Series include metadata and a `points` array of `{bucket, value}`.

Snapshot metrics describe stored records or the state at `asOf` and ignore the requested range. Period metrics and monthly series use that range. Stored historical dates are used without a global deployment cutoff.

## Retained metrics

| Scope | Snapshot keys | Period keys |
|---|---|---|
| Owner | `listingCount`, `totalListingViews`, `activeTenancyCount`, `tenantsHostedCount`, `averageTenancyMonths`, `ownerReviewCount`, `ownerAverageRating` | `recordedRentPaymentTotal`, `terminationsCount` |
| Property | `occupancyStatus`, `rentalRecordCount`, `acceptedRentalRecordCount`, `acceptanceRate`, `tenantsHostedCount`, `averageTenancyMonths`, `daysOnMarket` | `recordedRentPaymentCount`, `recordedRentPaymentTotal`, `averageOccupancyRate`, `listingViews`, `uniqueListingViewers` |
| Platform | `registeredUserCount`, `listingCount`, `lifetimeRecordedRentPaymentTotal`, `ownerUserCount`, `currentTenantUserCount`, `expiredTenantUserCount`, `terminatedTenantUserCount`, `bannedUserCount`, `rentalRecordCount`, `pendingRentalRecordCount`, `activeRentalRecordCount`, `upcomingRentalRecordCount`, `expiredRentalRecordCount`, `terminatedRentalRecordCount`, `unclassifiedRentalRecordCount` | None |

## Retained series

| Scope | Series keys |
|---|---|
| Owner | `monthlyRecordedRentPayments`, `monthlyOccupancyRate`, `monthlyOffersAccepted`, `monthlyTerminations`, `monthlyAverageDaysOnMarket`, `tenancyDurationDistribution` |
| Property | `monthlyRecordedRentPayments`, `monthlyOccupancy` |
| Platform | `monthlyRecordedRentPayments`, `monthlyOffersAccepted`, `monthlyTerminations`, `monthlyAverageDaysOnMarket` |

`tenancyDurationDistribution` describes accepted rentals across their stored history. Other series use the requested period. Monthly event counts include zero months; days-on-market buckets without qualifying acceptances have null values.

## Definitions

- Rent totals sum recorded rent amounts by billing month, not transaction time. Deposits are excluded and refunds are not deducted. The platform total includes all recorded rent regardless of the requested period.
- Owner total views count recorded visits to currently owned properties, including repeats and excluding self-visits. Property views and unique viewers use the requested period.
- Reviews and ratings are about the owner, not individual properties. No reviews produces an unavailable average rating.
- Property accepted offers count records marked `active` or `terminated`. Monthly acceptance counts use `acceptedAt`; undated acceptances cannot appear in a monthly bucket.
- Current tenants are distinct users with an active tenancy covering `asOf`. Users with a current tenancy are excluded from expired and terminated tenant groups. Past tenants are classified by their most recently ended tenancy, with termination winning ties.
- Platform rental categories separate pending, current active, upcoming, naturally expired and explicitly terminated records. Unknown statuses and invalid or missing dates fall into the unclassified category. Calculations do not change stored statuses.
- Average occupancy uses occupied time divided by available listing time within the range, merging overlapping tenancies for each property. Monthly owner occupancy applies this to each month. Property monthly occupancy indicates whether any accepted tenancy overlaps the month.
- Tenancy lengths use valid accepted rental start and end dates. A recorded termination date takes precedence over lease expiry.
- Days on market measures publication to first acceptance. It is unavailable until an offer is accepted. Historical accepted records missing acceptance dates make the first acceptance indeterminate. Monthly averages include only valid first acceptances in that month.

## Errors and related permissions

Invalid or mixed ranges return 400, unauthenticated analytics requests return 401, non-admin platform requests return 403, and missing or foreign-owned properties return the same 404. Analytics errors contain `error` and `message`.

Review editing remains author-only, and property editing remains owner-only, including for admins. Editing cannot reassign `reviewerID` or `ownerUserID`. Admin deletion and report dismissal remain supported.

## Verification

Backend integration tests use disposable H2 fixtures and verify authorization, owner isolation, response fields, monthly calculations, view tracking, lifetime and date boundaries. Service tests cover occupancy, tenant classification and days on market. Frontend analytics tests verify rendering and navigation.
