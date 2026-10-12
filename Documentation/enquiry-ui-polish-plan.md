# Enquiry UI Refinement

Status: standalone listing card implemented following the user's latest approval.
Branch: `listing-enquiries-rental-history`.

## Final Scope Override

After retaining the new pre-send preview and initially restoring the original
sent layout, the user supplied a new reference and approved a standalone
listing card above a separate message bubble. This latest approval supersedes
the unified-card design and UI-02 ticket below, retained as historical context.

- Retained the compact draft, composer spacing, accessible controls and
  keyboard/safe-area handling.
- Sent/received enquiries show a standalone name/address card with a full-width
  outlined "View listing" button, with a minimum 44-point touch target.
- Enquiry text remains in a separate blue outgoing or grey incoming bubble.
  Sender alignment, owner Offer this property, timestamps and delivery states
  remain intact. The card and text still represent one stored message.
- Deleted listings retain snapshots and unavailable copy without actions.
- No photo, price, property type, beds, bathrooms or size is added.
- No data contracts, saved snapshots, backend or database changes.
- Final regression run: all 76 frontend tests pass, including the restored blue
  sender bubble, card/bubble separation, navigation, owner offer selection,
  draft removal and retry.
- Earlier unified-card screenshots/review do not certify this final version.
  Native keyboard and accessibility verification remain outstanding.
- Current isolated Expo web checks passed at 320, 390, 768 and 1440 px with no
  horizontal page overflow or runtime page errors. Buttons measured 44 px high;
  received owner action and deleted-listing state passed. Current phone and
  desktop captures were visually inspected.

### Revised UI-02: Standalone Listing Card

- Owner: Senior Frontend Engineer. Priority: P2.
- Scope: separate saved listing preview from the enquiry text bubble; change
  View listing to a full-width outlined button; preserve the approved draft.
- Dependencies: completed UI-01 and explicit approval of the reference layout.
- Implementation notes: reuse snapshot props and existing navigation/offer
  callbacks; render a card and bubble as siblings without creating extra messages.
- Acceptance: name/address only; card outside the bubble; blue outgoing and grey
  incoming text; owner action and unavailable state preserved.
- Validation: QA regression tests pass for separation, both sender directions,
  navigation, deleted records and offer selection; inspect current rendered web
  output at phone, intermediate and desktop widths. Report native gaps.
- Documentation impact: update the feature guide to this final presentation;
  do not refresh the historical full-source export.

## Product and Scope

Product Owner priority: P2. Make it immediately clear which property a draft
and a sent enquiry refer to, with substantially better composition and readability.
Audience: prospective tenants composing enquiries and owners reading/responding.
Visitor mode: Operate. Name and address only, as explicitly selected by the user.

Keep current backend contracts, historical snapshots, offer eligibility,
one conversation per pair and multiple listing enquiries in that conversation.
No photos, price, property statistics, new database columns, new API calls,
automatic messages, seed data, payment changes or broad chat-screen redesign.

## Evidence and Architecture

The user's two current native screenshots are the visual baseline. They match
the current source: `EnquiryPreview.jsx` is reused for both draft and message,
and `ChatsScreen2.jsx` nests that green panel inside a padded blue/grey bubble.
The combination duplicates padding, consumes width and gives the property
panel more visual weight than the enquiry text.

Source inspected: README, existing enquiry deployment guide, EnquiryPreview,
ChatsScreen2 composer/message rendering/styles, and ListingEnquiries tests.
HomeListingScreen navigation and the existing route/API data flow stay unchanged.
Draft uses fetched name/location; saved enquiries use immutable name/address
snapshots. Deleted listing references remain null without losing their text.

Design authority: preserve the established app identity and ordinary chat
bubbles. Use existing typography, dark text, restrained green accents and neutral
surfaces, but replace the enquiry's nested-box composition. No new global design
system or fabricated product context.

## UX Direction

### Before Sending

- A compact quoted-property strip visually joined to the composer, not a large
  standalone green panel.
- A quiet "Enquiring about" label, clear semibold property name, secondary
  address and a separate dismiss control with a 44-point minimum hit area.
- Use a small property icon and restrained green accent, no oversized decoration.
- The draft remains visibly unsent. Dismiss removes only the attachment and
  preserves typed text. Sending and keyboard-submit keep existing semantics.
- Wrap long content naturally; do not hardcode card height or rewrite addresses.
- Keep the composer above the home indicator and keyboard. Scope any layout
  adjustment to the chat input area, verifying existing ordinary-message use.

### After Sending

- One coherent enquiry message surface, not a green card nested in a blue bubble.
- Property header: subtle tinted/neutral background, small "Property enquiry"
  label, semibold name, secondary address and a chevron indicating navigation.
- Make the complete property header the accessible View property target.
  Keep navigation separate from the owner's offer action; no nested pressables.
- Message text sits immediately below the header, separated by a fine divider,
  with dark readable text. Sender direction uses alignment and a restrained
  border/tint; existing ordinary text bubbles remain unchanged.
- On the owner's received card, keep "Offer this property" as a quiet but clear
  separate action. Its eligibility check and preselection behaviour do not change.
- Timestamp stays outside; sending/failed/retry feedback remains legible and
  attached to the correct message, not folded into property navigation.
- Deleted-property header keeps name/address and "Listing no longer available";
  remove the chevron and navigation/offer actions. Preserve plain legacy messages.

## Tickets

### UI-01: Compact Draft Attachment
- Owner: Frontend Engineer. Priority: P2.
- Scope: dedicated draft variant in EnquiryPreview, composer integration and
  targeted safe-area/keyboard accommodation if needed.
- Dependencies: approval of this plan.
- Implementation notes: reuse existing props/data; no change to send payload;
  preserve draft through failure, clear only on success, isolate chat switches.
- Acceptance: clearer hierarchy, no blank action row, no overlap with input or
  home indicator, long name/address readable, removal preserves typed message.
- Validation: focused component tests for open/no-send/remove/retry/switch;
  QA checks draft layout before moving to UI-02.
- Documentation impact: draft preview description in existing feature guide.

### UI-02: Unified Sent and Received Enquiry
- Owner: Senior Frontend Engineer. Priority: P2.
- Scope: dedicated enquiry-message rendering in ChatsScreen2 and shared property
  header variant; ordinary messages and rental/termination cards stay unchanged.
- Dependencies: UI-01 shared presentation API and its QA pass.
- Implementation notes: select enquiry rendering from saved snapshot presence,
  including when listingId is null; keep one message ID and existing retry logic.
- Acceptance: no nested coloured boxes, distinct property/message hierarchy,
  correct property navigation and owner-only offer action, readable unavailable
  and delivery states, independent A/B enquiries preserved.
- Validation: component tests for both directions, two properties, deleted and
  legacy records, navigation, offer preselection and failure/retry; QA checks ticket.
- Documentation impact: sent-card layout and actions.

### UI-03: Visual and Regression Validation
- Owner: QA Engineer. Priority: P2.
- Scope: per-ticket validation plus combined composer-to-sent-card inspection.
- Dependencies: starts after UI-01, repeats after UI-02; final combined gate.
- Implementation notes: use existing tests and isolated synthetic fixtures;
  never send test enquiries to shared Supabase. Do not recreate deleted temporary
  test utilities; use existing available tooling or a separately scoped harness.
- Acceptance: no changed send/offer contracts; navigable controls and readable
  content; no clipping at representative phone/tablet/web widths or enlarged text.
- Validation: full existing termination/enquiry Jest suite; native simulator or
  device if available, otherwise explicitly report native keyboard/safe-area
  verification as pending. Web checks at 390, 768 and 1440 px; native portrait
  and landscape where available. Inspect loading, empty draft, failed send,
  deleted listing, long title/address and short message. One batched initial
  visual pass, one combined fix batch, at most one confirmation pass.
- Documentation impact: actual evidence and platform limitations, not inferred
  native success from web screenshots. Impeccable finish review after verification.

### UI-04: Handoff
- Owner: Technical Writer. Priority: P2.
- Scope: update listing-enquiry-offer-guide.md with revised presentation and QA.
- Dependencies: validated UI-01/UI-02 and UI-03 results.
- Implementation notes: no migration instructions change; do not rewrite the
  prior full-source export, which is a historical snapshot.
- Acceptance: guide matches visible behaviour and accurately states test limits.
- Validation: compare guide against implementation and QA evidence.
- Documentation impact: small addition to the existing feature guide.

## Execution and Approval

Product Owner owns scope; UI/UX Designer owns hierarchy and interaction;
Software Architect keeps contracts unchanged; Tech Lead coordinates the tickets.
These are role assignments, not a claim that separate agents have been launched.

Sequence: approve -> UI-01 -> QA -> UI-02 -> QA -> combined verification and
Impeccable finish review -> UI-04. Do not commit or push unless requested.

Open product questions: none. The original proposal was approved; the final
scope override above records the user's subsequent visual preference.
Native test tooling availability is a verification constraint, not a product
decision; it will be checked during execution and any gap reported.
