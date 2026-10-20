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

/**
 * Pages that come back at the position they were left at however they are
 * reached. Every other page comes back where it was left when it is reached
 * with the browser's back button or a "back" link (state `{ restoreScroll: true }`),
 * and starts at its top when it is opened afresh.
 */
export const REMEMBERED_PAGES = new Set(['/tours']);
export const scrollMemoryKey = (pathname: string) => `scroll-memory:${pathname}`;

/** Admin pages are tools, not reading: nothing about them is remembered. */
export const isRememberable = (pathname: string) => !pathname.startsWith('/admin');

/** Pages one opens from somewhere to read one thing, and goes back from. */
export const isSubpage = (pathname: string) => pathname.startsWith('/details/');

/**
 * Where a guest was when they opened a subpage: the page, its query and the
 * scroll position. Walking from one subpage to the next (previous / next
 * tour) keeps it, so "back" still leads to where the walk began.
 */
export interface ReturnTrail {
  path: string;
  y: number;
}

const TRAIL_KEY = 'return-trail';

export const readReturnTrail = (): ReturnTrail | null => {
  try {
    const value = JSON.parse(sessionStorage.getItem(TRAIL_KEY) ?? 'null') as ReturnTrail | null;
    return value && typeof value.path === 'string' ? value : null;
  } catch {
    return null;
  }
};

export const writeReturnTrail = (trail: ReturnTrail) => {
  try {
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
  } catch {
    /* private mode: the back link falls back to the list */
  }
};

/** Router state that asks the page to come back where it was left. */
export const RESTORE_STATE = { restoreScroll: true } as const;
