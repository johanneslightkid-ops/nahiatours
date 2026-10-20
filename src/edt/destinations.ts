import { apiGet, apiPut } from '../services/apiClient';
import type { Locale } from '../contexts/I18nContext';

/**
 * The "top destinations" gallery at the head of the tours page, configured in
 * the admin (Destinations). Each card filters the catalogue by `tag`, which is
 * matched against a tour's departure point and its text.
 */
export interface DestinationItem {
  id: string;
  name: string;
  image: string;
  /** What a click filters by: a departure point or any word in the tours. */
  tag: string;
  caption: Partial<Record<Locale, string>>;
  enabled: boolean;
}

export interface DestinationsConfig {
  enabled: boolean;
  /** Pixels per second of the auto-scroll. */
  speed: number;
  items: DestinationItem[];
}

export const DEFAULT_DESTINATIONS: DestinationsConfig = { enabled: true, speed: 32, items: [] };

const normalize = (input: unknown): DestinationsConfig => {
  const record = ((input as { record?: unknown })?.record ?? input) as Partial<DestinationsConfig> | null;
  if (!record || typeof record !== 'object') return DEFAULT_DESTINATIONS;
  return {
    enabled: record.enabled !== false,
    speed: Number.isFinite(Number(record.speed)) ? Math.min(160, Math.max(0, Number(record.speed))) : DEFAULT_DESTINATIONS.speed,
    items: Array.isArray(record.items)
      ? record.items
          .filter((item) => item && typeof item === 'object')
          .map((item, index) => ({
            id: String(item.id || `destination-${index + 1}`),
            name: String(item.name ?? '').trim(),
            image: String(item.image ?? '').trim(),
            tag: String(item.tag ?? item.name ?? '').trim(),
            caption: item.caption && typeof item.caption === 'object' ? item.caption : {},
            enabled: item.enabled !== false,
          }))
      : [],
  };
};

export const getDestinations = async (strict = false): Promise<DestinationsConfig> => {
  try {
    return normalize(await apiGet<unknown>('top-destinations'));
  } catch (error) {
    if (strict) throw error;
    return DEFAULT_DESTINATIONS;
  }
};

export const saveDestinations = async (config: DestinationsConfig): Promise<void> => {
  await apiPut<unknown>('top-destinations', config);
};
