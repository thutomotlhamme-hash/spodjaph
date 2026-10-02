# Spodja PH — Netlify UI Skin v5 QA

Date: 28 August 2026

## Scope
This release changes the presentation layer only. The Spodja journey architecture remains:
- Grad House
- Wedding Lane
- Events Avenue
- Portrait Room
- Brand Desk
- Client Gallery / Gallery OS
- Secure payment journey
- Owner Studio

Visual reference: the established dark editorial Spodja PH interface currently used on `spodjaph.netlify.app`.

## UI changes
- near-black / dark brown Spodja shell
- original Spodja red accent
- elegant serif display typography
- restrained uppercase navigation
- square editorial CTAs and form controls
- reduced rounded-card / generic SaaS treatment
- premium dark hero treatment across journeys
- real Spodja imagery retained as supporting visual material
- external Cloudinary brand-logo dependency removed from all pages
- local text-rendered Spodja PH wordmark used in the header

## Reception performance changes
- removed rotating multi-image reception slideshow
- removed remote logo dependency
- one local optimized `wedding-hero.webp` used at low opacity
- homepage no longer calls the Supabase site-data API because it does not need live package/portfolio content
- estimated critical local reception payload before HTTP compression: ~70 KB

## Regression integrity
The following functional JavaScript files are byte-for-byte unchanged from the previous Gallery OS build:
- lane.js
- payment.js
- grad.js
- gallery.js
- gallery-access.js
- studio.js
- success.js

`site.js` was changed only to avoid an unnecessary live-data fetch on pages that do not render live Grad House data.

## Static QA
- 12 HTML routes parsed
- 0 broken local links/assets
- 0 duplicate HTML IDs
- all packaged CSS files have balanced braces
- 8 JavaScript assets passed `node --check`
- all 12 HTTP route smokes returned 200 from the local packaged root

Routes checked:
`/`, `/weddings/`, `/events/`, `/portraits/`, `/brands/`, `/graduation/`, `/payment/`, `/client/`, `/gallery/`, `/gallery/demo/`, `/studio/`, `/success/`.

## Browser environment note
The container Chromium process does not terminate cleanly in this workspace, so a final visual smoke should still be repeated on a Netlify HTTPS preview before replacing production. This is not being recorded as a browser PASS.
