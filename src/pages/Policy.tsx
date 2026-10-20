import React from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { useI18n, type Locale } from '../contexts/I18nContext';
import { useSitePages } from '../edt/sitePages';

const COPY: Record<string, Record<Locale, string>> = {
  kicker: { en: 'Legal', es: 'Legal', fr: 'Mentions légales', de: 'Rechtliches' },
  missing: { en: 'This page could not be found.', es: 'No se encontró esta página.', fr: 'Page introuvable.', de: 'Diese Seite wurde nicht gefunden.' },
  other: { en: 'Other policies', es: 'Otras políticas', fr: 'Autres politiques', de: 'Weitere Richtlinien' },
};

/** /policies/:slug — privacy, terms, cancellation and cookies, in the reader's language. */
const Policy: React.FC = () => {
  const { slug = '' } = useParams();
  const { locale } = useI18n();
  const pages = useSitePages(locale);
  const policy = pages?.policies.find((item) => item.slug === slug);

  return (
    <div className="pb-24">
      <PageHeader tone="mango" kicker={COPY.kicker[locale]} title={policy?.title ?? (pages ? COPY.missing[locale] : ' ')} />
      <div className="section-shell grid gap-12 py-14 lg:grid-cols-12">
        <article className="prose prose-lg max-w-none lg:col-span-8">
          {policy && <MarkdownRenderer content={policy.body} />}
        </article>
        {pages && (
          <aside className="lg:col-span-4">
            <div className="sticky top-32 rounded-[8px] bg-white p-6 shadow-ink-sm ring-1 ring-ink/10">
              <h2 className="font-condensed text-xs font-bold uppercase tracking-[0.22em] text-gold-dark">{COPY.other[locale]}</h2>
              <ul className="mt-4 space-y-2">
                {pages.policies.map((item) => (
                  <li key={item.slug}>
                    <Link
                      to={`/policies/${item.slug}`}
                      aria-current={item.slug === slug ? 'page' : undefined}
                      className={`block rounded-[4px] px-3 py-2 text-[0.98rem] no-underline transition ${
                        item.slug === slug ? 'bg-ink text-paper' : 'text-ink hover:bg-paper'
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default Policy;
