// Mobile menu
const gnav = document.querySelector('.gnav');
const menuBtn = document.querySelector('.gnav-menu');
menuBtn?.addEventListener('click', () => {
  const open = gnav.toggleAttribute('data-open');
  menuBtn.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
});

// Missing photos fall back to an empty black exhibition tile
for (const img of document.querySelectorAll('.tile img')) {
  const empty = () => img.closest('.tile').setAttribute('data-empty', '');
  if (img.complete && img.naturalWidth === 0) empty();
  else img.addEventListener('error', empty, { once: true });
}

// Close-look selector: one pill open, its frame on stage
for (const closer of document.querySelectorAll('.closer')) {
  const chips = [...closer.querySelectorAll('.chip')];
  const frames = [...closer.querySelectorAll('.stage .tile')];
  const select = (i) => {
    chips.forEach((c, j) => c.setAttribute('aria-selected', String(i === j)));
    frames.forEach((f, j) => f.toggleAttribute('data-active', i === j));
  };
  chips.forEach((chip, i) => {
    chip.addEventListener('click', (e) => { if (!e.target.closest('a')) select(i); });
    chip.addEventListener('keydown', (e) => {
      if (e.target !== chip) return;
      const to = { Enter: i, ' ': i, ArrowDown: i + 1, ArrowUp: i - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      const n = (to + chips.length) % chips.length;
      select(n);
      chips[n].focus();
    });
  });
}

// Booking form: preselect the occasion a page linked from
const occasion = new URLSearchParams(location.search).get('occasion');
const occasionField = document.querySelector('#f-occasion');
if (occasion && occasionField) {
  const match = [...occasionField.options].find((o) => o.text === occasion);
  if (match) occasionField.value = match.text;
}

// Reveal on scroll
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('in'));
}
