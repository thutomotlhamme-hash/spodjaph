// Starts a Yoco checkout for a signed payment link. The amount always comes
// from the signed link, never from the browser.
import { amountFor, json, verify } from '../lib/links.mjs';

const LABELS = { full: 'Full payment', deposit: '50% deposit', balance: 'Balance' };

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const { YOCO_SECRET_KEY, LINK_SECRET } = process.env;
  if (!YOCO_SECRET_KEY || !LINK_SECRET) {
    return json({ error: 'Card payments are not set up yet. Please contact us to pay.' }, 500);
  }

  let input;
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }

  const link = verify(input.token, LINK_SECRET);
  if (!link) return json({ error: 'This payment link is not valid. Please ask us for a new one.' }, 400);
  const amount = amountFor(link, input.option);
  if (!amount) return json({ error: 'That payment option is not available on this link.' }, 400);

  const origin = new URL(req.url).origin;
  const back = `${origin}/pay/?c=${encodeURIComponent(input.token)}`;
  const res = await fetch('https://payments.yoco.com/api/checkouts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${YOCO_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency: 'ZAR',
      successUrl: `${origin}/pay/done/?c=${encodeURIComponent(input.token)}&o=${input.option}`,
      cancelUrl: `${back}&status=cancelled`,
      failureUrl: `${back}&status=failed`,
      metadata: {
        client: link.n,
        occasion: link.o,
        payment: LABELS[input.option],
      },
    }),
  });

  if (!res.ok) {
    console.error('Yoco checkout failed', res.status, await res.text());
    return json({ error: 'We couldn’t start the payment. Please try again in a moment.' }, 502);
  }
  const { redirectUrl } = await res.json();
  return json({ redirectUrl });
};

export const config = { path: '/api/checkout' };
