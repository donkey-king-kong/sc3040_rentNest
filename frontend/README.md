# Frontend

## Profile Photo URLs

Sign Up and Edit Profile now include **Photo URL (optional)**. Paste a public
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
Retry, timeout, and rendering behavior are unchanged.

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
The standard Jest runner currently requires the missing `@react-native/jest-preset`
dependency; the focused checks used the installed React renderer with mocked services.
Web keyboard behavior and iOS interaction still require platform verification.
