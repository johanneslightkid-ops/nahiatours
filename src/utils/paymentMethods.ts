import { BrandSettings } from '../services/brandService';

/**
 * Which payment methods a guest is actually offered.
 *
 * A guest sees three ways to pay — by CARD, by PayPal, or in person through
 * the concierge — and nothing about who processes the card. Stripe, AZUL
 * (Banco Popular) and CardNET are the operator's choice, made in the admin;
 * the server picks the configured one when a card payment starts. So "card"
 * is one method here however many processors are set up behind it.
 *
 * Two independent facts decide whether a method appears:
 *
 *   configured — the operator supplied what it needs to take money.
 *   enabled    — the operator left it switched on.
 *
 * Only both together make it visible. A method that is switched on but not
 * configured stays hidden, because the alternative is a button that takes a
 * guest to a dead end.
 *
 * Card counts as configured when the master switch ("Aceptar tarjetas") is on
 * AND either the server reports a processor ready, or the operator pasted a
 * payment link from a processor's portal.
 */

export type PaymentMethodId = 'card' | 'applepay' | 'googlepay' | 'paypal' | 'mio' | 'cash';

export const PAYMENT_METHOD_IDS: PaymentMethodId[] = ['card', 'applepay', 'googlepay', 'paypal', 'mio', 'cash'];

/**
 * APPLE PAY and GOOGLE PAY are the card payment too, paid from a wallet: the
 * guest goes to the same hosted payment page, which offers the wallet on a
 * device that has it. So they are "configured" when cards are, AND the
 * processor's page takes wallets (Stripe, Verifone — not the banks' pages).
 * Whether this particular device can use one is a separate question, asked
 * in the browser (src/lib/wallets.ts), so the admin still sees them as
 * available from a laptop without Apple Pay.
 */
export type WalletId = 'apple_pay' | 'google_pay';

export const WALLET_OF: Partial<Record<PaymentMethodId, WalletId>> = { applepay: 'apple_pay', googlepay: 'google_pay' };

/** Mirrors CARD_WALLETS in shared/paymentConfig.ts, for the admin panel. */
export const WALLETS_BY_PROCESSOR: Record<string, WalletId[]> = {
  stripe: ['apple_pay', 'google_pay'],
  verifone: ['apple_pay', 'google_pay'],
  azul: [],
  cardnet: [],
  mio: [],
};

export interface PaymentMethodState {
  /** The method has everything it needs to actually take a payment. */
  configured: boolean;
  /** The admin explicitly kept it switched on (only meaningful when configured). */
  enabled: boolean;
  /** Configured AND switched on — this is what the storefront should render. */
  visible: boolean;
}

export type PaymentMethodStates = Record<PaymentMethodId, PaymentMethodState>;

const hasValue = (value?: string | null): boolean =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * A payment link pasted from a processor's portal — an AZUL "Link de Pagos",
 * a CardNET "Enlace de Pago", a Stripe Payment Link or similar — used when no
 * processor is configured with credentials. Empty when there is none.
 */
export const getCardPaymentLink = (brandSettings: BrandSettings): string =>
  [brandSettings.azulLink, brandSettings.cardnetLink, brandSettings.verifoneLink]
    .find((link) => hasValue(link))
    ?.trim() ?? '';

/** Kept for callers of the old name: the hosted card page, when there is one. */
export const getCardCheckoutLink = getCardPaymentLink;

/**
 * @param cardReady whether the server reports a card processor configured.
 *        Unknown (the storefront has not asked, or the call failed) is treated
 *        as false, so a card button is never shown on a guess.
 */
export const isPaymentMethodConfigured = (
  brandSettings: BrandSettings,
  method: PaymentMethodId,
  cardReady = false,
  wallets: WalletId[] = [],
  paypalReady = false,
  mioReady = false
): boolean => {
  switch (method) {
    case 'card':
      return Boolean(brandSettings.stripeEnabled) && (cardReady || hasValue(getCardPaymentLink(brandSettings)));
    case 'applepay':
    case 'googlepay':
      return Boolean(brandSettings.stripeEnabled) && cardReady && wallets.includes(WALLET_OF[method]!);
    case 'paypal':
      // Through PayPal's API (configured in the payments admin), or a PayPal.Me link.
      return paypalReady || hasValue(brandSettings.paypalMeLink);
    case 'mio':
      // MIO's API Checkout (configured in the payments admin), or a Milin link.
      return mioReady || hasValue(brandSettings.mioLink);
    case 'cash':
      return hasValue(brandSettings.phoneNumber);
    default:
      return false;
  }
};

/**
 * Visibility toggles default to on, so a freshly configured method shows up
 * right away. Card's switch is stored under `stripe` — the name it had when
 * Stripe was the only card processor — so existing settings carry over.
 */
const visibilityKey = (method: PaymentMethodId) => (method === 'card' ? 'stripe' : method);

export const isPaymentMethodEnabled = (brandSettings: BrandSettings, method: PaymentMethodId): boolean =>
  brandSettings.paymentVisibility?.[visibilityKey(method)] ?? true;

/** The brand-record patch that switches a method on or off. */
export const withPaymentMethodEnabled = (
  brandSettings: BrandSettings,
  method: PaymentMethodId,
  enabled: boolean
): BrandSettings => ({
  ...brandSettings,
  paymentVisibility: { ...brandSettings.paymentVisibility, [visibilityKey(method)]: enabled },
});

export const getPaymentMethodStates = (
  brandSettings: BrandSettings,
  cardReady = false,
  wallets: WalletId[] = [],
  paypalReady = false,
  mioReady = false
): PaymentMethodStates =>
  PAYMENT_METHOD_IDS.reduce((states, method) => {
    const configured = isPaymentMethodConfigured(brandSettings, method, cardReady, wallets, paypalReady, mioReady);
    const enabled = isPaymentMethodEnabled(brandSettings, method);
    states[method] = { configured, enabled, visible: configured && enabled };
    return states;
  }, {} as PaymentMethodStates);

export const isPaymentMethodVisible = (
  brandSettings: BrandSettings,
  method: PaymentMethodId,
  cardReady = false,
  wallets: WalletId[] = []
): boolean =>
  isPaymentMethodConfigured(brandSettings, method, cardReady, wallets) && isPaymentMethodEnabled(brandSettings, method);

/** False when every method is unconfigured or hidden — the storefront then offers WhatsApp only. */
export const hasVisiblePaymentMethod = (brandSettings: BrandSettings, cardReady = false): boolean =>
  PAYMENT_METHOD_IDS.some((method) => isPaymentMethodVisible(brandSettings, method, cardReady));
