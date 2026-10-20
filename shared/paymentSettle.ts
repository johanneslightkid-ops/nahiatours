/**
 * Turning a processor's answer into an order's status — once when the guest
 * comes back (functions/api/pay-return.ts), and again when the receipt asks
 * (functions/api/payment-result.ts) about an order whose answer could not be
 * read the first time.
 *
 * The outcome in the return address (approved / declined / cancelled) is only
 * a hint. What counts:
 *   AZUL     — its AuthHash over the result, checked against the AuthKey;
 *   CARDNET  — CardNET itself, asked with the session key kept on the order;
 *   VERIFONE — 2Checkout's signature over the return;
 *   STRIPE   — Stripe itself, asked about the Checkout Session;
 *   PAYPAL   — the capture, which the server makes here.
 */

import { readPaymentSecrets, stripeApiBase, PaymentEnv, PaymentSecrets } from './paymentConfig';
import { readCardnetResult, verifyAzulReturn, verifyVerifoneReturn, PaymentOrder } from './bankGateways';
import { capturePayPalOrder } from './paypal';
import { reasonFromIso } from './paymentOutcome';

/**
 * A processor's result, wherever it put it: the query string (AZUL's
 * redirect, 2Checkout's, PayPal's `token`) or a posted form (a bank that
 * POSTs the guest back). Both are read, the query string winning.
 */
export const readReturnParams = async (request: Request): Promise<URLSearchParams> => {
  const params = new URLSearchParams();
  if (request.method === 'POST') {
    const type = request.headers.get('Content-Type') ?? '';
    try {
      if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
        const form = await request.formData();
        form.forEach((value, name) => {
          if (typeof value === 'string') params.set(name, value);
        });
      } else if (type.includes('application/json')) {
        const body = (await request.json()) as Record<string, unknown>;
        for (const [name, value] of Object.entries(body ?? {})) {
          if (value !== null && value !== undefined && typeof value !== 'object') params.set(name, String(value));
        }
      }
    } catch {
      /* an unreadable body leaves only the query string */
    }
  }
  new URL(request.url).searchParams.forEach((value, name) => params.set(name, value));
  return params;
};

/** What Stripe says about one Checkout Session. */
export const readStripeSession = async (
  env: PaymentEnv,
  secrets: PaymentSecrets,
  sessionId: string
): Promise<{ known: boolean; session?: any }> => {
  if (!secrets.stripeSecretKey || !/^cs_[A-Za-z0-9_]{10,120}$/.test(sessionId)) return { known: false };
  try {
    const response = await fetch(`${stripeApiBase(env)}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${secrets.stripeSecretKey}` },
    });
    const session: any = await response.json().catch(() => null);
    if (!response.ok || !session) return { known: false };
    return { known: true, session };
  } catch (error) {
    console.warn('[paymentSettle] Stripe lookup failed', error);
    return { known: false };
  }
};

const settleStripe = async (env: PaymentEnv, secrets: PaymentSecrets, order: PaymentOrder, sessionId: string) => {
  const id = order.session || sessionId;
  const { known, session } = await readStripeSession(env, secrets, id);
  if (!known) return;
  // The session must be the one opened for this order, whatever the URL said.
  if (session.client_reference_id && session.client_reference_id !== order.id) return;
  order.session = session.id;
  order.reference = typeof session.payment_intent === 'string' ? session.payment_intent : order.reference;
  if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
    order.status = 'paid';
    order.reason = 'approved';
    if (typeof session.amount_total === 'number') order.amount = session.amount_total / 100;
  } else if (session.status === 'expired') {
    order.status = 'cancelled';
    order.reason = 'cancelled';
  } else if (session.status === 'complete') {
    // Completed but not yet paid: a delayed method. Stripe will settle it;
    // the operator sees it in the dashboard.
    order.status = 'unverified';
  }
  order.code = String(session.payment_status ?? '');
};

/**
 * Settle an order from the guest's return. `outcome` is the last segment of
 * the return address. Mutates the order; the caller stores it.
 */
export const settleReturn = async (
  env: PaymentEnv,
  order: PaymentOrder,
  outcome: string,
  params: URLSearchParams
): Promise<void> => {
  const secrets = await readPaymentSecrets(env);

  if (order.provider === 'azul') {
    if (outcome === 'cancelled') {
      order.status = 'cancelled';
      order.reason = 'cancelled';
      return;
    }
    const { authentic, approved } = await verifyAzulReturn(params, order, secrets.azulAuthKey);
    const iso = params.get('IsoCode') ?? '';
    // AZUL answers "Error" (not "ISO8583") when the failure was its own or the
    // request's, rather than the issuing bank's.
    const systemError = (params.get('ResponseCode') ?? '').toLowerCase() === 'error';
    order.code = iso || params.get('ResponseCode') || undefined;
    order.authorizationCode = params.get('AuthorizationCode') || undefined;
    order.reference = params.get('RRN') || undefined;
    order.message = (params.get('ResponseMessage') || params.get('ErrorDescription') || '').slice(0, 120) || undefined;
    if (approved) {
      order.status = 'paid';
      order.reason = 'approved';
    } else if (authentic || outcome === 'declined') {
      // A decline that does not verify is still no payment: nobody gains by
      // forging one, and the guest is better told than left waiting.
      order.status = systemError ? 'error' : 'declined';
      order.reason = systemError ? 'error' : reasonFromIso(iso);
      if (order.reason === 'approved') order.reason = 'declined';
    } else {
      order.status = 'unverified';
    }
    return;
  }

  if (order.provider === 'cardnet') {
    // CardNET uses its cancel address for declines as well, so the session is
    // asked either way; the path only decides what to assume when it cannot be.
    const result = await readCardnetResult(env, order, secrets);
    if (result.known) {
      order.code = result.code;
      order.authorizationCode = result.authorizationCode;
      order.reference = result.reference;
      order.message = result.code ? `ResponseCode ${result.code}` : undefined;
      if (result.approved) {
        order.status = 'paid';
        order.reason = 'approved';
      } else {
        order.status = 'declined';
        order.reason = reasonFromIso(result.code);
        if (order.reason === 'approved') order.reason = 'declined';
      }
    } else if (outcome === 'cancelled') {
      order.status = 'cancelled';
      order.reason = 'cancelled';
    } else {
      order.status = 'unverified';
    }
    return;
  }

  if (order.provider === 'verifone') {
    // 2Checkout only redirects here once an order has been placed. A
    // signature that checks out, for this order and this price, is a payment;
    // one that does not is left for the operator to confirm in 2Checkout's
    // panel — never called paid on the strength of the query string alone.
    const { authentic, sameOrder, reference } = await verifyVerifoneReturn(params, order, secrets.verifoneSecretWord);
    order.status = authentic && sameOrder ? 'paid' : 'unverified';
    order.reason = order.status === 'paid' ? 'approved' : undefined;
    order.reference = reference || undefined;
    order.message = authentic ? undefined : 'Confirm this order in the 2Checkout control panel.';
    return;
  }

  if (order.provider === 'stripe') {
    if (outcome === 'cancelled') {
      order.status = 'cancelled';
      order.reason = 'cancelled';
      return;
    }
    await settleStripe(env, secrets, order, params.get('session_id') ?? '');
    if (order.status === 'pending') order.status = 'unverified';
    return;
  }

  if (order.provider === 'paypal') {
    if (outcome === 'cancelled') {
      order.status = 'cancelled';
      order.reason = 'cancelled';
      return;
    }
    // PayPal names its own order in `token`; anything else is not this one.
    const token = params.get('token') ?? '';
    if (token && order.session && token !== order.session) {
      order.status = 'unverified';
      return;
    }
    const verdict = await capturePayPalOrder(env, secrets, order);
    order.status = verdict.status;
    order.reason = verdict.reason;
    order.code = verdict.code;
    order.reference = verdict.reference ?? order.reference;
    if (verdict.amount !== undefined) order.amount = verdict.amount;
  }
};

/**
 * Ask once more about an order still open — a timeout on the way back, a
 * guest who closed the tab on the bank's page and reopened the site. Only the
 * processors that can be asked from the server: CardNET, Stripe and PayPal.
 * Returns true when the order changed.
 */
export const refreshOrder = async (env: PaymentEnv, order: PaymentOrder): Promise<boolean> => {
  if (order.status !== 'pending' && order.status !== 'unverified') return false;
  const before = order.status;
  const secrets = await readPaymentSecrets(env);
  if (order.provider === 'cardnet') {
    const result = await readCardnetResult(env, order, secrets);
    if (result.known) {
      order.code = result.code;
      order.authorizationCode = result.authorizationCode;
      order.reference = result.reference;
      order.status = result.approved ? 'paid' : 'declined';
      order.reason = result.approved ? 'approved' : reasonFromIso(result.code);
      if (!result.approved && order.reason === 'approved') order.reason = 'declined';
    }
  } else if (order.provider === 'stripe' && order.session) {
    await settleStripe(env, secrets, order, order.session);
  } else if (order.provider === 'paypal' && order.status === 'unverified' && order.session) {
    // Captured already, or approved and never captured because the return
    // failed half-way: capturing is idempotent per order, so ask by capturing.
    const verdict = await capturePayPalOrder(env, secrets, order);
    if (verdict.known) {
      order.status = verdict.status;
      order.reason = verdict.reason;
      order.code = verdict.code;
      order.reference = verdict.reference ?? order.reference;
    }
  }
  return order.status !== before;
};
