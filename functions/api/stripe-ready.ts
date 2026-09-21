import { readPaymentSecrets, PaymentEnv } from '../../shared/paymentConfig';

/**
 * One boolean: can this site take a card right now?
 *
 * The storefront has to decide whether to draw a card button, and it cannot
 * ask /api/payment-config to find out — that endpoint is admin-only, and it
 * should stay that way. So this exists instead, and it answers with exactly
 * one fact and nothing else: no key, no mode, no currency, nothing that says
 * anything about the account behind it.
 */
export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { stripeSecretKey } = await readPaymentSecrets(env);

  return new Response(JSON.stringify({ ready: stripeSecretKey.length > 0 }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Short and private: the answer changes the moment the operator saves a
      // key, and a shared cache holding "no" for an hour would hide the button
      // from everyone until it expired.
      'Cache-Control': 'private, max-age=30',
    },
  });
}
