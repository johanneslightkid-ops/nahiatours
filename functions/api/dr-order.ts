import { readPaymentSecrets, PaymentEnv } from '../../shared/paymentConfig';
import { isOrderId, loadOrder, publicOrder, saveOrder } from '../../shared/paymentOrders';
import { cardnetBase, getCardnetResult } from '../../shared/dominicanGateways';

/**
 * What became of an AZUL or CardNet payment — the receipt the return page
 * shows and the WhatsApp message is built from.
 *
 * Public on purpose, like /api/stripe-session: the returning guest is not
 * signed in to anything. An order id is twelve random digits, and the reply
 * holds only what is on the guest's own receipt.
 *
 * A CardNet order still pending is re-checked with CardNet here, so a guest
 * whose return arrived before CardNet had recorded the result still gets an
 * answer when the page asks.
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

  const id = new URL(request.url).searchParams.get('order') ?? '';
  if (!isOrderId(id)) {
    return json({ error: 'Missing or malformed order id.' }, 400);
  }

  const order = await loadOrder(env, id);
  if (!order) {
    return json({ error: 'That payment could not be found.' }, 404);
  }

  if (order.status === 'pending' && order.gateway === 'cardnet' && order.cardnet) {
    const secrets = await readPaymentSecrets(env);
    const result = await getCardnetResult(cardnetBase(secrets.cardnet), order.cardnet.session, order.cardnet.sessionKey);
    if (result && !result.pending && (!result.orderId || result.orderId === order.id)) {
      order.status = result.approved ? 'paid' : 'declined';
      order.updatedAt = new Date().toISOString();
      order.result = {
        authorizationCode: result.authorizationCode,
        reference: result.reference,
        responseCode: result.responseCode,
        card: result.card,
      };
      await saveOrder(env, order);
    }
  }

  return json(publicOrder(order));
}
