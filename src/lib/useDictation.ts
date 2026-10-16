import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdminPassword } from '../services/authStore';

/**
 * Dictation that does not repeat itself.
 *
 * The old version kept a running string and appended each "final" result to
 * it. That is correct on desktop Chrome and wrong almost everywhere else:
 * Chrome on Android hands back results that already contain the earlier ones,
 * and every browser restarts recognition after a pause, re-reporting the last
 * phrase. Appending turned "two adults and a child" into "two adults two adults
 * and a child". It also simply stopped after a few seconds of silence.
 *
 * Two engines now, chosen per device:
 *
 *  • LIVE — the browser's own speech service (Web Speech API), on desktop. The
 *    text is rebuilt from the complete result list on every event, never
 *    appended to, so nothing can be counted twice. When the browser ends the
 *    session after a pause it is restarted, and what was said is kept.
 *
 *  • RECORD — on phones, and wherever the browser has no speech service
 *    (Firefox). The microphone is recorded as 16 kHz mono WAV, which every
 *    decoder reads, and transcribed on the Worker by Workers AI's Whisper
 *    (/api/transcribe). Slower by a second or two, but the same on Android,
 *    iPhone and any desktop, and far more accurate with place names.
 */

export type DictationMode = 'live' | 'record' | 'none';

const SPEECH_LANG: Record<string, string> = { en: 'en-US', es: 'es-DO', fr: 'fr-FR', de: 'de-DE' };

const isMobile = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

const speechRecognitionCtor = (): any =>
  typeof window === 'undefined'
    ? null
    : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

const canRecord = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window !== 'undefined' &&
  !!(window.AudioContext || (window as any).webkitAudioContext);

export const pickDictationMode = (): DictationMode => {
  if (speechRecognitionCtor() && !isMobile()) return 'live';
  if (canRecord()) return 'record';
  if (speechRecognitionCtor()) return 'live';
  return 'none';
};

/** "a  b" + "b c" style seams and runs of spaces, tidied. */
const join = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1');

/** PCM float samples at `from` Hz → 16-bit mono WAV at 16 kHz. */
const encodeWav = (chunks: Float32Array[], from: number): Blob => {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const to = 16000;
  const ratio = from / to;
  const outLength = Math.floor(merged.length / ratio);
  const buffer = new ArrayBuffer(44 + outLength * 2);
  const view = new DataView(buffer);
  const write = (at: number, text: string) => [...text].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + outLength * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, to, true);
  view.setUint32(28, to * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, outLength * 2, true);
  for (let i = 0; i < outLength; i += 1) {
    // Average the source samples this output sample covers: a cheap low-pass
    // that keeps speech clear without aliasing hiss.
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), merged.length);
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += merged[j];
    const sample = Math.max(-1, Math.min(1, end > start ? sum / (end - start) : merged[start] || 0));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([view], { type: 'audio/wav' });
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const MAX_RECORDING_SECONDS = 180;

export interface Dictation {
  mode: DictationMode;
  listening: boolean;
  /** RECORD mode, between stopping and the text arriving. */
  transcribing: boolean;
  /** Seconds recorded so far, RECORD mode. */
  seconds: number;
  error: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

/**
 * @param text   What the field holds now; dictation continues after it.
 * @param onText Receives the whole new field value, never a fragment.
 * @param lang   Site language code: en, es, fr or de.
 */
export const useDictation = (text: string, onText: (value: string) => void, lang = 'es'): Dictation => {
  const [mode] = useState<DictationMode>(pickDictationMode);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  const textRef = useRef(text);
  textRef.current = text;
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  // LIVE
  const recognitionRef = useRef<any>(null);
  const wantedRef = useRef(false);
  const baseRef = useRef('');
  const sessionFinalRef = useRef('');

  // RECORD
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopLive = useCallback(() => {
    wantedRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const startLive = useCallback(() => {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG[lang] || 'es-DO';
    baseRef.current = textRef.current;
    sessionFinalRef.current = '';
    wantedRef.current = true;

    recognition.onresult = (event: any) => {
      // Rebuilt from the full list on every event, never appended to: a
      // result the browser sends twice is simply the same text twice.
      let finals = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finals = join(finals, chunk);
        else interim = join(interim, chunk);
      }
      sessionFinalRef.current = finals;
      onTextRef.current(join(baseRef.current, finals, interim));
    };
    recognition.onerror = (event: any) => {
      if (event?.error === 'no-speech' || event?.error === 'aborted') return;
      wantedRef.current = false;
      setError(
        event?.error === 'not-allowed' || event?.error === 'service-not-allowed'
          ? 'El navegador no tiene permiso para usar el micrófono.'
          : `El dictado se detuvo (${event?.error || 'error'}).`
      );
    };
    recognition.onend = () => {
      // The browser ends the session after a pause. What was said is kept and
      // a new session starts after it, until the operator presses stop.
      baseRef.current = join(baseRef.current, sessionFinalRef.current);
      sessionFinalRef.current = '';
      onTextRef.current(baseRef.current);
      if (wantedRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          /* fall through: could not restart */
        }
      }
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setError('');
    } catch {
      setError('No se pudo iniciar el dictado.');
    }
  }, [lang]);

  const releaseRecorder = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void contextRef.current?.close().catch(() => undefined);
  };

  const stopRecord = useCallback(async () => {
    const context = contextRef.current;
    const chunks = chunksRef.current;
    const rate = context?.sampleRate || 48000;
    releaseRecorder();
    contextRef.current = null;
    chunksRef.current = [];
    setListening(false);
    if (!chunks.length) return;

    setTranscribing(true);
    try {
      const audio = await blobToBase64(encodeWav(chunks, rate));
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': getAdminPassword() ?? '' },
        body: JSON.stringify({ audio, language: lang }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (data.text) onTextRef.current(join(textRef.current, data.text));
    } catch (e) {
      setError(`No se pudo transcribir: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTranscribing(false);
    }
  }, [lang]);

  const startRecord = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const context: AudioContext = new Ctx();
      // iOS starts an AudioContext suspended until a gesture resumes it.
      await context.resume().catch(() => undefined);
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      processor.onaudioprocess = (event) => {
        chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(context.destination);
      streamRef.current = stream;
      contextRef.current = context;
      processorRef.current = processor;
      setSeconds(0);
      setListening(true);
      const started = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_RECORDING_SECONDS) void stopRecord();
      }, 500);
    } catch (e) {
      releaseRecorder();
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'El navegador no tiene permiso para usar el micrófono.'
          : 'No se pudo abrir el micrófono.'
      );
    }
  }, [stopRecord]);

  const start = useCallback(() => {
    if (listening || transcribing) return;
    if (mode === 'live') startLive();
    else if (mode === 'record') void startRecord();
  }, [listening, transcribing, mode, startLive, startRecord]);

  const stop = useCallback(() => {
    if (mode === 'live') stopLive();
    else if (mode === 'record') void stopRecord();
  }, [mode, stopLive, stopRecord]);

  const toggle = useCallback(() => (listening ? stop() : start()), [listening, start, stop]);

  useEffect(
    () => () => {
      wantedRef.current = false;
      try {
        recognitionRef.current?.abort?.();
      } catch {
        /* gone */
      }
      releaseRecorder();
    },
    []
  );

  return { mode, listening, transcribing, seconds, error, start, stop, toggle };
};
