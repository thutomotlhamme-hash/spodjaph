# spodjaph

Redesign of spodjaph.netlify.app on a "midnight exhibition" system: black bays, oversized display type, photographs framed as the product, and a single rationed accent (blue, for booking only).

## Edit

- **Words and contact details:** `src/site.config.mjs`. Empty contact fields are simply hidden.
- **Look:** `src/styles.css` (all tokens are at the top).
- **Build:** `node build.mjs` writes the finished site to `dist/`. No dependencies.

## Photos

Put JPGs in `images/` using the names below. A missing photo shows as an empty black tile labelled with the file it expects.

| Where | Files |
|---|---|
| Home hero | `images/home/hero.jpg` (16:9) |
| Each page, e.g. `weddings` | `images/weddings/hero.jpg` (16:9), `1.jpg` (21:9 wide), `2.jpg` and `3.jpg` (4:5 portrait), `chapter-1.jpg` to `chapter-4.jpg` (4:3) |
| Event pages | the same set, in `images/events/baby-shower/`, `images/events/birthday/`, `images/events/lobola/`, `images/events/matric-dance/` |

Each page's `hero.jpg` is also its tile on the home and events pages. Keep files around 2400px on the long edge, and under 500 KB where possible.

## Payments (Yoco)

How it works:

1. You quote a client, then open **/studio/** on your site (it's private and not linked anywhere). Enter the studio password, the client's name, the occasion and the total, then click **Create link**.
2. Send the link by WhatsApp. The client sees two options: **pay 50% to secure the date** or **pay in full**. Either way they pay by card through Yoco.
3. On the day, the balance can be paid in cash, by EFT, or by card. For card, choose **Balance only** in the Studio page and let the client scan the QR code on your phone.

Every link is signed, so a client can't change the amount. All payments appear in your Yoco dashboard with the client's name, the occasion and the type (deposit, full or balance).

### Setup (once)

In Netlify, go to **Project configuration → Environment variables** and add:

| Variable | Value |
|---|---|
| `YOCO_SECRET_KEY` | your Yoco **secret** key: `sk_test_…` while testing, `sk_live_…` once your domain is approved |
| `STUDIO_PASSWORD` | a long password only you know; it unlocks the Studio page |
| `LINK_SECRET` | any long random text, e.g. 40 random characters; it signs payment links (changing it breaks old links) |

Redeploy after adding them. To test, create a link and pay with Yoco's test card (4111 1111 1111 1111, any future expiry, CVV 123). Then swap in your live secret key.

The secret key only ever lives in Netlify. Never put it in this repo or in the website code. EFT details for the payment page go in `bank` in `src/site.config.mjs`.

## Deploy

- **Connected to this repo:** `netlify.toml` builds with `node build.mjs` and publishes `dist/`.
- **Drag and drop:** run the build, then drop the `dist/` folder on Netlify. Payments need the repo-connected deploy, because drag-and-drop doesn't include the `netlify/functions` that talk to Yoco.

The booking form uses Netlify Forms. Turn on form detection under Project configuration → Forms, and submissions will appear there.
