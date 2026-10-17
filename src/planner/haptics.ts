/**
 * A tap you can feel. `navigator.vibrate` drives the phone's own vibration
 * motor; desktops and iOS Safari simply don't have it, and then this is a
 * no-op rather than an error.
 */
export const haptic = (pattern: number | readonly number[] = 10): void => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
    }
  } catch {
    /* some browsers throw when called outside a user gesture — harmless */
  }
};

export const HAPTIC = {
  tap: 10,
  heard: [12, 40, 12],
  miss: [40, 60, 40],
} as const;
