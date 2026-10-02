// Command centre + payment links, end to end in the browser with demo data.
// The Supabase function and Yoco are simulated: a small in-memory backend
// answers the same actions the real spodja-command-centre function does.
const { test, expect } = require('@playwright/test');

const API = 'https://agdzdhjkkkvjpwhzitlj.supabase.co/functions/v1/spodja-command-centre';
const TOKEN = '6f1c2a3b-4d5e-4f60-8a71-92b3c4d5e6f7';
const sast = (offsetDays) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date(Date.now() + offsetDays * 864e5));
const digits = (s) => String(s).replace(/\D/g, '');

async function quiet(page) {
  await page.route(/\.(jpe?g|JPG|webp|png)(\?.*)?$/, (r) => r.fulfill({ status: 204, body: '' }));
  await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
}

// ---------------------------------------------------------------- /pay/

async function payBackend(page, link) {
  const calls = [];
  await quiet(page);
  await page.route(API, async (route) => {
    const b = JSON.parse(route.request().postData() || '{}');
    calls.push(b);
    const reply = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (b.token !== TOKEN) return reply(404, { error: 'link_not_found' });
    if (b.action === 'pay_view') return reply(200, { link });
    if (b.action === 'pay_start') return reply(200, { redirect_url: `https://payments.yoco.com/checkout/ch_link?return=${encodeURIComponent(`${b.return_origin}/pay/?l=${TOKEN}&result=success`)}` });
    if (b.action === 'pay_verify') return reply(200, { paid: true, link: { ...link, status: 'paid', paid_at: new Date().toISOString() } });
    return reply(400, { error: 'unknown_action' });
  });
  await page.route('https://payments.yoco.com/**', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<p>Demo Yoco checkout</p><script>setTimeout(()=>location.replace(new URLSearchParams(location.search).get("return")),50)</script>',
  }));
  return calls;
}

const openLink = { link_ref: 'PL-7KQ2MX', client_name: 'Kagiso', description: 'Balance · Traditional / Lobola · 4h', amount_cents: 250000, currency: 'ZAR', status: 'open', expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), paid_at: null };

test.describe('payment link page (/pay/)', () => {
  test('client opens the link, pays through Yoco and sees it confirmed', async ({ page }) => {
    const calls = await payBackend(page, openLink);
    await page.goto(`/pay/?l=${TOKEN}`);
    await expect(page.locator('[data-pay-title]')).toHaveText('Hi Kagiso.');
    await expect(page.locator('[data-pay-desc]')).toHaveText('Balance · Traditional / Lobola · 4h');
    expect(digits(await page.locator('[data-pay-amount]').textContent())).toBe('2500');
    await expect(page.locator('[data-pay-ref]')).toHaveText('PL-7KQ2MX');
    await page.locator('[data-pay-btn]').click();
    await expect(page).toHaveURL(/result=success/);
    await expect(page.locator('[data-pay-title]')).toContainText('Payment received');
    await expect(page.locator('[data-pay-status]')).toContainText('PL-7KQ2MX');
    await expect(page.locator('[data-pay-btn]')).toBeHidden();
    // The browser only ever sends the token; the amount lives on the server.
    for (const c of calls) { expect(Object.keys(c).sort()).toEqual(['action', 'return_origin', 'token']); }
    expect(calls.map((c) => c.action)).toEqual(['pay_view', 'pay_start', 'pay_view', 'pay_verify']);
  });

  test('an expired link cannot be paid', async ({ page }) => {
    await payBackend(page, { ...openLink, status: 'expired' });
    await page.goto(`/pay/?l=${TOKEN}`);
    await expect(page.locator('[data-pay-status]')).toContainText('expired');
    await expect(page.locator('[data-pay-btn]')).toBeHidden();
  });

  test('a cancelled checkout lets the client try again', async ({ page }) => {
    await payBackend(page, openLink);
    await page.goto(`/pay/?l=${TOKEN}&result=cancelled`);
    await expect(page.locator('[data-pay-status]')).toContainText('cancelled');
    await expect(page.locator('[data-pay-btn]')).toBeVisible();
  });

  test('a wrong link says so', async ({ page }) => {
    await payBackend(page, openLink);
    await page.goto('/pay/?l=nope');
    await expect(page.locator('[data-pay-title]')).toHaveText('Payment link not found.');
  });
});

// ---------------------------------------------------------------- command centre

const SUPABASE_STUB = `export function createClient(){const s={access_token:'owner-token'};return{auth:{
  getSession:async()=>({data:{session:s}}),
  onAuthStateChange(cb){setTimeout(()=>cb('INITIAL_SESSION',s),0);return{data:{subscription:{unsubscribe(){}}}}},
  signInWithOtp:async()=>({}),signOut:async()=>({})}}}`;

/** In-memory command centre: same actions and shapes as the edge function. */
async function commandBackend(page) {
  const db = {
    jobs: [
      { id: '11111111-1111-4111-8111-111111111111', job_ref: 'SJ-LERATO', source: 'website', client_name: 'Lerato Dlamini', client_phone: '0827654321', title: 'Traditional / Lobola · 4h', service_type: 'weddings', shoot_date: sast(3), starts_at: `${sast(3)}T10:00:00+02:00`, venue: 'Pretoria', total_cents: 739900, status: 'confirmed' },
      { id: '22222222-2222-4222-8222-222222222222', job_ref: 'SJ-THABO', source: 'whatsapp', client_name: 'Thabo Nkosi', client_phone: '0723334444', title: 'Portrait · Gold', service_type: 'portraits', shoot_date: sast(5), starts_at: null, venue: 'Joburg', total_cents: 380000, status: 'confirmed' },
    ],
    ledger: [{ id: 'l1', job_id: '11111111-1111-4111-8111-111111111111', amount_cents: 370000, method: 'yoco_checkout', note: 'Website deposit (yoco)', paid_at: new Date().toISOString(), external_ref: 'order:1' }],
    links: [], items: [], activity: [],
    enquiries: [{ id: '33333333-3333-4333-8333-333333333333', enquiry_ref: 'SPJ-E77', service_type: 'events', contact_name: 'Naledi Mokoena', contact_phone: '0821234567', shoot_date: sast(8), budget_range: 'Birthday Story · R3,800', estimated_value_cents: 380000 }],
  };
  const calls = {};
  let n = 0;
  const log = (action, detail, job_id = null) => db.activity.unshift({ id: ++n, action, detail, job_id, created_at: new Date().toISOString() });
  const balances = () => db.jobs.map((j) => { const paid = db.ledger.filter((l) => l.job_id === j.id).reduce((s, l) => s + l.amount_cents, 0); return { ...j, paid_cents: paid, outstanding_cents: j.total_cents - paid }; });
  const overview = () => ({ jobs: balances().filter((j) => j.status !== 'cancelled'), links: db.links.map((l) => ({ ...l, items: db.items.filter((i) => i.link_id === l.id) })), ledger: db.ledger, activity: db.activity, enquiries: db.enquiries });

  await quiet(page);
  await page.route('https://esm.sh/**', (r) => r.fulfill({ contentType: 'text/javascript', body: SUPABASE_STUB }));
  await page.route(API, async (route) => {
    const b = JSON.parse(route.request().postData() || '{}');
    (calls[b.action] ||= []).push(b);
    expect(route.request().headers().authorization).toBe('Bearer owner-token');
    const reply = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    switch (b.action) {
      case 'overview': return reply(200, overview());
      case 'job_save': {
        const id = `44444444-4444-4444-8444-${String(++n).padStart(12, '0')}`;
        const job = { id, job_ref: 'SJ-NEW' + n, ...b.job, source: 'whatsapp' };
        db.jobs.push(job); log('job_created', { source: 'whatsapp' }, id);
        return reply(201, { job });
      }
      case 'job_from_enquiry': {
        const e = db.enquiries.find((x) => x.id === b.enquiry_id);
        const job = { id: '55555555-5555-4555-8555-555555555555', job_ref: 'SJ-NALEDI', source: 'website', client_name: e.contact_name, client_phone: e.contact_phone, title: 'Birthday Story', shoot_date: e.shoot_date, total_cents: e.estimated_value_cents, status: 'confirmed' };
        db.jobs.push(job); db.enquiries = db.enquiries.filter((x) => x !== e); log('job_created', { source: 'website' }, job.id);
        return reply(200, { job });
      }
      case 'payment_record':
        for (const a of b.allocations) { db.ledger.push({ id: `p${++n}`, job_id: a.job_id, amount_cents: a.amount_cents, method: b.method, note: b.note, paid_at: new Date().toISOString(), external_ref: null }); log('payment_recorded', { method: b.method, amount_cents: a.amount_cents }, a.job_id); }
        return reply(201, { ledger: [] });
      case 'link_create': {
        const first = db.jobs.find((j) => j.id === b.items[0].job_id);
        const link = { id: `link${++n}`, token: TOKEN, link_ref: 'PL-DEMO' + n, client_name: first.client_name, client_phone: first.client_phone, description: b.description, purpose: b.purpose, amount_cents: b.items.reduce((s, i) => s + i.amount_cents, 0), status: 'open', expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), created_at: new Date().toISOString() };
        db.links.unshift(link); b.items.forEach((i) => { db.items.push({ link_id: link.id, ...i }); log('link_created', { link_ref: link.link_ref, amount_cents: i.amount_cents, bundle: b.items.length > 1 }, i.job_id); });
        return reply(201, { link: { ...link, items: b.items }, url: `${b.site_origin}/pay/?l=${TOKEN}` });
      }
      case 'link_refresh': {
        const l = db.links.find((x) => x.id === b.link_id);
        l.status = 'paid'; l.paid_at = new Date().toISOString();
        db.items.filter((i) => i.link_id === l.id).forEach((i) => db.ledger.push({ id: `y${++n}`, job_id: i.job_id, amount_cents: i.amount_cents, method: 'yoco_link', paid_at: l.paid_at, external_ref: `link:${l.id}:${i.job_id}` }));
        log('link_paid', { link_ref: l.link_ref, amount_cents: l.amount_cents });
        return reply(200, { paid: true, link: l });
      }
      default: return reply(400, { error: 'unknown_action' });
    }
  });
  return { calls, db };
}

test.describe('command centre (/command/)', () => {
  test('overview: stats, calendar and balances from all channels', async ({ page }) => {
    await commandBackend(page);
    await page.goto('/command/');
    await expect(page.locator('#stats')).toContainText('Outstanding');
    // R3,699 (Lerato balance) + R3,800 (Thabo) = R7,499 outstanding
    expect(digits(await page.locator('.cc-stat').first().locator('strong').textContent())).toBe('7499');
    if (sast(3).slice(0, 7) === sast(0).slice(0, 7)) {
      await expect(page.locator(`[data-day="${sast(3)}"] .cc-chip`)).toContainText('Lerato');
      await page.locator(`[data-day="${sast(3)}"]`).click();
      await expect(page.locator('#day')).toContainText('Traditional / Lobola · 4h');
    }
    await page.getByRole('tab', { name: 'Bookings' }).click();
    await expect(page.locator('#jobs tr')).toHaveCount(2);
    await expect(page.locator('#enquiries')).toContainText('SPJ-E77');
  });

  test('WhatsApp client: confirm booking, send a 50% link, record cash on the day', async ({ page }) => {
    const { calls } = await commandBackend(page);
    await page.goto('/command/');
    await page.getByRole('button', { name: '+ New booking' }).click();
    const d = page.locator('#job-dialog');
    await d.locator('[name=client_name]').fill('Kagiso Molefe');
    await d.locator('[name=client_phone]').fill('071 111 2222');
    await d.locator('[name=service_type]').selectOption('events');
    await d.locator('[name=title]').fill('Lobola · 4h');
    await d.locator('[name=shoot_date]').fill('2026-12-05');
    await d.locator('[name=start_time]').fill('11:00');
    await d.locator('[name=venue]').fill('Mahikeng');
    await d.locator('[name=total]').fill('5000');
    await d.getByRole('button', { name: 'Save booking' }).click();
    await expect(d.locator('#job-money')).toBeVisible();
    expect(calls.job_save[0].job).toMatchObject({ client_name: 'Kagiso Molefe', total_cents: 500000, shoot_date: '2026-12-05', starts_at: '2026-12-05T11:00:00+02:00', source: 'whatsapp' });

    // Nothing paid yet, so the link defaults to the 50% deposit.
    await expect(d.locator('#link-presets .on')).toContainText('50% deposit');
    await expect(d.locator('#link-amount')).toHaveValue('2500');
    await d.getByRole('button', { name: 'Create link' }).click();
    const share = page.locator('#share-dialog');
    await expect(share).toBeVisible();
    await expect(share.locator('#share-url')).toHaveValue(new RegExp(`/pay/\\?l=${TOKEN}$`));
    expect(calls.link_create[0]).toMatchObject({ purpose: 'deposit', items: [{ amount_cents: 250000 }] });
    await share.getByRole('button', { name: 'Send on WhatsApp' }).click();
    const wa = (await page.evaluate(() => window.__opened))[0];
    expect(wa).toContain('wa.me/27711112222');
    expect(decodeURIComponent(wa)).toContain(`/pay/?l=${TOKEN}`);
    await share.locator('.cc-x').click();

    // On the day: the balance is paid in cash.
    await page.getByRole('tab', { name: 'Bookings' }).click();
    await page.locator('#jobs tr', { hasText: 'Kagiso Molefe' }).click();
    await expect(d.locator('#pay-amount')).toHaveValue('5000');
    await d.locator('#pay-amount').fill('2500');
    await d.locator('#pay-note').fill('Balance paid on the day');
    await d.getByRole('button', { name: 'Record payment' }).click();
    await expect(d.locator('#job-ledger')).toContainText('Cash');
    expect(calls.payment_record[0]).toMatchObject({ method: 'cash', allocations: [{ amount_cents: 250000 }], note: 'Balance paid on the day' });
    await expect(d.locator('#job-log')).toContainText('Cash payment of R');
  });

  test('bundle: one Yoco link clears two outstanding bookings', async ({ page }) => {
    const { calls } = await commandBackend(page);
    await page.goto('/command/');
    await page.getByRole('tab', { name: 'Bookings' }).click();
    await page.locator('[data-select]').nth(0).check();
    await page.locator('[data-select]').nth(1).check();
    await expect(page.locator('#select-count')).toContainText('2 selected');
    await page.getByRole('button', { name: 'Payment link for selected' }).click();
    const b = page.locator('#bundle-dialog');
    expect(digits(await b.locator('#bundle-total').textContent())).toBe('7499');
    await b.getByRole('button', { name: 'Create link' }).click();
    await expect(page.locator('#share-dialog')).toBeVisible();
    expect(calls.link_create[0].items).toEqual([
      { job_id: '11111111-1111-4111-8111-111111111111', amount_cents: 369900 },
      { job_id: '22222222-2222-4222-8222-222222222222', amount_cents: 380000 },
    ]);
    await page.locator('#share-dialog .cc-x').click();

    // Client pays; checking the link clears both bookings.
    await page.getByRole('tab', { name: 'Payment links' }).click();
    await expect(page.locator('#links')).toContainText('bundle of 2');
    await page.getByRole('button', { name: 'Check payment' }).click();
    await expect(page.locator('#links .cc-pill')).toHaveText('paid');
    await page.getByRole('tab', { name: 'Bookings' }).click();
    await page.locator('#job-filter [data-f="all"]').click();
    await expect(page.locator('#jobs')).toContainText('Cleared');
    await expect(page.locator('#jobs tr', { hasText: 'Cleared' })).toHaveCount(2);
    await page.getByRole('tab', { name: 'Activity' }).click();
    await expect(page.locator('#activity')).toContainText('paid');
  });

  test('bundle: one cash payment split across two bookings', async ({ page }) => {
    const { calls } = await commandBackend(page);
    await page.goto('/command/');
    await page.getByRole('tab', { name: 'Bookings' }).click();
    await page.locator('[data-select]').nth(0).check();
    await page.locator('[data-select]').nth(1).check();
    await page.getByRole('button', { name: 'Record payment for selected' }).click();
    const b = page.locator('#bundle-dialog');
    await b.locator('[data-bundle-job]').nth(1).fill('1000');
    await b.locator('#bundle-method [data-m="eft"]').click();
    await b.getByRole('button', { name: 'Record payment' }).click();
    await expect(b).toBeHidden();
    expect(calls.payment_record[0]).toMatchObject({ method: 'eft', allocations: [{ amount_cents: 369900 }, { amount_cents: 100000 }] });
  });

  test('website enquiry confirmed as a booking from the calendar list', async ({ page }) => {
    const { calls } = await commandBackend(page);
    await page.goto('/command/');
    await page.getByRole('tab', { name: 'Bookings' }).click();
    await page.getByRole('button', { name: 'Confirm as booking' }).click();
    await expect(page.locator('#job-dialog')).toBeVisible();
    await expect(page.locator('#job-title')).toHaveText('Naledi Mokoena');
    expect(calls.job_from_enquiry[0]).toMatchObject({ enquiry_id: '33333333-3333-4333-8333-333333333333' });
  });
});
