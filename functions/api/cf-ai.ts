import { verifyAdminRequest } from '../../shared/adminAuth';

/**
 * Workers AI proxy.
 *
 * Two ways to reach a model, in this order:
 *
 *   1. The `AI` binding (wrangler.toml `[ai]`). The account's own Workers AI,
 *      granted to this Worker at deploy time. No account id, no token, nothing
 *      to paste into the admin panel — a fresh deployment can generate text
 *      the moment it is up.
 *   2. The REST API, with an account id and token the admin supplied. Kept so
 *      an operator who wants to bill a different account, or reach a model the
 *      binding does not carry, still can.
 *
 * The client sends credentials only when it has them, so which path runs is
 * decided here rather than by the caller.
 */
export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Generating content costs the account money, so this is admin-only.
  const auth = await verifyAdminRequest(env, request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const body = await request.json();
    const { accountId, token, model, payload } = body as {
      accountId?: string;
      token?: string;
      model?: string;
      payload?: unknown;
    };

    if (!model) {
      return json({ error: 'Missing model' }, 400);
    }

    // ── 1. The binding ──────────────────────────────────────────────────────
    if (!accountId || !token) {
      if (!env.AI) {
        return json(
          {
            error:
              'No Workers AI binding on this deployment, and no account id or token was ' +
              'supplied. Either redeploy with [ai] in wrangler.toml, or enter Cloudflare ' +
              'credentials in the admin panel.',
          },
          400
        );
      }

      // The binding returns the model's own output shape — the same object the
      // REST API puts inside `result` — so it is wrapped to match, and callers
      // read `result.response` either way.
      const result = await env.AI.run(model, payload ?? {});
      return json({ success: true, result });
    }

    // ── 2. The REST API ─────────────────────────────────────────────────────
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const cfText = await cfRes.text();
    let cfData;
    try {
      cfData = JSON.parse(cfText);
    } catch {
      cfData = { response: cfText };
    }

    if (!cfRes.ok) {
      return json({ error: 'Cloudflare AI Error', details: cfData }, cfRes.status);
    }

    return json(cfData);
  } catch (error: any) {
    console.error('CF Proxy Error:', error);
    return json({ error: error.message }, 500);
  }
}
