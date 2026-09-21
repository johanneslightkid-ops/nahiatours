import React, { useEffect, useState } from 'react';
import { FaCheck, FaExchangeAlt, FaLanguage, FaSpinner } from 'react-icons/fa';
import { providerStatus } from '../../services/aiGeneratorService';
import { Lang, translateRecord } from '../../lib/autoTranslate';

/**
 * The strip at the top of every bilingual editor.
 *
 * It appears only when an AI provider on this deployment can actually answer —
 * a button that fails when pressed is worse than no button, and on a site with
 * no key and no binding this one is simply not there.
 *
 * It translates and hands the result to the panel; the panel says what happens
 * next, in `note`, before the operator presses anything. Two shapes are in use:
 * the welcome-page editor loads the translation into the open editor so it can
 * be read before saving, and the tour and transport panels write it into the
 * other language's record, because those show one language at a time and there
 * is no second editor to load it into.
 */

interface TranslateBarProps<T> {
  /** The record currently being edited, in `from`. */
  value: T;
  /** Which language that record is in. */
  from: Lang;
  /**
   * Handed the translated copy. The panel decides what happens to it — some
   * open it for review, some write it straight into the other language's
   * record — and whatever it returns is what the operator is told.
   */
  onTranslated: (translated: T, to: Lang) => string | void | Promise<string | void>;
  /** The sentence under the heading. Say what this button will actually do. */
  note?: string;
  /** What is being translated, for the sentence. e.g. "las excursiones". */
  what: string;
  /** Hidden while the panel has nothing loaded yet. */
  disabled?: boolean;
}

const OTHER: Record<Lang, Lang> = { en: 'es', es: 'en' };
const NAME: Record<Lang, string> = { en: 'inglés', es: 'español' };

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

  // Nothing to offer, so nothing is shown. No disabled control, no
  // explanation nobody asked for.
  if (available !== true) return null;

  const to = OTHER[from];

  const run = async () => {
    setBusy(true);
    setProblem('');
    setDone('');
    try {
      const result = await translateRecord(value, from, to, (n, total) =>
        setProgress(`Traduciendo ${n} de ${total}…`)
      );
      if (result.total === 0) {
        setProblem('No hay texto que traducir en lo que está abierto.');
        return;
      }
      const said = await onTranslated(result.value, to);
      setDone(
        typeof said === 'string'
          ? said
          : `${result.translated} texto(s) traducidos al ${NAME[to]}.`
      );
    } catch (error) {
      setProblem(
        `No se pudo traducir: ${error instanceof Error ? error.message : String(error)}`
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
            <p className="text-sm font-bold text-ink">Traducir automáticamente</p>
            <p className="text-sm text-ink-soft">
              {note ||
                `Pasa ${what} de ${NAME[from]} a ${NAME[to]} con la IA configurada.`}
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
            <><FaSpinner className="animate-spin" /> {progress || 'Traduciendo…'}</>
          ) : (
            <><FaExchangeAlt /> {NAME[from]} → {NAME[to]}</>
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
