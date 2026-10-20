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
  /** When it was added to the queue (ISO). Older records: see trackAddedAt. */
  addedAt?: string;
}

/**
 * When a song was added, in ms — for sorting the queue by upload date. Songs
 * saved before `addedAt` existed still know it: a Cloudinary upload carries
 * its upload time in the URL (`/upload/v<seconds>/`), and an id made by the
 * admin is `track-<time in base 36>`. NaN when nothing tells.
 */
export const trackAddedAt = (track: InspireTrack): number => {
  const stored = track.addedAt ? Date.parse(track.addedAt) : NaN;
  if (Number.isFinite(stored)) return stored;
  const version = track.url.match(/\/upload\/(?:[^/]+\/)*v(\d{9,11})\//);
  if (version) return Number(version[1]) * 1000;
  const fromId = track.id.match(/^track-([0-9a-z]{6,})(?:-|$)/);
  if (fromId) {
    const time = parseInt(fromId[1], 36);
    if (time > 1_500_000_000_000 && time < 4_000_000_000_000) return time;
  }
  return NaN;
};

export type InspireEffect = 'caustics' | 'sunglow' | 'bokeh' | 'none';

/**
 * How one picture gives way to the next — the background slideshow and a
 * tour's photos alike. All of them move only transform and opacity, so a TV's
 * compositor does the work (src/styles/globals.css, `.tr-*`).
 */
export type InspireTransition = 'dissolve' | 'kenburns' | 'push' | 'cover' | 'zoom' | 'wipe' | 'iris' | 'cube' | 'flip' | 'random';
export const INSPIRE_TRANSITIONS: InspireTransition[] = ['kenburns', 'dissolve', 'push', 'cover', 'zoom', 'wipe', 'iris', 'cube', 'flip', 'random'];

export type VisualizerStyle = 'bars' | 'mirror' | 'wave';
export type VisualizerPosition = 'bottom' | 'middle' | 'top';

/**
 * How hard the show may work the screen it runs on. 'auto' starts at full
 * quality and steps down on its own when frames start arriving late
 * (useShowQuality); the others fix the level.
 */
export type InspireQuality = 'auto' | 'high' | 'balanced' | 'lite';

/**
 * The TV player: YouTube's own controls, keys and fullscreen button off, the
 * player out of reach of the pointer and the remote's focus, and the show's
 * own control bar under the video. 'auto' uses it on TV browsers only.
 */
export type TvPlayerMode = 'auto' | 'on' | 'off';

export interface InspireConfig {
  enabled: boolean;
  /** Animated WebP (or any image) behind everything. */
  background: string;
  /** Shown while the animated background is still arriving. */
  backgroundPoster: string;
  /**
   * Stills played as a slideshow behind the show, with `transition`. When
   * there are any, they replace `background`. A local /imgs/edt/… still is
   * shown from its `-uhd` copy on a big screen (scripts/upscale-images.py).
   */
  backgroundSlides: string[];
  /** How long each background still holds, in seconds. */
  backgroundSeconds: number;
  transition: InspireTransition;
  /** How long one transition takes, in seconds. */
  transitionSeconds: number;
  quality: InspireQuality;
  /**
   * Photos uploaded through the admin live on Cloudinary. On a big screen
   * they are fetched at TV width and sharpened by Cloudinary; with this on,
   * through Cloudinary's AI upscaler (e_upscale) instead, which uses credits.
   */
  cloudinaryAiUpscale: boolean;
  /** The music, drawn over the background while it plays. */
  visualizer: {
    enabled: boolean;
    style: VisualizerStyle;
    /** 0–1. */
    opacity: number;
    /** Share of the screen's height, 0.08–0.5. */
    height: number;
    position: VisualizerPosition;
    colorFrom: string;
    colorTo: string;
  };
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
    tvPlayer: TvPlayerMode;
  };
  headline: Partial<Record<Locale, string>>;
}

export const DEFAULT_INSPIRE: InspireConfig = {
  enabled: true,
  background: '/imgs/edt/inspire/paradise.webp',
  backgroundPoster: '/imgs/edt/gallery/aerial-beach.webp',
  backgroundSlides: [1, 2, 3, 4, 5, 6, 7].map((n) => `/imgs/edt/inspire/paradise-${n}.webp`),
  backgroundSeconds: 8,
  transition: 'kenburns',
  transitionSeconds: 1.6,
  quality: 'auto',
  cloudinaryAiUpscale: false,
  visualizer: { enabled: true, style: 'bars', opacity: 0.5, height: 0.22, position: 'bottom', colorFrom: '#f2a33a', colorTo: '#c6a15b' },
  effect: 'caustics',
  effectIntensity: 0.7,
  slideSeconds: 7,
  tourIds: [],
  tracks: [],
  volume: 0.6,
  duckLevel: 0.2,
  youtube: { channel: '', searchSuffix: 'Punta Cana Bávaro tour', preferShorts: true, maxResults: 12, tvPlayer: 'auto' },
  headline: { en: 'Your Caribbean, your way' },
};

const color = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export const normalizeInspire = (input: unknown): InspireConfig => {
  const record = ((input as { record?: unknown })?.record ?? input) as Partial<InspireConfig> | null;
  if (!record || typeof record !== 'object') return DEFAULT_INSPIRE;
  const youtube = (record.youtube ?? {}) as Partial<InspireConfig['youtube']>;
  const visualizer = (record.visualizer ?? {}) as Partial<InspireConfig['visualizer']>;
  const fallbackViz = DEFAULT_INSPIRE.visualizer;
  return {
    enabled: record.enabled !== false,
    background: String(record.background ?? DEFAULT_INSPIRE.background).trim(),
    backgroundPoster: String(record.backgroundPoster ?? DEFAULT_INSPIRE.backgroundPoster).trim(),
    // A record saved before slides existed gets the default stills.
    backgroundSlides: Array.isArray(record.backgroundSlides)
      ? record.backgroundSlides.map((url) => String(url ?? '').trim()).filter(Boolean)
      : DEFAULT_INSPIRE.backgroundSlides,
    backgroundSeconds: clamp(record.backgroundSeconds, 3, 60, DEFAULT_INSPIRE.backgroundSeconds),
    transition: INSPIRE_TRANSITIONS.includes(record.transition as InspireTransition)
      ? (record.transition as InspireTransition)
      : DEFAULT_INSPIRE.transition,
    transitionSeconds: clamp(record.transitionSeconds, 0.3, 5, DEFAULT_INSPIRE.transitionSeconds),
    quality: (['auto', 'high', 'balanced', 'lite'] as InspireQuality[]).includes(record.quality as InspireQuality)
      ? (record.quality as InspireQuality)
      : 'auto',
    cloudinaryAiUpscale: record.cloudinaryAiUpscale === true,
    visualizer: {
      enabled: visualizer.enabled !== false,
      style: (['bars', 'mirror', 'wave'] as VisualizerStyle[]).includes(visualizer.style as VisualizerStyle)
        ? (visualizer.style as VisualizerStyle)
        : fallbackViz.style,
      opacity: clamp(visualizer.opacity, 0.05, 1, fallbackViz.opacity),
      height: clamp(visualizer.height, 0.08, 0.5, fallbackViz.height),
      position: (['bottom', 'middle', 'top'] as VisualizerPosition[]).includes(visualizer.position as VisualizerPosition)
        ? (visualizer.position as VisualizerPosition)
        : fallbackViz.position,
      colorFrom: color(visualizer.colorFrom, fallbackViz.colorFrom),
      colorTo: color(visualizer.colorTo, fallbackViz.colorTo),
    },
    effect: (['caustics', 'sunglow', 'bokeh', 'none'] as InspireEffect[]).includes(record.effect as InspireEffect)
      ? (record.effect as InspireEffect)
      : DEFAULT_INSPIRE.effect,
    effectIntensity: clamp(record.effectIntensity, 0, 1, DEFAULT_INSPIRE.effectIntensity),
    slideSeconds: clamp(record.slideSeconds, 3, 60, DEFAULT_INSPIRE.slideSeconds),
    tourIds: Array.isArray(record.tourIds) ? record.tourIds.map(Number).filter((n) => Number.isFinite(n) && n > 0) : [],
    tracks: Array.isArray(record.tracks)
      ? record.tracks
          .filter((track) => track && typeof track.url === 'string' && track.url.trim())
          .map((track, index) => ({
            id: String(track.id || `track-${index + 1}`),
            title: String(track.title ?? '').trim(),
            url: track.url.trim(),
            ...(typeof track.addedAt === 'string' && Number.isFinite(Date.parse(track.addedAt)) ? { addedAt: track.addedAt } : {}),
          }))
      : [],
    volume: clamp(record.volume, 0, 1, DEFAULT_INSPIRE.volume),
    duckLevel: clamp(record.duckLevel, 0, 1, DEFAULT_INSPIRE.duckLevel),
    youtube: {
      channel: String(youtube.channel ?? '').trim(),
      searchSuffix: String(youtube.searchSuffix ?? DEFAULT_INSPIRE.youtube.searchSuffix).trim(),
      preferShorts: youtube.preferShorts !== false,
      maxResults: clamp(youtube.maxResults, 3, 30, DEFAULT_INSPIRE.youtube.maxResults),
      tvPlayer: youtube.tvPlayer === 'on' || youtube.tvPlayer === 'off' ? youtube.tvPlayer : 'auto',
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
