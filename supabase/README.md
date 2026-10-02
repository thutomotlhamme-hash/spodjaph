# Spodja Gallery Supabase Backend Snapshot

Production project ref used by this build: `agdzdhjkkkvjpwhzitlj`.

This folder contains source snapshots of the deployed Gallery Edge Functions so the production artifact does not depend on an older local copy.

## Deployed functions at handoff

- `spodja-gallery-api` — version 2 — custom gallery/share/session authentication; platform JWT verification intentionally disabled because the function implements its own random-token authorization and does not expose direct table credentials.
- `spodja-gallery-studio-api` — version 1 — platform JWT verification enabled; function additionally checks active owner access.

## Database migrations applied during Gallery OS production pass

- `spodja_client_gallery_os`
- `spodja_gallery_share_session_scope`
- `spodja_gallery_production_controls`
- `spodja_gallery_order_status_extension`
- `spodja_gallery_expiry_notification_queue`

The production database is already migrated. These function sources are included for recovery/version visibility; do not apply ad-hoc destructive schema changes from the frontend artifact.

## Command centre (October 2026)

- `spodja-command-centre` — platform JWT verification disabled because the function checks the caller itself:
  - `pay_view` / `pay_start` / `pay_verify` are public but only accept an unguessable payment-link token, and never accept an amount from the browser.
  - Every other action requires a Supabase session of an active `grad_owner_access` owner.
- `spodja-payment-link` — retired stub (HTTP 410); superseded by `spodja-command-centre`.
- Migrations: `spodja_payment_links`, `spodja_command_centre` (tables `spodja_jobs`, `spodja_ledger`, `spodja_payment_link_items`, `spodja_activity_log`, view `spodja_job_balances`). RLS is on with no policies: service-role access only.
- Yoco: uses the existing `YOCO_SECRET_KEY` secret. Optional `SPODJA_SITE_URL` pins the return origin for checkouts.
