import { tours as staticTours } from '../data/tours';
import { transportServices as staticTransportServices } from '../data/transportServices';
import type { TransferRoute } from '../types/transport';
import { apiGet, apiPut } from './apiClient';
import { getAdminPassword } from './authStore';

type Locale = 'en' | 'es';
export type ServiceCategory = 'tours' | 'transport';

interface RawPricingTier {
  tier?: string;
  price?: string;
}

interface RawImage {
  role?: string;
  localPath?: string;
}

interface RawTransferRoute {
  id?: string;
  origin?: string;
  destination?: string;
  price?: string;
  amount?: number;
  distanceKm?: number;
  durationMinutes?: number;
}

interface RawService {
  id?: number;
  title?: string;
  description?: string;
  price?: string;
  pricing?: RawPricingTier[];
  images?: RawImage[];
  image?: string;
  transferRoutes?: RawTransferRoute[];
}

export interface PricingOption {
  tier: string;
  price: string;
  amount: number | null;
}

export interface ServiceDetails {
  description: string;
  images: string[];
}

export interface Tour {
  id: number;
  image: string;
  title: string;
  description: string;
  price: string;
  pricingOptions: PricingOption[];
  details: ServiceDetails;
  transferRoutes?: TransferRoute[];
}

const extractAmountFromPrice = (price: string): number | null => {
  const normalizedPrice = String(price ?? '').replace(/[^\d.]/g, '');
  const numericValue = Number(normalizedPrice);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
};

const normalizeImagePath = (input: string): string => {
  if (!input) {
    return '';
  }

  if (/^https?:\/\//.test(input)) {
    return input;
  }

  return input.startsWith('/') ? input : `/${input}`;
};

const toLocalPath = (input: string): string =>
  /^https?:\/\//.test(input) ? input : input.replace(/^\//, '');

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const normalizePricingOptions = (
  raw: RawService,
  category: ServiceCategory,
  locale: Locale
): PricingOption[] => {
  const rawPricing = Array.isArray(raw.pricing) ? raw.pricing : [];

  if (rawPricing.length > 0) {
    return rawPricing.map((item, index) => ({
      tier: item.tier?.trim() || `${locale === 'es' ? 'Opción' : 'Option'} ${index + 1}`,
      price: item.price?.trim() || '',
      amount: extractAmountFromPrice(item.price?.trim() || ''),
    }));
  }

  const fallbackTier = category === 'transport' ? 'People' : 'Adults';
  const fallbackPrice = String(raw.price ?? '').trim();

  return fallbackPrice
    ? [{ tier: fallbackTier, price: fallbackPrice, amount: extractAmountFromPrice(fallbackPrice) }]
    : [];
};

const normalizeService = (
  rawService: RawService,
  index: number,
  category: ServiceCategory,
  locale: Locale
): Tour => {
  const detailImages = Array.isArray(rawService.images)
    ? rawService.images
        .map((image) => normalizeImagePath(String(image.localPath ?? '').trim()))
        .filter(Boolean)
    : [];
  const pricingOptions = normalizePricingOptions(rawService, category, locale);
  const fallbackImage = normalizeImagePath(String(rawService.image ?? '').trim());
  const image = detailImages[0] || fallbackImage || '/imgs/placeholder.jpg';
  const price = pricingOptions[0]?.price || String(rawService.price ?? '').trim();
  const title = String(rawService.title ?? '').trim();
  const description = String(rawService.description ?? '').trim();

  const transferRoutes = Array.isArray(rawService.transferRoutes)
    ? rawService.transferRoutes.map((route) => ({
        id: String(route.id ?? ''),
        origin: String(route.origin ?? '').trim(),
        destination: String(route.destination ?? '').trim(),
        price: String(route.price ?? '').trim(),
        amount: Number.isFinite(Number(route.amount)) ? Number(route.amount) : extractAmountFromPrice(String(route.price ?? '')),
        distanceKm: route.distanceKm ?? null,
        durationMinutes: route.durationMinutes ?? null,
      }))
    : undefined;

  return {
    id: Number(rawService.id ?? index + 1),
    image,
    title,
    description,
    price,
    pricingOptions,
    details: {
      description,
      images: detailImages.length > 0 ? detailImages : [image],
    },
    transferRoutes,
  };
};

const normalizeServices = (
  services: unknown,
  fallback: Tour[],
  category: ServiceCategory,
  locale: Locale
): Tour[] => {
  if (!Array.isArray(services)) {
    return fallback;
  }

  return services.map((service, index) => normalizeService(service as RawService, index, category, locale));
};

const fetchServices = async (
  resource: string,
  fallback: Tour[],
  category: ServiceCategory,
  locale: Locale,
  allowFallback: boolean
): Promise<Tour[]> => {
  try {
    const data = await apiGet<unknown>(resource, { locale });
    return normalizeServices((data as Record<string, unknown>)?.record ?? data, fallback, category, locale);
  } catch (error) {
    console.error(`Failed to fetch services for ${resource}:`, error);
    return allowFallback ? fallback : [];
  }
};

export const getExampleTours = async (locale: Locale): Promise<Tour[]> =>
  fetchServices('example-tours', staticTours, 'tours', locale, true);

export const getTours = async (locale: Locale): Promise<Tour[]> =>
  fetchServices('tours', [], 'tours', locale, false);

export const getTransportServices = async (locale: Locale): Promise<Tour[]> =>
  fetchServices('transport-services', [], 'transport', locale, false);

export const getServicesByCategory = async (
  category: ServiceCategory,
  locale: Locale
): Promise<Tour[]> =>
  category === 'transport' ? getTransportServices(locale) : getTours(locale);

const serializeToursForSave = (services: Tour[]): RawService[] =>
  services.map((service) => ({
    title: service.title,
    description: service.description,
    pricing: service.pricingOptions.map((option) => ({ tier: option.tier, price: option.price })),
    images: service.details.images.map((image, index) => ({
      role: `detail_${index + 1}`,
      localPath: toLocalPath(image),
    })),
  }));

const serializeTransportForSave = (services: Tour[]): RawService[] =>
  services.map((service) => ({
    title: service.title,
    description: service.description,
    price: service.pricingOptions[0]?.price || service.price,
    images: service.details.images.map((image, index) => ({
      role: `detail_${index + 1}`,
      localPath: toLocalPath(image),
    })),
    transferRoutes: service.transferRoutes?.map((route) => ({
      id: route.id,
      origin: route.origin,
      destination: route.destination,
      price: route.price,
      amount: route.amount ?? null,
      distanceKm: route.distanceKm ?? null,
      durationMinutes: route.durationMinutes ?? null,
    })),
  }));

export const saveTours = async (tours: Tour[], locale: Locale): Promise<void> => {
  await apiPut<unknown>('tours', serializeToursForSave(tours), { locale });
};

export const saveTransportServices = async (services: Tour[], locale: Locale): Promise<void> => {
  await apiPut<unknown>('transport-services', serializeTransportForSave(services), { locale });
};

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'tours');

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
    console.error('Image upload failed:', error);
    return 'https://dummyimage.com/600x600/cccccc/000000&text=Upload+Failed';
  }
};

export const getServiceSlug = (service: Pick<Tour, 'title' | 'id'>): string => {
  const slug = slugify(service.title);
  return slug ? `${service.id}-${slug}` : String(service.id);
};
