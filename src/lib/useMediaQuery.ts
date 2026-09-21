import { useEffect, useState } from 'react';

/**
 * Subscribe to a media query from React.
 *
 * CSS can hide something on a phone, but it cannot stop the browser fetching
 * it: a `<video>` inside a `display: none` wrapper still downloads. Anything
 * whose COST has to change with the viewport — a video, a heavy component —
 * has to be decided in JavaScript, and this is how.
 *
 * It starts `false` on the server and on the first client render, so the
 * expensive branch is never the initial one. A phone therefore never begins
 * the fetch it is about to be told not to make.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    // Safari below 14 only has the deprecated listener API.
    if (list.addEventListener) {
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    }
    list.addListener(onChange);
    return () => list.removeListener(onChange);
  }, [query]);

  return matches;
};

/**
 * Is this a screen worth spending a megabyte of decoration on?
 *
 * Width alone is the wrong test — a phone in landscape is 900px across and
 * still on a battery — so this asks for a fine pointer as well, which is a
 * mouse or a trackpad.
 */
export const useRichDisplay = (): boolean =>
  useMediaQuery('(min-width: 1024px) and (pointer: fine)');
