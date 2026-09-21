import { readPaymentSecrets, stripeApiBase, PaymentEnv } from '../../shared/paymentConfig';

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

/** A booking nobody meant to make. Guards a fat-fingered or hostile amount. */
const MIN_TOTAL = 1;
const MAX_TOTAL = 50_000;

interface CheckoutRequest {
  category?: string;
  serviceId?: number | string;
  title?: string;
  persons?: number;
  date?: string;
  /** Only consulted when the catalogue lookup fails. */
  amount?: number;
  locale?: string;
  /** Where to send the guest back to, e.g. "/tours". Path only. */
  returnPath?: string;
}

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

/**
 * The per-person rate this deployment actually sells the item at.
 *
 * Reads the catalogue the same way functions/api/data.ts does — KV first, the
 * bundled /data/*.json second — but reaches for both directly rather than
 * calling our own /api/data over HTTP. A Worker fetching its own hostname
 * re-enters itself, which costs a subrequest and is the kind of thing that
 * works in dev and trips a loop guard in production.
 */
const loadCatalogue = async (
  env: PaymentEnv,
  resource: string
): Promise<any[] | null> => {
  const kv = (env.DATA_KV_F ?? env.DATA_KV) as any;
  if (kv && typeof kv.get === 'function') {
    try {
      const stored = await kv.get(resource, { type: 'json' });
      if (Array.isArray(stored)) return stored;
      if (Array.isArray(stored?.record)) return stored.record;
    } catch (error) {
      console.warn('[stripe-checkout] KV read failed for', resource, error);
    }
  }

  // The seed JSON shipped with the build. `env.ASSETS` is the static-assets
  // binding from wrangler.toml, so this never leaves the isolate.
  const assets = (env as any).ASSETS;
  if (assets && typeof assets.fetch === 'function') {
    try {
      const response = await assets.fetch(
        new Request(`https://assets.local/data/${resource}.json`)
      );
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload)) return payload;
        if (Array.isArray((payload as any)?.record)) return (payload as any).record;
      }
    } catch (error) {
      console.warn('[stripe-checkout] asset read failed for', resource, error);
    }
  }

  return null;
};

const lookupUnitPrice = async (
  env: PaymentEnv,
  { category, serviceId, title, locale }: CheckoutRequest
): Promise<number | null> => {
  const resource = category === 'transport' ? 'transport-services' : 'tours';
  const lang = locale === 'es' ? 'es' : 'en';

  const list = await loadCatalogue(env, `${resource}-${lang}`);
  if (!list) return null;

  // Ids are positional (assigned index+1 when the catalogue is normalised), so
  // the title is the more trustworthy match and is tried first.
  const wanted = String(title ?? '').trim().toLowerCase();
  const byTitle = wanted
    ? list.find((item: any) => String(item?.title ?? '').trim().toLowerCase() === wanted)
    : null;
  const index = Number(serviceId);
  const byIndex = Number.isFinite(index) && index >= 1 ? list[index - 1] : null;
  const record: any = byTitle ?? byIndex;
  if (!record) return null;

  const priceText =
    (Array.isArray(record.pricing)
      ? record.pricing.map((tier: any) => tier?.price).find((value: any) => value)
      : null) ?? record.price;

  const amount = Number(String(priceText ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

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

  const persons = Math.max(1, Math.min(60, Math.floor(Number(body.persons) || 1)));
  const title = String(body.title ?? '').trim().slice(0, 120) || 'Excursion';

  const serverUnit = await lookupUnitPrice(env, body);
  const clientTotal = Number(body.amount);
  const unitPrice =
    serverUnit ??
    (Number.isFinite(clientTotal) && clientTotal > 0 ? clientTotal / persons : null);

  if (!unitPrice || unitPrice <= 0) {
    return json({ error: 'No price could be determined for this booking.' }, 400);
  }

  const total = unitPrice * persons;
  if (total < MIN_TOTAL || total > MAX_TOTAL) {
    return json({ error: 'That total is outside the range this site can charge.' }, 400);
  }

  // Only ever a path on this site, so a crafted request cannot turn our
  // success page into a redirect to someone else's.
  const origin = new URL(request.url).origin;
  const rawReturn = String(body.returnPath ?? '/');
  const returnPath = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '/';

  const describedDate = String(body.date ?? '').trim().slice(0, 40);
  const locale = body.locale === 'es' ? 'es' : 'en';

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
    'metadata[price_source]': serverUnit ? 'catalogue' : 'client',
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
