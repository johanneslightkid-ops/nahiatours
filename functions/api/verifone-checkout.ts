import { PaymentEnv } from '../../shared/paymentConfig';
import { BookingRequest } from '../../shared/bookingPrice';
import { startCardCheckout } from '../../shared/cardCheckout';

/**
 * Start a card payment with VERIFONE (2Checkout) specifically, whatever
 * processor is chosen in the admin. The storefront does not call this — it
 * asks /api/card-checkout — but an operator setting Verifone up can walk a
 * payment through it directly. Answers with the signed buy-link to open.
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

  const result = await startCardCheckout(env, request, body, 'verifone');
  if (!result.ok) return json({ error: result.error, code: result.code }, result.status);
  if (result.kind !== 'redirect') return json({ error: 'Unexpected checkout.' }, 500);
  return json({ ref: result.ref, url: result.url });
}
