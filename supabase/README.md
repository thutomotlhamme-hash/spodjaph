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
