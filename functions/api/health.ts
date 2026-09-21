/**
 * What is actually deployed here.
 *
 * Two questions cost a working day each this month, and neither could be
 * answered from a browser:
 *
 *   1. "beautiful-tours.com is showing the other site." Which branch built
 *      what is being served? Nothing in the page says. Three sites share this
 *      repository and one Cloudflare account, and the only way to tell them
 *      apart was to look at the design and guess.
 *   2. "The blog generator says there is no AI binding." Is that true of this
 *      deployment, or is it reporting a stale build? Bindings live in
 *      wrangler.toml, are applied at deploy time, and are invisible afterwards
 *      without dashboard access.
 *
 * So this endpoint says. It is deliberately public and deliberately boring: a
 * Worker name, the commit it was built from, when, and which bindings arrived
 * with it — reported as booleans, never as values. Knowing that a KV namespace
 * is bound tells an attacker nothing; it tells an operator everything.
 *
 * NOTHING SECRET GOES IN HERE. Not a key, not a namespace id, not a password,
 * not the contents of a var. If a future field cannot be printed on a postcard
 * it does not belong in this file.
 */

/**
 * Where the four fields come from, and why none of them needs a build step.
 *
 *   SITE and SITE_BRANCH are [vars] in each branch's own wrangler.toml. They
 *   are the answer to "which branch built this", and they are trustworthy
 *   precisely because they are committed next to the `name` they describe: a
 *   deploy from the wrong branch carries the wrong branch's answer, which is
 *   exactly what it should say.
 *
 *   BUILD_COMMIT and BUILD_TIME are passed by the deploy workflow with
 *   `wrangler deploy --var`, so they cost nothing at build time and are absent
 *   rather than wrong on a deploy that did not set them.
 */
const text = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.trim() ? v.trim() : fallback;

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;
  const url = new URL(request.url);

  const site = text(env.SITE, 'unknown');
  const branch = text(env.SITE_BRANCH, 'unknown');
  const commit = text(env.BUILD_COMMIT, 'unknown');
  const builtAt = text(env.BUILD_TIME, 'unknown');

  const kv = env.DATA_KV_F ?? env.DATA_KV;

  return new Response(
    JSON.stringify(
      {
        ok: true,
        host: url.hostname,
        // Which build is answering. This is the whole point of the endpoint:
        // open it on two domains and you know instantly whether they are
        // serving the same thing.
        build: { site, branch, commit, builtAt },
        bindings: {
          // `true` means /api/ai can generate with no credentials at all.
          ai: Boolean(env.AI),
          // `true` means admin edits persist. `false` means the site reads the
          // JSON bundled in the build and every save is lost.
          kv: Boolean(kv && typeof kv.get === 'function'),
          kvBinding: env.DATA_KV_F ? 'DATA_KV_F' : env.DATA_KV ? 'DATA_KV' : null,
          assets: Boolean(env.ASSETS && typeof env.ASSETS.fetch === 'function'),
        },
        // Set means this deployment redirects every other hostname to that
        // one — the setting that would make a second site look like the first.
        canonicalHost: typeof env.CANONICAL_HOST === 'string' ? env.CANONICAL_HOST : null,
        time: new Date().toISOString(),
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Never cached: a stale answer about which build is live is worse than
        // no answer, because it is believed.
        'Cache-Control': 'no-store',
      },
    }
  );
}
