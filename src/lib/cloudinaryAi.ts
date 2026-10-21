import { getAdminPassword } from '../services/authStore';

/**
 * Cloudinary's AI image effects, for the admin's logo editor.
 *
 * The picture is uploaded the way every admin upload is (/api/upload, which
 * signs with the server's Cloudinary key), and the AI version is requested
 * from Cloudinary by address:
 *
 *   e_background_removal  the background made transparent (any background, not
 *                         only one plain colour); inputs up to 6144 × 6144
 *   e_upscale             4× the width and height, detail added by the model;
 *                         inputs under 4.2 megapixels
 *
 * Cloudinary makes the AI version on first request and answers 423 (or 420)
 * until it is ready, so this asks again every couple of seconds. Both effects
 * use Cloudinary transformation credits (each counts as several ordinary
 * transformations); whether the account's plan includes them is Cloudinary's
 * call, and its refusal is reported as it comes.
 * https://cloudinary.com/documentation/transformation_reference
 */
export type CloudinaryAiEffect = 'background_removal' | 'upscale';

/** Upscale's input limit, in pixels. */
export const UPSCALE_MAX_PIXELS = 4_194_304;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const upload = async (file: Blob): Promise<string> => {
  const form = new FormData();
  form.append('file', file, 'logo-work.png');
  form.append('folder', 'brand-icons/work');
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'X-Admin-Password': getAdminPassword() ?? '' },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    const reason = String(data?.error ?? '');
    if (/credentials not configured/i.test(reason)) throw new Error('La IA de imágenes usa Cloudinary, y Cloudinary no está configurado en este sitio.');
    throw new Error(reason ? `No se pudo subir la imagen a Cloudinary: ${reason}` : 'No se pudo subir la imagen a Cloudinary.');
  }
  return String(data.secure_url);
};

/** The address of the AI version of an uploaded image. Always PNG, to keep transparency. */
export const aiVariantUrl = (secureUrl: string, effect: CloudinaryAiEffect) =>
  secureUrl.replace('/image/upload/', `/image/upload/e_${effect}/f_png/`);

const REFUSED: Record<number, string> = {
  400: 'Cloudinary no aplicó el efecto (puede que tu plan no lo incluya o que falten créditos).',
  401: 'Tu cuenta de Cloudinary no permite este efecto.',
  403: 'Tu cuenta de Cloudinary no permite este efecto.',
  404: 'Cloudinary no encontró la imagen subida.',
};

export const cloudinaryAi = async (
  image: Blob,
  effect: CloudinaryAiEffect,
  onProgress?: (message: string) => void,
  options: { uploaded?: string } = {}
): Promise<Blob> => {
  onProgress?.('Subiendo a Cloudinary…');
  const secureUrl = options.uploaded ?? (await upload(image));
  const url = aiVariantUrl(secureUrl, effect);
  const started = Date.now();
  for (let attempt = 0; ; attempt += 1) {
    onProgress?.(attempt === 0 ? 'La IA está trabajando…' : `La IA está trabajando… ${Math.round((Date.now() - started) / 1000)} s`);
    const response = await fetch(url, { cache: 'no-store' }).catch(() => null);
    if (response?.ok) return response.blob();
    const status = response?.status ?? 0;
    if (status !== 420 && status !== 423 && status !== 0) throw new Error(REFUSED[status] ?? `Cloudinary respondió ${status}.`);
    if (Date.now() - started > 90_000) throw new Error('Cloudinary sigue procesando la imagen. Vuelve a intentarlo en un minuto.');
    await wait(2500);
  }
};
