import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaCheck, FaImage, FaMagic, FaPlus, FaSave, FaSearch, FaTrash } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { Lang, translateRecord } from '../../lib/autoTranslate';
import {
  AiGenerationError,
  GeneratedArticle,
  GeneratedPost,
  generateBlogPost,
  providerStatus,
} from '../../services/aiGeneratorService';
import { getAISettings } from '../../services/aiSettingsService';
import {
  BlogArticle,
  deleteBlogArticle,
  getBlogArticles,
  Locale,
  saveBlogArticle,
} from '../../services/blogService';
import { getAdminPassword } from '../../services/authStore';
import { BLOG_TEMPLATES } from '../../lib/blogTemplates';

const LANGUAGES: Locale[] = ['en', 'es', 'fr', 'de'];
const LANGUAGE_NAME: Record<Locale, string> = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch' };
const LANGUAGE_SHORT: Record<Locale, string> = { en: 'EN', es: 'ES', fr: 'FR', de: 'DE' };

type ArticleGroup = { id: string; variants: Partial<Record<Locale, BlogArticle>> };

const emptyArticle = (locale: Locale): BlogArticle => ({
  id: `blog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: '',
  tour: '',
  post: '',
  date: new Date().toISOString().slice(0, 10),
  slug: '',
  locale,
  tags: [],
  visible: true,
  caption: '',
  prelude: '',
  images: [],
  social: [],
});

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

const articleForLanguage = (article: GeneratedArticle, base: BlogArticle, locale: Locale): BlogArticle => ({
  ...base,
  title: article.title,
  caption: article.caption,
  prelude: article.prelude,
  post: article.body,
  tags: article.tags,
  slug: slugify(article.title) || base.slug,
  locale,
});

const BlogAdminPanel: React.FC = () => {
  const { brandSettings } = useBrand();
  const [groups, setGroups] = useState<ArticleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [editingLocale, setEditingLocale] = useState<Locale>('en');
  const [scope, setScope] = useState<Locale[]>(LANGUAGES);
  const [draft, setDraft] = useState<BlogArticle>(() => emptyArticle('en'));
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recreating, setRecreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [template, setTemplate] = useState('guide');
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');

  const refresh = useCallback(async (preferredId?: string) => {
    setLoading(true);
    try {
      const entries = await Promise.all(LANGUAGES.map((language) => getBlogArticles(language, true)));
      const byId = new Map<string, ArticleGroup>();
      entries.forEach((articles, index) => {
        const locale = LANGUAGES[index];
        articles.forEach((article) => {
          const group = byId.get(article.id) ?? { id: article.id, variants: {} };
          group.variants[locale] = article;
          byId.set(article.id, group);
        });
      });
      const next = [...byId.values()].sort((a, b) => {
        const aTitle = a.variants.en?.title || a.variants.es?.title || a.id;
        const bTitle = b.variants.en?.title || b.variants.es?.title || b.id;
        return aTitle.localeCompare(bTitle);
      });
      setGroups(next);
      if (preferredId && byId.has(preferredId)) setSelectedId(preferredId);
      else if (selectedIdRef.current && byId.has(selectedIdRef.current)) setSelectedId(selectedIdRef.current);
      else setSelectedId(next[0]?.id || '');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedGroup = groups.find((group) => group.id === selectedId);
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) =>
      Object.values(group.variants).some((article) =>
        `${article?.title} ${article?.tour} ${article?.tags.join(' ')}`.toLowerCase().includes(query)
      )
    );
  }, [groups, search]);

  const loadGroup = (group: ArticleGroup, locale?: Locale) => {
    const preferred = locale && group.variants[locale]
      ? locale
      : LANGUAGES.find((language) => group.variants[language]) || 'en';
    const article = group.variants[preferred];
    if (!article) return;
    setIsNew(false);
    setSelectedId(group.id);
    setEditingLocale(preferred);
    setDraft({ ...article, tags: [...article.tags], images: [...article.images] });
    setScope([...LANGUAGES]);
    setInstructions('');
    setProblem('');
    setNotice('');
  };

  useEffect(() => {
    if (selectedGroup && !isNew && !selectedGroup.variants[editingLocale]) {
      const preferred = LANGUAGES.find((language) => selectedGroup.variants[language]);
      if (preferred) {
        setEditingLocale(preferred);
        setDraft({ ...selectedGroup.variants[preferred]! });
      }
    }
  }, [selectedGroup, editingLocale, isNew]);

  const changeLanguage = (locale: Locale) => {
    setEditingLocale(locale);
    if (isNew) {
      setDraft((current) => ({ ...current, locale }));
      return;
    }
    const article = selectedGroup?.variants[locale];
    if (article) {
      setDraft({ ...article, tags: [...article.tags], images: [...article.images] });
    } else {
      setDraft((current) => ({ ...current, locale }));
    }
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.post.trim()) {
      setProblem('Añade al menos un título y el cuerpo del artículo.');
      return;
    }
    if (!scope.length) {
      setProblem('Selecciona al menos un idioma para guardar.');
      return;
    }
    setSaving(true);
    setProblem('');
    setNotice('');
    try {
      const source = {
        ...draft,
        title: draft.title.trim(),
        slug: draft.slug.trim() || slugify(draft.title),
        locale: editingLocale,
      };
      for (const locale of scope) {
        let translated = source;
        if (locale !== editingLocale) {
          const { value } = await translateRecord(
            { ...source, tags: [], images: [], social: [] },
            editingLocale as Lang,
            locale as Lang
          );
          translated = {
            ...value,
            tags: source.tags,
            images: source.images,
            social: source.social,
            locale,
            slug: slugify(value.title) || source.slug,
          };
        }
        if (!(await saveBlogArticle({ ...translated, locale }, locale))) {
          throw new Error(`No se pudo guardar la versión ${LANGUAGE_NAME[locale]}.`);
        }
      }
      setIsNew(false);
      setSelectedId(source.id);
      setNotice(`Artículo actualizado en ${scope.map((language) => LANGUAGE_NAME[language]).join(', ')}.`);
      await refresh(source.id);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!scope.length) {
      setProblem('Selecciona al menos un idioma para eliminar.');
      return;
    }
    const targets = scope.filter((locale) => selectedGroup?.variants[locale]);
    if (!targets.length) {
      setProblem('No hay versiones en los idiomas seleccionados.');
      return;
    }
    const label = targets.map((locale) => LANGUAGE_NAME[locale]).join(', ');
    if (!window.confirm(`Eliminar “${draft.title}” en ${label}? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    setProblem('');
    try {
      for (const locale of targets) {
        if (!(await deleteBlogArticle(draft.id, locale))) {
          throw new Error(`No se pudo eliminar la versión ${LANGUAGE_NAME[locale]}.`);
        }
      }
      setNotice(`Eliminado en ${label}.`);
      setIsNew(false);
      await refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
      await refresh(draft.id);
    } finally {
      setDeleting(false);
    }
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setProblem('');
    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', 'blog');
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'X-Admin-Password': getAdminPassword() ?? '' },
          body: form,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.secure_url) {
          throw new Error(data.error || `No se pudo subir ${file.name}.`);
        }
        setDraft((current) => ({ ...current, images: [...current.images, data.secure_url] }));
      } catch (error) {
        setProblem(error instanceof Error ? error.message : String(error));
      }
    }
  };

  const recreate = async () => {
    if (!draft.title.trim() || !draft.post.trim()) {
      setProblem('El artículo necesita un título y un cuerpo para poder recrearlo.');
      return;
    }
    if (!scope.length) {
      setProblem('Selecciona al menos un idioma para recrear.');
      return;
    }
    setRecreating(true);
    setProblem('');
    setNotice('');
    try {
      const settings = await getAISettings();
      const status = await providerStatus();
      if (!status?.providers.some((provider) => provider.usable)) {
        throw new Error('No hay un proveedor de IA listo. Configura uno en Integraciones de IA.');
      }
      let englishSource = draft;
      if (editingLocale !== 'en') {
        const { value } = await translateRecord(
          { ...draft, tags: [], images: [], social: [] },
          editingLocale as Lang,
          'en'
        );
        englishSource = {
          ...draft,
          title: value.title,
          caption: value.caption,
          prelude: value.prelude,
          post: value.post,
          locale: 'en',
        };
      }
      const sourceArticle: GeneratedArticle = {
        title: englishSource.title,
        caption: englishSource.caption,
        prelude: englishSource.prelude,
        body: englishSource.post,
        tags: draft.tags,
      };
      const languages = scope.filter((language) => language !== 'en') as Array<'es' | 'fr' | 'de'>;
      const recreated: GeneratedPost = await generateBlogPost(settings, {
        povOrigin: 'travellers planning a Punta Cana excursion',
        povAge: 'all ages',
        povGroup: 'any group',
        povGender: 'mixed',
        povExclusivity: 'standard',
        selectedTours: draft.tour ? draft.tour.split(',').map((tour) => tour.trim()).filter(Boolean) : [],
        topics: [],
        hashtags: draft.tags,
        voiceTranscript: draft.tour || 'Use the existing article as the factual source. Do not invent details.',
        images: draft.images,
        brandName: brandSettings.brandName,
        socialPlatforms: [],
        template,
        reviews: [],
        languages,
        sourceArticle,
        recreateInstruction: instructions,
      });
      const missingLanguage = scope.find(
        (locale) => locale !== 'en' && recreated.missing.includes(locale as 'es' | 'fr' | 'de')
      );
      if (missingLanguage) {
        throw new Error(
          `La IA no pudo recrear la versión ${LANGUAGE_NAME[missingLanguage]}. No se guardó una copia en otro idioma por error.`
        );
      }
      for (const locale of scope) {
        const result = locale === 'en'
          ? recreated.en
          : recreated[locale as 'es' | 'fr' | 'de'];
        const article = articleForLanguage(result, { ...draft, id: draft.id }, locale);
        if (!(await saveBlogArticle(article, locale))) {
          throw new Error(`El artículo se recreó, pero no se pudo guardar en ${LANGUAGE_NAME[locale]}.`);
        }
      }
      setNotice(`Artículo recreado en ${scope.map((language) => LANGUAGE_NAME[language]).join(', ')}.`);
      await refresh(draft.id);
    } catch (error) {
      const details = error instanceof AiGenerationError
        ? ` ${error.failures.map((failure) => failure.error).join(' · ')}`
        : '';
      setProblem(`${error instanceof Error ? error.message : String(error)}${details}`);
    } finally {
      setRecreating(false);
    }
  };

  const createNew = () => {
    const article = emptyArticle('en');
    setIsNew(true);
    setSelectedId(article.id);
    setEditingLocale('en');
    setDraft(article);
    setScope([...LANGUAGES]);
    setInstructions('');
    setProblem('');
    setNotice('');
  };

  const scopeToggle = (locale: Locale) => setScope((current) =>
    current.includes(locale) ? current.filter((value) => value !== locale) : [...current, locale]
  );

  const fieldClass = 'w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20';
  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

  if (loading && groups.length === 0) {
    return <div className="p-8 text-center text-ink-light">Cargando artículos en todos los idiomas…</div>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">Gestionar artículos</h2>
          <p className="mt-1 text-sm text-ink-light">
            Edita, traduce, recrea o elimina una publicación en un idioma o en todos.
          </p>
        </div>
        <button type="button" onClick={createNew} className={`${buttonClass} bg-lagoon-dark text-white`}>
          <FaPlus /> Nuevo artículo
        </button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.8fr)]">
        <aside className="space-y-3 rounded-2xl border border-ink/10 bg-white p-4">
          <label className="relative block">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar artículos…"
              className={`${fieldClass} pl-9`}
            />
          </label>
          <div className="max-h-[70vh] space-y-2 overflow-auto">
            {filteredGroups.map((group) => {
              const article = group.variants.en || group.variants.es || group.variants.fr || group.variants.de;
              return (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => loadGroup(group)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedId === group.id && !isNew ? 'border-lagoon-dark bg-lagoon/10' : 'border-ink/10 hover:border-lagoon'
                  }`}
                >
                  <span className="block line-clamp-2 text-sm font-bold text-ink">{article?.title || group.id}</span>
                  <span className="mt-1 block truncate text-xs text-ink-light">{article?.tour || 'Sin excursión asociada'}</span>
                  <span className="mt-2 flex gap-1">
                    {LANGUAGES.map((locale) => (
                      <span
                        key={locale}
                        className={`rounded px-1.5 py-0.5 text-[0.62rem] font-bold ${
                          group.variants[locale] ? 'bg-jungle/10 text-jungle-dark' : 'bg-paper-warm text-ink-light'
                        }`}
                      >
                        {LANGUAGE_SHORT[locale]}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
            {!filteredGroups.length && <p className="p-4 text-sm text-ink-light">No hay artículos que coincidan.</p>}
          </div>
        </aside>

        <section className="space-y-5 rounded-2xl border border-ink/10 bg-white p-4 sm:p-6">
          {(selectedGroup || isNew) ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-light">
                    {isNew ? 'Crear' : 'Editar'} · {LANGUAGE_NAME[editingLocale]}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-ink">{draft.title || 'Artículo sin título'}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void save()} disabled={saving || recreating} className={`${buttonClass} bg-jungle-dark text-white`}>
                    <FaSave /> {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                  {!isNew && (
                    <button type="button" onClick={() => void remove()} disabled={deleting || saving || recreating} className={`${buttonClass} bg-hibiscus text-white`}>
                      <FaTrash /> {deleting ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-light">Idioma que estás editando</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((locale) => (
                    <button
                      type="button"
                      key={locale}
                      onClick={() => changeLanguage(locale)}
                      disabled={!isNew && !selectedGroup?.variants[locale]}
                      title={!isNew && !selectedGroup?.variants[locale] ? 'Este idioma no existe todavía; selecciona el idioma en el que quieres trabajar y guárdalo también aquí.' : undefined}
                      className={`${buttonClass} ${
                        editingLocale === locale ? 'bg-ink text-white' : 'border border-ink/15 text-ink-soft'
                      }`}
                    >
                      {LANGUAGE_NAME[locale]}
                      {!isNew && selectedGroup?.variants[locale] && <FaCheck className="text-jungle" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-paper-warm p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-light">Aplicar acción a idiomas · todos por defecto</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((locale) => (
                    <label key={locale} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-ink-soft">
                      <input type="checkbox" checked={scope.includes(locale)} onChange={() => scopeToggle(locale)} className="accent-lagoon-dark" />
                      {LANGUAGE_NAME[locale]}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-light">
                  Guardar en otros idiomas traduce desde {LANGUAGE_NAME[editingLocale]}; eliminar solo afecta a los idiomas marcados.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-bold text-ink-soft">
                  Título
                  <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-ink-soft">
                  Excursión o tema
                  <input value={draft.tour} onChange={(event) => setDraft({ ...draft, tour: event.target.value })} className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-ink-soft sm:col-span-2">
                  Resumen
                  <textarea rows={2} value={draft.caption} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-ink-soft sm:col-span-2">
                  Apertura
                  <textarea rows={3} value={draft.prelude} onChange={(event) => setDraft({ ...draft, prelude: event.target.value })} className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-ink-soft sm:col-span-2">
                  Artículo (Markdown)
                  <textarea rows={14} value={draft.post} onChange={(event) => setDraft({ ...draft, post: event.target.value })} className={`${fieldClass} font-mono leading-relaxed`} />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-ink-soft">
                  Slug
                  <input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-ink-soft">
                  Fecha
                  <input type="date" value={draft.date || ''} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className={fieldClass} />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-ink-soft sm:col-span-2">
                  Hashtags · separados por comas
                  <input
                    value={draft.tags.join(', ')}
                    onChange={(event) => setDraft({ ...draft, tags: [...new Set(event.target.value.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean))] })}
                    className={fieldClass}
                    placeholder="PuntaCana, IslaSaona, ViajarEnFamilia"
                  />
                </label>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-light">Fotos · {draft.images.length}</p>
                  <label className={`${buttonClass} cursor-pointer border border-ink/15 text-ink-soft`}>
                    <FaImage /> Subir fotos
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void uploadImages(event.target.files); event.target.value = ''; }} />
                  </label>
                </div>
                <div className="space-y-2">
                  {draft.images.map((image, index) => (
                    <div className="flex gap-2" key={`${index}-${image}`}>
                      <img src={image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      <input value={image} onChange={(event) => setDraft((current) => ({ ...current, images: current.images.map((value, i) => i === index ? event.target.value : value) }))} className={`${fieldClass} min-w-0`} />
                      <button type="button" onClick={() => setDraft((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }))} className="rounded-full px-3 text-hibiscus" aria-label="Quitar foto"><FaTrash /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setDraft((current) => ({ ...current, images: [...current.images, ''] }))} className="text-xs font-semibold text-lagoon-dark hover:underline">+ Añadir URL de foto</button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <input type="checkbox" checked={draft.visible} onChange={(event) => setDraft({ ...draft, visible: event.target.checked })} className="accent-lagoon-dark" />
                Publicado y visible
              </label>

              <div className="space-y-3 rounded-2xl border border-lagoon/30 bg-lagoon/5 p-4">
                <div>
                  <p className="text-sm font-bold text-ink">Recrear con IA</p>
                  <p className="mt-1 text-xs text-ink-light">Conserva el artículo como base factual y puedes pedir cambios concretos. Se guarda solo en los idiomas marcados.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={template} onChange={(event) => setTemplate(event.target.value)} className={fieldClass}>
                    {BLOG_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.label[editingLocale as 'en' | 'es' | 'fr' | 'de']}</option>)}
                  </select>
                  <button type="button" onClick={() => void recreate()} disabled={recreating || saving || !scope.length} className={`${buttonClass} bg-lagoon-dark text-white`}>
                    <FaMagic /> {recreating ? 'Recreando…' : 'Recrear idiomas seleccionados'}
                  </button>
                </div>
                <textarea rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} className={fieldClass} placeholder="Ej.: conserva los datos, hazlo más cálido, añade consejos prácticos para familias y cambia el enfoque al tour de Saona." />
              </div>
            </>
          ) : (
            <div className="grid min-h-72 place-items-center text-center text-sm text-ink-light">
              <p>Selecciona un artículo o crea uno nuevo.</p>
            </div>
          )}
          {notice && <p className="rounded-xl bg-jungle/10 p-3 text-sm font-semibold text-jungle-dark">{notice}</p>}
          {problem && <p className="whitespace-pre-wrap rounded-xl bg-hibiscus/10 p-3 text-sm font-semibold text-hibiscus-dark">{problem}</p>}
        </section>
      </div>
    </div>
  );
};

export default BlogAdminPanel;
