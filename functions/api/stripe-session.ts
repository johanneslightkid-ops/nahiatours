import { readPaymentSecrets, stripeApiBase, PaymentEnv } from '../../shared/paymentConfig';

/**
 * What actually happened to a checkout session.
 *
 * The guest comes back from Stripe with `?paid=1&session_id=cs_…`, and that
 * query string is a claim, not a fact — anyone can type it. So the page asks
 * here, and here asks Stripe, before it tells the operator a cent was paid.
 * The WhatsApp message is then built from the amount Stripe reports, not from
 * anything the page was holding.
 *
 * Public on purpose: the returning guest is not signed in to anything. A
 * session id is a long unguessable string, and the reply carries only what is
 * already on the guest's own receipt — status, amount, and the booking details
 * we put into its metadata ourselves. No customer record, no payment method,
 * no key.
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

  const sessionId = new URL(request.url).searchParams.get('session_id')?.trim() ?? '';
  // Checkout session ids are `cs_` + base62. Rejecting anything else keeps a
  // crafted id from being pasted straight into a Stripe API path.
  if (!/^cs_[A-Za-z0-9_]{10,120}$/.test(sessionId)) {
    return json({ error: 'Missing or malformed session id.' }, 400);
  }

  const { stripeSecretKey } = await readPaymentSecrets(env);
  if (!stripeSecretKey) {
    return json({ error: 'Card payments are not configured on this site.' }, 503);
  }

  try {
    const response = await fetch(
      `${stripeApiBase(env)}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeSecretKey}` } }
    );
    const session: any = await response.json();

    if (!response.ok) {
      console.warn('[stripe-session] lookup failed:', session?.error?.message);
      return json({ error: 'That payment could not be found.' }, 404);
    }

    const paid = session?.payment_status === 'paid';

    return json({
      paid,
      // Stripe reports minor units; the page wants money.
      amountTotal: typeof session?.amount_total === 'number' ? session.amount_total / 100 : null,
      currency: typeof session?.currency === 'string' ? session.currency.toUpperCase() : null,
      tour: session?.metadata?.tour ?? '',
      persons: Number(session?.metadata?.persons) || null,
      date: session?.metadata?.date ?? '',
      category: session?.metadata?.category ?? '',
      /** 'catalogue' when the server set the price, 'client' when it could not. */
      priceSource: session?.metadata?.price_source ?? '',
    });
  } catch (error: any) {
    console.error('[stripe-session] request failed:', error);
    return json({ error: 'Could not reach Stripe.' }, 502);
  }
}
