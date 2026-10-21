import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaWhatsapp } from 'react-icons/fa';
import { HiArrowDown, HiArrowRight } from 'react-icons/hi';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useDeferredVideo } from '../lib/useDeferredVideo';
import { useBrand } from '../contexts/BrandContext';
import { defaultHeroMedia, HeroMediaItem } from '../services/brandService';
import { useI18n, type Locale } from '../contexts/I18nContext';
import { playClickFx } from '../lib/soundEngine';
import { getPublishedTestimonials, getRatingVisibility } from '../services/testimonialService';
import { getServiceSlug } from '../services/toursService';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { descriptionField, smallImage, useTours } from '../edt/useTours';
import { InspireToggle } from './edt/inspire/InspireContext';
import YouTubeBackground from './edt/YouTubeBackground';
import InspireSlideshow from './edt/inspire/InspireSlideshow';
import { INSPIRE_TRANSITIONS, InspireTransition } from '../edt/inspireConfig';
import { heroCut } from '../edt/heroImages';
import { isBigScreen } from '../edt/bigScreen';
import { useMediaQuery } from '../lib/useMediaQuery';
import { isYouTube } from '../lib/youtube';

interface HeroProps {
  backgroundImage: string;
  backgroundImageMobile?: string;
  backgroundVideo?: string;
}

type L = Record<Locale, string>;
const t = (locale: Locale, text: L) => text[locale] ?? text.en;

const COPY = {
  kicker: { en: 'Punta Cana · Bayahíbe · Samaná · Santo Domingo', es: 'Punta Cana · Bayahíbe · Samaná · Santo Domingo', fr: 'Punta Cana · Bayahíbe · Samaná · Saint-Domingue', de: 'Punta Cana · Bayahíbe · Samaná · Santo Domingo' },
  line1: { en: 'Begin your', es: 'Empieza tu', fr: 'Commencez votre', de: 'Starte dein' },
  line2: { en: 'adventure', es: 'aventura', fr: 'aventure', de: 'Abenteuer' },
  line3: { en: 'in style.', es: 'con estilo.', fr: 'avec style.', de: 'mit Stil.' },
  subtitle: {
    en: 'Enjoy your vacation to the fullest with our selection of excursions and transfers. Book easily, travel worry-free and live every moment.',
    es: 'Disfruta tus vacaciones al máximo con nuestra selección de excursiones y traslados. Reserva fácil, viaja sin preocupaciones y vive cada momento.',
    fr: 'Profitez pleinement de vos vacances avec notre sélection d’excursions et de transferts. Réservez facilement, voyagez l’esprit léger et vivez chaque instant.',
    de: 'Genieße deinen Urlaub in vollen Zügen mit unseren Ausflügen und Transfers. Einfach buchen, sorglos reisen und jeden Moment erleben.',
  },
  tours: { en: 'See all tours', es: 'Ver todos los tours', fr: 'Voir toutes les excursions', de: 'Alle Touren ansehen' },
  plan: { en: 'Plan my day', es: 'Planea mi día', fr: 'Planifier ma journée', de: 'Meinen Tag planen' },
  wa: { en: 'Hi! I would like to book an excursion.', es: '¡Hola! Me gustaría reservar una excursión.', fr: 'Bonjour ! Je voudrais réserver une excursion.', de: 'Hallo! Ich möchte einen Ausflug buchen.' },
  bestSeller: { en: 'Best seller', es: 'Más vendido', fr: 'Meilleure vente', de: 'Bestseller' },
  from: { en: 'from', es: 'desde', fr: 'dès', de: 'ab' },
  book: { en: 'Book it', es: 'Reservar', fr: 'Réserver', de: 'Buchen' },
  scroll: { en: 'Explore the excursions', es: 'Explora las excursiones', fr: 'Découvrir les excursions', de: 'Ausflüge entdecken' },
  excursions: { en: 'excursions', es: 'excursiones', fr: 'excursions', de: 'Ausflüge' },
  since: { en: 'on the island since', es: 'en la isla desde', fr: 'sur l’île depuis', de: 'auf der Insel seit' },
  rating: { en: 'average guest rating', es: 'valoración media', fr: 'note moyenne', de: 'Gästebewertung' },
  transfers: { en: 'private transfers, every day', es: 'traslados privados, cada día', fr: 'transferts privés, tous les jours', de: 'private Transfers, jeden Tag' },
};

/** How long a photograph holds the stage, and how long the change takes, unless the admin set otherwise. */
const HOLD_SECONDS = 7;
const TRANSITION_SECONDS = 1.6;

/**
 * Full throttle, in daylight.
 *
 * The company's own action photographs, one after another, each drifting in
 * slowly (scale and opacity — nothing else moves), under a warm film grade
 * and a charcoal wash on the side the words are on. Anton, very big; the
 * second line in amber. The best seller sits on the right with its price
 * upfront. Below, on a white strip, the four numbers that matter.
 *
 * The "Inspire me" switch turns the whole site into the in-store TV show.
 */
const Hero: React.FC<HeroProps> = ({ backgroundImage, backgroundVideo }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const reduced = useReducedMotion();
  const tours = useTours(locale);
  const [slide, setSlide] = useState(0);
  const [ratingBadge, setRatingBadge] = useState<{ average: number; count: number } | null>(null);

  /** YouTube backgrounds that turned out not to play here: left out, never a blank hero. */
  const [unplayable, setUnplayable] = useState<string[]>([]);
  // Until the stored settings arrive, the site's own set — so the first photo
  // painted is the one that stays, not a stand-in swapped a moment later.
  const configured: HeroMediaItem[] = brandSettings.heroMedia?.length
    ? brandSettings.heroMedia
    : defaultHeroMedia.length
    ? defaultHeroMedia
    : [{ url: backgroundImage, type: 'image', alt: '' }];
  let media = configured.filter((item) => item.url && !unplayable.includes(item.url));
  if (!media.length) {
    const fallback = defaultHeroMedia.filter((item) => item.url && !isYouTube(item.url));
    media = fallback.length ? fallback : [{ url: backgroundImage, type: 'image', alt: '' }];
  }
  if (backgroundVideo && !media.some((item) => item.type === 'video') && media.length === 0) {
    media.push({ url: backgroundVideo, type: 'video' });
  }
  const showVideo = useDeferredVideo(media.some((item) => item.type === 'video' || isYouTube(item.url)));

  // Photographs only: they give way to each other with the admin's transition
  // (Admin → Look), one picture decoded at a time, each in the cut that fits
  // the screen — the upright one on a phone held upright.
  const photosOnly = media.every((item) => item.type !== 'video' && !isYouTube(item.url));
  const upright = useMediaQuery('(orientation: portrait) and (max-width: 820px)');
  const cut = upright ? 'portrait' : isBigScreen() ? 'large' : 'small';
  const mediaKey = media.map((item) => item.url).join('|');
  const pictures = useMemo(() => media.map((item) => heroCut(item.url, cut)), [mediaKey, cut]); // eslint-disable-line react-hooks/exhaustive-deps
  const transition: InspireTransition = INSPIRE_TRANSITIONS.includes(brandSettings.heroTransition as InspireTransition)
    ? (brandSettings.heroTransition as InspireTransition)
    : 'kenburns';
  const holdSeconds = brandSettings.heroSeconds && brandSettings.heroSeconds >= 3 ? brandSettings.heroSeconds : HOLD_SECONDS;

  useEffect(() => {
    if (reduced || media.length < 2) return undefined;
    const timer = window.setInterval(() => setSlide((value) => (value + 1) % media.length), (holdSeconds + TRANSITION_SECONDS) * 1000);
    return () => window.clearInterval(timer);
  }, [media.length, reduced, holdSeconds]);

  useEffect(() => {
    let active = true;
    getPublishedTestimonials().then((testimonials) => {
      if (!active) return;
      const range = brandSettings.heroRatingRange ?? { min: 3, max: 5 };
      const result = getRatingVisibility(testimonials, { enabled: brandSettings.heroRatingEnabled, min: range.min, max: range.max });
      setRatingBadge(result.visible && result.average !== null ? { average: result.average, count: result.count } : null);
    });
    return () => {
      active = false;
    };
  }, [brandSettings.heroRatingEnabled, brandSettings.heroRatingRange]);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);
  const mediaScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.08]);

  const best = tours?.[0];
  const bestPath = best ? `/details/tours/${getServiceSlug(best)}` : '/tours';
  const bestDuration = best ? best.duration || descriptionField(best.description, 'duration') : '';

  const stats = [
    { value: tours?.length ? String(tours.length) : '30+', label: t(locale, COPY.excursions) },
    { value: '2015', label: t(locale, COPY.since) },
    ...(ratingBadge ? [{ value: ratingBadge.average.toFixed(2), label: t(locale, COPY.rating), star: true }] : []),
    { value: '24/7', label: t(locale, COPY.transfers) },
  ];

  const scrollOn = (event: React.MouseEvent<HTMLAnchorElement>) => {
    playClickFx();
    const target = document.getElementById('top-tours');
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden bg-ink text-white">
      {/* The photographs. */}
      <motion.div className="absolute inset-0 -z-10" style={{ scale: mediaScale }} aria-hidden="true">
        {photosOnly && (
          <InspireSlideshow
            // A different list (the stored one arriving, a phone turned) starts again from its first photo.
            key={`${mediaKey}|${cut}`}
            slides={pictures}
            index={slide % pictures.length}
            transition={transition}
            transitionSeconds={TRANSITION_SECONDS}
            holdSeconds={holdSeconds}
            drift={!reduced}
          />
        )}
        {!photosOnly && media.map((item, index) => {
          const on = index === slide % media.length;
          return (
            <div key={`${item.url}-${index}`} className={`hero-slide ${index % 2 ? 'is-back' : ''} ${on ? 'is-on' : ''}`}>
              {/* A YouTube address plays in YouTube's player, whichever type it was saved as. */}
              {isYouTube(item.url) ? (
                <YouTubeBackground
                  url={item.url}
                  active={on}
                  enabled={showVideo}
                  onUnavailable={() => setUnplayable((list) => (list.includes(item.url) ? list : [...list, item.url]))}
                />
              ) : item.type === 'video' && showVideo ? (
                <video className="h-full w-full object-cover" src={item.url} autoPlay muted loop playsInline preload="metadata" />
              ) : item.type === 'video' ? null : (
                <img
                  src={item.url}
                  // A phone gets the half-size copy where the site has one.
                  srcSet={/^\/imgs\/edt\/banners\/hero-[a-z-]+\.webp$/.test(item.url) ? `${item.url.replace(/\.webp$/, '-sm.webp')} 1200w, ${item.url} 2400w` : undefined}
                  sizes={/^\/imgs\/edt\/banners\/hero-[a-z-]+\.webp$/.test(item.url) ? '100vw' : undefined}
                  alt=""
                  className="h-full w-full object-cover"
                  fetchPriority={index === 0 ? 'high' : 'low'}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              )}
            </div>
          );
        })}
        <div className="absolute inset-0 bg-[linear-gradient(95deg,rgb(20_22_26/0.82)_0%,rgb(20_22_26/0.55)_38%,rgb(20_22_26/0.12)_68%,rgb(20_22_26/0)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(20_22_26/0.55)_0%,rgb(20_22_26/0)_26%,rgb(20_22_26/0)_70%,rgb(20_22_26/0.55)_100%)]" />
        <div className="absolute inset-0" style={{ background: 'var(--grade)' }} />
        <div className="hero-grain absolute inset-0" />
      </motion.div>

      <div className="section-shell relative flex min-h-[88svh] flex-col justify-end pb-10 pt-28 sm:pb-12 lg:min-h-[100vh] lg:justify-center lg:pb-36 lg:pt-36">
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <motion.div style={{ y: copyY }} className="lg:col-span-8">
            <motion.span
              className="kicker kicker-light"
              initial={reduced ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {t(locale, COPY.kicker)}
            </motion.span>

            <h1 className="mt-5 font-display uppercase text-white">
              {[t(locale, COPY.line1), t(locale, COPY.line2), t(locale, COPY.line3)].map((line, index) => (
                <motion.span
                  key={line}
                  className={`hero-line block ${index === 2 ? 'text-mango' : ''}`}
                  initial={reduced ? false : { opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  {line}
                </motion.span>
              ))}
            </h1>

            <motion.p
              className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-white/85 sm:text-xl"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
            >
              {t(locale, COPY.subtitle)}
            </motion.p>

            <motion.div
              className="mt-9 flex flex-wrap items-center gap-3"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55 }}
            >
              <Link to="/tours" onClick={() => playClickFx()} className="btn-amber">
                {t(locale, COPY.tours)} <HiArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/plan" onClick={() => playClickFx()} className="btn-outline-light">
                {t(locale, COPY.plan)}
              </Link>
              <a
                href={generateWhatsAppMessage(brandSettings.phoneNumber, t(locale, COPY.wa))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playClickFx()}
                className="btn-wa"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="h-5 w-5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
              <InspireToggle className="sm:ml-3" />
            </motion.div>
          </motion.div>

          {/* The #1, price upfront. */}
          {best && (
            <motion.div
              className="hidden lg:col-span-4 lg:block"
              initial={reduced ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to={bestPath} onClick={() => playClickFx()} className="hero-best group block no-underline">
                <div className="relative h-44 overflow-hidden">
                  <img src={smallImage(best.image)} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="eager" />
                  <span className="absolute left-3 top-3 badge badge-amber">#1 · {t(locale, COPY.bestSeller)}</span>
                </div>
                <div className="flex items-end justify-between gap-4 p-5">
                  <div>
                    <p className="font-display text-2xl uppercase leading-none text-ink">{best.title}</p>
                    <p className="mt-2 text-sm font-medium text-ink-soft">
                      {bestDuration}
                      {ratingBadge && (
                        <span className="ml-2 inline-flex items-center gap-1 text-ink">
                          <FaStar className="h-3.5 w-3.5 text-mango" /> {ratingBadge.average.toFixed(2)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block font-condensed text-xs font-bold uppercase tracking-[0.18em] text-gold-dark">{t(locale, COPY.from)}</span>
                    <span className="font-display text-4xl leading-none text-ink">{best.price}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </div>

        {/* Which photograph. */}
        {media.length > 1 && (
          <div className="mt-10 flex gap-2" aria-hidden="true">
            {media.map((item, index) => (
              <button
                key={`dot-${index}`}
                type="button"
                tabIndex={-1}
                onClick={() => setSlide(index)}
                className={`h-1 overflow-hidden rounded-full bg-white/25 ${media.length > 6 ? 'w-6' : 'w-10'}`}
              >
                <span
                  className={`hero-progress block h-full origin-left bg-mango ${index === slide % media.length ? 'is-on' : ''}`}
                  style={{ animationDuration: `${Math.round((holdSeconds + TRANSITION_SECONDS) * 1000)}ms` }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The numbers, on a white strip across the foot of the photograph. */}
      <div className="relative z-10 pb-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:pb-0">
        <div className="section-shell">
          <div className="hero-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="hero-stat">
                <span className="font-display text-3xl leading-none text-ink sm:text-4xl">
                  {stat.value}
                  {'star' in stat && stat.star && <FaStar className="ml-1 inline h-5 w-5 -translate-y-1 text-mango" />}
                </span>
                <span className="mt-1.5 block font-condensed text-[0.72rem] font-bold uppercase tracking-[0.18em] text-ink-soft">{stat.label}</span>
              </div>
            ))}
            <a href="#top-tours" onClick={scrollOn} className="hero-stat hero-stat-cta no-underline">
              <span className="font-condensed text-sm font-bold uppercase tracking-[0.16em] text-ink">{t(locale, COPY.scroll)}</span>
              <HiArrowDown className="mt-1 h-5 w-5 animate-bounce text-mango-dark" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
