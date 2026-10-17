import { readPaymentSecrets, PaymentEnv } from '../../shared/paymentConfig';
import {
  guestLanding,
  readCardnetResult,
  readOrder,
  saveOrder,
  verifyAzulReturn,
  verifyVerifoneReturn,
  BankProvider,
  OrderStatus,
} from '../../shared/bankGateways';

/**
 * Where AZUL and CARDNET send the guest back to:
 *
 *   /api/pay-return/azul/<order>/approved|declined|cancelled
 *   /api/pay-return/cardnet/<order>/approved|cancelled
 *   /api/pay-return/verifone/<order>/approved
 *
 * The outcome in the path is only a hint. Azul's word counts once its AuthHash
 * checks out against the AuthKey; CardNET's counts once CardNET itself, asked
 * with the session key kept on the order, says so. Then the order is updated
 * and the guest is sent on to the page they booked from with `?payment_ref=`,
 * where the receipt asks /api/payment-result what really happened.
 */

const redirect = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });

export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const [, , , provider, id, outcome] = url.pathname.split('/');

  if ((provider !== 'azul' && provider !== 'cardnet' && provider !== 'verifone') || !id) {
    return redirect('/');
  }

  const order = await readOrder(env, id);
  if (!order || order.provider !== (provider as BankProvider)) {
    return redirect(`/?payment_ref=${encodeURIComponent(id)}`);
  }

  // A guest who reloads the return page, or comes back twice, must not be
  // able to turn a settled answer into a different one.
  if (order.status !== 'pending' && order.status !== 'unverified') {
    return redirect(guestLanding(order));
  }

  const secrets = await readPaymentSecrets(env);
  let status: OrderStatus = order.status;

  if (provider === 'azul') {
    if (outcome === 'cancelled') {
      status = 'cancelled';
    } else {
      const params = url.searchParams;
      const { authentic, approved } = await verifyAzulReturn(params, order, secrets.azulAuthKey);
      status = !authentic ? 'unverified' : approved ? 'paid' : 'declined';
      order.authorizationCode = params.get('AuthorizationCode') || undefined;
      order.reference = params.get('RRN') || undefined;
      order.message = (params.get('ResponseMessage') || params.get('ErrorDescription') || '').slice(0, 120) || undefined;
    }
  } else if (provider === 'verifone') {
    // 2Checkout only redirects here once an order has been placed. A
    // signature that checks out, for this order and this price, is a payment;
    // one that does not is left for the operator to confirm in 2Checkout's
    // panel — never called paid on the strength of the query string alone.
    const { authentic, sameOrder, reference } = await verifyVerifoneReturn(
      url.searchParams,
      order,
      secrets.verifoneSecretWord
    );
    status = authentic && sameOrder ? 'paid' : 'unverified';
    order.reference = reference || undefined;
    order.message = authentic ? undefined : 'Confirm this order in the 2Checkout control panel.';
  } else {
    // CardNET uses its cancel address for declines as well, so the session is
    // asked either way; the path only decides what to assume when it cannot be.
    const result = await readCardnetResult(env, order, secrets);
    if (result.known) {
      status = result.approved ? 'paid' : outcome === 'cancelled' ? 'cancelled' : 'declined';
      order.authorizationCode = result.authorizationCode;
      order.reference = result.reference;
      order.message = result.code ? `ResponseCode ${result.code}` : undefined;
    } else {
      status = outcome === 'cancelled' ? 'cancelled' : 'unverified';
    }
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  await saveOrder(env, order);

  return redirect(guestLanding(order));
}
