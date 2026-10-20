/**
 * /api/wallet-config — the admin's Apple Pay & Google Pay settings.
 *
 *   GET  (admin)                         → what the wallets need and what is in place
 *   POST (admin) { action: 'register' }  → register this site's domain with Stripe
 *   PUT  (admin) { appleAssociation }    → store (or clear) Apple's domain file
 *
 * And, public:
 *
 *   GET /.well-known/apple-developer-merchantid-domain-association
 *        → the file Apple asks for when a domain is verified for Apple Pay
 *
 * The wallets are paid through the card processor's hosted page, so they
 * need no keys of their own. What they do need is set up here or linked from
 * here: a processor whose page offers them (Stripe or Verifone — the banks'
 * pages take cards only), the wallets switched on in that processor's
 * dashboard, and — for Stripe — the site's domain registered as a payment
 * method domain, which Stripe verifies with Apple and Google itself. A
 * processor that asks for Apple's verification file to be hosted on the
 * domain gets it served from what is pasted here.
 */

import { adminKv, verifyAdminRequest } from '../../shared/adminAuth';
import { CARD_WALLETS, PaymentEnv, readPaymentSecrets, resolveCardProcessor, stripeApiBase } from '../../shared/paymentConfig';

export const APPLE_PAY_ASSOCIATION_KEY = 'apple-pay-domain-association';
export const APPLE_PAY_ASSOCIATION_PATH = '/.well-known/apple-developer-merchantid-domain-association';

type Env = PaymentEnv & Record<string, unknown>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

interface StripeDomain {
  id: string;
  domain: string;
  enabled: boolean;
  applePay: string;
  googlePay: string;
}

const stripeCall = async (env: Env, key: string, path: string, init: RequestInit = {}) => {
  const response = await fetch(`${stripeApiBase(env)}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded', ...(init.headers ?? {}) },
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Stripe ${response.status}`);
  return body;
};

const toDomain = (item: any): StripeDomain => ({
  id: String(item.id),
  domain: String(item.domain_name),
  enabled: Boolean(item.enabled),
  applePay: String(item.apple_pay?.status ?? 'unknown'),
  googlePay: String(item.google_pay?.status ?? 'unknown'),
});

const findDomain = async (env: Env, key: string, domain: string): Promise<StripeDomain | null> => {
  const list = await stripeCall(env, key, `/v1/payment_method_domains?domain_name=${encodeURIComponent(domain)}&limit=1`);
  const item = Array.isArray(list?.data) ? list.data[0] : null;
  return item ? toDomain(item) : null;
};

/** The public verification file, when one has been pasted. */
export const onAppleAssociation = async ({ env }: { request: Request; env: Env }) => {
  const kv = adminKv(env as never);
  const value = kv ? await kv.get(APPLE_PAY_ASSOCIATION_KEY).catch(() => null) : null;
  if (!value) return new Response('Not found', { status: 404 });
  return new Response(value, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
};

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  const auth = await verifyAdminRequest(env as never, request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const url = new URL(request.url);
  const host = url.hostname;
  const kv = adminKv(env as never);
  const secrets = await readPaymentSecrets(env);
  const processor = resolveCardProcessor(secrets);
  const stripeKey = secrets.stripeSecretKey;

  if (request.method === 'PUT') {
    if (!kv) return json({ error: 'No KV namespace is bound to this deployment.' }, 503);
    const body = (await request.json().catch(() => ({}))) as { appleAssociation?: string };
    const file = String(body.appleAssociation ?? '').trim();
    if (file.length > 20000) return json({ error: 'That file is too large to be Apple’s verification file.' }, 400);
    if (file) await kv.put(APPLE_PAY_ASSOCIATION_KEY, file);
    else await kv.delete(APPLE_PAY_ASSOCIATION_KEY);
    return json({ ok: true, appleAssociation: Boolean(file) });
  }

  if (request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as { action?: string; domain?: string };
    if (body.action !== 'register') return json({ error: 'Unknown action.' }, 400);
    if (!stripeKey) return json({ error: 'Save a Stripe secret key first.' }, 400);
    const domain = String(body.domain || host).trim().toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return json({ error: 'That is not a domain name.' }, 400);
    try {
      const existing = await findDomain(env, stripeKey, domain);
      const result = existing
        ? await stripeCall(env, stripeKey, `/v1/payment_method_domains/${existing.id}/validate`, { method: 'POST' })
        : await stripeCall(env, stripeKey, '/v1/payment_method_domains', { method: 'POST', body: new URLSearchParams({ domain_name: domain }).toString() });
      return json({ ok: true, domain: toDomain(result) });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 502);
    }
  }

  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  let stripeDomain: StripeDomain | null = null;
  let stripeError = '';
  if (stripeKey) {
    try {
      stripeDomain = await findDomain(env, stripeKey, host);
    } catch (error) {
      stripeError = error instanceof Error ? error.message : String(error);
    }
  }
  const association = kv ? await kv.get(APPLE_PAY_ASSOCIATION_KEY).catch(() => null) : null;

  return json({
    host,
    processor,
    wallets: processor ? CARD_WALLETS[processor] : [],
    stripe: {
      keyOnFile: Boolean(stripeKey),
      mode: stripeKey.startsWith('sk_live') ? 'live' : stripeKey.startsWith('sk_test') ? 'test' : null,
      domain: stripeDomain,
      error: stripeError,
    },
    appleAssociation: { onFile: Boolean(association), path: APPLE_PAY_ASSOCIATION_PATH },
    storageAvailable: Boolean(kv),
  });
};
