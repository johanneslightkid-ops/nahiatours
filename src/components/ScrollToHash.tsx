import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { REMEMBERED_PAGES, cancelPageScroll, scrollMemoryKey, scrollPageToTop } from '../lib/navScroll';

const readMemory = (pathname: string): number => {
  try {
    return Number(sessionStorage.getItem(scrollMemoryKey(pathname))) || 0;
  } catch {
    return 0;
  }
};

const writeMemory = (pathname: string, y: number) => {
  try {
    sessionStorage.setItem(scrollMemoryKey(pathname), String(Math.round(y)));
  } catch {
    /* private mode: nothing is remembered */
  }
};

/**
 * Where a page opens.
 *
 *  • With a #hash, at that section.
 *  • The tours page, at the position it was left at in this visit — it is a
 *    list people leave to read one tour and come back from. With nothing
 *    remembered it opens at the top like any other page.
 *  • Every other page, at the top, gliding there.
 */
const ScrollToHash = () => {
  const location = useLocation();
  /** True while a remembered position is being restored, so it is not overwritten. */
  const restoring = useRef(false);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  // Remember the tours page's position while it is open.
  useEffect(() => {
    const { pathname } = location;
    if (!REMEMBERED_PAGES.has(pathname)) return undefined;
    let frame = 0;
    const onScroll = () => {
      if (restoring.current || frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        writeMemory(pathname, window.scrollY);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [location.pathname]);

  useEffect(() => {
    cancelPageScroll();
    // "#top" is how older links say "the start of the page": treated as no
    // hash, so the tours page still comes back where it was.
    const hash = location.hash.replace('#', '');
    if (hash && hash !== 'top') {
      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return undefined;
      }
    }

    const remembered = REMEMBERED_PAGES.has(location.pathname) ? readMemory(location.pathname) : 0;
    if (remembered <= 0) {
      scrollPageToTop();
      return undefined;
    }

    // The list loads after the route renders, so wait until the page is tall
    // enough to hold the old position, then go straight there — and hold it
    // while the cards above finish laying out, until the reader takes over.
    restoring.current = true;
    const started = Date.now();
    let frame = 0;
    let placedAt = 0;
    let lastHeight = 0;
    const intents = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    const finish = () => {
      window.cancelAnimationFrame(frame);
      intents.forEach((type) => window.removeEventListener(type, finish));
      restoring.current = false;
      writeMemory(location.pathname, window.scrollY);
    };
    const restore = () => {
      const height = document.documentElement.scrollHeight;
      const room = height - window.innerHeight;
      if (!placedAt && (room >= remembered || Date.now() - started > 3000)) placedAt = Date.now();
      if (placedAt) {
        if (height !== lastHeight || Math.abs(window.scrollY - remembered) > 1) {
          // 'instant', not 'auto': the stylesheet sets scroll-behavior: smooth,
          // which would turn every correction into a slow restarted glide.
          window.scrollTo({ top: Math.min(remembered, Math.max(room, 0)), behavior: 'instant' as ScrollBehavior });
          lastHeight = height;
        }
        if (Date.now() - placedAt > 1200) {
          finish();
          return;
        }
      }
      frame = window.requestAnimationFrame(restore);
    };
    intents.forEach((type) => window.addEventListener(type, finish, { passive: true }));
    frame = window.requestAnimationFrame(restore);
    return () => {
      window.cancelAnimationFrame(frame);
      intents.forEach((type) => window.removeEventListener(type, finish));
      restoring.current = false;
    };
  }, [location.pathname, location.hash]);

  return null;
};

export default ScrollToHash;
