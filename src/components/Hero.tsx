import React, { useEffect, useRef, useState } from 'react';
import { localeText } from '../lib/localeText';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import { HiArrowDown, HiCheck, HiShieldCheck } from 'react-icons/hi';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useDeferredVideo } from '../lib/useDeferredVideo';
import { useBrand } from '../contexts/BrandContext';
import { HeroMediaItem } from '../services/brandService';
import { useI18n } from '../contexts/I18nContext';
import { playClickFx, playHoverFx } from '../lib/soundEngine';
import { getPublishedTestimonials, getRatingVisibility } from '../services/testimonialService';
import LagoonWater from './water/LagoonWater';
import { GlidingBirds, LeafCanopy, PointerHummingbird } from './nature/Nature';
import { Hibiscus, MonsteraLeaf, Fern } from './ui/Illustrations';

interface HeroProps {
  backgroundImage: string;
  backgroundImageMobile?: string;
  backgroundVideo?: string;
}

/**
 * The beach at El Cortecito, from above.
 *
 * The whole hero is the shoreline: dry sand under the copy, the swash running
 * up and back, and the lagoon opening out beyond it — live WebGL water that
 * rings where you touch it and whose fish scatter when you reach in. The
 * vine of the navigation hangs over the top of it.
 *
 * On a wide screen the sand is on the left and the water on the right; on a
 * phone the beach is at the top and the lagoon below. Three hand-cut media
 * cards float on the water. They are deliberately present on phones too: the
 * collage is part of the welcome, not desktop-only decoration.
 */
const Hero: React.FC<HeroProps> = ({ backgroundImage, backgroundVideo }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const isEs = locale === 'es';
  const say = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);
  const reduced = useReducedMotion();
  const heroMedia = brandSettings.heroMedia?.length === 3
    ? brandSettings.heroMedia
    : [
        { url: backgroundVideo || '', type: 'video' as const, alt: 'Buggy adventure in Punta Cana' },
        { url: backgroundImage, type: 'image' as const, alt: 'Saona Island shore' },
        { url: backgroundImage, type: 'image' as const, alt: 'Caribbean moments' },
      ];
  const showVideo = useDeferredVideo(heroMedia.some((item) => item.type === 'video'));
  const [touched, setTouched] = useState(false);
  const [ratingBadge, setRatingBadge] = useState<{ average: number; visible: boolean } | null>(null);

  useEffect(() => {
    let active = true;

    const loadRating = async () => {
      const testimonials = await getPublishedTestimonials();
      if (!active) return;

      const range = brandSettings.heroRatingRange ?? { min: 3, max: 5 };
      const result = getRatingVisibility(testimonials, {
        enabled: brandSettings.heroRatingEnabled,
        min: range.min,
        max: range.max,
      });
      setRatingBadge(result.visible ? { average: result.average ?? 0, visible: true } : null);
    };

    void loadRating();
    return () => { active = false; };
  }, [brandSettings.heroRatingEnabled, brandSettings.heroRatingRange]);

  // The copy drifts up a little slower than the page, the sand stays put.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.8], [1, reduced ? 1 : 0.2]);
  const floatY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -160]);

  const image = backgroundImage || '/imgs/tours/tour_saona_island_detail_12.jpg';

  const renderMedia = (item: HeroMediaItem, className: string) =>
    item.type === 'video' && showVideo ? (
      <video
        className={className}
        src={item.url}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={image}
        aria-label={item.alt || undefined}
      />
    ) : (
      <img
        src={item.type === 'video' ? image : item.url}
        alt={item.alt || ''}
        className={className}
      />
    );

  const trustSignals = [
    { icon: <HiShieldCheck className="h-4 w-4 text-jungle" />, label: say({ en: 'Licensed local crew', es: 'Equipo local con licencia', de: 'Lizenziertes lokales Team', fr: 'Équipe locale agréée' }) },
    { icon: <HiCheck className="h-4 w-4 text-lagoon-dark" />, label: say({ en: 'Instant WhatsApp booking', es: 'Reserva al instante por WhatsApp', de: 'Sofort per WhatsApp buchen', fr: 'Réservation instantanée par WhatsApp' }) },
    { icon: <HiCheck className="h-4 w-4 text-mango-dark" />, label: say({ en: 'Hotel pick-up included', es: 'Recogida en el hotel', de: 'Abholung am Hotel inklusive', fr: 'Prise en charge à l’hôtel incluse' }) },
  ];

  return (
    <section
      ref={sectionRef}
      onPointerDown={() => setTouched(true)}
      className="relative isolate z-0 -mt-[5rem] w-full touch-pan-y overflow-hidden lg:-mt-[9rem]"
    >
      {/* What shows before the first frame of water, or if WebGL is missing. */}
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#F4E5C4_0%,#F4E5C4_55%,#93ECE1_60%,#17B5AC_85%,#0A7C76_100%)] lg:bg-[linear-gradient(105deg,#F4E5C4_0%,#F4E5C4_50%,#93ECE1_56%,#17B5AC_78%,#0A7C76_100%)]"
        aria-hidden="true"
      />
      <LagoonWater className="-z-10" pointerTarget={sectionRef} />

      <LeafCanopy variant="shore" className="z-10" />
      <GlidingBirds className="z-10" tone="text-ink/60" />
      <PointerHummingbird boundsRef={sectionRef} />

      <div className="section-shell relative z-20 flex min-h-[100svh] flex-col justify-center pb-24 pt-28 lg:pb-28 lg:pt-44">
        <div className="grid w-full gap-10 lg:grid-cols-12 lg:items-center">
          <motion.div style={{ y: copyY, opacity: copyOpacity }} className="lg:col-span-6 xl:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-leaf bg-paper-card/85 px-4 py-1.5 shadow-ink-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lagoon opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lagoon" />
                </span>
                <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-ink">
                  El Cortecito · Bávaro · Saona
                </span>
              </div>

              <div className="mb-2">
                <span className="hand-note">{say({ en: '¡Hola, traveller!', es: '¡Hola, viajero!', de: '¡Hola, Reisende!', fr: '¡Hola, voyageur !' })}</span>
              </div>

              <h1 className="mb-6 font-display text-[2.6rem] font-bold leading-[1.02] text-ink sm:text-6xl lg:text-[4.4rem]">
                <span className="marker-highlight">
                  <FormattedMessage id="hero.title" values={{ brand: brandSettings.brandName }} />
                </span>
              </h1>

              <p className="mb-9 max-w-xl text-lg font-medium leading-relaxed text-ink-soft sm:text-xl">
                <FormattedMessage id="hero.subtitle" />
              </p>

              <div className="mb-9 flex flex-col flex-wrap gap-3 sm:flex-row">
                <Link
                  to="/tours#top"
                  onClick={() => playClickFx()}
                  onMouseEnter={() => playHoverFx()}
                  className="tropical-button"
                >
                  <FormattedMessage id="hero.cta" />
                </Link>
                <Link
                  to="/plan#top"
                  onClick={() => playClickFx()}
                  onMouseEnter={() => playHoverFx()}
                  className="tropical-button-outline btn-lagoon"
                >
                  <FormattedMessage id="nav.plan" defaultMessage="Plan my day" />
                </Link>
                <Link
                  to="/transport#top"
                  onClick={() => playClickFx()}
                  onMouseEnter={() => playHoverFx()}
                  className="tropical-button-outline"
                >
                  <FormattedMessage id="nav.transport" defaultMessage="Private Transport" />
                </Link>
              </div>

              <ul className="flex flex-wrap items-center gap-2.5">
                {trustSignals.map((signal, i) => (
                  <li
                    key={signal.label}
                    className={`inline-flex items-center gap-2 bg-paper-card/90 px-3.5 py-1.5 text-xs font-bold text-ink shadow-ink-sm ${
                      i % 2 ? 'rounded-[18px_10px_18px_10px]' : 'rounded-[10px_18px_10px_18px]'
                    }`}
                  >
                    {signal.icon}
                    <span>{signal.label}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          {/* Out on the water: three imperfect little holiday keepsakes. */}
          <motion.div style={{ y: floatY }} className="hero-media-collage relative h-[22rem] sm:h-[27rem] lg:col-span-6 lg:h-[32rem] xl:col-span-6">
            <motion.div
              className="absolute right-4 top-2 z-30 hidden items-center gap-2 font-accent text-2xl text-white lg:flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: touched ? 0 : 1 }}
              transition={{ delay: touched ? 0 : 1.6, duration: 0.8 }}
              style={{ textShadow: '0 2px 12px rgba(6,50,61,0.5)' }}
            >
              <svg viewBox="0 0 60 40" className="h-8 w-12 -scale-x-100" aria-hidden="true">
                <path d="M4 30 C20 34 40 26 52 8 M52 8 L44 10 M52 8 L52 17" stroke="white" strokeWidth={2.4} fill="none" strokeLinecap="round" />
              </svg>
              {say({ en: 'touch the water', es: 'toca el agua', de: 'berühr das Wasser', fr: 'touchez l’eau' })}
            </motion.div>

            <motion.div
              className="absolute bottom-1 right-[3%] z-20 w-[70%] max-w-[22rem] sm:bottom-4 sm:right-[10%] lg:bottom-5 lg:right-8 lg:w-72 xl:w-80"
              initial={{ opacity: 0, y: 40, rotate: 6 }}
              animate={{ opacity: 1, y: 0, rotate: 3 }}
              transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="hero-polaroid animate-wave-sway-2 hero-polaroid-main">
                <div className="hero-media-window h-44 sm:h-52">
                  {renderMedia(heroMedia[0], 'h-full w-full object-cover photo-pop')}
                </div>
                <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3">
                  <p className="font-accent text-xl leading-none text-lagoon-dark sm:text-2xl">
                    {say({ en: 'Greetings from Bávaro', es: 'Saludos desde Bávaro', de: 'Grüße aus Bávaro', fr: 'Bons baisers de Bávaro' })}
                  </p>
                  {ratingBadge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-mango-light px-2.5 py-1.5 font-display text-[0.72rem] font-bold text-ink shadow-sm sm:text-sm">
                      <FaStar className="text-mango-dark" aria-hidden="true" />
                      {ratingBadge.average.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute left-[1%] top-4 z-10 w-[42%] max-w-[11rem] sm:left-[7%] sm:top-8 sm:max-w-[13rem] lg:left-5 lg:top-16 xl:left-10"
              initial={{ opacity: 0, y: 28, rotate: -14 }}
              animate={{ opacity: 1, y: 0, rotate: -8 }}
              transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="hero-polaroid hero-polaroid-small animate-wave-sway-4">
                <div className="hero-media-window h-28 sm:h-36 lg:h-40">
                  {renderMedia(heroMedia[1], 'h-full w-full object-cover photo-pop')}
                </div>
                <p className="hero-polaroid-caption">{say({ en: 'sun + salt', es: 'sol + sal', de: 'Sonne + Salz', fr: 'soleil + sel' })}</p>
              </div>
            </motion.div>

            <motion.div
              className="absolute right-[1%] top-12 z-10 w-[39%] max-w-[10.5rem] sm:right-[4%] sm:top-16 sm:max-w-[12.5rem] lg:right-0 lg:top-20"
              initial={{ opacity: 0, y: 28, rotate: 15 }}
              animate={{ opacity: 1, y: 0, rotate: 9 }}
              transition={{ duration: 0.9, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="hero-polaroid hero-polaroid-small animate-wave-sway-6">
                <div className="hero-media-window h-24 sm:h-32 lg:h-36">
                  {renderMedia(heroMedia[2], 'h-full w-full object-cover photo-pop')}
                </div>
                <p className="hero-polaroid-caption">{say({ en: 'a keepsake', es: 'un recuerdo', de: 'ein Andenken', fr: 'un souvenir' })}</p>
              </div>
            </motion.div>

            <div className="absolute left-[37%] top-[42%] z-30 sm:left-[42%] lg:left-16 lg:top-28" style={{ animation: 'swimBob 6s ease-in-out infinite' }}>
              <Hibiscus className="h-16 w-16 animate-spin-slow drop-shadow-[0_10px_8px_rgba(6,50,61,0.3)]" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Leaves at the foot of the beach, in front of everything. */}
      <div className="pointer-events-none absolute -bottom-10 -left-10 z-10 h-44 w-36 sm:h-72 sm:w-60" aria-hidden="true">
        <div className="h-full w-full rotate-[28deg]">
          <MonsteraLeaf className="leaf-sway-slow h-full w-full" />
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-6 left-28 z-20 hidden h-48 w-40 md:block" aria-hidden="true">
        <div className="h-full w-full -rotate-[12deg]">
          <Fern className="leaf-sway h-full w-full" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-14 z-30 flex justify-center">
        <a
          href="#adventure_preview"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
          className="inline-flex items-center gap-2 rounded-leaf bg-paper-card/90 px-5 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-ink no-underline shadow-ink"
        >
          <span>{say({ en: 'Explore the excursions', es: 'Explora las excursiones', de: 'Ausflüge entdecken', fr: 'Découvrir les excursions' })}</span>
          <HiArrowDown className="h-4 w-4 animate-bounce" />
        </a>
      </div>

      {/* The sand of the next band, rolling in over the water. */}
      <svg
        className="absolute inset-x-0 bottom-0 z-20 block h-12 w-full sm:h-16"
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 40 C150 10 300 70 480 44 C660 18 780 64 960 46 C1080 34 1140 40 1200 30 L1200 80 L0 80 Z" fill="#FBF5E8" />
        <path d="M0 40 C150 10 300 70 480 44 C660 18 780 64 960 46 C1080 34 1140 40 1200 30" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={3} fill="none" strokeDasharray="3 10" />
      </svg>
    </section>
  );
};

export default Hero;
