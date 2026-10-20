import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HiArrowLeft, HiChevronRight, HiPause, HiPlay, HiRefresh, HiVolumeOff, HiVolumeUp } from 'react-icons/hi';
import type { Locale } from '../../../contexts/I18nContext';
import { loadYouTubeApi, YouTubePlayer, YT_STATE } from './youtubeApi';

type L = Record<Locale, string>;

const COPY: Record<string, L> = {
  back: { en: 'Videos', es: 'Videos', fr: 'Vidéos', de: 'Videos' },
  play: { en: 'Play', es: 'Reproducir', fr: 'Lecture', de: 'Abspielen' },
  pause: { en: 'Pause', es: 'Pausa', fr: 'Pause', de: 'Pause' },
  mute: { en: 'Sound off', es: 'Silenciar', fr: 'Couper le son', de: 'Ton aus' },
  unmute: { en: 'Sound on', es: 'Activar sonido', fr: 'Activer le son', de: 'Ton an' },
  quieter: { en: 'Volume down', es: 'Bajar volumen', fr: 'Baisser le volume', de: 'Leiser' },
  louder: { en: 'Volume up', es: 'Subir volumen', fr: 'Monter le volume', de: 'Lauter' },
  rewind: { en: 'Back 10 seconds', es: 'Atrás 10 segundos', fr: 'Reculer de 10 secondes', de: '10 Sekunden zurück' },
  forward: { en: 'Forward 10 seconds', es: 'Adelante 10 segundos', fr: 'Avancer de 10 secondes', de: '10 Sekunden vor' },
  restart: { en: 'From the start', es: 'Desde el principio', fr: 'Depuis le début', de: 'Von vorn' },
  next: { en: 'Next video', es: 'Siguiente video', fr: 'Vidéo suivante', de: 'Nächstes Video' },
  unplayable: { en: 'This video can’t be played here.', es: 'Este video no se puede reproducir aquí.', fr: 'Cette vidéo ne peut pas être lue ici.', de: 'Dieses Video kann hier nicht abgespielt werden.' },
  skipping: { en: 'Next video in a moment…', es: 'Enseguida el siguiente video…', fr: 'Vidéo suivante dans un instant…', de: 'Gleich das nächste Video…' },
  basic: { en: 'Simple playback on this TV', es: 'Reproducción simple en esta TV', fr: 'Lecture simple sur cette TV', de: 'Einfache Wiedergabe auf diesem TV' },
};

const clock = (seconds: number) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/** A plain embed for when the player API cannot load: still out of reach, still no YouTube controls. */
const fallbackSrc = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=0&disablekb=1&fs=0&playsinline=1&rel=0&iv_load_policy=3`;

export interface TvVideo {
  id: string;
  title: string;
  short: boolean;
}

/**
 * The video, as the shop's TV plays it.
 *
 * A YouTube player embedded in a page takes every pointer move and key press
 * that lands on it — the page around it hears nothing. On a TV that is a trap:
 * the pointer or the remote's focus goes into YouTube's controls and the only
 * way out is the remote's Back, which leaves the show. So here the player has
 * none of its own controls, keys or fullscreen button, and neither the
 * pointer nor the remote can reach it (the frame is inert and lets the
 * pointer through); nothing is laid over it either — YouTube's rules forbid
 * that. It is driven through YouTube's own player API from a bar of large
 * buttons under the video, where the remote's focus starts. When the video
 * ends, the wall of videos comes back; a video that will not play makes way
 * for the next one.
 */
const TvVideoPlayer: React.FC<{
  video: TvVideo;
  locale: Locale;
  hasNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onEnded: () => void;
  /** This video will not play here; the show decides what comes next. */
  onUnplayable: () => void;
}> = ({ video, locale, hasNext, onBack, onNext, onEnded, onUnplayable }) => {
  const shell = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  const [basic, setBasic] = useState(false);
  const [unplayable, setUnplayable] = useState(false);
  const [status, setStatus] = useState({ playing: false, muted: false, volume: 80, time: 0, duration: 0 });
  const handlers = useRef({ onEnded, onNext, onBack, onUnplayable, hasNext });
  handlers.current = { onEnded, onNext, onBack, onUnplayable, hasNext };
  const firstId = useRef(video.id);

  // The video's size, worked out here rather than with CSS aspect-ratio,
  // which older TV browsers do not know (they would draw it zero wide).
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const ratio = video.short ? 9 / 16 : 16 / 9;
    const fit = () => {
      const box = area.current;
      if (!box) return;
      let width = box.clientWidth;
      let height = width / ratio;
      if (height > box.clientHeight) {
        height = box.clientHeight;
        width = height * ratio;
      }
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [video.short]);

  // The frame can be neither focused nor clicked into.
  useEffect(() => {
    shell.current?.setAttribute('inert', '');
  }, [basic]);

  // The player, made once; a new video is loaded into it.
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host.current) return;
        const target = document.createElement('div');
        host.current.appendChild(target);
        player.current = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId: firstId.current,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              const frame = event.target.getIframe();
              frame.tabIndex = -1;
              frame.style.pointerEvents = 'none';
              event.target.unMute();
              event.target.playVideo();
              setReady(true);
            },
            onStateChange: (event) => {
              if (event.data === YT_STATE.ENDED) handlers.current.onEnded();
            },
            onError: () => setUnplayable(true),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setBasic(true);
      });
    return () => {
      cancelled = true;
      try {
        player.current?.destroy();
      } catch {
        /* already gone */
      }
      player.current = null;
    };
  }, []);

  useEffect(() => {
    setUnplayable(false);
    if (video.id === firstId.current) return;
    firstId.current = video.id;
    if (ready) player.current?.loadVideoById(video.id);
  }, [video.id, ready]);

  // A video that will not play makes way for the next one, or for the wall.
  useEffect(() => {
    if (!unplayable) return undefined;
    const timer = window.setTimeout(() => handlers.current.onUnplayable(), 3500);
    return () => window.clearTimeout(timer);
  }, [unplayable]);

  // What the bar shows, read from the player a few times a second.
  useEffect(() => {
    if (!ready) return undefined;
    const read = () => {
      const p = player.current;
      if (!p) return;
      try {
        const state = p.getPlayerState();
        setStatus({
          playing: state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING,
          muted: p.isMuted(),
          volume: p.getVolume(),
          time: p.getCurrentTime(),
          duration: p.getDuration(),
        });
      } catch {
        /* the player is between videos */
      }
    };
    read();
    const timer = window.setInterval(read, 400);
    return () => window.clearInterval(timer);
  }, [ready]);

  // The remote's focus starts on the bar, and is taken back if it ever lands in a frame.
  useEffect(() => {
    const home = () => (playButton.current ?? backButton.current)?.focus({ preventScroll: true });
    home();
    const reclaim = () =>
      window.setTimeout(() => {
        if (document.activeElement?.tagName === 'IFRAME') {
          (document.activeElement as HTMLElement).blur();
          window.focus();
          home();
        }
      }, 0);
    window.addEventListener('blur', reclaim);
    const watch = window.setInterval(reclaim, 1000);
    return () => {
      window.removeEventListener('blur', reclaim);
      window.clearInterval(watch);
    };
  }, []);

  const act = useCallback((run: (p: YouTubePlayer) => void) => {
    const p = player.current;
    if (!p) return;
    try {
      run(p);
    } catch {
      /* the player is between videos */
    }
  }, []);

  const toggle = useCallback(() => act((p) => (p.getPlayerState() === YT_STATE.PLAYING ? p.pauseVideo() : p.playVideo())), [act]);
  const seekBy = useCallback((delta: number) => act((p) => p.seekTo(Math.max(0, p.getCurrentTime() + delta), true)), [act]);
  const volumeBy = useCallback(
    (delta: number) =>
      act((p) => {
        p.setVolume(Math.max(0, Math.min(100, Math.round(p.getVolume() / 10) * 10 + delta)));
        if (delta > 0 && p.isMuted()) p.unMute();
      }),
    [act]
  );

  // The remote's media keys.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key;
      const code = event.keyCode;
      if (key === 'MediaPlayPause' || code === 179 || code === 10252) toggle();
      else if (key === 'MediaPlay' || code === 415) act((p) => p.playVideo());
      else if (key === 'MediaPause' || code === 19) act((p) => p.pauseVideo());
      else if (key === 'MediaFastForward' || code === 417) seekBy(10);
      else if (key === 'MediaRewind' || code === 412) seekBy(-10);
      else if (key === 'MediaTrackNext') {
        if (handlers.current.hasNext) handlers.current.onNext();
      } else if (key === 'MediaTrackPrevious') act((p) => p.seekTo(0, true));
      else if (key === 'AudioVolumeMute') act((p) => (p.isMuted() ? p.unMute() : p.mute()));
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act, seekBy, toggle]);

  const share = status.duration > 0 ? Math.min(1, status.time / status.duration) : 0;
  const seekTo = (event: React.MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const at = (event.clientX - box.left) / Math.max(1, box.width);
    act((p) => p.seekTo(Math.max(0, at * status.duration), true));
  };

  const button = (label: string, onClick: () => void, icon: React.ReactNode, options: { ref?: React.Ref<HTMLButtonElement>; wide?: boolean; disabled?: boolean } = {}) => (
    <button
      ref={options.ref}
      type="button"
      onClick={onClick}
      disabled={options.disabled}
      aria-label={label}
      title={label}
      className={`inspire-tv-btn ${options.wide ? 'inspire-tv-btn-wide' : ''}`}
    >
      {icon}
      {options.wide && <span>{label}</span>}
    </button>
  );

  const controls = !basic;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-[2.2vh] px-[4vw] pb-[3.5vh] pt-[11vh]">
      <div ref={area} className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          ref={shell}
          className="relative overflow-hidden rounded-[10px] bg-black shadow-ink-xl"
          style={size ? { width: size.width, height: size.height } : { width: '100%', height: '100%' }}
        >
          {basic ? (
            <iframe
              key={video.id}
              src={fallbackSrc(video.id)}
              title={video.title}
              tabIndex={-1}
              className="pointer-events-none absolute inset-0 h-full w-full"
              allow="autoplay; encrypted-media"
            />
          ) : (
            <div ref={host} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
          )}
          {unplayable && (
            <div className="absolute inset-0 grid place-items-center bg-ink/85 p-[3vw] text-center">
              <div>
                <p className="font-display text-[2.4vw] uppercase leading-tight text-white">{COPY.unplayable[locale]}</p>
                <p className="mt-2 font-condensed text-[1.2vw] font-bold uppercase tracking-[0.18em] text-gold-light">
                  {hasNext ? COPY.skipping[locale] : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="inspire-tv-bar">
        {controls && (
          <div className="inspire-tv-progress" onClick={seekTo} aria-hidden="true">
            <span className="inspire-tv-progress-fill" style={{ transform: `scaleX(${share})` }} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-[1vw]">
          {button(COPY.back[locale], onBack, <HiArrowLeft className="h-[1.9vw] w-[1.9vw] min-h-5 min-w-5" />, { wide: true, ref: backButton })}
          {controls ? (
            <>
              {button(
                status.playing ? COPY.pause[locale] : COPY.play[locale],
                toggle,
                status.playing ? <HiPause className="h-[2.4vw] w-[2.4vw] min-h-6 min-w-6" /> : <HiPlay className="h-[2.4vw] w-[2.4vw] min-h-6 min-w-6" />,
                { ref: playButton }
              )}
              {button(
                status.muted ? COPY.unmute[locale] : COPY.mute[locale],
                () => act((p) => (p.isMuted() ? p.unMute() : p.mute())),
                status.muted ? <HiVolumeOff className="h-[2vw] w-[2vw] min-h-5 min-w-5" /> : <HiVolumeUp className="h-[2vw] w-[2vw] min-h-5 min-w-5" />
              )}
              {button(COPY.quieter[locale], () => volumeBy(-10), <span className="font-display text-[2vw] leading-none">−</span>)}
              <span className="inspire-tv-readout" aria-live="polite">{status.muted ? '0' : Math.round(status.volume)}%</span>
              {button(COPY.louder[locale], () => volumeBy(10), <span className="font-display text-[2vw] leading-none">+</span>)}
              {button(COPY.rewind[locale], () => seekBy(-10), <span className="font-condensed text-[1.25vw] font-bold">−10s</span>)}
              {button(COPY.forward[locale], () => seekBy(10), <span className="font-condensed text-[1.25vw] font-bold">+10s</span>)}
              {button(COPY.restart[locale], () => act((p) => { p.seekTo(0, true); p.playVideo(); }), <HiRefresh className="h-[1.9vw] w-[1.9vw] min-h-5 min-w-5" />)}
              <span className="inspire-tv-readout">{clock(status.time)} / {clock(status.duration)}</span>
            </>
          ) : (
            <span className="inspire-tv-readout">{COPY.basic[locale]}</span>
          )}
          {button(COPY.next[locale], onNext, <HiChevronRight className="h-[2vw] w-[2vw] min-h-5 min-w-5" />, { wide: true, disabled: !hasNext })}
        </div>
      </div>
    </div>
  );
};

export default TvVideoPlayer;
