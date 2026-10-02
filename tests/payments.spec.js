// End-to-end booking + payment journeys with demo data.
// The Supabase functions and the Yoco hosted checkout are simulated with
// page.route, so these run offline and never move money. Each test records
// what the browser sends so the request contracts are checked too.
const { test, expect } = require('@playwright/test');

const API = 'https://agdzdhjkkkvjpwhzitlj.supabase.co/functions/v1';
const YOCO = 'https://payments.yoco.com/checkout/ch_demo_001';

const siteData = { ok: true, grad: {
  packages: [
    { slug: 'mini', name: 'MINI', tagline: 'Quick. Clean.', price_cents: 130000, duration_minutes: 20, edited_images: 12, reel_seconds: 0 },
    { slug: 'signature', name: 'SIGNATURE', tagline: 'The sweet spot.', price_cents: 170000, duration_minutes: 35, edited_images: 18, reel_seconds: 0 },
    { slug: 'prestige', name: 'PRESTIGE', tagline: 'Full story.', price_cents: 250000, duration_minutes: 60, edited_images: 30, reel_seconds: 45 },
  ],
  campaigns: [{ slug: 'gauteng-september-2026', name: 'September 2026', starts_on: '2026-09-01', ends_on: '2026-12-31', status: 'live' }],
  locations: [{ slug: 'centurion', name: 'Centurion', area: 'Gauteng', travel_fee_cents: 0 }],
  portfolio: [],
} };

const digits = (s) => String(s).replace(/\D/g, '');

/** Mocks the backend + Yoco and records every request body by endpoint name. */
async function backend(page, overrides = {}) {
  const calls = {};
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const handlers = {
    'spodja-site-data': () => [200, siteData],
    'spodja-payment-config': () => [200, { providers: { yoco: true, paystack: false, ozow: false } }],
    'grad-location-search': () => [200, { results: [{ name: 'University of Pretoria (UP)', display_name: 'University of Pretoria, Hatfield, Pretoria', latitude: -25.7545, longitude: 28.2314, travel_label: 'No travel fee' }] }],
    'grad-custom-times': () => [200, { times: [{ starts_at: '2026-11-14T08:00:00+02:00', recommendation: 'Soft morning light' }, { starts_at: '2026-11-14T15:30:00+02:00', recommendation: 'Golden hour' }], workday: { start: '07:00', end: '18:00' } }],
    'grad-create-booking': () => [201, { booking_id: 'bk_demo_2041', manage_token: 'mt_demo_2041', booking_reference: 'GH-2041', total_amount_cents: 170000 }],
    // The real server builds the return URL from return_origin; the demo Yoco page follows it back.
    'grad-payment-start': (b) => [200, { redirect_url: `${YOCO}?return=${encodeURIComponent(`${b.return_origin}/success/?booking=${b.booking_id}&token=${b.manage_token}&provider=${b.provider}`)}` }],
    'grad-payment-verify': () => [200, { paid: true, session: { package_name: 'SIGNATURE', starts_at: '2026-11-14T15:30:00+02:00', location: 'University of Pretoria' }, photographer: { whatsapp_url: 'https://wa.me/27625683235' } }],
    'spodja-create-enquiry': () => [201, { ok: true, enquiry_ref: 'SPJ-W100', checkout_token: 'ck_w100', total_amount_cents: 739900, deposit_percent: 50, offer_key: 'wedding-traditional-4h' }],
    'spodja-payment-start': (b) => [200, { redirect_url: `${YOCO}?return=${encodeURIComponent(`${b.return_origin}/success/?ref=${b.enquiry_ref}&token=${b.checkout_token}&order=ord_demo&provider=${b.provider}`)}` }],
    'spodja-payment-verify': () => [200, { paid: true, offer_name: 'Traditional/Lobola · 4h', shoot_date: '2026-11-14', location: 'Pretoria', whatsapp_url: 'https://wa.me/27625683235' }],
    ...overrides,
  };
  await page.route(`${API}/**`, async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const body = route.request().postData();
    (calls[name] ||= []).push(body ? JSON.parse(body) : Object.fromEntries(new URL(route.request().url()).searchParams));
    const h = handlers[name];
    if (!h) return json(route, 404, { error: `unmocked ${name}` });
    const [status, out] = h(calls[name].at(-1));
    return json(route, status, out);
  });
  // Yoco hosted checkout: pay, then come back the way the server-built return URL would.
  await page.route('https://payments.yoco.com/**', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<title>Yoco demo checkout</title><p>Demo Yoco checkout</p><script>setTimeout(()=>location.replace(new URLSearchParams(location.search).get("return")),50)</script>',
  }));
  // Photos are irrelevant here and are large HD masters; skipping them keeps the
  // single-threaded test server from stalling page loads when tests run in parallel.
  await page.route(/\.(jpe?g|JPG|webp|png)(\?.*)?$/, (route) => route.fulfill({ status: 204, body: '' }));
  // Capture WhatsApp hand-offs instead of opening tabs.
  await page.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  return calls;
}

async function fillGrad(page) {
  await expect(page.locator('#package option[value="signature"]')).toHaveCount(1);
  await page.selectOption('#package', 'signature');
  await page.fill('#location-search', 'University of Pretoria');
  await page.locator('#location-search').dispatchEvent('input');
  await page.locator('.location-result[data-i="0"]').first().click();
  await page.fill('#date', '2026-11-14');
  await page.click('#check-times');
  await page.locator('.time-btn').nth(1).click();
  await page.fill('[name="full_name"]', 'Naledi Mokoena');
  await page.fill('[name="phone"]', '0821234567');
  await page.fill('[name="email"]', 'naledi@example.com');
  await page.check('[name="accepted_policies"]');
}

async function fillWeddingTraditional4h(page) {
  await page.getByRole('button', { name: /Traditional/i }).click();
  await page.locator('label[for="traditional-1"]').click();
  await page.locator('label[for="premium-book-w"]').click();
  await page.fill('[name="shoot_date"]', '2026-11-14');
  await page.fill('[name="venue"]', 'Pretoria');
  await page.fill('[name="contact_name"]', 'Lerato Dlamini');
  await page.fill('[name="contact_phone"]', '0827654321');
  await page.fill('[name="contact_email"]', 'lerato@example.com');
}

// ---------------------------------------------------------------- today's live behaviour

test.describe('Book on WhatsApp: the second choice on every form', () => {
  test('Grad House sends package, campus, date, time and name to WhatsApp', async ({ page }) => {
    const calls = await backend(page);
    await page.goto('/graduation/');
    await fillGrad(page);
    await page.getByRole('button', { name: 'Book on WhatsApp' }).click();
    const sent = await page.evaluate(() => window.__opened);
    expect(sent).toHaveLength(1);
    const text = decodeURIComponent(sent[0]);
    expect(sent[0]).toContain('wa.me/27625683235');
    for (const bit of ['SIGNATURE', 'University of Pretoria', '2026-11-14', 'Naledi Mokoena']) expect(text).toContain(bit);
    expect(text).toContain('send me the payment link');
    expect(calls['grad-create-booking']).toBeUndefined(); // no slot is held, no payment started
  });

  test('Wedding (Traditional 4h + book) sends the package and extras to WhatsApp', async ({ page }) => {
    const calls = await backend(page);
    await page.goto('/weddings/');
    await fillWeddingTraditional4h(page);
    await expect(page.locator('.live-total')).toContainText('R 7,399'); // R5,000 package + R2,399 book
    await expect(page.locator('.live-total')).toContainText('R 3,700'); // 50% to reserve
    await page.getByRole('button', { name: 'Book on WhatsApp' }).click();
    const text = decodeURIComponent((await page.evaluate(() => window.__opened))[0] || '');
    expect(text).toContain('Traditional/Lobola · 4h · R5,000');
    expect(text).toContain('Lerato Dlamini');
    expect(calls['spodja-create-enquiry']).toBeUndefined();
  });

  test('Events: Lobola journey reaches WhatsApp with the Lobola package', async ({ page }) => {
    await backend(page);
    await page.goto('/events/?journey=lobola');
    await expect(page.locator('input[name="client_type"]')).toHaveValue('lobola');
    await page.fill('[name="shoot_date"]', '2026-12-05');
    await page.fill('[name="venue"]', 'Mahikeng');
    await page.fill('[name="contact_name"]', 'Kagiso Molefe');
    await page.fill('[name="contact_phone"]', '0711112222');
    // Incomplete (no start time / email): the browser blocks it and nothing is sent.
    await page.getByRole('button', { name: 'Book on WhatsApp' }).click();
    expect(await page.evaluate(() => window.__opened)).toHaveLength(0);
    await page.fill('[name="event_time"]', '11:00');
    await page.fill('[name="contact_email"]', 'kagiso@example.com');
    await page.getByRole('button', { name: 'Book on WhatsApp' }).click();
    const text = decodeURIComponent((await page.evaluate(() => window.__opened))[0] || '');
    expect(text).toMatch(/Lobola/);
    expect(text).toContain('Kagiso Molefe');
  });
});

// ---------------------------------------------------------------- Yoco, payment-first

test.describe('Pay & book: Yoco is the first choice on every form', () => {

  test('Grad House: hold slot → Yoco → verified success', async ({ page }) => {
    const calls = await backend(page);
    await page.goto('/graduation/');
    await fillGrad(page);
    await page.getByRole('button', { name: /Pay & reserve my time/ }).click();
    await expect(page.locator('#hold-box')).toContainText('GH-2041');
    expect(calls['grad-create-booking'][0]).toMatchObject({ package_slug: 'signature', full_name: 'Naledi Mokoena', accepted_policies: true, requested_starts_at: '2026-11-14T15:30:00+02:00' });

    await page.locator('#pay-now').click();
    await expect(page).toHaveURL(/\/payment\/\?booking=bk_demo_2041&token=mt_demo_2041/);
    await expect(page.locator('#pay-grad')).toBeVisible();
    await expect(page.locator('#pay-grad .provider-btn[data-provider="yoco"]')).toBeEnabled();
    await expect(page.locator('#pay-grad .provider-btn[data-provider="paystack"]')).toBeDisabled();
    await page.locator('#pay-grad [data-provider-checkout]').click();
    await expect(page).toHaveURL(/\/success\/\?booking=bk_demo_2041/);
    expect(calls['grad-payment-start'][0]).toMatchObject({ booking_id: 'bk_demo_2041', manage_token: 'mt_demo_2041', provider: 'yoco' });
    expect(calls['grad-payment-verify'][0]).toMatchObject({ booking_id: 'bk_demo_2041', provider: 'yoco' });
    await expect(page.locator('#booking-details')).toContainText('SIGNATURE');
    await expect(page.locator('#verify-status')).toContainText('Payment confirmed. Your reference is BK_DEMO_');
  });

  for (const plan of ['deposit', 'full']) {
    test(`Wedding fixed package: ${plan} payment → Yoco → verified success`, async ({ page }) => {
      const calls = await backend(page);
      await page.goto('/weddings/');
      await fillWeddingTraditional4h(page);
      await page.getByRole('button', { name: /Pay & book/ }).click();
      expect(await page.evaluate(() => window.__opened)).toHaveLength(0); // no WhatsApp hand-off
      await expect(page).toHaveURL(/\/payment\/\?ref=SPJ-W100&token=ck_w100/);
      expect(calls['spodja-create-enquiry'][0]).toMatchObject({ service_type: 'weddings', client_type: 'traditional', offer_key: 'wedding-traditional-4h', contact_name: 'Lerato Dlamini' });
      expect(calls['spodja-create-enquiry'][0].coverage_needs).toContain('Premium photography book · +R2,399');

      await expect(page.locator('#pay-fixed')).toBeVisible();
      expect(digits(await page.locator('#full-amount').textContent())).toBe('7399');
      expect(digits(await page.locator('#deposit-amount').textContent())).toBe('3700'); // 50% of R7,399, rounded
      await page.locator(`input[name="pay-plan"][value="${plan}"]`).check({ force: true });
      await page.locator('#pay-fixed [data-provider-checkout]').click();
      await expect(page).toHaveURL(/\/success\/\?ref=SPJ-W100/);
      expect(calls['spodja-payment-start'][0]).toMatchObject({ enquiry_ref: 'SPJ-W100', checkout_token: 'ck_w100', provider: 'yoco', payment_plan: plan });
      expect(calls['spodja-payment-start'][0]).not.toHaveProperty('amount'); // server prices it
      await expect(page.locator('#booking-details')).toContainText('Traditional/Lobola · 4h');
      await expect(page.locator('#verify-status')).toContainText('Your reference is SPJ-W100');
    });
  }

  test('Custom quote: no charge, scope first', async ({ page }) => {
    await backend(page, { 'spodja-create-enquiry': () => [201, { ok: true, enquiry_ref: 'SPJ-C200', checkout_token: 'ck_c200', total_amount_cents: null, deposit_percent: 50 }] });
    await page.goto('/weddings/');
    await page.locator('label[for="intimate-2"]').click(); // Custom intimate · quoted to brief
    await page.fill('[name="shoot_date"]', '2026-12-12');
    await page.fill('[name="venue"]', 'Magaliesburg');
    await page.fill('[name="contact_name"]', 'Thabo Nkosi');
    await page.fill('[name="contact_phone"]', '0723334444');
    await page.fill('[name="contact_email"]', 'thabo@example.com');
    await page.locator('form[data-lane-form] button[type="submit"]').click();
    await expect(page).toHaveURL(/ref=SPJ-C200/);
    await expect(page.locator('#pay-custom')).toBeVisible();
    await expect(page.locator('#pay-fixed')).toBeHidden();
  });
});

// ---------------------------------------------------------------- payment-stage edge cases

test.describe('payment stage: failures and edge cases', () => {
  const fixedCtx = { version: 3, ref: 'SPJ-E1', checkoutToken: 'ck_e1', service: 'portraits', packageLabel: 'Portrait session', totalCents: 120000, custom: false, depositPercent: 50 };
  const seed = (page) => page.addInitScript((c) => sessionStorage.setItem(`spodja_checkout_${c.ref}`, JSON.stringify(c)), fixedCtx);

  test('no gateway configured: methods disabled, nothing charged', async ({ page }) => {
    const calls = await backend(page, { 'spodja-payment-config': () => [200, { providers: {} }] });
    await seed(page);
    await page.goto('/payment/?ref=SPJ-E1&token=ck_e1');
    await expect(page.locator('#pay-fixed .provider-btn[data-provider="yoco"]')).toBeDisabled();
    await expect(page.locator('#pay-fixed [data-provider-note]')).toContainText(/No merchant gateway/);
    await page.locator('#pay-fixed [data-provider-checkout]').click();
    await expect(page.locator('#pay-status')).toContainText(/Choose an available payment method/);
    expect(calls['spodja-payment-start']).toBeUndefined();
  });

  test('Yoco start fails: clear error, can retry', async ({ page }) => {
    await backend(page, { 'spodja-payment-start': () => [502, { error: 'yoco_unavailable' }] });
    await seed(page);
    await page.goto('/payment/?ref=SPJ-E1&token=ck_e1');
    await page.locator('#pay-fixed [data-provider-checkout]').click();
    await expect(page.locator('#pay-status')).toContainText('yoco_unavailable');
    await expect(page.locator('#pay-fixed [data-provider-checkout]')).toBeEnabled();
  });

  test('returning from a cancelled Yoco checkout shows the result', async ({ page }) => {
    await backend(page);
    await page.goto('/payment/?booking=bk_demo_2041&token=mt_demo_2041&result=cancelled');
    await expect(page.locator('#checkout-summary')).toContainText('cancelled');
  });

  test('payment still processing: success page says so, not "paid"', async ({ page }) => {
    await backend(page, { 'grad-payment-verify': () => [202, { pending: true }] });
    await page.goto('/success/?booking=bk_demo_2041&token=mt_demo_2041&provider=yoco');
    await expect(page.locator('#verify-status')).toContainText(/still being confirmed/);
  });

  test('payment not confirmed: success page shows an error', async ({ page }) => {
    await backend(page, { 'spodja-payment-verify': () => [200, { paid: false, error: 'payment_failed' }] });
    await page.goto('/success/?ref=SPJ-E1&token=ck_e1&order=ord_x&provider=yoco');
    await expect(page.locator('#verify-status')).toContainText('payment_failed');
  });

  test('payment page opened without a booking', async ({ page }) => {
    await backend(page);
    await page.goto('/payment/');
    await expect(page.locator('#pay-status')).toContainText(/Open this payment stage from your Spodja booking journey/);
  });
});
