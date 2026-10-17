import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HiMicrophone, HiRefresh, HiVolumeOff, HiVolumeUp } from 'react-icons/hi';
import { useI18n } from '../../contexts/I18nContext';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { getFlowCopy } from '../../planner/flowCopy';
import { haptic, HAPTIC } from '../../planner/haptics';
import { lineHash, VoiceSegment } from '../../planner/voiceScript';
import {
  matchUtterance,
  pickVoice,
  RECOGNITION_LANG,
  speakable,
  VoiceMatch,
  VoiceOption,
  voiceLocale,
} from '../../planner/voice';

/** What the question does with an answer: keep listening (multi-select) or not. */
export type VoiceOutcome = { listenAgain: boolean; say?: VoiceSegment };

interface VoiceGuideProps {
  /** Changes whenever a different question is on screen. */
  stepKey: string;
  /** Read aloud, in order, when the question appears (see planner/voiceScript.ts). */
  segments: VoiceSegment[];
  /** Told which option is being read — or null — so the page can point at it. */
  onSegment?: (optionId: string | null) => void;
  options: VoiceOption[];
  wantsNumber?: boolean;
  onMatch: (match: VoiceMatch) => VoiceOutcome;
}

type Phase = 'idle' | 'speaking' | 'listening';

// The recogniser is still vendor-prefixed in Chrome and Safari.
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

const recognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const STORAGE_KEY = 'planner_voice';

/**
 * Recorded clips, when someone has made them. The manifest lists which ids
 * exist per language, so a missing recording costs no failed request — the
 * device's synthesiser simply reads that line instead.
 */
const CLIP_ROOT = '/audio/planner';
/** { en: { 'q-partyType': '<fingerprint of the recorded words>' }, … } */
let manifest: Promise<Record<string, Record<string, string>>> | null = null;
// Kept once loaded: each question mounts a fresh guide, and it must know the
// clips before it starts reading, not a network round trip later.
let manifestLoaded: Record<string, Record<string, string>> | null = null;
type Manifest = Record<string, Record<string, string>>;
const loadManifest = (): Promise<Manifest> =>
  (manifest ??= fetch(`${CLIP_ROOT}/manifest.json`, { cache: 'no-cache' })
    .then((response): Promise<unknown> => (response.ok ? response.json() : Promise.resolve({})))
    .catch((): unknown => ({}))
    .then((list) => (manifestLoaded = list && typeof list === 'object' ? (list as Manifest) : {})));

const readEnabled = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * The hands-free guide, phones and tablets only.
 *
 * Reads each question with the device's own speech synthesiser, then listens
 * once through the browser's recogniser and matches what it hears against the
 * answers on screen (see planner/voice.ts). Nothing leaves the page except
 * what the browser's speech service itself does with the audio. Where the
 * browser can speak but not listen, it reads aloud and the guest taps; where
 * it can do neither, the guide does not appear at all.
 */
export const VoiceGuide: React.FC<VoiceGuideProps> = ({ stepKey, segments, onSegment, options, wantsNumber, onMatch }) => {
  const { locale } = useI18n();
  const flow = getFlowCopy(locale);
  const lang = voiceLocale(locale);
  const touch = useMediaQuery('(pointer: coarse)');

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  const Ctor = recognitionCtor();

  const [enabled, setEnabled] = useState(readEnabled);
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState('');
  const [problem, setProblem] = useState<'blocked' | null>(null);

  const recognition = useRef<Recognition | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [clips, setClips] = useState<Record<string, string>>(() => manifestLoaded?.[voiceLocale(locale)] ?? {});
  // Set when the tap that switched the guide on already started reading.
  const startedByTap = useRef(false);
  const retries = useRef(0);
  const speakTimer = useRef<number | null>(null);
  // Always the latest props, so the recogniser's callbacks never act on a
  // question that has already left the screen.
  const latest = useRef({ options, wantsNumber, onMatch, segments, onSegment });
  latest.current = { options, wantsNumber, onMatch, segments, onSegment };
  // Bumped by every stop, so a sequence that was interrupted stops advancing.
  const sequence = useRef(0);

  useEffect(() => {
    let current = true;
    loadManifest().then((list) => current && setClips(list[lang] ?? {}));
    return () => {
      current = false;
    };
  }, [lang]);

  const stopAll = useCallback(() => {
    sequence.current += 1;
    latest.current.onSegment?.(null);
    if (speakTimer.current !== null) window.clearTimeout(speakTimer.current);
    speakTimer.current = null;
    try {
      synth?.cancel();
    } catch {
      /* nothing to cancel */
    }
    if (audio.current) {
      audio.current.onended = null;
      audio.current.onerror = null;
      audio.current.pause();
    }
    if (recognition.current) {
      recognition.current.onend = null;
      recognition.current.onresult = null;
      recognition.current.onerror = null;
      try {
        recognition.current.abort();
      } catch {
        /* already stopped */
      }
      recognition.current = null;
    }
    setPhase('idle');
  }, [synth]);

  /**
   * Read segments one after another — a recording where there is one for
   * exactly these words, the synthesiser otherwise — telling the page which
   * option each one is, then hand over to `then` (usually: listen).
   */
  const speak = useCallback(
    (parts: VoiceSegment[], then?: () => void) => {
      stopAll();
      const run = sequence.current;
      let index = 0;

      const finish = () => {
        if (run !== sequence.current) return;
        latest.current.onSegment?.(null);
        setPhase('idle');
        // A short gap so the recogniser does not hear the end of the voice.
        if (then) window.setTimeout(() => run === sequence.current && then(), 250);
      };

      const next = () => {
        if (run !== sequence.current) return;
        const part = parts[index++];
        if (!part) return finish();
        latest.current.onSegment?.(part.optionId ?? null);

        let ended = false;
        const done = () => {
          if (ended || run !== sequence.current) return;
          ended = true;
          if (speakTimer.current !== null) window.clearTimeout(speakTimer.current);
          speakTimer.current = null;
          // A breath between options, as a person reading a list would take.
          window.setTimeout(next, part.optionId ? 90 : 160);
        };

        const synthesise = () => {
          if (!synth) return done();
          const utterance = new SpeechSynthesisUtterance(speakable(part.text, lang));
          utterance.lang = RECOGNITION_LANG[lang];
          const voice = pickVoice(synth.getVoices(), lang);
          if (voice) utterance.voice = voice;
          utterance.rate = 1.02;
          utterance.onend = done;
          utterance.onerror = done;
          // Some Android builds never fire `end`; don't wait on them forever.
          speakTimer.current = window.setTimeout(done, 2500 + part.text.length * 75);
          synth.speak(utterance);
        };

        // Only a recording of exactly these words: after a copy edit the old
        // clip would say something the screen no longer does.
        if (clips[part.id] && clips[part.id] === lineHash(part.text)) {
          // One element for the whole session: once iOS has let it play from
          // a tap, it may play again without one.
          const player = (audio.current ??= new Audio());
          player.onended = done;
          player.onerror = synthesise;
          player.src = `${CLIP_ROOT}/${lang}/${part.id}.mp3`;
          player.play().catch(synthesise);
          return;
        }
        synthesise();
      };

      setPhase('speaking');
      next();
    },
    [clips, lang, stopAll, synth]
  );

  const listen = useCallback(() => {
    if (!Ctor || problem === 'blocked') return;
    stopAll();
    const rec = new Ctor();
    rec.lang = RECOGNITION_LANG[lang];
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false;

    let gotResult = false;
    rec.onresult = (event: any) => {
      gotResult = true;
      const result = event.results?.[0];
      const alternatives: string[] = [];
      for (let i = 0; i < (result?.length ?? 0); i += 1) alternatives.push(result[i].transcript);
      setHeard(alternatives[0] ?? '');

      const { options: opts, wantsNumber: number, onMatch: handle } = latest.current;
      const match = matchUtterance(alternatives, opts, lang, { wantsNumber: number });

      if (!match) {
        haptic(HAPTIC.miss);
        if (retries.current < 1) {
          retries.current += 1;
          speak([{ id: 'fb-didnt-catch', text: flow.voice.didntCatch }], listen);
        } else {
          setPhase('idle');
        }
        return;
      }

      haptic(HAPTIC.heard);
      retries.current = 0;
      if (match.kind === 'command' && match.command === 'repeat') {
        speak(latest.current.segments, listen);
        return;
      }
      if (match.kind === 'command' && match.command === 'stop') {
        stopAll();
        setEnabled(false);
        return;
      }
      const outcome = handle(match);
      if (outcome.say) speak([outcome.say], outcome.listenAgain ? listen : undefined);
      else if (outcome.listenAgain) listen();
      else setPhase('idle');
    };
    rec.onerror = (event: any) => {
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') setProblem('blocked');
    };
    rec.onend = () => {
      if (!gotResult) setPhase('idle');
      if (recognition.current === rec) recognition.current = null;
    };

    recognition.current = rec;
    setHeard('');
    setPhase('listening');
    try {
      rec.start();
    } catch {
      setPhase('idle');
    }
  }, [Ctor, flow.voice.didntCatch, lang, problem, speak, stopAll]);

  // Persist the choice, so the guide stays on from question to question and
  // across visits on this device.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      /* private mode */
    }
  }, [enabled]);

  // Voices load asynchronously on Chrome; asking once wakes the list up.
  useEffect(() => {
    synth?.getVoices();
  }, [synth]);

  // A new question: read it, then listen.
  useEffect(() => {
    if (!enabled) return undefined;
    retries.current = 0;
    if (startedByTap.current) {
      startedByTap.current = false;
      return stopAll;
    }
    speak(latest.current.segments, Ctor ? listen : undefined);
    return stopAll;
    // Only when the question changes or the guide is switched on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, enabled]);

  // Leaving the tab silences it.
  useEffect(() => {
    const onHide = () => document.hidden && stopAll();
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [stopAll]);

  if (!touch || !synth) return null;

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => {
          haptic(HAPTIC.tap);
          // iOS only lets a page make sound that a tap started, so the first
          // question is read right here rather than after the next render.
          retries.current = 0;
          startedByTap.current = true;
          speak(latest.current.segments, Ctor ? listen : undefined);
          setEnabled(true);
        }}
        className="voice-pill mb-5 flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mango text-ink">
          <HiVolumeUp className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-base font-bold text-paper">{flow.voice.title}</span>
          <span className="block text-xs leading-snug text-paper/75">{flow.voice.blurb}</span>
        </span>
      </button>
    );
  }

  const status =
    phase === 'speaking'
      ? flow.voice.speaking
      : phase === 'listening'
      ? flow.voice.listening
      : problem === 'blocked'
      ? flow.voice.micBlocked
      : !Ctor
      ? flow.voice.noMic
      : heard
      ? flow.voice.heard(heard)
      : flow.voice.tapToSpeak;

  return (
    <div className="voice-pill mb-5 px-3 py-2.5" aria-live="polite">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={!Ctor || problem === 'blocked'}
          onClick={() => {
            haptic(HAPTIC.tap);
            if (phase === 'listening') stopAll();
            else listen();
          }}
          aria-label={flow.voice.tapToSpeak}
          className="voice-mic relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mango text-ink disabled:opacity-40"
          data-phase={phase}
        >
          <span className="voice-ring" aria-hidden="true" />
          {phase === 'speaking' ? <HiVolumeUp className="h-5 w-5" /> : <HiMicrophone className="h-5 w-5" />}
        </button>
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-paper">{status}</span>
        <button
          type="button"
          onClick={() => {
            haptic(HAPTIC.tap);
            retries.current = 0;
            speak(latest.current.segments, Ctor ? listen : undefined);
          }}
          aria-label={flow.voice.repeat}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-paper/30 text-paper"
        >
          <HiRefresh className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            haptic(HAPTIC.tap);
            stopAll();
            setEnabled(false);
          }}
          aria-label={flow.voice.off}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-paper/30 text-paper"
        >
          <HiVolumeOff className="h-4 w-4" />
        </button>
      </div>
      {(Ctor || Object.keys(clips).length > 0) && (
        <p className="mt-1.5 px-1 text-[0.68rem] leading-snug text-paper/55">
          {[Object.keys(clips).length > 0 ? flow.voice.aiVoice : '', Ctor ? flow.voice.privacy : ''].filter(Boolean).join(' ')}
        </p>
      )}
    </div>
  );
};
