// Zero-dependency static build: `node build.mjs` writes the site to dist/.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brand, nav, pages, process } from './src/site.config.mjs';

const OUT = 'dist';
const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const href = (slug) => (slug ? `/${slug}/` : '/');
const occasionOf = (p) => p.title;

// ---------- Partials ----------

const tile = ({ src, alt, tag = 'div', link, cls = '', copy = '', eager = false, attrs = '' }) => {
  const open = tag === 'a' ? `<a class="tile ${cls}" href="${link}"${attrs}>` : `<div class="tile ${cls}"${attrs}>`;
  return `${open}
      <img src="${src}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
      <span class="ph" aria-hidden="true">${esc(src.replace(/^\//, ''))}</span>
      ${copy}
    </${tag}>`;
};

const gnav = (active) => `
<header class="gnav">
  <nav class="gnav-inner" aria-label="Main">
    <a class="wordmark" href="/">${esc(brand.name)} <span>${esc(brand.descriptor)}</span></a>
    <div class="gnav-links" id="menu">
      ${nav
        .map((s) => `<a href="${href(s)}"${active === s ? ' aria-current="page"' : ''}>${esc(bySlug[s].title)}</a>`)
        .join('\n      ')}
      <a href="/contact/"${active === 'contact' ? ' aria-current="page"' : ''}>Contact</a>
    </div>
    <a class="btn gnav-book" href="/contact/">Book</a>
    <button class="gnav-menu" aria-controls="menu" aria-expanded="false"><span class="bars"></span><span class="sr-only">Menu</span></button>
  </nav>
</header>`;

const lnav = (p) => `
<div class="lnav">
  <div class="lnav-inner">
    <div class="lnav-title">${p.parent ? `<small>${esc(bySlug[p.parent].title)}</small>` : ''}${esc(p.title)}</div>
    <div class="lnav-right">
      <a href="#highlights">Highlights</a>
      <a href="#${p.hub ? 'occasions' : 'closer'}">${p.hub ? 'Occasions' : 'Closer look'}</a>
      <a href="#process">Process</a>
      <a class="btn" href="/contact/?occasion=${encodeURIComponent(occasionOf(p))}">Book</a>
    </div>
  </div>
</div>`;

const footer = () => {
  const direct = [
    brand.email && `<li><a href="mailto:${esc(brand.email)}">${esc(brand.email)}</a></li>`,
    brand.phone && `<li><a href="tel:${esc(brand.phone.replace(/\s+/g, ''))}">${esc(brand.phone)}</a></li>`,
    brand.whatsapp && `<li><a href="https://wa.me/${esc(brand.whatsapp)}">WhatsApp</a></li>`,
    brand.instagram && `<li><a href="https://instagram.com/${esc(brand.instagram)}">Instagram</a></li>`,
  ].filter(Boolean);
  const events = bySlug.events.hub.map((s) => `<li><a href="${href(s)}">${esc(bySlug[s].title)}</a></li>`).join('');
  return `
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-cols">
      <div><h4>Sessions</h4><ul>${nav.filter((s) => s !== 'events').map((s) => `<li><a href="${href(s)}">${esc(bySlug[s].title)}</a></li>`).join('')}</ul></div>
      <div><h4>Events</h4><ul>${events}</ul></div>
      <div><h4>Contact</h4><ul><li><a href="/contact/">Book a session</a></li>${direct.join('')}</ul></div>
    </div>
    <div class="footer-base">
      <span>Copyright © ${new Date().getFullYear()} ${esc(brand.name)} ${esc(brand.descriptor)}. All rights reserved.</span>
      ${brand.location ? `<span>${esc(brand.location)}</span>` : ''}
    </div>
  </div>
</footer>`;
};

const processBay = () => `
<section class="bay on-light" id="process">
  <div class="bay-head reveal">
    <h2 class="display">How it works.</h2>
    <p class="lede">Four steps from first message to final gallery.</p>
  </div>
  <div class="wrap steps">
    ${process
      .map(
        (s) => `<article class="step reveal"><span class="num">${s.step}</span><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></article>`,
      )
      .join('\n    ')}
  </div>
</section>`;

const ctaBay = (p) => `
<section class="bay bay-black statement">
  <h2 class="display reveal">Your date.<br><em>Our full attention.</em></h2>
  <div class="hero-stack reveal">
    <a class="btn btn-lg" href="/contact/${p ? `?occasion=${encodeURIComponent(occasionOf(p))}` : ''}">Check availability</a>
  </div>
</section>`;

const closer = (heading, lede, items) => `
<section class="bay bay-black" id="closer">
  <div class="bay-head reveal">
    <h2 class="display">${heading}</h2>
    ${lede ? `<p class="lede">${lede}</p>` : ''}
  </div>
  <div class="wrap closer reveal">
    <div class="chips" role="tablist" aria-label="${esc(heading.replace(/<[^>]+>/g, ''))}">
      ${items
        .map(
          (it, i) => `<div class="chip" role="tab" tabindex="0" aria-selected="${i === 0}">
        <span class="chip-icon" aria-hidden="true">+</span>
        <span>${esc(it.name)}</span>
        <span class="chip-body"><span>${esc(it.body)}${it.link ? ` <a class="link" href="${it.link}">Explore</a>` : ''}</span></span>
      </div>`,
        )
        .join('\n      ')}
    </div>
    <div class="stage">
      ${items.map((it, i) => tile({ src: it.src, alt: it.name, attrs: i === 0 ? ' data-active' : '' })).join('\n      ')}
    </div>
  </div>
</section>`;

const layout = ({ title, description, active, body, sub = '' }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#000000">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap">
<link rel="stylesheet" href="/styles.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8'/%3E%3Ccircle cx='16' cy='16' r='7' fill='none' stroke='%23f5f5f7' stroke-width='2.5'/%3E%3C/svg%3E">
<script src="/main.js" defer></script>
</head>
<body>
${gnav(active)}${sub}
<main>
${body}
</main>
${footer()}
</body>
</html>
`;

// ---------- Pages ----------

const home = () => {
  const index = nav.map((s) => {
    const p = bySlug[s];
    return tile({
      tag: 'a',
      link: href(s),
      src: `/images/${s}/hero.jpg`,
      alt: p.title,
      cls: 'tile-scrim reveal',
      copy: `<div class="tile-copy"><h3>${esc(p.title)}</h3><span class="link">${esc(p.headline.join(' '))}</span></div>`,
    });
  });
  const events = bySlug.events.hub.map((s) => {
    const p = bySlug[s];
    return { name: p.title, body: p.lede, src: `/images/${s}/hero.jpg`, link: href(s) };
  });
  return layout({
    title: `${brand.name} ${brand.descriptor} — ${brand.tagline}`,
    description: 'Wedding, portrait, graduation, event and brand photography.',
    active: '',
    body: `
<section class="hero">
  <p class="product-label">${esc(brand.name)} ${esc(brand.descriptor)}</p>
  <h1 class="hero-display">Moments,<br>made permanent.</h1>
  ${tile({ src: '/images/home/hero.jpg', alt: '', cls: 'hero-media', eager: true })}
  <div class="hero-stack">
    <a class="btn btn-lg" href="/contact/">Book a session</a>
    <p>Weddings, portraits, graduations, events and brands.<span>Every occasion, one unhurried eye.</span></p>
  </div>
</section>

<section class="bay statement">
  <h2 class="display reveal">Not a camera in the room.<br><em>A witness to it.</em></h2>
</section>

<section class="bay bay-tight" id="work">
  <div class="bay-head reveal"><h2 class="section-heading">Explore the work.</h2></div>
  <div class="wrap index-grid">
    ${index.join('\n    ')}
  </div>
</section>
${closer('Every gathering,<br>remembered.', 'Celebrations large and small, covered with the same attention as a wedding.', events)}
${processBay()}
${ctaBay()}`,
  });
};

const category = (p) => {
  const hi = p.highlights.map((h, i) =>
    tile({
      src: `/images/${p.slug}/${i + 1}.jpg`,
      alt: h.title,
      cls: 'tile-scrim reveal',
      copy: `<div class="tile-copy"><h3>${esc(h.title)}</h3><p>${esc(h.body)}</p></div>`,
    }),
  );
  const occasions = p.hub
    ? `
<section class="bay bay-black" id="occasions">
  <div class="bay-head reveal"><h2 class="display">Choose the occasion.</h2></div>
  <div class="wrap index-grid four">
    ${p.hub
      .map((s) =>
        tile({
          tag: 'a',
          link: href(s),
          src: `/images/${s}/hero.jpg`,
          alt: bySlug[s].title,
          cls: 'tile-scrim reveal',
          copy: `<div class="tile-copy"><h3>${esc(bySlug[s].title)}</h3><span class="link">${esc(bySlug[s].headline.join(' '))}</span></div>`,
        }),
      )
      .join('\n    ')}
  </div>
</section>`
    : '';
  const chapters = p.chapters
    ? closer(
        'Take a closer look.',
        '',
        p.chapters.map((c, i) => ({ ...c, src: `/images/${p.slug}/chapter-${i + 1}.jpg` })),
      )
    : '';
  const book = `/contact/?occasion=${encodeURIComponent(occasionOf(p))}`;
  return layout({
    title: `${p.title} — ${brand.name} ${brand.descriptor}`,
    description: p.lede,
    active: p.parent || p.slug,
    sub: lnav(p),
    body: `
<section class="hero">
  <p class="product-label">${esc(p.eyebrow)}</p>
  <h1 class="hero-display">${p.headline.map(esc).join('<br>')}</h1>
  ${tile({ src: `/images/${p.slug}/hero.jpg`, alt: p.title, cls: 'hero-media', eager: true })}
  <div class="hero-stack">
    <a class="btn btn-lg" href="${book}">Book ${esc(p.title.toLowerCase())}</a>
    <p>${esc(p.lede)}</p>
  </div>
</section>

<section class="bay" id="highlights">
  <div class="bay-head reveal"><h2 class="display">Highlights.</h2></div>
  <div class="wrap highlights">
    ${hi.join('\n    ')}
  </div>
</section>
${occasions}${chapters}
${processBay()}
${ctaBay(p)}`,
  });
};

const contact = () => {
  const direct = [
    brand.email && `<a class="link" href="mailto:${esc(brand.email)}">${esc(brand.email)}</a>`,
    brand.phone && `<a class="link" href="tel:${esc(brand.phone.replace(/\s+/g, ''))}">${esc(brand.phone)}</a>`,
    brand.whatsapp && `<a class="link" href="https://wa.me/${esc(brand.whatsapp)}">Message on WhatsApp</a>`,
    brand.instagram && `<a class="link" href="https://instagram.com/${esc(brand.instagram)}">@${esc(brand.instagram)}</a>`,
  ].filter(Boolean);
  const options = pages.filter((p) => !p.hub).map((p) => `<option>${esc(p.title)}</option>`).join('');
  return layout({
    title: `Book a session — ${brand.name} ${brand.descriptor}`,
    description: 'Check availability and book your photography session.',
    active: 'contact',
    body: `
<section class="bay bay-black">
  <div class="wrap-narrow book">
    <div>
      <p class="product-label">Book</p>
      <h1 class="display" style="margin-top:14px">Let’s hold<br>your date.</h1>
      <p class="lede" style="margin-top:24px">Tell us about the occasion. You will hear back with availability and a tailored quote.</p>
      ${direct.length ? `<div class="book-direct">${direct.join('')}</div>` : ''}
    </div>
    <form class="form" name="booking" method="POST" action="/thanks/" data-netlify="true" netlify-honeypot="company">
      <input type="hidden" name="form-name" value="booking">
      <p class="sr-only"><label>Leave empty <input name="company" tabindex="-1" autocomplete="off"></label></p>
      <label class="sr-only" for="f-name">Name</label>
      <input class="field" id="f-name" name="name" placeholder="Name" autocomplete="name" required>
      <label class="sr-only" for="f-phone">Phone</label>
      <input class="field" id="f-phone" name="phone" type="tel" placeholder="Phone" autocomplete="tel">
      <label class="sr-only" for="f-email">Email</label>
      <input class="field full" id="f-email" name="email" type="email" placeholder="Email" autocomplete="email" required>
      <label class="sr-only" for="f-occasion">Occasion</label>
      <select class="field" id="f-occasion" name="occasion" required>
        <option value="" disabled selected>Occasion</option>${options}<option>Something else</option>
      </select>
      <label class="sr-only" for="f-date">Date</label>
      <input class="field" id="f-date" name="date" type="date" aria-label="Date">
      <label class="sr-only" for="f-message">Tell us more</label>
      <textarea class="field full" id="f-message" name="message" placeholder="Location, guest count, anything we should know"></textarea>
      <button class="btn btn-lg" type="submit">Send request</button>
    </form>
  </div>
</section>
${processBay()}`,
  });
};

const thanks = () =>
  layout({
    title: `Thank you — ${brand.name} ${brand.descriptor}`,
    description: 'Your request has been received.',
    active: 'contact',
    body: `
<section class="hero" style="min-height:70vh;display:grid;place-content:center">
  <p class="product-label">Request received</p>
  <h1 class="hero-display">Thank you.</h1>
  <div class="hero-stack"><p>We will be in touch shortly.<span>In the meantime, look around.</span></p><a class="link" href="/">Back to home</a></div>
</section>`,
  });

const notFound = () =>
  layout({
    title: `Not found — ${brand.name} ${brand.descriptor}`,
    description: 'Page not found.',
    active: '',
    body: `
<section class="hero" style="min-height:70vh;display:grid;place-content:center">
  <p class="product-label">404</p>
  <h1 class="hero-display">Out of frame.</h1>
  <div class="hero-stack"><a class="link" href="/">Back to home</a></div>
</section>`,
  });

// ---------- Write ----------

const write = (path, html) => {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

rmSync(OUT, { recursive: true, force: true });
write('index.html', home());
for (const p of pages) write(`${p.slug}/index.html`, category(p));
write('contact/index.html', contact());
write('thanks/index.html', thanks());
write('404.html', notFound());
cpSync('src/styles.css', join(OUT, 'styles.css'));
cpSync('src/main.js', join(OUT, 'main.js'));
if (existsSync('images')) cpSync('images', join(OUT, 'images'), { recursive: true });
console.log(`Built ${pages.length + 4} pages → ${OUT}/`);
