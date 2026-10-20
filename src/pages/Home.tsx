import React, { useEffect, useState } from 'react';
import { localeText } from '../lib/localeText';
import { useNavigate } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { HiArrowRight } from 'react-icons/hi';
import Hero from '../components/Hero';
import TestimonialDisplay from '../components/TestimonialDisplay';
import SocialMediaVideos from '../components/SocialMediaVideos';
import FABWhatsApp from '../components/FABWhatsApp';
import { useBrand } from '../contexts/BrandContext';
import { getContentLocale, useI18n } from '../contexts/I18nContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { generateBlogListStructuredData } from '../utils/seoHelpers';
import { getIntroStoryPreferred, StoryData } from '../services/introStoryService';
import { useBlog } from '../contexts/BlogContext';
import PathwaysSection from '../components/home/PathwaysSection';
import { playClickFx } from '../lib/soundEngine';
import MomentsGallery from '../components/edt/home/MomentsGallery';
import TopToursGallery from '../components/edt/home/TopToursGallery';
import WelcomeSection from '../components/edt/home/WelcomeSection';
import PromisesSection from '../components/edt/home/PromisesSection';
import TopTransfersGallery from '../components/edt/home/TopTransfersGallery';
import RecognitionSection from '../components/edt/home/RecognitionSection';

const HERO_BACKGROUND_IMAGE = '/imgs/edt/banners/excursions.webp';

/**
 * The landing page, top to bottom: the hero (with the "Inspire me" switch),
 * the gallery of real moments, the ranked best sellers, the welcome and its
 * story, why us, the transfers, certifications, guest reviews, the call to
 * action and the two ways to build a day.
 */
const Home: React.FC = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const { blogArticles } = useBlog();
  const contentLocale = getContentLocale(locale);
  const navigate = useNavigate();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const seoArticles = blogArticles[contentLocale] ?? [];

  useEffect(() => {
    let isCurrent = true;
    getIntroStoryPreferred(contentLocale).then((data) => {
      if (isCurrent) setStoryData(data);
    });
    return () => {
      isCurrent = false;
    };
  }, [contentLocale]);

  useEffect(() => {
    if (seoArticles.length === 0) return undefined;
    generateBlogListStructuredData(
      localeText(locale, { en: 'Blog', es: 'Blog', de: 'Reiseblog', fr: 'Blog voyage' }),
      localeText(locale, {
        en: 'Punta Cana travel guides and trip ideas.',
        es: 'Guías de viaje e ideas para Punta Cana.',
        de: 'Reiseführer und Ideen für Punta Cana.',
        fr: 'Guides et idées de voyage à Punta Cana.',
      }),
      seoArticles
    );
    return () => {
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        if (script.textContent?.includes('Blog')) script.remove();
      });
    };
  }, [locale, seoArticles]);

  const say = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);

  const runCta = (target: string | undefined, action: string | undefined) => {
    playClickFx();
    if (target?.startsWith('http')) window.open(target, '_blank');
    else if (action === 'plan') navigate('/plan');
    else if (action === 'contact') navigate('/contact');
    else navigate(target || '/tours');
  };

  return (
    <div id="top" className="relative">
      <FABWhatsApp phoneNumber={brandSettings.phoneNumber} />

      <Hero backgroundImage={HERO_BACKGROUND_IMAGE} />

      {/* Between the hero and the welcome: the gallery, then the best sellers. */}
      <MomentsGallery />
      <TopToursGallery />

      <WelcomeSection />
      <PromisesSection />

      {/* Transfers, then who stands behind us, then what guests say. */}
      <TopTransfersGallery />
      <RecognitionSection />
      <TestimonialDisplay locale={locale} />

      {/* The call to action. */}
      <section id="perfect-day" className="home-section relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0" aria-hidden="true">
          <img src="/imgs/edt/tours/saona-island-tour-palmilla-beach/1.webp" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(20_22_26/0.35)_0%,rgb(20_22_26/0.75)_100%)]" />
          <div className="absolute inset-0" style={{ background: 'var(--grade)' }} />
          <div className="hero-grain absolute inset-0" />
        </div>
        <div className="section-shell relative py-28 text-center sm:py-36">
          <span className="kicker kicker-light justify-center">{say({ en: 'Your move', es: 'Tu turno', fr: 'À vous de jouer', de: 'Dein Zug' })}</span>
          <h2 className="display-lg mx-auto mt-5 max-w-4xl text-white">
            {storyData?.storyTitle || say({ en: 'Ready for your perfect day in paradise?', es: '¿Listo para tu día perfecto en el paraíso?', fr: 'Prêt pour votre journée parfaite au paradis ?', de: 'Bereit für deinen perfekten Tag im Paradies?' })}
          </h2>
          {storyData?.storyTagline && <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">{storyData.storyTagline}</p>}
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            {(storyData?.callToActions?.length ? storyData.callToActions : []).map((cta, i) => (
              <button key={`${cta.text}-${i}`} onClick={() => runCta(cta.target, cta.action)} className="btn-amber">
                {cta.text} <HiArrowRight className="h-4 w-4" />
              </button>
            ))}
            <button
              onClick={() => {
                playClickFx();
                window.open(
                  generateWhatsAppMessage(
                    brandSettings.phoneNumber,
                    say({ en: 'Hi! I would like information about your tours.', es: '¡Hola! Me gustaría información sobre sus tours.', fr: 'Bonjour ! J’aimerais des informations sur vos excursions.', de: 'Hallo! Ich hätte gern Infos zu euren Touren.' })
                  ),
                  '_blank'
                );
              }}
              className="btn-wa"
            >
              <FaWhatsapp className="h-5 w-5" /> {say({ en: 'Chat on WhatsApp', es: 'Escribir por WhatsApp', fr: 'Écrire sur WhatsApp', de: 'Per WhatsApp schreiben' })}
            </button>
            <button onClick={() => { playClickFx(); navigate('/tours'); }} className="btn-outline-light">
              {say({ en: 'View all tours', es: 'Ver todos los tours', fr: 'Voir les excursions', de: 'Alle Touren' })}
            </button>
          </div>
        </div>
      </section>

      {/* Closing: catalogue mode vs. the guided planner. */}
      <PathwaysSection />

      {/* Social videos — only when there are any. */}
      <SocialMediaVideos />

      {/* SEO: the blog's articles, for search engines. */}
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
