import { PaymentEnv } from '../../shared/paymentConfig';
import { BookingRequest } from '../../shared/bookingPrice';
import { startMioCheckout } from '../../shared/cardCheckout';

/**
 * Pay with MIO through its API Checkout: the booking is priced here, a one-use
 * MIO payment link is minted for it, and the guest is sent to MIO's page. MIO
 * brings them back to /api/pay-return/mio/…, where the link is asked whether
 * a payment went through. See shared/mio.ts. Answers 503 when MIO's API is not
 * configured — the storefront then uses the Milin link instead.
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

  const result = await startMioCheckout(env, request, body);
  if (!result.ok) return json({ error: result.error, code: result.code }, result.status);
  if (result.kind !== 'redirect') return json({ error: 'Unexpected checkout.' }, 500);
  return json({ kind: 'redirect', url: result.url, ref: result.ref });
}
