/**
 * What a processor's answer means for the guest.
 *
 * AZUL and CardNET both report the card network's ISO 8583 response code
 * (AZUL as `IsoCode`, CardNET as `ResponseCode`); PayPal reports an "issue"
 * name. Each is reduced here to one REASON the returning guest is told about,
 * with a next step that fits it: a different card for a decline, the same
 * card again for a network hiccup, a word with the bank for a limit.
 *
 * Deliberately coarse. A card reported lost or stolen, or held for suspected
 * fraud, reads as a plain decline: telling the person holding it which one it
 * was is exactly what card networks ask merchants not to do.
 */

export type PaymentReason =
  /** Approved. */
  | 'approved'
  /** The bank said no and gave no reason the guest can act on. */
  | 'declined'
  | 'insufficient_funds'
  /** A daily or per-purchase limit, or a card not enabled for online use. */
  | 'limit'
  | 'expired_card'
  /** The number, expiry or security code did not check out. */
  | 'check_details'
  /** 3-D Secure or the bank's own confirmation did not complete. */
  | 'authentication'
  /** The bank or the network did not answer: the same card may work in a minute. */
  | 'try_again'
  /** Something on the merchant's side — the guest can only try another way. */
  | 'error'
  | 'cancelled';

const ISO: Record<string, PaymentReason> = {
  '00': 'approved',
  '08': 'approved',
  '10': 'approved',
  '11': 'approved',
  '16': 'approved',
  '51': 'insufficient_funds',
  '61': 'limit',
  '65': 'limit',
  '57': 'limit',
  '58': 'limit',
  '54': 'expired_card',
  '33': 'expired_card',
  '14': 'check_details',
  '15': 'check_details',
  '55': 'check_details',
  '56': 'check_details',
  '82': 'check_details',
  N7: 'check_details',
  '1A': 'authentication',
  '19': 'try_again',
  '68': 'try_again',
  '90': 'try_again',
  '91': 'try_again',
  '92': 'try_again',
  '96': 'try_again',
  '06': 'try_again',
  '12': 'error',
  '13': 'error',
  '30': 'error',
};

/** An ISO 8583 response code, as AZUL and CardNET report it. Unknown codes are declines. */
export const reasonFromIso = (code: string | null | undefined): PaymentReason => {
  const key = String(code ?? '').trim().toUpperCase();
  if (!key) return 'error';
  return ISO[key] ?? ISO[key.padStart(2, '0')] ?? 'declined';
};

/** PayPal's capture "issue" names and capture status reasons. */
export const reasonFromPayPal = (issue: string | null | undefined): PaymentReason => {
  const key = String(issue ?? '').toUpperCase();
  if (!key) return 'error';
  if (key === 'INSTRUMENT_DECLINED' || key === 'TRANSACTION_REFUSED' || key === 'DECLINED_BY_RISK_FRAUD_FILTERS') {
    return 'declined';
  }
  if (key === 'PAYER_ACTION_REQUIRED' || key === 'PAYER_CANNOT_PAY') return 'authentication';
  if (key === 'ORDER_NOT_APPROVED' || key === 'ORDER_EXPIRED') return 'cancelled';
  if (key.includes('LIMIT')) return 'limit';
  return 'error';
};
