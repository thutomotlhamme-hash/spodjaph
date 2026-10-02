# Spodja PH — Production Build Notes

Date: 27 August 2026

## Product architecture

Spodja PH is now structured as a photography business system rather than a long generic price catalogue.

- `/` is the premium reception and visual entry point.
- `/graduation/`, `/weddings/`, `/events/`, `/portraits/` and `/brands/` are specialist booking lanes.
- `/payment/` is the shared secure payment stage.
- `/client/` is the client entry point for a private delivery.
- `/gallery/` is the first-party client Gallery OS.
- `/studio/` is the authenticated owner Gallery Studio.

The public brand logic remains **BRIEF → CREATE → DELIVER**, while the post-shoot product extends that into proofing, selections, sharing, delivery and reordering.

## Gallery backend now live

The production Supabase project contains the Spodja gallery schema, private Storage bucket and two Edge Functions.

### Client Gallery API

`spodja-gallery-api` v2 supports:

- secure gallery access and short-lived sessions
- gallery/asset payloads without leaking hashes
- restricted Quick Share scope
- favorite-list persistence and submission
- download PIN validation
- payment-aware individual and batch downloads
- short-lived signed private Storage URLs
- activity logging
- server-side Print Room order and coupon calculation

### Owner Studio API

`spodja-gallery-studio-api` supports:

- authenticated owner authorization
- gallery CRUD-style operational controls
- access-code / PIN changes
- set creation
- signed private uploads
- asset finalization and cover assignment
- activity / submitted-selection retrieval
- asset deletion

## Gallery production controls

Additional production controls include:

- `download_unlocked_at` per gallery viewer session
- coupon table with percent/fixed discounts, validity windows and redemption limits
- order discount / coupon linkage
- indexes for the gallery relationships used by the APIs
- queueing of 7-day and 1-day gallery-expiry reminders
- expanded order status model for payment-pending / confirmed gallery orders

## Client front end

The Gallery OS is wired to the live API and includes:

- cover / sets / grid / lightbox / slideshow
- lists, hearts and notes
- selection submission
- WhatsApp and native Quick Share
- download PIN dialog
- individual file delivery
- ZIP batch delivery; larger downloads are split into manageable ZIP parts
- Print Room with coupon / order request flow
- PWA install handling

The gallery no longer relies on localStorage as the source of truth for production client selections.

## Owner front end

Gallery Studio includes:

- magic-link owner sign-in
- gallery list and status metrics
- gallery creation
- access-code rotation with client-link generator
- download PIN controls
- payment/download/expiry controls
- set creation
- private original + web-derivative upload workflow
- submitted client selections
- recent activity
- asset deletion

## Shared payment journey

- Fixed-price non-Grad packages carry reference, selected coverage, date, venue and amount into `/payment/` in the same browser session.
- Wallet-first UI remains Apple Pay → Google Pay → card.
- Fixed consumer bookings support a reservation intent or full settlement where applicable.
- Wedding business rules can carry an explicit remaining-balance deadline, including the agreed three-day post-event exception.
- Custom / `from` / agency work does not fabricate a checkout total.
- Grad House retains its existing server-verified Yoco path.
- Generic non-Grad card/wallet charging remains intentionally inactive until merchant approval and server-side adapter activation.

## External provider handoffs still required

- merchant payment adapter for generic non-Grad wallet/card transactions
- outbound email/WhatsApp worker for queued gallery reminders
- physical print-lab / fulfilment adapter if automatic fulfilment is required

## Integrity / provenance

- Real Spodja portfolio imagery remains the visual source for the packaged site.
- No raw payment-card data is collected by Spodja pages.
- No Supabase service-role secret is embedded in the browser build.
- Pixieset and Eksklusief were used as product/experience references only; no proprietary code or copyrighted assets were copied into this build.
