import { useSyncExternalStore } from 'react';

/**
 * What the planner offers the site's top bar while it is open: the voice
 * guide's play/pause, and "continue" (what Enter does). The guide and the
 * question register here; the header reads it and shows two big round
 * buttons on the planner page only. A plain store rather than a context,
 * because the header sits outside the planner's tree.
 *
 * The functions are called straight from the header's click, so they run
 * inside the guest's tap — which iOS requires before a page may make sound.
 */
export interface PlannerBarState {
  /** The voice guide exists on this question (the browser can speak). */
  audioAvailable: boolean;
  /** The guide is on: reading, or listening for an answer. */
  audioOn: boolean;
  toggleAudio: (() => void) | null;
  /** The current question has an answer, so Enter would move on. */
  canContinue: boolean;
  /** Whether "continue" would skip an optional question rather than answer it. */
  skip: boolean;
  next: (() => void) | null;
}

const EMPTY: PlannerBarState = { audioAvailable: false, audioOn: false, toggleAudio: null, canContinue: false, skip: false, next: null };

let state: PlannerBarState = EMPTY;
const listeners = new Set<() => void>();

export const setPlannerBar = (patch: Partial<PlannerBarState>) => {
  const next = { ...state, ...patch };
  if (Object.keys(next).every((key) => next[key as keyof PlannerBarState] === state[key as keyof PlannerBarState])) return;
  state = next;
  listeners.forEach((listener) => listener());
};

export const resetPlannerBar = (keys: (keyof PlannerBarState)[]) =>
  setPlannerBar(Object.fromEntries(keys.map((key) => [key, EMPTY[key]])) as Partial<PlannerBarState>);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const usePlannerBar = (): PlannerBarState => useSyncExternalStore(subscribe, () => state, () => EMPTY);
