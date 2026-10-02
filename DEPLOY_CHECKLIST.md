# Spodja PH — Deploy Checklist

## 1. Use the packaged root

Deploy the contents of this directory as the Netlify publish root. Do not deploy only `/gallery/` or `/studio/` because the estate relies on shared assets and routes.

## 2. Preview before production

- Create a Netlify preview deploy.
- Verify `/`, all five booking lanes, `/payment/`, `/client/`, `/gallery/`, `/gallery/demo/` and `/studio/`.
- Run Playwright/browser smoke against the preview HTTPS URL because the build environment used for this handoff blocks local Chromium navigation.
- Check desktop and mobile layout.

## 3. Client Gallery smoke

Create a temporary gallery in `/studio/` and verify:

- access link/code opens `/client/`
- email gate when enabled
- set tabs
- favorite + note persistence
- selection submission
- Quick Share exposes only selected images
- download PIN rejects wrong PIN
- download gate respects payment state
- web download
- high-res download
- batch ZIP
- expiry display

Delete the temporary gallery/assets after the test.

## 4. Owner Studio smoke

- Owner magic-link login works.
- Non-owner / signed-out user cannot operate the Studio API.
- Create gallery.
- Rotate access code.
- Add set.
- Upload original + web version.
- Set cover.
- Change status from draft to proofing/final.
- Update payment state/balance/expiry.
- Review activity/submitted lists.

## 5. Payment truth check

Until merchant activation is complete:

- generic non-Grad wallet/card buttons must remain activation-pending
- no fake paid result may be shown
- gallery Print Room orders remain payment-pending unless payment is verified externally

## 6. Provider activation later

When ready, connect:

- Yoco/Paystack merchant checkout + verified webhook
- email/WhatsApp worker for `spodja_gallery_notifications`
- print lab / fulfilment workflow

## 7. Production promotion

Promote only the same preview-tested artifact. Do not rebuild from a different working folder between preview QA and production promotion.
