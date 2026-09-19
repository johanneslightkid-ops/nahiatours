import { useEffect, useState } from 'react';

/**
 * A media query as state.
 *
 * The initial value is read synchronously during the first render rather than
 * in an effect. That matters for art direction: a hook that starts `false` and
 * corrects itself after mount makes a wide screen paint the phone composition
 * for one frame, and a phone start fetching the desktop artwork before it
 * changes its mind.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};

/** Everything below the `lg` breakpoint gets the simplified composition. */
export const useIsWide = () => useMediaQuery('(min-width: 1024px)');

/** Honour the OS setting everywhere motion is decided in JavaScript. */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

export default useMediaQuery;
