import { PaymentEnv } from '../../shared/paymentConfig';
import { isOrderId, readOrder } from '../../shared/bankGateways';
import { retryOrder } from '../../shared/cardCheckout';

/**
 * "Try again" on a payment that did not go through.
 *
 *   POST { ref }  →  { kind: 'redirect', url } | { kind: 'form', action, fields }
 *
 * The same booking at the price the server set the first time, in a new
 * order; the old one is left as it was, for the record. A paid order is never
 * started again.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let ref = '';
  try {
    ref = String(((await request.json()) as { ref?: unknown })?.ref ?? '').trim();
  } catch {
    /* falls through to the check below */
  }
  if (!isOrderId(ref)) return json({ error: 'Missing or malformed payment reference.' }, 400);

  const order = await readOrder(env, ref);
  if (!order) return json({ error: 'That payment could not be found.' }, 404);
  if (order.status === 'paid' || order.status === 'unverified') {
    return json({ error: 'This booking is already paid.', code: 'already_paid' }, 409);
  }

  const result = await retryOrder(env, request, order);
  if (!result.ok) return json({ error: result.error, code: result.code }, result.status);
  return result.kind === 'redirect'
    ? json({ kind: 'redirect', url: result.url })
    : json({ kind: 'form', method: 'POST', action: result.action, fields: result.fields, amount: result.amount, currency: result.currency });
}
