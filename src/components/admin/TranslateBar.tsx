import React from 'react';
import { FaCheck, FaLanguage, FaMagic, FaSpinner } from 'react-icons/fa';
import { Lang, LANG_NAME } from '../../lib/autoTranslate';
import type { TranslationJob, TranslationSync } from './useTranslationSync';

/**
 * The strip at the top of every multilingual editor.
 *
 * Saving translates what the save changed — the tour that was edited, the
 * review that was added — into the other languages, and nothing else. This
 * strip says so, lets it be switched off (for a correction that belongs to
 * one language only), shows it working, and offers one more thing: filling
 * in what another language is MISSING. It never re-translates what a language
 * already has in its own words.
 *
 * It appears only when an AI provider on this deployment can actually answer.
 */

interface TranslateBarProps {
  sync: TranslationSync;
  /** What is being translated, for the sentence. e.g. "la excursión editada". */
  what: string;
  /** Translates on save? Panels without a save of their own (the blog list) say no. */
  onSave?: boolean;
  /** Fills one other language's gaps. Without it there is no button. */
  fillMissing?: TranslationJob;
  /** Which languages this strip is for, when not every other one. */
  languages?: Lang[];
  disabled?: boolean;
}

const SHORT: Record<Lang, string> = { en: 'EN', es: 'ES', de: 'DE', fr: 'FR' };

const LANG_ES: Record<Lang, string> = { en: 'inglés', es: 'español', de: 'alemán', fr: 'francés' };

const TranslateBar: React.FC<TranslateBarProps> = ({
  sync,
  what,
  onSave = true,
  fillMissing,
  languages,
  disabled,
}) => {
  const targets = languages ?? sync.targets;
  if (sync.available !== true || targets.length === 0) return null;

  const names = targets.map((t) => LANG_ES[t]).join(', ');

  return (
    <div className="mb-5 rounded-3xl border border-lagoon/35 bg-lagoon/10 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FaLanguage className="mt-0.5 h-6 w-6 shrink-0 text-lagoon-dark" />
          <div>
            <p className="text-sm font-bold text-ink">Traducción automática</p>
            <p className="text-sm text-ink-soft">
              {onSave
                ? `Al guardar, solo ${what} se traduce al ${names}. Lo demás de esos idiomas no se toca; si solo cambia un precio o una foto, se copia sin traducir.`
                : `Completa en ${names} solo lo que allí falta. Lo que ya está traducido no se toca.`}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-light">
              <span className="rounded-full bg-lagoon/20 px-2 py-0.5 font-bold text-lagoon-dark">
                {SHORT[sync.from]}
              </span>
              <span>→</span>
              {targets.map((t) => (
                <span key={t} className="rounded-full bg-paper-deep px-2 py-0.5 font-bold text-ink-soft" title={LANG_NAME[t]}>
                  {SHORT[t]}
                </span>
              ))}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {onSave && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-lagoon-dark"
                checked={sync.auto}
                onChange={(event) => sync.setAuto(event.target.checked)}
              />
              Traducir los cambios al guardar
            </label>
          )}
          {fillMissing && (
            <button
              type="button"
              onClick={() => sync.run(fillMissing, targets)}
              disabled={sync.busy || disabled}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-lagoon-dark/40 bg-paper px-5 py-2 text-xs font-bold uppercase tracking-[0.08em] text-lagoon-dark transition hover:bg-lagoon/10 disabled:opacity-60"
            >
              <FaMagic /> Completar lo que falta
            </button>
          )}
        </div>
      </div>

      {sync.busy && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-lagoon-dark">
          <FaSpinner className="animate-spin" /> Traduciendo {sync.progress}
        </p>
      )}
      {!sync.busy && sync.done && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-jungle-dark">
          <FaCheck /> {sync.done}
        </p>
      )}
      {sync.problem && <p className="mt-3 text-sm font-semibold text-hibiscus-dark">{sync.problem}</p>}
    </div>
  );
};

export default TranslateBar;
