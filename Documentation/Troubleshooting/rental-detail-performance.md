# Owner Rental Detail Performance

## Deployment and Behavior

Restart/deploy the backend before using this frontend. Rental Info and Tenant
Overview now require the owner-scoped endpoints below. There is no fallback to
the old user/rental/payment request chain. No schema or index migration is needed.

- Rental Info makes one compact property request, including owner and tenant
  display fields. Vacant owned properties remain available.
- Tenant Overview makes one summary request, renders the tenant and lease, then
  requests payment history and outstanding months together.
- Back remains available during loading and errors. Both screens support
  pull-to-refresh and explicit Refresh/Retry.
- Payments have their own loading and retry state. Loading or failed financial
  data is never presented as "No outstanding payments."
- Chat, review, termination, tenant management, and editing controls are gated
  by freshly verified tenancy/ownership where applicable. A payment response
  reporting a missing/currently unavailable tenancy also disables tenant actions.
  Existing backend write authorization remains authoritative.

## API Contracts

All endpoints require authentication and return `Cache-Control: no-store`.
The owner is taken from the authenticated principal, never a supplied owner ID.

| GET Endpoint | Response Fields |
| --- | --- |
| `/api/owner/listings/{listingId}/rental-info` | `listingID`, `name`, `location`, `listingpicture`, `price`, `ownerId`, `ownerName`, `ownerPhotoURL`, nullable `tenantId`, `tenantName`, `tenantPhotoURL` |
| `/api/owner/listings/{listingId}/tenants/{tenantId}` | `rentalID`, `listingId`, `ownerUserId`, `tenantUserID`, `tenantName`, `tenantPhotoURL`, `status`, `rentalPrice`, `rentalDate`, `leaseExpiry` |
| `/api/owner/rentals/{rentalId}/payments` | `rentalID`, `rentalPrice`, `payments`, `outstandingMonths`, `totalOutstandingAmount` |

Payment rows contain only `paymentID`, `amount`, and `date`. Rows and outstanding
months are newest-first; outstanding months use ISO calendar dates (`YYYY-MM-DD`).
Amounts remain whole-dollar SGD. The property price remains the listing's asking
price, while summary/payment amounts use the agreed rental price.

The property projection checks listing ownership. Summary/payment queries also
require an `active` rental whose stored tenant matches the listing's current
tenant. Non-owners, missing resources, and non-current tenancies receive `404`
without revealing another owner's resource existence. Invalid IDs receive `400`.
Missing authentication retains the application's existing security-layer `403`;
the frontend handles both `401` and `403` as requiring login.

The property and summary each use one scalar projection. The payment service
performs one authorized rental-context projection and one payment read; history
and outstanding months are derived from that same payment list.

### Payment Rules and Limits

The new payment endpoint fixes empty-history handling: zero payment rows is a
valid result and can still produce outstanding months. It returns `422` for
incomplete dates, invalid rent, or an inverted lease period instead of reporting
a misleading zero balance.

Existing calendar rules are preserved:

- Count calendar months from the rental-date month through the earlier of the
  current month or lease-expiry month, inclusive.
- Any payment dated in a month marks that month paid, irrespective of amount.
- Use the backend's system-default timezone for date-to-month conversion.
- No proration, partial-payment reconciliation, refunds, future-month charges,
  or general billing redesign is introduced.

Old payment endpoints and the tenant-side Rent Payment calculation are unchanged.
This fix is specific to the new owner read path.

## Session Cache and Freshness

`config/rentalDetailStore.js` stores data only in memory, keyed by property,
listing/tenant, or rental ID. Data is not persisted to AsyncStorage. Inactive
navigation entries are evicted when adding beyond 32 entries; mounted or pending
entries are retained.

Focus, foreground return while focused, manual refresh, and pull-to-refresh
revalidate data. Concurrent loads of the same resource share a request. Requests
time out after 15 seconds; there is no automatic retry loop. Blur cancels pending
work, and late responses cannot replace a newer request or account.

Saved property/tenant details can render during refresh but are explicitly
labelled as saved. Sensitive actions stay disabled until revalidation succeeds.
Payments wait for a verified summary; refreshing the summary also refreshes the
financial section. Cached payments are labelled when their own retry is pending
or fails. `404`/`409` removes unavailable resource data. `401`/`403`, missing or
expired tokens, and account changes clear session data.

Login/logout and successful listing create/edit/delete, offer acceptance, and
termination decisions clear/invalidate both Inbox and rental detail caches through
the shared Inbox hooks. Successful monthly payments from chat or Rent Payment
invalidate rental details. Changes from another device become visible on the next
focus/refresh, not through push notifications.

## Diagnostics

Frontend and backend logs share `[RentalDetail]` and `X-Rental-Request-Id`.
The backend accepts only 1-64 ASCII letters, digits, or hyphens for correlation;
otherwise it generates a UUID. CORS allows and exposes the response header.

Frontend events cover cache hits/misses, starts, completions, failures,
deduplication, cancellation, discarded responses, invalidation, and session
clearing. Fields are allowlisted: operation (`property`, `summary`, `payments`),
request ID, reason, duration, cache age, status, and error code.

Set `EXPO_PUBLIC_RENTAL_DIAGNOSTICS=false` and restart/rebuild Expo to suppress
informational frontend logs. Failures remain warnings.

Backend examples:

```text
[RentalDetail] event=request_started requestId=rental-example-1
[RentalDetail] event=data_completed requestId=rental-example-1 operation=summary durationMs=250
[RentalDetail] event=request_completed requestId=rental-example-1 status=200 durationMs=760
```

Independent backend log controls:

```properties
logging.level.RentNest.service.RentalDetailService=INFO
logging.level.RentNest.security.RentalDetailLoggingFilter=INFO
```

Set to `WARN` to retain failures while suppressing successes. These diagnostics
exclude tokens, emails, resource IDs, financial amounts, URLs, payloads, raw Axios
errors, and free-text exception messages. Both detail screens disable the image
components' existing verbose diagnostics. Other screens' pre-existing logs are
not globally rewritten.

To investigate a slow load:

1. Match frontend and backend entries using the request ID.
2. `data_completed.durationMs` includes database network round trips and service
   work, not just SQL execution time.
3. Backend request time additionally includes authentication, transaction work,
   and serialization. Frontend duration includes token reads, HTTP, parsing, and
   contract validation, but excludes image downloads and native layout/paint.
4. Check `ERR_NETWORK`/`ECONNABORTED` against backend availability and the emulator
   API address. `INVALID_DETAIL_RESPONSE` indicates a contract/data mismatch.
5. For `404`, refresh the property to obtain the current tenant; for `422`,
   inspect the rental/payment data through authorized tooling.

## Measurements

Measured on 2026-10-13 against an existing active demo tenancy. The original
running-server baseline medians were 1,244 ms for Rental Info and 3,284 ms for
Tenant Overview. Use the paired figures below for the before/after comparison.

Both paths ran alternately against the same temporary backend, account, and
shared PostgreSQL database. Hibernate schema changes, SQL initialization, and the
existing review-column startup runner were disabled. Connections were read-only
with a maximum pool of three. No property, rental, or payment records were changed.

| Run | Old Property ms | New Property ms | Old Tenant Total ms | New Summary ms | New Tenant Total ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 1382 | 778 | 3420 | 768 | 1850 |
| 2 | 1270 | 842 | 3477 | 770 | 1875 |
| 3 | 1259 | 766 | 3713 | 915 | 1927 |
| 4 | 1343 | 760 | 3542 | 760 | 1769 |
| 5 | 1362 | 754 | 3530 | 752 | 1822 |
| Median | 1343 | 766 | 3530 | 768 | 1850 |

- Rental Info median API time improved by about **43%**.
- Tenant Overview total API time improved by about **48%**; summary data is
  available after about **0.77 seconds**, without waiting for the payment response.
- Tenant requests dropped from **five to two**.
- Property JSON dropped from **921 to 540 bytes**. Tenant JSON dropped from
  **2,336 to 927 bytes**, about **60%**. Headers and images are excluded.
- The old outstanding endpoint returned `204` for this fully-paid fixture.
  Empty-history and unpaid-month cases were separately validated in isolated tests.

These are five development samples, not production guarantees or measured native
paint times. Remote database latency remains significant; an index does not
remove network round trips. No index migration is included.

## Validation and Remaining Checks

- 14 focused backend tests passed, covering owner/current-tenant scope, vacant
  properties, missing/invalid IDs, empty history, payment month/date rules,
  malformed financial data, safe logs, and CORS.
- Hibernate statistics show **2 queries** for property or summary and **3** for
  payments, including authentication. Payment count remains three with 30 rows.
- 18 dependency-light cache/logger tests passed, covering session races,
  cancellation, deduplication, mutation invalidation, stale data, and redaction.
- Mounted screen tests cover progressive rendering, section retry, Back during
  loading, vacancy, stale action gating, route changes, and refresh request counts.
- Full isolated backend regression: **466 tests passed**, excluding live API
  checks. Standard frontend regression: **115 tests passed**. Separate detail and
  termination configuration: **110 tests passed**.
- Combined startup/Inbox/detail-cache/pricing diagnostic checks: **45 passed**.
- Updated Android bundle compiled; mechanical checks found no detail UI issues.
- Native visual and interaction timing remains unverified: Expo Go stayed at its
  own launch progress screen before mounting RentNest. iOS, large-text layouts,
  and real-device slow-network behavior still need platform checks. Mocked
  component tests do not establish native appearance.

Run focused checks:

```bash
# From frontend/RentNest:
npm run test:rental-details
npm test -- --runInBand --watchAll=false --testPathIgnorePatterns=tests/termination/
./node_modules/.bin/jest --config jest.termination.config.cjs --runInBand

# From RentNest, Java 21:
mvn -Dtest=RentalDetailIntegrationTest,RentalDetailPaymentTest test
```

Use the explicit H2 regression command in the
[Inbox guide](inbox-performance.md#broader-test-safety) for broad backend checks.
Do not launch a regular shared-database application context solely for testing:
existing startup configuration can run schema changes.
