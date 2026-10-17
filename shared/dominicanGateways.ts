import { AzulSettings, CardnetSettings, GatewayEnvironment } from './paymentConfig';

/**
 * The two card acquirers that actually settle to a Dominican bank account.
 *
 * AZUL (Banco Popular Dominicano) — "Página de Pagos AZUL"
 * ────────────────────────────────────────────────────────
 * From AZUL's own integration manual (E-Commerce AZUL, Página de Pagos):
 *
 *   • The guest's BROWSER posts a form to the hosted page — AZUL is explicit
 *     that the server must not be the one to post it.
 *   • Amounts carry no separator: the last two digits are cents (1000 = 10.00).
 *     ITBIS uses the same format; an exempt sale sends "000".
 *   • AuthHash = HMAC-SHA512, keyed with the AuthKey (which is never posted),
 *     over MerchantId + MerchantName + MerchantType + CurrencyCode +
 *     OrderNumber + Amount + ITBIS + ApprovedUrl + DeclinedUrl + CancelUrl +
 *     UseCustomField1 + CustomField1Label + CustomField1Value +
 *     UseCustomField2 + CustomField2Label + CustomField2Value + AuthKey,
 *     computed over the UTF-16LE ("Unicode") bytes and sent as lowercase hex.
 *   • The guest comes back to ApprovedUrl / DeclinedUrl with the result in the
 *     query string, signed the same way over OrderNumber + Amount +
 *     AuthorizationCode + DateTime + ResponseCode + IsoCode + ResponseMessage +
 *     ErrorDescription + RRN + AuthKey. IsoCode "00" is an approval. CancelUrl
 *     gets no parameters at all.
 *
 * CardNet (BHD, Banreservas, …) — "Botón de Pago", hosted screen
 * ────────────────────────────────────────────────────────────
 * Verified against CardNet's lab (labservicios.cardnet.com.do) while this was
 * written:
 *
 *   • POST {base}/sessions with the merchant and the amount (JSON, no secret)
 *     → { SESSION, "session-key" }.
 *   • The browser form-posts SESSION to {base}/authorize, which redirects to
 *     CardNet's card screen (3-D Secure included).
 *   • CardNet returns the guest by form-POSTing SESSION to ReturnUrl — the
 *     query string we put on ReturnUrl survives — or sends them to CancelUrl.
 *   • The POST is a claim, not a result: GET {base}/sessions/{SESSION}?sk=
 *     {session-key} answers with ResponseCode ("00" approved), AuthorizationCode,
 *     RetrivalReferenceNumber (CardNet's spelling), CreditCardNumber (masked),
 *     TxToken and OrdenID. Before any payment it answers
 *     { message: "rspdata_not_found" }.
 *   • Lab: https://labservicios.cardnet.com.do · Production:
 *     https://ecommerce.cardnet.com.do (both answer on /sessions).
 */

export const AZUL_PAGE_URLS: Record<GatewayEnvironment, string> = {
  test: 'https://pruebas.azul.com.do/PaymentPage/',
  production: 'https://pagos.azul.com.do/PaymentPage/Default.aspx',
};

export const CARDNET_BASES: Record<GatewayEnvironment, string> = {
  test: 'https://labservicios.cardnet.com.do',
  production: 'https://ecommerce.cardnet.com.do',
};

export const azulPageUrl = (azul: AzulSettings): string =>
  azul.paymentPageUrl || AZUL_PAGE_URLS[azul.environment];

export const cardnetBase = (cardnet: CardnetSettings): string =>
  cardnet.apiBase || CARDNET_BASES[cardnet.environment];

/* ── Money ─────────────────────────────────────────────────────────────── */

/** Catalogue dollars → minor units of the merchant's currency. */
export const toChargeMinor = (totalUsd: number, exchangeRate: number): number =>
  Math.round(totalUsd * exchangeRate * 100);

/** The tax already inside a tax-inclusive amount. */
export const itbisMinor = (chargeMinor: number, itbisRate: number): number =>
  itbisRate > 0 ? Math.round(chargeMinor - chargeMinor / (1 + itbisRate)) : 0;

/** AZUL's amount format: digits only, last two are cents; zero is "000". */
export const azulAmount = (minor: number): string => (minor > 0 ? String(minor) : '000');

export const azulCurrencyLabel = (code: string): string =>
  /us/i.test(code) ? 'USD' : 'DOP';

export const cardnetCurrencyLabel = (code: string): string => (code === '840' ? 'USD' : 'DOP');

/**
 * Text shown on the bank's page. AZUL rejects a request containing `"` or `\`
 * and drops `'`; CardNet is no more forgiving. Keep it plain.
 */
export const plainText = (value: string, max = 50): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/["'\\<>&]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/* ── Hashing ───────────────────────────────────────────────────────────── */

const utf16le = (text: string): Uint8Array => {
  const out = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out[i * 2] = code & 0xff;
    out[i * 2 + 1] = code >> 8;
  }
  return out;
};

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

const hmacSha512Hex = async (key: Uint8Array, data: Uint8Array): Promise<string> => {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/** Compares two hex strings without short-circuiting on the first difference. */
const sameHex = (a: string, b: string): boolean => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
};

/** The fields of an AZUL sale request, in the order they are signed. */
export const AZUL_REQUEST_ORDER = [
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

/** The fields of AZUL's response, in the order they are signed. */
export const AZUL_RESPONSE_ORDER = [
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

export const azulRequestHash = async (fields: Record<string, string>, authKey: string): Promise<string> => {
  const text = AZUL_REQUEST_ORDER.map((name) => fields[name] ?? '').join('') + authKey;
  return hmacSha512Hex(utf8(authKey), utf16le(text));
};

/**
 * Was this result signed by AZUL with our key?
 *
 * The manual signs responses over the UTF-16LE string. It also says the
 * request side accepts UTF-8 "indistintamente", so a UTF-8 signature is
 * accepted here too — both are keyed with the secret, so neither can be forged.
 */
export const verifyAzulResponse = async (params: URLSearchParams, authKey: string): Promise<boolean> => {
  const received = params.get('AuthHash') ?? '';
  if (!/^[0-9a-f]{128}$/i.test(received)) return false;
  const text = AZUL_RESPONSE_ORDER.map((name) => params.get(name) ?? '').join('') + authKey;
  const key = utf8(authKey);
  for (const data of [utf16le(text), utf8(text)]) {
    if (sameHex(await hmacSha512Hex(key, data), received)) return true;
  }
  return false;
};

/* ── CardNet ───────────────────────────────────────────────────────────── */

export interface CardnetSessionRequest {
  TransactionType: string;
  CurrencyCode: string;
  AcquiringInstitutionCode: string;
  MerchantType: string;
  MerchantNumber: string;
  MerchantTerminal: string;
  ReturnUrl: string;
  CancelUrl: string;
  PageLanguaje: string;
  OrdenId: string;
  TransactionId: string;
  Tax: string;
  MerchantName: string;
  AVS: string;
  Amount: string;
}

export const createCardnetSession = async (
  base: string,
  request: CardnetSessionRequest
): Promise<{ session: string; sessionKey: string } | { error: string }> => {
  try {
    const response = await fetch(`${base}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
    });
    const body: any = await response.json().catch(() => null);
    const session = typeof body?.SESSION === 'string' ? body.SESSION : '';
    const sessionKey = typeof body?.['session-key'] === 'string' ? body['session-key'] : '';
    if (!response.ok || !session || !sessionKey) {
      console.error('[cardnet] session refused:', response.status, JSON.stringify(body).slice(0, 300));
      return { error: 'CardNet did not open a payment session.' };
    }
    return { session, sessionKey };
  } catch (error) {
    console.error('[cardnet] session request failed:', error);
    return { error: 'Could not reach CardNet.' };
  }
};

export interface CardnetResult {
  /** True only for ResponseCode "00". */
  approved: boolean;
  /** No result yet: the guest has not finished, or CardNet has not recorded it. */
  pending: boolean;
  responseCode: string;
  authorizationCode: string;
  reference: string;
  card: string;
  orderId: string;
}

export const getCardnetResult = async (
  base: string,
  session: string,
  sessionKey: string
): Promise<CardnetResult | null> => {
  try {
    const response = await fetch(
      `${base}/sessions/${encodeURIComponent(session)}?sk=${encodeURIComponent(sessionKey)}`,
      { headers: { Accept: 'application/json' } }
    );
    const body: any = await response.json().catch(() => null);
    if (!body || typeof body !== 'object') return null;
    if (body.message === 'rspdata_not_found' || !body.ResponseCode) {
      return { approved: false, pending: true, responseCode: '', authorizationCode: '', reference: '', card: '', orderId: '' };
    }
    const clean = (value: unknown) => (typeof value === 'string' && value !== 'N/A' ? value.slice(0, 40) : '');
    return {
      approved: body.ResponseCode === '00',
      pending: false,
      responseCode: clean(body.ResponseCode),
      authorizationCode: clean(body.AuthorizationCode),
      // CardNet spells it "Retrival"; accept the dictionary spelling too.
      reference: clean(body.RetrivalReferenceNumber ?? body.RetrievalReferenceNumber),
      card: clean(body.CreditCardNumber),
      orderId: clean(body.OrdenID ?? body.OrdenId),
    };
  } catch (error) {
    console.error('[cardnet] result lookup failed:', error);
    return null;
  }
};
