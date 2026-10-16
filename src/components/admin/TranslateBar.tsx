import React, { useEffect, useState } from 'react';
import { FaCheck, FaExchangeAlt, FaLanguage, FaSpinner } from 'react-icons/fa';
import { providerStatus } from '../../services/aiGeneratorService';
import { Lang, LANG_NAME, getTargetLanguages, translateRecord } from '../../lib/autoTranslate';
import { SUPPORTED_LOCALES } from '../../contexts/I18nContext';

/**
 * The strip at the top of every bilingual (now: multilingual) editor.
 *
 * It appears only when an AI provider on this deployment can actually answer.
 *
 * It now translates the current record into ALL remaining languages in one go
 * (en → es, de, fr; es → en, de, fr; etc.) and hands each result back through
 * `onTranslated` so the panel can save them where it likes.
 */

interface TranslateBarProps<T> {
  /** The record currently being edited, in `from`. */
  value: T;
  /** Which language that record is in. */
  from: Lang;
  /**
   * Called once per target language with the translated copy.
   * Return a string to override the default success message, or void.
   */
  onTranslated: (translated: T, to: Lang) => string | void | Promise<string | void>;
  /** The sentence under the heading. Say what this button will actually do. */
  note?: string;
  /** What is being translated, for the sentence. e.g. "las excursiones". */
  what: string;
  /** Hidden while the panel has nothing loaded yet. */
  disabled?: boolean;
}

const SHORT: Record<Lang, string> = { en: 'EN', es: 'ES', de: 'DE', fr: 'FR' };

function TranslateBar<T>({ value, from, onTranslated, what, note, disabled }: TranslateBarProps<T>) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    (async () => {
      const status = await providerStatus();
      setAvailable(Boolean(status?.providers.some((p) => p.usable)));
    })();
  }, []);

  if (available !== true) return null;

  const targets = getTargetLanguages(from, SUPPORTED_LOCALES);

  const run = async () => {
    setBusy(true);
    setProblem('');
    setDone('');
    const results: string[] = [];
    try {
      for (let i = 0; i < targets.length; i++) {
        const to = targets[i];
        setProgress(
          `Translating to ${LANG_NAME[to]}… (${i + 1}/${targets.length})`
        );
        const result = await translateRecord(value, from, to, (n, total) =>
          setProgress(`${LANG_NAME[to]}: ${n}/${total} strings…`)
        );
        if (result.total === 0) continue;
        const said = await onTranslated(result.value, to);
        if (typeof said === 'string') results.push(said);
        else results.push(`${result.translated} string(s) → ${LANG_NAME[to]}`);
      }
      setDone(results.length ? results.join(' · ') : 'Nothing new to translate.');
    } catch (error) {
      setProblem(
        `Translation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  return (
    <div className="mb-5 rounded-3xl border border-lagoon/35 bg-lagoon/10 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FaLanguage className="mt-0.5 h-6 w-6 shrink-0 text-lagoon-dark" />
          <div>
            <p className="text-sm font-bold text-ink">Auto-translate to all languages</p>
            <p className="text-sm text-ink-soft">
              {note ||
                `Translates ${what} from ${LANG_NAME[from]} to ${targets.map((t) => LANG_NAME[t]).join(', ')} using the configured AI.`}
            </p>
            <p className="mt-1 flex gap-1.5 text-xs text-ink-light">
              <span className="rounded-full bg-lagoon/20 px-2 py-0.5 font-bold text-lagoon-dark">
                {SHORT[from]}
              </span>
              <span className="self-center">→</span>
              {targets.map((t) => (
                <span key={t} className="rounded-full bg-paper-deep px-2 py-0.5 font-bold text-ink-soft">
                  {SHORT[t]}
                </span>
              ))}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy || disabled}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-lagoon-dark px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? (
            <><FaSpinner className="animate-spin" /> {progress || 'Translating…'}</>
          ) : (
            <><FaExchangeAlt /> Translate all</>
          )}
        </button>
      </div>

      {done && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-jungle-dark">
          <FaCheck /> {done}
        </p>
      )}
      {problem && (
        <p className="mt-3 text-sm font-semibold text-hibiscus-dark">{problem}</p>
      )}
    </div>
  );
}

export default TranslateBar;
