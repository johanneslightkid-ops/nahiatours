import { verifyAdminRequest } from '../../shared/adminAuth';
import { describePaymentConfig, writePaymentSecrets, PaymentEnv } from '../../shared/paymentConfig';

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
 */
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
    let body: { stripeSecretKey?: unknown; stripeCurrency?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: 'Cuerpo de la petición inválido.' }, 400);
    }

    const patch: { stripeSecretKey?: string; stripeCurrency?: string } = {};

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

    const result = await writePaymentSecrets(env, patch);
    if (!result.ok) {
      return json({ error: result.error }, result.status);
    }

    return json(await describePaymentConfig(env));
  }

  return json({ error: 'Method not allowed' }, 405);
}
