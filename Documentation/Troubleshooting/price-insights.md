# Price Insights Troubleshooting

Use this guide when the listing page shows an empty Price Insights card, the chart does not appear, or it is unclear whether the issue is missing data, a backend error, or stale frontend code.

## AI Fair Price Diagnostics

The numerical fair-price estimate and its AI explanation are separate requests.
Their logs use `[PricingAI]`, not the historical rental chart's `[PriceInsights]`.
An estimate can succeed while the explanation fails.

On the frontend, each request logs `request_started` and then `request_completed`,
`request_timed_out`, or `request_failed`, including listing ID, operation,
endpoint, timestamp, duration, and a local `attemptId`. Completion logs include
the actual HTTP status and the payload's `available` flag. HTTP 200 with
`available: false` is an informational handled state, not a transport error.
Rejected requests include a recognized Axios error code and an
HTTP status, or null when no HTTP response was received. Handled failures use
informational logs so Expo does not turn a recoverable pricing state into a
LogBox error. A request ending near the 25-second frontend deadline is logged as
`request_timed_out`; the card explains that Retry may find the completed result.

On the backend, listing estimate/explanation requests have a generated `requestId`.
That ID follows the synchronous controller, explanation cache, and Gemini logs;
it is not sent to the client. Match frontend and backend logs by listing ID,
operation, and time, then use the backend request ID to follow provider calls.
Frontend attempt IDs and backend request IDs are separate identifiers.

For example, one upstream failure can produce these backend lines:

```text
[PricingAI] event=request_started requestId=example-41 listingId=41 operation=explanation
[PricingAI] event=explanation_cache requestId=example-41 listingId=41 cache=miss
[PricingAI] event=provider_failed requestId=example-41 listingId=41 operation=PRICE_EXPLANATION model=gemini-3.1-flash-lite httpStatus=503 durationMs=12000 providerCode=503 providerStatus=UNAVAILABLE providerReason=high_demand
[PricingAI] event=request_completed requestId=example-41 listingId=41 operation=explanation httpStatus=200 available=false durationMs=12100
```

The frontend then logs `event: request_completed`, `httpStatus: 200`, and
`available: false`. This means the backend answered, but could not provide an
explanation; it does not mean the frontend received HTTP 503.

- `provider_started` without a completion/failure shows a call still pending or an
  interrupted process. It does not prove a provider outage.
- Provider operations distinguish `PRICE_EXPLANATION` from `ROOM_CLASSIFICATION`.
- `explanation_cache` reports `hit`, `miss`, or `expired`. Only successful
  explanations are cached. A hit alone does not establish current provider health.
- `provider_failed` reports model, upstream HTTP status, and elapsed time.
  Transport errors use `httpStatus=none` and an exception class such as
  `SocketTimeoutException`, without logging the exception's free-text message.
- Provider details are restricted to a numeric error code, an allowlisted status,
  and a derived reason: `high_demand`, `quota_or_rate_limit`,
  `credentials_or_permissions`, `model_unavailable`, `service_unavailable`, or
  `unspecified`. A category describes the provider's message, not an independently
  verified root cause. Unknown statuses are `UNKNOWN`; unreadable or oversized
  bodies are omitted. Arbitrary provider messages and metadata are not logged.
- Keys, authorization headers, prompts, listing descriptions, and generated
  explanations are excluded from these diagnostics. Do not enable HTTP wire/body
  logging to investigate this flow.
- Pricing uses `pricing.ai.model`, defaulting to `gemini-3.5-flash-lite`.
  The chat setting `llm.model` does not select the pricing model.

Pricing calls now use `pricing.ai.connect-timeout-ms` (default 2000) and
`pricing.ai.read-timeout-ms` (default 8000). Comparable-data calls to OneMap,
data.gov.sg, and URA use `pricing.data.connect-timeout-ms` (default 2000) and
`pricing.data.read-timeout-ms` (default 6000), so a cold external lookup cannot
wait indefinitely. The frontend allows 25 seconds for the combined cold request.
The listing screen offers Retry after an unavailable estimate, and
estimate/explanation work is cached and coalesced by listing state. Existing
servers must load the updated code before these controls appear; creating a
worktree does not update another session's running application.

### Focused Tests

From `RentNest/`, with Java 21 selected:

```bash
mvn -Dtest=PricingDiagnosticsTest,FairPriceExplanationServiceTest,FairPricingControllerTest,RoomPricingTest test
```

These tests mock the provider and repositories; they do not require database
credentials or call the live AI service. On macOS, select Java 21 for this command
with `JAVA_HOME="$(/usr/libexec/java_home -v 21)" mvn ...` if Maven uses a newer JDK
unsupported by Mockito's Byte Buddy version.

From `frontend/RentNest/`, using Node 22.7+ (or Node 24):

```bash
npm run test:pricing-diagnostics
```

The frontend logger tests use Node's built-in test runner and do not require Expo
or Jest to start. They validate diagnostics, not device rendering.

## Expected Logs

When the feature is running correctly, clicking a listing should produce frontend logs like:

```text
[PriceInsights] Fetching rental prices
[PriceInsights] Rental prices fetch completed
```

The backend terminal should also show:

```text
[PriceInsights] Starting lookup for listingId=40
[PriceInsights] Listing 40 completed successfully; rawComparableCount=12, medianMonthCount=12, newestMonth=Sep 2026, oldestMonth=Oct 2025
```

If the frontend log shows `rawCount` and `dedupedCount` above zero, the backend returned data successfully.

## No Price Insights Logs Appear

If neither frontend nor backend shows `[PriceInsights]` logs, the updated code is probably not running.

Check that both terminals are using the PR worktree:

```bash
pwd
git log -1 --oneline
```

For the `fix/price-insight` debugging commit, the log should include:

```text
3e85749 fix: add price insights logging
```

Start the backend from the PR worktree:

```bash
cd /Users/bytedance/Desktop/sc3040_rentNest_fix_price_insight/RentNest
mvn -Dmaven.test.skip=true spring-boot:run
```

Start the frontend from the PR worktree:

```bash
cd /Users/bytedance/Desktop/sc3040_rentNest_fix_price_insight/frontend/RentNest
npm install --legacy-peer-deps
npx expo start -c
```

The `-c` flag clears Expo's cache so the app does not use an old bundle.

## Backend Fails Before Startup

If `mvn spring-boot:run` fails at `testCompile` with `ChatHistoryControllerTest`, use:

```bash
mvn -Dmaven.test.skip=true spring-boot:run
```

`-DskipTests` skips running tests, but it can still compile test sources. `-Dmaven.test.skip=true` skips both running and compiling tests.

## Missing Backend Config In A Separate Worktree

If backend startup fails with:

```text
Could not resolve placeholder 'security.jwt.secret-key'
```

the PR worktree is missing local backend config. Copy your local config from the main worktree:

```bash
cp /Users/bytedance/Desktop/sc3040_rentNest/RentNest/src/main/resources/application.properties \
/Users/bytedance/Desktop/sc3040_rentNest_fix_price_insight/RentNest/src/main/resources/application.properties
```

Do not commit `application.properties`; it contains local credentials and secrets.

## Frontend Dependencies Missing

If Expo reports:

```text
Cannot determine the project's Expo SDK version because the module `expo` is not installed.
```

install dependencies in the PR worktree:

```bash
cd /Users/bytedance/Desktop/sc3040_rentNest_fix_price_insight/frontend/RentNest
npm install --legacy-peer-deps
npx expo start -c
```

## Data Exists But Chart Is Empty

The chart expects month labels such as:

```text
Sep 2026
Aug 2026
Jul 2026
```

The backend fixes locale-dependent month formatting by using `Locale.ENGLISH` when formatting `MMM yyyy`. Without this, a non-English server locale could return labels such as `sept. 2026`, which the frontend cannot parse.

If the frontend receives data but cannot chart it, it logs:

```text
[PriceInsights] Chart received data but no points were chartable
```

Check the sample payload in that log. If the date format is not `MMM yyyy`, fix the backend formatter or update the frontend parser.

## How To Read The Logs

- `Rental prices fetch completed` with `rawCount > 0`: backend returned usable records.
- `Rental prices response is empty`: request succeeded, but no comparable rental data was found.
- `Rental prices request failed`: frontend could not fetch the endpoint; check `status` and backend logs.
- `completed with no chartable months`: backend found rows but none produced valid monthly medians.
- `Could not load price insights`: backend hit an exception; use the stack trace in the same log.

## Known Unrelated Startup Warning

The backend may log this during startup:

```text
ERROR: value too long for type character varying(255)
```

This comes from Hibernate attempting to alter `reviews.text` to `varchar(255)`. If the application continues to:

```text
Tomcat started on port 8080
Started RentNestApplication
```

then this warning is not blocking Price Insights.
