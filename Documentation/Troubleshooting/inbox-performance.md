# Inbox Performance and Diagnostics

## Behavior and Deployment

Deploy/restart the backend before using the updated frontend. Inbox now calls
`GET /api/listings/inbox`; an older backend does not support this contract.
There is no fallback to downloading all listings.

The authenticated principal determines ownership and tenancy. No email or user
ID is sent by the frontend to select another user's inbox. The database filters
before returning rows. The response is ordered by `listingID` and contains:

```json
[
  {
    "listingID": 123,
    "name": "Example property",
    "location": "Example location",
    "listingpicture": null,
    "ownerId": 10,
    "tenantId": null,
    "role": "Owner"
  }
]
```

- Each row has exactly these seven fields. `role` is `Owner` or `Tenant`.
- Vacant owned properties remain included. Owner takes precedence if both IDs
  match. Results follow the listing's tenant association, not rental status;
  this preserves the previous Inbox behavior, including retained tenancy links.
- An account without matching properties receives `[]`.
- Authentication remains mandatory, including for admin accounts. No token
  produces the existing security-layer `403`. Frontend `401`/`403` responses
  clear cached cards and send the user to Login.
- `Cache-Control: no-store` prevents HTTP/shared caching. The frontend's
  explicit in-memory cache is separate.
- The scalar DTO projection avoids materializing unrelated user/listing
  entities. A full authenticated request uses two queries: authentication
  lookup plus Inbox projection. No schema or index migration is included.

## Frontend Cache

`config/inboxStore.js` keeps only the current session's data in memory.
It does not persist properties in AsyncStorage.

On the first visit, Inbox shows its loading indicator while leaving navigation
available. Subsequent visits show cached cards immediately and refresh in the
background. Both successful empty results and populated results are cached.
Focus, returning the app to the foreground while Inbox is focused, pull-to-refresh,
and the Refresh button trigger revalidation. Concurrent refreshes share one request.

Successful listing creation, editing, deletion, offer acceptance, and termination
decisions invalidate cached data. Login and both logout paths clear it.
Invalidation/session clearing aborts pending requests; old successes and failures
cannot overwrite a newer session or a newer request. Token expiry is checked
locally, and the token is checked again before accepting a response.

Network/server failures retain already-cached cards and show a retry message.
A failed first load is not displayed as an empty inbox. Requests time out after
15 seconds. There is no automatic retry loop.

Changes made on another device become visible on the next refresh/focus, not
through real-time push. Existing cards can be briefly stale during background
refresh. The backend still authorizes every property/rental action.

## Logs

Frontend and backend both use `[Inbox]` and correlate a request through
`X-Inbox-Request-Id`. Frontend-generated IDs look like
`inbox-1791850000000-1`. The backend accepts only 1-64 ASCII letters, digits,
or hyphens; missing/invalid IDs are replaced with a UUID. The response header
is exposed through CORS.

Frontend events appear in the Expo/React Native console or web browser console:

| Event | Meaning |
| --- | --- |
| `cache_hit` / `cache_miss` | Whether this load can reuse data; a hit includes `cacheAgeMs` |
| `request_started` | HTTP work started, with reason `focus` or `manual` |
| `request_deduplicated` | Another load joined the same pending request |
| `request_completed` | Duration, HTTP status, and returned row count |
| `request_failed` | Duration, HTTP status if available, and allowlisted error code |
| `response_discarded` | An old response was intentionally ignored |
| `cache_invalidated` / `session_cleared` | Mutation or authentication boundary reset data |

`EXPO_PUBLIC_INBOX_DIAGNOSTICS=false` silences informational frontend logs
after restarting/rebuilding Expo. Failures remain warnings. The default is on.
No tokens, credentials, user emails, property bodies, image URLs, raw Axios
objects, or free-text server errors are logged by these diagnostics. Inbox
opts out of the shared image component's verbose payload logging; other screens'
existing image diagnostics are unchanged.

Backend logs use `InboxRequestLoggingFilter` and `InboxService`:

```text
[Inbox] event=request_started requestId=measure-4-new
[Inbox] event=query_completed requestId=measure-4-new rows=2 durationMs=247
[Inbox] event=request_completed requestId=measure-4-new status=200 durationMs=745
```

Query failures log `query_failed` and an exception class, not its free-text
message or SQL values. Rejected requests still have a request timing/status log.
These logger levels can be controlled independently:

```properties
logging.level.RentNest.service.InboxService=INFO
logging.level.RentNest.security.InboxRequestLoggingFilter=INFO
```

Set either to `WARN` to suppress its successful-request logs while retaining
warnings/errors. Avoid enabling HTTP body, authorization-header, or SQL bind
value logging for routine troubleshooting.

### Interpreting a Slow Load

1. Find frontend `request_started` and search the backend for that `requestId`.
2. A high `query_completed.durationMs` includes database/network round trips
   and DTO retrieval. It is **not** pure SQL execution time.
3. Backend request duration also includes security, transaction handling, and
   MVC processing/serialization. A large gap from query time can occur outside
   the projection query.
4. Frontend duration covers token reads, HTTP, parsing, and contract validation,
   but not image downloads or native layout/paint. A much larger frontend
   duration suggests additional transport/client delay.
5. `ERR_NETWORK` or `ECONNABORTED` suggests connectivity or timeout. Check
   `API_BASE_URL`, backend availability, and emulator port forwarding.
6. `401`/`403` requires signing in again. `INVALID_INBOX_RESPONSE` indicates
   an unexpected response shape. Check that the correct backend is deployed.
7. A quick completed request with a slow-looking screen should be investigated
   separately for images/rendering. Do not assume another database index fixes it.

## Measurements

Measured on 2026-10-13 using the README's owner demo account and 70 existing
listings, of which two matched the account. No property/rental mutation was
performed for the measurements.

Original running-server baseline, five consecutive parallel user/listings
loads: **1,572 / 1,549 / 1,608 / 1,534 / 1,641 ms**, median **1,572 ms**.

For the paired comparison below, both old and new request paths ran against
the same temporary backend, shared database, and account. Schema initialization
and the existing review-column startup runner were disabled for this server.
Database connections were read-only, with a pool maximum of three.

| Run | Old two-request path (ms) | New Inbox endpoint (ms) |
| --- | ---: | ---: |
| 1 | 1627 | 1112 |
| 2 | 1320 | 766 |
| 3 | 1019 | 764 |
| 4 | 1015 | 750 |
| 5 | 1368 | 1071 |
| Median | 1320 | 766 |

The paired median improved by about **42%**. Total JSON body size dropped from
**63,004 bytes** (508 user + 62,496 listings) to **472 bytes**, about **99.3%**.
Requests dropped from two to one; both approaches yielded the same two matching
properties. Body sizes exclude HTTP headers and images.

These are five development measurements, not a production latency guarantee.
The temporary server's pool/read-only settings differ from the original server,
so use the paired figures for the comparison. Query logging showed roughly
247-268 ms in DTO retrieval despite the earlier sub-millisecond SQL execution
sample: remote round trips are a separate cost.

Android before-change observation: two owner cards were visible within 3,745 ms
of the tap, **including UIAutomator inspection overhead**. This is only an upper
bound. The updated Android bundle compiled successfully, but Expo Go stalled at
its own launch spinner before mounting the app during the follow-up. Updated
native layout, image timings, and repeat-visit screen timings remain unverified.

## Validation

- Seven new H2 integration tests passed: scoping, nullable tenant, role precedence,
  empty data, response fields, authorization, constant query count, correlation
  sanitization/log redaction, and web CORS preflight.
- Seventeen dependency-light cache/logger tests passed, including account changes,
  pending-request races, mutation invalidation, error recovery, and log redaction.
- Six mounted Inbox tests passed, including both navigation destinations,
  retained cards during refresh, loading navigation, retry, auth failure, and
  refresh deduplication.
- The explicit isolated backend regression run passed **452 tests**.
- The default frontend run passed **115 tests** but could not initialize five
  termination suites without their separate mock configuration. Running those
  suites with `jest.termination.config.cjs` passed **85 tests**.
- Startup-routing and pricing diagnostics regression tests passed. Mechanical
  Inbox UI checks reported no findings.
- No shared-data rental/termination writes were exercised on Android. iOS,
  web interaction, large-text native layouts, and cross-device timing are not
  independently verified by these automated tests.

Run focused checks:

```bash
# From frontend/RentNest, Node 22.7+:
npm run test:inbox
node --test scripts/startup-routing.test.mjs scripts/pricing-diagnostics.test.mjs
./node_modules/.bin/jest --config jest.termination.config.cjs --runInBand

# From RentNest, Java 21:
mvn -Dtest=InboxIntegrationTest test
```

### Broader Test Safety

An initial broad `-Dtest=!OpenRouterLiveTest` run also selected the nonstandard
`*LiveCheck` test classes, which used the local shared-database configuration. Its
startup emitted `ALTER ... TYPE TEXT` for the chat snapshot columns and review
text (the review startup runner also executes a text-column ALTER). The observed
live-context logs contained no row inserts/updates/deletes; this is a log audit,
not a complete database audit. Do not call that run isolated.

The subsequent regression run explicitly selected normal test naming patterns
and overrode the datasource to H2. Use this form for broad local checks so
nonstandard live checks are not selected:

```bash
mvn '-Dtest=*Test,*Tests,!OpenRouterLiveTest' \
  '-Dspring.datasource.url=jdbc:h2:mem:inbox-regression;DB_CLOSE_DELAY=-1' \
  -Dspring.datasource.driver-class-name=org.h2.Driver \
  -Dspring.datasource.username=sa -Dspring.datasource.password= \
  -Dspring.jpa.database-platform=org.hibernate.dialect.H2Dialect \
  -Dspring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect \
  -Dspring.jpa.hibernate.ddl-auto=create-drop test
```

## Next Investigations

No owner/tenant index is introduced here. Assess query plans with representative
larger data before adding indexes. For very large per-user portfolios, pagination
is a separate follow-up. Home recommendations/AI latency is outside this change.
