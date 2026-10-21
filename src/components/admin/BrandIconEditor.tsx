import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  colourAt,
  contentBounds,
  cropCanvas,
  detectBackground,
  hex,
  loadImage,
  LogoSettings,
  outputLong,
  pixelsOf,
  Rect,
  removeColour,
  renderLogo,
  rgbOf,
  toBlob,
} from '../../lib/logoImage';
import { cloudinaryAi, CloudinaryAiEffect, UPSCALE_MAX_PIXELS } from '../../lib/cloudinaryAi';

interface BrandIconEditorProps {
  /** The picture to work from: a file just picked, or the current logo. */
  file: File;
  onCancel: () => void;
  /** Receives the finished logo, ready to upload. */
  onApply: (file: File) => void;
  busy?: boolean;
}

type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type Source = { canvas: HTMLCanvasElement; label: string };

const WORK_MAX_HEIGHT = 380;
const PREVIEW_LONG = 300;
const MIN_CROP = 8;

/** A light/grey checkerboard: what shows through is transparent. */
const CHECKER: React.CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage:
    'linear-gradient(45deg, #e6e2da 25%, transparent 25%), linear-gradient(-45deg, #e6e2da 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e6e2da 75%), linear-gradient(-45deg, transparent 75%, #e6e2da 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
};

const full = (canvas: HTMLCanvasElement): Rect => ({ x: 0, y: 0, w: canvas.width, h: canvas.height });

const HANDLES: Array<{ handle: Handle; className: string; cursor: string }> = [
  { handle: 'nw', className: '-left-1.5 -top-1.5', cursor: 'nwse-resize' },
  { handle: 'ne', className: '-right-1.5 -top-1.5', cursor: 'nesw-resize' },
  { handle: 'sw', className: '-bottom-1.5 -left-1.5', cursor: 'nesw-resize' },
  { handle: 'se', className: '-bottom-1.5 -right-1.5', cursor: 'nwse-resize' },
  { handle: 'n', className: 'left-1/2 -top-1.5 -translate-x-1/2', cursor: 'ns-resize' },
  { handle: 's', className: 'left-1/2 -bottom-1.5 -translate-x-1/2', cursor: 'ns-resize' },
  { handle: 'w', className: '-left-1.5 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { handle: 'e', className: '-right-1.5 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
];

/**
 * The logo studio: everything a logo needs before it goes on the site.
 *
 *  • Crop — drag the box or its handles over the picture, free or 1:1, or
 *    let it fit itself to the logo's content.
 *  • Shape — a square, or the crop's own proportions, whatever size the
 *    upload was.
 *  • Size and position inside that frame, and corners from square (0 %) to
 *    fully round (100 %: a circle when the frame is square, a pill when not).
 *  • Background — kept transparent, or a colour behind the logo.
 *  • Remove a colour — the logo's plain background made transparent, picked
 *    by eyedropper or found on its own, softened at the edge so no halo stays.
 *  • With Cloudinary's AI: remove any background, and upscale 4× with detail
 *    added (both on the part inside the crop).
 *
 * Everything but the two AI steps runs in this browser. The result is a PNG
 * (transparency kept), at the logo's own detail and at most 1024 px.
 */
const BrandIconEditor: React.FC<BrandIconEditorProps> = ({ file, onCancel, onApply, busy = false }) => {
  const [history, setHistory] = useState<Source[]>([]);
  const source = history[history.length - 1]?.canvas ?? null;
  const [settings, setSettings] = useState<LogoSettings | null>(null);
  const [ratio, setRatio] = useState<'free' | 'square'>('free');
  const [colour, setColour] = useState('#ffffff');
  const [tolerance, setTolerance] = useState(22);
  const [edgesOnly, setEdgesOnly] = useState(true);
  const [picking, setPicking] = useState(false);
  const [working, setWorking] = useState<'' | 'colour' | CloudinaryAiEffect>('');
  const [message, setMessage] = useState<{ tone: 'info' | 'error' | 'ok'; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const workBox = useRef<HTMLDivElement>(null);
  const workCanvas = useRef<HTMLCanvasElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const [workWidth, setWorkWidth] = useState(520);
  const drag = useRef<{ handle: Handle; x: number; y: number; crop: Rect } | null>(null);
  const panDrag = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);

  // The picture, as a canvas every tool can read and write.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    let alive = true;
    loadImage(url)
      .then((image) => {
        if (!alive) return;
        const { canvas } = pixelsOf(image);
        setHistory([{ canvas, label: 'Original' }]);
        const aspect = canvas.width / canvas.height;
        setSettings({
          crop: full(canvas),
          shape: Math.abs(aspect - 1) < 0.08 ? 'square' : 'original',
          scale: 1,
          pan: { x: 0, y: 0 },
          corners: 0,
          background: null,
        });
        const found = detectBackground(canvas);
        if (found) setColour(hex(found));
      })
      .catch(() => setMessage({ tone: 'error', text: 'No se pudo leer esa imagen.' }));
    return () => {
      alive = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // How wide the work area is.
  useLayoutEffect(() => {
    const box = workBox.current;
    if (!box) return undefined;
    const measure = () => setWorkWidth(Math.max(120, box.clientWidth - 20));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const view = useMemo(() => {
    if (!source) return { scale: 1, width: 0, height: 0 };
    const scale = Math.min(workWidth / source.width, WORK_MAX_HEIGHT / source.height, 4);
    return { scale, width: Math.round(source.width * scale), height: Math.round(source.height * scale) };
  }, [source, workWidth]);

  // The picture in the work area.
  useEffect(() => {
    const canvas = workCanvas.current;
    if (!canvas || !source || !view.width) return;
    canvas.width = view.width;
    canvas.height = view.height;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, view.width, view.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, view.width, view.height);
  }, [source, view]);

  // The result, redrawn on every change.
  useEffect(() => {
    if (!source || !settings) return undefined;
    const frame = requestAnimationFrame(() => {
      const result = renderLogo(source, settings, PREVIEW_LONG);
      const canvas = previewCanvas.current;
      if (canvas) {
        canvas.width = result.width;
        canvas.height = result.height;
        canvas.getContext('2d')!.drawImage(result, 0, 0);
      }
      setPreviewUrl(result.toDataURL('image/png'));
    });
    return () => cancelAnimationFrame(frame);
  }, [source, settings]);

  const update = useCallback((patch: Partial<LogoSettings>) => setSettings((current) => (current ? { ...current, ...patch } : current)), []);

  const squareCrop = useCallback(
    (crop: Rect): Rect => {
      if (!source) return crop;
      const side = Math.min(crop.w, crop.h, source.width, source.height);
      const x = Math.min(Math.max(0, crop.x + (crop.w - side) / 2), source.width - side);
      const y = Math.min(Math.max(0, crop.y + (crop.h - side) / 2), source.height - side);
      return { x, y, w: side, h: side };
    },
    [source]
  );

  const setCropRatio = (next: 'free' | 'square') => {
    setRatio(next);
    if (next === 'square' && settings) update({ crop: squareCrop(settings.crop) });
  };

  /** A new picture to work from (a colour removed, an AI result); `crop` where the old one no longer fits. */
  const pushSource = (canvas: HTMLCanvasElement, label: string, crop?: Rect) => {
    setHistory((list) => [...list, { canvas, label }]);
    if (crop) update({ crop: ratio === 'square' ? squareOf(crop) : crop, pan: { x: 0, y: 0 } });
  };
  const squareOf = (crop: Rect) => {
    const side = Math.min(crop.w, crop.h);
    return { x: crop.x + (crop.w - side) / 2, y: crop.y + (crop.h - side) / 2, w: side, h: side };
  };

  const undo = () => {
    if (history.length < 2 || !source) return;
    const previous = history[history.length - 2].canvas;
    setHistory((list) => list.slice(0, -1));
    // A colour removal keeps the size, and so the crop; an AI step does not.
    if (previous.width !== source.width || previous.height !== source.height) update({ crop: full(previous), pan: { x: 0, y: 0 } });
    setMessage(null);
  };

  const restore = () => {
    if (history.length < 2) return;
    setHistory((list) => list.slice(0, 1));
    update({ crop: full(history[0].canvas), pan: { x: 0, y: 0 } });
    setMessage(null);
  };

  // ── Crop box ────────────────────────────────────────────────────────────
  const startCrop = (handle: Handle) => (event: React.PointerEvent) => {
    if (!settings || picking) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { handle, x: event.clientX, y: event.clientY, crop: settings.crop };
  };

  const moveCrop = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state || !source || !settings) return;
    const dx = (event.clientX - state.x) / view.scale;
    const dy = (event.clientY - state.y) / view.scale;
    const start = state.crop;
    let { x, y, w, h } = start;
    const W = source.width;
    const H = source.height;
    if (state.handle === 'move') {
      x = Math.min(Math.max(0, start.x + dx), W - w);
      y = Math.min(Math.max(0, start.y + dy), H - h);
    } else {
      const left = state.handle.includes('w');
      const right = state.handle.includes('e');
      const top = state.handle.includes('n');
      const bottom = state.handle.includes('s');
      if (left) {
        x = Math.min(Math.max(0, start.x + dx), start.x + start.w - MIN_CROP);
        w = start.x + start.w - x;
      }
      if (right) w = Math.min(Math.max(MIN_CROP, start.w + dx), W - start.x);
      if (top) {
        y = Math.min(Math.max(0, start.y + dy), start.y + start.h - MIN_CROP);
        h = start.y + start.h - y;
      }
      if (bottom) h = Math.min(Math.max(MIN_CROP, start.h + dy), H - start.y);
      if (ratio === 'square') {
        // Keep 1:1: the side follows the larger pull, anchored on the opposite edge.
        let side = left || right ? (top || bottom ? Math.max(w, h) : w) : h;
        const maxW = left ? start.x + start.w : W - start.x;
        const maxH = top ? start.y + start.h : H - start.y;
        side = Math.max(MIN_CROP, Math.min(side, maxW, maxH));
        if (left) x = start.x + start.w - side;
        if (top) y = start.y + start.h - side;
        if (!left && !right) x = Math.min(Math.max(0, start.x + (start.w - side) / 2), W - side);
        if (!top && !bottom) y = Math.min(Math.max(0, start.y + (start.h - side) / 2), H - side);
        w = side;
        h = side;
      }
    }
    update({ crop: { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) } });
  };

  const endCrop = () => {
    drag.current = null;
  };

  const pickColour = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!picking || !source) return;
    const box = event.currentTarget.getBoundingClientRect();
    const rgb = colourAt(source, (event.clientX - box.left) / view.scale, (event.clientY - box.top) / view.scale);
    setColour(hex(rgb));
    setPicking(false);
    setMessage({ tone: 'info', text: `Color elegido: ${hex(rgb).toUpperCase()}. Ajusta la tolerancia y pulsa «Hacer transparente».` });
  };

  // ── Tools ───────────────────────────────────────────────────────────────
  const applyColour = () => {
    if (!source) return;
    setWorking('colour');
    // Next frame, so the button shows it is working on a large picture.
    requestAnimationFrame(() => {
      try {
        pushSource(removeColour(source, rgbOf(colour), tolerance, edgesOnly), `Sin ${colour.toUpperCase()}`);
        setMessage({ tone: 'ok', text: 'Color quitado. «Deshacer» lo devuelve.' });
      } catch {
        setMessage({ tone: 'error', text: 'No se pudo quitar el color.' });
      } finally {
        setWorking('');
      }
    });
  };

  const runAi = async (effect: CloudinaryAiEffect) => {
    if (!source || !settings) return;
    const region = cropCanvas(source, settings.crop);
    if (effect === 'upscale' && region.width * region.height >= UPSCALE_MAX_PIXELS) {
      setMessage({ tone: 'error', text: 'Para mejorar con IA la imagen debe tener menos de 4,2 megapíxeles: recórtala o úsala tal cual (ya tiene buena resolución).' });
      return;
    }
    setWorking(effect);
    setMessage({ tone: 'info', text: 'Subiendo a Cloudinary…' });
    try {
      const blob = await cloudinaryAi(await toBlob(region), effect, (text) => setMessage({ tone: 'info', text }));
      const url = URL.createObjectURL(blob);
      let canvas: HTMLCanvasElement;
      try {
        canvas = pixelsOf(await loadImage(url)).canvas;
      } finally {
        URL.revokeObjectURL(url);
      }
      // A 4× upscale of a large crop is more than any logo needs, and heavy to edit.
      const longest = Math.max(canvas.width, canvas.height);
      if (longest > 4096) {
        const factor = 4096 / longest;
        const smaller = document.createElement('canvas');
        smaller.width = Math.round(canvas.width * factor);
        smaller.height = Math.round(canvas.height * factor);
        const context = smaller.getContext('2d')!;
        context.imageSmoothingQuality = 'high';
        context.drawImage(canvas, 0, 0, smaller.width, smaller.height);
        canvas = smaller;
      }
      pushSource(canvas, effect === 'upscale' ? 'Mejorado con IA' : 'Fondo quitado con IA', full(canvas));
      setMessage({
        tone: 'ok',
        text: effect === 'upscale' ? `Listo: ${region.width}×${region.height} → ${canvas.width}×${canvas.height} px.` : 'Listo: fondo quitado. «Deshacer» lo devuelve.',
      });
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setWorking('');
    }
  };

  const fitContent = () => {
    if (!source) return;
    const bounds = contentBounds(source, detectBackground(source));
    update({ crop: ratio === 'square' ? expandToSquare(bounds) : bounds, pan: { x: 0, y: 0 } });
  };
  const expandToSquare = (bounds: Rect) => {
    if (!source) return bounds;
    const side = Math.min(Math.max(bounds.w, bounds.h), source.width, source.height);
    return {
      x: Math.min(Math.max(0, bounds.x + (bounds.w - side) / 2), source.width - side),
      y: Math.min(Math.max(0, bounds.y + (bounds.h - side) / 2), source.height - side),
      w: side,
      h: side,
    };
  };

  // ── Position inside the frame: drag the result ──────────────────────────
  const startPan = (event: React.PointerEvent) => {
    if (!settings) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    panDrag.current = { x: event.clientX, y: event.clientY, pan: settings.pan };
  };
  const movePan = (event: React.PointerEvent<HTMLElement>) => {
    const state = panDrag.current;
    if (!state) return;
    const box = event.currentTarget.getBoundingClientRect();
    update({
      pan: {
        x: Math.max(-0.75, Math.min(0.75, state.pan.x + (event.clientX - state.x) / box.width)),
        y: Math.max(-0.75, Math.min(0.75, state.pan.y + (event.clientY - state.y) / box.height)),
      },
    });
  };
  const endPan = () => {
    panDrag.current = null;
  };

  const handleApply = async () => {
    if (!source || !settings) return;
    const result = renderLogo(source, settings);
    const blob = await toBlob(result);
    const name = file.name.replace(/\.[^.]+$/, '') || 'logo';
    onApply(new File([blob], `${name}.png`, { type: 'image/png' }));
  };

  const crop = settings?.crop;
  const finalSize = settings ? (() => {
    const long = outputLong(settings);
    const aspect = settings.shape === 'square' ? 1 : settings.crop.w / settings.crop.h;
    return aspect >= 1 ? `${long}×${Math.round(long / aspect)}` : `${Math.round(long * aspect)}×${long}`;
  })() : '';
  const small = crop ? Math.max(crop.w, crop.h) < 500 : false;

  const segmented = (options: Array<{ value: string; label: string }>, value: string, onChange: (value: string) => void) => (
    <div className="inline-flex rounded-full bg-ink/5 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${value === option.value ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const label = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft';
  const smallButton = 'rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold text-ink transition hover:bg-ink hover:text-paper disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-ink/60 p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Editar el logo">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[22px] border border-ink/15 bg-paper p-5 shadow-ink-lg sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">Editar el logo</h3>
            <p className="text-xs font-semibold text-ink-light">
              Arrastra el recuadro o sus esquinas para recortar. A la derecha, lo que se verá en el sitio; arrástralo para moverlo dentro de su marco.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={undo} disabled={history.length < 2 || Boolean(working)} className={smallButton}>
              Deshacer{history.length > 1 ? ` «${history[history.length - 1].label}»` : ''}
            </button>
            <button type="button" onClick={restore} disabled={history.length < 2 || Boolean(working)} className={smallButton}>
              Original
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr,1fr]">
          {/* The picture and its crop. */}
          <div>
            <div ref={workBox} className="flex w-full justify-center">
              {/* The dark frame gives the crop handles room at the picture's edges. */}
              <div className="overflow-hidden rounded-xl bg-ink/80 p-2.5 ring-1 ring-ink/15">
              <div
                className="relative touch-none select-none"
                style={{ ...CHECKER, width: view.width || '100%', height: view.height || 240 }}
                onPointerMove={moveCrop}
                onPointerUp={endCrop}
                onPointerCancel={endCrop}
              >
                <canvas
                  ref={workCanvas}
                  className="absolute inset-0"
                  style={{ cursor: picking ? 'crosshair' : 'default' }}
                  onClick={pickColour}
                />
                {crop && !picking && (
                  <div
                    className="absolute border-2 border-white outline outline-1 outline-ink/60"
                    style={{
                      left: crop.x * view.scale,
                      top: crop.y * view.scale,
                      width: crop.w * view.scale,
                      height: crop.h * view.scale,
                      boxShadow: '0 0 0 9999px rgb(20 22 26 / 0.45)',
                      cursor: 'move',
                    }}
                    onPointerDown={startCrop('move')}
                  >
                    {HANDLES.map(({ handle, className, cursor }) => (
                      <span
                        key={handle}
                        className={`absolute h-3 w-3 rounded-sm border border-ink/70 bg-white ${className}`}
                        style={{ cursor }}
                        onPointerDown={startCrop(handle)}
                      />
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">Recorte</span>
              {segmented(
                [
                  { value: 'free', label: 'Libre' },
                  { value: 'square', label: '1:1' },
                ],
                ratio,
                (value) => setCropRatio(value as 'free' | 'square')
              )}
              <button type="button" className={smallButton} onClick={() => source && update({ crop: ratio === 'square' ? squareCrop(full(source)) : full(source), pan: { x: 0, y: 0 } })}>
                Todo
              </button>
              <button type="button" className={smallButton} onClick={fitContent}>
                Ajustar al contenido
              </button>
              {crop && <span className="ml-auto text-xs text-ink-light">{crop.w}×{crop.h} px</span>}
            </div>

            {/* Remove a colour. */}
            <div className="mt-5 rounded-2xl border border-ink/10 p-4">
              <span className={label}>Hacer transparente un color de fondo</span>
              <div className="flex flex-wrap items-center gap-2">
                <input type="color" value={colour} onChange={(event) => setColour(event.target.value)} className="h-9 w-12 cursor-pointer rounded border border-ink/15 bg-white" aria-label="Color a quitar" />
                <button type="button" className={`${smallButton} ${picking ? 'bg-ink text-paper' : ''}`} onClick={() => setPicking((value) => !value)}>
                  {picking ? 'Haz clic en la imagen…' : 'Cuentagotas'}
                </button>
                <button
                  type="button"
                  className={smallButton}
                  onClick={() => {
                    const found = source && detectBackground(source);
                    if (found) setColour(hex(found));
                    setMessage(found ? { tone: 'info', text: `Fondo detectado: ${hex(found).toUpperCase()}.` } : { tone: 'info', text: 'El borde ya es transparente.' });
                  }}
                >
                  Detectar
                </button>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                  <input type="checkbox" checked={edgesOnly} onChange={(event) => setEdgesOnly(event.target.checked)} />
                  Solo lo que toca el borde
                </label>
              </div>
              <label className="mt-3 block text-xs font-semibold text-ink-soft">
                Tolerancia · {tolerance}
                <input type="range" min={1} max={80} value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))} className="w-full accent-mango-dark" />
              </label>
              <button
                type="button"
                onClick={applyColour}
                disabled={!source || Boolean(working)}
                className="mt-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper disabled:opacity-40"
              >
                {working === 'colour' ? 'Quitando…' : 'Hacer transparente'}
              </button>
            </div>

            {/* AI. */}
            <div className="mt-4 rounded-2xl border border-ink/10 p-4">
              <span className={label}>Con IA (Cloudinary)</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runAi('background_removal')}
                  disabled={!source || Boolean(working)}
                  className="rounded-full bg-lagoon-dark px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {working === 'background_removal' ? 'Quitando el fondo…' : 'Quitar el fondo con IA'}
                </button>
                <button
                  type="button"
                  onClick={() => runAi('upscale')}
                  disabled={!source || Boolean(working)}
                  className="rounded-full bg-grape px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {working === 'upscale' ? 'Mejorando…' : 'Mejorar calidad con IA (×4)'}
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-light">
                Trabajan sobre lo que hay dentro del recorte. «Quitar el fondo» sirve para cualquier fondo, no solo uno liso; «Mejorar calidad»
                cuadruplica ancho y alto añadiendo detalle. Usan créditos de Cloudinary y pueden tardar hasta un minuto.
                {small && ' Tu recorte es pequeño: mejorarlo con IA dará un logo mucho más nítido.'}
                {crop && Math.max(crop.w, crop.h) >= 1024 && ' Tu recorte ya tiene resolución de sobra (el logo final mide como mucho 1024 px): no hace falta mejorarlo.'}
              </p>
            </div>

            {message && (
              <p
                className={`mt-3 text-sm font-semibold ${message.tone === 'error' ? 'text-hibiscus-dark' : message.tone === 'ok' ? 'text-jungle-dark' : 'text-ink-soft'}`}
                role="status"
              >
                {message.text}
              </p>
            )}
          </div>

          {/* The result and its frame. */}
          <div>
            <span className={label}>Resultado · {finalSize} px · PNG</span>
            <div
              className="flex h-[260px] cursor-grab touch-none items-center justify-center rounded-xl ring-1 ring-ink/15 active:cursor-grabbing"
              style={CHECKER}
              onPointerDown={startPan}
              onPointerMove={movePan}
              onPointerUp={endPan}
              onPointerCancel={endPan}
              title="Arrastra para mover el logo dentro de su marco"
            >
              <canvas ref={previewCanvas} className="max-h-[230px] max-w-[90%] drop-shadow" />
            </div>
            {previewUrl && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex h-16 items-center gap-2 rounded-lg bg-paper-warm px-3 ring-1 ring-ink/10">
                  <img src={previewUrl} alt="" className="h-10 w-auto" />
                  <span className="text-[0.65rem] font-semibold text-ink-light">sobre claro</span>
                </div>
                <div className="flex h-16 items-center gap-2 rounded-lg bg-ink px-3">
                  <img src={previewUrl} alt="" className="h-10 w-auto" />
                  <span className="text-[0.65rem] font-semibold text-paper/70">sobre oscuro</span>
                </div>
              </div>
            )}

            {settings && (
              <div className="mt-5 space-y-4">
                <div>
                  <span className={label}>Forma</span>
                  {segmented(
                    [
                      { value: 'square', label: 'Cuadrada' },
                      { value: 'original', label: 'Forma original' },
                    ],
                    settings.shape,
                    (value) => update({ shape: value as LogoSettings['shape'] })
                  )}
                </div>
                <label className="block">
                  <span className={label}>
                    Tamaño en el marco · {Math.round(settings.scale * 100)} %
                    <button type="button" className="ml-2 normal-case text-lagoon-dark underline" onClick={() => update({ scale: 1, pan: { x: 0, y: 0 } })}>
                      centrar
                    </button>
                  </span>
                  <input
                    type="range"
                    min={30}
                    max={200}
                    value={Math.round(settings.scale * 100)}
                    onChange={(event) => update({ scale: Number(event.target.value) / 100 })}
                    className="w-full accent-mango-dark"
                  />
                </label>
                <label className="block">
                  <span className={label}>
                    Esquinas · {settings.corners} % {settings.corners === 0 ? '(rectas)' : settings.corners === 100 ? (settings.shape === 'square' ? '(círculo)' : '(redondeadas del todo)') : ''}
                  </span>
                  <input type="range" min={0} max={100} value={settings.corners} onChange={(event) => update({ corners: Number(event.target.value) })} className="w-full accent-mango-dark" />
                  <span className="flex justify-between text-[0.65rem] text-ink-light">
                    <span>0 % rectangular</span>
                    <span>100 % circular</span>
                  </span>
                </label>
                <div>
                  <span className={label}>Fondo del logo</span>
                  <div className="flex items-center gap-2">
                    {segmented(
                      [
                        { value: 'none', label: 'Transparente' },
                        { value: 'colour', label: 'Color' },
                      ],
                      settings.background ? 'colour' : 'none',
                      (value) => update({ background: value === 'colour' ? settings.background ?? '#ffffff' : null })
                    )}
                    {settings.background && (
                      <input
                        type="color"
                        value={settings.background}
                        onChange={(event) => update({ background: event.target.value })}
                        className="h-8 w-11 cursor-pointer rounded border border-ink/15 bg-white"
                        aria-label="Color de fondo"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="tropical-button-outline disabled:opacity-60">
            Cancelar
          </button>
          <button type="button" onClick={handleApply} disabled={busy || !settings || Boolean(working)} className="tropical-button disabled:opacity-60">
            {busy ? 'Subiendo…' : 'Usar este logo'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandIconEditor;
