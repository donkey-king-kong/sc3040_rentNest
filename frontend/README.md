# Frontend

## Property Type Filter

The home screen's advanced-filter dropdown opens in a transparent overlay anchored
to the Property type field. Opening it does not move the sort controls or listings.
Options appear below the field, or above it when there is more room there; the
menu scrolls when the available space is limited.

Select an option to update the field and close the menu. Tap outside to dismiss
without changing the selection or activating the content behind it. Android Back
also dismisses the menu. Search and Reset retain their existing behavior.

### Regression Checks

- Open and close the menu repeatedly; the sort controls and listings must not move.
- Select each property type; confirm the field updates and the menu closes.
- Check outside-tap and Android Back dismissal.
- Hide and reopen advanced filters; the menu should start closed.
- Reset after selecting a type; the field should return to All property types.
- On web, check keyboard selection and Escape dismissal. On small screens, check
  menu placement and scrolling without clipping.

Android emulator interaction checks and before/after layout comparisons passed.
Web keyboard behavior and iOS interaction still require platform verification.
