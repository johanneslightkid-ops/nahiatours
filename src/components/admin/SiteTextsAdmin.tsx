import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaLanguage, FaSearch, FaUndo } from 'react-icons/fa';
import { apiGet, apiPut } from '../../services/apiClient';
import {
  useI18n,
  SUPPORTED_LOCALES,
  getBundledMessages,
  flattenMessages,
} from '../../contexts/I18nContext';
import TranslateBar from './TranslateBar';
import { Lang, LANG_NAME } from '../../lib/autoTranslate';

/**
 * Site texts: the menu, buttons, headings and labels — everything the visitor
 * reads that is not a tour, a story or a blog post.
 *
 * They ship with the build (src/locales/*.json) and can be overridden per
 * language in the `translations` resource, which the site layers on top at
 * runtime. This panel edits that layer, and saves ONLY what differs from the
 * shipped text: a text nobody touched keeps following the build, so a wording
 * fixed in the code is not frozen by an old save.
 *
 * The translate strip translates the language on screen into the others, but
 * only FILLS what is missing there — a text still in English, or empty. A
 * translation somebody already wrote by hand is never overwritten.
 */

type Texts = Record<string, string>;

const loadOverrides = async (locale: string): Promise<Texts> => {
  try {
    const data = await apiGet<unknown>('translations', { locale });
    const record = (data as Record<string, unknown>)?.record ?? data;
    return flattenMessages(record as Record<string, unknown>);
  } catch {
    return {};
  }
};

/** What a language actually shows: the operator's text over the shipped one. */
const effective = (locale: string, overrides: Texts): Texts => ({ ...getBundledMessages(locale), ...overrides });

/** Only the texts that differ from the build, so untouched ones keep following it. */
const diffFromBundled = (locale: string, values: Texts): Texts => {
  const bundled = getBundledMessages(locale);
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== bundled[key]));
};

const SiteTextsAdmin: React.FC = () => {
  const { locale: adminLocale } = useI18n();
  const [lang, setLang] = useState<string>(
    (SUPPORTED_LOCALES as readonly string[]).includes(adminLocale) ? adminLocale : 'es'
  );
  const [values, setValues] = useState<Texts | null>(null);
  const [query, setQuery] = useState('');
  const [onlyUntranslated, setOnlyUntranslated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const english = useMemo(() => getBundledMessages('en'), []);
  const keys = useMemo(() => Object.keys(english).sort(), [english]);

  const load = useCallback(async (target: string) => {
    setValues(null);
    setMessage(null);
    setValues(effective(target, await loadOverrides(target)));
  }, []);

  useEffect(() => {
    load(lang);
  }, [lang, load]);

  const save = async (target: string, next: Texts) => {
    await apiPut('translations', diffFromBundled(target, next), { locale: target });
  };

  const handleSave = async () => {
    if (!values) return;
    setSaving(true);
    setMessage(null);
    try {
      await save(lang, values);
      setMessage({ kind: 'ok', text: `Textos en ${LANG_NAME[lang as Lang]} guardados.` });
    } catch (error) {
      setMessage({ kind: 'error', text: `No se pudo guardar: ${(error as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  /** Fill only what the other language is missing; keep what someone wrote there. */
  const handleTranslated = async (translated: Texts, to: Lang) => {
    const current = effective(to, await loadOverrides(to));
    let filled = 0;
    const next: Texts = { ...current };
    for (const key of keys) {
      const value = current[key];
      const untranslated = !value?.trim() || (to !== 'en' && value === english[key]);
      if (untranslated && translated[key]?.trim()) {
        next[key] = translated[key];
        filled += 1;
      }
    }
    if (filled > 0) await save(to, next);
    return filled > 0 ? `${LANG_NAME[to]}: ${filled} texto(s) completados` : `${LANG_NAME[to]}: ya estaba completo`;
  };

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = keys.filter((key) => {
      if (!values) return false;
      if (onlyUntranslated && lang !== 'en' && values[key] !== english[key] && values[key]?.trim()) return false;
      if (!needle) return true;
      return (
        key.toLowerCase().includes(needle) ||
        (values[key] ?? '').toLowerCase().includes(needle) ||
        (english[key] ?? '').toLowerCase().includes(needle)
      );
    });
    const byGroup = new Map<string, string[]>();
    for (const key of visible) {
      const group = key.split('.')[0];
      byGroup.set(group, [...(byGroup.get(group) ?? []), key]);
    }
    return [...byGroup.entries()];
  }, [keys, values, query, onlyUntranslated, lang, english]);

  const field =
    'w-full rounded-2xl border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none transition focus:border-lagoon-dark';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FaLanguage className="text-2xl text-lagoon-dark" />
            <h2 className="text-2xl font-bold text-ink">Textos del sitio</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Menús, botones, títulos y etiquetas en cada idioma. Lo que no cambies sigue el texto
            original del sitio.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-ink/15 bg-paper p-1 text-sm font-semibold">
          {SUPPORTED_LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`rounded-full px-4 py-1.5 transition ${lang === code ? 'bg-lagoon-dark text-white' : 'text-ink-soft'}`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {values && (
        <TranslateBar<Texts>
          value={values}
          from={lang as Lang}
          what="los textos del sitio"
          note={`Traduce los textos en ${LANG_NAME[lang as Lang]} a los demás idiomas, pero solo rellena los que allí faltan o siguen en inglés. Lo ya traducido a mano no se toca.`}
          onTranslated={handleTranslated}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[14rem]">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-light" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar un texto…"
            className={`${field} pl-9`}
          />
        </label>
        {lang !== 'en' && (
          <label className="inline-flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              className="h-4 w-4 accent-lagoon-dark"
              checked={onlyUntranslated}
              onChange={(event) => setOnlyUntranslated(event.target.checked)}
            />
            Solo los que faltan por traducir
          </label>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !values}
          className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Guardando…' : `Guardar ${lang.toUpperCase()}`}
        </button>
        {message && (
          <span className={`text-sm ${message.kind === 'ok' ? 'text-lagoon-dark' : 'text-sunset-dark'}`}>
            {message.text}
          </span>
        )}
      </div>

      {!values ? (
        <p className="text-sm text-ink-light">Cargando…</p>
      ) : (
        <div className="space-y-5">
          {groups.map(([group, groupKeys]) => (
            <section key={group} className="rounded-3xl border border-ink/10 p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-ink-light">{group}</h3>
              <div className="space-y-3">
                {groupKeys.map((key) => {
                  const bundled = getBundledMessages(lang)[key] ?? '';
                  const changed = values[key] !== bundled;
                  const long = (english[key] ?? '').length > 70;
                  return (
                    <div key={key} className="grid gap-2 md:grid-cols-[14rem,1fr] md:items-start">
                      <div className="text-xs">
                        <div className="font-mono text-ink-soft">{key.slice(group.length + 1) || key}</div>
                        {lang !== 'en' && <div className="mt-0.5 text-ink-light">{english[key]}</div>}
                      </div>
                      <div className="flex items-start gap-2">
                        {long ? (
                          <textarea
                            rows={2}
                            value={values[key] ?? ''}
                            onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                            className={field}
                          />
                        ) : (
                          <input
                            type="text"
                            value={values[key] ?? ''}
                            onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                            className={field}
                          />
                        )}
                        {changed && (
                          <button
                            type="button"
                            title="Volver al texto original"
                            aria-label="Volver al texto original"
                            onClick={() => setValues({ ...values, [key]: bundled })}
                            className="mt-2 text-ink-light transition hover:text-ink"
                          >
                            <FaUndo />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {groups.length === 0 && <p className="text-sm text-ink-light">Nada coincide con la búsqueda.</p>}
        </div>
      )}
    </div>
  );
};

export default SiteTextsAdmin;
