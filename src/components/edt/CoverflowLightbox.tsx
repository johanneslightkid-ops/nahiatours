import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { HiChevronLeft, HiChevronRight, HiX } from 'react-icons/hi';

export interface CoverflowItem {
  src: string;
  caption?: string;
  /** A smaller copy for the photographs at the sides. */
  thumb?: string;
}

interface Props {
  items: CoverflowItem[];
  startAt: number;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  closeLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}

/** Scale of the photographs one, two and three places away from the middle. */
const SCALES = [1, 0.5, 0.3, 0.18];
const GAP = 20;

/** Signed shortest distance from `current` to `index` around a ring of `count`. */
const ringOffset = (index: number, current: number, count: number) => {
  let offset = (index - current) % count;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  // With an even count the item exactly opposite would sit on both sides; keep it on the right.
  if (count % 2 === 0 && offset === -count / 2) offset = count / 2;
  return offset;
};

/**
 * A photograph full screen, with its neighbours either side, each one smaller
 * and dimmer the further it is from the middle. The arrows, the keyboard, a
 * swipe or a click on a neighbour bring the next one into the middle, where it
 * gets the frame: a white mount, a fine gold line and its caption plate.
 *
 * Everything that moves is a transform or an opacity (framer-motion springs),
 * so it stays smooth on a phone.
 */
const CoverflowLightbox: React.FC<Props> = ({ items, startAt, onClose, label, closeLabel = 'Close', previousLabel = 'Previous', nextLabel = 'Next' }) => {
  const count = items.length;
  const [current, setCurrent] = useState(() => Math.min(Math.max(0, startAt), Math.max(0, count - 1)));
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth));
  const [height, setHeight] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  const reduced = useReducedMotion();
  const swipe = useRef<{ x: number; y: number } | null>(null);
  /** Width ÷ height of each photograph, learnt as it loads; 3:2 until then. */
  const [aspects, setAspects] = useState<Record<number, number>>({});
  /** The click that ends a swipe must not close the dialog or pick a photograph. */
  const swiped = useRef(false);

  const move = useCallback((delta: number) => setCurrent((value) => (value + delta + count) % count), [count]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = { body: document.body.style.overflow, root: root.style.overflow };
    document.body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') move(1);
      else if (event.key === 'ArrowLeft') move(-1);
    };
    const onResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = previous.body;
      root.style.overflow = previous.root;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [onClose, move]);

  if (!count) return null;

  // Every frame takes its photograph's own shape. The middle one is as big as
  // fits with room for the caption below; the others are scaled copies.
  const maxHeight = Math.max(160, height - 230);
  const maxWidth = width * (width < 640 ? 0.8 : 0.44);
  const sizeOf = (index: number) => {
    const aspect = aspects[index] ?? 1.5;
    const w = Math.min(maxHeight * aspect, maxWidth, 1100);
    return { w, h: w / aspect };
  };
  const reach = Math.min(3, Math.floor((count - 1) / 2) + (count % 2 === 0 ? 1 : 0));
  const centreHeight = sizeOf(current).h;

  /** Horizontal centre of the photograph `offset` places from the middle. */
  const xOf = (offset: number) => {
    const side = Math.sign(offset);
    let x = 0;
    let previous = sizeOf(current).w;
    for (let step = 1; step <= Math.abs(offset); step += 1) {
      const index = (current + side * step + count * 4) % count;
      const scale = SCALES[Math.min(step, SCALES.length - 1)];
      const before = SCALES[Math.min(step - 1, SCALES.length - 1)];
      const w = sizeOf(index).w;
      x += (previous * before) / 2 + GAP * before + (w * scale) / 2;
      previous = w;
    }
    return side * x;
  };

  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 170, damping: 26, mass: 0.9 };
  const caption = items[current]?.caption;

  const onPointerDown = (event: React.PointerEvent) => {
    swipe.current = { x: event.clientX, y: event.clientY };
    swiped.current = false;
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
      swiped.current = true;
      move(dx < 0 ? 1 : -1);
    }
  };

  return createPortal(
    <motion.div
      className="coverflow fixed inset-0 z-[150] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={() => {
        if (!swiped.current) onClose();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="absolute inset-x-0 top-1/2 h-0" style={{ marginTop: -40 }}>
        {items.map((item, index) => {
          const offset = ringOffset(index, current, count);
          if (Math.abs(offset) > reach + 1) return null;
          const depth = Math.abs(offset);
          const hidden = depth > reach;
          const scale = SCALES[Math.min(depth, SCALES.length - 1)];
          const isCurrent = offset === 0;
          const { w: boxWidth, h: boxHeight } = sizeOf(index);
          return (
            <motion.button
              key={`${item.src}-${index}`}
              type="button"
              tabIndex={isCurrent || hidden ? -1 : 0}
              aria-label={item.caption || `${index + 1} / ${count}`}
              aria-hidden={hidden || undefined}
              className={`coverflow-card ${isCurrent ? 'is-current' : ''}`}
              style={{ width: boxWidth, height: boxHeight, left: '50%', top: 0, marginLeft: -boxWidth / 2, marginTop: -boxHeight / 2, zIndex: 10 - depth }}
              initial={{ x: xOf(Math.sign(offset || 1) * (reach + 1)), scale: SCALES[SCALES.length - 1], opacity: 0 }}
              animate={{ x: xOf(offset), scale, opacity: hidden ? 0 : isCurrent ? 1 : depth === 1 ? 0.78 : depth === 2 ? 0.5 : 0.3 }}
              transition={spring}
              onClick={(event) => {
                event.stopPropagation();
                if (!isCurrent && !swiped.current) move(offset);
              }}
            >
              <span className="coverflow-mount">
                <img
                  src={isCurrent ? item.src : item.thumb || item.src}
                  alt={isCurrent ? item.caption || '' : ''}
                  className="h-full w-full object-cover"
                  draggable={false}
                  decoding="async"
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    if (image.naturalWidth && image.naturalHeight && !aspects[index]) {
                      const aspect = image.naturalWidth / image.naturalHeight;
                      setAspects((known) => ({ ...known, [index]: aspect }));
                    }
                  }}
                />
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-6 sm:pb-9" style={{ top: `calc(50% - 40px + ${centreHeight / 2 + 22}px)` }}>
        <motion.div key={current} className="coverflow-plate" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          {caption && <span className="font-display text-xl uppercase leading-none text-white sm:text-2xl">{caption}</span>}
          <span className="font-condensed text-sm font-bold tracking-[0.2em] text-mango-light">
            {String(current + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
          </span>
        </motion.div>
      </div>

      <button type="button" onClick={onClose} className="coverflow-btn absolute right-4 top-4 z-20" aria-label={closeLabel}>
        <HiX className="h-6 w-6" />
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); move(-1); }}
            className="coverflow-btn coverflow-arrow absolute left-3 top-1/2 z-20 sm:left-6"
            style={{ marginTop: -40 }}
            aria-label={previousLabel}
          >
            <HiChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); move(1); }}
            className="coverflow-btn coverflow-arrow absolute right-3 top-1/2 z-20 sm:right-6"
            style={{ marginTop: -40 }}
            aria-label={nextLabel}
          >
            <HiChevronRight className="h-7 w-7" />
          </button>
        </>
      )}
    </motion.div>,
    document.body
  );
};

export default CoverflowLightbox;
