/**
 * Start a card payment with whichever processor the operator chose.
 *
 * A guest pays BY CARD; whether Stripe, AZUL (Banco Popular) or CARDNET
 * charges that card is the operator's business, set in the admin, and never
 * reaches the storefront. So the browser asks one endpoint, /api/card-checkout,
 * and gets back one of two instructions it can follow without knowing who is
 * behind them:
 *
 *   { kind: 'redirect', url }           — go to this hosted page (Stripe)
 *   { kind: 'form', action, fields }    — post these fields there (the banks)
 *
 * Every processor prices through shared/bookingPrice.ts, so the amount does
 * not depend on which one is configured. Errors are written for the guest and
 * name no processor; the processor's own message goes to the log.
 */

import {
  readPaymentSecrets,
  resolveCardProcessor,
  isAzulReady,
  isCardnetReady,
  stripeApiBase,
  PaymentEnv,
  PaymentSecrets,
  CardProcessor,
} from './paymentConfig';
import { priceBooking, BookingRequest, PricedBooking } from './bookingPrice';
import {
  buildAzulForm,
  newOrderId,
  openCardnetSession,
  saveOrder,
  toLocalAmount,
  PaymentOrder,
} from './bankGateways';

export type CardCheckout =
  | { ok: true; kind: 'redirect'; url: string; ref: string; processor: CardProcessor }
  | {
      ok: true;
      kind: 'form';
      action: string;
      fields: Record<string, string>;
      ref: string;
      amount: number;
      currency: string;
      processor: CardProcessor;
    }
  | { ok: false; status: number; error: string; code?: string };

const UNAVAILABLE = 'Card payments are not available right now. Please book on WhatsApp instead.';
const FAILED = 'The secure payment page could not be opened. Please try again, or book on WhatsApp.';

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
 * STRIPE — a Checkout Session per booking. Stripe Payment Links are
 * fixed-price, so a link carrying an arbitrary amount has to be minted per
 * booking; the guest is sent to the one-shot hosted page it returns.
 */
export const startStripe = async (
  env: PaymentEnv,
  secrets: PaymentSecrets,
  booking: PricedBooking,
  origin: string,
  wallet?: string
): Promise<CardCheckout> => {
  const { title, persons, unitPrice, total, breakdown, returnPath, priceSource, date, locale, category } = booking;
  // Priced rate by rate, the booking is one line for its total; otherwise one
  // line per person at the single rate, which is how Stripe shows it best.
  const quantity = breakdown ? 1 : persons;
  const unitAmount = Math.round((breakdown ? total : unitPrice) * 100);
  const people = breakdown ?? `${persons} ${persons === 1 ? 'person' : 'persons'}`;
  const params = formEncode({
    mode: 'payment',
    // {CHECKOUT_SESSION_ID} is substituted by Stripe on the way back.
    success_url: `${origin}${returnPath}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${returnPath}?paid=0`,
    locale,
    'payment_method_types[0]': 'card',
    'line_items[0][quantity]': quantity,
    'line_items[0][price_data][currency]': secrets.stripeCurrency,
    'line_items[0][price_data][unit_amount]': unitAmount,
    'line_items[0][price_data][product_data][name]': title,
    'line_items[0][price_data][product_data][description]': `${people}${date ? ` · ${date}` : ''}`,
    // Everything the operator needs to recognise the booking, kept on the
    // payment itself so it survives independently of our own storage.
    'metadata[tour]': title,
    'metadata[persons]': persons,
    ...(breakdown ? { 'metadata[rates]': breakdown } : {}),
    'metadata[date]': date,
    'metadata[category]': category,
    'metadata[price_source]': priceSource,
    // The guest picked Apple Pay or Google Pay; Checkout shows it on the
    // devices that have it, and the operator sees which one was chosen.
    ...(wallet ? { 'metadata[wallet]': wallet } : {}),
  });

  try {
    const response = await fetch(`${stripeApiBase(env)}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secrets.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const session: any = await response.json();
    if (!response.ok || !session?.url) {
      // Stripe's own message is the useful one (bad key, wrong mode, currency
      // not enabled), but it is for the operator, not the guest.
      console.error('[card-checkout] Stripe rejected the session:', session?.error);
      return { ok: false, status: 502, error: FAILED };
    }
    return { ok: true, kind: 'redirect', url: session.url, ref: session.id, processor: 'stripe' };
  } catch (error) {
    console.error('[card-checkout] Stripe request failed:', error);
    return { ok: false, status: 502, error: FAILED };
  }
};

const newOrder = (
  provider: 'azul' | 'cardnet',
  booking: PricedBooking,
  secrets: PaymentSecrets
): PaymentOrder => {
  const currency = provider === 'azul' ? secrets.azulCurrency : secrets.cardnetCurrency;
  const now = new Date().toISOString();
  return {
    id: newOrderId(),
    provider,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    booking,
    currency,
    ...toLocalAmount(booking.total, currency, secrets),
  };
};

/** AZUL — the browser posts a signed form to Azul's Página de Pagos. */
export const startAzul = async (
  env: PaymentEnv,
  secrets: PaymentSecrets,
  booking: PricedBooking,
  origin: string
): Promise<CardCheckout> => {
  const order = newOrder('azul', booking, secrets);
  // Without the order there is nothing to check the guest's return against,
  // so a failed write stops the payment here rather than after the charge.
  if (!(await saveOrder(env, order))) return { ok: false, status: 503, error: FAILED };
  const form = await buildAzulForm(order, secrets, origin);
  return {
    ok: true,
    kind: 'form',
    action: form.action,
    fields: form.fields,
    ref: order.id,
    amount: order.amount,
    currency: order.currency,
    processor: 'azul',
  };
};

/** CARDNET — a session for the exact amount; the browser posts only its id. */
export const startCardnet = async (
  env: PaymentEnv,
  secrets: PaymentSecrets,
  booking: PricedBooking,
  origin: string,
  clientIp: string
): Promise<CardCheckout> => {
  const order = newOrder('cardnet', booking, secrets);
  const opened = await openCardnetSession(env, order, secrets, origin, clientIp);
  if (!opened.ok) return { ok: false, status: 502, error: FAILED };
  order.session = opened.session;
  order.sessionKey = opened.sessionKey;
  if (!(await saveOrder(env, order))) return { ok: false, status: 503, error: FAILED };
  return {
    ok: true,
    kind: 'form',
    action: opened.action,
    fields: { SESSION: opened.session },
    ref: order.id,
    amount: order.amount,
    currency: order.currency,
    processor: 'cardnet',
  };
};

/**
 * Price a booking and start it with the processor the operator chose — or
 * with `force`, a specific one (the processor-named endpoints, kept for the
 * operator's own testing).
 */
export const startCardCheckout = async (
  env: PaymentEnv,
  request: Request,
  body: BookingRequest,
  force?: CardProcessor
): Promise<CardCheckout> => {
  const secrets = await readPaymentSecrets(env);
  const ready: Record<CardProcessor, boolean> = {
    stripe: secrets.stripeSecretKey.length > 0,
    azul: isAzulReady(secrets),
    cardnet: isCardnetReady(secrets),
  };
  const processor = force ? (ready[force] ? force : null) : resolveCardProcessor(secrets);
  if (!processor) {
    return { ok: false, status: 503, error: UNAVAILABLE, code: 'card_not_configured' };
  }

  const priced = await priceBooking(env, body);
  if (!priced.ok) return { ok: false, status: 400, error: priced.error };

  const origin = new URL(request.url).origin;
  if (processor === 'azul') return startAzul(env, secrets, priced.booking, origin);
  if (processor === 'cardnet') {
    return startCardnet(env, secrets, priced.booking, origin, request.headers.get('CF-Connecting-IP') ?? '');
  }
  const wallet = body.wallet === 'apple_pay' || body.wallet === 'google_pay' ? body.wallet : undefined;
  return startStripe(env, secrets, priced.booking, origin, wallet);
};
