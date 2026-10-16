import type React from 'react';

/**
 * How the site's own navigation moves the page.
 *
 * Opening a page starts at its top, with a glide rather than a jump. Clicking
 * the entry of the page already open does not open it again — it only glides
 * back to the top. The tours page is the one exception: it is a long list
 * people leave to read one tour and come back from, so it returns to where
 * they were (see ScrollToHash).
 */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let cancelCorrection: (() => void) | null = null;

/** Stop a pending glide correction: the reader took over, or the page changed. */
export const cancelPageScroll = () => {
  cancelCorrection?.();
  cancelCorrection = null;
};

/**
 * Glide to the top. A page that is still loading can interrupt a smooth
 * scroll halfway (content arriving above the fold moves the target), so once
 * the page stops moving it is checked and, if short, sent the rest of the way.
 * The moment the reader scrolls, taps or presses a key, it lets go.
 */
export const scrollPageToTop = () => {
  cancelPageScroll();
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
  window.scrollTo({ top: 0, behavior });
  if (behavior === 'auto') return;

  let settle = 0;
  const check = () => {
    window.clearTimeout(settle);
    settle = window.setTimeout(() => {
      if (window.scrollY > 2) window.scrollTo({ top: 0, behavior });
    }, 180);
  };
  const intents = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
  const stop = () => {
    window.clearTimeout(settle);
    window.clearTimeout(deadline);
    window.removeEventListener('scroll', check);
    intents.forEach((type) => window.removeEventListener(type, cancelPageScroll));
  };
  const deadline = window.setTimeout(cancelPageScroll, 2500);
  cancelCorrection = stop;
  check();
  window.addEventListener('scroll', check, { passive: true });
  intents.forEach((type) => window.addEventListener(type, cancelPageScroll, { passive: true }));
};

const pathOf = (to: string) => to.split('#')[0].split('?')[0] || '/';

/** onClick for a navigation link or the logo. */
export const onNavLinkClick = (event: React.MouseEvent, to: string, pathname: string) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return; // new tab
  if (pathOf(to) === pathname) {
    event.preventDefault();
    scrollPageToTop();
  }
};

/** Pages that come back at the position they were left at. */
export const REMEMBERED_PAGES = new Set(['/tours']);
export const scrollMemoryKey = (pathname: string) => `scroll-memory:${pathname}`;
