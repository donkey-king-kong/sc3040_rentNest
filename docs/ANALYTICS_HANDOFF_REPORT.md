# Analytics work: return package

**For:** Dobin (analytics backend owner) and the independent reviewer
**From:** Rayson, with a coding agent
**Repository and branch:** `donkey-king-kong/sc3040_rentNest`, branch `feature/analytics-dashboard`.
**Origin of the work:** developed as uncommitted changes against the previous HomeGoWhere repository, then ported here on 18 September 2026. The port renamed paths, packages and classes from `HomeGoWhere` to `RentNest`. Before porting, every other file was compared: all matched after the rename, and teammates' later changes (the `README.md` `mvn` note, `package.json` name) were kept.
**Date:** 17 September 2026

This responds to `01_ANALYTICS_AGENT_HANDOFF.md`. It reports what was built, what was tested and how, what was changed in the shared database, and what remains. Nothing here claims approval against `02_QUALITY_TARGETS_FINAL_DRAFT.md`, which is still a draft.

## 1. Summary

- **Analytics API:** three endpoints (owner summary, per-listing, platform), plus React Native screens for each. Every metric states whether it is available, what it measures, and why when it is not.
- **Admin role:** replaces the hardcoded `admin@gmail.com` checks. Moderation endpoints are now admin-only, while reporting content stays open to all signed-in users.
- **Ownership checks:** only a listing's owner or an admin can edit or delete it; only a review's author or an admin can edit or delete it.
- **Lifecycle timestamps:** when accounts, listings and offers are created, accepted and terminated. They enable days on market and growth metrics from 17 Sep 2026 onwards.
- **Schema change process:** `ddl-auto=validate`, with reviewed SQL files in `docs/db/changes/`.
- **Bug fixes:** reporting a listing never worked; editing a reported review cleared its report; two moderation screens hung on "Loading..."; a pre-existing failing test.

## 2. Shared database changes (already applied to Supabase)

Both are additive, so branches without this code are unaffected.

| File | Applied | Effect |
|---|---|---|
| `docs/db/changes/2026-09-16_add_user_role.sql` | 16 Sep 2026 | `public.users.role`, required, default `USER`. `admin@gmail.com` set to `ADMIN` (1 row). |
| `docs/db/changes/2026-09-17_add_lifecycle_timestamps.sql` | 17 Sep 2026, 02:25 SGT | Optional `created_at` on `users` and `listings`; optional `created_at`, `accepted_at`, `terminated_at` on `rentals`. Existing rows left NULL. |

After each change, the backend on this branch was started against Supabase with `ddl-auto=validate` and started cleanly. No other data was written by this work.

**Note for anyone writing SQL:** Supabase also has an internal `auth.users` table with its own `role` column. Always write `public.users`.

## 3. Changed files

### Backend
| File | Change |
|---|---|
| `pom.xml` | H2, test scope only |
| `controller/AnalyticsController.java` | **New.** The three analytics endpoints |
| `service/AnalyticsService.java`, `service/AnalyticsException.java` | **New.** Metric definitions, period validation, coverage |
| `repository/AnalyticsQueryRepository.java` | **New.** Aggregate queries, always scoped in SQL |
| `dto/analytics/*.java` | **New.** Response types |
| `model/User.java` | `role`, real authorities, `createdAt` |
| `model/Listings.java` | `createdAt`, `isOwnedBy` |
| `model/Rentals.java` | `createdAt`, `acceptedAt`, `terminatedAt` |
| `model/Reviews.java` | `isWrittenBy` |
| `security/SecurityConfiguration.java` | Admin-only moderation routes; reporting stays open; 401 for analytics only |
| `security/LoginResponse.java`, `controller/AuthenticationController.java` | Login returns `role` and `userId` |
| `controller/ListingsController.java`, `controller/ReviewsController.java` | Owner/author-or-admin checks on edit and delete |
| `service/RentalsService.java` | Records acceptance and termination times |
| `service/ReviewsService.java` | Editing a review no longer copies the report flag from the request |
| `application.properties.example` | `ddl-auto=validate`, analytics settings |

### Backend tests
| File | Change |
|---|---|
| `RentNestIntegrationTest.java` | **New.** Shared annotation: in-memory database, dummy secrets |
| `AnalyticsControllerIntegrationTest.java` | **New.** 22 tests |
| `OwnershipAuthorizationIntegrationTest.java` | **New.** 14 tests |
| `LifecycleTimestampsIntegrationTest.java` | **New.** 9 tests |
| `RentNestApplicationTests.java` | No longer connects to Supabase |
| `AuthenticationControllerTest.java` | Fixed a pre-existing wrong assertion |
| `ListingControllerTest.java`, `ReviewsControllerTest.java` | Updated for the new checks; added refused and not-found cases |

### Frontend
| File | Change |
|---|---|
| `app/OwnerAnalyticsScreen.jsx`, `app/ListingAnalyticsScreen.jsx`, `app/AdminAnalyticsScreen.jsx` | **New.** Dashboards. The property page has tabs (Overview, Offers, Payments, Occupancy) and a Change property picker; all three offer 30D / 3M / 6M / 12M. |
| `components/analytics/AnalyticsKit.jsx` (+ tests, fixture) | **New.** Data hook, icon tiles, meters, bar, line and share charts, period selector |
| `package.json`, `package-lock.json` | **Added `react-native-svg` 15.2.0** (the version Expo SDK 51 expects), used by the line charts. The lockfile change is additive only: that package and its 11 dependencies. Teammates need to run `npm install --legacy-peer-deps` after merging. |
| `components/ModerationListState.jsx` (+ tests) | **New.** Loading, error and empty states for moderation lists |
| `config/api.js` | Analytics endpoint constants |
| `app/ProfileScreen.jsx`, `app/AdminScreen.jsx` | Entry buttons |
| `app/LoginScreen.jsx` | Routes admins by role, not by email |
| `app/HomeListingScreen.jsx` | Report-listing fix: missing `/` in URL; success shown only on success |
| `app/BanUserScreen.jsx`, `app/ReviewListingScreen.jsx`, `app/ProcessReviewsScreen.jsx` | Loading, error and empty states; list key fix |
| `app/BanUserScreen2.jsx`, `app/ReviewListingScreen2.jsx`, `app/ProcessReviewsScreen2.jsx` | Clearer button labels |

### Docs
`README.md` (admin login, schema process pointer), `docs/ANALYTICS_API.md`, `docs/db/README.md`, `docs/db/changes/`, this report.

No other files are changed by this work. (An earlier draft of this report flagged `app.json`, `SignUpScreen.jsx` and the `AppMap` files as unexplained changes; comparing against this repository showed their contents were unchanged. `expo-env.d.ts` is generated by Expo and ignored by git.)

## 4. Tests run

All test data is synthetic. No test uses the shared database.

| What | Command | Result |
|---|---|---|
| Backend, full suite | `cd RentNest && mvn test` | **134 passed, 0 failed** |
| Backend, isolation check | same, with `-Dspring.config.location=optional:file:./no-such-config-dir/ -Dspring.datasource.url=jdbc:postgresql://unreachable.invalid:5432/none` | **134 passed.** Tests run without a local `application.properties` and cannot reach a real database. |
| Frontend | `cd frontend/RentNest && npx jest components --watchAll=false` | **36 passed, 0 failed** |
| Frontend build | `npx expo export --platform web` | Compiles |
| Schema against Supabase | backend started with `ddl-auto=validate` after each migration | Started cleanly |

**Environment:** Windows 11, JDK 26, Node 24, H2 in-memory database. The project targets Java 21; on JDK 22 or newer, add `"-DargLine=-Dnet.bytebuddy.experimental=true"` for Mockito. Before this work, the existing suite had 76 of 77 passing on this machine with that flag.

**What the backend tests cover:**
- Access control: 401, 403, identical 404s for foreign and missing listings, client-supplied IDs ignored, admin role
- Moderation and reporting permissions
- Owner/author/admin rules for editing and deleting
- Every aggregate against hand-calculated fixture values
- `[from,to)` boundaries and equivalent time-zone offsets; invalid periods
- Timestamps recorded by the server through the real signup, offer, accept and terminate endpoints; client-supplied times ignored; repeat saves don't overwrite
- Coverage: partly covered, not tracked, and percent change requiring fully tracked periods

**Which tests were shown to fail first:**
- The original analytics tests were written before the endpoints existed, and failed until they were built.
- The reported-review test was re-run against the old code and failed there.
- The other new tests (ownership, lifecycle, moderation lists) were written after their changes and were not run against the old code.

**Live checks against Supabase (read-only, sanitised):**
- As Superman, the owner summary returned `listingCount = 8`, matching an independent count through `/api/users/1/listings`.
- As admin, `/api/users/admin/flagged` returned 200.
- As Superman, the same endpoint returned 403.

**Manual UI check by Rayson:** banning a reported user worked end to end, and the ban rate updated on the admin dashboard.

**Not verified:**
- The layout of the analytics screens on a phone or browser (the build compiles; only the ban flow was checked by hand)
- Performance (Q-04)
- The iOS and Android native builds

## 5. Metrics

Full definitions: `docs/ANALYTICS_API.md`.

| Scope | Available now | Available from 17 Sep 2026 (tracked) | Deferred |
|---|---|---|---|
| **Owner** | listings, active tenancies, current and average occupancy with change, monthly occupancy trend, offers by status, acceptance rate, tenants hosted and tenants in period with change, average tenancy length and distribution, rating, rent recorded and payments with change, monthly rent trend | new listings, offers sent / accepted, terminations, days on market, offers-sent change | — |
| **Listing** | occupancy status, average occupancy with change, monthly occupancy, offers, acceptance rate, tenancy, rent recorded and payments with change, rent trend | days on market (new listings), offers sent / accepted | listing views |
| **Platform** | users, listings, user distribution (owners only / tenants only / both / neither), bans and ban rate, flagged items by type, rental counts, acceptance and termination rates, rent recorded and payments with change, rent trend | new users and new listings with change, rental activity, days on market | report resolution rate |
| **Not built** | | | unique viewers, photo gallery views, conversion funnel, listing removal rate, system health |

**Coverage rule:** for a period starting before tracking, tracked metrics carry `coverage.complete = false` and the app shows "Tracked since 17 Sep 2026". For a period ending before tracking, they are unavailable, never 0.

**When the app's 3-month view becomes complete:**
- "Tracked since" disappears from **December 2026** (Oct–Dec starts after tracking).
- "vs previous period" first appears in **March 2027**: Jan–Mar's previous period (from 3 Oct 2026) is the first one fully after tracking started. Longer views take longer.

## 6. Differences from the handoff

- **Routes as proposed**, plus `GET /api/analytics/admin/summary`. No `POST /api/analytics/events`, because view tracking waits on a privacy decision.
- **Rent is reported as "rent recorded", not revenue.** Currency is SGD, confirmed by the team on 16 Sep 2026. Payment dates are billing months; there is no failed/refunded state; deposits and refunds are excluded. Amounts are whole-number `long`s, not floating point.
- **Offers are reported as rental-record counts by status**, since rejected offers are not recorded.
- **401 applies to `/api/analytics/**` only.** Other routes keep their existing 403, to avoid changing behaviour the frontend already handles.
- **The handoff assumed an existing migration mechanism; there wasn't one.** The team agreed `ddl-auto=validate` plus reviewed SQL files (`docs/db/README.md`).

## 7. Known issues left open (decided with Rayson)

| Issue | Impact | Status |
|---|---|---|
| `rentals` has `UNIQUE (listingid)` | A listing can only ever have one rental. It can't be re-rented after termination, and an unaccepted offer blocks it permanently. | Deferred. Needs a team decision on which rental counts as "current", then a non-additive schema change. |
| `PUT /api/users/id/{userID}` has no ownership check | Any logged-in user can change another user's email, which is effectively account takeover | Deferred; fix first before real users |
| Creating reviews and listings trusts the author/owner ID in the request | Users can post as someone else | Deferred |
| Rentals, payments, chat and requests trust client-supplied IDs | Various unauthorised actions via direct API calls | Deferred |
| No listing view tracking | Views and funnel unavailable | Needs privacy and retention decision (Q-07) |
| Q-04 performance not measured | No evidence for the 5-second target | Needs the team to adopt the protocol |
| Timestamps are `timestamp without time zone` | Correct only while every backend runs in Asia/Singapore time (same assumption as existing dates) | Documented |
| Reviews belong to users, not listings | No per-property rating | Documented |

## 8. For the reviewer

- **Start with:** `AnalyticsService.java` for metric definitions, `SecurityConfiguration.java` for access rules, then the three integration test classes.
- **Check permission rules in `SecurityConfiguration.java`:** raising a flag is open, acting on one is admin-only. This is deliberate, because the report features call the same `setFlag` endpoints.
- **Before running the branch against Supabase:** both SQL files are already applied, so a local backend with `validate` will start. Set `spring.jpa.hibernate.ddl-auto=validate` in your own `application.properties`.
- **Test logins:** admin `admin@gmail.com`; owner `superman@gmail.com` (8 listings, no rentals yet). Passwords are in the README.
