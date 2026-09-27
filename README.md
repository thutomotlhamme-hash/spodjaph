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

## Deploy

- **Connected to this repo:** `netlify.toml` builds with `node build.mjs` and publishes `dist/`.
- **Drag and drop:** run the build, then drop the `dist/` folder on Netlify.

The booking form uses Netlify Forms. Turn on form detection under Project configuration → Forms, and submissions will appear there.
