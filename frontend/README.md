# Frontend

## Chat and Listing Detail Performance

Restart/deploy the backend before using the optimized chat endpoints. The Chats
tab now calls authenticated `GET /api/chathistory/summaries` instead of downloading
every message. Conversations use
`GET /api/chathistory/conversations/{partnerId}` and initially load the latest 50
messages; **Load older messages** retrieves earlier pages. Session-only caches keep
saved rows visible during focus refresh, and chat mutations invalidate them.

Conversation headers and messages render before rental/termination card details.
Listing details fetch the viewer and property concurrently, then load
amenities, reviews, history, and pricing concurrently behind the initial loading
screen. The complete listing appears after every initial section has loaded or
failed. Later retries keep the listing visible. Fair-price estimate and
explanation start together; backend request coalescing prevents duplicate
classification/estimate work.

Chat logs use `[Chat]` and `X-Chat-Request-Id`. Set
`EXPO_PUBLIC_CHAT_DIAGNOSTICS=false` and restart Expo to suppress informational
frontend events; warnings remain. Pricing Gemini calls use
`pricing.ai.connect-timeout-ms` and `pricing.ai.read-timeout-ms`.

Run `npm run test:chat-listing-performance` from `frontend/RentNest`. See the
[chat and listing performance guide](../Documentation/Troubleshooting/chat-listing-performance.md)
for API contracts, cache behavior, measurements, and diagnostic fields.

## Owner Rental Details

Restart/deploy the backend before using the updated Rental Info and Tenant Overview
screens. They now use `/api/owner/...` detail endpoints: one property request, then
one tenant-summary request and one combined payment request when opening a tenant.
The tenant profile and lease appear without waiting for payments.

Both screens retain Back during loading, support refresh/retry, and label saved
data during revalidation. Payment errors have a separate retry and never imply
zero outstanding. Management actions require freshly verified ownership/tenancy.
Login/logout and relevant listing/rental/payment mutations reset the memory cache.

Logs use `[RentalDetail]` and `X-Rental-Request-Id`; set
`EXPO_PUBLIC_RENTAL_DIAGNOSTICS=false` to suppress frontend info logs after an Expo
restart/rebuild. Run `npm run test:rental-details` from `frontend/RentNest`.
See the [rental detail performance guide](../Documentation/Troubleshooting/rental-detail-performance.md)
for contracts, preserved billing rules, paired measurements, backend controls,
and native validation limits.

## Inbox Loading and Logs

Restart/deploy the backend before this frontend. Inbox uses the authenticated
`GET /api/listings/inbox` endpoint rather than downloading every listing.
It caches only the current session's properties in memory, keeps cards visible
during background refresh, and supports pull-to-refresh plus Refresh/Retry.
Login/logout clear the cache; property and rental changes invalidate it.
Changes from another device appear on the next refresh or focus.

Frontend and backend logs share the `[Inbox]` prefix and `X-Inbox-Request-Id`.
They report request/query duration, status, row count, cache use, and failures
without tokens or property payloads. Set `EXPO_PUBLIC_INBOX_DIAGNOSTICS=false`
and restart/rebuild Expo to suppress frontend informational logs; warnings remain.

Run `npm run test:inbox` from `frontend/RentNest`. See the
[Inbox performance and diagnostics guide](../Documentation/Troubleshooting/inbox-performance.md)
for backend logging controls, timing interpretation, measured improvements,
safe regression commands, deployment requirements, and Android validation limits.

## Startup Routing

The root stack explicitly starts at `index`, which redirects to `LandingScreen`
with **Log In** and **Sign Up**. Keep `index` registered before `AdminScreen` in
`app/_layout.jsx` so native startup does not fall back to the admin screen.
Explicit deep links still open their requested routes.

Restarting Expo or closing Expo Go does not clear the token stored by
AsyncStorage. Default startup shows Landing without checking or deleting that
token; use Log out to end the saved session. Login still selects the appropriate
dashboard after authentication.

Run the focused configuration regression tests from `frontend/RentNest`:

```bash
node --test scripts/startup-routing.test.mjs
```

Verified on Android Expo Go: signed-out cold launch opens Landing, both landing
buttons open their respective forms, Back from Login returns to Landing, and an
explicit Login deep link remains supported. The three automated tests cover the
initial screen, unconditional landing redirect, and retained admin styling.
Authenticated cold launch, post-login dashboards, web, and iOS were not
retested for this change.

## Profile Photo URLs

Sign Up and Edit Profile include **Photo URL**. Sign Up shows the label inside
the field; Edit Profile places it last, after Phone Number. Neither screen
shows helper text below it; validation errors still appear when needed. Paste a public
HTTP(S) image URL (HTTPS recommended, up to 255 characters). In Edit Profile,
the avatar previews the draft; select **Update Profile** to save. Clearing the
field and saving removes the photo and uses initials. Returning to Profile
reloads saved changes without restarting the app.

The field is optional, and a failed image download does not block saving a
valid URL. There is no file upload or cropping. Avoid secret links because
existing avatar diagnostics log URLs.

Run `npm run test:photo-url` from `frontend/RentNest` for focused URL and mounted
screen tests using mocked services. The command uses Node's test runner with
the installed Babel/React renderer and does not require the currently missing
React Native Jest preset. See [profile image guidance](../Documentation/Troubleshooting/profile-images.md)
for API omission/clearing semantics, fallback behavior, and test limitations.

## AI Pricing Logs

The listing detail screen logs estimate and explanation requests under
`[PricingAI]`, including listing ID, endpoint, duration, HTTP status, and
availability. A response with HTTP 200 and `available: false` is logged as a
warning; failed HTTP/network requests are logged separately. Response bodies,
authorization headers, and free-text error messages are not included.

See [AI Fair Price Diagnostics](../Documentation/Troubleshooting/price-insights.md#ai-fair-price-diagnostics)
for backend correlation and examples. Run the dependency-free logger tests from
`frontend/RentNest` with `npm run test:pricing-diagnostics` on Node 22.7+ or Node 24.
The listing screen now has a pricing retry, starts estimate and explanation
concurrently, and renders core property content without waiting for pricing.
Provider timeouts are configured on the backend.

## Property Type Filter

The home screen's advanced-filter dropdown opens in a transparent overlay anchored
to the Property type field. Opening it does not move the sort controls or listings.
Options appear below the field, or above it when there is more room there; the
menu scrolls when the available space is limited.

Select an option to update the field and close the menu. Tap outside to dismiss
without changing the selection or activating the content behind it. Android Back
also dismisses the menu.

The borderless **Clear** action beside Property type clears minimum rent, maximum
rent, minimum bedrooms, and the selected property type. It preserves the text
currently visible in the search field, including unsubmitted edits, and immediately
reloads listings using that search without explicit advanced filters. Sorting and
recommendation history stay unchanged. The search field's clear icon and
Reset Recommendations remain separate actions.

### Regression Checks

- Open and close the menu repeatedly; the sort controls and listings must not move.
- Select each property type; confirm the field updates and the menu closes.
- Check outside-tap and Android Back dismissal.
- Hide and reopen advanced filters; the menu should start closed.
- Enter a search and populate all advanced filters, then select Clear. The search
  must remain, numeric fields must empty, and property type must return to
  All property types. Confirm the reloaded results use the retained search.
- Repeat with invalid filters, an empty search, and already-cleared filters.
- Confirm Clear preserves sorting and does not erase recommendation history.
- On web, check keyboard selection and Escape dismissal. On small screens, check
  menu placement and scrolling without clipping.

Android emulator interaction checks and before/after layout comparisons passed.
Clear was also checked on Android with a retained Tampines search, and focused
screen/request tests passed for populated, invalid, empty, and cleared filters.
The standard Jest runner uses the matching `@react-native/jest-preset` development dependency. Run `npm ci` and `npm test -- --runInBand --watchAll=false` from `frontend/RentNest`. The earlier focused checks used the installed React renderer with mocked services.
Web keyboard behavior and iOS interaction still require platform verification.

## Lease Termination

Approved work is on `rental-termination`, branched from `main`. See the
[workflow plan](../Documentation/Plans/termination-workflow-plan.md) for tickets and scope.
Automated termination checks passed; platform validation limits are recorded below.

### Owner and Tenant Guide

1. As the owner, open Inbox -> property -> Manage Tenant -> tenant
   (Tenant Overview) -> Terminate Lease.
2. Choose **Refund tenant** and enter a positive whole-dollar SGD amount, or choose
   **No refund**, which submits `0`. Cents and negative or invalid amounts are not
   supported. The existing API stores the amount as Java `long`; the form also
   rejects values outside JavaScript's safe integer range.
3. Submit the request, then review its card in the tenant chat. Submission leaves
   the lease active while awaiting the tenant's response.
4. As the tenant, open the conversation and choose **Accept** or **Reject** on the
   pending request. Accept ends the lease immediately. Reject leaves it active.
   Owners cannot accept or reject their own request; tenants cannot initiate one.

Each card loads its own request with server-derived rental details, shows the persisted outcome,
and provides loading, retry, error, and in-progress states. Decision controls are
unavailable after acceptance or rejection. A displayed refund is an agreed amount,
not evidence of a transfer: this flow neither processes money nor creates a payment row.

### API and Limits

- Creation retains `POST /api/requests/terminationrequest/{rentalid}/{refundAmount}`.
  The server checks the authenticated rental owner, active lease, valid amount, and
  absence of any retained request, then creates the request and chat message atomically.
- Decisions use `POST /api/requests/{id}/decision` with `{"decision":"accept"}` or
  `{"decision":"reject"}`. Only the rental tenant can decide; request reads are
  restricted to rental participants.
- Acceptance atomically persists request status `terminated`, rental status
  `terminated`, and rental `terminatedAt`, without replacing the tenant identity.
  Rejection persists request status `rejected` without changing the rental.
- Repeating the same completed decision returns the outcome; conflicting decisions
  or duplicate creation are rejected. Busy controls also guard repeated taps.
- The unchanged schema allows **one retained request per rental, even after rejection**.
  A rejected request cannot be replaced by a new proposal in this scope.
- No tenant initiation, scheduling, refund table or settlement tracking, billing,
  re-letting, multi-request redesign, or existing-data repair is included.

### Termination Validation Checklist

The checked items below passed automated tests with mocked frontend HTTP and isolated backend H2.
They do not assert that native end-to-end writes were exercised.

- [x] Owner submits a positive whole-dollar refund and No refund `0`.
- [x] Invalid, fractional, negative and oversized amounts cannot be submitted.
- [x] Tenant acceptance persists across reload, ends the correct lease immediately,
  and preserves tenant identity; rejection persists and leaves the lease active.
- [x] Owner/nonparticipant decisions and non-owner creation are denied.
- [x] Repeated taps, retries, conflicting decisions and creation after rejection
  cannot produce a second request or inconsistent state.
- [x] Request-only messages and multiple cards use their own request details.
- [ ] Loading, failures, retry, narrow layouts and accessible controls work.
- [ ] Neither decision creates a payment row; existing offers, chat and rent
  payment flows pass regression checks.

Run the focused frontend suite from `frontend/RentNest`:

```bash
./node_modules/.bin/jest --config jest.termination.config.cjs --runInBand
```

All 62 tests passed. The scoped configuration uses mocked native components and avoids
the existing default Jest preset dependency issue. Backend Java 21 validation passed
215 tests, including 47 termination tests; two unrelated OpenRouter live tests were
excluded after TLS certificate failures.

Read-only browser checks confirmed the owner route, whole-dollar validation, and an
existing Accepted card. Browser screenshot capture failed; the Android session had API
errors loading chats. Native card visuals, narrow/large-text layouts, and iOS remain
unverified. No shared database records were changed during validation.

Restart/deploy the updated backend with this frontend: decisions now require the new
endpoint rather than the former generic request/rental PUTs.
