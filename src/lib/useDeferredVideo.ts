import { useEffect, useState } from 'react';

/**
 * Show the hero video, but not at the cost of the first paint.
 *
 * The footage is close to a megabyte. Rendering the `<video>` in the first
 * pass puts that download in the same queue as the stylesheet and the script
 * that the page needs to appear at all — on a phone that is the difference
 * between a hero at one second and a hero at four.
 *
 * So the still goes up immediately as the video's own `poster`, and the video
 * itself is mounted once the browser is idle. The swap is invisible: the
 * poster IS the first frame, so nothing moves when the footage takes over.
 *
 * Two connections never get it at all, and neither is a guess:
 *
 *   • `saveData` — the visitor has asked their browser, at the OS level, to
 *     use less data. A decorative loop is exactly what that setting means.
 *   • a 2G `effectiveType` — the video would still be arriving when they left.
 *
 * Both fall back to the poster, which is the same picture standing still.
 */
export const useDeferredVideo = (hasVideo: boolean): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasVideo || ready || typeof window === 'undefined') return;

    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;

    if (connection?.saveData) return;
    if (connection?.effectiveType && /(^|-)(slow-)?2g$/.test(connection.effectiveType)) return;

    const idle = window.requestIdleCallback;
    if (idle) {
      // The timeout matters: on a busy page idle may never come on its own,
      // and the video would then never appear at all.
      const handle = idle(() => setReady(true), { timeout: 3000 });
      return () => window.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, [hasVideo, ready]);

  return ready;
};

export default useDeferredVideo;
