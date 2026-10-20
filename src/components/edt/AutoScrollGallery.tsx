import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { useGalleryMotion } from '../../edt/galleryConfig';

interface AutoScrollGalleryProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Key of an item; clones get a suffix. */
  itemKey: (item: T, index: number) => string;
  /** Pixels per second while it drives itself, before the admin's speed factor. */
  speed?: number;
  /**
   * 1 runs right to left (the content travels left), -1 the other way.
   * Leave it out to follow the site's setting (Admin → Look).
   */
  direction?: 1 | -1;
  /** Tailwind classes for the gap between items, e.g. "gap-5". */
  gapClassName?: string;
  className?: string;
  /** Slow down, and let the pointer steer, while it is over this element instead of the strip itself. */
  regionRef?: React.RefObject<HTMLElement>;
  /** The two direction cues at the sides, lit by the half the pointer is on. */
  arrows?: boolean;
  /** Cues on a dark band. */
  tone?: 'light' | 'dark';
  label: string;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Every reel runs a third faster than it was first designed to; the admin's
 * factor goes on top of that.
 */
const PACE = 4 / 3;

/** How long manual scrolling (touch, wheel, drag) keeps the autopilot off, in ms. */
const HANDS_OFF_MS = 2400;

/**
 * A strip of cards that drives itself.
 *
 * It runs on its own, endlessly (three copies of the items, re-centred
 * whenever it nears either end), in the direction set in the admin. With the
 * pointer over its section it slows down (by the admin's share) and, unless
 * the admin turned it off, the half of the strip the pointer is on decides
 * which way it runs — the further out, the faster. The cue on that side
 * lights up to say so. Drag it, swipe it, or use a trackpad and it hands
 * over until you let go.
 *
 * The speed is eased towards its target every frame rather than switched, so
 * slowing down, turning round and picking up again glide instead of jerk.
 *
 * It moves by scrolling, not by animating a transform, so every manual way of
 * moving a list (touch, trackpad, keyboard) works on the very same position
 * the autopilot drives. Off screen it does nothing at all.
 */
function AutoScrollGallery<T>({
  items,
  renderItem,
  itemKey,
  speed = 38,
  direction,
  gapClassName = 'gap-5',
  className = '',
  regionRef,
  arrows = true,
  tone = 'light',
  label,
}: AutoScrollGalleryProps<T>) {
  const motion = useGalleryMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const firstSet = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [lit, setLit] = useState<-1 | 0 | 1>(0);
  const hoverRef = useRef(false);
  /** Where the pointer is across the strip, 0–1; null when it is not over the region. */
  const pointerX = useRef<number | null>(null);
  const steerSign = useRef<1 | -1>(1);
  const velocity = useRef(0);
  const touchedAt = useRef(0);
  const inView = useRef(false);
  const position = useRef(0);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const baseDirection: 1 | -1 = direction ?? (motion.direction === 'ltr' ? -1 : 1);
  const settings = useRef({ speed: speed * PACE * motion.speed, base: baseDirection, slow: motion.hoverSlowdown, follow: motion.followPointer });
  settings.current = { speed: speed * PACE * motion.speed, base: baseDirection, slow: motion.hoverSlowdown, follow: motion.followPointer };

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
    const width = setWidth();
    if (width) {
      strip.scrollLeft = width;
      position.current = strip.scrollLeft;
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting;
    });
    observer.observe(strip);
    const onResize = () => {
      recentre();
      position.current = strip.scrollLeft;
    };
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [items.length, recentre, setWidth]);

  // One frame loop: work out the speed it should have, ease towards it, move.
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
        const { speed: pace, base, slow, follow } = settings.current;
        const handsOff = Date.now() - touchedAt.current > HANDS_OFF_MS;
        let target = 0;
        if (handsOff && !reduced) {
          if (hoverRef.current) {
            let sign: 1 | -1 = base;
            let boost = 1;
            const x = pointerX.current;
            if (follow && x !== null) {
              // A narrow dead band in the middle keeps the direction it had,
              // so a pointer resting near the centre does not flicker it.
              if (x < 0.46) steerSign.current = -1;
              else if (x > 0.54) steerSign.current = 1;
              sign = steerSign.current;
              const out = Math.max(0, (Math.abs(x - 0.5) - 0.1) / 0.4);
              boost = 1 + 1.6 * out * out;
            }
            target = pace * slow * boost * sign;
          } else {
            target = pace * base;
          }
        }
        // Ease the speed: about a quarter of a second to settle.
        velocity.current += (target - velocity.current) * (1 - Math.exp(-dt * 5));
        if (Math.abs(velocity.current) > 0.05) {
          position.current += velocity.current * dt;
          strip.scrollLeft = position.current;
          const before = strip.scrollLeft;
          recentre();
          if (strip.scrollLeft !== before) position.current += strip.scrollLeft - before;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [items.length, recentre]);

  // The pointer over the region slows the strip and, if allowed, steers it.
  // Re-run once the items arrive: before that there is no strip to measure,
  // and reels whose cards are fetched (the fleet, the tours) used to end up
  // with no pointer handling at all.
  const hasItems = items.length > 0;
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
      pointerX.current = null;
      setHover(false);
      setLit(0);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      if (!hoverRef.current) {
        hoverRef.current = true;
        setHover(true);
      }
      const box = strip.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
      pointerX.current = x;
      if (settings.current.follow) setLit(x < 0.46 ? -1 : x > 0.54 ? 1 : (steerSign.current as -1 | 1));
      else setLit(settings.current.base);
    };
    region.addEventListener('pointerenter', enter);
    region.addEventListener('pointerleave', leave);
    region.addEventListener('pointermove', move);
    return () => {
      region.removeEventListener('pointerenter', enter);
      region.removeEventListener('pointerleave', leave);
      region.removeEventListener('pointermove', move);
    };
  }, [regionRef, hasItems]);

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
      velocity.current = 0;
    }
  };

  const endDrag = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    recentre();
    position.current = scroller.current?.scrollLeft ?? 0;
    if (moved) {
      // Hand straight back to the pointer rather than waiting out the touch pause.
      touchedAt.current = 0;
      // Swallow the click that ends a drag, so dragging over a card does not open it.
      const swallow = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 60);
    }
  };

  if (!items.length) return null;

  return (
    <div className={`relative ${className}`} role="region" aria-label={label}>
      <div
        ref={scroller}
        tabIndex={0}
        className={`edt-gallery flex overflow-x-auto overscroll-x-contain outline-none ${hover ? 'cursor-grab' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onTouchStart={() => { touchedAt.current = Date.now(); }}
        onWheel={(event) => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) touchedAt.current = Date.now(); }}
        onKeyDown={() => { touchedAt.current = Date.now(); }}
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
        // Not buttons: they show which way the reel is going, and the pointer
        // being on their half is what turns them on.
        <div className={`gallery-cues pointer-events-none absolute inset-y-0 left-0 right-0 hidden md:block ${hover ? 'is-hover' : ''}`} data-tone={tone} aria-hidden="true">
          <span className="gallery-cue gallery-cue-left" data-on={lit === -1}>
            <HiChevronLeft className="gallery-cue-icon" />
          </span>
          <span className="gallery-cue gallery-cue-right" data-on={lit === 1}>
            <HiChevronRight className="gallery-cue-icon" />
          </span>
        </div>
      )}
    </div>
  );
}

export default AutoScrollGallery;
