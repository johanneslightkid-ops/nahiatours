import { getAdminPassword } from './authStore';

/**
 * Talking to the payment endpoints.
 *
 * Nothing here ever holds a Stripe key. Starting a payment posts a booking and
 * gets back a URL to send the browser to; checking one posts nothing and gets
 * back what Stripe says happened. The key stays on the Worker.
 */

export interface CheckoutBooking {
  /** 'tours' | 'transport' — decides which catalogue the server prices from. */
  category: string;
  /** Positional catalogue id, used as a fallback match after the title. */
  serviceId?: number | string;
  title: string;
  persons: number;
  /** Free text, shown on the Stripe page and kept on the payment. */
  date?: string;
  /** Only used if the server cannot find the item in the catalogue. */
  amount?: number;
  locale?: string;
  /** Path on this site to come back to. Defaults to wherever we are now. */
  returnPath?: string;
}

/** What Stripe says happened, as reported by /api/stripe-session. */
export interface CheckoutResult {
  paid: boolean;
  amountTotal: number | null;
  currency: string | null;
  tour: string;
  persons: number | null;
  date: string;
  category: string;
  priceSource: string;
}

export interface PaymentConfigStatus {
  stripeSecretConfigured: boolean;
  stripeMode: 'live' | 'test' | null;
  stripeCurrency: string;
  storageAvailable: boolean;
}

/**
 * Mint a Checkout Session and return the URL to send the guest to.
 *
 * Throws with the server's message, which is written for a guest to read.
 */
export const createStripeCheckout = async (booking: CheckoutBooking): Promise<string> => {
  const response = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      ...booking,
      returnPath: booking.returnPath ?? window.location.pathname,
    }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.url) {
    throw new Error(body?.error || 'Could not start the card payment.');
  }

  return body.url as string;
};

/** Ask the server what became of a session. Never trusts the query string. */
export const getCheckoutResult = async (sessionId: string): Promise<CheckoutResult> => {
  const response = await fetch(`/api/stripe-session?session_id=${encodeURIComponent(sessionId)}`, {
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Could not verify that payment.');
  }
  return body as CheckoutResult;
};

/** Admin only. Reports the shape of the configuration, never the key. */
export const getPaymentConfigStatus = async (): Promise<PaymentConfigStatus> => {
  const password = getAdminPassword();
  const response = await fetch('/api/payment-config', {
    headers: password ? { 'X-Admin-Password': password } : undefined,
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'No se pudo leer la configuración de pagos.');
  }
  return body as PaymentConfigStatus;
};

/**
 * Admin only. Omit a field to leave it as stored — which is how the currency
 * can be changed without retyping a key the panel never displayed.
 */
export const savePaymentConfig = async (patch: {
  stripeSecretKey?: string;
  stripeCurrency?: string;
}): Promise<PaymentConfigStatus> => {
  const password = getAdminPassword();
  if (!password) {
    throw new Error('Tu sesión expiró. Vuelve a entrar al panel e inténtalo otra vez.');
  }

  const response = await fetch('/api/payment-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
    cache: 'no-store',
    body: JSON.stringify(patch),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'No se pudo guardar la configuración de pagos.');
  }
  return body as PaymentConfigStatus;
};

/**
 * Does the storefront have a working card option?
 *
 * Public, unauthenticated, and deliberately a single boolean: the guest's page
 * needs to know whether to draw a card button, and nothing more. A failure
 * answers false, so a hiccup hides the button rather than offering a dead one.
 */
export const isStripeReady = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/stripe-ready', { cache: 'no-store' });
    if (!response.ok) return false;
    const body = await response.json().catch(() => null);
    return Boolean(body?.ready);
  } catch {
    return false;
  }
};
