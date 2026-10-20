/**
 * The two Dominican acquirers, AZUL (Banco Popular) and CARDNET.
 *
 * Both are "dynamic payment links" in the sense that matters here: the amount
 * travels with the guest to the bank's own hosted page, so a transfer quote of
 * $143.50 is charged $143.50 without anybody minting a link by hand in a bank
 * portal. Neither needs the deep integration (SOAP web services, a VPN,
 * client certificates, card data passing through this site) — the bank's page
 * takes the card.
 *
 *   AZUL — Página de Pagos. The BROWSER posts a form to Azul. The form carries
 *   an AuthHash, HMAC-SHA512 over the fields keyed with the AuthKey, which is
 *   why the form is built here: the AuthKey cannot go to a browser. Azul sends
 *   the guest back with the result in the query string and a second AuthHash
 *   over the result, which is checked here before anything is called paid.
 *   (Spec: "E-Commerce AZUL — Página de Pagos", 2023-08, "Manejo de la
 *   Autenticación".)
 *
 *   CARDNET — Botón de Pago. The SERVER opens a session with the amount; the
 *   browser is sent to CardNET with nothing but the session id; afterwards the
 *   server asks CardNET what happened to that session. (Spec: CardNET developer
 *   guide, "Integración con Pantalla (POST)".)
 *
 * Every pending payment is kept as an ORDER in KV under `payment-order:<id>`,
 * for two weeks. It holds what the guest booked, what was charged and — for
 * CardNET — the session key that reads the result back. The order id is what
 * the guest returns with, and the only thing the result endpoint accepts.
 */

import {
  AZUL_HOSTS,
  VERIFONE_CHECKOUT_URL,
  PaymentEnv,
  PaymentSecrets,
  LocalCurrency,
  kvOf,
  cardnetApiBase,
} from './paymentConfig';
import type { PricedBooking } from './bookingPrice';
import type { PaymentReason } from './paymentOutcome';

export type BankProvider = 'azul' | 'cardnet' | 'verifone';
/**
 * Every processor that hands the guest back to /api/pay-return. Stripe and
 * PayPal keep an order too, so all of them come back the same way and the
 * receipt, the decline message and "try again" work alike for each.
 */
export type OrderProvider = BankProvider | 'stripe' | 'paypal';
/** `error`: the processor failed rather than the card — nothing was charged. */
export type OrderStatus = 'pending' | 'paid' | 'declined' | 'cancelled' | 'unverified' | 'error';

export interface PaymentOrder {
  id: string;
  provider: OrderProvider;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  booking: PricedBooking;
  /** LocalCurrency for the banks; Stripe's own currency for Stripe; USD for PayPal. */
  currency: LocalCurrency | string;
  /** What the bank was asked to charge, in `currency`, e.g. 8650.25. */
  amount: number;
  /** The same in minor units, exactly as it was sent to the bank. */
  amountMinor: number;
  /** ITBIS included in `amountMinor`, in minor units. */
  itbisMinor: number;
  /** Verifone only: the price exactly as it was signed into the buy-link. */
  signedPrice?: string;
  /** CardNET's session, Stripe's Checkout Session, PayPal's order id. */
  session?: string;
  /** CardNET only: reads the session's result back. */
  sessionKey?: string;
  /** PayPal only: where the guest approves the order, to send them back to. */
  approveUrl?: string;
  /** Apple Pay or Google Pay, when the guest chose one; kept for "try again". */
  wallet?: string;
  /** What the bank reported, when it reported. */
  authorizationCode?: string;
  reference?: string;
  message?: string;
  /** The processor's own result code: ISO 8583 for the banks, an issue name for PayPal. */
  code?: string;
  /** What the code means for the guest. See shared/paymentOutcome.ts. */
  reason?: PaymentReason;
}

const ORDER_PREFIX = 'payment-order:';
const ORDER_TTL_SECONDS = 14 * 24 * 60 * 60;

/** 15 digits: unguessable enough for what it guards, and inside both banks' field limits. */
export const newOrderId = (): string => {
  const bytes = new Uint8Array(15);
  crypto.getRandomValues(bytes);
  // First digit 1-9 so no bank strips a leading zero off it.
  return Array.from(bytes, (b, i) => (i === 0 ? 1 + (b % 9) : b % 10)).join('');
};

export const isOrderId = (value: string): boolean => /^[1-9]\d{14}$/.test(value);

export const saveOrder = async (env: PaymentEnv, order: PaymentOrder): Promise<boolean> => {
  const kv = kvOf(env);
  if (!kv) return false;
  try {
    await kv.put(`${ORDER_PREFIX}${order.id}`, JSON.stringify(order), {
      expirationTtl: ORDER_TTL_SECONDS,
    });
    return true;
  } catch (error) {
    console.error('[bankGateways] could not store order', order.id, error);
    return false;
  }
};

export const readOrder = async (env: PaymentEnv, id: string): Promise<PaymentOrder | null> => {
  const kv = kvOf(env);
  if (!kv || !isOrderId(id)) return null;
  try {
    const stored = await kv.get(`${ORDER_PREFIX}${id}`, { type: 'json' });
    return stored && typeof stored === 'object' ? (stored as PaymentOrder) : null;
  } catch (error) {
    console.warn('[bankGateways] could not read order', id, error);
    return null;
  }
};

/**
 * Catalogue dollars to what the gateway charges in. A gateway set to pesos is
 * only ever "ready" when a rate is on file (see paymentConfig.ts), so the rate
 * here is always positive when it is used.
 */
export const toLocalAmount = (
  usdTotal: number,
  currency: LocalCurrency,
  secrets: PaymentSecrets
): { amount: number; amountMinor: number; itbisMinor: number } => {
  const amount =
    currency === 'DOP'
      ? Math.round(usdTotal * secrets.dopPerUsd * 100) / 100
      : Math.round(usdTotal * 100) / 100;
  const amountMinor = Math.round(amount * 100);
  const rate = secrets.itbisPercent;
  // The total already includes ITBIS; this is the share of it that is tax.
  const itbisMinor = rate > 0 ? Math.round((amountMinor * rate) / (100 + rate)) : 0;
  return { amount, amountMinor, itbisMinor };
};

/** Banks print these on their page; keep them to plain ASCII so nothing gets mangled or breaks a hash. */
export const plainText = (value: string, max: number): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["'\\<>]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** Where the bank sends the guest back to. A path, never a query string, so nobody's `?` collides with ours. */
export const returnUrl = (origin: string, provider: OrderProvider, id: string, outcome: string) =>
  `${origin}/api/pay-return/${provider}/${id}/${outcome}`;

/** The page the guest booked from, with the order id the receipt looks up. */
export const guestLanding = (order: PaymentOrder): string => {
  const path = order.booking.returnPath || '/';
  return `${path}${path.includes('?') ? '&' : '?'}payment_ref=${order.id}`;
};

// ── AZUL ────────────────────────────────────────────────────────────────────

const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');

/** Azul's "Unicode": .NET's Encoding.Unicode, i.e. UTF-16 little-endian. */
const utf16le = (value: string): Uint8Array => {
  const out = new Uint8Array(value.length * 2);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    out[i * 2] = code & 0xff;
    out[i * 2 + 1] = code >> 8;
  }
  return out;
};

export const azulHash = async (
  message: string,
  authKey: string,
  encoding: 'utf16le' | 'utf8' = 'utf16le'
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const data = encoding === 'utf16le' ? utf16le(message) : new TextEncoder().encode(message);
  return hex(await crypto.subtle.sign('HMAC', key, data));
};

/** The signed order, in Azul's field order — the hash depends on that order. */
const AZUL_SIGNED_FIELDS = [
  'MerchantId',
  'MerchantName',
  'MerchantType',
  'CurrencyCode',
  'OrderNumber',
  'Amount',
  'ITBIS',
  'ApprovedUrl',
  'DeclinedUrl',
  'CancelUrl',
  'UseCustomField1',
  'CustomField1Label',
  'CustomField1Value',
  'UseCustomField2',
  'CustomField2Label',
  'CustomField2Value',
] as const;

const AZUL_RESPONSE_FIELDS = [
  'OrderNumber',
  'Amount',
  'AuthorizationCode',
  'DateTime',
  'ResponseCode',
  'IsoCode',
  'ResponseMessage',
  'ErrorDescription',
  'RRN',
] as const;

const LABELS: Record<string, { booking: string; people: string }> = {
  en: { booking: 'Booking', people: 'People' },
  es: { booking: 'Reserva', people: 'Personas' },
  de: { booking: 'Buchung', people: 'Personen' },
  fr: { booking: 'Reservation', people: 'Personnes' },
};

/** Everything the browser needs to post the guest to Azul's page. */
export const buildAzulForm = async (
  order: PaymentOrder,
  secrets: PaymentSecrets,
  origin: string
): Promise<{ action: string; fields: Record<string, string> }> => {
  const label = LABELS[order.booking.locale] ?? LABELS.en;
  const count = order.booking.breakdown ? plainText(order.booking.breakdown, 40) : String(order.booking.persons);
  const people = `${count}${order.booking.date ? ` - ${plainText(order.booking.date, 30)}` : ''}`;

  const fields: Record<string, string> = {
    MerchantId: secrets.azulMerchantId,
    MerchantName: secrets.azulMerchantName,
    MerchantType: secrets.azulMerchantType,
    CurrencyCode: secrets.azulCurrencyCode,
    OrderNumber: order.id,
    Amount: String(order.amountMinor),
    // "000" is Azul's own spelling of an exempt 0.00.
    ITBIS: order.itbisMinor > 0 ? String(order.itbisMinor) : '000',
    ApprovedUrl: returnUrl(origin, 'azul', order.id, 'approved'),
    DeclinedUrl: returnUrl(origin, 'azul', order.id, 'declined'),
    CancelUrl: returnUrl(origin, 'azul', order.id, 'cancelled'),
    UseCustomField1: '1',
    CustomField1Label: label.booking,
    CustomField1Value: plainText(order.booking.title, 50) || label.booking,
    UseCustomField2: '1',
    CustomField2Label: label.people,
    CustomField2Value: people,
  };

  const message = AZUL_SIGNED_FIELDS.map((name) => fields[name]).join('') + secrets.azulAuthKey;
  fields.AuthHash = await azulHash(message, secrets.azulAuthKey);
  // Not signed: Azul's page language. It only speaks Spanish and English.
  fields.Locale = order.booking.locale === 'es' ? 'ES' : 'EN';

  return { action: AZUL_HOSTS[secrets.azulMode], fields };
};

const sameHash = (a: string, b: string) => {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
};

/**
 * Was this result really sent by Azul, for this order, for this amount?
 * The spec builds the response hash from a Unicode string; UTF-8 is tried as
 * well because Azul accepts either on the way in.
 */
export const verifyAzulReturn = async (
  params: URLSearchParams,
  order: PaymentOrder,
  authKey: string
): Promise<{ authentic: boolean; approved: boolean }> => {
  const received = params.get('AuthHash') ?? '';
  const message = AZUL_RESPONSE_FIELDS.map((name) => params.get(name) ?? '').join('') + authKey;

  let authentic = false;
  if (received && authKey) {
    authentic =
      sameHash(await azulHash(message, authKey, 'utf16le'), received) ||
      sameHash(await azulHash(message, authKey, 'utf8'), received);
  }

  const sameOrder = (params.get('OrderNumber') ?? '') === order.id;
  const sameAmount = Number(params.get('Amount')) === order.amountMinor;
  const approved = authentic && sameOrder && sameAmount && params.get('IsoCode') === '00';
  return { authentic: authentic && sameOrder && sameAmount, approved };
};

// ── CARDNET ─────────────────────────────────────────────────────────────────

const pad12 = (minor: number) => String(Math.max(0, Math.round(minor))).padStart(12, '0');

/** A six-digit number of our own, which CardNET wants alongside the order id. */
const transactionId = () => {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, '0');
};

/** Open a CardNET session. Returns the session and its read-back key. */
export const openCardnetSession = async (
  env: PaymentEnv,
  order: PaymentOrder,
  secrets: PaymentSecrets,
  origin: string,
  clientIp: string
): Promise<{ ok: true; session: string; sessionKey: string; action: string } | { ok: false; error: string }> => {
  const base = cardnetApiBase(env, secrets.cardnetMode);
  // The field holds 15 characters: an IPv4 address. IPv6 visitors are sent as
  // unknown rather than truncated into somebody else's address.
  const ip = /^\d{1,3}(\.\d{1,3}){3}$/.test(clientIp) ? clientIp : '0.0.0.0';

  const payload = {
    TransactionType: '0200',
    CurrencyCode: order.currency === 'USD' ? '840' : '214',
    AcquiringInstitutionCode: secrets.cardnetAcquirer,
    MerchantType: secrets.cardnetMerchantType,
    MerchantNumber: secrets.cardnetMerchantNumber,
    MerchantTerminal: secrets.cardnetTerminal,
    ReturnUrl: returnUrl(origin, 'cardnet', order.id, 'approved'),
    CancelUrl: returnUrl(origin, 'cardnet', order.id, 'cancelled'),
    PageLanguaje: order.booking.locale === 'es' ? 'ESP' : 'ENG',
    OrdenId: order.id,
    TransactionId: transactionId(),
    Tax: pad12(order.itbisMinor),
    MerchantName: secrets.cardnetMerchantName,
    Amount: pad12(order.amountMinor),
    Ipclient: ip,
  };

  try {
    const response = await fetch(`${base}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body: any = await response.json().catch(() => null);
    const session = typeof body?.SESSION === 'string' ? body.SESSION : '';
    const sessionKey = typeof body?.['session-key'] === 'string' ? body['session-key'] : '';
    if (!response.ok || !session || !sessionKey) {
      console.error('[cardnet] session refused', response.status, body);
      return { ok: false, error: 'CardNET could not start this payment.' };
    }
    return { ok: true, session, sessionKey, action: `${base}/authorize` };
  } catch (error) {
    console.error('[cardnet] session request failed', error);
    return { ok: false, error: 'Could not reach CardNET. Please try again.' };
  }
};

/** Ask CardNET what became of a session. Valid for about 30 minutes after the payment. */
export const readCardnetResult = async (
  env: PaymentEnv,
  order: PaymentOrder,
  secrets: PaymentSecrets
): Promise<{ known: boolean; approved: boolean; authorizationCode?: string; reference?: string; code?: string }> => {
  if (!order.session || !order.sessionKey) return { known: false, approved: false };
  const base = cardnetApiBase(env, secrets.cardnetMode);
  try {
    const response = await fetch(
      `${base}/sessions/${encodeURIComponent(order.session)}?sk=${encodeURIComponent(order.sessionKey)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return { known: false, approved: false };
    const body: any = await response.json().catch(() => null);
    if (!body || typeof body !== 'object') return { known: false, approved: false };
    const code = String(body.ResponseCode ?? '');
    const orderMatches = !body.OrdenID || String(body.OrdenID) === order.id;
    return {
      known: Boolean(code),
      approved: code === '00' && orderMatches,
      authorizationCode: body.AuthorizationCode ? String(body.AuthorizationCode) : undefined,
      reference: String(body.RetrievalReferenceNumber ?? body.RetrivalReferenceNumber ?? '') || undefined,
      code,
    };
  } catch (error) {
    console.warn('[cardnet] result lookup failed', error);
    return { known: false, approved: false };
  }
};


// ── VERIFONE (2Checkout ConvertPlus) ────────────────────────────────────────
//
// Verifone's online checkout is 2Checkout ("2Checkout, a Verifone company").
// Its ConvertPlus cart takes a DYNAMIC buy-link: the product name, price and
// currency travel in the URL, and a signature over them stops anyone editing
// the amount on the way. Building one needs no API call and no login — only
// the merchant code and the Buy-Link Secret Word.
//
// Signature (2Checkout, "ConvertPlus Buy-Links signature for dynamic
// products"): take the signed parameters present in the link, sort them by
// name, prefix each VALUE with its length in UTF-8 bytes, concatenate, and
// HMAC-SHA256 the result with the Secret Word; hex. `merchant` and `dynamic`
// are never signed. Checked against the worked example in that document
// (prod=Software, price=10, currency=USD, qty=1, type=digital,
// expiration=1893456000, key "secret_wordbuylink" → c2225743…5762).
//
// On a completed order 2Checkout redirects to `return-url` with the buy-link
// parameters plus its own (refno among them), signed the same way over every
// parameter but `signature`. 2Checkout's published example for the RETURN
// signature does not reproduce, so a return that does not verify is not
// treated as a failure but as "unverified": the operator confirms it in the
// 2Checkout control panel, where every order also lands by e-mail.

/** Parameters ConvertPlus signs, as listed for dynamic products and for every checkout. */
const VERIFONE_SIGNED = new Set([
  'currency', 'prod', 'price', 'qty', 'type', 'opt', 'description', 'recurrence', 'duration',
  'renewal-price', 'item-ext-ref', 'return-url', 'return-type', 'expiration', 'order-ext-ref',
  'customer-ref', 'customer-ext-ref', 'lock', 'coupon',
]);

const utf8Length = (value: string) => new TextEncoder().encode(value).length;

export const verifoneSignature = async (params: Record<string, string>, secretWord: string): Promise<string> => {
  const serialized = Object.keys(params)
    .sort()
    .map((name) => `${utf8Length(params[name])}${params[name]}`)
    .join('');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretWord),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(serialized)));
};

/** The buy-link for one order. The guest's browser simply goes there. */
export const buildVerifoneLink = async (order: PaymentOrder, secrets: PaymentSecrets, origin: string): Promise<string> => {
  const { booking } = order;
  const price = order.amount.toFixed(2);
  const people = booking.breakdown ?? `${booking.persons} ${booking.persons === 1 ? 'person' : 'persons'}`;
  const signed: Record<string, string> = {
    prod: plainText(booking.title, 100) || 'Excursion',
    price,
    qty: '1',
    type: 'digital',
    currency: order.currency,
    description: plainText(`${people}${booking.date ? ` - ${booking.date}` : ''}`, 200),
    'order-ext-ref': order.id,
    'return-url': returnUrl(origin, 'verifone', order.id, 'approved'),
    'return-type': 'redirect',
    // The link stops working after a day, so an old one cannot be replayed.
    expiration: String(Math.floor(Date.now() / 1000) + 24 * 60 * 60),
  };
  for (const name of Object.keys(signed)) {
    if (!VERIFONE_SIGNED.has(name)) throw new Error(`unsigned parameter ${name}`);
  }
  const signature = await verifoneSignature(signed, secrets.verifoneSecretWord);
  const query = new URLSearchParams({
    merchant: secrets.verifoneMerchantCode,
    dynamic: '1',
    ...signed,
    language: booking.locale,
    ...(secrets.verifoneMode === 'test' ? { test: '1' } : {}),
    signature,
  });
  order.signedPrice = price;
  return `${VERIFONE_CHECKOUT_URL}?${query.toString()}`;
};

/**
 * Did 2Checkout really send this guest back from a completed order — for this
 * order and this price? `authentic` is false when the signature cannot be
 * confirmed; the caller then records the order as unverified, not as failed.
 */
export const verifyVerifoneReturn = async (
  params: URLSearchParams,
  order: PaymentOrder,
  secretWord: string
): Promise<{ authentic: boolean; sameOrder: boolean; reference: string }> => {
  const received = (params.get('signature') ?? '').toLowerCase();
  const all: Record<string, string> = {};
  params.forEach((value, name) => {
    if (name !== 'signature') all[name] = value;
  });
  let authentic = false;
  if (/^[0-9a-f]{64}$/.test(received) && secretWord) {
    authentic = (await verifoneSignature(all, secretWord)) === received;
  }
  const refOk = !params.has('order-ext-ref') || params.get('order-ext-ref') === order.id;
  const priceOk = !params.has('price') || params.get('price') === order.signedPrice;
  return {
    authentic,
    sameOrder: refOk && priceOk,
    reference: (params.get('refno') ?? params.get('REFNO') ?? '').slice(0, 40),
  };
};
