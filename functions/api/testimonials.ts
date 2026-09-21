import { verifyAdminRequest } from '../../shared/adminAuth';

/**
 * Where a visitor's review goes.
 *
 * It used to go nowhere. The form on the home page built a testimonial, put it
 * in React state — so it appeared, which is why this looked like it worked —
 * and then called `saveTestimonials`, which is `PUT /api/data?resource=
 * testimonials`. That endpoint is admin-only. A visitor has no admin password,
 * so the write came back 401, the service caught the error and returned the
 * list it had been handed, and the page showed a review that existed only
 * until the next reload. Nothing was ever written to KV.
 *
 * A visitor cannot be given the admin password, and the generic writer must
 * not become public — it can address the brand record, the tour catalogue and
 * the site's whole configuration. So one endpoint that can do exactly one
 * thing: append a single review.
 *
 * It appends UNAPPROVED. An unauthenticated write endpoint on a tourism site
 * will be found by spam, and the answer to that is not a captcha but the fact
 * that nothing published itself: a new review waits in the admin until someone
 * approves it. Reviews already in KV have no `approved` field at all, and
 * those are treated as approved — this cannot un-publish anything that is
 * already up.
 */

interface Testimonial {
  id: string;
  name: string;
  email: string;
  review: string;
  rating: number;
  profileImage?: string;
  createdAt: string;
  approved?: boolean;
}

const KEY = 'testimonials';

/** Long enough for a real review, short enough not to be a payload. */
const LIMITS = { name: 80, email: 160, review: 2000, image: 512 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const kvOf = (env: Record<string, any>) => env.DATA_KV_F ?? env.DATA_KV;

const load = async (env: Record<string, any>): Promise<Testimonial[]> => {
  const kv = kvOf(env);
  if (!kv) return [];
  try {
    const raw = await kv.get(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const record = parsed?.record ?? parsed;
    if (Array.isArray(record)) return record as Testimonial[];
    if (Array.isArray(record?.testimonials)) return record.testimonials as Testimonial[];
    return [];
  } catch {
    return [];
  }
};

/** Trim, cap, and reject anything that is not a string. */
const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;

  try {
    if (request.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, 405);
    }

    const kv = kvOf(env);
    if (!kv) {
      // Said out loud rather than swallowed. A deployment with no namespace
      // cannot keep a review, and pretending otherwise is how this went
      // unnoticed in the first place.
      return json(
        {
          ok: false,
          error:
            'This deployment has no KV namespace bound, so there is nowhere to ' +
            'keep a review. Redeploy with the namespace bound and try again.',
        },
        503
      );
    }

    const body: any = await request.json().catch(() => null);
    if (!body) return json({ ok: false, error: 'Expected a JSON body' }, 400);

    const name = clean(body.name, LIMITS.name);
    const review = clean(body.review, LIMITS.review);
    const email = clean(body.email, LIMITS.email);
    if (!name || !review) {
      return json({ ok: false, error: 'A name and a review are both required.' }, 400);
    }

    const image = clean(body.profileImage, LIMITS.image);
    const rating = Number(body.rating);

    const entry: Testimonial = {
      id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      email,
      review,
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : 5,
      // Only an https URL, never a data: blob — the uploader returns a URL, and
      // anything else here would be a way to push bytes into the record.
      ...(/^https:\/\//i.test(image) ? { profileImage: image } : {}),
      createdAt: new Date().toISOString().slice(0, 10),
      approved: false,
    };

    // An admin submitting through the panel does not wait for their own
    // approval. This is the one place the password changes the outcome, and it
    // is checked, not taken on trust from the request body.
    const auth = await verifyAdminRequest(env, request);
    if (auth.ok) entry.approved = true;

    const existing = await load(env);
    // Newest first, and a hard cap so the record cannot grow without bound.
    const next = [entry, ...existing].slice(0, 500);
    await kv.put(KEY, JSON.stringify({ testimonials: next }));

    return json({ ok: true, testimonial: entry, pending: !entry.approved });
  } catch (error: any) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
}
