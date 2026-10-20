import { verifyAdminRequest } from '../../shared/adminAuth';
import { kvOf, NotifyEnv } from '../../shared/notify';

/**
 * The admin's wastebasket. Whatever an admin page deletes is put here first —
 * a tour, a vehicle, a review, a blog post — with enough to put it back.
 * Admin only, every method.
 *
 * Every item is a KV key of its own, `trash:<newest-first time>:<random>`,
 * like the activity log: nothing is read and rewritten, so two deletions at
 * once cannot lose each other. Items are kept for a year.
 *
 *   POST    { section, label, locale?, data }    put one item in
 *   GET     every item, newest first
 *   DELETE  ?id=<key>  |  ?section=<name>  |  ?all=1    gone for good
 */

const TTL = 365 * 24 * 3600;
const MAX_BYTES = 200_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const text = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .trim()
    .slice(0, max);

const listAll = async (kv: any): Promise<string[]> => {
  const names: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const listing = await kv.list({ prefix: 'trash:', limit: 1000, cursor });
    names.push(...(listing.keys ?? []).map((entry: { name: string }) => entry.name));
    if (listing.list_complete || !listing.cursor) break;
    cursor = listing.cursor;
  }
  return names;
};

export async function onRequest(context: { request: Request; env: NotifyEnv }) {
  const { request, env } = context;
  const kv = kvOf(env);
  if (!kv) return json({ error: 'The wastebasket needs the KV namespace, which this deployment does not have.' }, 503);

  const auth = await verifyAdminRequest(env as any, request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  if (request.method === 'POST') {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return json({ error: 'That item is too large for the wastebasket.' }, 413);
    let body: any = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    if (!body || !body.section || body.data === undefined) return json({ error: 'Invalid request.' }, 400);
    const now = Date.now();
    const id = `trash:${String(9_999_999_999_999 - now).padStart(13, '0')}:${Math.random().toString(36).slice(2, 8)}`;
    const item = {
      id,
      at: now,
      section: text(body.section, 40),
      label: text(body.label, 200),
      locale: text(body.locale, 5),
      data: body.data,
    };
    await kv.put(id, JSON.stringify(item), { expirationTtl: TTL });
    return json({ ok: true, id });
  }

  if (request.method === 'GET') {
    const names = await listAll(kv);
    const items = (await Promise.all(names.map((name) => kv.get(name, { type: 'json' }).catch(() => null)))).filter(Boolean);
    return json({ items });
  }

  if (request.method === 'DELETE') {
    const params = new URL(request.url).searchParams;
    const id = params.get('id');
    const section = params.get('section');
    if (id) {
      if (!id.startsWith('trash:')) return json({ error: 'Not a wastebasket item.' }, 400);
      await kv.delete(id);
      return json({ ok: true, deleted: 1 });
    }
    if (section || params.get('all') === '1') {
      const names = await listAll(kv);
      let doomed = names;
      if (section) {
        const items = await Promise.all(names.map((name) => kv.get(name, { type: 'json' }).catch(() => null)));
        doomed = names.filter((_, index) => (items[index] as any)?.section === section);
      }
      await Promise.all(doomed.map((name) => kv.delete(name)));
      return json({ ok: true, deleted: doomed.length });
    }
    return json({ error: 'Say which: ?id=, ?section= or ?all=1.' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
}
