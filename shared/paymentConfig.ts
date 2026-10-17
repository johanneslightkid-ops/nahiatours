/**
 * Where the Stripe secret key lives — and, just as importantly, where it does not.
 *
 * The fork this was ported from (kinglobstertours) kept `stripeSecretKey` in the
 * BRAND record. That record is what `GET /api/data?resource=brand` returns:
 * unauthenticated, `Cache-Control: public`. So on that deployment the Stripe
 * secret key — the one that can charge and refund — was readable by anyone who
 * opened the URL, and so was the admin password sitting next to it.
 *
 * Here the secret lives under its own KV key, `payment-secrets`, and three
 * things keep it there:
 *
 *   1. `/api/data` refuses that resource outright (PROTECTED_RESOURCES below),
 *      so the generic reader cannot be talked into serving it.
 *   2. `/api/payment-config` is admin-only and WRITE-ONLY for the key: it
 *      reports whether a key is configured and which mode it is in, never the
 *      key itself. Nothing sends it back to a browser, including the admin's.
 *   3. Only the checkout endpoint reads it, server-side, to sign one call to
 *      Stripe.
 *
 * The publishable key is not stored at all. A redirect-to-Checkout flow never
 * needs one — it was carried in the fork because Stripe.js would have needed
 * it, and Stripe.js is not used here.
 */

export const PAYMENT_SECRETS_KEY = 'payment-secrets';

/**
 * Resources the generic data endpoint must never read or write, whatever it is
 * asked for. Everything in here holds a credential.
 */
export const PROTECTED_RESOURCES = new Set([PAYMENT_SECRETS_KEY, 'admin-password']);

/**
 * Key prefixes the generic data endpoint must never touch either. Card
 * payments through the Dominican gateways keep a short-lived order record
 * under `payment-order:<id>` (shared/paymentOrders.ts) — not a credential,
 * but a guest's booking, and not something to serve to anyone who guesses an
 * id at /api/data.
 */
export const PROTECTED_PREFIXES = ['payment-order:'];

export const isProtectedResource = (resource: string): boolean => {
  const key = resource.trim().toLowerCase();
  return PROTECTED_RESOURCES.has(key) || PROTECTED_PREFIXES.some((prefix) => key.startsWith(prefix));
};

export type GatewayEnvironment = 'test' | 'production';

/**
 * AZUL — Banco Popular Dominicano's acquirer — through its hosted "Página de
 * Pagos". The guest's browser posts a signed form to AZUL, pays there, and
 * comes back with a signed result. See shared/dominicanGateways.ts.
 */
export interface AzulSettings {
  /** MerchantId, issued at affiliation. Different in test and production. */
  merchantId: string;
  /** Shown on AZUL's page. Part of the signature, so it must match exactly. */
  merchantName: string;
  /** Informational, but signed. AZUL's own example uses "ECommerce". */
  merchantType: string;
  /**
   * CurrencyCode as AZUL gives it with the credentials — "$" for a peso
   * merchant id. Each merchant id transacts in one currency only.
   */
  currencyCode: string;
  /** The HMAC key. WRITE-ONLY: no endpoint ever returns it. */
  authKey: string;
  environment: GatewayEnvironment;
  /**
   * How many units of the merchant's currency one unit of the catalogue's
   * price is worth. The catalogue is priced in US dollars; a peso merchant id
   * needs the day's rate here (e.g. 60.5). 1 for a dollar merchant id.
   */
  exchangeRate: number;
  /** Share of the total that is ITBIS, e.g. 0.18. 0 sends "000" (exempt). */
  itbisRate: number;
  /** Optional override of the hosted page URL, as given by AZUL. */
  paymentPageUrl: string;
}

/**
 * CardNet — the processor behind BHD, Banreservas and most other Dominican
 * banks' merchants — through its "Botón de Pago" with hosted screen: the
 * server opens a session, the browser posts that session to CardNet, the
 * guest pays there, and the server asks CardNet what happened.
 */
export interface CardnetSettings {
  /** MerchantNumber (afiliado), up to 15 digits. */
  merchantNumber: string;
  /** MerchantTerminal, up to 12 digits. */
  merchantTerminal: string;
  merchantName: string;
  /** MCC. 7997 is what CardNet's own examples use; travel agencies are usually 4722. */
  merchantType: string;
  acquiringInstitutionCode: string;
  /** ISO 4217 numeric: 214 pesos, 840 dollars. */
  currencyCode: string;
  environment: GatewayEnvironment;
  exchangeRate: number;
  itbisRate: number;
  /** Optional override of the API host, as given by CardNet. */
  apiBase: string;
}

export interface PaymentSecrets {
  /** `sk_live_…` or `sk_test_…`. Never leaves the server. */
  stripeSecretKey: string;
  /** ISO 4217, lower case, as Stripe wants it. */
  stripeCurrency: string;
  azul: AzulSettings;
  cardnet: CardnetSettings;
}

export interface GatewayStatus {
  configured: boolean;
  environment: GatewayEnvironment;
  merchantName: string;
  /** Last four characters of the merchant id/number — enough to recognise it. */
  merchantHint: string;
  currencyCode: string;
  exchangeRate: number;
  itbisRate: number;
  merchantType: string;
  /** The URL override, if any. Not a secret. */
  endpointOverride: string;
}

/** What the admin panel is allowed to know about the above. */
export interface PaymentConfigStatus {
  stripeSecretConfigured: boolean;
  /** 'live' | 'test' | null — derived from the key prefix, not from the key. */
  stripeMode: 'live' | 'test' | null;
  stripeCurrency: string;
  /** False when no KV is bound: nothing can be saved and the panel should say so. */
  storageAvailable: boolean;
  azul: GatewayStatus & { authKeyConfigured: boolean };
  cardnet: GatewayStatus & { terminalHint: string; acquiringInstitutionCode: string };
}

const AZUL_DEFAULTS: AzulSettings = {
  merchantId: '',
  merchantName: '',
  merchantType: 'ECommerce',
  currencyCode: '$',
  authKey: '',
  environment: 'test',
  exchangeRate: 1,
  itbisRate: 0,
  paymentPageUrl: '',
};

const CARDNET_DEFAULTS: CardnetSettings = {
  merchantNumber: '',
  merchantTerminal: '',
  merchantName: '',
  merchantType: '7997',
  acquiringInstitutionCode: '349',
  currencyCode: '214',
  environment: 'test',
  exchangeRate: 1,
  itbisRate: 0,
  apiBase: '',
};

const DEFAULTS: PaymentSecrets = {
  stripeSecretKey: '',
  stripeCurrency: 'usd',
  azul: AZUL_DEFAULTS,
  cardnet: CARDNET_DEFAULTS,
};

export interface KVLike {
  get(key: string, options?: { type: 'json' }): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface PaymentEnv {
  DATA_KV_F?: KVLike;
  DATA_KV?: KVLike;
  /** Escape hatch: a key set with `wrangler secret put` wins over KV. */
  STRIPE_SECRET_KEY?: string;
  /**
   * Where Stripe's API lives. Overridable so the payment flow can be exercised
   * end to end against a stub — including in environments whose egress policy
   * will not let api.stripe.com be reached at all. Unset in production, and it
   * has to stay that way: pointing this somewhere else hands the secret key to
   * whatever is on the other end.
   */
  STRIPE_API_BASE?: string;
  /** Escape hatch: AZUL's AuthKey set with `wrangler secret put` wins over KV. */
  AZUL_AUTH_KEY?: string;
  [key: string]: unknown;
}

/** Stripe, unless a deployment has deliberately been pointed elsewhere. */
export const stripeApiBase = (env: PaymentEnv): string => {
  const override = typeof env.STRIPE_API_BASE === 'string' ? env.STRIPE_API_BASE.trim() : '';
  return (override || 'https://api.stripe.com').replace(/\/+$/, '');
};

/** Same binding order as functions/api/data.ts. */
export const kvOf = (env: PaymentEnv): KVLike | null => (env.DATA_KV_F ?? env.DATA_KV) ?? null;

const str = (value: unknown, fallback: string, max = 200): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : fallback;

const num = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

const env_ = (value: unknown, fallback: GatewayEnvironment): GatewayEnvironment =>
  value === 'production' || value === 'test' ? value : fallback;

/** Only an absolute https URL is accepted as an endpoint override. */
const httpsUrl = (value: unknown): string => {
  const text = str(value, '', 300);
  return /^https:\/\/[a-z0-9.-]+(?::\d+)?(\/[^\s]*)?$/i.test(text) ? text : '';
};

const normalizeAzul = (input: unknown): AzulSettings => {
  const s = (input ?? {}) as Partial<AzulSettings>;
  return {
    merchantId: str(s.merchantId, '', 40).replace(/\s+/g, ''),
    merchantName: str(s.merchantName, '', 60),
    merchantType: str(s.merchantType, AZUL_DEFAULTS.merchantType, 40) || AZUL_DEFAULTS.merchantType,
    currencyCode: str(s.currencyCode, AZUL_DEFAULTS.currencyCode, 5) || AZUL_DEFAULTS.currencyCode,
    authKey: str(s.authKey, '', 400),
    environment: env_(s.environment, AZUL_DEFAULTS.environment),
    exchangeRate: num(s.exchangeRate, 1, 0.0001, 100000),
    itbisRate: num(s.itbisRate, 0, 0, 0.5),
    paymentPageUrl: httpsUrl(s.paymentPageUrl),
  };
};

const normalizeCardnet = (input: unknown): CardnetSettings => {
  const s = (input ?? {}) as Partial<CardnetSettings>;
  const digits = (value: unknown, fallback: string, max: number) =>
    str(value, fallback, max).replace(/\D+/g, '');
  return {
    merchantNumber: digits(s.merchantNumber, '', 15),
    merchantTerminal: digits(s.merchantTerminal, '', 12),
    merchantName: str(s.merchantName, '', 40),
    merchantType: digits(s.merchantType, CARDNET_DEFAULTS.merchantType, 4) || CARDNET_DEFAULTS.merchantType,
    acquiringInstitutionCode:
      digits(s.acquiringInstitutionCode, CARDNET_DEFAULTS.acquiringInstitutionCode, 6) ||
      CARDNET_DEFAULTS.acquiringInstitutionCode,
    currencyCode: ['214', '840'].includes(String(s.currencyCode)) ? String(s.currencyCode) : '214',
    environment: env_(s.environment, CARDNET_DEFAULTS.environment),
    exchangeRate: num(s.exchangeRate, 1, 0.0001, 100000),
    itbisRate: num(s.itbisRate, 0, 0, 0.5),
    apiBase: httpsUrl(s.apiBase).replace(/\/+$/, ''),
  };
};

const normalize = (input: unknown): PaymentSecrets => {
  const source = (input ?? {}) as Partial<PaymentSecrets>;
  const currency =
    typeof source.stripeCurrency === 'string' && /^[a-zA-Z]{3}$/.test(source.stripeCurrency.trim())
      ? source.stripeCurrency.trim().toLowerCase()
      : DEFAULTS.stripeCurrency;
  return {
    stripeSecretKey:
      typeof source.stripeSecretKey === 'string' ? source.stripeSecretKey.trim() : '',
    stripeCurrency: currency,
    azul: normalizeAzul(source.azul),
    cardnet: normalizeCardnet(source.cardnet),
  };
};

/** Everything AZUL needs to sign a request. */
export const isAzulConfigured = (azul: AzulSettings): boolean =>
  Boolean(azul.merchantId && azul.merchantName && azul.authKey && azul.currencyCode);

/** Everything CardNet needs to open a session. */
export const isCardnetConfigured = (cardnet: CardnetSettings): boolean =>
  Boolean(cardnet.merchantNumber && cardnet.merchantTerminal && cardnet.merchantName);

export const readPaymentSecrets = async (env: PaymentEnv): Promise<PaymentSecrets> => {
  const kv = kvOf(env);
  let stored: PaymentSecrets = { ...DEFAULTS };

  if (kv) {
    try {
      stored = normalize(await kv.get(PAYMENT_SECRETS_KEY, { type: 'json' }));
    } catch (error) {
      console.warn('[paymentConfig] KV read failed:', error);
    }
  }

  // A real Worker secret beats anything in KV — that is the safer place to put
  // it, and a deployment that has done so should not be overridden by whatever
  // was typed into the panel earlier.
  const fromEnv = typeof env.STRIPE_SECRET_KEY === 'string' ? env.STRIPE_SECRET_KEY.trim() : '';
  if (fromEnv) {
    stored.stripeSecretKey = fromEnv;
  }

  // Same escape hatch for AZUL's signing key: `wrangler secret put AZUL_AUTH_KEY`.
  const azulKeyFromEnv = typeof env.AZUL_AUTH_KEY === 'string' ? env.AZUL_AUTH_KEY.trim() : '';
  if (azulKeyFromEnv) {
    stored.azul = { ...stored.azul, authKey: azulKeyFromEnv };
  }

  return stored;
};

/** A patch where each gateway may itself be partial. */
export type PaymentSecretsPatch = Partial<Omit<PaymentSecrets, 'azul' | 'cardnet'>> & {
  azul?: Partial<AzulSettings>;
  cardnet?: Partial<CardnetSettings>;
};

export const writePaymentSecrets = async (
  env: PaymentEnv,
  patch: PaymentSecretsPatch
): Promise<{ ok: true } | { ok: false; status: 503 | 500; error: string }> => {
  const kv = kvOf(env);
  if (!kv) {
    return {
      ok: false,
      status: 503,
      error:
        'Esta instalación no tiene almacenamiento KV, así que no hay dónde guardar la ' +
        'configuración de pagos. Conecta un namespace KV al Worker y vuelve a intentarlo.',
    };
  }

  try {
    const current = normalize(await kv.get(PAYMENT_SECRETS_KEY, { type: 'json' }));
    // Gateways merge field by field, so saving a rate does not wipe a key.
    const next = normalize({
      ...current,
      ...patch,
      azul: { ...current.azul, ...(patch.azul ?? {}) },
      cardnet: { ...current.cardnet, ...(patch.cardnet ?? {}) },
    });
    await kv.put(PAYMENT_SECRETS_KEY, JSON.stringify(next));
    return { ok: true };
  } catch (error: any) {
    console.error('[paymentConfig] KV write failed:', error);
    return { ok: false, status: 500, error: 'No se pudo guardar la configuración de pagos.' };
  }
};

export const describePaymentConfig = async (env: PaymentEnv): Promise<PaymentConfigStatus> => {
  const secrets = await readPaymentSecrets(env);
  const key = secrets.stripeSecretKey;
  const { azul, cardnet } = secrets;
  const hint = (value: string) => (value ? `…${value.slice(-4)}` : '');
  return {
    stripeSecretConfigured: key.length > 0,
    stripeMode: key.startsWith('sk_live') ? 'live' : key.startsWith('sk_test') ? 'test' : null,
    stripeCurrency: secrets.stripeCurrency,
    storageAvailable: kvOf(env) !== null,
    azul: {
      configured: isAzulConfigured(azul),
      authKeyConfigured: azul.authKey.length > 0,
      environment: azul.environment,
      merchantName: azul.merchantName,
      merchantHint: hint(azul.merchantId),
      merchantType: azul.merchantType,
      currencyCode: azul.currencyCode,
      exchangeRate: azul.exchangeRate,
      itbisRate: azul.itbisRate,
      endpointOverride: azul.paymentPageUrl,
    },
    cardnet: {
      configured: isCardnetConfigured(cardnet),
      environment: cardnet.environment,
      merchantName: cardnet.merchantName,
      merchantHint: hint(cardnet.merchantNumber),
      terminalHint: hint(cardnet.merchantTerminal),
      merchantType: cardnet.merchantType,
      acquiringInstitutionCode: cardnet.acquiringInstitutionCode,
      currencyCode: cardnet.currencyCode,
      exchangeRate: cardnet.exchangeRate,
      itbisRate: cardnet.itbisRate,
      endpointOverride: cardnet.apiBase,
    },
  };
};
