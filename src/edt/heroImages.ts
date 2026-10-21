/**
 * Which file of a hero photograph a screen gets.
 *
 * The site's own hero photographs (public/imgs/edt/banners/hero-*.webp) come
 * in three cuts: 2560 × 1440 for big screens, 1280 × 720 (`-sm`) for the rest,
 * and, for the AI-made set, 1080 × 1920 (`-portrait`) framed on the subject
 * for a phone held upright — where the wide cut would show a sliver of its
 * middle. A photograph uploaded in the admin lives on Cloudinary, which makes
 * the same three cuts on the way out, the upright one cropped around what it
 * finds the subject to be (g_auto).
 */
export type HeroCut = 'large' | 'small' | 'portrait';

/** The photographs that have an upright cut of their own. */
const WITH_PORTRAIT = new Set([
  'palm-beach',
  'zipline',
  'saona-aerial',
  'buggy',
  'cayo-levantado',
  'dolphins',
  'santo-domingo',
  'catamaran',
  'diving',
  'whale',
  'golden-hour',
]);

const LOCAL = /^\/imgs\/edt\/banners\/hero-([a-z-]+)\.webp$/;
const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

const CLOUD_CUT: Record<HeroCut, string> = {
  large: 'c_limit,w_2560/q_auto:good,f_auto/',
  small: 'c_limit,w_1280/q_auto:good,f_auto/',
  portrait: 'c_fill,g_auto,ar_9:16,w_1080/q_auto:good,f_auto/',
};

export const heroCut = (url: string, cut: HeroCut): string => {
  const local = LOCAL.exec(url);
  if (local) {
    if (cut === 'large') return url;
    if (cut === 'portrait' && WITH_PORTRAIT.has(local[1])) return url.replace(/\.webp$/, '-portrait.webp');
    return url.replace(/\.webp$/, '-sm.webp');
  }
  const cloud = CLOUDINARY.exec(url);
  if (cloud) return `${cloud[1]}${CLOUD_CUT[cut]}${cloud[2]}`;
  return url;
};
