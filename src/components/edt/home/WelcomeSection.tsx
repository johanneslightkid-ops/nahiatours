import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { HiArrowRight } from 'react-icons/hi';
import { getContentLocale, useI18n, type Locale } from '../../../contexts/I18nContext';
import { getIntroStoryPreferred, JourneySection, StoryData } from '../../../services/introStoryService';
import { useSitePages } from '../../../edt/sitePages';
import { smallImage } from '../../../edt/useTours';
import MarkdownRenderer from '../../ui/MarkdownRenderer';
import { playClickFx } from '../../../lib/soundEngine';

type L = Record<Locale, string>;

const COPY = {
  kicker: { en: 'Welcome', es: 'Bienvenidos', fr: 'Bienvenue', de: 'Willkommen' },
  since: { en: 'Since', es: 'Desde', fr: 'Depuis', de: 'Seit' },
  vision: { en: 'Our vision', es: 'Nuestra visión', fr: 'Notre vision', de: 'Unsere Vision' },
  mission: { en: 'Our mission', es: 'Nuestra misión', fr: 'Notre mission', de: 'Unsere Mission' },
  more: { en: 'About us', es: 'Sobre nosotros', fr: 'À propos', de: 'Über uns' },
  chapter: { en: 'Chapter', es: 'Capítulo', fr: 'Chapitre', de: 'Kapitel' },
  tours: { en: 'Find your day', es: 'Encuentra tu día', fr: 'Trouvez votre journée', de: 'Finde deinen Tag' },
};

/** One chapter of the story: a big photograph drifting against its words. */
const Chapter: React.FC<{ section: JourneySection; index: number; locale: Locale }> = ({ section, index, locale }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-40, 40]);
  const flip = index % 2 === 1;
  return (
    <div ref={ref} className={`grid items-center gap-8 md:grid-cols-12 md:gap-12 ${index ? 'mt-20 sm:mt-28' : ''}`}>
      <div className={`relative md:col-span-7 ${flip ? 'md:order-2' : ''}`}>
        <div className="chapter-photo photo-graded aspect-[4/3] md:aspect-[16/11]">
          {section.imageUrl && (
            <motion.img
              src={section.imageUrl}
              alt={section.title}
              loading="lazy"
              decoding="async"
              style={{ y, scale: 1.12 }}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <span className={`chapter-index ${flip ? 'right-4 md:-right-6' : 'left-4 md:-left-6'}`}>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <motion.div
        className={`md:col-span-5 ${flip ? 'md:order-1' : ''}`}
        initial={reduced ? false : { opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="kicker">{COPY.chapter[locale]} {String(index + 1).padStart(2, '0')}</span>
        <h3 className="display-md mt-4">{section.title}</h3>
        <div className="lede mt-5">
          <MarkdownRenderer content={section.description} />
        </div>
      </motion.div>
    </div>
  );
};

/**
 * The welcome: who the company is (founded 2015, vision, mission), then the
 * day itself in three chapters from the story the admin edits under Home.
 */
const WelcomeSection: React.FC = () => {
  const { locale } = useI18n();
  const pages = useSitePages(locale);
  const reduced = useReducedMotion();
  const [story, setStory] = useState<StoryData | null>(null);

  useEffect(() => {
    let live = true;
    getIntroStoryPreferred(getContentLocale(locale)).then((data) => live && setStory(data));
    return () => {
      live = false;
    };
  }, [locale]);

  const about = pages?.about;
  const chapters = (story?.sections ?? []).filter((section) => section.title && section.id !== 'adventure_preview');

  return (
    <section id="welcome" className="home-section band band-ivory overflow-hidden">
      <div className="section-shell">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <motion.div
            className="lg:col-span-6"
            initial={reduced ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="kicker">{COPY.kicker[locale]}</span>
            <h2 className="display-lg mt-4">{about?.title ?? ' '}</h2>
            {about && (
              <>
                <p className="mt-6 text-xl font-medium leading-relaxed text-ink">{about.intro}</p>
                <div className="lede mt-5">
                  <MarkdownRenderer content={about.body} />
                </div>
                <Link to="/about" onClick={() => playClickFx()} className="link-rule mt-8">
                  {COPY.more[locale]} <HiArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </motion.div>

          <div className="relative lg:col-span-6">
            <div className="welcome-stack">
              <div className="welcome-photo welcome-photo-a photo-graded">
                <img src={smallImage('/imgs/edt/gallery/beach-walk.webp')} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </div>
              <div className="welcome-photo welcome-photo-b photo-graded gold-frame">
                <img src={smallImage('/imgs/edt/tours/catalina-island-tour/1.webp')} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </div>
              <div className="welcome-seal" aria-hidden="true">
                <span className="font-condensed text-[0.7rem] font-bold uppercase tracking-[0.24em] text-gold-dark">{COPY.since[locale]}</span>
                <span className="font-display text-4xl leading-none text-ink">{about?.founded ?? 2015}</span>
              </div>
            </div>
          </div>
        </div>

        {about && (
          <div className="mt-16 grid gap-5 md:grid-cols-2">
            {[
              { title: COPY.vision[locale], text: about.vision },
              { title: COPY.mission[locale], text: about.mission },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                className="vm-card"
                initial={reduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <span className="font-display text-5xl leading-none text-mango">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-display text-2xl uppercase">{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {chapters.length > 0 && (
          <div className="mt-24 sm:mt-32">
            {chapters.map((section, index) => (
              <Chapter key={section.id} section={section} index={index} locale={locale} />
            ))}
            <div className="mt-16 flex justify-center">
              <Link to="/tours" onClick={() => playClickFx()} className="btn-ink">
                {COPY.tours[locale]} <HiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default WelcomeSection;
