# corporate_book_card

HubSpot custom card that renders on the **Ticket** record and triggers the
Corporate Book document packet generation in the sibling Laravel backend
(`~/Code/kkos_lawyers`, route
`POST /api/v1/intake/packet/corporate-book/generate`,
`IntakePacketController::generateCorporateBook()`).

## Card behavior

- Location: `crm.record.tab` (appears as a tab on the ticket record)
- Object type: HubSpot Tickets (`0-5`)
- Renders a single primary button **"Generate Corporate Books"**.
- On click, POSTs `{ ticketId }` directly to the Laravel endpoint via
  `hubspot.fetch(...)`. No HMAC signing (endpoint is public).
- On success (`200`), links out to the merged PDF in Box
  (`https://app.box.com/file/{merged_pdf.file_id}`) and calls
  `refreshObjectProperties()` so other ticket cards pick up any updated
  associations.
- On non-`200`, the backend's `message` field is surfaced verbatim in an inline
  alert and as a danger toast.
- Outbound request has a 90-second `AbortController` timeout — corporate book
  generation is slow.

## Why the card sends only `ticketId`

This portal's HubSpot plan does not include serverless (app) functions, so the
ticket → deal → intake walk cannot happen inside a HubSpot function. The
Laravel backend already has HubSpot credentials, so the walk moves there.

## Required backend change (Laravel side)

`~/Code/kkos_lawyers`, `IntakePacketController::generateCorporateBook()` — the
endpoint currently accepts `{ intakeId, formType, entityType, boxFolderId,
docgenFolderId? }`. It needs to also accept `{ ticketId }`. Suggested behavior
when `ticketId` is present:

1. Walk **ticket → deal → intake** via the HubSpot v4 associations API. The
   intake custom object type id is `2-57729126`.
2. Read `hs_object_id`, `intake_form_type`, `entity_type`, and
   `customer_box_account_id` (this holds the customer's root Box folder id) from
   the intake.
3. Validate — `entity_type` must equal `'llc'` and `customer_box_account_id`
   must be non-empty. On failure, return a `422` with a `message` describing
   which check failed (the card renders it verbatim).
4. If `corporate_book_packet_id` is already set on the intake, allow the call
   through — the frontend has been told this is a warn-only condition, so any
   overwrite protection here should be opt-in (`?force=true` or similar).
5. Run the existing corporate book generation using the resolved fields.
6. Return the same 200-shape as today:
   `{ success, docgen_folder_id, merged_pdf: { file_id, name }, filled_docs: [...] }`.
   On failure, `{ message }`.

Until this backend change ships, the button will fail on any click with
whatever error the current endpoint returns for a missing `intakeId`.

## Required secrets

None — the card only calls the public Laravel endpoint.

## Deploy

From this project directory:

```sh
hs project upload
```
