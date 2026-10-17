import { verifyAdminRequest } from '../../shared/adminAuth';

/**
 * What guests ask for outside WhatsApp: a message from the contact form, a
 * call back when WhatsApp did not connect, a note that they mean to pay.
 *
 * The contact form used to exist only as a WhatsApp link, so whatever a guest
 * wrote was gone the moment WhatsApp failed to open or nobody answered. Now
 * every request is kept here first, in this site's own KV, and the admin can
 * read it, call back and tick it off.
 *
 *   POST  (public)  store one request. Rate-limited per address, with a
 *                   honeypot field, and capped in size.
 *   GET   (admin)   the latest requests, newest first.
 *   PATCH (admin)   { id, done } — mark one handled, or not.
 */

interface Env {
  DATA_KV_F?: any;
  DATA_KV?: any;
  [key: string]: unknown;
}

export type ContactRequestKind = 'message' | 'callback' | 'payment';

export interface ContactRequest {
  id: string;
  at: string;
  kind: ContactRequestKind;
  name: string;
  phone: string;
  email: string;
  message: string;
  /** When to call back, in the guest's words or one of the offered slots. */
  when: string;
  /** What the guest was looking at or talking about. */
  context: string;
  amount: number | null;
  page: string;
  locale: string;
  done: boolean;
}

const KEY = 'contact-requests';
const KEEP = 300;
const PER_HOUR = 12;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const kvOf = (env: Env) => {
  const kv = env.DATA_KV_F ?? env.DATA_KV;
  return kv && typeof kv.get === 'function' ? kv : null;
};

const text = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, max);

const readAll = async (kv: any): Promise<ContactRequest[]> => {
  try {
    const stored = await kv.get(KEY, { type: 'json' });
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const kv = kvOf(env);
  if (!kv) return json({ error: 'Requests cannot be stored on this deployment.' }, 503);

  if (request.method === 'POST') {
    const body: any = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);

    // A field no person sees: anything typed into it was typed by a bot.
    if (text(body.website, 200)) return json({ ok: true, id: 'ignored' });

    const kind: ContactRequestKind = ['callback', 'payment'].includes(body.kind) ? body.kind : 'message';
    const phone = text(body.phone, 40);
    const email = text(body.email, 120);
    // A payment note is useful to the operator on its own (amount, what for,
    // name); everything else needs a way to answer.
    if (!phone && !email && kind !== 'payment') return json({ error: 'Please leave a phone number or an email address.' }, 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'That email address does not look right.' }, 400);
    if (phone && phone.replace(/\D/g, '').length < 6) {
      return json({ error: 'That phone number looks too short.' }, 400);
    }

    // A few requests an hour per address is plenty for a person and nothing
    // for a script; the counter expires by itself.
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const limitKey = `rl:contact:${ip}`;
    const used = Number((await kv.get(limitKey).catch(() => null)) ?? 0) || 0;
    if (used >= PER_HOUR) return json({ error: 'Too many requests — please try again a little later, or write on WhatsApp.' }, 429);
    await kv.put(limitKey, String(used + 1), { expirationTtl: 3600 }).catch(() => undefined);

    const amount = Number(body.amount);
    const entry: ContactRequest = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      kind,
      name: text(body.name, 80),
      phone,
      email,
      message: text(body.message, 2000),
      when: text(body.when, 80),
      context: text(body.context, 300),
      amount: Number.isFinite(amount) && amount > 0 && amount < 100000 ? Math.round(amount * 100) / 100 : null,
      page: text(body.page, 120),
      locale: ['es', 'de', 'fr'].includes(body.locale) ? body.locale : 'en',
      done: false,
    };

    const list = await readAll(kv);
    await kv.put(KEY, JSON.stringify([entry, ...list].slice(0, KEEP)));
    return json({ ok: true, id: entry.id });
  }

  if (request.method === 'GET' || request.method === 'PATCH') {
    const auth = await verifyAdminRequest(env as any, request);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const list = await readAll(kv);
    if (request.method === 'GET') return json({ requests: list });

    const body: any = await request.json().catch(() => null);
    const target = list.find((item) => item.id === body?.id);
    if (!target) return json({ error: 'No such request.' }, 404);
    target.done = Boolean(body.done);
    await kv.put(KEY, JSON.stringify(list));
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}
