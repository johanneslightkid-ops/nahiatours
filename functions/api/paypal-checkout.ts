import { PaymentEnv } from '../../shared/paymentConfig';
import { BookingRequest } from '../../shared/bookingPrice';
import { startPayPalCheckout } from '../../shared/cardCheckout';

/**
 * Pay with PayPal through PayPal's API: the booking is priced here, a PayPal
 * order is opened for it, and the guest is sent to approve it. PayPal brings
 * them back to /api/pay-return/paypal/…, where the payment is captured.
 * See shared/paypal.ts. Answers 503 when no PayPal app is configured — the
 * storefront then uses the PayPal.Me link instead.
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

  const result = await startPayPalCheckout(env, request, body);
  if (!result.ok) return json({ error: result.error, code: result.code }, result.status);
  if (result.kind !== 'redirect') return json({ error: 'Unexpected checkout.' }, 500);
  return json({ kind: 'redirect', url: result.url, ref: result.ref });
}
