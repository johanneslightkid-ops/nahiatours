import { mioApiBase, PaymentSecrets } from './paymentConfig';
import { plainText, returnUrl, PaymentOrder } from './bankGateways';
import type { PaymentReason } from './paymentOutcome';

/**
 * MIO — "API Checkout", the Dominican wallet and acquirer's online payments.
 *
 * MIO runs on Geopagos, and its checkout is Geopagos' Payments API v4
 * (docs.geopagos.io → Acceptor API References → Payments ecommerce):
 *
 *   1. A token: POST <auth url> { client_id, client_secret, grant_type:
 *      "client_credentials" } → { access_token }. MIO hands over the address
 *      with the credentials; a token lives fifteen minutes, so one is asked
 *      for each time.
 *   2. A payment link for this order: POST /api/v4/payments/links with the
 *      amount as one item, the merchant's number, where to send the guest
 *      after a payment that went through or did not, and where to tell us.
 *      MIO answers with the link's id and transaction_data.checkout_url —
 *      MIO's own page, where the guest pays by card or with a MIO account.
 *   3. The verdict: GET /api/v4/payments/links/<id> lists the payments made
 *      on the link, each APPROVED, DENIED, ERROR, IN_PROGRESS or REFUNDED.
 *      Nothing is called paid on the strength of the redirect alone.
 *
 * The link allows one successful payment and expires with the order's
 * payment window, so a guest cannot pay one booking twice through it.
 */

const tokenFor = async (secrets: PaymentSecrets): Promise<string | null> => {
  try {
    const response = await fetch(secrets.mioAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: secrets.mioClientId,
        client_secret: secrets.mioClientSecret,
        grant_type: 'client_credentials',
      }),
    });
    const body: any = await response.json().catch(() => null);
    if (!response.ok || typeof body?.access_token !== 'string') {
      console.error('[mio] token refused', response.status, body?.error, body?.error_description ?? body?.message);
      return null;
    }
    return body.access_token;
  } catch (error) {
    console.error('[mio] token request failed', error);
    return null;
  }
};

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

export const createMioLink = async (
  secrets: PaymentSecrets,
  order: PaymentOrder,
  origin: string
): Promise<{ ok: true; url: string } | { ok: false }> => {
  const token = await tokenFor(secrets);
  if (!token) return { ok: false };
  const { booking } = order;
  const people = booking.breakdown ?? `${booking.persons} ${booking.persons === 1 ? 'person' : 'persons'}`;

  const payload = {
    source: 'web',
    currency: order.currency,
    merchant_id: Number(secrets.mioMerchantId),
    // The booking as one line for its total: the amount the server priced,
    // whatever the rates behind it.
    items: [
      {
        description: plainText(`${booking.title} - ${people}${booking.date ? ` - ${booking.date}` : ''}`, 120) || 'Booking',
        quantity: 1,
        unit_price: order.amount,
        external_reference: order.id,
      },
    ],
    successful_payment_quantity_limit: 1,
    expires_in_minutes: 60,
    redirect_on_success: returnUrl(origin, 'mio', order.id, 'approved'),
    redirect_on_failure: returnUrl(origin, 'mio', order.id, 'declined'),
    webhook_url: `${origin}/api/mio-webhook?order=${order.id}`,
    webhook_version: 'V4',
    external_data: JSON.stringify({ order: order.id }),
  };

  try {
    const response = await fetch(`${mioApiBase(secrets)}/api/v4/payments/links`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload),
    });
    const body: any = await response.json().catch(() => null);
    const url = body?.transaction_data?.checkout_url;
    if (!response.ok || typeof body?.id !== 'string' || typeof url !== 'string') {
      console.error('[mio] link refused', response.status, JSON.stringify(body?.errors ?? body?.message ?? body).slice(0, 300));
      return { ok: false };
    }
    order.session = body.id;
    order.approveUrl = url;
    return { ok: true, url };
  } catch (error) {
    console.error('[mio] link request failed', error);
    return { ok: false };
  }
};

export interface MioVerdict {
  /** False when MIO could not be asked: nothing is concluded from that. */
  known: boolean;
  status: 'paid' | 'declined' | 'pending' | 'unverified' | 'error';
  reason?: PaymentReason;
  code?: string;
  reference?: string;
  authorizationCode?: string;
}

/** What MIO says about the order's link: paid once any payment on it is APPROVED. */
export const readMioLink = async (secrets: PaymentSecrets, order: PaymentOrder): Promise<MioVerdict> => {
  if (!order.session) return { known: false, status: 'unverified' };
  const token = await tokenFor(secrets);
  if (!token) return { known: false, status: 'unverified' };
  try {
    const response = await fetch(`${mioApiBase(secrets)}/api/v4/payments/links/${encodeURIComponent(order.session)}`, {
      headers: headers(token),
    });
    const body: any = await response.json().catch(() => null);
    if (!response.ok || !body) {
      console.warn('[mio] link lookup refused', response.status);
      return { known: false, status: 'unverified' };
    }
    const payments: any[] = Array.isArray(body.payments) ? body.payments : [];
    const approved = payments.find((payment) => payment?.status === 'APPROVED');
    if (approved) {
      return {
        known: true,
        status: 'paid',
        reason: 'approved',
        code: 'APPROVED',
        reference: approved.reference_number || undefined,
        authorizationCode: approved.authorization_code || undefined,
      };
    }
    if (payments.some((payment) => payment?.status === 'IN_PROGRESS')) return { known: true, status: 'pending', code: 'IN_PROGRESS' };
    const last = payments[payments.length - 1];
    if (last?.status === 'DENIED') return { known: true, status: 'declined', reason: 'declined', code: 'DENIED', reference: last.reference_number || undefined };
    if (last?.status === 'ERROR') return { known: true, status: 'error', reason: 'error', code: 'ERROR' };
    // No payment on the link yet.
    return { known: true, status: 'pending', code: String(body.status ?? '') || undefined };
  } catch (error) {
    console.warn('[mio] link lookup failed', error);
    return { known: false, status: 'unverified' };
  }
};
