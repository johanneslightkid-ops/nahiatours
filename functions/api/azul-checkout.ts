import { readPaymentSecrets, isAzulReady, PaymentEnv } from '../../shared/paymentConfig';
import { priceBooking, BookingRequest } from '../../shared/bookingPrice';
import { buildAzulForm, newOrderId, saveOrder, toLocalAmount, PaymentOrder } from '../../shared/bankGateways';

/**
 * Start an AZUL payment: price the booking, keep it as an order, and hand the
 * browser the signed form to post to Azul's Página de Pagos.
 *
 * The browser has to be the one that posts (Azul's spec says so in as many
 * words), which is why the answer is a form rather than a URL. Nothing in it
 * is secret — the AuthKey that signed it stays here.
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

  const secrets = await readPaymentSecrets(env);
  if (!isAzulReady(secrets)) {
    return json(
      { error: 'Azul payments are not configured on this site yet.', code: 'azul_not_configured' },
      503
    );
  }

  let body: BookingRequest;
  try {
    body = (await request.json()) as BookingRequest;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const priced = await priceBooking(env, body);
  if (!priced.ok) {
    return json({ error: priced.error }, 400);
  }

  const now = new Date().toISOString();
  const local = toLocalAmount(priced.booking.total, secrets.azulCurrency, secrets);
  const order: PaymentOrder = {
    id: newOrderId(),
    provider: 'azul',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    booking: priced.booking,
    currency: secrets.azulCurrency,
    ...local,
  };

  // Without the order there is nothing to check the guest's return against,
  // so a failed write stops the payment here rather than after the charge.
  if (!(await saveOrder(env, order))) {
    return json({ error: 'Could not start this payment. Please try again.' }, 503);
  }

  const origin = new URL(request.url).origin;
  const form = await buildAzulForm(order, secrets, origin);

  return json({
    ref: order.id,
    action: form.action,
    method: 'POST',
    fields: form.fields,
    amount: order.amount,
    currency: order.currency,
  });
}
