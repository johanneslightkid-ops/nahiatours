import { apiGet, apiPut } from '../services/apiClient';
import type { Locale } from '../contexts/I18nContext';

/**
 * The "Inspire me" presentation — the full-screen show for the shop's TV —
 * configured in the admin (Inspire).
 */
export interface InspireTrack {
  id: string;
  title: string;
  url: string;
}

export type InspireEffect = 'caustics' | 'sunglow' | 'bokeh' | 'none';

export interface InspireConfig {
  enabled: boolean;
  /** Animated WebP (or any image) behind everything. */
  background: string;
  /** Shown while the animated background is still arriving. */
  backgroundPoster: string;
  effect: InspireEffect;
  /** 0–1. */
  effectIntensity: number;
  /** How long each tour holds the stage in the carousel. */
  slideSeconds: number;
  /** Tours to show, by catalogue position (1-based). Empty means all. */
  tourIds: number[];
  tracks: InspireTrack[];
  /** Music volume, 0–1. */
  volume: number;
  /** Share of the volume the music keeps on the video screen. */
  duckLevel: number;
  /**
   * The optional YouTube Data API key is not here: this record is public. It
   * is kept server-side by /api/youtube (see functions/api/youtube.ts).
   */
  youtube: {
    /** A channel URL, @handle or channel id. Falls back to the YouTube account in Social. */
    channel: string;
    /** Words added to every tour's search. */
    searchSuffix: string;
    preferShorts: boolean;
    maxResults: number;
  };
  headline: Partial<Record<Locale, string>>;
}

export const DEFAULT_INSPIRE: InspireConfig = {
  enabled: true,
  background: '/imgs/edt/inspire/paradise.webp',
  backgroundPoster: '/imgs/edt/gallery/aerial-beach.webp',
  effect: 'caustics',
  effectIntensity: 0.7,
  slideSeconds: 7,
  tourIds: [],
  tracks: [],
  volume: 0.6,
  duckLevel: 0.2,
  youtube: { channel: '', searchSuffix: 'Punta Cana Bávaro tour', preferShorts: true, maxResults: 12 },
  headline: { en: 'Your Caribbean, your way' },
};

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export const normalizeInspire = (input: unknown): InspireConfig => {
  const record = ((input as { record?: unknown })?.record ?? input) as Partial<InspireConfig> | null;
  if (!record || typeof record !== 'object') return DEFAULT_INSPIRE;
  const youtube = (record.youtube ?? {}) as Partial<InspireConfig['youtube']>;
  return {
    enabled: record.enabled !== false,
    background: String(record.background ?? DEFAULT_INSPIRE.background).trim(),
    backgroundPoster: String(record.backgroundPoster ?? DEFAULT_INSPIRE.backgroundPoster).trim(),
    effect: (['caustics', 'sunglow', 'bokeh', 'none'] as InspireEffect[]).includes(record.effect as InspireEffect)
      ? (record.effect as InspireEffect)
      : DEFAULT_INSPIRE.effect,
    effectIntensity: clamp(record.effectIntensity, 0, 1, DEFAULT_INSPIRE.effectIntensity),
    slideSeconds: clamp(record.slideSeconds, 3, 60, DEFAULT_INSPIRE.slideSeconds),
    tourIds: Array.isArray(record.tourIds) ? record.tourIds.map(Number).filter((n) => Number.isFinite(n) && n > 0) : [],
    tracks: Array.isArray(record.tracks)
      ? record.tracks
          .filter((track) => track && typeof track.url === 'string' && track.url.trim())
          .map((track, index) => ({ id: String(track.id || `track-${index + 1}`), title: String(track.title ?? '').trim(), url: track.url.trim() }))
      : [],
    volume: clamp(record.volume, 0, 1, DEFAULT_INSPIRE.volume),
    duckLevel: clamp(record.duckLevel, 0, 1, DEFAULT_INSPIRE.duckLevel),
    youtube: {
      channel: String(youtube.channel ?? '').trim(),
      searchSuffix: String(youtube.searchSuffix ?? DEFAULT_INSPIRE.youtube.searchSuffix).trim(),
      preferShorts: youtube.preferShorts !== false,
      maxResults: clamp(youtube.maxResults, 3, 30, DEFAULT_INSPIRE.youtube.maxResults),
    },
    headline: record.headline && typeof record.headline === 'object' ? record.headline : DEFAULT_INSPIRE.headline,
  };
};

export const getInspireConfig = async (strict = false): Promise<InspireConfig> => {
  try {
    return normalizeInspire(await apiGet<unknown>('inspire-config'));
  } catch (error) {
    if (strict) throw error;
    return DEFAULT_INSPIRE;
  }
};

export const saveInspireConfig = async (config: InspireConfig): Promise<void> => {
  await apiPut<unknown>('inspire-config', config);
};
