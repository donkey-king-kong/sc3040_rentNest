# User Photo URL Fix Plan

Status: Approved and implemented. Per-ticket automated QA, isolated browser
cross-flow checks, production web build, and documentation QA completed.
Native-device and deployed-database release checks remain unverified.

## Execution Record

- PHOTO-01: implemented. Independent QA reproduced 93 passing backend tests,
  including 79 new photo tests and 14 existing auth/user/JWT regressions.
- PHOTO-02: implemented. QA passed 15 mounted signup checks.
- PHOTO-03: implemented. QA passed 27 mounted profile/avatar checks; another
  37 checks cover shared URL validation and backend fixture parity.
- PHOTO-04: automated cross-flow checks and isolated browser flow passed.
  Browser signup/login, image loading, exact URL preservation, clear/save,
  Profile focus refresh to initials, reopening with an empty field, and inline
  invalid-URL feedback passed. All API requests in this final flow used the
  in-memory API at port 18080.
- PHOTO-05: usage/API documentation updated and independently passed QA.
- UI detector returned no findings for the four changed UI files.
- Tech Lead decision: proceed with local implementation on the unchanged
  nullable JPA 255-character contract, verified in isolated H2. Deployed schema
  metadata is unavailable and remains a release check, not a claimed pass.
  No migration was performed; automated tests used mocks or isolated H2.
- Existing full Jest command fails because `@react-native/jest-preset` is
  missing. Added `npm run test:photo-url` using installed Babel/React renderer
  with Node's test runner, without changing dependencies.
- Tests and runtime checks do not claim a fix for the pre-existing profile
  ownership-authorization gap. Track that separately before production release.
- Production Expo web export passed; seven existing pricing-diagnostic
  regression tests also passed.
- Rendered signup layout checked at 566x940. Browser email typing required a
  native input-event workaround for a tool `selectionEnd` error. Desktop
  comparison and Android/iOS interaction were not performed. The mock API's
  empty recommendations response caused an unrelated Home alert; the requested
  profile workflow passed.
- Browser QA environment incident: the first browser attempt rendered an old
  signup screen and sent a successful signup for `qa-photo@example.com` to
  port 8080 rather than the intended mock API at 18080. Testing stopped before
  login or further mutations. Port 8080 belongs to an already-running backend
  in the sibling `sc3040_rentNest` workspace; its datastore is unverified.
  The account has not been deleted. The user was notified. Further browser QA
  used a fresh static build/port with a CSP allowing only the isolated API.

## Product Summary

Users can optionally supply a profile photo URL during signup and add, replace,
or remove it in Edit Profile. Saved changes appear when returning to Profile,
without restarting the app.

Product Owner priority: P2 (normal). This completes an existing user-data
capability; it is not an authentication outage.

User stories:
- As a new user, I can enter a photo URL or skip it when creating my account.
- As an existing user, I can change or clear my photo without changing other details.
- As a user, I can see my saved photo, or initials if no usable image is available.

Out of scope: file uploads, camera/gallery selection, cropping, image hosting,
image processing, broad redesign, and unrelated authentication refactoring.

## Current Evidence

- `RentNest/src/main/java/RentNest/model/User.java` already has nullable `photoURL`.
- `RegisterUserDto` and `AuthenticationService.signup` do not accept/save it.
- `UserController.updateUser` and `UserService.updateUserData` only update
  name, email, and contact.
- `frontend/RentNest/app/SignUpScreen.jsx` has no photo field.
- `EditProfileScreen.jsx` loads a photo but has no editable photo state,
  excludes it from dirty detection, and does not reset saved field baselines.
- `ProfileScreen.jsx` fetches only on mount, so returning from editing can show
  stale information.
- Both profile screens substitute a hardcoded remote image for absent URLs.
- `components/ProfileImage.jsx` already supports URL changes and initials
  fallback. Its permissive legacy sanitizer is not a new-input validator.
- `Documentation/Troubleshooting/profile-images.md` defines `photoURL` as
  canonical and prefers initials over default remote images.

## Architecture And Contract

Keep the existing React Native/Expo screens and Spring Boot endpoints.
Reuse the existing database column and avatar component.

| Operation | Proposed behavior |
| --- | --- |
| `POST /auth/signup` | Add optional JSON property `photoURL`. Omitted, null, or blank stores no photo. |
| `PUT /api/users/id/{userID}` | Add optional query parameter `photoURL`; preserve existing required name/email/contact parameters. |
| Update with photo omitted | Preserve the stored photo for older clients. |
| Update with empty/whitespace photo | Clear the stored photo to null. |
| Update with nonblank photo | Validate and replace it. |
| Invalid supplied photo | Return HTTP 400 with a readable `message`; do not partially update the user. |
| Successful reads/writes | Preserve existing response shapes, including canonical `photoURL`. |

Validation for newly supplied values:
- Trim surrounding whitespace.
- Accept absolute HTTP or HTTPS URLs with a valid host; recommend HTTPS in copy.
- Reject embedded credentials, unsupported schemes, malformed escapes, and
  internal whitespace. Do not require an image-file extension.
- Preserve URL path/query encoding; use Axios `params` for profile-update
  query encoding rather than concatenating a raw URL.
- Propose a 255-character normalized limit, matching the entity's default JPA
  column length. Confirm actual deployed capacity before implementation.
  Never silently truncate. Longer signed URLs would require a revised storage
  decision and potentially a migration.
- Do not fetch or validate image reachability on the server. A broken or
  inaccessible image must not make signup or saving depend on an external host.

No schema migration is expected for this bounded change, subject to confirming
column capacity. Existing unrelated photo values are not migrated or rewritten.
When editing other details without changing a legacy photo, omit `photoURL`.

## UX Brief

Mode: Operate. Preserve the existing screen identity and form patterns.

- Signup: add a clearly labelled "Photo URL (optional)" field after contact.
  Keep the existing required fields and signup-to-login flow unchanged.
- Edit Profile: prefill the exact stored photo value, with an empty value for
  no photo. Add the field near the existing avatar and preview valid draft
  URLs using `ProfileImage`; do not save until Update Profile is pressed.
- Helper copy: "Paste a public image URL. Leave blank to use your initials."
  Editing also makes clear that clearing the field removes the saved photo.
- Disable autocorrect and auto-capitalization. Provide an accessible label,
  URL-friendly keyboard, and inline text errors, not color-only feedback.
- Missing, broken, or inaccessible images show initials. Image-load failure
  does not block saving a syntactically valid URL.
- A photo-only change enables Update Profile; reverting disables it.
  Successful saving resets the saved baseline, including name/contact.
  Failed saving retains the draft for retry.
- Prevent duplicate saves and edits racing with an active save.
  Back without saving does not persist a draft.
- Refresh Profile on focus with stale-response/unmount protection.
- Preserve keyboard access and scrolling on small screens.

## Tickets

### PHOTO-01: Accept And Persist Photo URLs

- Owner: Backend Engineer; Software Architect reviews the contract.
- Priority: P2.
- Scope: registration DTO/service, profile-update controller/service, shared
  input validation, focused backend tests.
- Dependencies: plan approval; confirm column capacity using schema metadata
  without changing shared data.
- Implementation notes: preserve omission-versus-empty semantics; validate
  before mutating the entity; map validation errors to HTTP 400; preserve
  missing-user behavior and existing clients.
- Acceptance criteria: signup stores an optional photo; update can preserve,
  replace, and clear it; invalid input is rejected without a partial save;
  older requests without a photo still work.
- Validation steps: validator and service unit tests; HTTP-binding tests for
  JSON casing and omitted/empty parameters; encoded query round-trip tests;
  isolated persistence save/reload/clear check; existing auth/user regressions.
- Documentation impact: document API contract, length, validation, and clearing.
- QA gate: QA Engineer validates this ticket immediately when marked complete.

### PHOTO-02: Add Optional Signup Input

- Owner: Frontend Engineer; UI/UX Designer reviews field behavior.
- Priority: P2.
- Scope: signup field/state, validation, submission payload, focused tests.
- Dependencies: PHOTO-01 contract and backend QA gate.
- Implementation notes: match current form styling and error flow; validate
  new input consistently with the backend; preserve existing submit locking.
- Acceptance criteria: blank and valid values allow signup; invalid values show
  a useful error; submitted `photoURL` survives login and profile retrieval;
  required-field, duplicate-email, and login redirect behavior is unchanged.
- Validation steps: input/payload tests, invalid and blank cases, duplicate
  submit/network failure cases, narrow viewport and keyboard checks.
- Documentation impact: explain optional photo entry at signup.
- QA gate: QA Engineer validates independently before closing the ticket.

### PHOTO-03: Edit, Preview, And Refresh Photos

- Owner: Senior Frontend Engineer; Frontend Engineer may assist.
- Priority: P2.
- Scope: photo draft in Edit Profile, preview, clearing, dirty/save state,
  Profile focus refresh, removal of hardcoded remote defaults in these screens.
- Dependencies: PHOTO-01 contract and backend QA gate.
- Implementation notes: distinguish persisted state from display fallback;
  use the successful API response to reset baselines; omit unchanged legacy
  photo values; refresh on focus without applying stale results.
- Acceptance criteria: photo-only edits save; clearing persists null and shows
  initials; reverting disables Save; success resets dirty state; failure
  retains draft; returning to Profile shows saved data; reopening edit shows
  the saved value; unsaved back navigation changes nothing.
- Validation steps: screen/state tests; save/reopen/return flow; broken image
  then valid image recovery; no-photo and legacy-value cases; slow or failed
  requests; repeated navigation; mobile keyboard and web focus checks.
- Documentation impact: describe changing/removing a photo and refresh behavior.
- QA gate: QA Engineer validates immediately on completion, including its API
  integration, without waiting for the documentation ticket.

### PHOTO-04: Cross-Flow Regression Validation

- Owner: QA Engineer; Tech Lead resolves defects and release decisions.
- Priority: P2.
- Scope: integrate per-ticket evidence and validate complete user journeys.
- Dependencies: PHOTO-01 through PHOTO-03 have passed their individual gates.
- Implementation notes: use mocked or isolated fixtures first; shared database
  writes require an approved test account/environment. Do not use real-user data.
- Acceptance criteria: signup -> login -> profile -> edit -> return -> reopen
  passes for adding, replacing, and clearing; unrelated profile fields remain
  correct; a representative existing avatar consumer still renders correctly.
- Validation steps: run the matrix below; record pass/fail/untested by platform
  and separate new failures from baseline tooling failures.
- Documentation impact: concise validation results and known limitations.

### PHOTO-05: Update Usage And API Notes

- Owner: Technical Writer; QA Engineer checks factual accuracy.
- Priority: P2.
- Scope: update `Documentation/Troubleshooting/profile-images.md` and the
  frontend README with the new workflow and request semantics.
- Dependencies: PHOTO-01 through PHOTO-03 behavior settled; PHOTO-04 results
  available before final handoff.
- Implementation notes: retain existing image-diagnostic guidance; describe
  public non-secret URLs, fallback, clearing, length, and platform limitations.
- Acceptance criteria: docs match implemented behavior and verified tests;
  do not imply upload support or successful unperformed platform checks.
- Validation steps: Technical Writer walkthrough against actual screens and
  API tests; QA documentation check immediately on completion.
- Documentation impact: this ticket owns the final user/developer handoff.

## Execution Sequence

Tech Lead coordinates after approval:

1. Confirm storage capacity and complete PHOTO-01, then its QA gate.
2. PHOTO-02 and PHOTO-03 can proceed independently, each with immediate QA.
3. Complete PHOTO-04. Documentation drafting may overlap settled behavior.
4. Complete PHOTO-05 and its QA check; hand off only with remaining limitations
   explicitly recorded.

## Test Plan

Core cases:
- Signup with omitted, null, blank, valid HTTP, and valid HTTPS photo values.
- Update preserving, adding, replacing, clearing, and reverting a photo.
- URL with query parameters, `&`, `+`, `%`, and `#` round-trips without corruption.
- Relative URL, unsupported schemes, missing host, credentials, malformed
  escapes, whitespace, and 255/256-character boundaries.
- Invalid photo does not mutate name, email, contact, or persisted photo.
- Existing account with no photo; unchanged legacy photo; unavailable image;
  failed image followed by a working URL; missing name fallback.
- Successful save resets button state; failure retains draft; rapid repeat
  submission does not duplicate requests; focus refresh ignores stale results.
- Existing signup validation, duplicate-email handling, profile name/contact
  edits, and an existing avatar consumer remain functional.
- Desktop web keyboard/screen-reader labels and narrow viewport scrolling;
  Android and iOS keyboard/scroll behavior where devices are available.

Planned commands:

```bash
# Repository root; include newly added test classes in the focused run.
mvn -f RentNest/pom.xml -Dtest=AuthenticationControllerTest,UserControllerTest test
mvn -f RentNest/pom.xml test

# frontend/RentNest
npm test -- --watchAll=false --runInBand
npm run web
npm run android
npm run ios
```

Existing backend controller tests mock services, so they alone cannot prove
binding or persistence. Add focused tests for those boundaries. The frontend
README records a Jest preset setup issue; perform a bounded setup check and
report any runner limitation rather than claiming the screens are covered by
unrelated pricing tests. Do not silently expand into a dependency-upgrade project.
Live database schema and runtime behavior have not been inspected in this plan.

## Risks And Approval Assumptions

- Proposed defaults for approval: optional URL-only input, HTTP(S) accepted,
  255-character normalized limit, clearing supported, edit preview included.
- HTTPS is recommended because HTTP images may be blocked by browser mixed
  content or native transport rules. Saving a valid URL does not guarantee
  the host permits external image loading.
- Use public non-secret URLs. Image hosts receive client requests, and existing
  avatar diagnostics log photo URLs; signed/private links can expose tokens.
- Existing profile-update authorization checks authentication but not ownership
  of the target user ID. This is a pre-existing issue, not fixed by adding a
  photo field. Tech Lead must flag it in release readiness and track a separate
  authorization fix; this plan must not be presented as security hardening.
- Open storage question: does the deployed column permit 255 characters or
  more? Confirm before implementation; revise the plan if longer URLs are needed.
- Open test-environment question: which isolated account/database and native
  devices are available? Mocked checks can proceed without shared-data writes.

Approval received. This document retains the approved scope and assumptions;
the execution record above distinguishes completed checks from release checks.
