import { readPaymentSecrets, resolveCardProcessor, cardChargeCurrency, PaymentEnv } from '../../shared/paymentConfig';

/**
 * Can the storefront take a card, and in what currency — the guest's page's
 * only question about payments.
 *
 * Like /api/stripe-ready, which it extends, this says nothing about the
 * accounts behind it — not even which processor is configured, because the
 * guest pays by card and the processor is the operator's business. The
 * currency and peso rate are there so the page can show what the dollars come
 * to before the guest leaves for the payment page.
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
  const processor = resolveCardProcessor(secrets);
  const currency = cardChargeCurrency(secrets, processor);

  return new Response(
    JSON.stringify({
      card: processor !== null,
      currency,
      dopPerUsd: currency === 'DOP' && secrets.dopPerUsd > 0 ? secrets.dopPerUsd : null,
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
