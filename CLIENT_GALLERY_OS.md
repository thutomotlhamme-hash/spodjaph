# Spodja Client Gallery OS

Date: 27 August 2026

This is Spodja PH's first-party client delivery system. Pixieset was used as a product benchmark for useful client-gallery capabilities, not as a source-code or visual clone.

## Client journey

**BOOK → PAY / RESERVE → SHOOT → SNEAK PEEK → PROOF → FAVORITES → ALBUM / PRINT SELECT → BALANCE → FINAL → SHARE → REORDER**

A gallery can move through `draft`, `sneak_peek`, `proofing`, `final` and `archived` states while retaining the same client journey.

## Client-facing capabilities

- Premium collection cover and editorial gallery layout
- Sets / tabs inside a collection
- Full-screen viewer and slideshow
- Optional email registration before access
- Multiple favorite lists such as My Favorites, Album, Prints or Retouch
- Per-photo notes
- Selection submission back to Spodja
- Native share and WhatsApp-first share
- Quick Share: create a separate expiring link that contains selected images only
- Individual web / high-resolution downloads
- Download PIN gate
- Batch delivery with ZIP files generated in the browser from server-authorized files
- Payment-aware download gate
- Gallery expiry handling
- Add-to-home-screen / PWA experience
- Print Room products, coupon entry and server-persisted order requests
- Activity capture for opens, selections, shares, unlock attempts, downloads and orders

## Spodja-specific upgrades

1. **Booking/payment-aware delivery.** A gallery can know whether a client is untracked, deposit-paid, paid in full or on approved PO terms.
2. **Lane-specific commercial gates.** Wedding deposits can reserve coverage with the remaining wedding balance due on the configured deadline, including the agreed event-date + 3-day exception where applied. Other consumer lanes can keep final settlement before coverage.
3. **WhatsApp-first sharing.** Sharing is designed around the way Spodja clients actually send work to family, planners, venues, suppliers and agencies.
4. **Purposeful selections.** Favorite lists can become album briefs, print selections or retouch queues instead of being generic hearts only.
5. **Restricted vendor/family shares.** The server enforces the selected asset IDs; a recipient cannot use a Quick Share token to enumerate the rest of the private gallery.
6. **First-party identity.** Client delivery lives in the Spodja visual system and can sit under the Spodja domain.
7. **Post-shoot revenue.** The same gallery can capture print, album and digital orders after delivery.

## Owner-side Gallery Studio

`/studio/` is the owner workspace. It uses the authenticated `spodja-gallery-studio-api` and currently supports:

- owner magic-link authentication
- list galleries with basic operational counts
- create a draft gallery
- generate / rotate a readable client access code
- set / replace / remove a download PIN
- configure email gate, downloads, high-res delivery, shop, payment gate, payment state, balance and expiry
- add sets
- request signed private upload tickets
- upload an original plus a browser-created web derivative
- register uploaded files as gallery assets
- designate cover images
- review submitted client selection lists
- inspect recent gallery activity
- remove gallery assets and associated private Storage files

Owner Studio requires both a valid Supabase authentication token and active Spodja owner access. Anonymous calls are rejected before business logic runs.

## Storage and access model

- Private bucket: `spodja-client-galleries`
- Gallery access codes: SHA-256 hash at rest
- Download PINs: SHA-256 hash at rest
- Viewer sessions: random token in browser; only token hash stored
- Quick Share: random token in link; only token hash stored
- High-resolution private files: short-lived signed URLs generated server-side
- Browser never contains service-role credentials

## Gallery API actions

Client API (`spodja-gallery-api`):

- `access`
- `bootstrap`
- `sync_lists`
- `submit_list`
- `quick_share`
- `unlock_download`
- `download`
- `download_batch`
- `create_order`
- `activity`

Owner API (`spodja-gallery-studio-api`):

- `list`
- `create_gallery`
- `update_gallery`
- `add_set`
- `upload_ticket`
- `finalize_asset`
- `gallery_detail`
- `delete_asset`

## Reminder lifecycle

When an email-identified viewer first accesses a gallery with an expiry date, the backend queues reminders for:

- 7 days before expiry, when still in the future
- 1 day before expiry, when still in the future

The queue is live. Sending requires an external email / WhatsApp provider and worker.

## Print Room state

The Print Room can persist an order, validate live products, calculate totals server-side and apply hashed coupons. It does not fabricate a successful payment. Until a merchant adapter is active, an order remains payment-pending and can be fulfilled manually or handed to the future payment flow.

Automatic physical print fulfilment remains a separate lab/provider integration.
