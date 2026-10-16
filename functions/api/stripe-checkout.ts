import { PaymentEnv } from '../../shared/paymentConfig';
import { BookingRequest } from '../../shared/bookingPrice';
import { startCardCheckout } from '../../shared/cardCheckout';

/**
 * Create a Stripe Checkout Session and hand back its URL.
 *
 * The storefront no longer calls this — it asks /api/card-checkout, which
 * picks whichever processor the operator chose. This stays, answering in its
 * old shape, so a page built before that change keeps working through a
 * deploy, and so Stripe can be exercised on its own. The work itself lives in
 * shared/cardCheckout.ts.
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

  const result = await startCardCheckout(env, request, body, 'stripe');
  if (!result.ok) return json({ error: result.error, code: result.code }, result.status);
  if (result.kind !== 'redirect') return json({ error: 'Unexpected checkout.' }, 500);
  return json({ url: result.url, id: result.ref });
}
