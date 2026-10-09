# Troubleshooting

## Price Insights

Use this section when the listing page shows an empty Price Insights card, the chart does not appear, or it is unclear whether the issue is missing data, a backend error, or stale frontend code.

### Expected Logs

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

### No Price Insights Logs Appear

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

### Backend Fails Before Startup

If `mvn spring-boot:run` fails at `testCompile` with `ChatHistoryControllerTest`, use:

```bash
mvn -Dmaven.test.skip=true spring-boot:run
```

`-DskipTests` skips running tests, but it can still compile test sources. `-Dmaven.test.skip=true` skips both running and compiling tests.

### Missing Backend Config In A Separate Worktree

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

### Frontend Dependencies Missing

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

### Data Exists But Chart Is Empty

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

### How To Read The Logs

- `Rental prices fetch completed` with `rawCount > 0`: backend returned usable records.
- `Rental prices response is empty`: request succeeded, but no comparable rental data was found.
- `Rental prices request failed`: frontend could not fetch the endpoint; check `status` and backend logs.
- `completed with no chartable months`: backend found rows but none produced valid monthly medians.
- `Could not load price insights`: backend hit an exception; use the stack trace in the same log.

### Known Unrelated Startup Warning

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
