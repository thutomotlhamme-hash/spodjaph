# Spodja PH Gallery OS — Production QA Report

Date: 27 August 2026

Build root: `/mnt/data/spodja-master-work`

## Result

**Production candidate: PASS with external-integration handoffs and one browser-environment limitation.**

The Gallery OS client API, owner authorization boundary, payment/download gating and order calculations were tested live against the production Supabase backend. The packaged frontend passed static, syntax and HTTP route checks. The current execution environment blocks Chromium navigation to localhost and intercepted test domains, so the final visual browser smoke must be repeated on the Netlify preview before production replacement.

## PASS — Gallery access and privacy

Live disposable QA data was used and removed after testing.

- Gallery access returned HTTP 200 and a short-lived viewer session.
- Gallery payload indicated that a download PIN was required without returning the stored PIN hash.
- A download request before PIN unlock returned HTTP 403 `download_pin_required`.
- An incorrect PIN returned HTTP 403 `download_pin_invalid`.
- The correct PIN returned HTTP 200 and unlocked delivery for that viewer session.
- A high-resolution batch request after unlock returned HTTP 200 and only the authorized assets.
- Previous Quick Share regression test created a two-image restricted share and opening it returned exactly those two assets, not the remaining collection.
- Access/share/session/PIN secrets are represented server-side by hashes rather than raw values.

## PASS — Client proofing workflow

- Multiple favorite lists are stored server-side.
- Per-photo notes persist with selections.
- Lists can be submitted as operational briefs for album, print, retouch or custom selection work.
- Gallery activity events are recorded server-side.
- Quick Share uses a separate expiring token and server-side asset scope.

## PASS — Download delivery

- Payment gate is enforced in the client API.
- Download PIN is enforced before individual/batch delivery where configured.
- Web/high-resolution permission is enforced server-side.
- Private Storage files can be returned as short-lived signed URLs.
- Client front end can assemble authorized batch files into ZIP archives in-browser.
- Larger download sets are split into manageable ZIP parts to reduce browser-memory pressure.

## PASS — Print Room order engine

A production QA defect was found during testing and fixed before packaging.

Initial defect:
- Print Room order creation returned HTTP 500 because the new API used `pending_payment` / `confirmed`, while the existing database check constraint did not yet allow those states.

Fix:
- Order status constraint was migrated to accept the Gallery OS states while retaining existing states.

Retest:
- Test product price: **R120.00**
- Coupon: **10%**
- Server-calculated subtotal: **R120.00**
- Server-calculated discount: **R12.00**
- Server-calculated total: **R108.00**
- API result: HTTP 200, order persisted as `pending_payment` with generated order reference.

The disposable QA gallery/order data was deleted after the test.

## PASS — Owner Studio authorization

- `spodja-gallery-studio-api` requires a valid Supabase JWT at the Edge Function boundary.
- An unauthenticated `list` request returned HTTP 401 / missing authorization.
- Business logic additionally requires the authenticated user to have active Spodja owner access.
- Browser code contains only the public/publishable Supabase project key; it does not contain a service-role secret.

## PASS — Owner Gallery Studio capabilities

Packaged owner UI + live API support:

- create gallery
- rotate client access code and generate client link
- set / change / remove download PIN
- configure gallery state, email gate, download settings, payment gate/state, balance and expiry
- add sets
- request signed private upload tickets
- upload high-resolution originals and web derivatives
- finalize assets and assign a cover
- review submitted client selections and activity
- delete assets from Storage/database

## PASS — Expiry lifecycle

- When an email-identified viewer enters a gallery with a future expiry, the backend queues a 7-day reminder when applicable.
- It queues a 1-day reminder when applicable.
- A unique pending-notification guard prevents duplicate pending reminders for the same gallery/recipient/template.
- Sending the queue still requires an external email/WhatsApp worker and is not falsely marked as delivered.

## PASS — Static frontend integrity

Checked **12 HTML files**:

- `/`
- `/graduation/`
- `/weddings/`
- `/events/`
- `/portraits/`
- `/brands/`
- `/payment/`
- `/success/`
- `/client/`
- `/gallery/`
- `/gallery/demo/`
- `/studio/`

Results:

- 0 duplicate element IDs
- 0 broken internal `href` / `src` route references
- manifest JSON valid
- package JSON valid
- CSS brace validation passed for all 4 packaged stylesheets
- all 15 packaged PNG/JPG/WebP files decoded successfully

## PASS — JavaScript syntax

`node --check` passed for:

- `assets/gallery-access.js`
- `assets/gallery.js`
- `assets/grad.js`
- `assets/lane.js`
- `assets/payment.js`
- `assets/site.js`
- `assets/studio.js`
- `assets/success.js`
- `playwright.config.js`
- `sw.js`
- `tests/site.spec.js`

A shell/terminal quirk returned a non-zero wrapper status after the loop because the test file clears the terminal in this environment, but every individual Node syntax result was `PASS`.

## PASS — HTTP route smoke

Using the existing local static server for the build, all tested production routes/assets returned HTTP 200:

- `/`
- `/graduation/`
- `/weddings/`
- `/events/`
- `/portraits/`
- `/brands/`
- `/payment/`
- `/success/`
- `/client/`
- `/gallery/`
- `/gallery/demo/`
- `/studio/`
- `/assets/gallery.js`
- `/manifest.webmanifest`

## PASS — Secret scan

The packaged frontend/source tree was scanned for common secret patterns.

No matches were found for:

- embedded Supabase service-role key
- `sk_live_` / `sk_test_`
- private-key PEM material
- JWT-like hard-coded bearer tokens

## Database advisor review

The Supabase project advisor was run after the new migrations.

For the new Spodja gallery tables, RLS-with-no-policy notices are intentional because direct anon/authenticated table access is revoked and access is mediated by Edge Functions using custom client tokens / owner authentication.

The broader shared Supabase project still has unrelated security/performance notices belonging to other products. They were not modified in this Spodja release. New Spodja relationship indexes no longer show missing-index findings; several are reported as `unused` because the feature is newly deployed and has not accumulated production traffic yet.

Supabase's RLS no-policy lint reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Browser-run limitation

Chromium navigation in this execution environment is blocked by administrative policy:

`net::ERR_BLOCKED_BY_ADMINISTRATOR`

This occurs for localhost **and** intercepted test-domain navigation, so a reliable automated screenshot/e2e browser pass could not be completed here.

This is not being counted as a browser pass. Before replacing the existing production Netlify frontend, run the Playwright smoke against the deployed Netlify preview and visually verify desktop/mobile Gallery OS and Studio screens.

## External handoffs — not defects

The following are deliberately pending real providers rather than being mocked as complete:

1. Generic non-Grad Yoco/Paystack card/wallet charging.
2. Outbound email/WhatsApp sender for the live notification queue.
3. Automatic physical print-lab fulfilment.

## Release recommendation

Deploy this build to a Netlify preview first. Run the final browser/e2e smoke against that HTTPS preview. If clean, promote the same artifact to the Spodja production site.
