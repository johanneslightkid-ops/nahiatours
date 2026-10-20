import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

interface AutoScrollGalleryProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key of an item; clones get a suffix. */
  itemKey: (item: T, index: number) => string;
  /** Pixels per second while it drives itself. */
  speed?: number;
  /** 1 runs right to left (the content travels left), -1 the other way. */
  direction?: 1 | -1;
  /** Tailwind classes for the gap between items, e.g. "gap-5". */
  gapClassName?: string;
  className?: string;
  /** Pause and hand over control while the pointer is over this element instead of the strip itself. */
  regionRef?: React.RefObject<HTMLElement>;
  arrows?: boolean;
  /** Arrow buttons on a dark band. */
  tone?: 'light' | 'dark';
  label: string;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** How close to an edge the pointer has to be to steer, as a share of the width. */
const EDGE = 0.2;

/**
 * A strip of cards that drives itself, and hands the wheel over the moment
 * you reach for it.
 *
 * It runs on its own, endlessly (three copies of the items, re-centred
 * whenever it nears either end). Put the pointer anywhere over the section and
 * it stops dead; from then on it is yours: hold the pointer near the left or
 * right edge and it glides that way — the closer, the faster — drag it, swipe
 * it, use the arrows or a trackpad. Take the pointer away and it carries on.
 *
 * It moves by scrolling, not by animating a transform, so every manual way
 * of moving a list (touch, trackpad, keyboard, the arrows) works on the very
 * same position the autopilot drives. Off screen it does nothing at all.
 */
function AutoScrollGallery<T>({
  items,
  renderItem,
  itemKey,
  speed = 38,
  direction = 1,
  gapClassName = 'gap-5',
  className = '',
  regionRef,
  arrows = true,
  tone = 'light',
  label,
}: AutoScrollGalleryProps<T>) {
  const scroller = useRef<HTMLDivElement>(null);
  const firstSet = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const hoverRef = useRef(false);
  const steer = useRef(0);
  const touchedAt = useRef(0);
  const inView = useRef(false);
  const position = useRef(0);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const copies = useMemo(() => (items.length ? [0, 1, 2] : []), [items.length]);

  /** Width of one full set of items, gap included. */
  const setWidth = useCallback(() => {
    const strip = scroller.current;
    const first = firstSet.current;
    if (!strip || !first) return 0;
    const second = first.nextElementSibling as HTMLElement | null;
    return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
  }, []);

  /** Keep the view inside the middle copy, so there is always more either way. */
  const recentre = useCallback(() => {
    const strip = scroller.current;
    const width = setWidth();
    if (!strip || !width) return;
    if (strip.scrollLeft < width * 0.5) strip.scrollLeft += width;
    else if (strip.scrollLeft > width * 1.5) strip.scrollLeft -= width;
  }, [setWidth]);

  useEffect(() => {
    const strip = scroller.current;
    if (!strip || !items.length) return undefined;
    // Start in the middle copy.
    const start = () => {
      const width = setWidth();
      if (width) {
        strip.scrollLeft = width;
        position.current = strip.scrollLeft;
      }
    };
    start();
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting;
    });
    observer.observe(strip);
    const onResize = () => recentre();
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [items.length, recentre, setWidth]);

  // The autopilot and the edge steering share one frame loop.
  useEffect(() => {
    if (!items.length) return undefined;
    const reduced = prefersReducedMotion();
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const strip = scroller.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (strip && inView.current && !drag.current) {
        // Someone scrolled it by hand since the last frame: take their position.
        if (Math.abs(strip.scrollLeft - position.current) > 2) position.current = strip.scrollLeft;
        const idle = Date.now() - touchedAt.current > 2600;
        let velocity = 0;
        if (hoverRef.current) velocity = steer.current;
        else if (idle && !reduced) velocity = speed * direction;
        if (velocity) {
          position.current += velocity * dt;
          strip.scrollLeft = position.current;
          const before = strip.scrollLeft;
          recentre();
          if (strip.scrollLeft !== before) position.current = strip.scrollLeft;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [items.length, speed, direction, recentre]);

  // Hovering the region (or the strip) stops it and turns the edges into a throttle.
  useEffect(() => {
    const region = regionRef?.current ?? scroller.current;
    const strip = scroller.current;
    if (!region || !strip) return undefined;
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      hoverRef.current = true;
      setHover(true);
    };
    const leave = () => {
      hoverRef.current = false;
      steer.current = 0;
      setHover(false);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const box = strip.getBoundingClientRect();
      if (event.clientY < box.top - 40 || event.clientY > box.bottom + 40) {
        steer.current = 0;
        return;
      }
      const x = (event.clientX - box.left) / box.width;
      if (x < EDGE) steer.current = -((EDGE - x) / EDGE) * speed * 9;
      else if (x > 1 - EDGE) steer.current = ((x - (1 - EDGE)) / EDGE) * speed * 9;
      else steer.current = 0;
    };
    region.addEventListener('pointerenter', enter);
    region.addEventListener('pointerleave', leave);
    region.addEventListener('pointermove', move);
    return () => {
      region.removeEventListener('pointerenter', enter);
      region.removeEventListener('pointerleave', leave);
      region.removeEventListener('pointermove', move);
    };
  }, [regionRef, speed]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    touchedAt.current = Date.now();
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag.current = { x: event.clientX, left: scroller.current?.scrollLeft ?? 0, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const strip = scroller.current;
    if (!drag.current || !strip) return;
    const dx = event.clientX - drag.current.x;
    if (Math.abs(dx) > 5) drag.current.moved = true;
    if (drag.current.moved) {
      strip.scrollLeft = drag.current.left - dx;
      position.current = strip.scrollLeft;
    }
  };

  const endDrag = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    recentre();
    position.current = scroller.current?.scrollLeft ?? 0;
    if (moved) {
      // Swallow the click that ends a drag, so dragging over a card does not open it.
      const swallow = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 60);
    }
  };

  const nudge = (sign: 1 | -1) => {
    const strip = scroller.current;
    if (!strip) return;
    touchedAt.current = Date.now();
    strip.scrollBy({ left: sign * strip.clientWidth * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    window.setTimeout(() => {
      recentre();
      position.current = strip.scrollLeft;
    }, 650);
  };

  if (!items.length) return null;

  const arrowClass =
    tone === 'dark'
      ? 'bg-white/10 text-white ring-1 ring-white/30 hover:bg-white hover:text-ink'
      : 'bg-white text-ink ring-1 ring-ink/10 hover:bg-ink hover:text-paper';

  return (
    <div className={`relative ${className}`} role="region" aria-label={label}>
      <div
        ref={scroller}
        className={`edt-gallery flex overflow-x-auto overscroll-x-contain ${hover ? 'cursor-grab' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onTouchStart={() => { touchedAt.current = Date.now(); }}
        onWheel={() => { touchedAt.current = Date.now(); }}
      >
        {copies.map((copy) => (
          <div
            key={copy}
            ref={copy === 0 ? firstSet : undefined}
            className={`flex shrink-0 ${gapClassName} pr-5`}
            // The copies either side are there to be seen and clicked while
            // the strip loops; screen readers hear the middle one only.
            aria-hidden={copy === 1 ? undefined : true}
          >
            {items.map((item, index) => (
              <React.Fragment key={`${itemKey(item, index)}-${copy}`}>{renderItem(item, index)}</React.Fragment>
            ))}
          </div>
        ))}
      </div>

      {arrows && (
        <div className={`pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-2 transition-opacity duration-300 md:flex ${hover ? 'opacity-100' : 'opacity-0'}`}>
          <button
            type="button"
            onClick={() => nudge(-1)}
            className={`pointer-events-auto grid h-12 w-12 place-items-center rounded-full shadow-ink transition ${arrowClass}`}
            aria-label="Previous"
          >
            <HiChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            className={`pointer-events-auto grid h-12 w-12 place-items-center rounded-full shadow-ink transition ${arrowClass}`}
            aria-label="Next"
          >
            <HiChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

export default AutoScrollGallery;
