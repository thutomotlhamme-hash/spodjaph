// /pay/?l=<token>: a payment link created in the command centre, paid through Yoco.
(() => {
  const API = 'https://agdzdhjkkkvjpwhzitlj.supabase.co/functions/v1/spodja-command-centre';
  const qp = new URLSearchParams(location.search), token = qp.get('l') || '', result = qp.get('result');
  const $ = (s) => document.querySelector(s);
  const money = (c) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format((Number(c) || 0) / 100);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const btn = $('[data-pay-btn]');

  const call = async (action) => {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token, return_origin: location.origin }) });
    const out = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, out };
  };
  const status = (html, type = '') => { const s = $('[data-pay-status]'); s.className = `status show ${type}`; s.innerHTML = html; };

  function render(link) {
    $('[data-pay-title]').innerHTML = link.client_name ? `Hi ${esc(link.client_name)}.` : 'Your payment.';
    $('[data-pay-desc]').textContent = link.description || '';
    $('[data-pay-amount]').textContent = money(link.amount_cents);
    $('[data-pay-ref]').textContent = link.link_ref || '';
    $('[data-pay-meta]').hidden = false;
    btn.textContent = `Pay ${money(link.amount_cents)} securely →`;
    btn.hidden = link.status !== 'open';
    if (link.status === 'paid') paid(link);
    else if (link.status === 'expired') status('This payment link has expired. Message us on WhatsApp and we’ll send you a new one.', 'error');
    else if (link.status === 'cancelled') status('This payment link is no longer active. Message us on WhatsApp if you still need to pay.', 'error');
  }

  function paid(link) {
    btn.hidden = true;
    $('[data-pay-title]').innerHTML = 'Payment received. <em>Thank you.</em>';
    status(`We’ve received your payment of <strong>${money(link.amount_cents)}</strong>. Reference <strong>${esc(link.link_ref)}</strong>. We’ll be in touch with next steps.`, 'success');
  }

  async function verify(tries = 0) {
    status('Confirming your payment with Yoco…');
    const { ok, status: code, out } = await call('pay_verify');
    if (ok && out.paid) return paid(out.link);
    if (code === 202 && tries < 4) return setTimeout(() => verify(tries + 1), 2500);
    if (out.link) render(out.link);
    status('We couldn’t confirm the payment yet. If money left your account, don’t pay again; message us on WhatsApp with your reference and we’ll confirm it.', 'error');
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status('Opening secure checkout…');
    try {
      const { ok, out } = await call('pay_start');
      if (out.already_paid) return paid(out.link);
      if (!ok || !out.redirect_url) throw new Error(out.error || 'checkout_unavailable');
      location.href = out.redirect_url;
    } catch (e) {
      const known = { link_expired: 'This link has expired.', link_cancelled: 'This link is no longer active.', yoco_not_configured: 'Online payment is temporarily unavailable.' };
      status(`${known[e.message] || 'Checkout could not open.'} Please try again, or message us on WhatsApp.`, 'error');
      btn.disabled = false;
    }
  });

  async function boot() {
    if (!token) { $('[data-pay-title]').textContent = 'Payment link not found.'; status('Open the link exactly as we sent it, or message us on WhatsApp.', 'error'); return; }
    const { ok, out } = await call('pay_view').catch(() => ({ ok: false, out: {} }));
    if (!ok || !out.link) { $('[data-pay-title]').textContent = 'Payment link not found.'; status('Open the link exactly as we sent it, or message us on WhatsApp.', 'error'); return; }
    render(out.link);
    if (out.link.status !== 'open') return;
    if (result === 'success') verify();
    else if (result === 'cancelled') status('Payment was cancelled. You can try again whenever you’re ready.');
    else if (result === 'failed') status('The payment didn’t go through. Please try again or use a different card.', 'error');
  }
  boot();
})();
