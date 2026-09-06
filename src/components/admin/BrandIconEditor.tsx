import React, { useCallback, useEffect, useRef, useState } from 'react';

interface BrandIconEditorProps {
  /** The file the operator just picked. */
  file: File;
  onCancel: () => void;
  /** Receives the cropped, scaled square ready to upload. */
  onApply: (file: File) => void;
  busy?: boolean;
}

/** The badge is round and fixed-size, so everything is squared off at this. */
const OUTPUT_SIZE = 512;
const PREVIEW_SIZE = 260;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Frames a brand icon before it is uploaded.
 *
 * Uploads used to go straight to Cloudinary and were then `object-cover`'d into
 * a circle, so a photo that was not already square-and-centred lost whatever
 * sat near its edges with no way to influence the result. Here the operator
 * zooms and drags until the round preview shows what they want, and only that
 * framing is uploaded.
 */
const BrandIconEditor: React.FC<BrandIconEditorProps> = ({ file, onCancel, onApply, busy = false }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

  // Object URLs must be revoked, or picking several files leaks each one.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const element = new Image();
    element.onload = () => setImage(element);
    element.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // A new image starts centred and unzoomed.
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [image]);

  /**
   * Keeps the image covering the frame: at any zoom the drawn image is at
   * least as large as the frame, so panning can never expose a blank edge.
   */
  const clampOffset = useCallback(
    (next: { x: number; y: number }, currentZoom: number) => {
      if (!image) return { x: 0, y: 0 };
      const coverScale = Math.max(PREVIEW_SIZE / image.width, PREVIEW_SIZE / image.height);
      const drawnWidth = image.width * coverScale * currentZoom;
      const drawnHeight = image.height * coverScale * currentZoom;
      const maxX = Math.max(0, (drawnWidth - PREVIEW_SIZE) / 2);
      const maxY = Math.max(0, (drawnHeight - PREVIEW_SIZE) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [image]
  );

  const handleZoom = (value: number) => {
    setZoom(value);
    setOffset((current) => clampOffset(current, value));
  };

  const startDrag = (clientX: number, clientY: number) => {
    dragState.current = { x: clientX, y: clientY, originX: offset.x, originY: offset.y };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    const state = dragState.current;
    if (!state) return;
    setOffset(
      clampOffset(
        { x: state.originX + (clientX - state.x), y: state.originY + (clientY - state.y) },
        zoom
      )
    );
  };

  const endDrag = () => {
    dragState.current = null;
  };

  /** Redraws the current framing at full output resolution. */
  const handleApply = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return;

    // The preview is a scaled-down view of this canvas, so the same maths with
    // one ratio applied gives a pixel-accurate match.
    const ratio = OUTPUT_SIZE / PREVIEW_SIZE;
    const coverScale = Math.max(OUTPUT_SIZE / image.width, OUTPUT_SIZE / image.height) * zoom;
    const drawnWidth = image.width * coverScale;
    const drawnHeight = image.height * coverScale;
    const x = (OUTPUT_SIZE - drawnWidth) / 2 + offset.x * ratio;
    const y = (OUTPUT_SIZE - drawnHeight) / 2 + offset.y * ratio;

    context.fillStyle = '#F5F1E8';
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(image, x, y, drawnWidth, drawnHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const name = file.name.replace(/\.[^.]+$/, '') || 'brand-icon';
        onApply(new File([blob], `${name}.png`, { type: 'image/png' }));
      },
      'image/png'
    );
  };

  const coverScale = image ? Math.max(PREVIEW_SIZE / image.width, PREVIEW_SIZE / image.height) : 1;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-ink/60 p-4">
      <div className="w-full max-w-md rounded-[26px] border-[3px] border-ink bg-paper p-6 shadow-ink-lg">
        <h3 className="mb-1 font-display text-xl font-extrabold text-ink">Frame the icon</h3>
        <p className="mb-4 text-xs font-semibold text-ink-light">
          Drag to reposition, use the slider to zoom. The circle is exactly what the site will show.
        </p>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative touch-none overflow-hidden rounded-full border-[3px] border-ink bg-white shadow-ink-sm"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, cursor: image ? 'grab' : 'default' }}
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={endDrag}
          >
            {imageUrl && image && (
              <img
                src={imageUrl}
                alt="Brand icon preview"
                draggable={false}
                className="pointer-events-none absolute select-none"
                style={{
                  width: image.width * coverScale * zoom,
                  height: image.height * coverScale * zoom,
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  maxWidth: 'none',
                }}
              />
            )}
          </div>

          <label className="w-full">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-ink-soft">
              Zoom · {zoom.toFixed(2)}×
            </span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoom(Number(e.target.value))}
              className="w-full accent-mango-dark"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="tropical-button-outline disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={busy || !image}
            className="tropical-button disabled:opacity-60"
          >
            {busy ? 'Uploading…' : 'Use this framing'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandIconEditor;
