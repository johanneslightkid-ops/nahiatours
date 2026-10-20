import { useEffect, useState } from 'react';
import type { InspireQuality } from '../../../edt/inspireConfig';

/**
 * How much the show may draw, from 0 (everything) to 3 (the least), for the
 * TV it runs on.
 *
 *   0  full: light effect at its normal resolution, visualiser at 30 fps
 *   1  the light effect at a lower resolution and 24 fps
 *   2  no light effect; Ken Burns drift kept
 *   3  no drift either; the visualiser at 20 fps
 *
 * In 'auto' the show watches its own frames: two windows of two seconds in a
 * row whose 75th-percentile frame took longer than 24 ms (under ~42 fps)
 * step it down one level. It never steps back up by itself, so it cannot
 * flicker between levels — closing and reopening the show starts again at 0.
 */
const FIXED: Record<Exclude<InspireQuality, 'auto'>, number> = { high: 0, balanced: 1, lite: 3 };
const WINDOW_MS = 2000;
const WARMUP_MS = 3500;
const SLOW_FRAME_MS = 24;

export const useShowQuality = (quality: InspireQuality): number => {
  const [level, setLevel] = useState(quality === 'auto' ? 0 : FIXED[quality]);

  useEffect(() => {
    if (quality !== 'auto') {
      setLevel(FIXED[quality]);
      return undefined;
    }
    setLevel(0);
    let frame = 0;
    let last = performance.now();
    const started = last;
    let windowStart = last;
    let gaps: number[] = [];
    let slowWindows = 0;
    let current = 0;

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const gap = now - last;
      last = now;
      // A hidden tab or a paused TV says nothing about the drawing.
      if (document.hidden || gap > 1000) {
        gaps = [];
        windowStart = now;
        return;
      }
      if (now - started < WARMUP_MS) return;
      gaps.push(gap);
      if (now - windowStart < WINDOW_MS) return;
      gaps.sort((a, b) => a - b);
      const p75 = gaps[Math.floor(gaps.length * 0.75)] ?? 0;
      slowWindows = p75 > SLOW_FRAME_MS ? slowWindows + 1 : 0;
      if (slowWindows >= 2 && current < 3) {
        current += 1;
        slowWindows = 0;
        setLevel(current);
      }
      gaps = [];
      windowStart = now;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [quality]);

  return level;
};
