/**
 * Catalogue loading for the planner.
 *
 * Primary source is the same API the Tours page uses. When that is unavailable
 * (local `vite dev` without the Pages Functions runtime, or a transient API
 * hiccup) we fall back to the static bundle in /data so the planner never shows
 * an empty day.
 */
import { getServiceSlug, getTours, Tour } from '../services/toursService';
import { matchTourProfile } from './tourProfiles';
import type { CatalogueEntry } from './types';

type Locale = 'en' | 'es' | 'de' | 'fr';

interface RawTour {
  title?: string;
  description?: string;
  price?: string;
  pricing?: Array<{ tier?: string; price?: string }>;
  images?: Array<{ localPath?: string }>;
}

const amountFrom = (price: string): number | null => {
  const numeric = Number(String(price ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const normalizeStatic = (raw: RawTour, index: number): Tour => {
  const images = (raw.images ?? [])
    .map((image) => String(image?.localPath ?? '').trim())
    .filter(Boolean)
    .map((path) => (/^https?:\/\//.test(path) ? path : `/${path.replace(/^\//, '')}`));

  const pricingOptions = (raw.pricing ?? []).map((tier, i) => ({
    tier: tier.tier?.trim() || `Option ${i + 1}`,
    price: tier.price?.trim() || '',
    amount: amountFrom(tier.price ?? ''),
  }));

  const image = images[0] || '/imgs/placeholder.jpg';

  return {
    id: index + 1,
    image,
    title: String(raw.title ?? '').trim(),
    description: String(raw.description ?? '').trim(),
    price: pricingOptions[0]?.price ?? String(raw.price ?? ''),
    pricingOptions,
    details: {
      description: String(raw.description ?? '').trim(),
      images: images.length > 0 ? images : [image],
    },
  };
};

const loadStatic = async (locale: Locale): Promise<Tour[]> => {
  try {
    const response = await fetch(`/data/tours-${locale}.json`, { cache: 'no-cache' });
    if (!response.ok) return [];
    const payload = await response.json();
    const list = Array.isArray(payload) ? payload : (payload?.record ?? []);
    return Array.isArray(list) ? list.map(normalizeStatic) : [];
  } catch (error) {
    console.warn('[planner] static catalogue fallback failed', error);
    return [];
  }
};

export const loadPlannerCatalogue = async (locale: Locale): Promise<Tour[]> => {
  const tours = await getTours(locale);
  if (tours.length > 0) return tours;
  return loadStatic(locale);
};

/** Joins live catalogue tours with their structured planning profiles. */
export const buildCatalogue = (tours: Tour[]): CatalogueEntry[] =>
  tours
    .filter((tour) => tour && tour.title)
    .map((tour) => ({
      tour,
      profile: matchTourProfile(tour.title),
      slug: getServiceSlug(tour),
    }));
