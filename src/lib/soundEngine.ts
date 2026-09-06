/**
 * Web Audio API synthesizer and Caribbean sound FX engine.
 * ==================================================================================
 * Provides zero-latency Web Audio API synthesis for UI interactions,
 * Caribbean ocean micro-sound FX, and interactive sound effects.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      ctx = new AudioCtx();
    }
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

const AUDIO_FX_STORAGE_KEY = 'tours_audio_fx';
/** Previous key, read once so an existing preference is not lost. */
const LEGACY_AUDIO_FX_STORAGE_KEY = 'ferreras_audio_fx';

export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = (localStorage.getItem(AUDIO_FX_STORAGE_KEY) ?? localStorage.getItem(LEGACY_AUDIO_FX_STORAGE_KEY));
  return stored !== 'false';
}

export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUDIO_FX_STORAGE_KEY, enabled ? 'true' : 'false');
}

/** UI Micro Sound: Button click pop */
export function playClickFx(): void {
  if (!isAudioEnabled()) return;
  const c = getContext();
  if (!c) return;

  try {
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, c.currentTime + 0.04);

    gain.gain.setValueAtTime(0.12, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start();
    osc.stop(c.currentTime + 0.045);
  } catch {}
}

/** UI Micro Sound: Soft card / button hover chime */
export function playHoverFx(): void {
  if (!isAudioEnabled()) return;
  const c = getContext();
  if (!c) return;

  try {
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.06);

    gain.gain.setValueAtTime(0.04, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start();
    osc.stop(c.currentTime + 0.065);
  } catch {}
}

/** UI Micro Sound: Viewport scroll reveal ocean swell sweep */
export function playViewportScrollFx(): void {
  if (!isAudioEnabled()) return;
  const c = getContext();
  if (!c) return;

  try {
    const osc = c.createOscillator();
    const filter = c.createBiquadFilter();
    const gain = c.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, c.currentTime);
    osc.frequency.linearRampToValueAtTime(280, c.currentTime + 0.18);
    osc.frequency.linearRampToValueAtTime(110, c.currentTime + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, c.currentTime);
    filter.frequency.linearRampToValueAtTime(600, c.currentTime + 0.18);

    gain.gain.setValueAtTime(0.001, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.15);
    gain.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    osc.start();
    osc.stop(c.currentTime + 0.36);
  } catch {}
}

/** Caribbean SFX: Deep rolling ocean surf wave sweep */
export function playOceanWaveFx(): void {
  if (!isAudioEnabled()) return;
  const c = getContext();
  if (!c) return;

  try {
    const bufferSize = c.sampleRate * 1.5;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.7);
    filter.frequency.exponentialRampToValueAtTime(120, c.currentTime + 1.4);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, c.currentTime + 0.6);
    gain.gain.linearRampToValueAtTime(0.001, c.currentTime + 1.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);

    noise.start();
  } catch {}
}

/** Caribbean SFX: Conch shell horn sound */
export function playCaribbeanHornFx(): void {
  if (!isAudioEnabled()) return;
  const c = getContext();
  if (!c) return;

  try {
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, c.currentTime);
    osc.frequency.linearRampToValueAtTime(320, c.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(290, c.currentTime + 0.9);

    gain.gain.setValueAtTime(0.001, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, c.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start();
    osc.stop(c.currentTime + 0.92);
  } catch {}
}

/** Caribbean SFX: Water splash ring sound */
export function playTropicalSplashFx(): void {
  if (!isAudioEnabled()) return;
  const c = getContext();
  if (!c) return;

  try {
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start();
    osc.stop(c.currentTime + 0.17);
  } catch {}
}
