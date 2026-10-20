import { PaymentEnv } from '../../shared/paymentConfig';
import { isOrderId, readOrder, saveOrder } from '../../shared/bankGateways';
import { refreshOrder } from '../../shared/paymentSettle';

/**
 * What became of a payment, by the order id the guest came back with
 * (`?payment_ref=`) — for every processor, since all of them return through
 * /api/pay-return.
 *
 * Public on purpose, like /api/stripe-session: the returning guest is signed in
 * to nothing. The id is fifteen random digits and the reply carries only what
 * is already on the guest's own receipt, plus why a payment did not go through
 * — in the coarse terms of shared/paymentOutcome.ts, never the bank's words.
 *
 * An order whose answer could not be read at the moment of return — a timeout
 * on the way back, say — is asked about once more here, where the processor
 * can be asked from the server (CardNET, Stripe, PayPal).
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

  if (await refreshOrder(env, order)) {
    order.updatedAt = new Date().toISOString();
    await saveOrder(env, order);
  }

  return json({
    provider: order.provider,
    /** 'card' or 'paypal' — what the guest chose, which is all the page may name. */
    method: order.provider === 'paypal' ? 'paypal' : 'card',
    status: order.status,
    paid: order.status === 'paid',
    reason: order.reason ?? (order.status === 'paid' ? 'approved' : order.status === 'cancelled' ? 'cancelled' : ''),
    code: order.code ?? '',
    amountTotal: order.amount,
    currency: order.currency,
    usdTotal: order.booking.total,
    tour: order.booking.title,
    persons: order.booking.persons,
    date: order.booking.date,
    category: order.booking.category,
    priceSource: order.booking.priceSource,
    returnPath: order.booking.returnPath,
    authorizationCode: order.authorizationCode ?? '',
    reference: order.reference ?? '',
  });
}
