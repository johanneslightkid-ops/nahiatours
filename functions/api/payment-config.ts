import { verifyAdminRequest } from '../../shared/adminAuth';
import {
  describePaymentConfig,
  writePaymentSecrets,
  PaymentEnv,
  PaymentSecrets,
} from '../../shared/paymentConfig';

/**
 * Read and write the payment credentials, from the admin panel only.
 *
 * GET reports the SHAPE of the configuration — is a key on file, is it live or
 * test, which currency — and never the key. There is no endpoint anywhere that
 * returns a Stripe secret key to a browser, which is the whole point of
 * keeping it out of the brand record.
 *
 * PUT accepts a new key. Sending an empty string clears it; omitting the field
 * leaves whatever is stored alone, so the panel can save a currency change
 * without the operator having to retype a key it never showed them.
 *
 * The Azul and CardNET settings travel the same way. Their identifiers (merchant
 * number, terminal, name) are reported back, because the banks print them on
 * their own pages anyway; the Azul AuthKey is write-only, like the Stripe key.
 */

/** Plain-text settings, with how long each may be. Validated as text only. */
const TEXT_FIELDS: Partial<Record<keyof PaymentSecrets, number>> = {
  azulMerchantId: 40,
  azulMerchantName: 60,
  azulMerchantType: 40,
  azulCurrencyCode: 8,
  azulAuthKey: 400,
  cardnetMerchantNumber: 15,
  cardnetTerminal: 12,
  cardnetMerchantType: 4,
  cardnetMerchantName: 40,
  cardnetAcquirer: 3,
  verifoneMerchantCode: 40,
  verifoneSecretWord: 400,
};
export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  const auth = await verifyAdminRequest(env as any, request);
  if (!auth.ok) {
    return json({ error: auth.error }, auth.status);
  }

  if (request.method === 'GET') {
    return json(await describePaymentConfig(env));
  }

  if (request.method === 'PUT') {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ error: 'Cuerpo de la petición inválido.' }, 400);
    }

    const patch: Partial<PaymentSecrets> = {};

    if (typeof body.stripeSecretKey === 'string') {
      const key = body.stripeSecretKey.trim();
      // Catch the commonest mistake — pasting the publishable key — before it
      // turns into a Stripe 401 the operator has to go and decode.
      if (key && !/^sk_(live|test)_/.test(key) && !/^rk_(live|test)_/.test(key)) {
        return json(
          {
            error:
              'Esa no parece una clave secreta de Stripe. Debe empezar por sk_live_ o sk_test_ ' +
              '(la que empieza por pk_ es la publicable y no sirve aquí).',
          },
          400
        );
      }
      patch.stripeSecretKey = key;
    }

    if (typeof body.stripeCurrency === 'string') {
      const currency = body.stripeCurrency.trim();
      if (currency && !/^[a-zA-Z]{3}$/.test(currency)) {
        return json({ error: 'La moneda debe ser un código de tres letras, por ejemplo USD.' }, 400);
      }
      patch.stripeCurrency = currency;
    }

    for (const [field, max] of Object.entries(TEXT_FIELDS) as [keyof PaymentSecrets, number][]) {
      const value = body[field];
      if (typeof value === 'string') {
        (patch as Record<string, unknown>)[field] = value.trim().slice(0, max);
      }
    }

    if (typeof body.cardnetMerchantType === 'string' && body.cardnetMerchantType.trim() &&
        !/^\d{4}$/.test(body.cardnetMerchantType.trim())) {
      return json({ error: 'La categoría de comercio (MCC) de CardNET son cuatro dígitos, por ejemplo 4722.' }, 400);
    }

    if (['auto', 'stripe', 'azul', 'cardnet', 'verifone'].includes(String(body.cardProcessor))) {
      patch.cardProcessor = body.cardProcessor as PaymentSecrets['cardProcessor'];
    }

    for (const field of ['azulMode', 'cardnetMode', 'verifoneMode'] as const) {
      if (body[field] === 'test' || body[field] === 'live') patch[field] = body[field] as 'test' | 'live';
    }
    for (const field of ['azulCurrency', 'cardnetCurrency', 'verifoneCurrency'] as const) {
      if (body[field] === 'USD' || body[field] === 'DOP') patch[field] = body[field] as 'USD' | 'DOP';
    }

    for (const field of ['dopPerUsd', 'itbisPercent'] as const) {
      if (body[field] === undefined) continue;
      const value = Number(body[field]);
      const max = field === 'dopPerUsd' ? 10_000 : 30;
      if (!Number.isFinite(value) || value < 0 || value > max) {
        return json(
          {
            error:
              field === 'dopPerUsd'
                ? 'La tasa debe ser un número de pesos por dólar, por ejemplo 60.50.'
                : 'El ITBIS debe ser un porcentaje entre 0 y 30.',
          },
          400
        );
      }
      patch[field] = value;
    }

    const result = await writePaymentSecrets(env, patch);
    if (!result.ok) {
      return json({ error: result.error }, result.status);
    }

    return json(await describePaymentConfig(env));
  }

  return json({ error: 'Method not allowed' }, 405);
}
