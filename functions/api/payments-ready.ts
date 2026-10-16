import { readPaymentSecrets, isAzulReady, isCardnetReady, PaymentEnv } from '../../shared/paymentConfig';

/**
 * Which gateways can take money right now — the storefront's question.
 *
 * Like /api/stripe-ready, which it extends, this answers with facts about the
 * page and nothing about the accounts behind it: a boolean per gateway, the
 * currency each one charges in, and the peso rate so the page can show a guest
 * what their dollars come to before they leave for the bank.
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

  return new Response(
    JSON.stringify({
      stripe: secrets.stripeSecretKey.length > 0,
      azul: isAzulReady(secrets),
      cardnet: isCardnetReady(secrets),
      currencies: { azul: secrets.azulCurrency, cardnet: secrets.cardnetCurrency },
      dopPerUsd: secrets.dopPerUsd || null,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Short and private, for the same reason as /api/stripe-ready.
        'Cache-Control': 'private, max-age=30',
      },
    }
  );
}
