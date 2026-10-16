import { useCallback, useEffect, useRef, useState } from 'react';
import { providerStatus } from '../../services/aiGeneratorService';
import { Lang, getTargetLanguages } from '../../lib/autoTranslate';
import { SUPPORTED_LOCALES } from '../../contexts/I18nContext';

/**
 * The state behind a translate strip: whether an AI provider can answer,
 * whether saves are translated automatically, and what the last run did.
 *
 * A panel calls `afterSave` once its own save has gone through, with a job
 * that brings ONE other language up to date with that save — usually by
 * handing the list as loaded and as saved to `syncList`. The job runs once
 * per other language, in a queue, so two saves in a row never write the same
 * language at the same time.
 */

/** Brings one other language up to date. Returns what it did, or null for "nothing". */
export type TranslationJob = (to: Lang, report: (line: string) => void) => Promise<string | null>;

export interface TranslationSync {
  from: Lang;
  targets: Lang[];
  /** null while asking the server; false when no provider is usable. */
  available: boolean | null;
  /** Translate on save. Remembered per browser; on by default. */
  auto: boolean;
  setAuto: (on: boolean) => void;
  busy: boolean;
  progress: string;
  done: string;
  problem: string;
  /** Run a job for every other language (or for `only`). */
  run: (job: TranslationJob, only?: Lang[]) => Promise<void>;
  /** The same, but only when translating on save is switched on and possible. */
  afterSave: (job: TranslationJob, only?: Lang[]) => Promise<void>;
}

const AUTO_KEY = 'admin.translateOnSave';

const SHORT: Record<Lang, string> = { en: 'EN', es: 'ES', de: 'DE', fr: 'FR' };

const readAuto = (): boolean => {
  try {
    return window.localStorage.getItem(AUTO_KEY) !== 'off';
  } catch {
    return true;
  }
};

let providerCheck: Promise<boolean> | null = null;

/** One question to the server per page load, however many strips are on it. */
const providerUsable = (): Promise<boolean> => {
  if (!providerCheck) {
    providerCheck = providerStatus()
      .then((status) => Boolean(status?.providers.some((p) => p.usable)))
      .catch(() => false);
  }
  return providerCheck;
};

export const useTranslationSync = (from: Lang): TranslationSync => {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [auto, setAutoState] = useState<boolean>(readAuto);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState('');
  const [problem, setProblem] = useState('');
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);

  useEffect(() => {
    let alive = true;
    providerUsable().then((usable) => alive && setAvailable(usable));
    return () => {
      alive = false;
    };
  }, []);

  const targets = getTargetLanguages(from, SUPPORTED_LOCALES);

  const setAuto = useCallback((on: boolean) => {
    setAutoState(on);
    try {
      window.localStorage.setItem(AUTO_KEY, on ? 'on' : 'off');
    } catch {
      /* private window: it just will not be remembered */
    }
  }, []);

  const run = useCallback(
    (job: TranslationJob, only?: Lang[]) => {
      const languages = only ?? targets;
      pending.current += 1;
      setBusy(true);
      setProblem('');
      setDone('');
      const task = queue.current.then(async () => {
        const lines: string[] = [];
        const failures: string[] = [];
        for (const to of languages) {
          setProgress(`${SHORT[to]}…`);
          try {
            const said = await job(to, (line) => setProgress(`${SHORT[to]}: ${line}`));
            if (said) lines.push(`${SHORT[to]}: ${said}`);
          } catch (error) {
            failures.push(`${SHORT[to]}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        setDone(lines.length ? lines.join(' · ') : failures.length ? '' : 'Nada que traducir: los demás idiomas ya estaban al día.');
        if (failures.length) setProblem(`No se pudo traducir — ${failures.join(' · ')}`);
      });
      queue.current = task.finally(() => {
        pending.current -= 1;
        if (pending.current === 0) {
          setBusy(false);
          setProgress('');
        }
      });
      return queue.current;
    },
    // targets is derived from `from`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from]
  );

  const afterSave = useCallback(
    async (job: TranslationJob, only?: Lang[]) => {
      if (!auto || !(await providerUsable())) return;
      await run(job, only);
    },
    [auto, run]
  );

  return { from, targets, available, auto, setAuto, busy, progress, done, problem, run, afterSave };
};
