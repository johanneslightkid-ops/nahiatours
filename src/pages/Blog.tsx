import React, { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { localeText } from '../lib/localeText';
import { FormattedMessage } from 'react-intl';
import { MdTour, MdEvent, MdExpandMore, MdSearch, MdClose, MdTag, MdUnfoldMore, MdUnfoldLess } from 'react-icons/md';
import { useBrand } from '../contexts/BrandContext';
import PageHeader from '../components/layout/PageHeader';
import { Toucan, PalmFrond } from '../components/ui/Illustrations';
import { getContentLocale, useI18n } from '../contexts/I18nContext';
import { useBlog } from '../contexts/BlogContext';
import { generateBlogPageMeta, generateBlogListStructuredData } from '../utils/seoHelpers';
import ArticleBody from '../components/ui/ArticleBody';
import type { BlogArticle } from '../services/blogService';
import {
  buildSearchIndex,
  completeWord,
  highlightParts,
  normalizeText,
  plainText,
  searchArticles,
  snippetFor,
} from '../lib/blogSearch';

type Sort = 'newest' | 'oldest' | 'az' | 'relevance';

/** "Saona Island: Paradise Found" → "Saona Island", for compact labels. */
const shortTour = (title: string) => title.split(/\s+[:–—]\s+|\s*:\s+/)[0] || title;

const byDate = (articles: BlogArticle[], direction: 1 | -1) =>
  articles
    .map((article, index) => ({ article, index }))
    .sort((a, b) => {
      const da = a.article.date ?? '';
      const db = b.article.date ?? '';
      if (da && db && da !== db) return direction * da.localeCompare(db);
      if (da && !db) return -1;
      if (!da && db) return 1;
      return a.index - b.index;
    })
    .map(({ article }) => article);

const formatDate = (date: string, locale: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed);
  } catch {
    return date;
  }
};

const Highlighted: React.FC<{ text: string; matched: string[] }> = ({ text, matched }) => (
  <>
    {highlightParts(text, matched).map((part, i) =>
      part.hit ? (
        <mark key={i} className="rounded bg-mango-light px-0.5 text-ink">
          {part.text}
        </mark>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      )
    )}
  </>
);

type Suggestion =
  | { kind: 'tag'; value: string; count: number }
  | { kind: 'tour'; value: string; count: number }
  | { kind: 'word'; value: string }
  | { kind: 'article'; value: string; slug: string };

const Blog = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const { blogArticles, loading, error } = useBlog();
  const [searchParams, setSearchParams] = useSearchParams();

  const all = useMemo(
    () => (blogArticles[getContentLocale(locale)] ?? []).filter((a) => a.visible !== false),
    [blogArticles, locale]
  );
  // ── State, mirrored in the URL so a filtered view can be shared ──────────
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');

  // The index costs a few hundred milliseconds on a slow phone, so it is built
  // when someone reaches for the search box, not while the page is loading.
  const [wantIndex, setWantIndex] = useState(() => Boolean(searchParams.get('q')));
  const index = useMemo(
    () => buildSearchIndex(wantIndex ? all : []),
    [all, wantIndex]
  );
  // …or once the page has settled and the phone is idle, whichever is first.
  useEffect(() => {
    if (wantIndex || all.length === 0) return undefined;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setWantIndex(true), { timeout: 5000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => setWantIndex(true), 2500);
    return () => window.clearTimeout(timer);
  }, [all.length, wantIndex]);
  const deferredQuery = useDeferredValue(query);
  const tags = useMemo(
    () => (searchParams.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    [searchParams]
  );
  const tourFilter = searchParams.get('tour') ?? '';
  const sortParam = (searchParams.get('sort') as Sort | null) ?? null;

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // The query reaches the URL a moment after typing stops.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((searchParams.get('q') ?? '') !== query.trim()) updateParams({ q: query.trim() || null });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [query, searchParams, updateParams]);

  const addTag = (tag: string) => {
    if (!tags.some((t) => normalizeText(t) === normalizeText(tag))) updateParams({ tags: [...tags, tag].join(',') });
  };
  const removeTag = (tag: string) => updateParams({ tags: tags.filter((t) => t !== tag).join(',') || null });
  const setTour = (tour: string) => updateParams({ tour: tour || null });

  // ── Facets ───────────────────────────────────────────────────────────────
  const tagCounts = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    all.forEach((article) =>
      (article.tags ?? []).forEach((tag) => {
        const key = normalizeText(tag);
        const entry = counts.get(key) ?? { label: tag, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      })
    );
    return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [all]);

  const tours = useMemo(() => {
    const counts = new Map<string, number>();
    all.forEach((a) => a.tour && counts.set(a.tour, (counts.get(a.tour) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [all]);

  // ── Results ──────────────────────────────────────────────────────────────
  const searching = deferredQuery.trim().length > 0;
  const hits = useMemo(() => (searching ? searchArticles(index, deferredQuery) : []), [index, deferredQuery, searching]);
  const hitBySlug = useMemo(() => new Map(hits.map((hit) => [hit.slug, hit])), [hits]);
  const sort: Sort = sortParam ?? (searching ? 'relevance' : 'newest');

  const results = useMemo(() => {
    const wanted = tags.map(normalizeText);
    let list = all.filter(
      (a) =>
        (!tourFilter || a.tour === tourFilter) &&
        wanted.every((tag) => (a.tags ?? []).some((t) => normalizeText(t) === tag)) &&
        (!searching || hitBySlug.has(a.slug))
    );
    if (sort === 'relevance' && searching) {
      list = [...list].sort((a, b) => (hitBySlug.get(b.slug)?.score ?? 0) - (hitBySlug.get(a.slug)?.score ?? 0));
    } else if (sort === 'az') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, locale));
    } else {
      list = byDate(list, sort === 'oldest' ? 1 : -1);
    }
    return list;
  }, [all, tags, tourFilter, searching, hitBySlug, sort, locale]);

  // ── Accordion: the first story is open, the rest show their titles ───────
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const [closedFirst, setClosedFirst] = useState<Set<string>>(() => new Set());
  const isOpen = (slug: string, position: number) =>
    position === 0 ? !closedFirst.has(slug) : opened.has(slug);
  const toggle = (slug: string, position: number) => {
    const open = isOpen(slug, position);
    if (position === 0) {
      setClosedFirst((prev) => {
        const next = new Set(prev);
        if (open) next.add(slug);
        else next.delete(slug);
        return next;
      });
    } else {
      setOpened((prev) => {
        const next = new Set(prev);
        if (open) next.delete(slug);
        else next.add(slug);
        return next;
      });
    }
  };
  const allOpen = results.length > 0 && results.every((a, i) => isOpen(a.slug, i));
  const setAll = (open: boolean) => {
    if (open) {
      setOpened(new Set(results.map((a) => a.slug)));
      setClosedFirst(new Set());
    } else {
      setOpened(new Set());
      setClosedFirst(new Set(results.slice(0, 1).map((a) => a.slug)));
    }
  };

  const openAndScroll = (slug: string) => {
    setOpened((prev) => new Set(prev).add(slug));
    setClosedFirst((prev) => {
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
    window.setTimeout(() => document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  // A link to /blog#slug opens that story and brings it into view.
  useEffect(() => {
    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (slug && all.some((a) => a.slug === slug)) openAndScroll(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  // ── Autocomplete ─────────────────────────────────────────────────────────
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Built from the deferred query, so typing never waits for suggestions.
  const suggestions = useMemo((): Suggestion[] => {
    const raw = deferredQuery.trim();
    if (!raw) return [];
    const tagMode = raw.startsWith('#');
    const needle = normalizeText(raw.replace(/^#/, ''));
    if (!needle) return tagCounts.slice(0, 8).map((t) => ({ kind: 'tag', value: t.label, count: t.count }));

    const fits = (label: string) => {
      const n = normalizeText(label);
      return n.includes(needle) || n.split(' ').some((w) => w.startsWith(needle.split(' ').pop() ?? ''));
    };
    const out: Suggestion[] = [];
    tagCounts
      .filter((t) => fits(t.label) && !tags.includes(t.label))
      .slice(0, tagMode ? 8 : 3)
      .forEach((t) => out.push({ kind: 'tag', value: t.label, count: t.count }));
    if (tagMode) return out;

    tours
      .filter(([tour]) => fits(tour) && tour !== tourFilter)
      .slice(0, 2)
      .forEach(([tour, count]) => out.push({ kind: 'tour', value: tour, count }));
    completeWord(index, raw, 3).forEach((word) => {
      const head = raw.replace(/\S+$/, '');
      out.push({ kind: 'word', value: `${head}${word}` });
    });
    // The full search for the story list already ran for this query; reuse it.
    (raw === deferredQuery.trim() ? hits : searchArticles(index, raw))
      .slice(0, 5)
      .forEach((hit) => {
        const article = all.find((a) => a.slug === hit.slug);
        if (article) out.push({ kind: 'article', value: article.title, slug: article.slug });
      });
    return out.slice(0, 10);
  }, [deferredQuery, tagCounts, tags, tours, tourFilter, index, all, hits]);

  const showSuggestions = focused && suggestions.length > 0;

  const choose = (suggestion: Suggestion) => {
    switch (suggestion.kind) {
      case 'tag':
        addTag(suggestion.value);
        setQuery('');
        break;
      case 'tour':
        setTour(suggestion.value);
        setQuery('');
        break;
      case 'word':
        setQuery(`${suggestion.value} `);
        break;
      case 'article':
        setFocused(false);
        openAndScroll(suggestion.slug);
        break;
    }
    setActive(-1);
    if (suggestion.kind !== 'article') inputRef.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      if (showSuggestions && active >= 0) {
        event.preventDefault();
        choose(suggestions[active]);
      } else if (query.trim().startsWith('#') && query.trim().length > 1) {
        event.preventDefault();
        const wanted = normalizeText(query.trim().slice(1));
        const match = tagCounts.find((t) => normalizeText(t.label) === wanted) ?? tagCounts.find((t) => normalizeText(t.label).startsWith(wanted));
        if (match) {
          addTag(match.label);
          setQuery('');
        }
      } else {
        setFocused(false);
      }
    } else if (event.key === 'Escape') {
      setFocused(false);
      setActive(-1);
    } else if (event.key === 'Backspace' && !query) {
      if (tags.length) removeTag(tags[tags.length - 1]);
      else if (tourFilter) setTour('');
    }
  };

  // ── SEO ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const pageTitle = `Blog | ${brandSettings.brandName}`;
    const pageDescription = localeText(locale, {
      en: 'Travel and tour blog in Punta Cana. Discover travel stories, tips, and guides about excursions in the Dominican Republic.',
      es: 'Blog de viajes y tours en Punta Cana. Descubre historias, tips de viaje y guías sobre excursiones en República Dominicana.',
      de: 'Reise- und Ausflugsblog aus Punta Cana: Geschichten, Reisetipps und Ratgeber zu Ausflügen in der Dominikanischen Republik.',
      fr: 'Blog voyage et excursions à Punta Cana : récits, conseils et guides pour vos excursions en République dominicaine.',
    });

    generateBlogPageMeta(pageTitle, pageDescription, window.location.href);

    if (all.length > 0) {
      generateBlogListStructuredData(
        localeText(locale, { en: 'Blog', es: 'Blog de Tours', de: 'Reiseblog', fr: 'Blog voyage' }),
        pageDescription,
        all
      );
    }

    return () => {
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        if (script.textContent?.includes('Blog')) {
          script.remove();
        }
      });
    };
  }, [locale, brandSettings.brandName, all]);

  const t = {
    search: localeText(locale, { en: 'Search stories, places, #tags…', es: 'Buscar historias, lugares, #etiquetas…', de: 'Geschichten, Orte, #Tags suchen…', fr: 'Chercher récits, lieux, #tags…' }),
    searchLabel: localeText(locale, { en: 'Search the blog', es: 'Buscar en el blog', de: 'Blog durchsuchen', fr: 'Rechercher dans le blog' }),
    allTours: localeText(locale, { en: 'All excursions', es: 'Todas las excursiones', de: 'Alle Ausflüge', fr: 'Toutes les excursions' }),
    excursion: localeText(locale, { en: 'Excursion', es: 'Excursión', de: 'Ausflug', fr: 'Excursion' }),
    sortLabel: localeText(locale, { en: 'Sort', es: 'Orden', de: 'Sortierung', fr: 'Tri' }),
    newest: localeText(locale, { en: 'Newest first', es: 'Más recientes', de: 'Neueste zuerst', fr: 'Plus récents' }),
    oldest: localeText(locale, { en: 'Oldest first', es: 'Más antiguas', de: 'Älteste zuerst', fr: 'Plus anciens' }),
    az: localeText(locale, { en: 'Title A–Z', es: 'Título A–Z', de: 'Titel A–Z', fr: 'Titre A–Z' }),
    relevance: localeText(locale, { en: 'Best match', es: 'Más relevantes', de: 'Beste Treffer', fr: 'Plus pertinents' }),
    popular: localeText(locale, { en: 'Popular tags', es: 'Etiquetas populares', de: 'Beliebte Tags', fr: 'Tags populaires' }),
    count: (n: number) => localeText(locale, { en: `${n} ${n === 1 ? 'story' : 'stories'}`, es: `${n} ${n === 1 ? 'historia' : 'historias'}`, de: `${n} ${n === 1 ? 'Geschichte' : 'Geschichten'}`, fr: `${n} ${n === 1 ? 'récit' : 'récits'}` }),
    expandAll: localeText(locale, { en: 'Open all', es: 'Abrir todas', de: 'Alle öffnen', fr: 'Tout ouvrir' }),
    collapseAll: localeText(locale, { en: 'Close all', es: 'Cerrar todas', de: 'Alle schließen', fr: 'Tout fermer' }),
    clear: localeText(locale, { en: 'Clear all filters', es: 'Quitar filtros', de: 'Filter zurücksetzen', fr: 'Effacer les filtres' }),
    none: localeText(locale, { en: 'No story matches that yet. Try fewer words or another tag.', es: 'Ninguna historia coincide todavía. Prueba con menos palabras u otra etiqueta.', de: 'Noch keine passende Geschichte. Versuch es mit weniger Wörtern oder einem anderen Tag.', fr: 'Aucun récit ne correspond pour l’instant. Essayez avec moins de mots ou un autre tag.' }),
    read: localeText(locale, { en: 'Read', es: 'Leer', de: 'Lesen', fr: 'Lire' }),
    close: localeText(locale, { en: 'Close', es: 'Cerrar', de: 'Schließen', fr: 'Fermer' }),
    remove: localeText(locale, { en: 'Remove', es: 'Quitar', de: 'Entfernen', fr: 'Retirer' }),
    tagHint: localeText(locale, { en: 'tag', es: 'etiqueta', de: 'Tag', fr: 'tag' }),
    tourHint: localeText(locale, { en: 'excursion', es: 'excursión', de: 'Ausflug', fr: 'excursion' }),
    wordHint: localeText(locale, { en: 'search', es: 'buscar', de: 'suchen', fr: 'chercher' }),
    storyHint: localeText(locale, { en: 'story', es: 'historia', de: 'Geschichte', fr: 'récit' }),
    loading: localeText(locale, { en: 'Loading stories…', es: 'Cargando historias…', de: 'Geschichten werden geladen…', fr: 'Chargement des récits…' }),
  };

  const filtersActive = Boolean(query.trim() || tags.length || tourFilter);

  return (
    <div className="bg-paper pb-16 md:pb-24">
      <PageHeader
        kicker={localeText(locale, { en: 'Stories from the coast', es: 'Historias de la costa', de: 'Geschichten von der Küste', fr: 'Récits de la côte' })}
        title={<FormattedMessage id="blog.title" defaultMessage="Blog" />}
        subtitle={<FormattedMessage id="blog.description" values={{ brand: brandSettings.brandName }} />}
        artLeft={<Toucan className="h-28 w-32 animate-bob" />}
        artRight={<PalmFrond className="h-32 w-32 animate-frond" />}
      />

      <div className="section-shell -mt-4">

        {loading ? (
          <div className="grid min-h-[40vh] place-items-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-lagoon border-t-transparent"></div>
              <div className="text-ink-soft font-medium font-body">{t.loading}</div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-hibiscus-light bg-hibiscus-light/30 p-8 md:p-12 shadow-sm max-w-2xl mx-auto">
            <h3 className="mb-4 text-xl font-bold text-hibiscus-dark">Unable to load blog content</h3>
            <p className="text-sm text-ink-soft font-body leading-relaxed">
              Blog articles failed to load. Check the browser console (F12) for logs starting with [Blog].
            </p>
          </div>
        ) : all.length === 0 ? (
          <div className="rounded-3xl border border-ink/20 bg-paper p-12 text-center text-ink-soft shadow-sm max-w-xl mx-auto">
            <p className="text-lg font-medium">
              <FormattedMessage id="blog.noArticles" defaultMessage="No articles available yet. Please check back soon." />
            </p>
          </div>
        ) : (
          <div className="relative z-10 mx-auto mt-10 max-w-4xl">
            {/* ── Search with tag badges and autocomplete ──────────────── */}
            <div className="relative">
              <div
                className={`flex flex-wrap items-center gap-1.5 rounded-2xl border-2 bg-paper px-3 py-2 shadow-ink-sm transition-colors ${
                  focused ? 'border-lagoon' : 'border-ink/20'
                }`}
                onClick={() => inputRef.current?.focus()}
              >
                <MdSearch className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
                {tourFilter && (
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-lagoon-light px-2.5 py-1 text-xs font-bold text-ink">
                    <MdTour className="h-3.5 w-3.5 shrink-0 text-lagoon-dark" />
                    <span className="truncate">{shortTour(tourFilter)}</span>
                    <button type="button" onClick={() => setTour('')} aria-label={`${t.remove} ${tourFilter}`} className="ml-0.5 rounded-full p-0.5 hover:bg-paper">
                      <MdClose className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-mango-light px-2.5 py-1 text-xs font-bold text-ink">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} aria-label={`${t.remove} #${tag}`} className="ml-0.5 rounded-full p-0.5 hover:bg-paper">
                      <MdClose className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  placeholder={tags.length || tourFilter ? '' : t.search}
                  aria-label={t.searchLabel}
                  role="combobox"
                  aria-expanded={showSuggestions}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(-1);
                    setFocused(true);
                  }}
                  onFocus={() => {
                    setFocused(true);
                    setWantIndex(true);
                  }}
                  onPointerDown={() => setWantIndex(true)}
                  onBlur={() => window.setTimeout(() => setFocused(false), 150)}
                  onKeyDown={onKeyDown}
                  className="min-w-[8rem] flex-1 bg-transparent py-1.5 font-body text-base text-ink outline-none placeholder:text-ink-light"
                  // The box around it is the field; site-wide input styles must not draw a second one.
                  style={{ border: 0, background: 'transparent', boxShadow: 'none', padding: '0.375rem 0', borderRadius: 0 }}
                />
                {filtersActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      updateParams({ q: null, tags: null, tour: null });
                    }}
                    aria-label={t.clear}
                    title={t.clear}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-ink/10"
                  >
                    <MdClose className="h-5 w-5" />
                  </button>
                )}
              </div>

              {showSuggestions && (
                <ul
                  id={listId}
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[22rem] overflow-y-auto rounded-2xl border border-ink/15 bg-paper p-1.5 shadow-ink-sm"
                >
                  {suggestions.map((suggestion, i) => (
                    <li
                      key={`${suggestion.kind}-${suggestion.value}`}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        choose(suggestion);
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${
                        i === active ? 'bg-lagoon-light text-ink' : 'text-ink'
                      }`}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/5 text-ink-soft">
                        {suggestion.kind === 'tag' ? <MdTag className="h-4 w-4" /> : suggestion.kind === 'tour' ? <MdTour className="h-4 w-4" /> : suggestion.kind === 'word' ? <MdSearch className="h-4 w-4" /> : <MdEvent className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {suggestion.kind === 'tag' ? `#${suggestion.value}` : suggestion.value}
                      </span>
                      <span className="shrink-0 text-[0.68rem] font-bold uppercase tracking-wider text-ink-light">
                        {suggestion.kind === 'tag'
                          ? `${t.tagHint} · ${suggestion.count}`
                          : suggestion.kind === 'tour'
                          ? `${t.tourHint} · ${suggestion.count}`
                          : suggestion.kind === 'word'
                          ? t.wordHint
                          : t.storyHint}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Popular tags ─────────────────────────────────────────── */}
            {tagCounts.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-ink-soft">{t.popular}</p>
                <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                  {tagCounts.slice(0, 18).map(({ label, count }) => {
                    const on = tags.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => (on ? removeTag(label) : addTag(label))}
                        aria-pressed={on}
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                          on ? 'border-mango-dark bg-mango text-ink' : 'border-ink/15 bg-paper text-ink-soft hover:border-ink/40 hover:text-ink'
                        }`}
                      >
                        #{label} <span className="font-medium opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Filters ──────────────────────────────────────────────── */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-b border-ink/10 pb-4">
              <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
                <span className="sr-only">{t.excursion}</span>
                <select
                  value={tourFilter}
                  onChange={(event) => setTour(event.target.value)}
                  className="w-full min-w-0 rounded-xl border border-ink/20 bg-paper px-3 py-2 text-sm font-semibold text-ink sm:w-64"
                >
                  <option value="">{t.allTours}</option>
                  {tours.map(([tour, count]) => (
                    <option key={tour} value={tour}>
                      {tour} ({count})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="sr-only">{t.sortLabel}</span>
                <select
                  value={sort}
                  onChange={(event) => updateParams({ sort: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-paper px-3 py-2 text-sm font-semibold text-ink"
                >
                  {searching && <option value="relevance">{t.relevance}</option>}
                  <option value="newest">{t.newest}</option>
                  <option value="oldest">{t.oldest}</option>
                  <option value="az">{t.az}</option>
                </select>
              </label>
              <span className="ml-auto text-sm font-bold text-ink-soft" aria-live="polite">
                {t.count(results.length)}
              </span>
              {results.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAll(!allOpen)}
                  className="inline-flex items-center gap-1 rounded-full border border-ink/20 px-3 py-1.5 text-xs font-bold text-ink hover:border-ink/50"
                >
                  {allOpen ? <MdUnfoldLess className="h-4 w-4" /> : <MdUnfoldMore className="h-4 w-4" />}
                  {allOpen ? t.collapseAll : t.expandAll}
                </button>
              )}
            </div>

            {/* ── Stories ──────────────────────────────────────────────── */}
            {results.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-base font-medium text-ink-soft">{t.none}</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    updateParams({ q: null, tags: null, tour: null });
                  }}
                  className="mt-4 rounded-full border-2 border-ink px-5 py-2 text-sm font-extrabold text-ink"
                >
                  {t.clear}
                </button>
              </div>
            ) : (
              <ol className="mt-4 space-y-3">
                {results.map((article, position) => {
                  const open = isOpen(article.slug, position);
                  const hit = hitBySlug.get(article.slug);
                  const matched = hit?.matched ?? [];
                  const panelId = `story-${article.slug}`;
                  return (
                    <li
                      key={article.id}
                      id={article.slug}
                      className={`scroll-mt-28 overflow-hidden rounded-[22px_12px_22px_12px] border bg-paper transition-colors ${
                        open ? 'border-ink/25 shadow-ink-sm' : 'border-ink/10 hover:border-ink/35'
                      }`}
                    >
                      <h2 className="m-0">
                        <button
                          type="button"
                          onClick={() => toggle(article.slug, position)}
                          aria-expanded={open}
                          aria-controls={panelId}
                          className="group flex w-full items-start gap-3 px-4 py-4 text-left sm:gap-4 sm:px-6 sm:py-5"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-soft">
                              {article.tour && (
                                <span className="inline-flex items-center gap-1">
                                  <MdTour className="h-3.5 w-3.5 text-lagoon-dark" />
                                  {shortTour(article.tour)}
                                </span>
                              )}
                              {article.date && (
                                <span className="inline-flex items-center gap-1">
                                  <MdEvent className="h-3.5 w-3.5 text-lagoon-dark" />
                                  <time dateTime={article.date}>{formatDate(article.date, locale)}</time>
                                </span>
                              )}
                            </span>
                            <span
                              className={`block font-display font-bold leading-snug tracking-tight text-ink ${
                                open ? 'text-2xl sm:text-4xl' : 'text-lg sm:text-xl'
                              }`}
                            >
                              <Highlighted text={article.title} matched={matched} />
                            </span>
                            {!open && searching && hit && (
                              <span className="mt-1.5 block text-sm leading-relaxed text-ink-soft">
                                <Highlighted
                                  text={snippetFor(plainText([article.caption, article.prelude, article.post].filter(Boolean).join(' ')), matched)}
                                  matched={matched}
                                />
                              </span>
                            )}
                          </span>
                          <span
                            className={`mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-extrabold transition-colors ${
                              open ? 'border-ink bg-ink text-paper' : 'border-ink/30 text-ink group-hover:border-ink'
                            }`}
                          >
                            <span className="hidden sm:inline">{open ? t.close : t.read}</span>
                            <MdExpandMore
                              className="h-5 w-5 transition-transform duration-300"
                              style={{ transform: open ? 'rotate(180deg)' : 'none' }}
                            />
                          </span>
                        </button>
                      </h2>

                      {open && (
                        <motion.div
                          id={panelId}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="border-t border-ink/10 px-4 pb-6 pt-4 sm:px-8 sm:pb-10"
                        >
                          <ArticleBody
                            caption={article.caption}
                            prelude={article.prelude}
                            body={article.post}
                            images={article.images}
                            title={article.title}
                            className="font-body"
                          />

                          {(article.tags ?? []).length > 0 && (
                            <ul className="mt-8 flex flex-wrap gap-2 border-t border-ink/15 pt-6">
                              {(article.tags ?? []).map((tag) => (
                                <li key={tag}>
                                  <button
                                    type="button"
                                    onClick={() => addTag(tag)}
                                    className="rounded-full border border-ink/15 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-soft hover:border-ink/40 hover:text-ink"
                                  >
                                    #{tag}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-6 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                toggle(article.slug, position);
                                window.setTimeout(() => document.getElementById(article.slug)?.scrollIntoView({ block: 'nearest' }), 30);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border-2 border-ink/30 px-3 py-1.5 text-xs font-extrabold text-ink hover:border-ink"
                            >
                              {t.close}
                              <MdExpandMore className="h-4 w-4" style={{ transform: 'rotate(180deg)' }} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
