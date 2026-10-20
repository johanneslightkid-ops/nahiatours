import React, { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { HiSparkles } from 'react-icons/hi';
import { useI18n, type Locale } from '../../../contexts/I18nContext';
import { getInspireConfig } from '../../../edt/inspireConfig';

const InspireOverlay = lazy(() => import('./InspireOverlay'));

interface InspireContextValue {
  active: boolean;
  /** The admin can take the switch off the site (Admin → Inspire). */
  available: boolean;
  toggle: () => void;
  close: () => void;
  /**
   * The one audio element the show plays through. It is created in the click
   * that opens the show, so the browser counts the music as started by the
   * guest — a player created later, after the overlay has loaded, would be
   * refused sound on Safari.
   */
  audio: React.MutableRefObject<HTMLAudioElement | null>;
  /**
   * A second player, routed through Web Audio so the visualiser can hear it:
   * element → analyser (what is drawn) and → gain → speakers (the volume, set
   * after the analyser, so a quieter show still draws full bars). Only for
   * tracks that may be read across origins — this site's own files and
   * Cloudinary's, which send CORS headers. Any other track plays through
   * `audio`, untouched, because Web Audio turns a track it may not read into
   * silence. Null where the browser has no Web Audio.
   */
  graph: React.MutableRefObject<AudioGraph | null>;
}

export interface AudioGraph {
  context: AudioContext;
  element: HTMLAudioElement;
  analyser: AnalyserNode;
  gain: GainNode;
}

/** Can this track go through Web Audio without being silenced? */
export const corsReadable = (url: string): boolean => {
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.origin === window.location.origin || parsed.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
};

const createGraph = (): AudioGraph | null => {
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  try {
    const context = new Context();
    const element = new Audio();
    element.crossOrigin = 'anonymous';
    element.preload = 'auto';
    const source = context.createMediaElementSource(element);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.78;
    const gain = context.createGain();
    source.connect(analyser);
    source.connect(gain);
    gain.connect(context.destination);
    return { context, element, analyser, gain };
  } catch {
    return null;
  }
};

const InspireContext = createContext<InspireContextValue | null>(null);

export const useInspire = () => {
  const value = useContext(InspireContext);
  if (!value) throw new Error('useInspire must be used inside InspireProvider');
  return value;
};

export const fullscreenElement = () =>
  document.fullscreenElement ?? (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ?? null;

export const enterFullscreen = () => {
  const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (root.requestFullscreen) root.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
    else root.webkitRequestFullscreen?.();
  } catch {
    /* a TV browser without the API still gets the overlay */
  }
};

const leaveFullscreen = () => {
  const doc = document as Document & { webkitExitFullscreen?: () => void };
  try {
    if (!fullscreenElement()) return;
    if (doc.exitFullscreen) doc.exitFullscreen().catch(() => undefined);
    else doc.webkitExitFullscreen?.();
  } catch {
    /* nothing to undo */
  }
};

/**
 * "Inspire me": the site turns into a full-screen show for the in-store TV.
 * The provider owns whether it is on, the fullscreen request and the audio
 * element; the show itself is a separate chunk, fetched the first time.
 */
export const InspireProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [active, setActive] = useState(false);
  const [available, setAvailable] = useState(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const graph = useRef<AudioGraph | null>(null);

  useEffect(() => {
    getInspireConfig().then((config) => setAvailable(config.enabled));
  }, []);

  const close = useCallback(() => {
    setActive(false);
    audio.current?.pause();
    graph.current?.element.pause();
    // A suspended context costs the TV nothing while the show is closed.
    graph.current?.context.suspend().catch(() => undefined);
    leaveFullscreen();
  }, []);

  const toggle = useCallback(() => {
    setActive((on) => {
      if (on) {
        audio.current?.pause();
        graph.current?.element.pause();
        graph.current?.context.suspend().catch(() => undefined);
        leaveFullscreen();
        return false;
      }
      if (!audio.current) {
        audio.current = new Audio();
        audio.current.preload = 'auto';
      }
      // Unlock playback inside the click: an empty play() that is paused at once.
      const element = audio.current;
      element.muted = true;
      element.play().then(() => element.pause()).catch(() => undefined).finally(() => { element.muted = false; });
      // The Web Audio player is made and unlocked in the same click.
      graph.current ??= createGraph();
      if (graph.current) {
        const routed = graph.current.element;
        graph.current.context.resume().catch(() => undefined);
        routed.muted = true;
        routed.play().then(() => routed.pause()).catch(() => undefined).finally(() => { routed.muted = false; });
      }
      enterFullscreen();
      return true;
    });
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    // The page scrolls on the root element, so locking only <body> left its
    // scrollbar showing beside the show, doing nothing. Lock both.
    const root = document.documentElement;
    const previous = { body: document.body.style.overflow, root: root.style.overflow };
    document.body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    root.classList.add('is-presenting');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !fullscreenElement()) close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous.body;
      root.style.overflow = previous.root;
      root.classList.remove('is-presenting');
      window.removeEventListener('keydown', onKey);
    };
  }, [active, close]);

  const value = useMemo(() => ({ active, available, toggle, close, audio, graph }), [active, available, toggle, close]);

  return (
    <InspireContext.Provider value={value}>
      {children}
      {active && (
        <Suspense fallback={<div className="fixed inset-0 z-[200] bg-ink" />}>
          <InspireOverlay />
        </Suspense>
      )}
    </InspireContext.Provider>
  );
};

const LABEL: Record<Locale, { on: string; off: string }> = {
  en: { on: 'Inspire me', off: 'Close show' },
  es: { on: 'Inspírame', off: 'Cerrar' },
  fr: { on: 'Inspirez-moi', off: 'Fermer' },
  de: { on: 'Inspirier mich', off: 'Schließen' },
};

/** The switch that opens and closes the show — the only control that stays on screen in both. */
export const InspireToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { active, available, toggle } = useInspire();
  const { locale } = useI18n();
  const label = LABEL[locale] ?? LABEL.en;
  if (!available && !active) return null;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={toggle}
      className={`inspire-toggle ${active ? 'is-on' : ''} ${className}`}
    >
      <span className="inspire-toggle-track" aria-hidden="true">
        <span className="inspire-toggle-knob">
          <HiSparkles className="h-3.5 w-3.5" />
        </span>
      </span>
      <span>{active ? label.off : label.on}</span>
    </button>
  );
};
