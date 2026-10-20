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
}

const InspireContext = createContext<InspireContextValue | null>(null);

export const useInspire = () => {
  const value = useContext(InspireContext);
  if (!value) throw new Error('useInspire must be used inside InspireProvider');
  return value;
};

const fullscreenElement = () =>
  document.fullscreenElement ?? (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ?? null;

const enterFullscreen = () => {
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

  useEffect(() => {
    getInspireConfig().then((config) => setAvailable(config.enabled));
  }, []);

  const close = useCallback(() => {
    setActive(false);
    audio.current?.pause();
    leaveFullscreen();
  }, []);

  const toggle = useCallback(() => {
    setActive((on) => {
      if (on) {
        audio.current?.pause();
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

  const value = useMemo(() => ({ active, available, toggle, close, audio }), [active, available, toggle, close]);

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
