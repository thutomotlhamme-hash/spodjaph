// Spodja v11 motion: hero slideshow, logo accent pulse, reveal on scroll.
// Everything is visible without JS; motion is skipped for reduced-motion users.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Hero slideshow: crossfade + slow settle, with progress bars ----------
  for (const hero of document.querySelectorAll('.s-hero[data-slides]')) {
    const srcs = hero.dataset.slides.split('|').filter(Boolean);
    const first = hero.querySelector(':scope > img');
    if (!first || srcs.length < 2) continue;
    first.classList.add('s-slide', 'is-active');
    const slides = [first, ...srcs.slice(1).map((src) => {
      const im = document.createElement('img');
      im.className = 's-slide';
      im.alt = '';
      im.decoding = 'async';
      im.loading = 'lazy';
      im.src = src;
      im.style.objectPosition = first.style.objectPosition;
      first.after(im);
      return im;
    })];
    if (reduce) continue;
    const bars = document.createElement('div');
    bars.className = 's-slide-bars';
    bars.innerHTML = slides.map(() => '<i></i>').join('');
    hero.append(bars);
    const ticks = [...bars.children];
    let i = 0;
    const show = (n) => {
      slides[i].classList.remove('is-active'); ticks[i].classList.remove('on');
      i = n % slides.length;
      slides[i].classList.add('is-active');
      ticks[i].classList.remove('on'); void ticks[i].offsetWidth; ticks[i].classList.add('on');
    };
    ticks[0].classList.add('on');
    let timer = setInterval(() => show(i + 1), 5600);
    document.addEventListener('visibilitychange', () => {
      clearInterval(timer);
      if (!document.hidden) timer = setInterval(() => show(i + 1), 5600);
    });
  }

  // ---------- Logo: white mark briefly swaps to the red accent mark ----------
  const logos = document.querySelectorAll('.s-logo');
  if (logos.length && !reduce) {
    const pulse = () => {
      logos.forEach((l) => l.classList.add('show-accent'));
      setTimeout(() => logos.forEach((l) => l.classList.remove('show-accent')), 2800);
    };
    setTimeout(pulse, 6500);
    setInterval(pulse, 12000);
  }

  // ---------- Reveal on scroll (the .js class lets these start hidden) ----------
  const els = document.querySelectorAll('.s-rise, .s-stagger');
  if (!('IntersectionObserver' in window) || reduce) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));
})();
