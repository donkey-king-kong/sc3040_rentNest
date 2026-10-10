# Analytics API

The analytics endpoints return metrics used by the owner, property and admin dashboards.

## Access and periods

Send the JWT in `Authorization: Bearer <token>`.

| GET endpoint | Access |
|---|---|
| `/api/analytics/owner/summary` | Signed-in user's own properties |
| `/api/analytics/owner/listings/{listingId}` | Property owner only |
| `/api/analytics/admin/summary` | User with the `ADMIN` role |

Pass `from` and `to` as ISO-8601 date-times with offsets. Ranges include `from` and exclude `to`; `from` must precede `to`. There is no maximum range length. Monthly buckets use `analytics.time-zone`, defaulting to `Asia/Singapore`.

The dashboards request a fixed past-year range.

Responses use DTO classes with private fields, getters and setters. Each response includes `asOf` and `currency`. Unavailable averages are `null` with a separate explanation field. Measured zero counts remain zero. Numeric chart points contain `label` and `value`; property occupancy points contain `label` and `status`.

All analytics DTOs live in `RentNest.dto`. The service uses `AnalyticsPeriod` for validated start and end dates and `AnalyticsValueDTO` for a numeric result with an unavailable explanation. Chart builders return lists of `AnalyticsChartPointDTO` or `AnalyticsStatusPointDTO` directly.

`AnalyticsQueryRepository` calculates property accepted-offer counts, platform pending and terminated counts, and property rent totals using database aggregates. Rental and payment rows are still fetched for chart and tenancy calculations.

Snapshot metrics describe stored records or the state at `asOf` and ignore the requested range. Period metrics and monthly series use that range. Stored historical dates are used without a global deployment cutoff.

## Retained metrics

| Scope | Snapshot keys | Period keys |
|---|---|---|
| Owner | `totalListings`, `occupiedListings`, `totalViews`, `totalRentCollected`, `tenantsHosted`, `averageTenancyMonths`, `reviewCount`, `averageRating` | `terminations` |
| Property | `occupancyStatus`, `totalRentalOffers`, `acceptedOffers`, `acceptanceRate`, `tenantsHosted`, `averageTenancyMonths`, `daysOnMarket` | `rentCollected`, `paymentCount`, `occupancyRate`, `totalViews`, `uniqueViewers` |

`OwnerAnalyticsDTO` supplies `averageRatingUnavailableReason`, `averageTenancyUnavailableReason` and `monthlyOccupancyUnavailableReason`. `PropertyAnalyticsDTO` supplies `acceptanceRateUnavailableReason`, `averageTenancyUnavailableReason` and `daysOnMarketUnavailableReason`. These explanations are null when the corresponding value is available. Property details are direct fields: `listingId`, `name`, `type`, `location`, `price`, `listingPicture`, `listedAt` and `firstAcceptedAt`.

## Retained series

| Scope | Series keys |
|---|---|
| Owner | `monthlyRent`, `monthlyOccupancy`, `monthlyAcceptedOffers`, `monthlyTerminations`, `monthlyAverageDaysOnMarket`, `tenancyLengths` |
| Property | `monthlyRent`, `monthlyOccupancy` |

`tenancyLengths` describes accepted rentals across their stored history. Other charts use the requested period. Monthly event counts include zero months; days-on-market months without qualifying acceptances have null values. Owner monthly occupancy is null with an explanation when there are no listings.

## Admin response

The admin endpoint returns AdminAnalyticsDTO, a class with private fields, getters and setters. Counts and totals are named fields: registeredUsers, totalListings, totalRentCollected, totalRentalOffers, pendingRentals, activeRentals, upcomingRentals, expiredRentals, terminatedRentals, unclassifiedRentals, propertyOwners, currentTenants, expiredTenants, terminatedTenants and blockedUsers.

The response includes asOf and currency. Monthly chart lists are monthlyRent, monthlyAcceptedOffers, monthlyTerminations and monthlyAverageDaysOnMarket. Each point has label and value. A null days-on-market value means no qualifying listing in that month. Rent totals include all recorded payments; monthly charts use the requested date range.

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

Backend integration tests use disposable H2 fixtures and verify authorization, owner isolation, response fields, monthly calculations, view tracking and date boundaries. Service tests cover occupancy, tenant classification and days on market. Frontend analytics tests verify rendering and navigation.
