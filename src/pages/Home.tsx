import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import StorySection from '../components/StorySection';
import AdventureCard from '../components/AdventureCard';
import TestimonialDisplay from '../components/TestimonialDisplay';
import SocialMediaVideos from '../components/SocialMediaVideos';
import FABWhatsApp from '../components/FABWhatsApp';
import { useBrand } from '../contexts/BrandContext';
import { useI18n } from '../contexts/I18nContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { generateBlogListStructuredData } from '../utils/seoHelpers';
import { getIntroStoryPreferred, StoryData } from '../services/introStoryService';
import { useBlog } from '../contexts/BlogContext';
import QuickFacts from '../components/home/QuickFacts';
import PathwaysSection from '../components/home/PathwaysSection';
import DestinationStrip from '../components/home/DestinationStrip';
import { playClickFx, playHoverFx } from '../lib/soundEngine';
import Reveal from '../components/ui/Reveal';
import { SnorkelMask, Monstera, TransferVan } from '../components/ui/Illustrations';

const HERO_BACKGROUND_IMAGE = '/imgs/tours/tour_saona_island_detail_12.jpg';
const HERO_BACKGROUND_VIDEO = '/buggy.mp4';

const Home: React.FC = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const { blogArticles } = useBlog();
  const navigate = useNavigate();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const seoArticles = blogArticles[locale] ?? [];
  const hiddenBlogStyle = {
    position: 'absolute' as const,
    left: '-9999px',
    top: 'auto',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
  };

  useEffect(() => {
    let isCurrent = true;

    getIntroStoryPreferred(locale).then((data) => {
      if (isCurrent) {
        setStoryData(data);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [locale]);

  useEffect(() => {
    if (seoArticles.length === 0) {
      return;
    }

    generateBlogListStructuredData(
      locale === 'es' ? 'Blog de Tours' : 'Blog',
      locale === 'es'
        ? 'Entradas del blog de viajes en Punta Cana para SEO y motores de búsqueda.'
        : 'Punta Cana travel blog entries for SEO and search engines.',
      seoArticles
    );

    return () => {
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        if (script.textContent?.includes('Blog')) {
          script.remove();
        }
      });
    };
  }, [locale, seoArticles]);

  return (
    <div id="top" className="relative">
      {/* FAB WhatsApp Button */}
      <FABWhatsApp phoneNumber={brandSettings.phoneNumber} />

      {/* Hero Section */}
      <Hero backgroundImage={HERO_BACKGROUND_IMAGE} backgroundVideo={HERO_BACKGROUND_VIDEO} />

      {/* Hard facts, straight from the live catalogue */}
      <QuickFacts />

      {/* Where the excursions actually go — read from the catalogue, so it can
          never advertise a destination the business does not sell. */}
      <DestinationStrip />

      {seoArticles.length > 0 && (
        <section aria-hidden="true" style={hiddenBlogStyle}>
          <h2>{locale === 'es' ? 'Blog' : 'Blog'}</h2>
          {seoArticles.map((article) => (
            <article key={article.id}>
              <h3>{article.title}</h3>
              <p>{article.post.slice(0, 180)}</p>
            </article>
          ))}
        </section>
      )}

      {/* Story Narrative Sections */}
      <div className="space-y-0 min-h-[50vh]">
        {!storyData ? (
          <section className="home-section shore-section py-24">
            <div className="section-shell grid gap-10 md:grid-cols-2 md:items-center">
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-32 rounded-full bg-ink/10" />
                <div className="h-10 w-3/4 rounded-2xl bg-ink/10" />
                <div className="h-24 w-full rounded-3xl border-2 border-ink/15 bg-paper-warm" />
                <div className="h-4 w-2/3 rounded-full bg-ink/10" />
              </div>
              <div className="h-64 w-full animate-pulse rounded-[28px_16px_30px_18px] border-2 border-ink/15 bg-paper-warm md:h-80" />
            </div>
          </section>
        ) : (
          storyData.sections.map((section, index) => {
            if (section.id === 'adventure_preview') {
              // Adventure preview section with cards
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="home-section lagoon-section wavy-band relative overflow-hidden px-4 py-28 sm:py-32 md:px-8 lg:py-36"
                >
                  <div className="parallax-wash parallax-wash-left" />
                  <div className="parallax-wash parallax-wash-right" />

                  <div className="relative z-10 max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
                      <div className="section-icon mx-auto mb-5">
                        {section.emoji}
                      </div>
                      <h2 className="scribble-title-bg mb-4 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl md:text-5xl">
                        {section.title}
                      </h2>
                      <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-8 text-ink-soft sm:text-xl">
                        {section.description}
                      </p>
                    </div>

                    {/* Adventure cards grid */}
                    {section.adventures && (
                      <div className="grid gap-7 md:grid-cols-3 lg:gap-8">
                        {section.adventures.map((adventure, i) => (
                          <AdventureCard key={adventure.id} adventure={adventure} index={i} />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            }

            // Regular story sections
            return (
              <StorySection
                key={section.id}
                id={section.id}
                title={section.title}
                emoji={section.emoji}
                timeframe={section.timeframe}
                description={section.description}
                narrative={section.narrative || ''}
                imageUrl={section.imageUrl}
                vimeoUrl={section.vimeoUrl}
                mood={section.mood || ''}
                isAlternate={index % 2 === 1}
                themeName={['shore-section', 'lagoon-section', 'cove-section', 'bay-section'][index % 4]}
              />
            );
          })
        )}
      </div>

      {/* Call-to-Action Banner: prefer dynamic CTAs from storyData.callToActions */}
      {!storyData ? null : storyData.callToActions && storyData.callToActions.length > 0 ? (
        <section className="home-section sunset-section wavy-band px-4 py-24 text-white sm:py-28 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="mb-6 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl">
              {storyData.storyTitle || 'Ready for Your Perfect Day in Paradise?'}
            </h2>
            {storyData.storyTagline && (
              <p className="mx-auto mb-8 max-w-2xl text-lg font-bold leading-8 text-white sm:text-xl">
                {storyData.storyTagline}
              </p>
            )}
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              {storyData.callToActions.map((cta, i) => (
                <button
                  key={`${cta.text}-${i}`}
                  onMouseEnter={() => playHoverFx()}
                  onClick={() => {
                    playClickFx();
                    if (cta.target?.startsWith('http')) {
                      window.open(cta.target, '_blank');
                    } else {
                      navigate(cta.target || '/');
                    }
                  }}
                  className="tropical-button"
                >
                  {cta.text}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="home-section sunset-section wavy-band px-4 py-24 text-white sm:py-28 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="mb-6 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl">
              {locale === 'es'
                ? '¿Listo para tu día perfecto en el Caribe?'
                : 'Ready for your perfect day in the Caribbean?'}
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-white sm:text-xl">
              {locale === 'es'
                ? 'Escríbenos por WhatsApp y armamos el día contigo, o mira las excursiones aquí abajo.'
                : 'Message us on WhatsApp and we will put the day together with you, or browse the excursions below.'}
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button
                onMouseEnter={() => playHoverFx()}
                onClick={() => {
                  playClickFx();
                  window.open(
                    generateWhatsAppMessage(
                      brandSettings.phoneNumber,
                      'Hola! Me gustaría información sobre sus tours.'
                    ),
                    '_blank'
                  );
                }}
                className="tropical-button btn-whatsapp"
              >
                {locale === 'es' ? 'Escribir por WhatsApp' : 'Chat on WhatsApp'}
              </button>
              <button
                onMouseEnter={() => playHoverFx()}
                onClick={() => {
                  playClickFx();
                  navigate('/tours');
                }}
                className="tropical-button-outline"
              >
                {locale === 'es' ? 'Ver excursiones' : 'View excursions'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      <TestimonialDisplay locale={locale} />

      {/* Why Choose Us Section - Enhanced */}
      <section className="home-section reef-section wavy-band px-4 py-24 text-white sm:py-28 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
            <h2 className="mb-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl md:text-6xl">
              <FormattedMessage id="features.title" />
            </h2>
            <p className="text-lg leading-8 text-white sm:text-xl">
              {locale === 'es'
                ? `Servicio cuidado de principio a fin con ${brandSettings.brandName}`
                : `Thoughtful service from arrival to return with ${brandSettings.brandName}`}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {/* Safety First */}
            <Reveal className="home-feature-card group p-8">
              <SnorkelMask className="mb-4 h-12 w-14" />
              <h3 className="mb-3 font-display text-2xl font-semibold text-ink">
                <FormattedMessage id="features.safety.title" />
              </h3>
              <p className="font-semibold text-ink-soft">
                <FormattedMessage id="features.safety.description" />
              </p>
            </Reveal>

            {/* Curated Experiences */}
            <Reveal delay={80} className="home-feature-card group p-8">
              <Monstera className="mb-4 h-12 w-12" />
              <h3 className="mb-3 font-display text-2xl font-semibold text-ink">
                <FormattedMessage id="features.experiences.title" />
              </h3>
              <p className="font-semibold text-ink-soft">
                <FormattedMessage id="features.experiences.description" />
              </p>
            </Reveal>

            {/* Transportation */}
            <Reveal delay={160} className="home-feature-card group p-8">
              <TransferVan className="mb-4 h-12 w-16" />
              <h3 className="mb-3 font-display text-2xl font-semibold text-ink">
                <FormattedMessage id="features.transportation.title" />
              </h3>
              <p className="font-semibold text-ink-soft">
                <FormattedMessage id="features.transportation.description" />
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Closing: catalogue mode vs. the guided planner */}
      <PathwaysSection />

      {/* Social Media Videos Section - Only shows if videos exist */}
      <SocialMediaVideos />

      {/* SEO: Hidden blog articles for search engine indexing */}
      <div className="hidden h-0 w-0 overflow-hidden">
        {blogArticles[locale]?.map((article) => (
          <article key={article.id} data-article-id={article.slug}>
            <h3>{article.title}</h3>
            {article.tour && <p>Related tour: {article.tour}</p>}
            {article.date && <time dateTime={article.date}>{article.date}</time>}
            <p>{article.post}</p>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Home;
