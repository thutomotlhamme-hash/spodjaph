// Studio only: turns a quote into a signed payment link. Requires STUDIO_PASSWORD.
import { json, sameSecret, sign } from '../lib/links.mjs';

const MAX_CENTS = 10_000_000; // R100,000

const toCents = (rand) => {
  const cents = Math.round(Number(rand) * 100);
  return Number.isFinite(cents) && cents >= 200 && cents <= MAX_CENTS ? cents : null;
};

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const { STUDIO_PASSWORD, LINK_SECRET } = process.env;
  if (!STUDIO_PASSWORD || !LINK_SECRET) {
    return json({ error: 'Payments are not set up yet. Add STUDIO_PASSWORD and LINK_SECRET in Netlify.' }, 500);
  }

  let input;
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Bad request.' }, 400);
  }

  if (!sameSecret(input.password, STUDIO_PASSWORD)) return json({ error: 'Wrong studio password.' }, 401);

  const name = String(input.name ?? '').trim().slice(0, 80);
  const occasion = String(input.occasion ?? '').trim().slice(0, 60);
  const total = toCents(input.total);
  const kind = input.kind === 'balance' ? 'balance' : 'quote';
  if (!name) return json({ error: 'Add the client’s name.' }, 400);
  if (!occasion) return json({ error: 'Choose the occasion.' }, 400);
  if (!total) return json({ error: 'Enter the total between R2 and R100,000.' }, 400);

  const link = { v: 1, n: name, o: occasion, t: total, k: kind, iat: Date.now() };
  if (kind === 'balance') {
    const due = toCents(input.balance);
    if (!due || due > total) return json({ error: 'The balance must be more than R2 and no more than the total.' }, 400);
    link.d = due;
  }
  return json({ token: sign(link, LINK_SECRET) });
};

export const config = { path: '/api/studio-link' };
