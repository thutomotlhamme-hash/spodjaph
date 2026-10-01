// Signed payment links. A link carries the client, occasion and amounts in
// plain view, plus an HMAC so nobody can change the price in the URL.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const mac = (body, secret) => createHmac('sha256', secret).update(body).digest();

export function sign(payload, secret) {
  const body = b64(JSON.stringify(payload));
  return `${body}.${b64(mac(body, secret))}`;
}

export function verify(token, secret) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const given = Buffer.from(sig, 'base64url');
  const expected = mac(body, secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Compare secrets without leaking length or content through timing.
export function sameSecret(a, b) {
  const h = (s) => createHash('sha256').update(String(s ?? '')).digest();
  return timingSafeEqual(h(a), h(b));
}

// Amount in cents for the option a client picked, or null if the link does not offer it.
export function amountFor(link, option) {
  if (link.k === 'quote' && option === 'full') return link.t;
  if (link.k === 'quote' && option === 'deposit') return Math.round(link.t / 2);
  if (link.k === 'balance' && option === 'balance') return link.d;
  return null;
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
