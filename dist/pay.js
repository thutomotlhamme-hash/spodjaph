// Payment pages: /pay/ (client chooses), /pay/done/ (confirmation), /studio/ (photographer makes links).

const $ = (sel) => document.querySelector(sel);
const params = new URLSearchParams(location.search);
const money = (cents) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(cents / 100);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Read the visible half of a signed link. The server re-checks the signature before charging.
const readLink = (token) => {
  try {
    const b = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b + '==='.slice((b.length + 3) % 4));
    const link = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return link && link.n && link.t ? link : null;
  } catch {
    return null;
  }
};

const post = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
};

const show = (el, text, tone = '') => {
  el.textContent = text;
  el.dataset.tone = tone;
  el.hidden = !text;
};

// ---------- /pay/ ----------

function payPage(root) {
  const token = params.get('c') || '';
  const link = readLink(token);
  const status = $('#pay-status');

  if (!link) {
    $('#pay-title').textContent = 'Link incomplete.';
    show(status, 'This payment link is incomplete. Please open the full link we sent you, or contact us for a new one.', 'warn');
    return;
  }

  const first = link.n.split(/\s+/)[0];
  $('#pay-title').textContent = `${first}, your ${link.o.toLowerCase()}.`;
  $('#pay-client').textContent = link.n;
  $('#pay-occasion').textContent = link.o;
  $('#pay-total').textContent = money(link.t);
  $('#pay-summary').hidden = false;

  if (params.get('status') === 'cancelled') show(status, 'Payment cancelled. Nothing was charged. You can choose an option again below.');
  if (params.get('status') === 'failed') show(status, 'The payment didn’t go through and nothing was charged. Please try again or use another card.', 'warn');

  const half = Math.round(link.t / 2);
  const options =
    link.k === 'balance'
      ? [{ id: 'balance', eyebrow: 'Balance due', title: 'Pay the balance', amount: link.d,
           note: `Of your ${money(link.t)} total.`, featured: true }]
      : [
          { id: 'deposit', eyebrow: 'Secure your date', title: '50% deposit', amount: half,
            note: `The other ${money(link.t - half)} is due on the day, by card, cash or EFT.`, featured: true },
          { id: 'full', eyebrow: 'Settle it now', title: 'Pay in full', amount: link.t,
            note: 'Nothing left to pay on the day.' },
        ];

  const list = $('#pay-options');
  list.innerHTML = options
    .map(
      (o) => `<article class="pay-option${o.featured ? ' featured' : ''}">
        <p class="micro">${o.eyebrow}</p>
        <h2>${o.title}</h2>
        <p class="pay-amount">${money(o.amount)}</p>
        <p class="pay-note">${esc(o.note)}</p>
        <button class="btn btn-lg" type="button" data-option="${o.id}">Pay ${money(o.amount)}</button>
      </article>`,
    )
    .join('');
  list.hidden = false;

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-option]');
    if (!btn) return;
    const buttons = list.querySelectorAll('button');
    buttons.forEach((b) => (b.disabled = true));
    const label = btn.textContent;
    btn.textContent = 'Opening secure payment…';
    try {
      const { redirectUrl } = await post('/api/checkout', { token, option: btn.dataset.option });
      location.href = redirectUrl;
    } catch (err) {
      show(status, err.message, 'warn');
      btn.textContent = label;
      buttons.forEach((b) => (b.disabled = false));
    }
  });
}

// ---------- /pay/done/ ----------

function donePage() {
  const link = readLink(params.get('c') || '');
  if (!link) return;
  const option = params.get('o');
  const first = link.n.split(/\s+/)[0];
  const occasion = link.o.toLowerCase();
  const half = Math.round(link.t / 2);
  const lines = {
    deposit: [`Thank you, ${first}. Your 50% deposit of ${money(half)} is paid and your ${occasion} date is secured.`,
              `The balance of ${money(link.t - half)} is due on the day. Pay by card, cash or EFT, whichever suits you.`],
    full: [`Thank you, ${first}. Your ${occasion} is paid in full: ${money(link.t)}.`, 'There is nothing left to pay. See you on the day.'],
    balance: [`Thank you, ${first}. Your balance of ${money(link.d || 0)} is paid.`, `Your ${occasion} is now fully settled.`],
  }[option];
  if (!lines) return;
  $('#done-lede').textContent = lines[0];
  $('#done-next').textContent = lines[1];
}

// ---------- /studio/ ----------

function studioPage() {
  const form = $('#studio-form');
  const error = $('#studio-error');
  const out = $('#studio-out');
  const kindInputs = form.querySelectorAll('input[name="kind"]');
  const balanceRow = $('#balance-row');
  const total = $('#s-total');
  const balance = $('#s-balance');

  try {
    $('#s-password').value = sessionStorage.getItem('studio-pass') || '';
  } catch {}

  const syncKind = () => {
    const isBalance = form.kind.value === 'balance';
    balanceRow.hidden = !isBalance;
    balance.required = isBalance;
    if (isBalance && !balance.value && total.value) balance.value = (Number(total.value) / 2).toFixed(2).replace(/\.00$/, '');
  };
  kindInputs.forEach((i) => i.addEventListener('change', syncKind));
  total.addEventListener('input', () => {
    if (form.kind.value === 'balance') balance.value = '';
    syncKind();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    show(error, '');
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    const data = Object.fromEntries(new FormData(form));
    try {
      sessionStorage.setItem('studio-pass', data.password);
    } catch {}
    try {
      const { token } = await post('/api/studio-link', data);
      renderLink(token, data);
    } catch (err) {
      show(error, err.message, 'warn');
    } finally {
      submit.disabled = false;
    }
  });

  function renderLink(token, data) {
    const url = `${location.origin}/pay/?c=${token}`;
    const first = data.name.trim().split(/\s+/)[0];
    const occasion = data.occasion.toLowerCase();
    const message =
      data.kind === 'balance'
        ? `Hi ${first}, here is the link to pay the balance for your ${occasion}: ${url}`
        : `Hi ${first}, thank you for booking your ${occasion}. You can pay in full, or pay 50% now to secure your date: ${url}`;

    $('#studio-url').value = url;
    $('#studio-wa').href = `https://wa.me/?text=${encodeURIComponent(message)}`;
    $('#studio-open').href = url;
    $('#studio-summary').textContent =
      data.kind === 'balance'
        ? `${data.name} · ${data.occasion} · balance ${money(Math.round(data.balance * 100))}`
        : `${data.name} · ${data.occasion} · ${money(Math.round(data.total * 100))}, full or 50%`;

    const qr = window.qrcode?.(0, 'L');
    if (qr) {
      qr.addData(url);
      qr.make();
      $('#studio-qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    }
    out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#studio-copy').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const field = $('#studio-url');
    try {
      await navigator.clipboard.writeText(field.value);
      btn.textContent = 'Copied';
    } catch {
      field.select();
      btn.textContent = 'Selected, press copy';
    }
    setTimeout(() => (btn.textContent = 'Copy link'), 2000);
  });
}

if ($('#pay-options')) payPage();
if ($('#done-lede')) donePage();
if ($('#studio-form')) studioPage();
