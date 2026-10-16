import { apiGet, apiPut } from './apiClient';
import { getAdminPassword } from './authStore';

/** Per-method show/hide switches. A missing entry means "show when configured". */
export interface PaymentVisibility {
  stripe?: boolean;
  paypal?: boolean;
  cash?: boolean;
  azul?: boolean;
  cardnet?: boolean;
}

export type HeroMediaType = 'image' | 'video';

/** One of the three hand-cut cards in the home-page media collage. */
export interface HeroMediaItem {
  url: string;
  type: HeroMediaType;
  /** Shown to screen readers for images; also works as a useful admin label. */
  alt?: string;
}

export const defaultHeroMedia: HeroMediaItem[] = [
  { url: '/buggy.mp4', type: 'video', alt: 'Buggy adventure in Punta Cana' },
  { url: '/imgs/tours/tour_saona_island_detail_9.jpg', type: 'image', alt: 'Saona Island shore' },
  { url: '/imgs/tours/tour_speed_boat_detail_5.jpg', type: 'image', alt: 'Caribbean speedboat' },
];

export interface HeroRatingRange {
  min: number;
  max: number;
}

export interface BrandSettings {
  brandName: string;
  /** The named person guests will speak with on WhatsApp and in the planner. */
  contactName: string;
  phoneNumber: string;
  paypalMeLink: string;
  /**
   * A hosted card page the operator pasted in — their own Stripe Payment Link,
   * a Verifone portal, anything. Used when no Stripe API key is configured, and
   * the reason the field kept its old name: it is already in live brand records.
   */
  verifoneLink: string;
  brandicon: string;
  /**
   * A payment link from the bank's own portal — Azul's "Link de Pagos" or
   * CardNET's "Enlace de Pago". Used when the gateway itself is not configured
   * with merchant credentials. May carry {amount}, {currency} and {ref}
   * placeholders, which the storefront fills in; without them it is opened as
   * it is and the guest is shown the amount to pay.
   */
  azulLink?: string;
  cardnetLink?: string;
  /** Master switch for card payments. Off by default: nothing takes money by accident. */
  stripeEnabled?: boolean;
  paymentVisibility?: PaymentVisibility;
  /** The three image/video cards that appear beside the home-page welcome. */
  heroMedia?: HeroMediaItem[];
  /** Whether the average guest rating bubble is shown on the home-page hero. */
  heroRatingEnabled?: boolean;
  /** Range in stars that counts as a passing guest rating for the banner. */
  heroRatingRange?: HeroRatingRange;
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
  contactName: '',
  // Nothing here that takes money or rings a phone has a default. See the
  // normaliser below for why.
  phoneNumber: '',
  paypalMeLink: '',
  verifoneLink: '',
  brandicon: '',
  stripeEnabled: false,
  azulLink: '',
  cardnetLink: '',
  paymentVisibility: { stripe: true, paypal: true, cash: true, azul: true, cardnet: true },
  heroMedia: defaultHeroMedia,
  heroRatingEnabled: true,
  heroRatingRange: { min: 3, max: 5 },
};

const normalizePaymentVisibility = (input: unknown): PaymentVisibility => {
  const source = (input ?? {}) as Record<string, unknown>;
  return {
    stripe: typeof source.stripe === 'boolean' ? source.stripe : true,
    paypal: typeof source.paypal === 'boolean' ? source.paypal : true,
    cash: typeof source.cash === 'boolean' ? source.cash : true,
    azul: typeof source.azul === 'boolean' ? source.azul : true,
    cardnet: typeof source.cardnet === 'boolean' ? source.cardnet : true,
  };
};

const normalizeHeroMedia = (input: unknown): HeroMediaItem[] => {
  if (!Array.isArray(input)) return defaultHeroMedia;

  return defaultHeroMedia.map((fallback, index) => {
    const item = input[index] as Partial<HeroMediaItem> | undefined;
    return {
      url: typeof item?.url === 'string' && item.url.trim() ? item.url.trim() : fallback.url,
      type: item?.type === 'video' ? 'video' : item?.type === 'image' ? 'image' : fallback.type,
      alt: typeof item?.alt === 'string' ? item.alt.trim() : fallback.alt,
    };
  });
};

const normalizeHeroRatingRange = (input: unknown): HeroRatingRange => {
  const source = (input ?? {}) as Record<string, unknown>;
  const min = typeof source.min === 'number' ? source.min : 3;
  const max = typeof source.max === 'number' ? source.max : 5;
  const safeMin = Math.min(Math.max(Number.isFinite(min) ? min : 3, 1), 5);
  const safeMax = Math.min(Math.max(Number.isFinite(max) ? max : 5, safeMin), 5);
  return { min: safeMin, max: safeMax };
};

const normalizeBrandSettings = (input: Partial<BrandSettings> | null | undefined): BrandSettings => ({
  brandName:
   typeof input?.brandName === 'string' && input.brandName.trim()
     ? input.brandName
     : defaultBrandSettings.brandName,
  contactName: typeof input?.contactName === 'string' ? input.contactName.trim() : '',
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
  azulLink: typeof input?.azulLink === 'string' ? input.azulLink.trim() : '',
  cardnetLink: typeof input?.cardnetLink === 'string' ? input.cardnetLink.trim() : '',
  brandicon:
   typeof input?.brandicon === 'string' && input.brandicon.trim()
     ? input.brandicon
     : defaultBrandSettings.brandicon,
  stripeEnabled: typeof input?.stripeEnabled === 'boolean' ? input.stripeEnabled : false,
  paymentVisibility: normalizePaymentVisibility(input?.paymentVisibility),
  heroMedia: normalizeHeroMedia(input?.heroMedia),
  heroRatingEnabled: typeof input?.heroRatingEnabled === 'boolean' ? input.heroRatingEnabled : true,
  heroRatingRange: normalizeHeroRatingRange(input?.heroRatingRange),
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

/** Resolves false when the save failed, so a panel can say so instead of claiming success. */
export const saveBrandSettings = async (settings: BrandSettings): Promise<boolean> => {
  try {
    await apiPut<unknown>('brand', settings);
    return true;
  } catch (error) {
    console.error('Failed to save brand settings:', error);
    return false;
  }
};

const uploadMedia = async (file: File, folder: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

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

export const uploadBrandIcon = async (file: File): Promise<string> => uploadMedia(file, 'brand-icons');

export const uploadHeroMedia = async (file: File): Promise<string> => uploadMedia(file, 'hero-media');
