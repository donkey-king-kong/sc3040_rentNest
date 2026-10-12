# Profile Image Handling Troubleshoot

This note documents the shared profile/avatar image handling used across the React Native app.

## Purpose

Profile images are used in profile, chat, review, rental, and admin screens. These images should render consistently even when a stored URL is missing, malformed, or fails to load.

Use `frontend/RentNest/components/ProfileImage.jsx` for profile/avatar images instead of raw React Native `<Image>` when rendering a remote user image URL.

## Set Or Remove A Photo

- **Sign Up:** enter a URL in the **Photo URL** field, or leave it blank.
  The name appears as an inline placeholder, without a separate heading.
- **Edit Profile:** **Photo URL** is the last field, after Phone Number, and
  contains the stored URL. Paste a replacement to
  preview it, then choose **Update Profile**. A photo-only edit enables saving.
- Long photo URLs show their beginning when loaded or unfocused. Cursor movement
  is unrestricted while editing, and the full value is retained. The photo
  container clips its contents to the same rounded shape as the other fields.
- Both screens omit the "(optional)" label suffix and visible helper text.
  The field remains optional; validation errors and accessible hints remain.
- Clear the field and save to remove the photo and use your initials.
- Returning to Profile refreshes the saved details. Leaving without saving
  does not persist the draft. A failed save keeps your changes for retry.

Use a public HTTP or HTTPS image URL, up to 255 UTF-16 code units after trimming
surrounding whitespace. HTTPS is recommended: browsers or native transport
policies can block HTTP images. URLs must have a valid host, no login
credentials, no internal whitespace, and valid percent escapes. Image extensions
are not required. Length is validated, never silently truncated.

Saving checks URL syntax, not whether the remote host serves an image. Broken,
expired, or inaccessible images fall back to initials without blocking saving.
This feature accepts URLs only; it does not upload, crop, or host photos.

Use non-secret links. Image hosts receive client requests, and the existing
profile diagnostics below include URLs. Avoid private links or secret tokens.

## API Contract

`photoURL` remains the canonical field. No new column or migration is required;
the existing nullable JPA column length is explicitly 255.

| Request | Photo behavior |
| --- | --- |
| `POST /auth/signup`, JSON `photoURL` omitted/null/blank | Store null. |
| Signup with a valid `photoURL` | Trim and save the URL without rewriting encoding or case. |
| `PUT /api/users/id/{userID}`, query `photoURL` omitted | Preserve the existing photo, including legacy values. |
| Update with `photoURL=` or whitespace | Clear the photo to null. |
| Update with a nonblank `photoURL` | Validate and replace it. |
| Invalid supplied photo for an existing user | HTTP 400 with a readable `message`, without a partial update. |

Profile updates still require `name`, `email`, and `contact`. The frontend uses
Axios `params`, so nested query values such as `&`, `+`, `%`, and `#` are
transported correctly. Unchanged photos are omitted from updates, allowing
unrelated edits to accounts with legacy photo values. The server does not fetch
the remote URL. Existing response shapes and missing-user 404 behavior remain.

## Behavior

`ProfileImage`:

- Preserves newly valid URLs exactly after trimming, including Unicode,
  apostrophes, uppercase schemes, and encoded query data.
- Retains legacy cleanup for other stored values, extracting a clean HTTP(S)
  URL and removing common quote and backtick-like wrapper characters.
- Does not resize, downscale, or rewrite profile image dimensions.
- Logs permanent debug events for profile image lifecycle checks.
- Shows initials only when the URL is missing, malformed, or fails to load.
- Shows `?` if no user name is available for initials.

## Debug Logs

Expected log events:

```text
[ProfileImage] prepared
[ProfileImage] loaded
[ProfileImage] failed
```

Useful fields:

- `sanitizerVersion`: Version marker for the profile URL sanitizer.
- `screen`: Screen where the image is rendered.
- `userId`: User represented by the image, when available.
- `name`: User name used for initials fallback.
- `role`: Context such as `profile`, `owner`, `tenant`, `reviewer`, or `chat-partner`.
- `originalUrl`: Raw URL value received by the screen.
- `normalizedUrl`: Clean URL extracted before rendering.
- `renderedUrl`: URL passed to React Native `<Image>`.
- `nativeError`: Native image loading error when rendering fails.
- `originalBoundaryCharCodes`: First and last character codes of the raw URL.
- `renderedBoundaryCharCodes`: First and last character codes of the rendered URL.

## Fallback Rule

- Valid image URL loads successfully: show the image.
- Missing URL: show initials.
- Malformed URL: show initials.
- Failed image load: show initials.
- Missing name: show `?`.

Profile and Edit Profile no longer substitute a stock remote image for a missing
photo. Drafts use the same shared avatar component as existing avatar consumers.

## Regression Checks

From `frontend/RentNest`, run `npm run test:photo-url` on Node 22.7+ or Node 24
after installing the locked dependencies. The tests compile the real screen
components in memory using Babel and mount them with the installed React
renderer, mocking native components, navigation, storage, and HTTP requests.
No test calls the shared database.

The focused suite covers signup validation/payloads, save locking and failures,
photo-only edits, clearing, saved baselines, unchanged legacy URLs, focus refresh,
stale results, and image-error recovery. It also mirrors the backend validator
fixtures. It does not replace browser/native rendering or live-database checks.

After the field presentation update, all 81 focused tests passed, including
inline signup labeling, removal of visible helper text, and Photo URL appearing
last in Edit Profile. Isolated web layout checks at 390x900 and 1440x900 passed
for both screens, with no runtime page errors or photo input clipping. Screenshots
were inspected; native keyboard and screen-reader checks were not performed.

The rounded-clipping and URL-prefix follow-up passes all 82 focused tests.
At 390x900 and 1440x900, browser checks moved the cursor to the end, blurred the
field, and confirmed selection and horizontal scroll returned to zero without
changing the URL. Before-change Android captures reproduced the square corners
and trailing URL. Post-change Android visual confirmation is still outstanding:
the emulator session changed screens, and the isolated debugger fixture could
not connect. Web captures do not certify the Android shadow fix.

### Sign-Up Layout

The heading, five fields, validation messages, Sign Up button, and sign-in link
share one scrollable column. The column is vertically centered when it fits and
scrolls on shorter screens. Navigation supplies the top safe area; the column
keeps bottom safe-area padding. iOS uses keyboard padding with the actual top
inset, while Android relies on window resizing instead of an extra height offset.

All 85 focused tests pass, including layout structure and focus stability for
iOS, Android, and web configurations. Browser checks at 390x900, 320x640, and
1440x900 verified centering where space permits, unchanged field-to-button spacing
on focus, and button reachability after resizing to 400px height. No page errors
occurred. Android Expo Go captures confirmed centering and focus without losing
fields. The emulator did not display its software keyboard, so IME-open behavior
is not certified; its original keyboard setting was restored. iOS, tablet,
large-text, and physical-device keyboard checks remain outstanding.

The isolated browser flow passed signup/login, image loading, full URL
preservation, clear/save, returning to Profile with initials, reopening with an
empty field, and invalid-URL feedback. All API requests in that final flow used
the in-memory mock. The layout was checked at 566x940; desktop comparison and
native device interactions were not performed.

Backend tests: `PhotoUrlValidatorTest`, `PhotoUrlServiceTest`,
`PhotoUrlBindingTest`, and `PhotoUrlPersistenceTest`. The persistence tests use
isolated H2 and check save/reload/clear and the 255-character column boundary.
Deployed PostgreSQL metadata still requires confirmation before release.

The general frontend Jest preset currently fails because
`@react-native/jest-preset` is missing; the focused Node test command does not
depend on that preset. Native device behavior remains a separate release check.

If the photo field is missing in a running app, confirm Expo is serving this
worktree, then restart with `npm run web -- --clear`. When changing
`EXPO_PUBLIC_API_BASE_URL`, clear the bundle cache and verify the actual request
destination before submitting a test account. Use isolated data for validation.

## Current Usage

`ProfileImage` is used for user avatars/profile images in:

- Profile and edit profile screens.
- Chat list and chat detail avatars.
- Listing detail owner and reviewer avatars.
- Rental owner and tenant avatars.
- Tenant overview avatar.
- User review avatars.
- Admin flagged user and review/listing owner avatars.

## Future Checklist

- Use `ProfileImage` for remote user/profile/avatar URLs.
- Do not add profile-image resizing unless product requirements change.
- Keep `[ProfileImage]` logs permanent for debugging.
- Keep `photoURL` as the canonical backend user profile image field.
- Prefer initials fallback over default remote avatar images.
