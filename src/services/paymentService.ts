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
  /**
   * 'tours' | 'transport' — decides which catalogue the server prices from;
   * 'custom' is an agreed amount with no catalogue item behind it.
   */
  category: string;
  /** Positional catalogue id, used as a fallback match after the title. */
  serviceId?: number | string;
  title: string;
  persons: number;
  /** Free text, shown on the Stripe page and kept on the payment. */
  date?: string;
  /** Only used if the server cannot find the item in the catalogue. */
  amount?: number;
  /** Head count per rate, for a service sold at several (adults, children). */
  quantities?: Record<string, number>;
  locale?: string;
  /** Path on this site to come back to. Defaults to wherever we are now. */
  returnPath?: string;
  /** A whole cart in one payment; each item is priced by the server on its own. */
  items?: Array<Omit<CheckoutBooking, 'items' | 'locale' | 'returnPath'>>;
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
export type BankProvider = 'azul' | 'cardnet' | 'verifone';
export type CardProcessor = 'stripe' | BankProvider;
export type CardProcessorChoice = 'auto' | CardProcessor;

export interface PaymentConfigStatus {
  /** Which processor charges cards — the operator's choice, never shown to guests. */
  cardProcessor: CardProcessorChoice;
  /** Where a card payment would go right now, or null when none is configured. */
  activeCardProcessor: CardProcessor | null;
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
  /** Verifone's online checkout, 2Checkout: a signed dynamic buy-link. */
  verifone: {
    ready: boolean;
    mode: GatewayMode;
    merchantCode: string;
    currency: LocalCurrency;
    secretWordConfigured: boolean;
  };
}

/** Everything the admin panel may send. Omitted fields stay as stored. */
export interface PaymentConfigPatch {
  cardProcessor?: CardProcessorChoice;
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
  verifoneMode?: GatewayMode;
  verifoneMerchantCode?: string;
  /** Write-only. Empty string clears it. */
  verifoneSecretWord?: string;
  verifoneCurrency?: LocalCurrency;
}

/**
 * What the storefront may know: whether a card can be taken, and in what
 * currency. Not which processor — the guest pays by card, and the processor is
 * the operator's business.
 */
export interface PaymentsReady {
  card: boolean;
  /** ISO code the card is charged in, e.g. USD or DOP. */
  currency: string;
  /** Pesos per catalogue dollar, when the card is charged in pesos. */
  dopPerUsd: number | null;
}

/** Where to send the guest: a hosted page to open, or a form to post to one. */
export type CardCheckoutStart =
  | { kind: 'redirect'; url: string }
  | { kind: 'form'; action: string; fields: Record<string, string>; amount: number; currency: string };

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

const NOT_READY: PaymentsReady = { card: false, currency: 'USD', dopPerUsd: null };

/**
 * Can the storefront take a card? A failure answers "no", so a hiccup hides
 * the card button rather than offering a dead one.
 */
export const getPaymentsReady = async (): Promise<PaymentsReady> => {
  try {
    const response = await fetch('/api/payments-ready', { cache: 'no-store' });
    if (!response.ok) return NOT_READY;
    const body = await response.json().catch(() => null);
    if (!body || typeof body !== 'object') return NOT_READY;
    return {
      card: Boolean(body.card),
      currency: typeof body.currency === 'string' && body.currency ? body.currency.toUpperCase() : 'USD',
      dopPerUsd: typeof body.dopPerUsd === 'number' && body.dopPerUsd > 0 ? body.dopPerUsd : null,
    };
  } catch {
    return NOT_READY;
  }
};

/**
 * Start a card payment. The server picks the processor the operator chose and
 * answers with where to send the guest. Throws with a message written for the
 * guest.
 */
export const startCardCheckout = async (booking: CheckoutBooking): Promise<CardCheckoutStart> => {
  const response = await fetch('/api/card-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      ...booking,
      returnPath: booking.returnPath ?? window.location.pathname,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || (body?.kind !== 'redirect' && body?.kind !== 'form')) {
    throw new Error(body?.error || 'Could not open the secure payment page.');
  }
  return body as CardCheckoutStart;
};

/**
 * Leave for a payment page that wants a POST (the banks ask for exactly that).
 * Same tab: this runs after an await, where a new window would be blocked, and
 * the payment page brings the guest back here.
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

/** Ask the server what became of a payment that came back with `?payment_ref=`. */
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
 * A payment link from a processor's portal with the amount filled in, when the
 * link has room for one: {amount} (or {monto}), {currency} and {ref} are
 * replaced. A link without placeholders is returned as it is — the guest is
 * then shown the amount to enter on the payment page.
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
