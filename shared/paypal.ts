/**
 * PAYPAL — Checkout through the Orders API (v2), all of it server-side.
 *
 *   1. createPayPalOrder: an order for the exact amount, with this site's
 *      return and cancel addresses. PayPal answers with a `payer-action` link;
 *      the guest's browser goes there.
 *   2. The guest approves (PayPal balance, bank or card — PayPal's choice to
 *      offer) and PayPal sends them to the return address with `?token=<order>`,
 *      or to the cancel address.
 *   3. capturePayPalOrder: the money moves only now, when the server captures.
 *      The answer is PayPal's own — COMPLETED, DECLINED, PENDING — so the site
 *      knows, rather than asking the guest whether it worked.
 *
 * Credentials are a REST app's Client ID and Secret (developer.paypal.com →
 * Apps & Credentials); sandbox ones in test mode. Exchanged for a short-lived
 * token per call: a Worker isolate cannot be relied on to keep one.
 *
 * Without credentials the storefront keeps using the PayPal.Me link from the
 * brand settings, which brings back no answer at all.
 */

import { paypalApiBase, PaymentEnv, PaymentSecrets } from './paymentConfig';
import { plainText, returnUrl, PaymentOrder } from './bankGateways';
import { reasonFromPayPal, PaymentReason } from './paymentOutcome';

const PAYPAL_LOCALES: Record<string, string> = { en: 'en-US', es: 'es-ES', de: 'de-DE', fr: 'fr-FR' };

const token = async (env: PaymentEnv, secrets: PaymentSecrets): Promise<string | null> => {
  try {
    const response = await fetch(`${paypalApiBase(env, secrets.paypalMode)}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${secrets.paypalClientId}:${secrets.paypalSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    const body: any = await response.json().catch(() => null);
    if (!response.ok || typeof body?.access_token !== 'string') {
      console.error('[paypal] token refused', response.status, body?.error, body?.error_description);
      return null;
    }
    return body.access_token;
  } catch (error) {
    console.error('[paypal] token request failed', error);
    return null;
  }
};

/** Open an order. On success the order carries PayPal's id and the approval link. */
export const createPayPalOrder = async (
  env: PaymentEnv,
  secrets: PaymentSecrets,
  order: PaymentOrder,
  origin: string
): Promise<{ ok: true; url: string } | { ok: false }> => {
  const access = await token(env, secrets);
  if (!access) return { ok: false };
  const { booking } = order;
  const people = booking.breakdown ?? `${booking.persons} ${booking.persons === 1 ? 'person' : 'persons'}`;

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: order.id,
        custom_id: order.id,
        // PayPal refuses a second payment with the same invoice id, which is
        // exactly the protection wanted against paying one order twice.
        invoice_id: order.id,
        description: plainText(`${booking.title} - ${people}${booking.date ? ` - ${booking.date}` : ''}`, 127) || 'Booking',
        amount: { currency_code: 'USD', value: order.amount.toFixed(2) },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          locale: PAYPAL_LOCALES[booking.locale] ?? 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: returnUrl(origin, 'paypal', order.id, 'approved'),
          cancel_url: returnUrl(origin, 'paypal', order.id, 'cancelled'),
        },
      },
    },
  };

  try {
    const response = await fetch(`${paypalApiBase(env, secrets.paypalMode)}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Idempotent: a retried request cannot open a second order.
        'PayPal-Request-Id': `${order.id}-create`,
      },
      body: JSON.stringify(payload),
    });
    const body: any = await response.json().catch(() => null);
    const link = Array.isArray(body?.links)
      ? body.links.find((entry: any) => entry?.rel === 'payer-action' || entry?.rel === 'approve')
      : null;
    if (!response.ok || typeof body?.id !== 'string' || typeof link?.href !== 'string') {
      console.error('[paypal] order refused', response.status, body?.name, body?.details?.[0]?.issue);
      return { ok: false };
    }
    order.session = body.id;
    order.approveUrl = link.href;
    return { ok: true, url: link.href };
  } catch (error) {
    console.error('[paypal] order request failed', error);
    return { ok: false };
  }
};

export interface PayPalVerdict {
  /** False when PayPal could not be asked: nothing is concluded from that. */
  known: boolean;
  status: 'paid' | 'declined' | 'cancelled' | 'unverified' | 'error';
  reason: PaymentReason;
  code?: string;
  reference?: string;
  amount?: number;
}

const fromCapture = (body: any): PayPalVerdict => {
  const capture = body?.purchase_units?.[0]?.payments?.captures?.[0];
  const status = String(capture?.status ?? body?.status ?? '');
  const reference = typeof capture?.id === 'string' ? capture.id : undefined;
  const amount = Number(capture?.amount?.value);
  const extra = { reference, ...(Number.isFinite(amount) ? { amount } : {}) };
  if (status === 'COMPLETED') return { known: true, status: 'paid', reason: 'approved', code: status, ...extra };
  // Held by PayPal for review (an eCheck, a risk check): paid as far as the
  // guest is concerned, for the operator to watch in their PayPal account.
  if (status === 'PENDING') {
    return { known: true, status: 'unverified', reason: 'approved', code: capture?.status_details?.reason || status, ...extra };
  }
  if (status === 'DECLINED' || status === 'FAILED') {
    return { known: true, status: 'declined', reason: 'declined', code: status, ...extra };
  }
  return { known: false, status: 'unverified', reason: 'error', code: status || undefined };
};

/**
 * Capture an approved order — or, when it was captured already (a reload, a
 * second tab), read back what the capture said.
 */
export const capturePayPalOrder = async (
  env: PaymentEnv,
  secrets: PaymentSecrets,
  order: PaymentOrder
): Promise<PayPalVerdict> => {
  if (!order.session) return { known: false, status: 'unverified', reason: 'error' };
  const access = await token(env, secrets);
  if (!access) return { known: false, status: 'unverified', reason: 'error' };
  const base = `${paypalApiBase(env, secrets.paypalMode)}/v2/checkout/orders/${encodeURIComponent(order.session)}`;
  const headers = { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', Accept: 'application/json' };

  try {
    const response = await fetch(`${base}/capture`, {
      method: 'POST',
      headers: { ...headers, 'PayPal-Request-Id': `${order.id}-capture` },
    });
    const body: any = await response.json().catch(() => null);
    if (response.ok) return fromCapture(body);

    const issue = String(body?.details?.[0]?.issue ?? body?.name ?? '');
    if (issue === 'ORDER_ALREADY_CAPTURED') {
      const again = await fetch(base, { headers });
      const current: any = await again.json().catch(() => null);
      return again.ok ? fromCapture(current) : { known: false, status: 'unverified', reason: 'error', code: issue };
    }
    console.warn('[paypal] capture refused', response.status, issue);
    const reason = reasonFromPayPal(issue);
    if (response.status >= 500 || !issue) return { known: false, status: 'unverified', reason: 'error', code: issue || undefined };
    return {
      known: true,
      status: reason === 'cancelled' ? 'cancelled' : reason === 'error' ? 'error' : 'declined',
      reason,
      code: issue,
    };
  } catch (error) {
    console.error('[paypal] capture failed', error);
    return { known: false, status: 'unverified', reason: 'error' };
  }
};
