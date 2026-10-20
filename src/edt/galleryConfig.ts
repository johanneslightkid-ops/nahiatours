import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/apiClient';

/**
 * How every reel and photo carousel on the site moves, set in the admin
 * (Admin → Look). One record for the whole site, so the home-page reels, the
 * catalogue reel, the reviews and a tour's photographs all behave alike.
 */
export interface GalleryMotion {
  /** Which way the reels run on their own. "rtl": the pictures travel from right to left. */
  direction: 'rtl' | 'ltr';
  /** Multiplies every reel's own pace; 1 is the designed speed. */
  speed: number;
  /** Share of the speed a reel keeps while the pointer is over it (0.5 = half speed, 0 = stops). */
  hoverSlowdown: number;
  /** While the pointer is over a reel, the half it is on decides which way the reel runs. */
  followPointer: boolean;
  /** A tour's photographs advance on their own. */
  detailAutoplay: boolean;
  /** Seconds each photograph of a tour holds before the next. */
  detailSeconds: number;
}

export const DEFAULT_GALLERY_MOTION: GalleryMotion = {
  direction: 'rtl',
  speed: 1,
  hoverSlowdown: 0.5,
  followPointer: true,
  detailAutoplay: true,
  detailSeconds: 5,
};

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export const normalizeGalleryMotion = (input: unknown): GalleryMotion => {
  const record = ((input as { record?: unknown })?.record ?? input) as Partial<GalleryMotion> | null;
  if (!record || typeof record !== 'object') return DEFAULT_GALLERY_MOTION;
  return {
    direction: record.direction === 'ltr' ? 'ltr' : 'rtl',
    speed: clamp(record.speed, 0.25, 3, DEFAULT_GALLERY_MOTION.speed),
    hoverSlowdown: clamp(record.hoverSlowdown, 0, 1, DEFAULT_GALLERY_MOTION.hoverSlowdown),
    followPointer: record.followPointer !== false,
    detailAutoplay: record.detailAutoplay !== false,
    detailSeconds: clamp(record.detailSeconds, 2, 30, DEFAULT_GALLERY_MOTION.detailSeconds),
  };
};

let current: GalleryMotion = DEFAULT_GALLERY_MOTION;
let request: Promise<GalleryMotion> | null = null;
const listeners = new Set<(motion: GalleryMotion) => void>();

const publish = (motion: GalleryMotion) => {
  current = motion;
  listeners.forEach((listener) => listener(motion));
};

export const getGalleryMotion = async (strict = false): Promise<GalleryMotion> => {
  try {
    const motion = normalizeGalleryMotion(await apiGet<unknown>('gallery-config'));
    publish(motion);
    return motion;
  } catch (error) {
    if (strict) throw error;
    return DEFAULT_GALLERY_MOTION;
  }
};

export const saveGalleryMotion = async (motion: GalleryMotion): Promise<void> => {
  await apiPut<unknown>('gallery-config', motion);
  publish(motion);
};

/** The site's gallery motion; the defaults until the stored record arrives (once per page load). */
export const useGalleryMotion = (): GalleryMotion => {
  const [motion, setMotion] = useState(current);
  useEffect(() => {
    listeners.add(setMotion);
    if (!request) request = getGalleryMotion();
    setMotion(current);
    return () => {
      listeners.delete(setMotion);
    };
  }, []);
  return motion;
};

/** Preview a change before it is saved (the admin page uses it). */
export const previewGalleryMotion = publish;
