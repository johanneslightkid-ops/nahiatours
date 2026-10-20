import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HiPause, HiPlay, HiVolumeOff, HiVolumeUp } from 'react-icons/hi';
import { MdSkipNext, MdSkipPrevious } from 'react-icons/md';
import type { InspireTrack } from '../../../edt/inspireConfig';
import { useInspire } from './InspireContext';

interface InspireMusicProps {
  tracks: InspireTrack[];
  /** Starting volume, 0–1. */
  volume: number;
  /** Share of the volume to play at right now (1, or the video-screen level). */
  duck: number;
  /** A video is playing: the music stops and the controls go away until it ends. */
  suspended: boolean;
}

const STEP = 0.1;
const clamp = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10) / 10;

/**
 * The show's music: the configured songs in order, round and round. Small
 * controls in a corner — previous, play/pause, next, mute, quieter, louder in
 * 10% steps. The show can lower it (the video screen) or stop it (a video
 * playing); it fades rather than jumps, and picks up where it was.
 */
const InspireMusic: React.FC<InspireMusicProps> = ({ tracks, volume, duck, suspended }) => {
  const { audio } = useInspire();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(clamp(volume));
  const fade = useRef(0);
  const element = audio.current;

  // Load the current track.
  useEffect(() => {
    if (!element || !tracks.length) return;
    const track = tracks[index % tracks.length];
    if (element.src !== track.url) {
      element.src = track.url;
      element.load();
    }
  }, [element, tracks, index]);

  // Endless queue.
  useEffect(() => {
    if (!element) return undefined;
    const next = () => setIndex((value) => (value + 1) % Math.max(1, tracks.length));
    element.addEventListener('ended', next);
    element.addEventListener('error', next);
    return () => {
      element.removeEventListener('ended', next);
      element.removeEventListener('error', next);
    };
  }, [element, tracks.length]);

  // Play or pause, and fade to the level the show asks for.
  useEffect(() => {
    if (!element || !tracks.length) return undefined;
    const shouldPlay = playing && !suspended;
    // Fading out before a pause, so a video starts in silence, not mid-chorus.
    const target = !shouldPlay || muted ? 0 : level * duck;
    if (shouldPlay && element.paused) element.play().catch(() => setPlaying(false));
    window.clearInterval(fade.current);
    const from = element.volume;
    const started = performance.now();
    fade.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / 450);
      element.volume = Math.min(1, Math.max(0, from + (target - from) * progress));
      if (progress >= 1) {
        window.clearInterval(fade.current);
        if (!shouldPlay) element.pause();
      }
    }, 30);
    if (!shouldPlay && target === from) element.pause();
    return () => window.clearInterval(fade.current);
  }, [element, tracks.length, playing, suspended, muted, level, duck, index]);

  // Leaving the show stops the music.
  useEffect(() => () => element?.pause(), [element]);

  const skip = useCallback((delta: number) => setIndex((value) => (value + delta + tracks.length) % tracks.length), [tracks.length]);

  if (!tracks.length || suspended) return null;
  const track = tracks[index % tracks.length];

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
