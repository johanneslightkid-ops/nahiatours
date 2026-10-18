import { verifyAdminRequest } from '../../shared/adminAuth';
import { kvOf, NotifyEnv } from '../../shared/notify';

/**
 * What guests do with the cart and the booking buttons: items added and
 * removed, reservations sent on WhatsApp, payment buttons pressed, answers to
 * "did it work?". For the operator's eyes in the admin, nothing else.
 *
 * The browser collects a visitor's events and sends them in batches (on a
 * key event, and when the page is hidden), and every batch is a key of its
 * own — `act:<newest-first time>:<random>` — expiring after 60 days. Nothing
 * is read and rewritten, so there is no shared list to lose events from, and
 * the free plan's 1000 writes a day go to visitors who actually did something.
 *
 *   POST (public)  { session, events: [{ type, at, data }] }
 *   GET  (admin)   the latest batches, newest first (?limit=, ?cursor=).
 */

const TYPES = new Set([
  'cart_add',
  'cart_remove',
  'cart_update',
  'cart_clear',
  'cart_view',
  'checkout',
  'reserve',
  'whatsapp',
  'pay_click',
  'pay_start',
  'pay_answer',
  'summary_whatsapp',
  'summary_email',
  'contact',
]);
const MAX_EVENTS = 40;
const TTL = 60 * 24 * 3600;
const PER_HOUR = 30;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const text = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .trim()
    .slice(0, max);

/** Event data is a flat bag of short strings and numbers. */
const clean = (data: unknown) => {
  const out: Record<string, string | number | boolean> = {};
  if (!data || typeof data !== 'object') return out;
  for (const [key, value] of Object.entries(data as Record<string, unknown>).slice(0, 12)) {
    const name = text(key, 24);
    if (!name) continue;
    if (typeof value === 'number' && Number.isFinite(value)) out[name] = Math.round(value * 100) / 100;
    else if (typeof value === 'boolean') out[name] = value;
    else if (value !== null && value !== undefined) out[name] = text(value, 160);
  }
  return out;
};

const recent = new Map<string, number[]>();
const throttled = (ip: string) => {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((at) => now - at < 3600_000);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 2000) recent.clear();
  return hits.length > PER_HOUR;
};

export async function onRequest(context: { request: Request; env: NotifyEnv }) {
  const { request, env } = context;
  const kv = kvOf(env);
  if (!kv) return json({ error: 'Activity cannot be recorded on this deployment.' }, 503);

  if (request.method === 'POST') {
    // sendBeacon posts text/plain; both are the same JSON.
    const body: any = await request
      .text()
      .then((raw) => JSON.parse(raw))
      .catch(() => null);
    if (!body || !Array.isArray(body.events)) return json({ error: 'Invalid request.' }, 400);
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    if (throttled(ip)) return json({ ok: true, dropped: true });

    const events = body.events
      .slice(0, MAX_EVENTS)
      .filter((event: any) => TYPES.has(event?.type))
      .map((event: any) => ({
        type: event.type,
        at: Number.isFinite(Number(event.at)) ? Number(event.at) : Date.now(),
        data: clean(event.data),
      }));
    if (events.length === 0) return json({ ok: true, stored: 0 });

    const now = Date.now();
    const batch = {
      at: now,
      session: text(body.session, 40),
      locale: text(body.locale, 5),
      page: text(body.page, 120),
      country: text((request as any).cf?.country ?? request.headers.get('CF-IPCountry'), 4),
      device: /Mobi|Android|iPhone/i.test(request.headers.get('User-Agent') ?? '') ? 'mobile' : 'desktop',
      events,
    };
    // Newest first in a KV listing, which is sorted by key.
    const key = `act:${String(9_999_999_999_999 - now).padStart(13, '0')}:${Math.random().toString(36).slice(2, 8)}`;
    await kv.put(key, JSON.stringify(batch), { expirationTtl: TTL });
    return json({ ok: true, stored: events.length });
  }

  if (request.method === 'GET') {
    const auth = await verifyAdminRequest(env as any, request);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    const params = new URL(request.url).searchParams;
    const limit = Math.min(100, Math.max(1, Number(params.get('limit')) || 60));
    const listing = await kv.list({ prefix: 'act:', limit, cursor: params.get('cursor') || undefined });
    const batches = (
      await Promise.all(
        (listing.keys ?? []).map((entry: { name: string }) => kv.get(entry.name, { type: 'json' }).catch(() => null))
      )
    ).filter(Boolean);
    return json({ batches, cursor: listing.list_complete ? null : listing.cursor ?? null });
  }

  return json({ error: 'Method not allowed' }, 405);
}
