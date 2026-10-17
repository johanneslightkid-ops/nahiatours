import { readPaymentSecrets, isAzulConfigured, isCardnetConfigured, kvOf, PaymentEnv } from '../../shared/paymentConfig';
import { priceBooking, BookingRequest } from '../../shared/catalogPricing';
import { newOrderId, saveOrder, PaymentOrder, DominicanGateway } from '../../shared/paymentOrders';
import {
  azulAmount,
  azulCurrencyLabel,
  azulPageUrl,
  azulRequestHash,
  cardnetBase,
  cardnetCurrencyLabel,
  createCardnetSession,
  itbisMinor,
  plainText,
  toChargeMinor,
} from '../../shared/dominicanGateways';

/**
 * Start a card payment through AZUL or CardNet.
 *
 *   POST /api/dr-checkout   { gateway: 'azul' | 'cardnet', ...booking }
 *   →   { action, fields, order, amount, currency }
 *
 * The browser then builds a form from `action` and `fields` and submits it —
 * both gateways require the GUEST's browser to arrive at their page with a
 * POST, so the server cannot simply hand back a link the way Stripe does.
 *
 * The price is decided here (shared/catalogPricing.ts), converted to the
 * merchant's currency at the rate the operator set, signed (AZUL) or bound to
 * a session (CardNet), and written to an order record before the guest
 * leaves, so the return trip has something trustworthy to compare against.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequest(context: { request: Request; env: PaymentEnv }) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: BookingRequest & { gateway?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const gateway = body.gateway === 'azul' || body.gateway === 'cardnet' ? (body.gateway as DominicanGateway) : null;
  if (!gateway) {
    return json({ error: 'Unknown payment method.' }, 400);
  }

  const secrets = await readPaymentSecrets(env);
  const configured = gateway === 'azul' ? isAzulConfigured(secrets.azul) : isCardnetConfigured(secrets.cardnet);
  if (!configured) {
    return json(
      { error: 'This card payment option is not available right now. Please use WhatsApp.', code: 'not_configured' },
      503
    );
  }
  // The return trip is checked against a stored order. Without storage there
  // is nothing to check against, so do not take the guest's money blind.
  if (!kvOf(env)) {
    return json({ error: 'Card payments are unavailable on this site right now.', code: 'no_storage' }, 503);
  }

  const priced = await priceBooking(env, body);
  if (!priced.ok) {
    return json({ error: priced.error }, 400);
  }
  const booking = priced.booking;

  const settings = gateway === 'azul' ? secrets.azul : secrets.cardnet;
  const chargeMinor = toChargeMinor(booking.total, settings.exchangeRate);
  const taxMinor = itbisMinor(chargeMinor, settings.itbisRate);
  const currency = gateway === 'azul' ? azulCurrencyLabel(secrets.azul.currencyCode) : cardnetCurrencyLabel(secrets.cardnet.currencyCode);

  const id = newOrderId();
  const origin = new URL(request.url).origin;
  const back = (outcome: string) => `${origin}/api/dr-return/${gateway}/${outcome}/${id}`;
  const now = new Date().toISOString();

  const order: PaymentOrder = {
    id,
    gateway,
    status: 'pending',
    environment: settings.environment,
    createdAt: now,
    updatedAt: now,
    title: booking.title,
    persons: booking.persons,
    date: booking.date,
    category: booking.category,
    locale: booking.locale,
    returnPath: booking.returnPath,
    priceSource: booking.priceSource,
    total: booking.total,
    chargeMinor,
    chargeCurrency: currency,
  };

  const summary = { order: id, amount: chargeMinor / 100, currency, totalUsd: booking.total };

  if (gateway === 'azul') {
    const azul = secrets.azul;
    const fields: Record<string, string> = {
      MerchantId: azul.merchantId,
      MerchantName: azul.merchantName,
      MerchantType: azul.merchantType,
      CurrencyCode: azul.currencyCode,
      OrderNumber: id,
      Amount: azulAmount(chargeMinor),
      ITBIS: azulAmount(taxMinor),
      ApprovedUrl: back('approved'),
      DeclinedUrl: back('declined'),
      CancelUrl: back('cancel'),
      UseCustomField1: '1',
      CustomField1Label: booking.locale === 'es' ? 'Excursion' : 'Tour',
      CustomField1Value: plainText(booking.title),
      UseCustomField2: '1',
      CustomField2Label: booking.locale === 'es' ? 'Personas' : 'People',
      CustomField2Value: plainText(`${booking.persons}${booking.date ? ` - ${booking.date}` : ''}`),
    };
    fields.AuthHash = await azulRequestHash(fields, azul.authKey);
    // Our own receipt page follows, so AZUL's is skipped. These two are not
    // part of the signature.
    fields.ShowTransactionResult = '0';
    fields.Locale = booking.locale === 'es' ? 'ES' : 'EN';

    if (!(await saveOrder(env, order))) {
      return json({ error: 'Could not start the payment. Please try again.' }, 500);
    }
    return json({ ...summary, action: azulPageUrl(azul), fields });
  }

  const cardnet = secrets.cardnet;
  const base = cardnetBase(cardnet);
  const transactionId = id.slice(-6);
  const opened = await createCardnetSession(base, {
    TransactionType: '0200',
    CurrencyCode: cardnet.currencyCode,
    AcquiringInstitutionCode: cardnet.acquiringInstitutionCode,
    MerchantType: cardnet.merchantType,
    MerchantNumber: cardnet.merchantNumber,
    MerchantTerminal: cardnet.merchantTerminal,
    ReturnUrl: back('return'),
    CancelUrl: back('cancel'),
    PageLanguaje: booking.locale === 'es' ? 'ESP' : 'ENG',
    OrdenId: id,
    TransactionId: transactionId,
    Tax: azulAmount(taxMinor),
    MerchantName: plainText(cardnet.merchantName, 40),
    AVS: '',
    Amount: String(chargeMinor),
  });

  if ('error' in opened) {
    return json({ error: `${opened.error} Please try again or use WhatsApp.` }, 502);
  }

  order.cardnet = { session: opened.session, sessionKey: opened.sessionKey, transactionId };
  if (!(await saveOrder(env, order))) {
    return json({ error: 'Could not start the payment. Please try again.' }, 500);
  }
  return json({ ...summary, action: `${base}/authorize`, fields: { SESSION: opened.session } });
}
