import { readPaymentSecrets, PaymentEnv } from '../../shared/paymentConfig';
import { isOrderId, loadOrder, saveOrder, PaymentOrder } from '../../shared/paymentOrders';
import { azulAmount, cardnetBase, getCardnetResult, verifyAzulResponse } from '../../shared/dominicanGateways';

/**
 * Where AZUL and CardNet send the guest back to.
 *
 *   /api/dr-return/azul/{approved|declined|cancel}/{order}
 *   /api/dr-return/cardnet/{return|cancel}/{order}
 *
 * Nothing that arrives here is believed on its own. AZUL's result is accepted
 * only if its AuthHash checks out with our AuthKey AND it names this order and
 * this amount. CardNet's POST carries nothing but a session id, so CardNet is
 * asked directly what happened to the session this order opened. Whatever is
 * learned is written onto the order, and the guest is redirected to the page
 * they paid from with `?paid=…&order=…` — which the page then confirms by
 * reading the order (/api/dr-order), not by trusting `paid`.
 *
 * A paid order is never downgraded: a stale tab or a replayed decline cannot
 * un-pay a booking.
 */

const redirect = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });

const finish = (order: PaymentOrder | null, id: string) => {
  const path = order?.returnPath || '/';
  // `paid=0` only for a guest who walked away; every other outcome sends the
  // page to read the order, which says what really happened.
  const paid = order && order.status !== 'cancelled' ? '1' : '0';
  const sep = path.includes('?') ? '&' : '?';
  return redirect(`${path}${sep}paid=${paid}&order=${encodeURIComponent(id)}`);
};

export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const [, , , gateway, outcome, id] = url.pathname.split('/');

  if (!isOrderId(id) || (gateway !== 'azul' && gateway !== 'cardnet')) {
    return redirect('/?paid=0');
  }

  const order = await loadOrder(env, id);
  if (!order || order.gateway !== gateway) {
    return redirect(`/?paid=0&order=${id}`);
  }
  if (order.status === 'paid') {
    return finish(order, id);
  }

  const secrets = await readPaymentSecrets(env);
  const update = async (patch: Partial<PaymentOrder>) => {
    Object.assign(order, patch, { updatedAt: new Date().toISOString() });
    await saveOrder(env, order);
  };

  if (gateway === 'azul') {
    if (outcome === 'cancel') {
      await update({ status: 'cancelled' });
      return finish(order, id);
    }

    const params = url.searchParams;
    const genuine = await verifyAzulResponse(params, secrets.azul.authKey);
    const sameOrder = params.get('OrderNumber') === order.id;
    const sameAmount = params.get('Amount') === azulAmount(order.chargeMinor);

    if (!genuine || !sameOrder || !sameAmount) {
      console.warn('[dr-return] AZUL result rejected', { order: id, genuine, sameOrder, sameAmount });
      await update({ status: 'error', result: { message: 'unverified response' } });
      return finish(order, id);
    }

    const approved = outcome === 'approved' && params.get('IsoCode') === '00';
    await update({
      status: approved ? 'paid' : 'declined',
      result: {
        authorizationCode: (params.get('AuthorizationCode') ?? '').slice(0, 20),
        reference: (params.get('RRN') ?? params.get('AzulOrderId') ?? '').slice(0, 40),
        responseCode: (params.get('IsoCode') ?? '').slice(0, 10),
        message: (params.get('ResponseMessage') || params.get('ErrorDescription') || '').slice(0, 120),
        card: (params.get('CardNumber') ?? '').slice(0, 24),
      },
    });
    return finish(order, id);
  }

  // CardNet: ask, whatever the outcome in the URL says.
  if (!order.cardnet) {
    await update({ status: 'error' });
    return finish(order, id);
  }

  const result = await getCardnetResult(cardnetBase(secrets.cardnet), order.cardnet.session, order.cardnet.sessionKey);
  if (!result) {
    // CardNet unreachable: leave it pending; the receipt page asks again.
    return finish(order, id);
  }
  if (result.pending) {
    if (outcome === 'cancel') await update({ status: 'cancelled' });
    return finish(order, id);
  }
  if (result.orderId && result.orderId !== order.id) {
    console.warn('[dr-return] CardNet session names another order', { order: id, reported: result.orderId });
    await update({ status: 'error', result: { message: 'order mismatch' } });
    return finish(order, id);
  }

  await update({
    status: result.approved ? 'paid' : 'declined',
    result: {
      authorizationCode: result.authorizationCode,
      reference: result.reference,
      responseCode: result.responseCode,
      card: result.card,
    },
  });
  return finish(order, id);
}
