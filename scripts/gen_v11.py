"""Generate the Spodja v11 public pages.

Each booking page keeps its original <form> (and, for Grad House, the
package summary and live package container) byte-for-byte, so the booking,
WhatsApp and payment scripts keep working. Only the page chrome around the
forms is rebuilt.
"""
import html, re, sys
from pathlib import Path

SRC = Path(sys.argv[1])  # original upload (read)
ROOT = Path(sys.argv[2])  # repo (write)

NAV = [
    ("/graduation/", "Graduation"),
    ("/weddings/", "Weddings"),
    ("/events/", "Events"),
    ("/portraits/", "Portraits"),
    ("/brands/", "Brands"),
    ("/book/", "The Book"),
]
WHATSAPP = "27625683235"


def read(rel):
    return (SRC / rel).read_text()


def head(title, description, preload=None):
    pre = f'<link rel="preload" as="image" href="{preload}" fetchpriority="high"/>' if preload else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<meta name="theme-color" content="#0e0c0b"/>
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(description)}"/>
<meta property="og:title" content="{html.escape(title)}"/>
<meta property="og:description" content="{html.escape(description)}"/>
<link rel="icon" type="image/png" href="/assets/icons/spodja-192.png"/>
<link rel="apple-touch-icon" href="/assets/icons/spodja-192.png"/>
<link rel="manifest" href="/manifest.webmanifest"/>
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/instrument-serif-latin-400-normal.woff2" crossorigin/>
{pre}
<script>document.documentElement.classList.add('js')</script>
<link rel="stylesheet" href="/assets/v11.css"/>
</head>"""


def topbar(active):
    cur = ' aria-current="page"'
    links = "".join(f'<a href="{h}"{cur if h == active else ""}>{t}</a>' for h, t in NAV)
    return f"""<header class="topbar">
  <a class="brand" href="/" aria-label="Spodja PH home"><span class="s-logo"><img class="s-logo-white" src="/assets/branding/spodja-logo-white.png" alt="Spodja PH"/><img class="s-logo-accent" src="/assets/branding/spodja-logo-accent.png" alt="" aria-hidden="true"/></span></a>
  <nav class="nav" aria-label="Main">{links}<a class="s-nav-cta" href="/client/">Your gallery</a></nav>
  <button class="menu" type="button" aria-label="Open menu" aria-expanded="false">☰</button>
</header>"""


def footer():
    links = "".join(f'<a href="{h}">{t}</a>' for h, t in NAV)
    return f"""<footer class="s-foot">
  <div class="s-foot-inner">
    <a href="/" aria-label="Spodja PH home"><img src="/assets/branding/spodja-logo-white.png" alt="Spodja PH"/></a>
    <nav aria-label="Footer">{links}<a href="/client/">Your gallery</a><a href="https://wa.me/{WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a></nav>
    <small>© <span data-year>2026</span> Spodja PH · Photography &amp; film · Gauteng</small>
  </div>
</footer>"""


def page(body_page, title, description, active, main, scripts, preload=None):
    tags = "".join(f'<script src="{s}" defer></script>' for s in scripts)
    return f"""{head(title, description, preload)}
<body data-page="{body_page}">
{topbar(active)}
<main>
{main}
</main>
{footer()}
{tags}
</body>
</html>
"""


HD = "/assets/portfolio/hd/"
SLIDES = {
    "home": ["_DSC2179.jpg", "_DSC0396copy(3).jpg", "_DSC0336copy(3).jpg", "IMG_7556(1).JPG"],
    "graduation": ["grad-house-1.jpg", "grad-house-5.jpg", "grad-house-8.jpg", "grad-house-10.jpg", "grad-house-7.jpg"],
    "weddings": ["wedding-lane-1.jpg", "wedding-lane-5.jpg", "wedding-lane-3.jpg", "wedding-lane-6.jpg"],
    "portraits": ["portrait-room-1.jpg", "portrait-room-5.jpg", "portrait-room-4.jpg", "portrait-room-6.jpg"],
    "events": ["_DSC2181.jpg", "_DSC2179.jpg", "_DSC2115.jpg", "_DSC2151.jpg"],
    "brands": ["_DSC0334copy(3).jpg", "_DSC0336copy(3).jpg", "_DSC2181.jpg", "_DSC0396copy(3).jpg"],
}


def hero(img, eyebrow, h1, lede, primary, secondary=None, pos="50% 28%", slides=None):
    if slides:
        img = HD + slides[0]
    data = f' data-slides="{"|".join(HD + x for x in slides)}"' if slides else ""
    sec = f'<a class="s-btn s-btn-ghost" href="{secondary[0]}">{secondary[1]}</a>' if secondary else ""
    return f"""<section class="s-hero"{data}>
  <img src="{img}" alt="" fetchpriority="high" style="object-position:{pos}"/>
  <div class="s-hero-copy">
    <span class="s-eyebrow">{eyebrow}</span>
    <h1 class="s-display">{h1}</h1>
    <p class="s-lede">{lede}</p>
    <div class="s-actions"><a class="s-btn s-btn-red" href="{primary[0]}">{primary[1]}</a>{sec}</div>
  </div>
</section>"""


def work(imgs, heading, link=("/book/", "Open The Book")):
    figs = "".join(f'<figure class="s-photo"><img src="{src}" alt="Spodja PH photograph" loading="lazy" decoding="async"/></figure>' for src in imgs[:5])
    return f"""<section class="s-bay" id="work">
  <div class="s-head s-rise"><div><span class="s-eyebrow">The work</span><h2 class="s-h2">{heading}</h2></div><a class="s-link" href="{link[0]}">{link[1]}</a></div>
  <div class="s-wrap s-work s-stagger">{figs}</div>
</section>"""


def extract(pattern, s, what):
    m = re.search(pattern, s, re.S)
    if not m:
        raise SystemExit(f"could not find {what}")
    return m.group(0)


def h1_of(s):
    inner = re.search(r"<h1[^>]*>(.*?)</h1>", s, re.S).group(1)
    inner = re.sub(r'<span class="outline">(.*?)</span>', r"<em>\1</em>", inner)
    return inner


WA_NOTE = "Prefer to chat first? Book on WhatsApp and we’ll confirm your date and send a secure payment link."


def choices(form, grad=False, quote=False):
    """Two clear ways to book: pay now through Yoco, or confirm on WhatsApp first."""
    pay = "Pay &amp; reserve my time →" if grad else "Send my brief →" if quote else "Pay &amp; book →"
    note = "We’ll reply with a quote and a secure payment link. Prefer to talk it through? Book on WhatsApp." if quote else ("Pay securely by card, Apple Pay or Google Pay through Yoco to lock in your time. " if grad
            else "Pay a 50% deposit or the full amount securely by card, Apple Pay or Google Pay through Yoco. ") + WA_NOTE
    block = (f'<div class="s-choice">{{submit}}'
             f'<button class="s-btn s-btn-wa" type="button" data-whatsapp-book>Book on WhatsApp</button></div>'
             f'<p class="s-choice-note">{note}</p>')
    if grad:
        form, n = re.subn(r'(<button class="btn btn-dark" id="reserve" type="submit">)Continue on WhatsApp →</button>(<div class="hold" id="hold-box"></div>)<p class="helper">.*?</p>',
                          lambda m: block.replace("{submit}", m.group(1) + pay + "</button>") + m.group(2), form, flags=re.S)
    else:
        form = re.sub(r'<div class="flow-note">.*?</div>', "", form, count=1, flags=re.S)
        form, n = re.subn(r'(<button class="btn btn-dark[^"]*" type="submit">)Continue on WhatsApp →</button>',
                          lambda m: block.replace("{submit}", m.group(1) + pay + "</button>"), form)
    if n != 1:
        raise SystemExit("booking choices: submit button not found")
    return form


# ---------------------------------------------------------------- lanes
LANES = {
    "weddings": dict(
        title="Weddings | Spodja PH", eyebrow="Wedding Lane",
        lede="Coverage for couples who want the day to feel like the day, not a checklist of poses.",
        hero="/assets/portfolio/hd/wedding-lane-1.jpg", pos="50% 30%",
        work_h="Every part of the day.",
        book_h="Build your <em>coverage.</em>",
        book_p="Choose the kind of wedding, pick a package and add what you need. Pay securely to book, or confirm on WhatsApp first.",
    ),
    "events": dict(
        title="Events | Spodja PH", eyebrow="Events Avenue",
        lede="Lobola, matric dances, birthdays and baby showers, photographed with care and delivered as one story.",
        hero="/assets/portfolio/hd/_DSC2179.jpg", pos="50% 30%",
        work_h="Celebrations, kept.",
        book_h="Plan your <em>event.</em>",
        book_p="Choose the celebration, pick a package and the extras you want. Pay securely to book, or confirm on WhatsApp first.",
    ),
    "portraits": dict(
        title="Portraits | Spodja PH", eyebrow="Portrait Room",
        lede="Direction without turning you into somebody else. Personal, couples, lifestyle and professional portraits.",
        hero="/assets/portfolio/hd/portrait-room-1.jpg", pos="50% 22%",
        work_h="You, intentionally.",
        book_h="Book your <em>session.</em>",
        book_p="Choose the kind of portrait, pick a package and add what you need. Pay securely to book, or confirm on WhatsApp first.",
    ),
    "brands": dict(
        title="Brands | Spodja PH", eyebrow="Brand Desk",
        lede="Corporate photography, activations and content, built around where the images go after the shoot.",
        hero="/assets/portfolio/event-lobola.jpg", pos="50% 35%",
        work_h="Content that works.",
        book_h="Brief us <em>once.</em>",
        book_p="Tell us what the shoot is for, choose the coverage and add deliverables. We reply with a quote and a secure payment link.",
    ),
}

out = {}
for slug, cfg in LANES.items():
    s = read(f"{slug}/index.html")
    form = choices(extract(r"<form\b.*?</form>", s, f"{slug} form"), quote=slug == "brands")
    desc = re.search(r'<meta content="([^"]*)" name="description"', s)
    desc = desc.group(1) if desc else cfg["lede"]
    imgs = list(dict.fromkeys(re.findall(r'src="(/assets/portfolio/[^"]+)"', s)))
    imgs = [i for i in imgs if i != cfg["hero"]] + [cfg["hero"]]
    main = "\n".join([
        hero(cfg["hero"], cfg["eyebrow"], h1_of(s), cfg["lede"], ("#book", "See packages"), ("#work", "See the work"), cfg["pos"], SLIDES[slug]),
        work(imgs, cfg["work_h"]),
        f"""<section class="s-book" id="book">
  <div class="s-head"><div><span class="s-eyebrow">Book</span><h2 class="s-h2">{cfg['book_h']}</h2></div><p>{cfg['book_p']}</p></div>
  <div class="s-book-card">
{form}
  </div>
</section>""",
    ])
    out[f"{slug}/index.html"] = page(slug, cfg["title"], desc, f"/{slug}/", main,
                                     ["/assets/site.js", "/assets/lane.js", "/assets/whatsapp-launch.js", "/assets/v11.js"], HD + SLIDES[slug][0])

# ---------------------------------------------------------------- graduation
s = read("graduation/index.html")
form = choices(extract(r'<form class="form reveal" id="grad-form".*?</form>', s, "grad form"), grad=True)
policies = re.findall(r'<article class="policy-card"><strong>(.*?)</strong>(.*?)</article>', s, re.S)
policy_html = "".join(f'<details class="s-policy"><summary>{t}</summary>{body}</details>' for t, body in policies)
gimgs = list(dict.fromkeys(re.findall(r'src="(/assets/portfolio/[^"]+)"', s)))
gdesc = re.search(r'<meta content="([^"]*)" name="description"', s)
main = "\n".join([
    hero("/assets/portfolio/hd/grad-house-1.jpg", "The Grad House", h1_of(s),
         "Choose your session, campus, date and a live time. Then pay securely to lock it in, or book on WhatsApp.",
         ("#book", "Book my shoot"), ("#packages", "See packages"), "50% 24%", SLIDES["graduation"]),
    """<section class="s-bay s-bay-2" id="packages">
  <div class="s-head s-rise"><div><span class="s-eyebrow">Packages</span><h2 class="s-h2">Choose your <em>story.</em></h2></div><p>Live prices. Every package includes edited high-resolution images in a private gallery.</p></div>
  <div class="package-grid" data-packages><article class="package"><h3>Loading packages…</h3></article></div>
</section>""",
    work(gimgs[1:] + gimgs[:1], "The Grad House look."),
    f"""<section class="s-book" id="book">
  <div class="s-head"><div><span class="s-eyebrow">Book</span><h2 class="s-h2">Book your <em>shoot.</em></h2></div><p>Pick a package, find your campus and choose a live time. Pay securely to reserve it, or book on WhatsApp.</p></div>
  <div class="s-book-wide">
    <aside>
      <div class="summary-box" id="package-summary"><small>Choose a package to see details.</small></div>
      <div>{policy_html}</div>
    </aside>
    <div class="s-book-card" style="width:auto">
{form}
    </div>
  </div>
</section>""",
])
out["graduation/index.html"] = page("graduation", "Graduation | Spodja PH",
                                    gdesc.group(1) if gdesc else "Graduation photography by Spodja PH.",
                                    "/graduation/", main,
                                    ["/assets/site.js", "/assets/grad.js", "/assets/whatsapp-launch.js", "/assets/v11.js"],
                                    "/assets/portfolio/hd/grad-house-1.jpg")

# ---------------------------------------------------------------- the book
s = read("book/index.html")
grid = extract(r'<section class="book-grid".*?</section>', s, "book grid")
lightbox = re.search(r'<dialog[^>]*data-book-lightbox.*?</dialog>', s, re.S)
main = f"""<section class="s-bay" style="padding-top:clamp(120px,14vw,180px)">
  <div class="s-head"><div><span class="s-eyebrow">Portfolio</span><h1 class="s-display">The Book.</h1></div><p>A selection of Spodja work across graduation, weddings, events and portraits. Tap any photo to view it full screen.</p></div>
  {grid}
</section>
{lightbox.group(0) if lightbox else ''}"""
out["book/index.html"] = page("book", "The Book | Spodja PH", "The Spodja PH portfolio.", "/book/", main,
                              ["/assets/site.js", "/assets/enhance-v10.js", "/assets/v11.js"])

# ---------------------------------------------------------------- home
SERVICES = [
    ("/graduation/", "Graduation", "Campus portraits with live booking times.", "/assets/portfolio/hd/grad-house-1.jpg"),
    ("/weddings/", "Weddings", "Intimate, traditional and full-day coverage.", "/assets/portfolio/hd/wedding-lane-1.jpg"),
    ("/events/", "Events", "Lobola, matric dance, birthdays, baby showers.", "/assets/portfolio/hd/_DSC2115.jpg"),
    ("/portraits/", "Portraits", "Personal, couples and professional.", "/assets/portfolio/hd/portrait-room-1.jpg"),
    ("/brands/", "Brands", "Corporate, activations and content.", "/assets/portfolio/portrait-2.jpg"),
]
tiles = "".join(
    f'<a class="s-tile" href="{h}"><img src="{img}" alt="" loading="lazy" decoding="async"/><div class="s-tile-copy"><h3>{t}</h3><p>{d}</p></div></a>'
    for h, t, d, img in SERVICES
)
main = "\n".join([
    hero("/assets/portfolio/hd/_DSC2179.jpg", "Spodja PH · Photography &amp; film",
         "We capture<br/><em>your story.</em>",
         "Photography for the moments that define you, from graduation and weddings to events, portraits and brands.",
         ("#services", "Book a shoot"), ("/book/", "See the work"), "50% 30%", SLIDES["home"]),
    f"""<section class="s-bay" id="services">
  <div class="s-head s-rise"><div><span class="s-eyebrow">What we shoot</span><h2 class="s-h2">Choose your <em>shoot.</em></h2></div><p>Each one has its own packages and booking, so you only see what applies to you.</p></div>
  <div class="s-wrap s-tiles s-stagger">{tiles}</div>
</section>""",
    work(["/assets/portfolio/hd/_DSC0396copy(3).jpg", "/assets/portfolio/hd/_DSC2181.jpg", "/assets/portfolio/hd/_DSC0336copy(3).jpg",
          "/assets/portfolio/hd/_DSC2151.jpg", "/assets/portfolio/hd/_DSC0281copy(3).jpg"], "Stories made <em>visible.</em>"),
    """<section class="s-bay s-bay-2">
  <div class="s-head s-rise"><div><span class="s-eyebrow">How it works</span><h2 class="s-h2">Three steps. <em>No guesswork.</em></h2></div></div>
  <div class="s-wrap s-steps s-stagger">
    <div class="s-step"><b>01</b><h3>Choose</h3><p>Pick your shoot and a package with clear prices and what's included.</p></div>
    <div class="s-step"><b>02</b><h3>Book</h3><p>Add your date and details, then pay a deposit securely or book on WhatsApp. Either way, your choices come with you.</p></div>
    <div class="s-step"><b>03</b><h3>Receive</h3><p>Your edited photos arrive in a private online gallery to view, download and share.</p></div>
  </div>
</section>""",
    """<section class="s-bay s-close">
  <span class="s-eyebrow">Your gallery</span>
  <h2 class="s-h2">Already shot with us? <em>Your photos are waiting.</em></h2>
  <div class="s-actions"><a class="s-btn s-btn-ghost" href="/client/">Open your gallery</a></div>
</section>""",
])
out["index.html"] = page("home", "Spodja PH — We Capture Your Story",
                         "Spodja PH — photography and visual content for graduation, weddings, events, portraits and brands across Gauteng.",
                         "/", main, ["/assets/site.js", "/assets/v11.js"], "/assets/portfolio/hd/_DSC2179.jpg")

# ---------------------------------------------------------------- payment link (/pay/)
main = """<section class="s-book s-pay">
  <div class="s-pay-card" data-pay>
    <span class="s-eyebrow">Secure payment</span>
    <h1 class="s-h2" data-pay-title>Loading your payment…</h1>
    <p class="s-pay-desc" data-pay-desc></p>
    <dl class="s-pay-meta" data-pay-meta hidden>
      <div><dt>Amount</dt><dd class="s-pay-amount" data-pay-amount></dd></div>
      <div><dt>Reference</dt><dd data-pay-ref></dd></div>
    </dl>
    <div aria-live="polite" class="status" data-pay-status></div>
    <button class="s-btn s-btn-red s-pay-btn" type="button" data-pay-btn hidden>Pay securely →</button>
    <p class="s-pay-fine">Card, Apple Pay and Google Pay, processed by Yoco. Spodja PH never sees or stores your card details.</p>
    <p class="s-pay-help">Questions about this payment? <a href="https://wa.me/""" + WHATSAPP + """" target="_blank" rel="noopener">Message us on WhatsApp</a>.</p>
  </div>
</section>"""
out["pay/index.html"] = page("pay", "Secure payment | Spodja PH", "Pay your Spodja PH booking securely.", "", main,
                             ["/assets/site.js", "/assets/pay.js"]).replace("<head>", '<head>\n<meta name="robots" content="noindex"/>', 1)

for rel, content in out.items():
    (ROOT / rel).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / rel).write_text(content)
    print("wrote", rel, len(content))
