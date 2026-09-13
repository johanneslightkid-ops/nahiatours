import React, { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { MdTour, MdEvent } from 'react-icons/md';
import { useBrand } from '../contexts/BrandContext';
import PageHeader from '../components/layout/PageHeader';
import { Toucan, PalmFrond } from '../components/ui/Illustrations';
import { useI18n } from '../contexts/I18nContext';
import { useBlog } from '../contexts/BlogContext';
import { generateBlogPageMeta, generateBlogListStructuredData } from '../utils/seoHelpers';

const renderPostContent = (post: string) =>
  post
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph, index) => {
      const isFirst = index === 0;
      return (
        <p
          key={`${index}-${paragraph.substring(0, 20)}`}
          className={`leading-relaxed font-body whitespace-pre-line ${
      isFirst
        ? 'text-xl md:text-2xl text-ink-soft font-medium mb-8 border-l-4 border-lagoon pl-4 md:pl-6 italic'
              : 'text-lg text-ink-soft mb-6'
          }`}
        >
          {paragraph}
        </p>
      );
    });

const Blog = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const { blogArticles, loading, error } = useBlog();
  const articles = blogArticles[locale] ?? [];

  useEffect(() => {
    const pageTitle = `${locale === 'es' ? 'Blog' : 'Blog'} | ${brandSettings.brandName}`;
    const pageDescription =
      locale === 'es'
        ? 'Blog de viajes y tours en Punta Cana. Descubre historias, tips de viaje y guías sobre excursiones en República Dominicana.'
        : 'Travel and tour blog in Punta Cana. Discover travel stories, tips, and guides about excursions in the Dominican Republic.';

    generateBlogPageMeta(pageTitle, pageDescription, window.location.href);

    if (articles.length > 0) {
      generateBlogListStructuredData(
        locale === 'es' ? 'Blog de Tours' : 'Blog',
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

  return (
    <div className="bg-paper pb-16 md:pb-24">
      <PageHeader
        kicker="Stories from the coast"
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
              <div className="text-ink-soft font-medium font-body">Loading blog articles...</div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8 md:p-12 shadow-sm max-w-2xl mx-auto">
            <h3 className="mb-4 text-xl font-bold text-red-900">Unable to load blog content</h3>
            <div className="mb-6 text-sm text-red-800 space-y-3 font-body leading-relaxed">
              <p><strong>Status:</strong> Blog articles failed to load.</p>
              <p><strong>Possible causes:</strong></p>
              <ul className="list-inside list-disc space-y-1.5 pl-2 text-xs">
                <li>Blog bin IDs not configured in Cloudflare Pages environment variables</li>
                <li>JSONBin API key not set or invalid</li>
                <li>CORS blocking direct JSONBin requests (use Cloudflare Functions endpoint)</li>
                <li>Network connectivity issue</li>
              </ul>
            </div>
            <p className="text-xs text-hibiscus-dark font-medium">Check browser console (F12) for detailed error logs starting with [Blog]</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-3xl border border-ink/20 bg-paper p-12 text-center text-ink-soft shadow-sm max-w-xl mx-auto">
            <p className="text-lg font-medium">
              <FormattedMessage id="blog.noArticles" defaultMessage="No articles available yet. Please check back soon." />
            </p>
            <p className="mt-4 text-xs text-ink-light">If blog should have content, verify VITE_JSONBIN_BLOG_EN and VITE_JSONBIN_BLOG_ES environment variables are set.</p>
          </div>
        ) : (
          <div className="grid gap-12 max-w-4xl mx-auto">
            {articles.map((article, idx) => {
              const swayClass = `animate-wave-sway-${(idx % 10) + 1}`;
              const radiusClass = idx % 2 === 0 ? 'rounded-3xl' : 'rounded-3xl';
              return (
                <article
                  key={article.id}
                  id={article.slug}
                  className={`glass-card ${radiusClass} ${swayClass} p-6 md:p-12 transition-all duration-500 hover:scale-[1.015] shadow-md border border-ink/15`}
                >
                  <header className="mb-8 border-b border-ink/20 pb-6">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ink font-display tracking-tight leading-tight mb-5">
                      {article.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-body">
                      {article.tour && (
                        <span className="inline-flex items-center gap-1.5 rounded-3xl ring-1 ring-ink/10 bg-lagoon-light px-4 py-1.5 font-extrabold text-ink">
                          <MdTour className="h-4 w-4 text-lagoon-dark" />
                          <FormattedMessage id="blog.relatedTourLabel" defaultMessage="Related tour" />: {article.tour}
                        </span>
                      )}
                      {article.date && (
                        <span className="inline-flex items-center gap-1.5 rounded-3xl bg-paper px-4 py-1.5 font-medium text-ink-soft border border-ink/20 shadow-sm">
                          <MdEvent className="h-4 w-4 text-lagoon-dark" />
                          <time dateTime={article.date}>
                            {article.date}
                          </time>
                        </span>
                      )}
                    </div>
                  </header>
                  <div className="prose prose-slate max-w-none font-body">
                    {renderPostContent(article.post)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
