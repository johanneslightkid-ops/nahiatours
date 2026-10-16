import { apiGet, apiPut } from './apiClient';
import { getAdminPassword } from './authStore';

/** Per-method show/hide switches. A missing entry means "show when configured". */
export interface PaymentVisibility {
  stripe?: boolean;
  paypal?: boolean;
  cash?: boolean;
}

export interface BrandSettings {
  brandName: string;
  phoneNumber: string;
  paypalMeLink: string;
  /**
   * A hosted card page the operator pasted in — their own Stripe Payment Link,
   * a Verifone portal, anything. Used when no Stripe API key is configured, and
   * the reason the field kept its old name: it is already in live brand records.
   */
  verifoneLink: string;
  brandicon: string;
  /** Master switch for card payments. Off by default: nothing takes money by accident. */
  stripeEnabled?: boolean;
  paymentVisibility?: PaymentVisibility;
}

/**
 * NOTE: there is deliberately no `stripeSecretKey` here.
 *
 * The fork this was ported from kept one in this very record — which
 * `GET /api/data?resource=brand` serves unauthenticated and cached publicly, so
 * the key that can charge and refund was readable by anyone. The secret lives
 * in its own KV entry now (shared/paymentConfig.ts), the data endpoint refuses
 * to serve that entry, and nothing sends it to a browser. Whether one is on
 * file is reported separately by /api/payment-config.
 */

const defaultBrandSettings: BrandSettings = {
  brandName: 'Tours',
  // Nothing here that takes money or rings a phone has a default. See the
  // normaliser below for why.
  phoneNumber: '',
  paypalMeLink: '',
  verifoneLink: '',
  brandicon: '',
  stripeEnabled: false,
  paymentVisibility: { stripe: true, paypal: true, cash: true },
};

const normalizePaymentVisibility = (input: unknown): PaymentVisibility => {
  const source = (input ?? {}) as Record<string, unknown>;
  return {
    stripe: typeof source.stripe === 'boolean' ? source.stripe : true,
    paypal: typeof source.paypal === 'boolean' ? source.paypal : true,
    cash: typeof source.cash === 'boolean' ? source.cash : true,
  };
};

const normalizeBrandSettings = (input: Partial<BrandSettings> | null | undefined): BrandSettings => ({
  brandName:
    typeof input?.brandName === 'string' && input.brandName.trim()
      ? input.brandName
      : defaultBrandSettings.brandName,
  /**
   * A contact detail or a payment link that is not set stays NOT SET.
   *
   * These used to fall back to hardcoded values — an unset PayPal link became
   * `paypal.me/carlostours`, someone else's account, so a deployment that had
   * never configured PayPal still showed a PayPal button and sent guests to a
   * stranger to pay. An unset phone became a placeholder number that opened
   * WhatsApp to nobody. Empty is the honest answer, and it is what lets
   * paymentMethods.ts hide a method that is not configured instead of offering
   * a dead one.
   */
  phoneNumber: typeof input?.phoneNumber === 'string' ? input.phoneNumber : '',
  paypalMeLink: typeof input?.paypalMeLink === 'string' ? input.paypalMeLink : '',
  verifoneLink: typeof input?.verifoneLink === 'string' ? input.verifoneLink : '',
  brandicon:
    typeof input?.brandicon === 'string' && input.brandicon.trim()
      ? input.brandicon
      : defaultBrandSettings.brandicon,
  stripeEnabled: typeof input?.stripeEnabled === 'boolean' ? input.stripeEnabled : false,
  paymentVisibility: normalizePaymentVisibility(input?.paymentVisibility),
});

export const getBrandSettings = async (): Promise<BrandSettings> => {
  try {
    const data = await apiGet<unknown>('brand');
    const brandData = (data as Record<string, unknown>).record ?? data;
    return normalizeBrandSettings(brandData as Partial<BrandSettings>);
  } catch (error) {
    console.error('Failed to fetch brand settings:', error);
    return defaultBrandSettings;
  }
};

export const saveBrandSettings = async (settings: BrandSettings): Promise<void> => {
  try {
    await apiPut<unknown>('brand', settings);
  } catch (error) {
    console.error('Failed to save brand settings:', error);
  }
};

export const uploadBrandIcon = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'brand-icons');

  const adminPassword = getAdminPassword() ?? '';

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'X-Admin-Password': adminPassword,
      },
      body: formData,
    });
    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('Cloudinary upload failed');
    }
    return data.secure_url;
  } catch (error) {
    console.error('Brand icon upload failed:', error);
    return '';
  }
};
