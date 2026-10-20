import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HiPause, HiPlay, HiVolumeOff, HiVolumeUp } from 'react-icons/hi';
import { MdGraphicEq, MdSkipNext, MdSkipPrevious } from 'react-icons/md';
import type { InspireTrack } from '../../../edt/inspireConfig';
import { corsReadable, useInspire } from './InspireContext';

interface InspireMusicProps {
  tracks: InspireTrack[];
  /** Starting volume, 0–1. */
  volume: number;
  /** Share of the volume to play at right now (1, or the video-screen level). */
  duck: number;
  /** A video is playing: the music stops and the controls go away until it ends. */
  suspended: boolean;
  /** Whether the visualiser is switched on, and the switch. */
  visualizer: boolean;
  onVisualizerToggle: () => void;
  /** What the visualiser needs: is music audible now, and the analyser to read, when there is one. */
  onAudio: (state: { audible: boolean; analyser: AnalyserNode | null }) => void;
}

const STEP = 0.1;
const clamp = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10) / 10;

/**
 * The show's music: the configured songs in order, round and round. Small
 * controls in a corner — previous, play/pause, next, the visualiser, mute,
 * quieter, louder in 10% steps. The show can lower it (the video screen) or
 * stop it (a video playing); it fades rather than jumps, and picks up where
 * it was.
 *
 * A track that Web Audio may read plays through the show's analysed player
 * (InspireContext), whose volume is a gain node after the analyser; any other
 * track plays through the plain one, and the visualiser rests meanwhile. A
 * track that fails on the analysed player is tried once on the plain one
 * before the queue moves on.
 */
const InspireMusic: React.FC<InspireMusicProps> = ({ tracks, volume, duck, suspended, visualizer, onVisualizerToggle, onAudio }) => {
  const { audio, graph } = useInspire();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(clamp(volume));
  const [audible, setAudible] = useState(false);
  const [unreadable, setUnreadable] = useState<Set<string>>(() => new Set());
  const fade = useRef(0);

  const track = tracks.length ? tracks[index % tracks.length] : null;
  const routed = Boolean(track && graph.current && corsReadable(track.url) && !unreadable.has(track.url));
  const element = routed ? graph.current!.element : audio.current;
  const other = routed ? audio.current : graph.current?.element ?? null;

  const getVolume = useCallback(() => (routed ? graph.current!.gain.gain.value : element?.volume ?? 0), [routed, element, graph]);
  const setVolume = useCallback(
    (value: number) => {
      const clamped = Math.min(1, Math.max(0, value));
      if (routed) {
        graph.current!.gain.gain.value = clamped;
        if (element) element.volume = 1;
      } else if (element) element.volume = clamped;
    },
    [routed, element, graph]
  );

  // Load the current track on the player it belongs to; silence the other one.
  useEffect(() => {
    if (!element || !track) return;
    other?.pause();
    if (element.src !== new URL(track.url, window.location.href).href) {
      element.src = track.url;
      element.load();
    }
  }, [element, other, track]);

  // Endless queue; a track the analysed player cannot read gets the plain one.
  useEffect(() => {
    if (!element) return undefined;
    const next = () => setIndex((value) => (value + 1) % Math.max(1, tracks.length));
    const failed = () => {
      if (routed && track) setUnreadable((current) => new Set(current).add(track.url));
      else next();
    };
    const on = () => setAudible(true);
    const off = () => setAudible(false);
    element.addEventListener('ended', next);
    element.addEventListener('error', failed);
    element.addEventListener('playing', on);
    element.addEventListener('pause', off);
    element.addEventListener('ended', off);
    element.addEventListener('emptied', off);
    setAudible(!element.paused);
    return () => {
      element.removeEventListener('ended', next);
      element.removeEventListener('error', failed);
      element.removeEventListener('playing', on);
      element.removeEventListener('pause', off);
      element.removeEventListener('ended', off);
      element.removeEventListener('emptied', off);
    };
  }, [element, routed, track, tracks.length]);

  // Play or pause, and fade to the level the show asks for.
  useEffect(() => {
    if (!element || !tracks.length) return undefined;
    const shouldPlay = playing && !suspended;
    // Fading out before a pause, so a video starts in silence, not mid-chorus.
    const target = !shouldPlay || muted ? 0 : level * duck;
    if (shouldPlay && element.paused) {
      if (routed) graph.current!.context.resume().catch(() => undefined);
      element.play().catch(() => setPlaying(false));
    }
    window.clearInterval(fade.current);
    const from = getVolume();
    const started = performance.now();
    fade.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / 450);
      setVolume(from + (target - from) * progress);
      if (progress >= 1) {
        window.clearInterval(fade.current);
        if (!shouldPlay) element.pause();
      }
    }, 30);
    if (!shouldPlay && target === from) element.pause();
    return () => window.clearInterval(fade.current);
  }, [element, routed, tracks.length, playing, suspended, muted, level, duck, index, getVolume, setVolume, graph]);

  // The visualiser draws only while music can be heard, and only from the analysed player.
  useEffect(() => {
    onAudio({ audible: audible && playing && !muted && !suspended, analyser: routed ? graph.current!.analyser : null });
  }, [audible, playing, muted, suspended, routed, graph, onAudio]);

  // Leaving the show stops the music.
  useEffect(
    () => () => {
      audio.current?.pause();
      graph.current?.element.pause();
    },
    [audio, graph]
  );

  const skip = useCallback((delta: number) => setIndex((value) => (value + delta + tracks.length) % tracks.length), [tracks.length]);

  if (!tracks.length || suspended || !track) return null;

  const button = 'grid h-8 w-8 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white';
  return (
    <div className="inspire-music" role="group" aria-label="Music">
      <div className="flex items-center gap-0.5">
        <button type="button" className={button} onClick={() => skip(-1)} aria-label="Previous song"><MdSkipPrevious className="h-4 w-4" /></button>
        <button type="button" className={`${button} bg-white/10`} onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <HiPause className="h-4 w-4" /> : <HiPlay className="h-4 w-4" />}
        </button>
        <button type="button" className={button} onClick={() => skip(1)} aria-label="Next song"><MdSkipNext className="h-4 w-4" /></button>
      </div>
      <div className="min-w-0 flex-1 px-2">
        <p className="truncate text-[0.72rem] font-semibold text-white">{track.title || `Track ${index + 1}`}</p>
        <div className="mt-1 flex gap-[2px]" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, step) => (
            <span key={step} className={`h-1 flex-1 rounded-full ${!muted && step < Math.round(level * 10) ? 'bg-mango' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={`${button} ${visualizer ? 'bg-mango/25 text-mango-light' : ''}`}
          onClick={onVisualizerToggle}
          aria-pressed={visualizer}
          aria-label="Visualizer"
          title={routed ? 'Visualizer' : 'Visualizer (not available for this song: its server does not allow it)'}
        >
          <MdGraphicEq className="h-4 w-4" />
        </button>
        <button type="button" className={`${button} text-sm font-bold`} onClick={() => setLevel((value) => clamp(value - STEP))} aria-label="Quieter">−</button>
        <button type="button" className={`${button} text-sm font-bold`} onClick={() => setLevel((value) => clamp(value + STEP))} aria-label="Louder">+</button>
        <button type="button" className={button} onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <HiVolumeOff className="h-4 w-4" /> : <HiVolumeUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export default InspireMusic;
