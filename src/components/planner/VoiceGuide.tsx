import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HiMicrophone, HiRefresh, HiVolumeOff, HiVolumeUp } from 'react-icons/hi';
import { useI18n } from '../../contexts/I18nContext';
import { resetPlannerBar, setPlannerBar } from '../../planner/plannerBar';
import { getFlowCopy } from '../../planner/flowCopy';
import { haptic, HAPTIC } from '../../planner/haptics';
import { lineHash, VoiceSegment } from '../../planner/voiceScript';
import {
  matchUtterance,
  normalize,
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

/** Listening goes on this long after the last word was read, then the mic closes. */
const LISTEN_AFTER_MS = 15000;
/** The guide's own voice, picked up by the mic, can arrive this long after it stopped. */
const ECHO_TAIL_MS = 1500;
/** A breath between segments. The clips carry almost no silence of their own. */
const GAP_AFTER_OPTION_MS = 40;
const GAP_AFTER_LINE_MS = 120;

/**
 * Recorded clips, when someone has made them. The manifest lists which ids
 * exist per language, so a missing recording costs no failed request — the
 * device's synthesiser simply reads that line instead.
 */
const CLIP_ROOT = '/audio/planner';
type Manifest = Record<string, Record<string, string>>;
let manifest: Promise<Manifest> | null = null;
// Kept once loaded: each question mounts a fresh guide, and it must know the
// clips before it starts reading, not a network round trip later.
let manifestLoaded: Manifest | null = null;
const loadManifest = (): Promise<Manifest> =>
  (manifest ??= fetch(`${CLIP_ROOT}/manifest.json`, { cache: 'no-cache' })
    .then((response): Promise<unknown> => (response.ok ? response.json() : Promise.resolve({})))
    .catch((): unknown => ({}))
    .then((list) => (manifestLoaded = list && typeof list === 'object' ? (list as Manifest) : {})));

/**
 * Clips already downloaded, as object URLs. A question's clips are fetched
 * the moment it appears, so moving from one option to the next is instant
 * rather than a download each time.
 */
const clipUrls = new Map<string, string>();
const clipLoads = new Map<string, Promise<void>>();
const preloadClip = (lang: string, id: string) => {
  const key = `${lang}/${id}`;
  if (clipUrls.has(key) || clipLoads.has(key)) return;
  clipLoads.set(
    key,
    fetch(`${CLIP_ROOT}/${key}.mp3`)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => void clipUrls.set(key, URL.createObjectURL(blob)))
      .catch(() => void clipLoads.delete(key))
  );
};

/**
 * One player for the whole visit: once iOS has let it play from a tap, it
 * may play again without one — including on the next question, which mounts
 * a fresh guide.
 */
let sharedPlayer: HTMLAudioElement | null = null;
const player = () => (sharedPlayer ??= new Audio());

/**
 * Keep the loudspeaker. With the microphone open, iOS Safari otherwise picks
 * a call-style audio route and the voice moves to the earpiece. Asking for
 * "play-and-record" explicitly makes WebKit default to the speaker (a headset
 * still wins). A no-op where the Audio Session API does not exist.
 */
let sessionResetTimer: number | undefined;
const setAudioSession = (type: 'play-and-record' | 'auto') => {
  if (sessionResetTimer !== undefined) window.clearTimeout(sessionResetTimer);
  sessionResetTimer = undefined;
  try {
    const session = (navigator as any).audioSession;
    if (session && session.type !== type) session.type = type;
  } catch {
    /* not supported */
  }
};
// Each question remounts the guide; only a real exit gives the route back.
const releaseAudioSessionSoon = () => {
  if (sessionResetTimer !== undefined) window.clearTimeout(sessionResetTimer);
  sessionResetTimer = window.setTimeout(() => setAudioSession('auto'), 1500);
};

/**
 * Whether this device lets the voice keep playing while the mic is open.
 * Some phones hand the audio to the recogniser and silence the page; when
 * that is seen once, the guide listens after reading instead, as before.
 */
const BARGE_IN_KEY = 'planner_voice_bargein_off';
const bargeInAllowed = () => {
  try {
    return sessionStorage.getItem(BARGE_IN_KEY) !== '1';
  } catch {
    return true;
  }
};
// Once can be the permission dialog pausing the sound; twice is the device.
let interruptions = 0;
const noteInterruption = () => {
  interruptions += 1;
  if (interruptions < 2) return false;
  try {
    sessionStorage.setItem(BARGE_IN_KEY, '1');
  } catch {
    /* only for this page then */
  }
  return true;
};

const readEnabled = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

/** A twentieth of a second of silence, as a WAV, to unlock the player inside a tap. */
let silence: string | null = null;
const silentClip = () => {
  if (silence) return silence;
  const rate = 8000;
  const samples = rate / 20;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, 'data');
  view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  let binary = '';
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return (silence = `data:audio/wav;base64,${btoa(binary)}`);
};

/**
 * For the planner's start button: when the guide was left on, take the tap
 * that starts the questions to claim the loudspeaker and unlock the player.
 */
export const primeVoiceGuide = () => {
  if (!readEnabled()) return;
  setAudioSession('play-and-record');
  const audio = player();
  try {
    audio.muted = true;
    audio.src = silentClip();
    void audio.play().then(() => audio.pause()).catch(() => undefined).finally(() => {
      audio.muted = false;
    });
  } catch {
    /* the guide's own tap will try again */
  }
};

/** The words of a phrase, for comparing what was heard with what was read. */
const words = (text: string) => normalize(text).split(' ').filter((word) => word.length > 1);

/**
 * The hands-free guide, on every device that can speak.
 *
 * Reads each question — a recording where there is one, the device's own
 * synthesiser otherwise — while listening the whole time through the
 * browser's recogniser, so the guest can answer the moment they hear the
 * option they want instead of waiting for the list to end. What is heard is
 * matched against the answers on screen (see planner/voice.ts); the guide's
 * own voice coming back through the mic is recognised and ignored. Nothing
 * leaves the page except what the browser's speech service itself does with
 * the audio. Where the browser can speak but not listen, it reads aloud and
 * the guest taps.
 */
export const VoiceGuide: React.FC<VoiceGuideProps> = ({ stepKey, segments, onSegment, options, wantsNumber, onMatch }) => {
  const { locale } = useI18n();
  const flow = getFlowCopy(locale);
  const lang = voiceLocale(locale);

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  const Ctor = recognitionCtor();

  const [enabled, setEnabled] = useState(readEnabled);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [problem, setProblem] = useState<'blocked' | null>(null);

  const [clips, setClips] = useState<Record<string, string>>(() => manifestLoaded?.[voiceLocale(locale)] ?? {});
  // Set when the tap that switched the guide on already started reading.
  const startedByTap = useRef(false);
  const retries = useRef(0);
  const speakTimer = useRef<number | null>(null);
  // Always the latest props, so the recogniser's callbacks never act on a
  // question that has already left the screen.
  const latest = useRef({ options, wantsNumber, onMatch, segments, onSegment });
  latest.current = { options, wantsNumber, onMatch, segments, onSegment };
  // Bumped by every stop, so a reading that was interrupted stops advancing.
  const speech = useRef(0);
  const speakingNow = useRef(false);
  const ourPause = useRef(false);
  // What was read and when, to tell an echo of the guide from the guest.
  const spoken = useRef<{ words: Set<string>; end?: number }[]>([]);
  const lastSpokeAt = useRef(0);

  const recognition = useRef<Recognition | null>(null);
  const wantListening = useRef(false);
  const listenUntil = useRef(0);
  const restarts = useRef(0);
  const handledResults = useRef(0);
  const listenRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let current = true;
    loadManifest().then((list) => current && setClips(list[lang] ?? {}));
    return () => {
      current = false;
    };
  }, [lang]);

  const hasClip = useCallback((part: VoiceSegment) => Boolean(clips[part.id] && clips[part.id] === lineHash(part.text)), [clips]);

  // Fetch this question's clips (and the "didn't catch" line) straight away.
  useEffect(() => {
    if (!enabled) return;
    [...segments, { id: 'fb-didnt-catch', text: flow.voice.didntCatch }].forEach((part) => {
      if (hasClip(part)) preloadClip(lang, part.id);
    });
  }, [enabled, segments, hasClip, lang, flow.voice.didntCatch]);

  const stopSpeaking = useCallback(() => {
    speech.current += 1;
    if (speakingNow.current) lastSpokeAt.current = Date.now();
    speakingNow.current = false;
    latest.current.onSegment?.(null);
    if (speakTimer.current !== null) window.clearTimeout(speakTimer.current);
    speakTimer.current = null;
    try {
      synth?.cancel();
    } catch {
      /* nothing to cancel */
    }
    const audio = sharedPlayer;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.onpause = null;
      ourPause.current = true;
      audio.pause();
      ourPause.current = false;
    }
    setSpeaking(false);
  }, [synth]);

  const stopListening = useCallback(() => {
    wantListening.current = false;
    const rec = recognition.current;
    recognition.current = null;
    if (rec) {
      rec.onend = null;
      rec.onresult = null;
      rec.onerror = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
    setListening(false);
  }, []);

  const stopAll = useCallback(() => {
    stopSpeaking();
    stopListening();
  }, [stopListening, stopSpeaking]);

  /**
   * Read segments one after another, telling the page which option each one
   * is, then hand over to `then`. Listening is left alone: the guest may
   * answer at any point.
   */
  const speak = useCallback(
    (parts: VoiceSegment[], then?: () => void) => {
      stopSpeaking();
      const run = speech.current;
      let index = 0;
      speakingNow.current = true;
      setSpeaking(true);

      const finish = () => {
        if (run !== speech.current) return;
        speakingNow.current = false;
        lastSpokeAt.current = Date.now();
        latest.current.onSegment?.(null);
        setSpeaking(false);
        then?.();
      };

      const next = () => {
        if (run !== speech.current) return;
        const part = parts[index++];
        if (!part) return finish();
        latest.current.onSegment?.(part.optionId ?? null);
        const line: { words: Set<string>; end?: number } = { words: new Set(words(part.text)) };
        spoken.current = [...spoken.current.filter((entry) => entry.end === undefined || Date.now() - entry.end < 20000), line];

        let ended = false;
        const done = () => {
          if (ended || run !== speech.current) return;
          ended = true;
          line.end = Date.now();
          if (speakTimer.current !== null) window.clearTimeout(speakTimer.current);
          speakTimer.current = null;
          lastSpokeAt.current = Date.now();
          window.setTimeout(next, part.optionId ? GAP_AFTER_OPTION_MS : GAP_AFTER_LINE_MS);
        };

        // The sound was taken away while the mic was open: read this line
        // again, and if it keeps happening, stop listening during reading on
        // this device (it listens after reading instead, as before).
        const interrupted = () => {
          if (ended || run !== speech.current || !wantListening.current) return done();
          ended = true;
          if (noteInterruption()) stopListening();
          index -= 1;
          window.setTimeout(next, 150);
        };

        const synthesise = () => {
          if (!synth) return done();
          const utterance = new SpeechSynthesisUtterance(speakable(part.text, lang));
          utterance.lang = RECOGNITION_LANG[lang];
          const voice = pickVoice(synth.getVoices(), lang);
          if (voice) utterance.voice = voice;
          utterance.rate = 1.02;
          utterance.onend = done;
          utterance.onerror = (event: any) => (event?.error === 'interrupted' ? interrupted() : done());
          // Some Android builds never fire `end`; don't wait on them forever.
          speakTimer.current = window.setTimeout(done, 2500 + part.text.length * 75);
          synth.speak(utterance);
        };

        // Only a recording of exactly these words: after a copy edit the old
        // clip would say something the screen no longer does.
        if (hasClip(part)) {
          const audio = player();
          audio.muted = false;
          audio.onended = done;
          audio.onerror = synthesise;
          audio.onpause = () => {
            if (!ourPause.current && !audio.ended) interrupted();
          };
          audio.src = clipUrls.get(`${lang}/${part.id}`) ?? `${CLIP_ROOT}/${lang}/${part.id}.mp3`;
          audio.play().catch(synthesise);
          return;
        }
        synthesise();
      };

      next();
    },
    [hasClip, lang, stopListening, stopSpeaking, synth]
  );

  /**
   * Whether what was heard is the guide itself, coming back through the mic.
   *
   * The guest's answer is always words the guide has just read (an option's
   * name), so "said by the guide" alone proves nothing. What gives an echo
   * away is length and timing: a run of the guide's sentence is longer than
   * any answer, and a short phrase that is the line being read right now —
   * or the one that ended a moment ago — is the guide hearing itself. An
   * option named while a later one is being read is the guest choosing it.
   */
  const isEcho = (alternatives: string[]) => {
    const heardWords = words(alternatives[0] ?? '');
    if (heardWords.length === 0) return true;
    const now = Date.now();
    const recent = spoken.current.filter((line) => line.end === undefined || now - line.end < 15000);
    if (recent.length === 0) return false;
    const share = (set: Set<string>) => heardWords.filter((word) => set.has(word)).length / heardWords.length;
    if (share(new Set(recent.flatMap((line) => [...line.words]))) < 0.75) return false;
    const longestAnswer = Math.max(2, ...latest.current.options.map((option) => words(option.label).length));
    if (heardWords.length > longestAnswer + 2) return true;
    return recent.some((line) => (line.end === undefined || now - line.end < ECHO_TAIL_MS) && share(line.words) >= 0.75);
  };

  const handleHeard = (alternatives: string[]) => {
    if (isEcho(alternatives)) return;
    const busy = speakingNow.current || Date.now() - lastSpokeAt.current < ECHO_TAIL_MS;
    const { options: opts, wantsNumber: number, onMatch: handle } = latest.current;
    const match = matchUtterance(alternatives, opts, lang, { wantsNumber: number });

    if (!match) {
      // Half-heard words over the reading are not worth interrupting for.
      if (busy) return;
      setHeard(alternatives[0] ?? '');
      haptic(HAPTIC.miss);
      if (retries.current < 1) {
        retries.current += 1;
        listenUntil.current = Date.now() + LISTEN_AFTER_MS;
        speak([{ id: 'fb-didnt-catch', text: flow.voice.didntCatch }], () => {
          listenUntil.current = Date.now() + LISTEN_AFTER_MS;
        });
      }
      return;
    }

    setHeard(alternatives[0] ?? '');
    haptic(HAPTIC.heard);
    retries.current = 0;
    stopSpeaking();
    if (match.kind === 'command' && match.command === 'repeat') {
      speak(latest.current.segments, () => {
        listenUntil.current = Date.now() + LISTEN_AFTER_MS;
      });
      return;
    }
    if (match.kind === 'command' && match.command === 'stop') {
      stopAll();
      setEnabled(false);
      return;
    }
    const outcome = handle(match);
    if (!outcome.listenAgain) stopListening();
    else listenUntil.current = Date.now() + LISTEN_AFTER_MS;
    if (outcome.say) {
      speak([outcome.say], () => {
        if (outcome.listenAgain) listenUntil.current = Date.now() + LISTEN_AFTER_MS;
      });
    }
  };
  const handleHeardRef = useRef(handleHeard);
  handleHeardRef.current = handleHeard;

  /** Open the mic (if it is not open already) and keep it open while it is wanted. */
  const listen = useCallback(() => {
    if (!Ctor || problem === 'blocked') return;
    wantListening.current = true;
    if (recognition.current) return;
    const rec = new Ctor();
    rec.lang = RECOGNITION_LANG[lang];
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    // One session across the whole reading, rather than one per option.
    rec.continuous = true;
    handledResults.current = 0;

    rec.onresult = (event: any) => {
      const results = event.results ?? [];
      // Safari repeats earlier results in each event; only new finals count.
      for (let i = Math.max(event.resultIndex ?? 0, handledResults.current); i < results.length; i += 1) {
        const result = results[i];
        if (!result || result.isFinal === false) continue;
        handledResults.current = i + 1;
        const alternatives: string[] = [];
        for (let j = 0; j < (result.length ?? 0); j += 1) alternatives.push(result[j].transcript);
        handleHeardRef.current(alternatives);
      }
    };
    rec.onerror = (event: any) => {
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        setProblem('blocked');
        wantListening.current = false;
      }
    };
    rec.onend = () => {
      if (recognition.current === rec) recognition.current = null;
      // Recognisers stop on their own after a pause; reopen while the guest
      // is still being read to or was just asked, a limited number of times.
      const stillWanted =
        wantListening.current && (speakingNow.current || Date.now() < listenUntil.current) && !document.hidden;
      if (stillWanted && restarts.current < 12) {
        restarts.current += 1;
        window.setTimeout(() => wantListening.current && listenRef.current(), 120);
        return;
      }
      wantListening.current = false;
      setListening(false);
    };

    recognition.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      recognition.current = null;
      setListening(false);
    }
  }, [Ctor, lang, problem]);
  listenRef.current = listen;

  // Close the mic once the reading is long over and nobody spoke.
  useEffect(() => {
    if (!listening) return undefined;
    const timer = window.setInterval(() => {
      if (!speakingNow.current && listenUntil.current && Date.now() > listenUntil.current) stopListening();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [listening, stopListening]);

  /** Read the question and listen — during the reading where the device allows. */
  const readAndListen = useCallback(
    (parts: VoiceSegment[]) => {
      retries.current = 0;
      restarts.current = 0;
      listenUntil.current = Date.now() + 60000;
      if (Ctor && bargeInAllowed()) listen();
      speak(parts, () => {
        listenUntil.current = Date.now() + LISTEN_AFTER_MS;
        if (Ctor) listen();
      });
    },
    [Ctor, listen, speak]
  );

  // Persist the choice, so the guide stays on from question to question and
  // across visits on this device.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      /* private mode */
    }
    if (enabled) setAudioSession('play-and-record');
  }, [enabled]);

  // Leaving the planner gives the audio route back.
  useEffect(() => () => releaseAudioSessionSoon(), []);

  // Voices load asynchronously on Chrome; asking once wakes the list up.
  useEffect(() => {
    synth?.getVoices();
  }, [synth]);

  // A new question: read it, listening throughout.
  useEffect(() => {
    if (!enabled) return undefined;
    if (startedByTap.current) {
      startedByTap.current = false;
      return stopAll;
    }
    readAndListen(latest.current.segments);
    return stopAll;
    // Only when the question changes or the guide is switched on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, enabled]);

  // Leaving the tab silences it and closes the mic.
  useEffect(() => {
    const onHide = () => document.hidden && stopAll();
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [stopAll]);

  // The top bar's big play/pause (planner page only): on → off stops reading
  // and listening; off → on starts reading this question, inside the tap.
  const toggleFromBar = useRef<() => void>(() => undefined);
  toggleFromBar.current = () => {
    haptic(HAPTIC.tap);
    if (enabled) {
      stopAll();
      setEnabled(false);
      setAudioSession('auto');
    } else {
      setAudioSession('play-and-record');
      startedByTap.current = true;
      readAndListen(latest.current.segments);
      setEnabled(true);
    }
  };
  useEffect(() => {
    setPlannerBar({ audioAvailable: Boolean(synth), audioOn: enabled, toggleAudio: () => toggleFromBar.current() });
  }, [enabled, synth]);
  useEffect(() => () => resetPlannerBar(['audioAvailable', 'audioOn', 'toggleAudio']), []);

  if (!synth) return null;

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => {
          haptic(HAPTIC.tap);
          // All inside the tap: iOS only lets a page make sound — and keep
          // the loudspeaker — when a tap started it, and the microphone is
          // asked for right now rather than after the first list is read.
          setAudioSession('play-and-record');
          startedByTap.current = true;
          readAndListen(latest.current.segments);
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

  const phase = speaking ? 'speaking' : listening ? 'listening' : 'idle';
  const status = speaking
    ? listening
      ? flow.voice.speakingListening
      : flow.voice.speaking
    : listening
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
            if (speaking) {
              // Answering now: stop reading, keep the mic open.
              stopSpeaking();
              listenUntil.current = Date.now() + LISTEN_AFTER_MS;
              listen();
            } else if (listening) {
              stopListening();
            } else {
              retries.current = 0;
              restarts.current = 0;
              listenUntil.current = Date.now() + LISTEN_AFTER_MS;
              listen();
            }
          }}
          aria-label={flow.voice.tapToSpeak}
          className="voice-mic relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mango text-ink disabled:opacity-40"
          data-phase={listening ? 'listening' : phase}
        >
          <span className="voice-ring" aria-hidden="true" />
          {speaking && !listening ? <HiVolumeUp className="h-5 w-5" /> : <HiMicrophone className="h-5 w-5" />}
        </button>
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-paper">{status}</span>
        <button
          type="button"
          onClick={() => {
            haptic(HAPTIC.tap);
            readAndListen(latest.current.segments);
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
            setAudioSession('auto');
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
