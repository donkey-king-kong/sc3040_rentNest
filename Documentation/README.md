# Documentation

Start with the [project setup](../README.md) and [frontend guide](../frontend/README.md).
This directory groups operational guides, feature documentation, supporting data,
and historical plans. Paths in shell examples are relative to the repository root
unless the guide specifies another working directory.

## Find What You Need

| Folder | Contents |
| --- | --- |
| [Features](Features/) | Feature behavior, APIs, and deployment notes |
| [Troubleshooting](Troubleshooting/) | Debugging, logging, and performance guides |
| [Database](Database/) | Audit and data-maintenance guides, grouped with their SQL and datasets |
| [Plans](Plans/) | Planning records, scope decisions, and validation history |
| [Reference](Reference/) | Historical source snapshots, not authoritative application source |
| [Assets](Assets/) | Images used as documentation references |

## Features

- [Listing enquiries, offers, and rental history](Features/listing-enquiry-offer-guide.md)
- [AI fair-pricing model](Features/AI_Fair_Pricing_Model.md)
- [Listing AI summary removal and deployment](Features/listing-summary-removal.md)
- [Lease termination workflow and frontend behavior](../frontend/README.md#lease-termination)

## Troubleshooting

- [Inbox performance, cache behavior, and frontend/backend logs](Troubleshooting/inbox-performance.md)
- [Owner rental detail performance, payments, and diagnostics](Troubleshooting/rental-detail-performance.md)
- [Chat and listing detail performance, pagination, and AI timeouts](Troubleshooting/chat-listing-performance.md)
- [Price insights and AI diagnostics](Troubleshooting/price-insights.md)
- [Listing images](Troubleshooting/listing-images.md)
- [Profile images](Troubleshooting/profile-images.md)

## Database Operations

Read the [schema and migration policy](../docs/db/README.md) before changing the
database. Moving these files does not mean their scripts should be rerun.
Seed/update scripts can modify shared data; follow each guide's prerequisites,
backup requirements, dry-run controls, and warnings.

| Topic | Start Here | Supporting Files |
| --- | --- | --- |
| Read-only audits | [Audit guide](Database/Audits/database-audit-guide.md) | [Audit SQL](Database/Audits/database-read-only-audit.sql) |
| Existing demo listing updates | [Listing variation guide](Database/Listings/listing-variation-guide.md) | [Listing scripts, previews, and datasets](Database/Listings/) |
| Fresh listing imports | [Backed-up listings](Database/Listings/listing-reseed-guide.md), [50 demo listings](Database/Listings/demo-listings-50-guide.md) | [Listing import assets](Database/Listings/) |
| Enquiry discussions | [Discussion guide](Database/Enquiries/enquiry-discussions-guide.md) | [Preview](Database/Enquiries/enquiry-discussions-preview.md), [JSON](Database/Enquiries/enquiry-discussions.json), [SQL](Database/Enquiries/seed-enquiry-discussions.sql) |
| Historical rentals and payments | [Rental history guide](Database/Rentals/historical-rentals-guide.md) | [Preview](Database/Rentals/historical-rentals-preview.md), [JSON](Database/Rentals/historical-rentals.json), [SQL](Database/Rentals/seed-historical-rentals.sql) |
| Missing amenities | [Backfill guide](Database/Amenities/amenities-backfill-guide.md) | [Inventory SQL](Database/Amenities/amenities-backfill-inventory.sql), [baseline JSON](Database/Amenities/amenities-before.json), [recorded CSV](Database/Amenities/amenities-backfill-20261012-153212.csv) |

In particular, do not rerun the original enquiry-discussion seed after applying
the historical rental/payment batch. The guides explain the ordering and refusal
conditions. Existing inventories and previews are dated records, not live state.

## Plans and Decisions

Plans preserve the scope and assumptions at the time of the work. Prefer the
feature and troubleshooting guides for current usage, and verify against source
where a historical plan differs.

- [Listing enquiries and offers](Plans/listing-enquiry-offer-plan.md)
- [Enquiry UI refinement](Plans/enquiry-ui-polish-plan.md)
- [Lease termination](Plans/termination-workflow-plan.md)
- [Listing reseed](Plans/listing-reseed-plan.md)
- [Enquiry discussion seed](Plans/enquiry-discussion-seed-plan.md)
- [Historical rental/payment seed](Plans/historical-rental-payment-seed-plan.md)

## Reference and Assets

- [Historical chat and listing source snapshot](Reference/chat-and-listing-full-source.md):
  retained for context; current source lives in `frontend/RentNest/app`.
- [Overview image](Assets/Overview.png)
- [Legacy reference image](Assets/img.png)

## Keeping This Organized

Keep a database operation's guide, SQL, preview, and dataset in the same topic
folder. Put new plans in `Plans`, debugging notes in `Troubleshooting`, and
feature contracts in `Features`. Add an entry here when adding a new topic.
Keep temporary scripts, test outputs, and caches outside this documentation tree.
