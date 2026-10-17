import { readPaymentSecrets, stripeApiBase, PaymentEnv } from '../../shared/paymentConfig';
import { priceBooking, BookingRequest } from '../../shared/catalogPricing';

/**
 * Create a Stripe Checkout Session and hand back its URL.
 *
 * This is the "dynamic link": Stripe Payment Links are fixed-price, so a link
 * that carries an arbitrary amount has to be minted per booking. One call to
 * Stripe produces a one-shot hosted page at checkout.stripe.com, and the
 * browser simply goes there.
 *
 * The guest needs no Stripe account — `payment` mode takes a card from anyone,
 * and Stripe offers a login only for its own saved-card convenience. Email is
 * collected because Stripe requires it for the receipt, nothing more.
 *
 * WHY THE PRICE IS RESOLVED HERE. An amount posted by a browser is a number the
 * customer can edit. For a catalogue item the server looks the rate up itself
 * and charges that, so the page can ask for $240 and the till still says what
 * the tour costs. The amount is only taken from the request when the server
 * cannot find the item — a transfer quote, say, which is computed from a route
 * and a dozen modifiers — and that case is recorded in the session metadata as
 * `price_source=client` so the operator can see which is which in Stripe and
 * in the WhatsApp message.
 */

type CheckoutRequest = BookingRequest;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/** Stripe's API is form-encoded, including its nested keys. */
const formEncode = (params: Record<string, string | number | undefined>): string => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    body.append(key, String(value));
  }
  return body.toString();
};

// Pricing lives in shared/catalogPricing.ts, shared with the AZUL and CardNet
// checkouts, so every gateway charges the same server-decided amount.

export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const { stripeSecretKey, stripeCurrency } = await readPaymentSecrets(env);
  if (!stripeSecretKey) {
    return json(
      {
        error:
          'Card payments are not configured on this site yet. Please use WhatsApp or PayPal.',
        code: 'stripe_not_configured',
      },
      503
    );
  }

  let body: CheckoutRequest;
  try {
    body = (await request.json()) as CheckoutRequest;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const priced = await priceBooking(env, body);
  if (!priced.ok) {
    return json({ error: priced.error }, 400);
  }
  const { persons, title, unitPrice, returnPath, locale, priceSource } = priced.booking;
  const describedDate = priced.booking.date;
  const origin = new URL(request.url).origin;

  const params = formEncode({
    mode: 'payment',
    // {CHECKOUT_SESSION_ID} is substituted by Stripe on the way back.
    success_url: `${origin}${returnPath}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${returnPath}?paid=0`,
    locale,
    'payment_method_types[0]': 'card',
    'line_items[0][quantity]': persons,
    'line_items[0][price_data][currency]': stripeCurrency,
    'line_items[0][price_data][unit_amount]': Math.round(unitPrice * 100),
    'line_items[0][price_data][product_data][name]': title,
    'line_items[0][price_data][product_data][description]':
      `${persons} ${persons === 1 ? 'person' : 'persons'}${describedDate ? ` · ${describedDate}` : ''}`,
    // Everything the operator needs to recognise the booking, kept on the
    // payment itself so it survives independently of our own storage.
    'metadata[tour]': title,
    'metadata[persons]': persons,
    'metadata[date]': describedDate,
    'metadata[category]': String(body.category ?? 'tours').slice(0, 40),
    'metadata[price_source]': priceSource,
  });

  try {
    const response = await fetch(`${stripeApiBase(env)}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const session: any = await response.json();

    if (!response.ok) {
      // Stripe's own message is the useful one (bad key, wrong mode, currency
      // not enabled on the account), but it is for the operator, not the
      // guest — so it goes to the log and the guest gets a plain sentence.
      console.error('[stripe-checkout] Stripe rejected the session:', session?.error);
      return json(
        {
          error: 'Stripe could not start this payment. Please try WhatsApp or PayPal.',
          details: session?.error?.message,
        },
        502
      );
    }

    return json({ url: session.url, id: session.id });
  } catch (error: any) {
    console.error('[stripe-checkout] request failed:', error);
    return json({ error: 'Could not reach Stripe. Please try again.' }, 502);
  }
}
