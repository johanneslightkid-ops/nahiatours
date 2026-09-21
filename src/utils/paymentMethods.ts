import { BrandSettings } from '../services/brandService';

/**
 * Which payment methods a guest is actually offered.
 *
 * Ported from the kinglobstertours fork, which is where this model was worked
 * out, with one change: Stripe counts as configured when the SERVER says a
 * secret key is on file, not when a key sits in the brand record. The browser
 * is never told what that key is, so `stripeReady` has to be passed in from
 * the payment-config status rather than read off brandSettings.
 *
 * Two independent facts decide whether a method appears:
 *
 *   configured — the operator supplied what it needs to take money.
 *   enabled    — the operator left it switched on.
 *
 * Only both together make it visible. A method that is switched on but not
 * configured stays hidden, because the alternative is a button that takes a
 * guest to a dead end.
 */

export type PaymentMethodId = 'stripe' | 'paypal' | 'cash';

export const PAYMENT_METHOD_IDS: PaymentMethodId[] = ['stripe', 'paypal', 'cash'];

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
 * @param stripeReady whether /api/payment-config reports a secret key on file.
 *        Unknown (the storefront has not asked, or the call failed) is treated
 *        as false, so a card button is never shown on a guess.
 */
export const isPaymentMethodConfigured = (
  brandSettings: BrandSettings,
  method: PaymentMethodId,
  stripeReady = false
): boolean => {
  switch (method) {
    case 'stripe':
      // A hosted link the operator pasted in is a valid way to take a card
      // even with no API key, so either one counts.
      return Boolean(brandSettings.stripeEnabled) &&
        (stripeReady || hasValue(brandSettings.verifoneLink));
    case 'paypal':
      return hasValue(brandSettings.paypalMeLink);
    case 'cash':
      return hasValue(brandSettings.phoneNumber);
    default:
      return false;
  }
};

/** Visibility toggles default to on, so a freshly configured method shows up right away. */
export const isPaymentMethodEnabled = (
  brandSettings: BrandSettings,
  method: PaymentMethodId
): boolean => brandSettings.paymentVisibility?.[method] ?? true;

export const getPaymentMethodStates = (
  brandSettings: BrandSettings,
  stripeReady = false
): PaymentMethodStates =>
  PAYMENT_METHOD_IDS.reduce((states, method) => {
    const configured = isPaymentMethodConfigured(brandSettings, method, stripeReady);
    const enabled = isPaymentMethodEnabled(brandSettings, method);
    states[method] = { configured, enabled, visible: configured && enabled };
    return states;
  }, {} as PaymentMethodStates);

export const isPaymentMethodVisible = (
  brandSettings: BrandSettings,
  method: PaymentMethodId,
  stripeReady = false
): boolean =>
  isPaymentMethodConfigured(brandSettings, method, stripeReady) &&
  isPaymentMethodEnabled(brandSettings, method);

/** False when every method is unconfigured or hidden — the storefront then offers WhatsApp only. */
export const hasVisiblePaymentMethod = (
  brandSettings: BrandSettings,
  stripeReady = false
): boolean =>
  PAYMENT_METHOD_IDS.some((method) => isPaymentMethodVisible(brandSettings, method, stripeReady));

/**
 * The hosted page a card payment should open when there is no API key — the
 * operator's own Stripe Payment Link, Verifone portal or similar. Empty when
 * the API is doing the work instead.
 */
export const getCardCheckoutLink = (brandSettings: BrandSettings): string =>
  hasValue(brandSettings.verifoneLink) ? brandSettings.verifoneLink.trim() : '';
