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
import { GlidingBirds, PointerHummingbird } from './nature/Nature';
import { Hibiscus, PalmTree } from './ui/Illustrations';

interface HeroProps {
  backgroundImage: string;
  backgroundImageMobile?: string;
  backgroundVideo?: string;
}

/**
 * The first painting in the gallery.
 *
 * The island the way its painters see it: Bidó's ultramarine sky and great
 * yellow sun, the blue cordillera, a larimar sea, the sand, two royal palms
 * and a flamboyán in flower. All of it is flat colour and indigo line — no
 * photograph pretending to be a sky. The photographs are hung on it instead,
 * in frames, the way a gallery shows the real place beside the painted one.
 *
 * Motion is slow and cheap: the sun's crown turns, waves slide, palms lean,
 * birds cross; each is a transform on its own layer.
 */
const Hero: React.FC<HeroProps> = ({ backgroundImage, backgroundVideo }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const say = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);
  const reduced = useReducedMotion();
  const media: HeroMediaItem[] =
    brandSettings.heroMedia && brandSettings.heroMedia.length > 0
      ? brandSettings.heroMedia
      : [
          { url: backgroundImage, type: 'image', alt: 'Saona Island shore' },
          ...(backgroundVideo ? [{ url: backgroundVideo, type: 'video' as const, alt: 'Adventure in Punta Cana' }] : []),
        ];
  const showVideo = useDeferredVideo(media.some((item) => item.type === 'video'));
  const [ratingBadge, setRatingBadge] = useState<{ average: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const testimonials = await getPublishedTestimonials();
      if (!active) return;
      const range = brandSettings.heroRatingRange ?? { min: 3, max: 5 };
      const result = getRatingVisibility(testimonials, { enabled: brandSettings.heroRatingEnabled, min: range.min, max: range.max });
      setRatingBadge(result.visible ? { average: result.average ?? 0 } : null);
    })();
    return () => {
      active = false;
    };
  }, [brandSettings.heroRatingEnabled, brandSettings.heroRatingRange]);

  // Layers drift at different speeds as the painting scrolls away.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const sunY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 140]);
  const hillsY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 60]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);

  const image = backgroundImage || '/imgs/tours/tour_saona_island_detail_12.jpg';
  const frames = media.slice(0, 3);

  const renderMedia = (item: HeroMediaItem, className: string) =>
    item.type === 'video' && showVideo ? (
      <video className={className} src={item.url} autoPlay muted loop playsInline preload="metadata" poster={image} aria-label={item.alt || undefined} />
    ) : (
      <img src={item.type === 'video' ? image : item.url} alt={item.alt || ''} className={className} />
    );

  const trust = [
    { icon: <HiShieldCheck className="h-4 w-4 text-jungle" />, label: say({ en: 'Licensed local crew', es: 'Equipo local con licencia', de: 'Lizenziertes lokales Team', fr: 'Équipe locale agréée' }) },
    { icon: <HiCheck className="h-4 w-4 text-sky" />, label: say({ en: 'Book on WhatsApp in a minute', es: 'Reserva por WhatsApp en un minuto', de: 'In einer Minute per WhatsApp buchen', fr: 'Réservez sur WhatsApp en une minute' }) },
    { icon: <HiCheck className="h-4 w-4 text-hibiscus" />, label: say({ en: 'Hotel pick-up included', es: 'Recogida en el hotel', de: 'Abholung am Hotel inklusive', fr: 'Prise en charge à l’hôtel incluse' }) },
  ];

  return (
    <section ref={sectionRef} className="relative isolate z-0 w-full overflow-hidden border-b-[3px] border-ink">
      {/* Sky */}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#1A2F94_0%,#2F4FD1_34%,#6F8BEA_58%,#A9E4EE_70%)]" aria-hidden="true" />

      {/* The sun */}
      <motion.div style={{ y: sunY }} className="pointer-events-none absolute right-[8%] top-28 -z-10 h-44 w-44 sm:h-60 sm:w-60 lg:right-[14%] lg:top-44 lg:h-72 lg:w-72" aria-hidden="true">
        <div className="sol inset-0">
          <div className="sol-rays" />
        </div>
      </motion.div>

      <GlidingBirds className="-z-10" tone="text-paper/90" count={3} />
      <PointerHummingbird boundsRef={sectionRef} />

      {/* Cordillera, sea, sand */}
      <motion.svg style={{ y: hillsY }} className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[46%] w-full" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 150 C120 90 220 60 340 110 C430 148 500 70 620 60 C740 50 800 130 920 120 C1040 110 1110 40 1230 60 C1320 76 1390 110 1440 104 L1440 420 L0 420 Z" fill="#1A2F94" stroke="#1D2346" strokeWidth={4} />
        <path d="M0 190 C140 150 260 140 380 170 C500 200 600 140 740 150 C880 160 960 210 1100 190 C1220 172 1340 150 1440 160 L1440 420 L0 420 Z" fill="#4F9136" stroke="#1D2346" strokeWidth={4} />
        <path d="M0 236 C200 222 420 244 720 232 C1000 220 1240 244 1440 232 L1440 420 L0 420 Z" fill="#3FAFC9" stroke="#1D2346" strokeWidth={4} />
        <path d="M0 330 C220 318 460 340 720 328 C980 316 1220 340 1440 326 L1440 420 L0 420 Z" fill="#F0E2C8" stroke="#1D2346" strokeWidth={4} />
      </motion.svg>
      {/* Wave strokes, sliding along the sea. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[16%] -z-10 h-10 overflow-hidden" aria-hidden="true">
        <div className="h-full w-[200%] animate-drift">
          <svg className="h-full w-full" viewBox="0 0 2880 40" preserveAspectRatio="none">
            <path d="M0 20 C40 8 80 32 120 20 S200 8 240 20 S320 32 360 20 S440 8 480 20 S560 32 600 20 S680 8 720 20 S800 32 840 20 S920 8 960 20 S1040 32 1080 20 S1160 8 1200 20 S1280 32 1320 20 S1400 8 1440 20 S1520 32 1560 20 S1640 8 1680 20 S1760 32 1800 20 S1880 8 1920 20 S2000 32 2040 20 S2120 8 2160 20 S2240 32 2280 20 S2360 8 2400 20 S2480 32 2520 20 S2600 8 2640 20 S2720 32 2760 20 S2840 8 2880 20" stroke="#FFFBF3" strokeWidth={3} fill="none" strokeDasharray="60 40" />
          </svg>
        </div>
      </div>

      {/* Palms and a flamboyán, at the edges. */}
      <div className="pointer-events-none absolute -left-10 bottom-0 -z-10 h-[64%] w-48 origin-bottom animate-sway sm:w-64 lg:w-80" style={{ animationDuration: '9s' }} aria-hidden="true">
        <PalmTree className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute -right-16 bottom-0 -z-10 hidden h-[52%] w-64 origin-bottom -scale-x-100 md:block" aria-hidden="true">
        <div className="h-full w-full animate-sway" style={{ animationDuration: '11s', animationDelay: '-3s' }}>
          <PalmTree className="h-full w-full" />
        </div>
      </div>
      <svg className="pointer-events-none absolute bottom-[14%] left-[30%] -z-10 hidden h-40 w-56 lg:block" viewBox="0 0 220 160" aria-hidden="true">
        <path d="M106 160 C108 130 104 110 96 92 M110 120 C126 104 140 98 156 96" stroke="#1D2346" strokeWidth={6} fill="none" />
        <path d="M20 80 C10 40 60 10 110 20 C160 6 214 36 200 76 C190 100 150 104 120 96 C90 106 30 108 20 80 Z" fill="#E5482F" stroke="#1D2346" strokeWidth={4} />
        <path d="M40 70 C70 60 100 66 120 56 M130 44 C150 50 170 46 186 54" stroke="#FF9E8A" strokeWidth={5} fill="none" />
      </svg>

      <div className="section-shell relative z-20 flex min-h-[100svh] flex-col justify-center pb-40 pt-24 lg:pb-44 lg:pt-44">
        <div className="grid w-full gap-10 lg:grid-cols-12 lg:items-center">
          <motion.div style={{ y: copyY }} className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: -1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card relative p-6 sm:p-8"
            >
              <span className="artsy-brick-badge mb-4">
                ☀️ {say({ en: 'From El Cortecito beach, Bávaro', es: 'Desde la playa de El Cortecito, Bávaro', de: 'Vom Strand El Cortecito, Bávaro', fr: 'Depuis la plage d’El Cortecito, Bávaro' })}
              </span>
              <h1 className="font-display text-4xl leading-[1.02] text-ink sm:text-5xl xl:text-6xl">
                <FormattedMessage id="hero.title" values={{ brand: brandSettings.brandName }} />
              </h1>
              <p className="mt-4 max-w-xl text-base font-medium leading-7 text-ink-soft sm:text-lg">
                <FormattedMessage id="hero.subtitle" />
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/tours#top" onClick={() => playClickFx()} onMouseEnter={() => playHoverFx()} className="tropical-button">
                  <FormattedMessage id="hero.cta" />
                </Link>
                <Link to="/plan#top" onClick={() => playClickFx()} onMouseEnter={() => playHoverFx()} className="tropical-button-outline">
                  ✨ <FormattedMessage id="nav.plan" defaultMessage="Plan my day" />
                </Link>
                <Link to="/transport#top" onClick={() => playClickFx()} onMouseEnter={() => playHoverFx()} className="tropical-button-outline">
                  <FormattedMessage id="nav.transport" defaultMessage="Private Transport" />
                </Link>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink-soft">
                {trust.map((item) => (
                  <li key={item.label} className="inline-flex items-center gap-1.5">
                    {item.icon}
                    {item.label}
                  </li>
                ))}
              </ul>
              {ratingBadge && (
                <div className="absolute -right-4 -top-5 flex rotate-6 items-center gap-1 rounded-full border-[3px] border-ink bg-mango px-3 py-1.5 text-sm font-black text-ink shadow-ink-sm">
                  <FaStar className="h-4 w-4" /> {ratingBadge.average.toFixed(1)}
                </div>
              )}
              <Hibiscus className="pointer-events-none absolute -bottom-7 -left-6 h-16 w-16 rotate-12" />
            </motion.div>
          </motion.div>

          {/* The real place, hung beside the painting. */}
          <div className="relative lg:col-span-6">
            <div className="relative mx-auto h-[19rem] max-w-md sm:h-[24rem] lg:h-[30rem] lg:max-w-none">
              {frames[0] && (
                <motion.figure
                  initial={{ opacity: 0, y: 40, rotate: 3 }}
                  animate={{ opacity: 1, y: 0, rotate: 3 }}
                  transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="hero-media-window absolute right-2 top-0 h-[85%] w-[72%] sm:right-6 lg:right-10"
                >
                  {renderMedia(frames[0], 'h-full w-full object-cover photo-pop')}
                </motion.figure>
              )}
              {frames[1] && (
                <motion.figure
                  initial={{ opacity: 0, y: 40, rotate: -5 }}
                  animate={{ opacity: 1, y: 0, rotate: -5 }}
                  transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="hero-polaroid absolute bottom-0 left-0 h-[52%] w-[46%]"
                >
                  <div className="h-full w-full overflow-hidden">{renderMedia(frames[1], 'h-full w-full object-cover photo-pop')}</div>
                  <figcaption className="hero-polaroid-caption">{frames[1].alt || 'Punta Cana'}</figcaption>
                </motion.figure>
              )}
              {frames[2] && (
                <motion.figure
                  initial={{ opacity: 0, y: 40, rotate: 7 }}
                  animate={{ opacity: 1, y: 0, rotate: 7 }}
                  transition={{ duration: 1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="hero-polaroid absolute -bottom-6 right-0 hidden h-[40%] w-[34%] sm:block"
                >
                  <div className="h-full w-full overflow-hidden">{renderMedia(frames[2], 'h-full w-full object-cover photo-pop')}</div>
                  <figcaption className="hero-polaroid-caption">{frames[2].alt || ''}</figcaption>
                </motion.figure>
              )}
            </div>
          </div>
        </div>

        <a
          href="#highlights"
          onClick={(event) => {
            event.preventDefault();
            playClickFx();
            document.getElementById('highlights')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
          }}
          className="absolute bottom-8 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border-[3px] border-ink bg-paper-card px-4 py-2 text-sm font-extrabold text-ink no-underline shadow-ink-sm"
        >
          <HiArrowDown className="h-4 w-4 animate-bounce" />
          {say({ en: 'Walk into the gallery', es: 'Entra a la galería', de: 'Hinein in die Galerie', fr: 'Entrez dans la galerie' })}
        </a>
      </div>
    </section>
  );
};

export default Hero;
