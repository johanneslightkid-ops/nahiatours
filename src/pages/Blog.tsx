import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { localeText } from '../lib/localeText';
import { FormattedMessage } from 'react-intl';
import { MdTour, MdEvent, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { useBrand } from '../contexts/BrandContext';
import PageHeader from '../components/layout/PageHeader';
import { Toucan, PalmFrond } from '../components/ui/Illustrations';
import { getContentLocale, useI18n } from '../contexts/I18nContext';
import { useBlog } from '../contexts/BlogContext';
import { generateBlogPageMeta, generateBlogListStructuredData } from '../utils/seoHelpers';
import ArticleBody from '../components/ui/ArticleBody';
import type { BlogArticle } from '../services/blogService';

/** How many cards the list shows before asking for "more". */
const PAGE = 12;

/** "Saona Island: Paradise Found" → "Saona Island", for the filter chips. */
const shortTour = (title: string) => title.split(/\s+[:–—]\s+|\s*:\s+/)[0] || title;

// Newest first. An article without a date keeps its stored place after the
// dated ones, so a hand-ordered list still reads the way it was ordered.
const byDateDesc = (articles: BlogArticle[]) =>
  articles
    .map((article, index) => ({ article, index }))
    .sort((a, b) => {
      const da = a.article.date ?? '';
      const db = b.article.date ?? '';
      if (da && db && da !== db) return db.localeCompare(da);
      if (da && !db) return -1;
      if (!da && db) return 1;
      return a.index - b.index;
    })
    .map(({ article }) => article);

const formatDate = (date: string, locale: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(parsed);
  } catch {
    return date;
  }
};

const Blog = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const { blogArticles, loading, error } = useBlog();
  const [searchParams, setSearchParams] = useSearchParams();
  const articles = useMemo(
    () => byDateDesc((blogArticles[getContentLocale(locale)] ?? []).filter((a) => a.visible !== false)),
    [blogArticles, locale]
  );

  const tourFilter = searchParams.get('tour') ?? '';
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [shown, setShown] = useState(PAGE);

  // Excursions that have stories, most-written-about first.
  const tours = useMemo(() => {
    const counts = new Map<string, number>();
    articles.forEach((a) => a.tour && counts.set(a.tour, (counts.get(a.tour) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [articles]);

  const visible = tourFilter ? articles.filter((a) => a.tour === tourFilter) : articles;

  const setTour = (tour: string) => {
    const next = new URLSearchParams(searchParams);
    if (tour) next.set('tour', tour);
    else next.delete('tour');
    setSearchParams(next, { replace: true });
    setShown(PAGE);
  };

  const toggle = (slug: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  // A link to /blog#some-slug opens that story and brings it into view, even
  // when it sits beyond the first page or outside the current filter.
  useEffect(() => {
    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!slug || articles.length === 0) return;
    const index = articles.findIndex((a) => a.slug === slug);
    if (index < 0) return;
    if (tourFilter && articles[index].tour !== tourFilter) setTour('');
    setShown((n) => Math.max(n, index + 1));
    setOpen((prev) => new Set(prev).add(slug));
    requestAnimationFrame(() =>
      document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
    // Only on arrival, not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles]);

  useEffect(() => {
    const pageTitle = `Blog | ${brandSettings.brandName}`;
    const pageDescription = localeText(locale, {
      en: 'Travel and tour blog in Punta Cana. Discover travel stories, tips, and guides about excursions in the Dominican Republic.',
      es: 'Blog de viajes y tours en Punta Cana. Descubre historias, tips de viaje y guías sobre excursiones en República Dominicana.',
      de: 'Reise- und Ausflugsblog aus Punta Cana: Geschichten, Reisetipps und Ratgeber zu Ausflügen in der Dominikanischen Republik.',
      fr: 'Blog voyage et excursions à Punta Cana : récits, conseils et guides pour vos excursions en République dominicaine.',
    });

    generateBlogPageMeta(pageTitle, pageDescription, window.location.href);

    if (articles.length > 0) {
      generateBlogListStructuredData(
        localeText(locale, { en: 'Blog', es: 'Blog de Tours', de: 'Reiseblog', fr: 'Blog voyage' }),
        pageDescription,
        articles
      );
    }

    return () => {
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        if (script.textContent?.includes('Blog')) {
          script.remove();
        }
      });
    };
  }, [locale, brandSettings.brandName, articles]);

  const t = {
    all: localeText(locale, { en: 'All stories', es: 'Todas las historias', de: 'Alle Geschichten', fr: 'Tous les récits' }),
    filterLabel: localeText(locale, { en: 'Stories by excursion', es: 'Historias por excursión', de: 'Geschichten nach Ausflug', fr: 'Récits par excursion' }),
    readMore: localeText(locale, { en: 'Read the story', es: 'Leer la historia', de: 'Geschichte lesen', fr: 'Lire le récit' }),
    readLess: localeText(locale, { en: 'Close story', es: 'Cerrar historia', de: 'Geschichte schließen', fr: 'Refermer le récit' }),
    more: localeText(locale, { en: 'Show more stories', es: 'Ver más historias', de: 'Weitere Geschichten', fr: 'Plus de récits' }),
    loading: localeText(locale, { en: 'Loading stories…', es: 'Cargando historias…', de: 'Geschichten werden geladen…', fr: 'Chargement des récits…' }),
  };

  return (
    <div className="page-top bg-paper pb-16 md:pb-24">
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
          <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8 md:p-12 shadow-sm max-w-2xl mx-auto">
            <h3 className="mb-4 text-xl font-bold text-red-900">Unable to load blog content</h3>
            <p className="text-sm text-red-800 font-body leading-relaxed">
              Blog articles failed to load. Check the browser console (F12) for logs starting with [Blog].
            </p>
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-3xl border border-ink/20 bg-paper p-12 text-center text-ink-soft shadow-sm max-w-xl mx-auto">
            <p className="text-lg font-medium">
              <FormattedMessage id="blog.noArticles" defaultMessage="No articles available yet. Please check back soon." />
            </p>
          </div>
        ) : (
          <div className="relative z-10 mx-auto mt-10 max-w-5xl">
            {tours.length > 1 && (
              <nav aria-label={t.filterLabel} className="mb-8">
                <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-ink-soft">{t.filterLabel}</p>
                {/* One scrolling row on a phone, wrapped chips on wider screens. */}
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                  {[['', articles.length] as [string, number], ...tours].map(([tour, count]) => {
                    const active = tour === tourFilter;
                    return (
                      <button
                        key={tour || '__all'}
                        title={tour || undefined}
                        type="button"
                        onClick={() => setTour(tour)}
                        aria-pressed={active}
                        className={`shrink-0 rounded-[16px_6px_14px_8px] border-2 px-3.5 py-1.5 text-sm font-bold transition-colors ${
                          active ? 'border-ink bg-lagoon text-paper' : 'border-ink/20 bg-paper text-ink hover:border-ink'
                        }`}
                      >
                        {tour ? shortTour(tour) : t.all} <span className={active ? 'text-paper/80' : 'text-ink-soft'}>· {count}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            )}

            <div className="grid gap-6 md:grid-cols-2 md:gap-8">
              {visible.slice(0, shown).map((article, idx) => {
                const isOpen = open.has(article.slug);
                const cover = article.images?.[0];
                const radiusClass = idx % 2 === 0 ? 'rounded-[32px_14px_28px_18px]' : 'rounded-[18px_32px_20px_28px]';
                return (
                  <article
                    key={article.id}
                    id={article.slug}
                    className={`glass-card ${radiusClass} scroll-mt-28 overflow-hidden border border-ink/15 shadow-ink-sm ${
                      isOpen ? 'md:col-span-2' : ''
                    }`}
                  >
                    {cover && !isOpen && (
                      <button type="button" onClick={() => toggle(article.slug)} className="block w-full" tabIndex={-1} aria-hidden="true">
                        <img
                          src={cover}
                          alt=""
                          loading={idx < 2 ? 'eager' : 'lazy'}
                          decoding="async"
                          className="aspect-[16/9] w-full object-cover"
                        />
                      </button>
                    )}
                    <div className={isOpen ? 'p-6 md:p-12' : 'p-5 md:p-7'}>
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-body">
                        {article.tour && (
                          <button
                            type="button"
                            onClick={() => setTour(article.tour)}
                            className="inline-flex items-center gap-1 rounded-[14px_6px_12px_8px] border-2 border-ink bg-lagoon-light px-2.5 py-1 font-extrabold text-ink"
                          >
                            <MdTour className="h-3.5 w-3.5 text-lagoon-dark" />
                            {isOpen ? article.tour : shortTour(article.tour)}
                          </button>
                        )}
                        {article.date && (
                          <span className="inline-flex items-center gap-1 text-ink-soft">
                            <MdEvent className="h-3.5 w-3.5 text-lagoon-dark" />
                            <time dateTime={article.date}>{formatDate(article.date, locale)}</time>
                          </span>
                        )}
                      </div>

                      <h2
                        className={`font-display font-bold tracking-tight text-ink ${
                          isOpen ? 'mb-6 text-3xl leading-tight md:text-5xl' : 'mb-3 text-2xl leading-snug md:text-[1.7rem]'
                        }`}
                      >
                        {article.title}
                      </h2>

                      {isOpen ? (
                        <div className="prose prose-slate max-w-none font-body">
                          <ArticleBody
                            caption={article.caption}
                            prelude={article.prelude}
                            body={article.post}
                            images={article.images}
                            title={article.title}
                          />
                        </div>
                      ) : (
                        article.caption && (
                          <p className="line-clamp-3 font-body text-base leading-relaxed text-ink-soft">{article.caption}</p>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          toggle(article.slug);
                          if (isOpen) {
                            requestAnimationFrame(() =>
                              document.getElementById(article.slug)?.scrollIntoView({ block: 'nearest' })
                            );
                          }
                        }}
                        aria-expanded={isOpen}
                        className="mt-5 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-mango px-4 py-2 text-sm font-extrabold text-ink shadow-ink-sm transition-transform active:scale-95"
                      >
                        {isOpen ? t.readLess : t.readMore}
                        {isOpen ? <MdExpandLess className="h-5 w-5" /> : <MdExpandMore className="h-5 w-5" />}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {visible.length > shown && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="rounded-full border-2 border-ink bg-paper px-6 py-3 font-extrabold text-ink shadow-ink-sm transition-transform active:scale-95"
                >
                  {t.more} ({visible.length - shown})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
