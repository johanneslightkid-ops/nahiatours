import { readPaymentSecrets, isAzulConfigured, isCardnetConfigured, PaymentEnv } from '../../shared/paymentConfig';

/**
 * Which card gateways can take a payment right now.
 *
 * The storefront draws a button per gateway, and must not ask the admin-only
 * /api/payment-config to decide. So this answers with booleans — and whether
 * a gateway is in test mode, so a test checkout can say so — and nothing that
 * identifies the merchant behind it.
 */
export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secrets = await readPaymentSecrets(env);
  const azul = isAzulConfigured(secrets.azul);
  const cardnet = isCardnetConfigured(secrets.cardnet);

  return new Response(
    JSON.stringify({
      stripe: secrets.stripeSecretKey.length > 0,
      azul,
      cardnet,
      azulTest: azul && secrets.azul.environment === 'test',
      cardnetTest: cardnet && secrets.cardnet.environment === 'test',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Short and private, like /api/stripe-ready: a saved key should show
        // its button within a minute, not an hour.
        'Cache-Control': 'private, max-age=30',
      },
    }
  );
}
