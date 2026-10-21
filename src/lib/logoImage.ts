/**
 * The image work behind the admin's logo editor (BrandIconEditor): every step
 * runs on a canvas in the admin's browser, so it costs nothing and needs no
 * account. The AI steps are elsewhere (src/lib/cloudinaryAi.ts).
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LogoShape = 'square' | 'original';

export interface LogoSettings {
  /** The part of the picture that is kept, in its own pixels. */
  crop: Rect;
  shape: LogoShape;
  /** How large the kept part is drawn in its frame: 1 fits it exactly. */
  scale: number;
  /** Where it sits in the frame, as a share of the frame (0 = centred). */
  pan: { x: number; y: number };
  /** 0 = square corners, 100 = round (a circle when the frame is square). */
  corners: number;
  /** A colour behind the logo, or null to keep it transparent. */
  background: string | null;
}

export type Rgb = [number, number, number];

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    // Cloudinary sends CORS headers; without this the canvas could not read it back.
    if (/^https?:/.test(src)) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    image.src = src;
  });

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
};

/** The whole picture as pixels. */
export const pixelsOf = (image: CanvasImageSource & { width: number; height: number }) => {
  const canvas = canvasOf(image.width, image.height);
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0);
  return { canvas, context, data: context.getImageData(0, 0, canvas.width, canvas.height) };
};

export const toBlob = (canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> =>
  new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen.'))), type));

export const hex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
export const rgbOf = (value: string): Rgb => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
};

/**
 * The colour behind the logo: the commonest colour along the picture's border.
 * Null when the border is already mostly transparent.
 */
export const detectBackground = (image: HTMLImageElement | HTMLCanvasElement): Rgb | null => {
  const { data } = pixelsOf(image);
  const { width, height } = data;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let transparent = 0;
  let samples = 0;
  const step = Math.max(1, Math.round(Math.min(width, height) / 120));
  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    samples += 1;
    if (data.data[i + 3] < 24) {
      transparent += 1;
      return;
    }
    const [r, g, b] = [data.data[i], data.data[i + 1], data.data[i + 2]];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  };
  for (let x = 0; x < width; x += step) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    sample(0, y);
    sample(width - 1, y);
  }
  if (transparent > samples * 0.5) return null;
  let best: { n: number; r: number; g: number; b: number } | null = null;
  buckets.forEach((bucket) => {
    if (!best || bucket.n > best.n) best = bucket;
  });
  if (!best) return null;
  const { n, r, g, b } = best;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
};

/** The colour of one pixel of the picture. */
export const colourAt = (image: HTMLImageElement | HTMLCanvasElement, x: number, y: number): Rgb => {
  const canvas = canvasOf(1, 1);
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, Math.floor(x), Math.floor(y), 1, 1, 0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
};

/**
 * Make a colour transparent.
 *
 * `tolerance` (0–100) is how far a colour may be from the chosen one and still
 * go; just beyond it, pixels fade out instead of stopping hard, so the logo's
 * anti-aliased edge does not keep a halo of the old background. With
 * `edgesOnly`, only the area joined to the picture's border is removed — the
 * same colour inside the logo (white letters on a white card) stays.
 */
export const removeColour = (image: HTMLImageElement | HTMLCanvasElement, colour: Rgb, tolerance: number, edgesOnly: boolean): HTMLCanvasElement => {
  const { canvas, context, data } = pixelsOf(image);
  const px = data.data;
  const { width, height } = data;
  const limit = Math.max(1, (tolerance / 100) * 160);
  const soft = limit * 1.6;
  const distance = (i: number) => {
    const dr = px[i] - colour[0];
    const dg = px[i + 1] - colour[1];
    const db = px[i + 2] - colour[2];
    return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * 1.7;
  };
  const fade = (i: number, d: number) => {
    const keep = d <= limit ? 0 : Math.min(1, (d - limit) / (soft - limit));
    px[i + 3] = Math.round(px[i + 3] * keep);
  };

  if (!edgesOnly) {
    for (let i = 0; i < px.length; i += 4) {
      const d = distance(i);
      if (d < soft) fade(i, d);
    }
  } else {
    const seen = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0;
    let tail = 0;
    const push = (x: number, y: number) => {
      const p = y * width + x;
      if (seen[p]) return;
      seen[p] = 1;
      const d = distance(p * 4);
      if (d >= soft) return;
      fade(p * 4, d);
      // The fading fringe is removed but does not carry the fill further in.
      if (d <= limit) queue[tail++] = p;
    };
    for (let x = 0; x < width; x += 1) {
      push(x, 0);
      push(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
      push(0, y);
      push(width - 1, y);
    }
    while (head < tail) {
      const p = queue[head++];
      const x = p % width;
      const y = (p - x) / width;
      if (x > 0) push(x - 1, y);
      if (x < width - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < height - 1) push(x, y + 1);
    }
  }
  context.putImageData(data, 0, 0);
  return canvas;
};

/** The smallest box around everything that is not transparent (or not the background colour). */
export const contentBounds = (image: HTMLImageElement | HTMLCanvasElement, background: Rgb | null): Rect => {
  const { data } = pixelsOf(image);
  const px = data.data;
  const { width, height } = data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (px[i + 3] < 24) continue;
      if (background) {
        const d = Math.abs(px[i] - background[0]) + Math.abs(px[i + 1] - background[1]) + Math.abs(px[i + 2] - background[2]);
        if (d < 36) continue;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w: width, h: height };
  const margin = Math.round(Math.max(maxX - minX, maxY - minY) * 0.03);
  const x = Math.max(0, minX - margin);
  const y = Math.max(0, minY - margin);
  return { x, y, w: Math.min(width, maxX + margin + 1) - x, h: Math.min(height, maxY + margin + 1) - y };
};

/** The part of the picture inside `crop`, at its own resolution. */
export const cropCanvas = (image: HTMLImageElement | HTMLCanvasElement, crop: Rect): HTMLCanvasElement => {
  const canvas = canvasOf(crop.w, crop.h);
  canvas.getContext('2d')!.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  return canvas;
};

const roundedRect = (context: CanvasRenderingContext2D, width: number, height: number, radius: number) => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(r, 0);
  context.lineTo(width - r, 0);
  context.arcTo(width, 0, width, r, r);
  context.lineTo(width, height - r);
  context.arcTo(width, height, width - r, height, r);
  context.lineTo(r, height);
  context.arcTo(0, height, 0, height - r, r);
  context.lineTo(0, r);
  context.arcTo(0, 0, r, 0, r);
  context.closePath();
};

/** The frame's size for these settings, longest side `long`. */
export const frameSize = (settings: LogoSettings, long: number) => {
  const aspect = settings.shape === 'square' ? 1 : settings.crop.w / Math.max(1, settings.crop.h);
  return aspect >= 1 ? { width: long, height: Math.max(1, Math.round(long / aspect)) } : { width: Math.max(1, Math.round(long * aspect)), height: long };
};

/** How large the finished logo should be: its own detail, no blow-up past it, at most 1024 px. */
export const outputLong = (settings: LogoSettings) =>
  Math.round(Math.min(1024, Math.max(256, Math.max(settings.crop.w, settings.crop.h) * Math.max(1, settings.scale))));

/** The finished logo: the crop, fitted into its frame, the corners rounded. */
export const renderLogo = (image: HTMLImageElement | HTMLCanvasElement, settings: LogoSettings, long = outputLong(settings)): HTMLCanvasElement => {
  const { width, height } = frameSize(settings, long);
  const canvas = canvasOf(width, height);
  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  roundedRect(context, width, height, (settings.corners / 100) * (Math.min(width, height) / 2));
  context.clip();
  if (settings.background) {
    context.fillStyle = settings.background;
    context.fillRect(0, 0, width, height);
  }
  const { crop } = settings;
  const fit = Math.min(width / crop.w, height / crop.h) * settings.scale;
  const drawnWidth = crop.w * fit;
  const drawnHeight = crop.h * fit;
  const x = (width - drawnWidth) / 2 + settings.pan.x * width;
  const y = (height - drawnHeight) / 2 + settings.pan.y * height;
  context.drawImage(image, crop.x, crop.y, crop.w, crop.h, x, y, drawnWidth, drawnHeight);
  return canvas;
};
