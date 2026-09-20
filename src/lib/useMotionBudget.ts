import { useEffect, useState } from 'react';

/**
 * How much motion this device can afford.
 *
 * One decision, made once, in one place. Every animated thing on the site asks
 * this hook rather than checking a breakpoint or a media query of its own —
 * which is what stops the budget being spent three times over by three
 * components that each thought they were the only one moving.
 *
 *   'none'    Nothing animates. The page is a still painting.
 *   'reduced' Things arrive once as you reach them, and nothing loops. This is
 *             what phones get, and it is a complete design, not a degraded
 *             one: the reveals are the part that carries meaning.
 *   'full'    Adds the looping ambient layer, scroll-linked parallax and the
 *             WebGL sea.
 *
 * WHY A PHONE NEVER GETS 'full'. A continuously animating layer is a composited
 * layer the compositor must keep alive and re-raster on every scroll. On a
 * mid-range Android that is the difference between a 60fps scroll and a 40fps
 * one, and the site's visitors are on hotel wifi looking at a phone. The
 * ambient layer is the first thing to cut because it is the only thing nobody
 * would miss.
 */
export type MotionBudget = 'none' | 'reduced' | 'full';

/** Below this, a device is a phone and gets the reduced budget. */
const FULL_MOTION_MIN_WIDTH = 1024;

/**
 * Deliberately conservative: a device that will not say how many cores it has
 * is assumed to be modest, not generous. Safari reports neither
 * `hardwareConcurrency` on iOS nor `deviceMemory` anywhere, so the width test
 * above is what actually carries iPhones — these two catch cheap laptops and
 * Android tablets that are wide enough to look capable and are not.
 */
const MIN_CORES = 4;
const MIN_MEMORY_GB = 4;

const measure = (): MotionBudget => {
  if (typeof window === 'undefined') return 'none';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'none';
  }

  // Someone on a metered connection did not ask for an ambient animation.
  const connection = (navigator as any).connection;
  if (connection?.saveData) return 'reduced';
  if (typeof connection?.effectiveType === 'string' && /^(slow-)?2g$/.test(connection.effectiveType)) {
    return 'reduced';
  }

  if (window.innerWidth < FULL_MOTION_MIN_WIDTH) return 'reduced';

  const cores = navigator.hardwareConcurrency;
  if (typeof cores === 'number' && cores > 0 && cores < MIN_CORES) return 'reduced';

  const memory = (navigator as any).deviceMemory;
  if (typeof memory === 'number' && memory > 0 && memory < MIN_MEMORY_GB) return 'reduced';

  // A device with no pointer that can hover is a touch device holding a big
  // screen — a tablet. It has a phone's thermal budget with a laptop's width.
  if (window.matchMedia('(hover: none)').matches) return 'reduced';

  return 'full';
};

export const useMotionBudget = (): MotionBudget => {
  // Start at 'reduced' rather than at 'full': the first render happens before
  // anything has been measured, and starting high means every phone mounts a
  // WebGL canvas for one frame before throwing it away.
  const [budget, setBudget] = useState<MotionBudget>('reduced');

  useEffect(() => {
    const update = () => setBudget(measure());
    update();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wide = window.matchMedia(`(min-width: ${FULL_MOTION_MIN_WIDTH}px)`);

    // `resize` fires continuously during a drag; the two media queries fire
    // once each when the answer actually changes, which is the only moment
    // this needs to re-run.
    reduced.addEventListener('change', update);
    wide.addEventListener('change', update);
    return () => {
      reduced.removeEventListener('change', update);
      wide.removeEventListener('change', update);
    };
  }, []);

  return budget;
};

/** Convenience for the common question: may this loop forever? */
export const useAmbientMotion = (): boolean => useMotionBudget() === 'full';
