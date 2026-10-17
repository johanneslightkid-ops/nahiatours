import { kvOf, PaymentEnv } from './paymentConfig';

/**
 * A card payment through AZUL or CardNet, from the moment the guest leaves for
 * the bank's page until we know what happened there.
 *
 * Stripe keeps the booking on its own session, so it needs nothing like this.
 * The Dominican gateways do not: AZUL hands back only an order number and an
 * amount, and CardNet's session must be looked up with a key we have to
 * remember. So the booking is written here before the guest leaves, under
 * `payment-order:<id>`, and the verified result is written onto it when they
 * come back. The return page then reads the RESULT from here — never from the
 * query string, which anyone can type.
 *
 * Records expire after 30 days. They are a convenience for the return trip,
 * not the ledger: the bank's own portal is the record of what was charged.
 * /api/data refuses this prefix (shared/paymentConfig.ts), so a guessed id
 * cannot be read there.
 */

export type DominicanGateway = 'azul' | 'cardnet';
export type OrderStatus = 'pending' | 'paid' | 'declined' | 'cancelled' | 'error';

export interface PaymentOrder {
  id: string;
  gateway: DominicanGateway;
  status: OrderStatus;
  environment: 'test' | 'production';
  createdAt: string;
  updatedAt: string;
  title: string;
  persons: number;
  date: string;
  category: string;
  locale: 'en' | 'es';
  returnPath: string;
  priceSource: 'catalogue' | 'client';
  /** In the catalogue's currency (US dollars). */
  total: number;
  /** What the gateway was asked to charge, in minor units of chargeCurrency. */
  chargeMinor: number;
  /** Display label: 'DOP' or 'USD'. */
  chargeCurrency: string;
  cardnet?: { session: string; sessionKey: string; transactionId: string };
  result?: {
    authorizationCode?: string;
    reference?: string;
    responseCode?: string;
    message?: string;
    card?: string;
  };
}

const PREFIX = 'payment-order:';
const TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Twelve digits: digits only, because AZUL's OrderNumber and CardNet's
 * OrdenId both take them without complaint, and twelve is short enough for
 * either field while making a guess a one-in-a-trillion shot.
 */
export const newOrderId = (): string => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let id = String(1 + (bytes[0] % 9));
  for (let i = 1; i < 12; i++) id += String(bytes[i] % 10);
  return id;
};

export const isOrderId = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{12}$/.test(value);

export const saveOrder = async (env: PaymentEnv, order: PaymentOrder): Promise<boolean> => {
  const kv = kvOf(env);
  if (!kv) return false;
  try {
    await kv.put(PREFIX + order.id, JSON.stringify(order), { expirationTtl: TTL_SECONDS });
    return true;
  } catch (error) {
    console.error('[paymentOrders] write failed:', error);
    return false;
  }
};

export const loadOrder = async (env: PaymentEnv, id: string): Promise<PaymentOrder | null> => {
  const kv = kvOf(env);
  if (!kv || !isOrderId(id)) return null;
  // A guest can come back from the bank within seconds of leaving. KV is
  // read-your-writes in the same location, but give a slow replica a moment
  // rather than telling someone who just paid that their order is gone.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const order = await kv.get(PREFIX + id, { type: 'json' });
      if (order && typeof order === 'object') return order as PaymentOrder;
    } catch (error) {
      console.warn('[paymentOrders] read failed:', error);
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return null;
};

/** What the guest's browser may see about an order: the receipt, nothing more. */
export const publicOrder = (order: PaymentOrder) => ({
  id: order.id,
  gateway: order.gateway,
  status: order.status,
  paid: order.status === 'paid',
  environment: order.environment,
  tour: order.title,
  persons: order.persons,
  date: order.date,
  category: order.category,
  priceSource: order.priceSource,
  amountTotal: order.chargeMinor / 100,
  currency: order.chargeCurrency,
  totalUsd: order.total,
  authorizationCode: order.result?.authorizationCode ?? '',
  reference: order.result?.reference ?? '',
  card: order.result?.card ?? '',
  message: order.result?.message ?? '',
});
