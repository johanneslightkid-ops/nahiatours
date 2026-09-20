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

export interface PaymentSecrets {
  /** `sk_live_…` or `sk_test_…`. Never leaves the server. */
  stripeSecretKey: string;
  /** ISO 4217, lower case, as Stripe wants it. */
  stripeCurrency: string;
}

/** What the admin panel is allowed to know about the above. */
export interface PaymentConfigStatus {
  stripeSecretConfigured: boolean;
  /** 'live' | 'test' | null — derived from the key prefix, not from the key. */
  stripeMode: 'live' | 'test' | null;
  stripeCurrency: string;
  /** False when no KV is bound: nothing can be saved and the panel should say so. */
  storageAvailable: boolean;
}

const DEFAULTS: PaymentSecrets = {
  stripeSecretKey: '',
  stripeCurrency: 'usd',
};

interface KVLike {
  get(key: string, options?: { type: 'json' }): Promise<any>;
  put(key: string, value: string): Promise<void>;
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
  [key: string]: unknown;
}

/** Stripe, unless a deployment has deliberately been pointed elsewhere. */
export const stripeApiBase = (env: PaymentEnv): string => {
  const override = typeof env.STRIPE_API_BASE === 'string' ? env.STRIPE_API_BASE.trim() : '';
  return (override || 'https://api.stripe.com').replace(/\/+$/, '');
};

/** Same binding order as functions/api/data.ts. */
const kvOf = (env: PaymentEnv): KVLike | null => (env.DATA_KV_F ?? env.DATA_KV) ?? null;

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

export const describePaymentConfig = async (env: PaymentEnv): Promise<PaymentConfigStatus> => {
  const secrets = await readPaymentSecrets(env);
  const key = secrets.stripeSecretKey;
  return {
    stripeSecretConfigured: key.length > 0,
    stripeMode: key.startsWith('sk_live') ? 'live' : key.startsWith('sk_test') ? 'test' : null,
    stripeCurrency: secrets.stripeCurrency,
    storageAvailable: kvOf(env) !== null,
  };
};
