# Frontend

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
