/**
 * Where the payment credentials live — and, just as importantly, where they do not.
 *
 * The fork this was ported from (kinglobstertours) kept `stripeSecretKey` in the
 * BRAND record. That record is what `GET /api/data?resource=brand` returns:
 * unauthenticated, `Cache-Control: public`. So on that deployment the Stripe
 * secret key — the one that can charge and refund — was readable by anyone who
 * opened the URL, and so was the admin password sitting next to it.
 *
 * Here the secrets live under their own KV key, `payment-secrets`, and three
 * things keep them there:
 *
 *   1. `/api/data` refuses that resource outright (PROTECTED_RESOURCES below),
 *      so the generic reader cannot be talked into serving it.
 *   2. `/api/payment-config` is admin-only and WRITE-ONLY for the secrets: it
 *      reports whether a key is configured and which mode it is in, never the
 *      key itself. Nothing sends one back to a browser, including the admin's.
 *   3. Only the checkout endpoints read them, server-side, to sign one call.
 *
 * The same record now also holds the two Dominican acquirers:
 *
 *   AZUL (Banco Popular) — "Página de Pagos". The browser posts a form with the
 *   amount to Azul's hosted page; what makes it trustworthy is an HMAC-SHA512
 *   over the fields, keyed with the merchant's AuthKey. The AuthKey is the only
 *   secret and is write-only here, exactly like the Stripe key. The merchant id
 *   and name are printed on Azul's own page, so they are not secrets.
 *
 *   CARDNET — "Botón de Pago". The server opens a session with the amount and
 *   the browser is sent to CardNET's page with only the session id. There is no
 *   secret at all: the merchant number and terminal identify the account, and
 *   the session key that reads the result back is kept per order, server-side.
 *
 * The publishable Stripe key is not stored at all. A redirect-to-Checkout flow
 * never needs one.
 */

export const PAYMENT_SECRETS_KEY = 'payment-secrets';

/**
 * Resources the generic data endpoint must never read or write, whatever it is
 * asked for. Everything in here holds a credential.
 */
export const PROTECTED_RESOURCES = new Set([
  PAYMENT_SECRETS_KEY,
  'admin-password',
  // Written only through /api/wallet-config (functions/api/wallet-config.ts).
  'apple-pay-domain-association',
]);

/**
 * KV key prefixes the generic data endpoint must never name either. Pending
 * bank payments are kept under `payment-order:<id>` — they hold the CardNET
 * session key and the booking — and are read only by the payment endpoints.
 */
export const PROTECTED_PREFIXES = ['payment-order:'];

export const isProtectedResource = (key: string): boolean =>
  PROTECTED_RESOURCES.has(key) || PROTECTED_PREFIXES.some((prefix) => key.startsWith(prefix));

export type GatewayMode = 'test' | 'live';
/**
 * Which processor charges a card. The GUEST never sees this — the storefront
 * offers one "pay by card" option and the server picks the processor — so it
 * is purely the operator's choice, made in the admin. 'auto' takes the first
 * one that is configured, in CARD_PROCESSOR_ORDER.
 */
export type CardProcessor = 'stripe' | 'azul' | 'cardnet';
export type CardProcessorChoice = 'auto' | CardProcessor;
export const CARD_PROCESSOR_ORDER: CardProcessor[] = ['stripe', 'azul', 'cardnet'];
/** What a Dominican acquirer charges in. The catalogue itself is priced in USD. */
export type LocalCurrency = 'USD' | 'DOP';

export interface PaymentSecrets {
  /** Which processor charges cards. See CardProcessor. */
  cardProcessor: CardProcessorChoice;
  /** `sk_live_…` or `sk_test_…`. Never leaves the server. */
  stripeSecretKey: string;
  /** ISO 4217, lower case, as Stripe wants it. */
  stripeCurrency: string;

  /** How many pesos one catalogue dollar is charged at, for gateways set to DOP. */
  dopPerUsd: number;
  /**
   * ITBIS already included in the price, in percent (18 in the DR), or 0 for a
   * business that is exempt. Both banks want the tax share reported apart.
   */
  itbisPercent: number;

  azulMode: GatewayMode;
  azulMerchantId: string;
  /** Shown on Azul's payment page, and part of the signed fields. */
  azulMerchantName: string;
  /** Informational for Azul; also signed. Azul's own examples use "ECommerce". */
  azulMerchantType: string;
  /** The literal Azul hands over with the credentials — "$" in their examples. */
  azulCurrencyCode: string;
  azulCurrency: LocalCurrency;
  /** The HMAC key. Never leaves the server. */
  azulAuthKey: string;

  cardnetMode: GatewayMode;
  cardnetMerchantNumber: string;
  cardnetTerminal: string;
  /** Merchant category code (MCC), four digits. */
  cardnetMerchantType: string;
  /** Up to 40 characters, upper case, as CardNET registered it. */
  cardnetMerchantName: string;
  cardnetAcquirer: string;
  cardnetCurrency: LocalCurrency;
}

/** What the admin panel is allowed to know about the above. */
export interface PaymentConfigStatus {
  cardProcessor: CardProcessorChoice;
  /** The processor a card payment would go to right now, or null when none is ready. */
  activeCardProcessor: CardProcessor | null;
  stripeSecretConfigured: boolean;
  /** 'live' | 'test' | null — derived from the key prefix, not from the key. */
  stripeMode: 'live' | 'test' | null;
  stripeCurrency: string;
  /** False when no KV is bound: nothing can be saved and the panel should say so. */
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

const DEFAULTS: PaymentSecrets = {
  cardProcessor: 'auto',
  stripeSecretKey: '',
  stripeCurrency: 'usd',
  dopPerUsd: 0,
  itbisPercent: 0,
  azulMode: 'test',
  azulMerchantId: '',
  azulMerchantName: '',
  azulMerchantType: 'ECommerce',
  azulCurrencyCode: '$',
  azulCurrency: 'DOP',
  azulAuthKey: '',
  cardnetMode: 'test',
  cardnetMerchantNumber: '',
  cardnetTerminal: '',
  cardnetMerchantType: '',
  cardnetMerchantName: '',
  cardnetAcquirer: '349',
  cardnetCurrency: 'DOP',
};

/**
 * CardNET publishes these for its certification lab, so an operator can walk a
 * whole payment through before CardNET issues the real numbers. They only work
 * against the lab host, which test mode points at.
 */
export const CARDNET_LAB_CREDENTIALS = {
  merchantNumber: '349000000',
  terminal: '58585858',
  merchantType: '7997',
  merchantName: 'COMERCIO PARA REALIZAR PRUEBAS DO',
};

export const AZUL_HOSTS: Record<GatewayMode, string> = {
  test: 'https://pruebas.azul.com.do/PaymentPage/',
  live: 'https://pagos.azul.com.do/PaymentPage/Default.aspx',
};

export const CARDNET_HOSTS: Record<GatewayMode, string> = {
  test: 'https://labservicios.cardnet.com.do',
  live: 'https://ecommerce.cardnet.com.do',
};

interface KVLike {
  get(key: string, options?: { type: 'json' }): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface PaymentEnv {
  DATA_KV_F?: KVLike;
  DATA_KV?: KVLike;
  /** Escape hatch: a key set with `wrangler secret put` wins over KV. */
  STRIPE_SECRET_KEY?: string;
  /** Same escape hatch for the Azul AuthKey. */
  AZUL_AUTH_KEY?: string;
  /**
   * Where Stripe's API lives. Overridable so the payment flow can be exercised
   * end to end against a stub — including in environments whose egress policy
   * will not let api.stripe.com be reached at all. Unset in production, and it
   * has to stay that way: pointing this somewhere else hands the secret key to
   * whatever is on the other end.
   */
  STRIPE_API_BASE?: string;
  /** Same idea for CardNET's session API. Unset in production. */
  CARDNET_API_BASE?: string;
  [key: string]: unknown;
}

/** Stripe, unless a deployment has deliberately been pointed elsewhere. */
export const stripeApiBase = (env: PaymentEnv): string => {
  const override = typeof env.STRIPE_API_BASE === 'string' ? env.STRIPE_API_BASE.trim() : '';
  return (override || 'https://api.stripe.com').replace(/\/+$/, '');
};

export const cardnetApiBase = (env: PaymentEnv, mode: GatewayMode): string => {
  const override = typeof env.CARDNET_API_BASE === 'string' ? env.CARDNET_API_BASE.trim() : '';
  return (override || CARDNET_HOSTS[mode]).replace(/\/+$/, '');
};

/** Same binding order as functions/api/data.ts. */
export const kvOf = (env: PaymentEnv): KVLike | null => (env.DATA_KV_F ?? env.DATA_KV) ?? null;

const text = (value: unknown, max = 200): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const mode = (value: unknown): GatewayMode => (value === 'live' ? 'live' : 'test');
const currency = (value: unknown, fallback: LocalCurrency): LocalCurrency =>
  value === 'USD' || value === 'DOP' ? value : fallback;

const normalize = (input: unknown): PaymentSecrets => {
  const source = (input ?? {}) as Partial<Record<keyof PaymentSecrets, unknown>>;
  const stripeCurrency =
    typeof source.stripeCurrency === 'string' && /^[a-zA-Z]{3}$/.test(source.stripeCurrency.trim())
      ? source.stripeCurrency.trim().toLowerCase()
      : DEFAULTS.stripeCurrency;
  const rate = Number(source.dopPerUsd);
  const itbis = Number(source.itbisPercent);

  const choice = source.cardProcessor;
  return {
    cardProcessor:
      choice === 'stripe' || choice === 'azul' || choice === 'cardnet' ? choice : 'auto',
    stripeSecretKey: text(source.stripeSecretKey, 400),
    stripeCurrency,
    dopPerUsd: Number.isFinite(rate) && rate > 0 && rate < 10_000 ? rate : 0,
    itbisPercent: Number.isFinite(itbis) && itbis > 0 && itbis <= 30 ? itbis : 0,

    azulMode: mode(source.azulMode),
    azulMerchantId: text(source.azulMerchantId, 40),
    azulMerchantName: text(source.azulMerchantName, 60),
    azulMerchantType: text(source.azulMerchantType, 40) || DEFAULTS.azulMerchantType,
    azulCurrencyCode: text(source.azulCurrencyCode, 8) || DEFAULTS.azulCurrencyCode,
    azulCurrency: currency(source.azulCurrency, DEFAULTS.azulCurrency),
    azulAuthKey: text(source.azulAuthKey, 400),

    cardnetMode: mode(source.cardnetMode),
    cardnetMerchantNumber: text(source.cardnetMerchantNumber, 15),
    cardnetTerminal: text(source.cardnetTerminal, 12),
    cardnetMerchantType: text(source.cardnetMerchantType, 4),
    cardnetMerchantName: text(source.cardnetMerchantName, 40).toUpperCase(),
    cardnetAcquirer: text(source.cardnetAcquirer, 3) || DEFAULTS.cardnetAcquirer,
    cardnetCurrency: currency(source.cardnetCurrency, DEFAULTS.cardnetCurrency),
  };
};

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
  const azulFromEnv = typeof env.AZUL_AUTH_KEY === 'string' ? env.AZUL_AUTH_KEY.trim() : '';
  if (azulFromEnv) {
    stored.azulAuthKey = azulFromEnv;
  }

  return stored;
};

export const writePaymentSecrets = async (
  env: PaymentEnv,
  patch: Partial<PaymentSecrets>
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
    const next = normalize({ ...current, ...patch });
    await kv.put(PAYMENT_SECRETS_KEY, JSON.stringify(next));
    return { ok: true };
  } catch (error: any) {
    console.error('[paymentConfig] KV write failed:', error);
    return { ok: false, status: 500, error: 'No se pudo guardar la configuración de pagos.' };
  }
};

/** A gateway set to pesos cannot charge anything until it has a rate. */
const currencyUsable = (value: LocalCurrency, secrets: PaymentSecrets) =>
  value === 'USD' || secrets.dopPerUsd > 0;

export const isAzulReady = (secrets: PaymentSecrets): boolean =>
  Boolean(
    secrets.azulMerchantId &&
      secrets.azulMerchantName &&
      secrets.azulAuthKey &&
      currencyUsable(secrets.azulCurrency, secrets)
  );

export const isCardnetReady = (secrets: PaymentSecrets): boolean =>
  Boolean(
    secrets.cardnetMerchantNumber &&
      secrets.cardnetTerminal &&
      secrets.cardnetMerchantType &&
      secrets.cardnetMerchantName &&
      currencyUsable(secrets.cardnetCurrency, secrets)
  );

const processorReady = (secrets: PaymentSecrets): Record<CardProcessor, boolean> => ({
  stripe: secrets.stripeSecretKey.length > 0,
  azul: isAzulReady(secrets),
  cardnet: isCardnetReady(secrets),
});

/**
 * The processor a card payment goes to: the operator's choice when it is
 * configured, otherwise the first configured one — so a half-finished switch
 * to a new bank never leaves the site unable to take cards.
 */
export const resolveCardProcessor = (secrets: PaymentSecrets): CardProcessor | null => {
  const ready = processorReady(secrets);
  const order =
    secrets.cardProcessor === 'auto'
      ? CARD_PROCESSOR_ORDER
      : [secrets.cardProcessor, ...CARD_PROCESSOR_ORDER.filter((p) => p !== secrets.cardProcessor)];
  return order.find((processor) => ready[processor]) ?? null;
};

/**
 * The wallets a processor's hosted payment page offers on a device that has
 * them: Stripe Checkout and Verifone's buy-link both show Apple Pay and Google
 * Pay above the card form. The banks' pages take cards only. Mirrored for the
 * browser in src/utils/paymentMethods.ts (WALLETS_BY_PROCESSOR).
 */
export const CARD_WALLETS: Record<CardProcessor, Array<'apple_pay' | 'google_pay'>> = {
  stripe: ['apple_pay', 'google_pay'],
  verifone: ['apple_pay', 'google_pay'],
  azul: [],
  cardnet: [],
};

/** What the chosen processor charges in, for showing a guest the amount before they leave. */
export const cardChargeCurrency = (secrets: PaymentSecrets, processor: CardProcessor | null): string => {
  if (processor === 'azul') return secrets.azulCurrency;
  if (processor === 'cardnet') return secrets.cardnetCurrency;
  return secrets.stripeCurrency.toUpperCase();
};

export const describePaymentConfig = async (env: PaymentEnv): Promise<PaymentConfigStatus> => {
  const secrets = await readPaymentSecrets(env);
  const key = secrets.stripeSecretKey;
  return {
    cardProcessor: secrets.cardProcessor,
    activeCardProcessor: resolveCardProcessor(secrets),
    stripeSecretConfigured: key.length > 0,
    stripeMode: key.startsWith('sk_live') ? 'live' : key.startsWith('sk_test') ? 'test' : null,
    stripeCurrency: secrets.stripeCurrency,
    storageAvailable: kvOf(env) !== null,
    dopPerUsd: secrets.dopPerUsd,
    itbisPercent: secrets.itbisPercent,
    azul: {
      ready: isAzulReady(secrets),
      mode: secrets.azulMode,
      merchantId: secrets.azulMerchantId,
      merchantName: secrets.azulMerchantName,
      merchantType: secrets.azulMerchantType,
      currencyCode: secrets.azulCurrencyCode,
      currency: secrets.azulCurrency,
      authKeyConfigured: secrets.azulAuthKey.length > 0,
    },
    cardnet: {
      ready: isCardnetReady(secrets),
      mode: secrets.cardnetMode,
      merchantNumber: secrets.cardnetMerchantNumber,
      terminal: secrets.cardnetTerminal,
      merchantType: secrets.cardnetMerchantType,
      merchantName: secrets.cardnetMerchantName,
      acquirer: secrets.cardnetAcquirer,
      currency: secrets.cardnetCurrency,
    },
  };
};
