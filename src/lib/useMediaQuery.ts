import { useEffect, useState } from 'react';

/**
 * A media query, read in React.
 *
 * The initial value is taken synchronously so the first render is already
 * correct — a hook that starts `false` and corrects itself in an effect makes
 * the page paint the wrong layout once and then swap, which is worse than the
 * class-based hiding it replaces.
 *
 * Use this only where the difference has to reach the DOM — a picture or a
 * video that must not be *fetched* on a phone. Where it is purely visual,
 * `hidden lg:block` is cheaper and needs no JavaScript.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();

    list.addEventListener?.('change', onChange);
    return () => list.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}

/**
 * Is this a screen worth spending a megabyte of decoration on?
 *
 * Width alone is the wrong test — a phone in landscape is 900px across and
 * still on a battery — so this asks for a fine pointer as well, which means a
 * mouse or a trackpad.
 */
export const useRichDisplay = (): boolean =>
  useMediaQuery('(min-width: 1024px) and (pointer: fine)');

export default useMediaQuery;
