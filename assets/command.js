// Spodja command centre: calendar, bookings, balances, payment links and activity.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const URL_ = 'https://agdzdhjkkkvjpwhzitlj.supabase.co';
const KEY = 'sb_publishable_0gMKdbdVJG2qtrBDoHBm5g_i_10v2sB';
const API = `${URL_}/functions/v1/spodja-command-centre`;
const supabase = createClient(URL_, KEY, { auth: { persistSession: true, detectSessionInUrl: true } });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (c) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format((Number(c) || 0) / 100);
const toCents = (v) => Math.round(parseFloat(String(v).replace(',', '.')) * 100);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());
const fmtDate = (d) => d ? new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00`)) : 'No date';
const fmtWhen = (iso) => new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const timeOf = (iso) => iso ? new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) : '';
const state = (j) => j.status === 'cancelled' ? 'off' : j.total_cents > 0 && j.outstanding_cents <= 0 ? 'paid' : j.paid_cents > 0 ? 'part' : 'due';
const demoTag = (x) => (x && x.is_demo ? '<span class="cc-demo-tag">DEMO</span>' : '');
const METHOD = { yoco_link: 'Yoco link', yoco_checkout: 'Yoco (website)', card: 'Card', cash: 'Cash', eft: 'EFT', other: 'Other', refund: 'Refund' };

let session = null;
let data = { jobs: [], links: [], ledger: [], activity: [], enquiries: [] };
let filter = 'outstanding', search = '', month = today().slice(0, 7), dayOpen = null, openJobId = null;
const selected = new Set();

// ------------------------------------------------------------------ api
async function call(action, payload = {}) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}`, apikey: KEY },
    body: JSON.stringify({ action, site_origin: location.origin, ...payload }),
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || 'request_failed');
  return out;
}

async function load() {
  $('#refresh').disabled = true;
  try {
    data = await call('overview');
    render();
    if (openJobId) fillMoney(jobById(openJobId));
  } catch (e) {
    $('#stats').innerHTML = `<div class="cc-stat cc-err">Could not load: ${esc(e.message)}</div>`;
  } finally { $('#refresh').disabled = false; }
}

const jobById = (id) => data.jobs.find((j) => j.id === id);
const linkUrl = (l) => `${location.origin}/pay/?l=${l.token}`;
const waPhone = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('0') ? `27${d.slice(1)}` : d; };

// ------------------------------------------------------------------ render
function render() {
  renderStats();
  renderCalendar();
  renderJobs();
  renderEnquiries();
  renderLinks();
  renderActivity();
}

function renderStats() {
  const live = data.jobs.filter((j) => j.status !== 'cancelled');
  const owed = live.reduce((n, j) => n + Math.max(0, j.outstanding_cents), 0);
  const m = today().slice(0, 7);
  const got = data.ledger.filter((l) => String(l.paid_at).slice(0, 7) === m).reduce((n, l) => n + l.amount_cents, 0);
  const t = today(), in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const soon = live.filter((j) => j.shoot_date && j.shoot_date >= t && j.shoot_date <= in30).length;
  const open = data.links.filter((l) => l.status === 'open' && new Date(l.expires_at) > new Date());
  $('#stats').innerHTML = [
    ['Outstanding', money(owed), `${live.filter((j) => j.outstanding_cents > 0).length} bookings`],
    ['Received this month', money(got), `${data.ledger.filter((l) => String(l.paid_at).slice(0, 7) === m).length} payments`],
    ['Shoots in 30 days', soon, 'confirmed bookings'],
    ['Open payment links', open.length, money(open.reduce((n, l) => n + l.amount_cents, 0))],
  ].map(([k, v, s]) => `<div class="cc-stat"><span>${k}</span><strong>${v}</strong><small>${s}</small></div>`).join('');
}

function renderCalendar() {
  const [y, mo] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  $('#cal-title').textContent = new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  const lead = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const t = today();
  let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="cc-dow">${d}</div>`).join('');
  for (let i = 0; i < lead; i++) html += '<div class="cc-cell cc-blank"></div>';
  for (let d = 1; d <= days; d++) {
    const iso = `${month}-${String(d).padStart(2, '0')}`;
    const jobs = data.jobs.filter((j) => j.shoot_date === iso && j.status !== 'cancelled');
    const enq = data.enquiries.filter((e) => e.shoot_date === iso);
    const chips = [...jobs.map((j) => `<span class="cc-chip k-${state(j)}">${esc(timeOf(j.starts_at))} ${esc(j.client_name.split(' ')[0])}</span>`),
      ...enq.map((e) => `<span class="cc-chip k-enq">${esc(e.contact_name.split(' ')[0])}</span>`)];
    html += `<button type="button" class="cc-cell${iso === t ? ' is-today' : ''}${iso === dayOpen ? ' is-open' : ''}" data-day="${iso}"><b>${d}</b>${chips.slice(0, 3).join('')}${chips.length > 3 ? `<small>+${chips.length - 3} more</small>` : ''}</button>`;
  }
  for (let i = (lead + days) % 7; i && i < 7; i++) html += '<div class="cc-cell cc-blank"></div>';
  $('#calendar').innerHTML = html;
  renderDay();
}

function renderDay() {
  const el = $('#day');
  if (!dayOpen) { el.innerHTML = ''; return; }
  const jobs = data.jobs.filter((j) => j.shoot_date === dayOpen && j.status !== 'cancelled');
  const enq = data.enquiries.filter((e) => e.shoot_date === dayOpen);
  el.innerHTML = `<div class="cc-day-head"><h3>${fmtDate(dayOpen)}</h3><button class="cc-btn cc-btn-dark" type="button" data-new-job="${dayOpen}">+ Booking on this day</button></div>
    ${jobs.length || enq.length ? '' : '<p class="cc-empty">Nothing booked. The day is open.</p>'}
    ${jobs.map(jobCard).join('')}
    ${enq.map(enquiryCard).join('')}`;
}

const jobCard = (j) => `<button type="button" class="cc-card" data-job="${j.id}">
  <span class="cc-dot k-${state(j)}"></span>
  <div><b>${esc(j.client_name)}${demoTag(j)}</b><small>${esc(j.title)}${j.starts_at ? ` · ${timeOf(j.starts_at)}` : ''}${j.venue ? ` · ${esc(j.venue)}` : ''}</small></div>
  <div class="r"><b>${j.outstanding_cents > 0 ? money(j.outstanding_cents) : 'Cleared'}</b><small>${j.outstanding_cents > 0 ? 'outstanding' : money(j.total_cents)}</small></div></button>`;

const enquiryCard = (e) => `<div class="cc-card cc-card-enq">
  <span class="cc-dot k-enq"></span>
  <div><b>${esc(e.contact_name)}${demoTag(e)}</b><small>${esc(e.enquiry_ref)} · ${esc(e.service_type)} · ${fmtDate(e.shoot_date)}${e.budget_range ? ` · ${esc(e.budget_range)}` : ''}</small></div>
  <div class="r"><button class="cc-btn cc-btn-dark" type="button" data-confirm-enquiry="${e.id}">Confirm as booking</button></div></div>`;

function visibleJobs() {
  const t = today(), q = search.toLowerCase();
  return data.jobs
    .filter((j) => filter === 'all' || (filter === 'outstanding' ? j.outstanding_cents > 0 && j.status !== 'cancelled' : j.shoot_date && j.shoot_date >= t && j.status !== 'cancelled'))
    .filter((j) => !q || [j.client_name, j.title, j.job_ref, j.client_phone, j.notes].join(' ').toLowerCase().includes(q));
}

function renderJobs() {
  const rows = visibleJobs();
  $('#jobs').innerHTML = rows.length ? rows.map((j) => `<tr data-job="${j.id}" class="k-row-${state(j)}">
      <td><input type="checkbox" data-select="${j.id}" ${selected.has(j.id) ? 'checked' : ''} aria-label="Select ${esc(j.client_name)}"/></td>
      <td>${fmtDate(j.shoot_date)}</td>
      <td><b>${esc(j.client_name)}${demoTag(j)}</b><small>${esc(j.job_ref)} · ${esc(j.source)}</small></td>
      <td>${esc(j.title)}${j.status !== 'confirmed' ? ` <em class="cc-tag">${esc(j.status)}</em>` : ''}</td>
      <td class="r">${money(j.total_cents)}</td><td class="r">${money(j.paid_cents)}</td>
      <td class="r"><b>${j.outstanding_cents > 0 ? money(j.outstanding_cents) : '<span class="cc-ok">Cleared</span>'}</b></td></tr>`).join('')
    : '<tr><td colspan="7" class="cc-empty">No bookings here.</td></tr>';
  $('#select-bar').hidden = !selected.size;
  $('#select-count').textContent = `${selected.size} selected · ${money([...selected].reduce((n, id) => n + Math.max(0, jobById(id)?.outstanding_cents || 0), 0))} outstanding`;
}

function renderEnquiries() {
  $('#enquiries').innerHTML = data.enquiries.length ? data.enquiries.map(enquiryCard).join('') : '<p class="cc-empty">No website enquiries waiting.</p>';
}

function linkStatus(l) { return l.status === 'open' && new Date(l.expires_at) < new Date() ? 'expired' : l.status; }

function renderLinks() {
  $('#links').innerHTML = data.links.length ? data.links.map((l) => {
    const st = linkStatus(l);
    const jobs = (l.items || []).map((i) => jobById(i.job_id)?.client_name).filter(Boolean);
    return `<div class="cc-card cc-link">
      <span class="cc-pill s-${st}">${st}</span>
      <div><b>${esc(l.client_name)} · ${money(l.amount_cents)}${demoTag(l)}</b><small>${esc(l.description)} · ${esc(l.link_ref)}${(l.items || []).length > 1 ? ` · bundle of ${l.items.length}` : ''}${jobs.length ? ` · ${esc([...new Set(jobs)].join(', '))}` : ''}</small><small>Created ${fmtWhen(l.created_at)}${l.paid_at ? ` · paid ${fmtWhen(l.paid_at)}` : st === 'open' ? ` · expires ${fmtWhen(l.expires_at)}` : ''}</small></div>
      <div class="cc-link-actions">${st === 'open' ? `<button class="cc-btn" type="button" data-link-wa="${l.id}">WhatsApp</button><button class="cc-btn" type="button" data-link-copy="${l.id}">Copy</button><button class="cc-btn" type="button" data-link-check="${l.id}">Check payment</button><button class="cc-btn cc-btn-quiet" type="button" data-link-cancel="${l.id}">Cancel</button>` : ''}</div></div>`;
  }).join('') : '<p class="cc-empty">No payment links yet. Open a booking to create one.</p>';
}

function describe(a) {
  const d = a.detail || {}, j = a.job_id ? jobById(a.job_id) : null, who = j ? ` · ${esc(j.client_name)}` : '';
  switch (a.action) {
    case 'job_created': return `Booking created${who}${d.source ? ` (${esc(d.source)})` : ''}`;
    case 'job_updated': return `Booking updated${who}${d.status ? ` · ${esc(d.status)}` : ''}`;
    case 'payment_recorded': return `${METHOD[d.method] || esc(d.method)} payment of ${money(Math.abs(d.amount_cents))} recorded${who}${d.note ? ` · ${esc(d.note)}` : ''}`;
    case 'payment_received': return `Online payment of ${money(d.amount_cents)} received${who}`;
    case 'payment_removed': return `Payment of ${money(d.amount_cents)} removed${who}`;
    case 'link_created': return `Payment link ${esc(d.link_ref)} for ${money(d.amount_cents)} created${who}${d.bundle ? ' (bundle)' : ''}`;
    case 'link_paid': return `Payment link ${esc(d.link_ref)} paid · ${money(d.amount_cents)}`;
    case 'link_cancelled': return `Payment link ${esc(d.link_ref)} cancelled`;
    default: return esc(a.action);
  }
}

const logHtml = (rows) => rows.length ? rows.map((a) => `<div class="cc-log-row"><time>${fmtWhen(a.created_at)}</time><span>${describe(a)}</span></div>`).join('') : '<p class="cc-empty">Nothing logged yet.</p>';
function renderActivity() { $('#activity').innerHTML = logHtml(data.activity); }

// ------------------------------------------------------------------ booking dialog
const jobDialog = $('#job-dialog'), jobForm = $('#job-form');
let method = 'cash', presetPurpose = 'balance';

function openJob(job, date) {
  openJobId = job?.id || null;
  jobForm.reset();
  const f = jobForm.elements;
  f.id.value = job?.id || '';
  if (job) {
    for (const k of ['client_name', 'client_phone', 'client_email', 'service_type', 'title', 'shoot_date', 'venue', 'status', 'notes']) if (f[k]) f[k].value = job[k] || (k === 'status' ? 'confirmed' : '');
    f.start_time.value = timeOf(job.starts_at);
    f.total.value = (job.total_cents / 100).toFixed(2).replace(/\.00$/, '');
  } else if (date) f.shoot_date.value = date;
  $('#job-eyebrow').textContent = job ? `${job.job_ref} · ${job.source}` : 'New booking';
  $('#job-title').textContent = job ? job.client_name : 'Confirm a booking';
  $('#job-msg').textContent = '';
  $('#job-money').hidden = !job;
  if (job) fillMoney(job);
  jobDialog.showModal();
}

function fillMoney(j) {
  if (!j) return;
  $('#job-balance').innerHTML = `<div><span>Total</span><b>${money(j.total_cents)}</b></div><div><span>Paid</span><b>${money(j.paid_cents)}</b></div><div class="k-${state(j)}"><span>Outstanding</span><b>${money(Math.max(0, j.outstanding_cents))}</b></div>`;
  const rows = data.ledger.filter((l) => l.job_id === j.id);
  $('#job-ledger').innerHTML = rows.length ? rows.map((l) => `<div class="cc-ledger-row"><span>${fmtWhen(l.paid_at)}</span><span>${METHOD[l.method] || esc(l.method)}${l.note ? ` · ${esc(l.note)}` : ''}</span><b>${money(l.amount_cents)}</b>${l.external_ref ? '<i title="Online payment">✓</i>' : `<button type="button" class="cc-x-sm" data-ledger-del="${l.id}" aria-label="Remove payment">×</button>`}</div>`).join('') : '<p class="cc-empty">No payments yet.</p>';
  const out = Math.max(0, j.outstanding_cents), half = Math.round(j.total_cents / 2);
  const presets = [['deposit', '50% deposit', half], ['balance', 'Outstanding', out], ['full', 'Full amount', j.total_cents]].filter(([, , c]) => c >= 200);
  $('#link-presets').innerHTML = presets.map(([p, label, c]) => `<button type="button" data-preset="${p}" data-cents="${c}">${label} · ${money(c)}</button>`).join('');
  const def = presets.find(([p]) => p === (j.paid_cents > 0 ? 'balance' : 'deposit')) || presets[0];
  setPreset(def ? def[0] : 'custom', def ? def[2] : 0, j);
  $('#pay-amount').value = out ? (out / 100).toFixed(2).replace(/\.00$/, '') : '';
  $('#pay-date').value = today();
  $('#job-log').innerHTML = logHtml(data.activity.filter((a) => a.job_id === j.id));
}

function setPreset(p, c, j) {
  presetPurpose = p;
  $$('#link-presets button').forEach((b) => b.classList.toggle('on', b.dataset.preset === p));
  if (c) $('#link-amount').value = (c / 100).toFixed(2).replace(/\.00$/, '');
  const label = { deposit: 'Deposit', balance: 'Balance', full: 'Payment' }[p] || 'Payment';
  $('#link-desc').value = `${label} · ${j.title}${j.shoot_date ? ` · ${fmtDate(j.shoot_date)}` : ''}`;
}

async function saveJob() {
  const f = jobForm.elements;
  if (!jobForm.reportValidity()) return null;
  const total = toCents(f.total.value || 0);
  const job = {
    id: f.id.value || undefined, client_name: f.client_name.value, client_phone: f.client_phone.value, client_email: f.client_email.value,
    service_type: f.service_type.value, title: f.title.value, shoot_date: f.shoot_date.value, venue: f.venue.value, notes: f.notes.value,
    status: f.status.value, total_cents: total, source: 'whatsapp',
    starts_at: f.shoot_date.value && f.start_time.value ? `${f.shoot_date.value}T${f.start_time.value}:00+02:00` : null,
  };
  $('#job-msg').textContent = 'Saving…';
  try {
    const out = await call('job_save', { job });
    $('#job-msg').textContent = 'Saved.';
    openJobId = out.job.id;
    await load();
    const fresh = jobById(out.job.id);
    if (fresh && !f.id.value) openJob(fresh); // new booking: reveal payments
    return fresh;
  } catch (e) { $('#job-msg').textContent = `Could not save: ${e.message}`; return null; }
}

async function createLink(items, description, purpose) {
  const out = await call('link_create', { items, description, purpose });
  await load();
  showShare(out.link, out.url || linkUrl(out.link));
}

function showShare(link, url) {
  $('#share-amount').textContent = money(link.amount_cents);
  $('#share-desc').textContent = `${link.client_name} · ${link.description}`;
  $('#share-url').value = url;
  $('#share-wa').onclick = () => sendWa(link, url);
  $('#share-copy').onclick = () => copy(url, $('#share-copy'));
  if (jobDialog.open) jobDialog.close();
  if ($('#bundle-dialog').open) $('#bundle-dialog').close();
  $('#share-dialog').showModal();
}

function sendWa(link, url) {
  const first = String(link.client_name || '').split(/\s+/)[0];
  const text = `Hi ${first}, here is your secure Spodja PH payment link for ${link.description} (${money(link.amount_cents)}):\n${url}\n\nYou can pay by card, Apple Pay or Google Pay. Thank you!`;
  const phone = waPhone(link.client_phone);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch { prompt('Copy this link', text); return; }
  const old = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => (btn.textContent = old), 1500);
}

// ------------------------------------------------------------------ bundle dialog
let bundleMode = 'link', bundleMethod = 'cash';
function openBundle(mode) {
  bundleMode = mode;
  const jobs = [...selected].map(jobById).filter(Boolean);
  if (!jobs.length) return;
  $('#bundle-eyebrow').textContent = `${jobs.length} bookings`;
  $('#bundle-title').textContent = mode === 'link' ? 'One link to clear them' : 'One payment across them';
  $('#bundle-rows').innerHTML = jobs.map((j) => `<label class="cc-bundle-row"><span><b>${esc(j.client_name)}</b><small>${esc(j.title)} · ${fmtDate(j.shoot_date)} · ${money(Math.max(0, j.outstanding_cents))} outstanding</small></span><input type="number" min="0" step="0.01" data-bundle-job="${j.id}" value="${(Math.max(0, j.outstanding_cents) / 100).toFixed(2).replace(/\.00$/, '')}"/></label>`).join('');
  const names = [...new Set(jobs.map((j) => j.client_name))];
  $('#bundle-desc').value = `Balance · ${jobs.map((j) => j.title).join(' + ')}`.slice(0, 190);
  $('#bundle-link-fields').hidden = mode !== 'link';
  $('#bundle-pay-fields').hidden = mode !== 'pay';
  $('#bundle-go').textContent = mode === 'link' ? 'Create link' : 'Record payment';
  $('#bundle-msg').textContent = names.length > 1 && mode === 'link' ? `Heads up: this link covers ${names.length} different clients.` : '';
  bundleTotal();
  $('#bundle-dialog').showModal();
}
function bundleItems() { return $$('[data-bundle-job]').map((i) => ({ job_id: i.dataset.bundleJob, amount_cents: toCents(i.value || 0) })).filter((i) => i.amount_cents > 0); }
function bundleTotal() { $('#bundle-total').textContent = money(bundleItems().reduce((n, i) => n + i.amount_cents, 0)); }

// ------------------------------------------------------------------ events
function seg(container, cb) {
  container.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', container).forEach((x) => x.classList.toggle('on', x === b)); cb(b);
  });
}

// ------------------------------------------------------------------ records: read everything
let rec = null, recKind = 'enquiries', recSearch = '';
const pill = (v) => v ? `<span class="cc-pill s-${esc(String(v).toLowerCase())}">${esc(String(v).replace(/_/g, ' '))}</span>` : '';
const REC = {
  enquiries: { label: 'website enquiries', cols: ['Received', 'Client', 'Service', 'Shoot date', 'Package / budget', 'Value', 'Status', 'Booking'],
    row: (e) => [fmtWhen(e.created_at), `<b>${esc(e.contact_name)}${demoTag(e)}</b><small>${esc(e.enquiry_ref)} · ${esc(e.contact_phone || '')}${e.contact_email ? ` · ${esc(e.contact_email)}` : ''}</small>`, esc(`${e.service_type}${e.client_type ? ' · ' + e.client_type : ''}`), fmtDate(e.shoot_date), `<span class="wrap">${esc(e.budget_range || e.offer_key || '—')}</span>`, e.estimated_value_cents != null ? money(e.estimated_value_cents) : 'Quote', pill(e.status), esc(e.job_ref || '—')] },
  grad_bookings: { label: 'Grad House bookings', cols: ['Created', 'Graduate', 'Package', 'Session', 'Location', 'Total', 'Payment', 'Workflow'],
    row: (g) => [fmtWhen(g.created_at), `<b>${esc(g.customer?.full_name || 'Graduate')}</b><small>${esc(g.booking_reference || '')} · ${esc(g.customer?.phone || '')}${g.customer?.email ? ` · ${esc(g.customer.email)}` : ''}</small>`, esc(g.package_slug || '—'), (g.scheduled_starts_at || g.requested_starts_at) ? fmtWhen(g.scheduled_starts_at || g.requested_starts_at) : '—', esc(g.requested_location_name || '—'), money(g.total_amount_cents), pill(g.payment_status), pill(g.workflow_status)] },
  website_payments: { label: 'website checkouts', cols: ['Started', 'Enquiry', 'Package', 'Plan', 'Amount', 'Provider', 'Status', 'Paid'],
    row: (o) => [fmtWhen(o.created_at), esc(o.enquiry_ref || '—'), esc(o.offer_key || '—'), esc(o.payment_plan || '—'), money(o.amount_cents), esc(o.provider), pill(o.status), o.paid_at ? fmtWhen(o.paid_at) : '—'] },
  grad_payments: { label: 'Grad House payments', cols: ['Started', 'Booking', 'Amount', 'Provider', 'Status', 'Paid'],
    row: (p) => [fmtWhen(p.created_at), esc(p.booking_reference || '—'), money(p.amount_cents), esc(p.provider), pill(p.status), p.paid_at ? fmtWhen(p.paid_at) : '—'] },
  payment_links: { label: 'payment links', cols: ['Created', 'Client', 'For', 'Amount', 'Status', 'Paid / expires'],
    row: (l) => [fmtWhen(l.created_at), `<b>${esc(l.client_name)}${demoTag(l)}</b><small>${esc(l.link_ref)}</small>`, `<span class="wrap">${esc(l.description)}</span>`, money(l.amount_cents), pill(linkStatus(l)), l.paid_at ? fmtWhen(l.paid_at) : fmtWhen(l.expires_at)] },
  gallery_orders: { label: 'gallery orders', cols: ['Created', 'Order', 'Gallery', 'Total', 'Discount', 'Status'],
    row: (o) => [fmtWhen(o.created_at), esc(o.order_ref || o.id.slice(0, 8)), esc(o.gallery_title || '—'), money(o.total_cents), money(o.discount_cents || 0), pill(o.status)] },
  galleries: { label: 'client galleries', cols: ['Created', 'Gallery', 'Client', 'Event date', 'Status', 'Payment', 'Balance due'],
    row: (g) => [fmtWhen(g.created_at), `<b>${esc(g.title)}</b><small>${esc(g.slug || '')}</small>`, esc(g.client_name || '—'), fmtDate(g.event_date), pill(g.status), pill(g.payment_status), money(g.balance_due_cents || 0)] },
};
async function loadRecords() {
  $('#rec-meta').textContent = 'Loading everything…';
  try { rec = await call('records'); renderRecords(); } catch (e) { $('#rec-meta').textContent = `Could not load records: ${e.message}`; }
}
function renderRecords() {
  if (!rec) return;
  const def = REC[recKind], q = recSearch.toLowerCase();
  const rows = (rec[recKind] || []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
  $('#rec-head').innerHTML = `<tr>${def.cols.map((c) => `<th>${c}</th>`).join('')}</tr>`;
  $('#rec-body').innerHTML = rows.length ? rows.map((r) => `<tr>${def.row(r).map((c, i) => `<td${/class="wrap"/.test(c) ? ' class="wrap"' : ''}>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${def.cols.length}" class="cc-empty">No ${def.label} yet.</td></tr>`;
  $('#rec-meta').textContent = `${rows.length} ${def.label}${q ? ' matching your search' : ''} · read-only view of everything in the system`;
}

function bind() {
  $$('[data-tab]').forEach((t) => t.addEventListener('click', () => {
    $$('[data-tab]').forEach((x) => x.classList.toggle('on', x === t));
    $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== t.dataset.tab));
    if (t.dataset.tab === 'records') loadRecords();
  }));
  seg($('#rec-kind'), (b) => { recKind = b.dataset.k; renderRecords(); });
  $('#rec-search').addEventListener('input', (e) => { recSearch = e.target.value; renderRecords(); });
  $('#demo-seed').addEventListener('click', async (e) => {
    if (!confirm('Add the QA demo data? Every record is labelled DEMO and can be removed with "Clear demo data".')) return;
    e.target.disabled = true; e.target.textContent = 'Seeding…';
    try { await call('demo_seed'); await load(); await loadRecords(); e.target.textContent = 'Demo data added ✓'; } catch (err) { alert(`Could not seed: ${err.message}`); e.target.textContent = 'Seed demo data'; }
    finally { e.target.disabled = false; setTimeout(() => (e.target.textContent = 'Seed demo data'), 2500); }
  });
  $('#demo-clear').addEventListener('click', async (e) => {
    if (!confirm('Remove all DEMO records? Real bookings and payments are not touched.')) return;
    e.target.disabled = true;
    try { const out = await call('demo_clear'); await load(); await loadRecords(); alert(`Removed ${out.removed.jobs} demo bookings, ${out.removed.links} links and ${out.removed.enquiries} enquiries.`); } catch (err) { alert(`Could not clear: ${err.message}`); }
    finally { e.target.disabled = false; }
  });
  $('#refresh').addEventListener('click', load);
  $$('[data-cal]').forEach((b) => b.addEventListener('click', () => {
    const n = Number(b.dataset.cal);
    if (!n) month = today().slice(0, 7);
    else { const [y, m] = month.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); month = d.toISOString().slice(0, 7); }
    renderCalendar();
  }));
  seg($('#job-filter'), (b) => { filter = b.dataset.f; renderJobs(); });
  $('#job-search').addEventListener('input', (e) => { search = e.target.value; renderJobs(); });

  document.addEventListener('click', async (e) => {
    const t = e.target;
    const nj = t.closest('[data-new-job]'); if (nj) return openJob(null, nj.dataset.newJob || '');
    const day = t.closest('[data-day]'); if (day) { dayOpen = day.dataset.day; renderCalendar(); $('#day').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    if (t.matches('[data-select]')) { t.checked ? selected.add(t.dataset.select) : selected.delete(t.dataset.select); renderJobs(); return; }
    const job = t.closest('[data-job]'); if (job && !t.closest('input,button:not([data-job])')) return openJob(jobById(job.dataset.job));
    const ce = t.closest('[data-confirm-enquiry]');
    if (ce) { ce.disabled = true; try { const out = await call('job_from_enquiry', { enquiry_id: ce.dataset.confirmEnquiry }); await load(); openJob(jobById(out.job.id)); } catch (err) { alert(`Could not confirm: ${err.message}`); ce.disabled = false; } return; }
    const bulk = t.closest('[data-bulk]');
    if (bulk) { if (bulk.dataset.bulk === 'clear') { selected.clear(); renderJobs(); } else openBundle(bulk.dataset.bulk); return; }
    const link = (k) => data.links.find((l) => l.id === t.closest(`[data-link-${k}]`)?.dataset[`link${k[0].toUpperCase()}${k.slice(1)}`]);
    if (t.closest('[data-link-wa]')) { const l = link('wa'); return sendWa(l, linkUrl(l)); }
    if (t.closest('[data-link-copy]')) { const l = link('copy'); return copy(linkUrl(l), t.closest('button')); }
    if (t.closest('[data-link-check]')) {
      const l = link('check'), b = t.closest('button'); b.textContent = 'Checking…';
      try { const out = await call('link_refresh', { link_id: l.id }); b.textContent = out.paid ? 'Paid ✓' : out.error === 'yoco_not_configured' ? 'Yoco not set up' : 'Not paid yet'; if (out.paid) load(); } catch (err) { b.textContent = 'Check failed'; }
      return;
    }
    if (t.closest('[data-link-cancel]')) {
      const l = link('cancel'); if (!confirm(`Cancel payment link ${l.link_ref} for ${money(l.amount_cents)}?`)) return;
      try { await call('link_cancel', { link_id: l.id }); load(); } catch (err) { alert(err.message === 'link_already_paid' ? 'This link has already been paid.' : `Could not cancel: ${err.message}`); load(); }
      return;
    }
    const del = t.closest('[data-ledger-del]');
    if (del) { if (!confirm('Remove this payment from the record?')) return; try { await call('ledger_delete', { ledger_id: del.dataset.ledgerDel }); load(); } catch (err) { alert(`Could not remove: ${err.message}`); } }
  });

  $('#job-save').addEventListener('click', saveJob);
  $('#link-presets').addEventListener('click', (e) => { const b = e.target.closest('[data-preset]'); if (b) setPreset(b.dataset.preset, Number(b.dataset.cents), jobById(openJobId)); });
  $('#link-amount').addEventListener('input', () => { presetPurpose = 'custom'; $$('#link-presets button').forEach((b) => b.classList.remove('on')); });
  $('#link-create').addEventListener('click', async () => {
    const j = jobById(openJobId), c = toCents($('#link-amount').value);
    if (!j || !(c >= 200)) { $('#job-msg').textContent = 'Enter an amount of at least R2.'; return; }
    $('#link-create').disabled = true;
    try { await createLink([{ job_id: j.id, amount_cents: c }], $('#link-desc').value, presetPurpose); }
    catch (e) { $('#job-msg').textContent = `Could not create link: ${e.message}`; }
    finally { $('#link-create').disabled = false; }
  });
  seg($('#pay-method'), (b) => (method = b.dataset.m));
  $('#pay-record').addEventListener('click', async () => {
    const j = jobById(openJobId), c = toCents($('#pay-amount').value);
    if (!j || !(c > 0)) { $('#job-msg').textContent = 'Enter the amount received.'; return; }
    $('#pay-record').disabled = true;
    try {
      await call('payment_record', { method, allocations: [{ job_id: j.id, amount_cents: c }], note: $('#pay-note').value, paid_at: $('#pay-date').value ? `${$('#pay-date').value}T12:00:00+02:00` : null });
      $('#pay-note').value = ''; $('#job-msg').textContent = `${METHOD[method]} payment recorded.`;
      await load();
    } catch (e) { $('#job-msg').textContent = `Could not record: ${e.message}`; }
    finally { $('#pay-record').disabled = false; }
  });

  seg($('#bundle-method'), (b) => (bundleMethod = b.dataset.m));
  $('#bundle-rows').addEventListener('input', bundleTotal);
  $('#bundle-go').addEventListener('click', async () => {
    const items = bundleItems();
    if (!items.length) { $('#bundle-msg').textContent = 'Enter at least one amount.'; return; }
    $('#bundle-go').disabled = true;
    try {
      if (bundleMode === 'link') await createLink(items, $('#bundle-desc').value, 'balance');
      else { await call('payment_record', { method: bundleMethod, allocations: items, note: $('#bundle-note').value }); $('#bundle-dialog').close(); await load(); }
      selected.clear(); renderJobs();
    } catch (e) { $('#bundle-msg').textContent = `Could not complete: ${e.message}`; }
    finally { $('#bundle-go').disabled = false; }
  });
  jobDialog.addEventListener('close', () => { openJobId = null; });

  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = $('#auth-status'); s.className = 'status show'; s.textContent = 'Sending…';
    const { error } = await supabase.auth.signInWithOtp({ email: $('#login-email').value, options: { emailRedirectTo: `${location.origin}/command/` } });
    s.className = `status show ${error ? 'error' : 'success'}`; s.textContent = error ? error.message : 'Check your email for the sign-in link.';
  });
  $('#signout').addEventListener('click', () => supabase.auth.signOut());
}

function authUI() {
  $('#auth').hidden = !!session; $('#app').hidden = !session; $('#signout').hidden = !session;
  if (session) load();
}

bind();
let shown = null;
const setSession = (s) => { session = s; if (shown !== !!s) { shown = !!s; authUI(); } };
supabase.auth.onAuthStateChange((_e, s) => setSession(s));
supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
