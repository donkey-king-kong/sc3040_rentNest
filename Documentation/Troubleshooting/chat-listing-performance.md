# Chat and Listing Detail Performance

This guide covers the authenticated chat-summary/conversation reads and the
concurrent listing-detail and AI fair-pricing flow.

## Chat Contracts

All routes derive the caller from the JWT and return `Cache-Control: no-store`.

```text
GET /api/chathistory/summaries
GET /api/chathistory/conversations/{partnerId}?beforeMessageId={messageId}&limit=50
```

The summaries response contains the current user ID and one compact latest-message
row per partner. It excludes email, password, full conversation history, rental
entities, and request entities.

The conversation response contains a compact partner, an ascending message page,
and `hasMore`. The server clamps pages to 50 messages. `beforeMessageId` is an
exclusive cursor. The frontend initially displays the latest page and prepends
older pages when **Load older messages** is selected.

Rental-offer and termination cards hydrate after messages appear. IDs are
deduplicated before those requests, so repeated cards do not create repeated
reads. New messages and rental/termination mutations invalidate the session cache.

## Frontend Cache and Refresh

Chat data is held only in memory and isolated by JWT session. A valid entry is
reused for 30 seconds while focus/foreground refresh checks for changes. Requests
for the same resource are deduplicated. Logout, account changes, and existing
Inbox invalidation hooks clear chat data. Invalid, expired, or changed tokens
discard the response rather than publishing it into another session.

The Chats navigation remains visible during first load. Saved rows remain visible
during refresh failures. Conversations keep Back available and show partner and
messages before auxiliary cards settle.

## AI Chat Summary Reliability

AI chat summaries use a primary Gemini attempt followed by one fallback attempt
only for timeouts, transport failures, HTTP 429, and provider 5xx responses.
Client/authentication errors are not retried. The current sequence is:

```properties
llm.model=gemini-3.6-flash
llm.fallback-model=gemini-3.5-flash-lite
llm.connect-timeout-ms=5000
llm.primary-timeout-ms=25000
llm.fallback-timeout-ms=10000
llm.retry-backoff-ms=300
```

The fallback is the single retry, so a normal conversation has approximately
35 seconds of maximum provider wait plus the 300 ms backoff. It returns as soon
as either model succeeds.

Successful summaries are cached in backend memory for ten minutes by participant
pair, latest message ID, prompt version, and model configuration. A new message
changes the key. Matching concurrent requests share one provider call. This is
disposable derived data: it requires no database table and clears on restart.

Short conversations use one provider call. Conversations over either 100
messages or 12,000 formatted characters are split into complete bounded chunks,
each chunk is summarized, and those summaries are merged. No older messages are
silently discarded. Oversized conversations can take longer because they require
multiple bounded provider calls.

The backend validates the required summary JSON before caching it. API failures
use recoverable statuses:

| Status | Meaning |
| --- | --- |
| `429` | Provider rate limit remained after fallback |
| `503` | Provider unavailable or returned an invalid summary |
| `504` | Both bounded attempts timed out |

The frontend displays a native loading indicator in the disabled **Summarise
Chat** button. A handled failure opens the summary sheet with a specific message
and **Try Again** action instead of producing a React Native LogBox error.

## Listing and Pricing Loading

`HomeListingScreen` requests viewer and listing data concurrently. Once those
complete, it starts these independent sections:

- nearby amenities, including background readiness polling;
- owner reviews;
- historical rental-price insights;
- fair-price estimate;
- AI explanation.

The initial loading screen remains visible until all five sections have either
loaded or failed. The requests still run concurrently, so this does not restore
the old request waterfall. Back remains available throughout initial loading.
After the listing appears, section retries keep the page visible and use each
section's loading, unavailable, and retry states.

Estimate and explanation start concurrently. The backend caches estimates by
listing state for ten minutes and coalesces matching in-flight estimate, room
classification, and explanation work. A listing edit changes the cache key.
Pricing-specific Gemini calls are bounded by:

```properties
pricing.ai.connect-timeout-ms=2000
pricing.ai.read-timeout-ms=8000
```

Room classification falls back to existing keyword behavior after provider
failure. Explanation failure is shown as unavailable and can be retried. Pricing
rules, comparable selection, bands, and the configured model are unchanged.

## Measured Results

Read-only measurements used the same shared dataset and demo viewer account. The
old server ran on port 8080; the updated build ran separately on port 18080 with
DDL, SQL initialization, the legacy review-column runner, and database writes
disabled. Medians exclude login.

| Flow | Before | After | Change |
| --- | ---: | ---: | ---: |
| Chat summaries | 2,763 ms | 893 ms | 68% faster |
| Chat-summary body | 19,719 bytes | 1,350 bytes | 93% smaller |
| Conversation core | 2,326 ms | 1,004 ms | 57% faster |
| Listing core requests | 2,021 ms | 1,411 ms | 30% faster |
| Warm estimate + explanation | 1,591 ms sequential | 830 ms concurrent | 48% faster |

The updated five-run pricing wall times were 3,957 ms cold, then 830, 837, 702,
and 709 ms. Cold provider time is still externally variable; the configured
eight-second read timeout prevents it from blocking indefinitely. The 1,411 ms
listing-core result is an internal milestone. The full listing becomes visible
when the slowest initial pricing, amenities, reviews, or historical-price request
settles.

The PostgreSQL chat-summary plan scanned 265 small rows and executed in 0.148 ms;
its quicksort used 25 KB. The seconds-long delay was therefore remote request and
entity-serialization overhead, not SQL execution. No index was added. Re-evaluate
sender/receiver indexes when production history is materially larger and an
`EXPLAIN (ANALYZE, BUFFERS)` plan shows meaningful database time.

## Diagnostics

Chat frontend and backend events use `[Chat]`; optimized reads share
`X-Chat-Request-Id`. Events contain only operation, status, duration, row count,
and cache age. They exclude tokens, emails, user/property IDs, message text,
photos, rental/payment values, and response bodies.

Leaving the Chats screen aborts an in-progress summary refresh. The frontend logs
that expected lifecycle event as informational `request_cancelled`; only genuine
network, authentication, validation, and server failures use `request_failed`
warnings. Publishing the first summary rows does not trigger another refresh.

Set `EXPO_PUBLIC_CHAT_DIAGNOSTICS=false` before restarting Expo to suppress
informational frontend events. Warnings remain.

AI summary events use `[AIChat]` and `X-AI-Chat-Request-Id`. Provider events log
request ID, operation, model, status, duration, and message count. The final
generated summary is intentionally logged. API keys, original chat transcripts,
system instructions, user prompts, and arbitrary provider error bodies are not
logged. Generated summaries can contain conversation details, so production log
access and retention must be treated as sensitive.

Pricing continues to use `[PricingAI]` and `X-Pricing-Request-Id`. Provider logs
exclude API keys, prompts, descriptions, generated text, and arbitrary provider
messages. See [price insights](price-insights.md) for event interpretation.

## Focused Validation

Backend, with Java 21:

```bash
mvn -q \
  -Dtest=ChatPerformanceIntegrationTest,AiChatProviderClientTest,AiChatServiceTest,AiChatControllerTest,AiChatRequestLoggingFilterTest,FairPricingControllerTest,FairPricingServiceTest,FairPricingDemoDataTest,FairPriceExplanationServiceTest,PricingDiagnosticsTest,RoomPricingTest \
  test
```

Frontend:

```bash
npm run test:chat-listing-performance
npx expo export --platform android --output-dir /tmp/rentnest-chat-listing-android
```

The backend chat integration checks authentication, compact contracts,
pagination, constant query counts, safe correlation logs, fallback, cache
invalidation, request coalescing, chunking, error mapping, and CORS. Frontend
tests cover request deduplication, session changes, page merging, summary
loading/retry states, the complete listing display gate, pricing retry,
offer-card authorization, and ended-tenancy labels.

## Deployment

The new frontend requires the new backend routes. Restart or deploy the backend
before reloading Expo. No database migration or index is required for this
change. Query counts are bounded; add an index only after a production query plan
shows a scan that matters at real data volume.
