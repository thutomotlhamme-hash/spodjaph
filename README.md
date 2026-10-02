# Spodja PH — Photography Business + Client Gallery OS

Production candidate for the Spodja PH photography estate.

**Deploy root:** this directory.

## Primary routes

- `/` — Spodja reception / portfolio entry
- `/graduation/` — graduation booking lane
- `/weddings/` — wedding booking lane
- `/events/` — event booking lane
- `/portraits/` — portrait booking lane
- `/brands/` — brand / agency lane
- `/payment/` — shared payment stage
- `/success/` — post-payment / booking result
- `/client/` — client gallery access
- `/gallery/` — private client Gallery OS
- `/gallery/demo/` — Spodja gallery experience demo
- `/studio/` — authenticated Spodja owner Gallery Studio

## What is operational now

The client-gallery backend is live on Supabase. The deployable frontend in this folder is wired to it.

- Private client gallery records and sets
- Private Storage bucket for client delivery assets
- Hashed gallery access codes and download PINs
- Short-lived viewer sessions
- Email-gated gallery access
- Favorites, multiple lists and notes
- Submitted album / print / retouch selections
- Restricted Quick Share links for selected photos only
- Payment-aware download gating
- Individual web / high-resolution delivery
- Download PIN unlocking
- Batch download API + browser-generated ZIP delivery
- Gallery activity logging
- Gallery expiry and queued 7-day / 1-day reminders
- Print Room order capture and server-side coupon calculations
- Owner-only Gallery Studio API with private upload tickets
- Owner controls for galleries, sets, status, payment state, expiry, access codes, PINs and assets
- PWA / add-to-home-screen support

## External activation still required

The build deliberately does **not** pretend these integrations are live:

1. **Generic non-Grad card / wallet money movement** — connect an approved Yoco / Paystack merchant gateway server-side.
2. **Outbound reminder delivery** — gallery reminders are queued, but an email / WhatsApp provider must send the queue.
3. **Automatic print fulfilment** — Print Room orders are captured, but a physical lab / fulfilment workflow still needs to be connected.

Grad House retains its existing server-side Yoco flow where already configured.

## Security model

- High-resolution originals can remain in the private `spodja-client-galleries` Storage bucket.
- Browser clients never receive a Supabase service-role secret.
- Client gallery database tables are not directly opened to anonymous/authenticated REST access; the controlled Gallery API mediates access.
- Owner Studio requires a valid Supabase JWT and an active Spodja owner record.
- Access codes, share tokens and download PINs are stored as hashes.
- Restricted shares are enforced server-side rather than hidden only in the browser.

## Design provenance

Pixieset and Eksklusief were used as **capability / experience references only**. No proprietary source code, copied page markup, copyrighted photography or pixel-for-pixel layouts from either service are included.

Read `BUILD_NOTES.md`, `CLIENT_GALLERY_OS.md`, `QA_REPORT.md`, `PIXIESET_STORY_MAP.md` and `PAYMENT_GATEWAY_HANDOFF.md` before production deployment.
