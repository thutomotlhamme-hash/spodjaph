// Spodja v11: gentle reveal on scroll. Content is visible without JS; the
// .js class (set inline in <head>) is what allows it to start hidden.
(() => {
  const els = document.querySelectorAll('.s-rise');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -6% 0px' });
  els.forEach((e) => io.observe(e));
})();
