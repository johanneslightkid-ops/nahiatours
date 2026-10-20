/**
 * Pictures for a big screen.
 *
 * The shop's TV shows a photo across 1920 pixels or more, where the site's
 * 1400-pixel originals go soft. Local photos have an upscaled, sharpened copy
 * beside them (`-uhd.webp`, made by scripts/upscale-images.py); photos
 * uploaded through the admin live on Cloudinary, which can scale and sharpen
 * them on the way out — or upscale them with its AI model, when the admin
 * switched that on (it uses Cloudinary credits).
 *
 * Only on a screen that has the pixels: a phone or a small laptop keeps the
 * originals, and so never decodes a picture four times the size it can show.
 */

/** Device pixels across the screen this runs on. */
const screenPixels = () =>
  typeof window === 'undefined' ? 0 : Math.max(window.innerWidth, window.screen?.width ?? 0) * (window.devicePixelRatio || 1);

export const isBigScreen = () => screenPixels() >= 1600;

// No lookbehind: older WebKit, as some TVs run, cannot even parse one.
const isLocal = (url: string) => /^\/imgs\/edt\/.+\.webp$/.test(url) && !/-(sm|uhd)\.webp$/.test(url);
const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

export const bigScreenImage = (url: string, aiUpscale = false): string => {
  if (!url || !isBigScreen()) return url;
  if (isLocal(url)) return url.replace(/\.webp$/, '-uhd.webp');
  const cloud = url.match(CLOUDINARY);
  if (cloud) {
    const step = aiUpscale ? 'e_upscale/' : 'c_scale,w_2240/e_sharpen:60/';
    return `${cloud[1]}${step}q_auto:good,f_auto/${cloud[2]}`;
  }
  return url;
};

/** Fetch and decode a picture before it is shown, so a transition never waits on it. */
export const preloadImage = (url: string): Promise<void> =>
  new Promise((resolve) => {
    if (!url) return resolve();
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    const done = () => resolve();
    if (typeof image.decode === 'function') image.decode().then(done, done);
    else {
      image.onload = done;
      image.onerror = done;
    }
  });
