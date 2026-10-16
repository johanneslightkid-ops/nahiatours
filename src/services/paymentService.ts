import { getAdminPassword } from './authStore';

/**
 * Talking to the payment endpoints.
 *
 * Nothing here ever holds a Stripe key or an Azul AuthKey. Starting a payment
 * posts a booking and gets back where to send the browser — a URL for Stripe,
 * a form to post for Azul and CardNET; checking one posts nothing and gets back
 * what the gateway says happened. The keys stay on the Worker.
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

export type GatewayMode = 'test' | 'live';
export type LocalCurrency = 'USD' | 'DOP';
export type BankProvider = 'azul' | 'cardnet';

export interface PaymentConfigStatus {
  stripeSecretConfigured: boolean;
  stripeMode: 'live' | 'test' | null;
  stripeCurrency: string;
  storageAvailable: boolean;
  dopPerUsd: number;
  itbisPercent: number;
  azul: {
    ready: boolean;
    mode: GatewayMode;
    merchantId: string;
    merchantName: string;
    merchantType: string;
    currencyCode: string;
    currency: LocalCurrency;
    authKeyConfigured: boolean;
  };
  cardnet: {
    ready: boolean;
    mode: GatewayMode;
    merchantNumber: string;
    terminal: string;
    merchantType: string;
    merchantName: string;
    acquirer: string;
    currency: LocalCurrency;
  };
}

/** Everything the admin panel may send. Omitted fields stay as stored. */
export interface PaymentConfigPatch {
  stripeSecretKey?: string;
  stripeCurrency?: string;
  dopPerUsd?: number;
  itbisPercent?: number;
  azulMode?: GatewayMode;
  azulMerchantId?: string;
  azulMerchantName?: string;
  azulMerchantType?: string;
  azulCurrencyCode?: string;
  azulCurrency?: LocalCurrency;
  azulAuthKey?: string;
  cardnetMode?: GatewayMode;
  cardnetMerchantNumber?: string;
  cardnetTerminal?: string;
  cardnetMerchantType?: string;
  cardnetMerchantName?: string;
  cardnetAcquirer?: string;
  cardnetCurrency?: LocalCurrency;
}

/** What the storefront may know: which gateways work, and what they charge in. */
export interface PaymentsReady {
  stripe: boolean;
  azul: boolean;
  cardnet: boolean;
  currencies: Record<BankProvider, LocalCurrency>;
  dopPerUsd: number | null;
}

/** What /api/payment-result says became of an Azul or CardNET payment. */
export interface BankPaymentResult {
  provider: BankProvider;
  status: 'pending' | 'paid' | 'declined' | 'cancelled' | 'unverified';
  paid: boolean;
  amountTotal: number;
  currency: LocalCurrency;
  usdTotal: number;
  tour: string;
  persons: number;
  date: string;
  category: string;
  priceSource: string;
  authorizationCode: string;
  reference: string;
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
export const savePaymentConfig = async (patch: PaymentConfigPatch): Promise<PaymentConfigStatus> => {
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

const NOT_READY: PaymentsReady = {
  stripe: false,
  azul: false,
  cardnet: false,
  currencies: { azul: 'DOP', cardnet: 'DOP' },
  dopPerUsd: null,
};

/**
 * Which gateways the storefront can offer. Like isStripeReady, a failure
 * answers "none", so a hiccup hides buttons rather than offering dead ones.
 */
export const getPaymentsReady = async (): Promise<PaymentsReady> => {
  try {
    const response = await fetch('/api/payments-ready', { cache: 'no-store' });
    if (!response.ok) return NOT_READY;
    const body = await response.json().catch(() => null);
    if (!body || typeof body !== 'object') return NOT_READY;
    return {
      stripe: Boolean(body.stripe),
      azul: Boolean(body.azul),
      cardnet: Boolean(body.cardnet),
      currencies: {
        azul: body.currencies?.azul === 'USD' ? 'USD' : 'DOP',
        cardnet: body.currencies?.cardnet === 'USD' ? 'USD' : 'DOP',
      },
      dopPerUsd: typeof body.dopPerUsd === 'number' && body.dopPerUsd > 0 ? body.dopPerUsd : null,
    };
  } catch {
    return NOT_READY;
  }
};

/**
 * Open an Azul or CardNET payment for a booking. The answer is a form, not a
 * URL: both banks want the BROWSER to post to their page.
 */
export const startBankCheckout = async (
  provider: BankProvider,
  booking: CheckoutBooking
): Promise<{ ref: string; action: string; fields: Record<string, string> }> => {
  const response = await fetch(`/api/${provider}-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      ...booking,
      returnPath: booking.returnPath ?? window.location.pathname,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.action || !body?.fields) {
    throw new Error(body?.error || 'Could not start the payment.');
  }
  return body;
};

/**
 * Leave for the bank's page by posting a form, the way both banks ask for.
 * Same tab, for the same reason as Stripe: this runs after an await, where a
 * new window would be blocked, and the bank brings the guest back here.
 */
export const postToGateway = (action: string, fields: Record<string, string>) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.acceptCharset = 'UTF-8';
  form.style.display = 'none';
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
};

/** Ask the server what became of an Azul or CardNET payment. */
export const getBankPaymentResult = async (ref: string): Promise<BankPaymentResult> => {
  const response = await fetch(`/api/payment-result?ref=${encodeURIComponent(ref)}`, {
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || 'Could not verify that payment.');
  }
  return body as BankPaymentResult;
};

/**
 * A bank's own payment link with the amount filled in, when the link has room
 * for one: {amount} (or {monto}), {currency} and {ref} are replaced. A link
 * without placeholders is returned as it is — the guest is then shown the
 * amount to enter on the bank's page.
 */
export const fillPaymentLink = (
  link: string,
  values: { amount: number; currency: string; reference: string }
): { url: string; carriesAmount: boolean } => {
  const trimmed = link.trim();
  const carriesAmount = /\{(amount|monto)\}/i.test(trimmed);
  const url = trimmed
    .replace(/\{(amount|monto)\}/gi, values.amount.toFixed(2))
    .replace(/\{(currency|moneda)\}/gi, encodeURIComponent(values.currency))
    .replace(/\{(ref|reference|referencia)\}/gi, encodeURIComponent(values.reference.slice(0, 60)));
  return { url, carriesAmount };
};
