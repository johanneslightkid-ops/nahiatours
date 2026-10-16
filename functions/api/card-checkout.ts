import { PaymentEnv } from '../../shared/paymentConfig';
import { BookingRequest } from '../../shared/bookingPrice';
import { startCardCheckout } from '../../shared/cardCheckout';

/**
 * The storefront's one card endpoint. The guest pays by card; the processor
 * the operator chose in the admin — Stripe, AZUL or CardNET — is picked here
 * and never named in the answer beyond what the browser must do next.
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

  let body: BookingRequest;
  try {
    body = (await request.json()) as BookingRequest;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const result = await startCardCheckout(env, request, body);
  if (!result.ok) {
    return json({ error: result.error, code: result.code }, result.status);
  }

  return result.kind === 'redirect'
    ? json({ kind: 'redirect', url: result.url })
    : json({
        kind: 'form',
        method: 'POST',
        action: result.action,
        fields: result.fields,
        amount: result.amount,
        currency: result.currency,
      });
}
