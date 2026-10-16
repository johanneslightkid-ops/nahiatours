import { readPaymentSecrets, PaymentEnv } from '../../shared/paymentConfig';
import { isOrderId, readCardnetResult, readOrder, saveOrder } from '../../shared/bankGateways';

/**
 * What became of an AZUL or CARDNET payment, by the order id the guest came
 * back with (`?payment_ref=`).
 *
 * Public on purpose, like /api/stripe-session: the returning guest is signed in
 * to nothing. The id is fifteen random digits and the reply carries only what
 * is already on the guest's own receipt.
 *
 * A CardNET payment whose result could not be read at the moment of return —
 * a timeout on the way back, say — is asked about once more here, while
 * CardNET still remembers the session.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const ref = new URL(request.url).searchParams.get('ref')?.trim() ?? '';
  if (!isOrderId(ref)) {
    return json({ error: 'Missing or malformed payment reference.' }, 400);
  }

  const order = await readOrder(env, ref);
  if (!order) {
    return json({ error: 'That payment could not be found.' }, 404);
  }

  if (order.provider === 'cardnet' && (order.status === 'pending' || order.status === 'unverified')) {
    const result = await readCardnetResult(env, order, await readPaymentSecrets(env));
    if (result.known) {
      order.status = result.approved ? 'paid' : 'declined';
      order.authorizationCode = result.authorizationCode;
      order.reference = result.reference;
      order.updatedAt = new Date().toISOString();
      await saveOrder(env, order);
    }
  }

  return json({
    provider: order.provider,
    status: order.status,
    paid: order.status === 'paid',
    amountTotal: order.amount,
    currency: order.currency,
    usdTotal: order.booking.total,
    tour: order.booking.title,
    persons: order.booking.persons,
    date: order.booking.date,
    category: order.booking.category,
    priceSource: order.booking.priceSource,
    authorizationCode: order.authorizationCode ?? '',
    reference: order.reference ?? '',
  });
}
