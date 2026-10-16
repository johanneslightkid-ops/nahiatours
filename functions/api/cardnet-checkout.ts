import { readPaymentSecrets, isCardnetReady, PaymentEnv } from '../../shared/paymentConfig';
import { priceBooking, BookingRequest } from '../../shared/bookingPrice';
import {
  newOrderId,
  openCardnetSession,
  saveOrder,
  toLocalAmount,
  PaymentOrder,
} from '../../shared/bankGateways';

/**
 * Start a CARDNET payment: price the booking, open a CardNET session for that
 * exact amount, keep the session key with the order, and hand the browser the
 * one field it posts to CardNET's page — the session id.
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
  if (!isCardnetReady(secrets)) {
    return json(
      { error: 'CardNET payments are not configured on this site yet.', code: 'cardnet_not_configured' },
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
  const order: PaymentOrder = {
    id: newOrderId(),
    provider: 'cardnet',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    booking: priced.booking,
    currency: secrets.cardnetCurrency,
    ...toLocalAmount(priced.booking.total, secrets.cardnetCurrency, secrets),
  };

  const origin = new URL(request.url).origin;
  const clientIp = request.headers.get('CF-Connecting-IP') ?? '';
  const opened = await openCardnetSession(env, order, secrets, origin, clientIp);
  if (!opened.ok) {
    return json({ error: opened.error }, 502);
  }

  order.session = opened.session;
  order.sessionKey = opened.sessionKey;
  if (!(await saveOrder(env, order))) {
    return json({ error: 'Could not start this payment. Please try again.' }, 503);
  }

  return json({
    ref: order.id,
    action: opened.action,
    method: 'POST',
    fields: { SESSION: opened.session },
    amount: order.amount,
    currency: order.currency,
  });
}
