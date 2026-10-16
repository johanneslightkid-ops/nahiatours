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
 *
 * AZUL and CARDNET count as configured either way they can take money: the
 * server reports merchant credentials on file (the amount then travels to the
 * bank's page by itself), or the operator pasted a payment link from the bank's
 * portal into the brand record.
 */

export type PaymentMethodId = 'stripe' | 'azul' | 'cardnet' | 'paypal' | 'cash';

export const PAYMENT_METHOD_IDS: PaymentMethodId[] = ['stripe', 'azul', 'cardnet', 'paypal', 'cash'];

/** What the server says about each gateway. A bare boolean means Stripe only. */
export interface GatewayReadiness {
  stripe: boolean;
  azul: boolean;
  cardnet: boolean;
}

const readiness = (ready: boolean | Partial<GatewayReadiness> | undefined): GatewayReadiness =>
  typeof ready === 'boolean'
    ? { stripe: ready, azul: false, cardnet: false }
    : { stripe: Boolean(ready?.stripe), azul: Boolean(ready?.azul), cardnet: Boolean(ready?.cardnet) };

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
 * @param ready what the server reports — a boolean for "Stripe has a key on
 *        file", or the readiness of every gateway. Unknown (the storefront has
 *        not asked, or the call failed) is treated as false, so a payment
 *        button is never shown on a guess.
 */
export const isPaymentMethodConfigured = (
  brandSettings: BrandSettings,
  method: PaymentMethodId,
  ready: boolean | Partial<GatewayReadiness> = false
): boolean => {
  const server = readiness(ready);
  switch (method) {
    case 'stripe':
      // A hosted link the operator pasted in is a valid way to take a card
      // even with no API key, so either one counts.
      return Boolean(brandSettings.stripeEnabled) &&
        (server.stripe || hasValue(brandSettings.verifoneLink));
    case 'azul':
      return server.azul || hasValue(brandSettings.azulLink);
    case 'cardnet':
      return server.cardnet || hasValue(brandSettings.cardnetLink);
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
  ready: boolean | Partial<GatewayReadiness> = false
): PaymentMethodStates =>
  PAYMENT_METHOD_IDS.reduce((states, method) => {
    const configured = isPaymentMethodConfigured(brandSettings, method, ready);
    const enabled = isPaymentMethodEnabled(brandSettings, method);
    states[method] = { configured, enabled, visible: configured && enabled };
    return states;
  }, {} as PaymentMethodStates);

export const isPaymentMethodVisible = (
  brandSettings: BrandSettings,
  method: PaymentMethodId,
  ready: boolean | Partial<GatewayReadiness> = false
): boolean =>
  isPaymentMethodConfigured(brandSettings, method, ready) &&
  isPaymentMethodEnabled(brandSettings, method);

/** False when every method is unconfigured or hidden — the storefront then offers WhatsApp only. */
export const hasVisiblePaymentMethod = (
  brandSettings: BrandSettings,
  ready: boolean | Partial<GatewayReadiness> = false
): boolean =>
  PAYMENT_METHOD_IDS.some((method) => isPaymentMethodVisible(brandSettings, method, ready));

/**
 * The hosted page a card payment should open when there is no API key — the
 * operator's own Stripe Payment Link, Verifone portal or similar. Empty when
 * the API is doing the work instead.
 */
export const getCardCheckoutLink = (brandSettings: BrandSettings): string =>
  hasValue(brandSettings.verifoneLink) ? brandSettings.verifoneLink.trim() : '';

/** The bank's own payment link for Azul or CardNET, or empty when there is none. */
export const getBankPaymentLink = (brandSettings: BrandSettings, provider: 'azul' | 'cardnet'): string => {
  const link = provider === 'azul' ? brandSettings.azulLink : brandSettings.cardnetLink;
  return hasValue(link) ? (link as string).trim() : '';
};
