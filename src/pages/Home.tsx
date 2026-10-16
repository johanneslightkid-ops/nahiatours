import React, { useState, useEffect, useRef } from 'react';
import { localeText } from '../lib/localeText';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import StorySection from '../components/StorySection';
import AdventureCard from '../components/AdventureCard';
import TestimonialDisplay from '../components/TestimonialDisplay';
import SocialMediaVideos from '../components/SocialMediaVideos';
import FABWhatsApp from '../components/FABWhatsApp';
import { useBrand } from '../contexts/BrandContext';
import { getContentLocale, useI18n } from '../contexts/I18nContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { generateBlogListStructuredData } from '../utils/seoHelpers';
import { getIntroStoryPreferred, StoryData } from '../services/introStoryService';
import { useBlog } from '../contexts/BlogContext';
import QuickFacts from '../components/home/QuickFacts';
import PathwaysSection from '../components/home/PathwaysSection';
import { playClickFx, playHoverFx } from '../lib/soundEngine';
import CaribbeanSea from '../components/water/CaribbeanSea';
import ReefLight from '../components/water/ReefLight';
import { GlidingBirds, LeafCanopy, Reveal, RisingBubbles, SwimmingSchool } from '../components/nature/Nature';
import { Coral, EagleRay, Hibiscus, PalmTree, Sailboat, SeaFan, SeaTurtle, Seaweed } from '../components/ui/Illustrations';

const HERO_BACKGROUND_IMAGE = '/imgs/tours/tour_saona_island_detail_12.jpg';
const HERO_BACKGROUND_VIDEO = '/buggy.mp4';

const Home: React.FC = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const { blogArticles } = useBlog();
  const contentLocale = getContentLocale(locale);
  const navigate = useNavigate();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  // The two water bands listen to the pointer across their whole section.
  const sunsetRef = useRef<HTMLElement>(null);
  const reefRef = useRef<HTMLElement>(null);
  const seoArticles = blogArticles[contentLocale] ?? [];
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

    getIntroStoryPreferred(contentLocale).then((data) => {
      if (isCurrent) {
        setStoryData(data);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [contentLocale]);

  useEffect(() => {
    if (seoArticles.length === 0) {
      return;
    }

    generateBlogListStructuredData(
      localeText(locale, { en: 'Blog', es: 'Blog de Tours', de: 'Reiseblog', fr: 'Blog voyage' }),
      localeText(locale, {
        en: 'Punta Cana travel blog entries for SEO and search engines.',
        es: 'Entradas del blog de viajes en Punta Cana para SEO y motores de búsqueda.',
        de: 'Beiträge aus dem Reiseblog über Punta Cana.',
        fr: 'Articles du blog voyage sur Punta Cana.',
      }),
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
                  <SwimmingSchool className="z-0" opacity={0.75} />
                  <LeafCanopy variant="jungle" />

                  <div className="relative z-10 max-w-6xl mx-auto">
                    {/* Header */}
                    <Reveal className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
                      <div className="section-icon mx-auto mb-5">
                        {section.emoji}
                      </div>
                      <h2 className="scribble-title-bg mb-4 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl md:text-5xl">
                        {section.title}
                      </h2>
                      <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-8 text-ink-soft sm:text-xl">
                        {section.description}
                      </p>
                    </Reveal>

                    {/* Adventure cards grid */}
                    {section.adventures && (
                      <div className="grid gap-7 md:grid-cols-3 lg:gap-8">
                        {section.adventures.map((adventure, i) => (
                          <Reveal key={adventure.id} delay={i * 0.12} className="h-full">
                            <AdventureCard adventure={adventure} index={i} />
                          </Reveal>
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
        <section ref={sunsetRef} className="home-section sunset-section wavy-band relative overflow-hidden px-4 py-28 text-white sm:py-36 md:px-8">
          <CaribbeanSea className="z-0" pointerTarget={sunsetRef} />
          <GlidingBirds className="z-[1]" tone="text-[#2a1d3a]/70" count={4} />
          <div className="pointer-events-none absolute -bottom-6 -left-16 z-[1] h-80 w-56 opacity-90 sm:h-[28rem] sm:w-80" aria-hidden="true">
            <PalmTree className="h-full w-full brightness-[0.25] saturate-50" />
          </div>
          <div className="pointer-events-none absolute -bottom-10 -right-20 z-[1] hidden h-[30rem] w-80 -scale-x-100 md:block" aria-hidden="true">
            <PalmTree className="h-full w-full brightness-[0.22] saturate-50" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="mb-6 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
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
        <section ref={sunsetRef} className="home-section sunset-section wavy-band relative overflow-hidden px-4 py-28 text-white sm:py-36 md:px-8">
          <CaribbeanSea className="z-0" pointerTarget={sunsetRef} />
          <GlidingBirds className="z-[1]" tone="text-[#2a1d3a]/70" count={4} />
          <div className="pointer-events-none absolute -bottom-6 -left-16 z-[1] h-80 w-56 opacity-90 sm:h-[28rem] sm:w-80" aria-hidden="true">
            <PalmTree className="h-full w-full brightness-[0.25] saturate-50" />
          </div>
          <div className="pointer-events-none absolute -bottom-10 -right-20 z-[1] hidden h-[30rem] w-80 -scale-x-100 md:block" aria-hidden="true">
            <PalmTree className="h-full w-full brightness-[0.22] saturate-50" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="mb-6 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
              Ready for Your Perfect Day in Paradise?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg font-bold leading-8 text-white sm:text-xl">
              Your adventure is just one click away. Contact us on WhatsApp or choose your adventure below.
            </p>
            <p className="mb-6 font-accent text-xl text-white/80">{localeText(locale, { en: 'move the sun with your pointer', es: 'mueve el sol con el cursor', de: 'bewege die Sonne mit dem Zeiger', fr: 'déplacez le soleil avec le curseur' })}</p>
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
                className="tropical-button"
              >
                Chat on WhatsApp
              </button>
              <button
                onMouseEnter={() => playHoverFx()}
                onClick={() => {
                  playClickFx();
                  navigate('/tours');
                }}
                className="tropical-button-outline"
              >
                View Adventures
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      <TestimonialDisplay locale={locale} />

      {/* Why Choose Us Section - Enhanced */}
      <section ref={reefRef} className="home-section reef-section wavy-band relative overflow-hidden px-4 py-28 text-white sm:py-36 md:px-8">
        <ReefLight className="z-0" pointerTarget={reefRef} />
        <RisingBubbles className="z-[1]" />
        <div className="pointer-events-none absolute left-0 top-[14%] z-[1] opacity-80" style={{ animation: 'swimRight 60s linear infinite', animationDelay: '-12s' }} aria-hidden="true">
          <EagleRay className="h-20 w-28 rotate-90 sm:h-28 sm:w-40" />
        </div>
        <div className="pointer-events-none absolute left-0 top-[60%] z-[1] hidden opacity-80 md:block" style={{ animation: 'swimLeft 75s linear infinite', animationDelay: '-30s' }} aria-hidden="true">
          <SeaTurtle className="h-24 w-20 rotate-90" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-36" aria-hidden="true">
          <Seaweed className="absolute bottom-0 left-[3%] h-36 w-16" />
          <Coral className="absolute -bottom-3 left-[12%] h-28 w-28" />
          <SeaFan className="absolute bottom-0 right-[22%] hidden h-32 w-32 md:block" />
          <Coral tone="orchid" className="absolute -bottom-3 right-[4%] h-32 w-32" />
          <Seaweed tone="gold" className="absolute bottom-0 right-[14%] hidden h-28 w-14 sm:block" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
            <h2 className="mb-4 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
              <FormattedMessage id="features.title" />
            </h2>
            <p className="text-lg font-bold leading-8 text-white sm:text-xl">
              Thoughtful service from arrival to return with {brandSettings.brandName}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
            {/* Safety First */}
            <div className="home-feature-card group p-8 animate-wave-sway-1">
              <div className="mb-4"><SeaTurtle className="h-14 w-12" /></div>
              <h3 className="mb-3 font-display text-2xl font-extrabold text-ink">
                <FormattedMessage id="features.safety.title" />
              </h3>
              <p className="font-semibold text-ink-soft">
                <FormattedMessage id="features.safety.description" />
              </p>
            </div>

            {/* Curated Experiences */}
            <div className="home-feature-card group p-8 animate-wave-sway-2">
              <div className="mb-4"><Hibiscus className="h-14 w-14" /></div>
              <h3 className="mb-3 font-display text-2xl font-extrabold text-ink">
                <FormattedMessage id="features.experiences.title" />
              </h3>
              <p className="font-semibold text-ink-soft">
                <FormattedMessage id="features.experiences.description" />
              </p>
            </div>

            {/* Transportation */}
            <div className="home-feature-card group p-8 animate-wave-sway-3">
              <div className="mb-4"><Sailboat className="h-14 w-14" /></div>
              <h3 className="mb-3 font-display text-2xl font-extrabold text-ink">
                <FormattedMessage id="features.transportation.title" />
              </h3>
              <p className="font-semibold text-ink-soft">
                <FormattedMessage id="features.transportation.description" />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing: catalogue mode vs. the guided planner */}
      <PathwaysSection />

      {/* Social Media Videos Section - Only shows if videos exist */}
      <SocialMediaVideos />

      {/* SEO: Hidden blog articles for search engine indexing */}
      <div className="hidden h-0 w-0 overflow-hidden">
        {blogArticles[contentLocale]?.map((article) => (
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
