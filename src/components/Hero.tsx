import React, { Suspense, lazy, useRef } from 'react';
import { useRichDisplay } from '../lib/useMediaQuery';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { HiArrowDown, HiCheck, HiStar, HiShieldCheck } from 'react-icons/hi';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useBrand } from '../contexts/BrandContext';
import {
  PalmTree,
  Parrot,
  Butterfly,
  Starfish,
  Conch,
  Hibiscus,
  WaveBand,
  TainoBand,
} from './ui/Illustrations';
import { useMotionBudget } from '../lib/useMotionBudget';
import { playClickFx, playHoverFx } from '../lib/soundEngine';

/**
 * The hero is a painting in three planes.
 *
 *   FAR    the water, which is the only thing on the site rendered in WebGL.
 *   MIDDLE the headline and the framed photograph, which is pasted into the
 *          scene like a souvenir rather than used as wallpaper behind it.
 *   NEAR   the foliage and the creatures, leaning in from the edges.
 *
 * PARALLAX is what separates them, and it is scroll-linked rather than timed:
 * the three planes move at different rates as the page scrolls, so the scene
 * has depth when you move through it and is perfectly still when you stop.
 * Each plane is driven by a framer-motion `useTransform` writing to
 * `translateY` only — no layout, no paint, one composited layer each.
 *
 * NONE OF IT RUNS ON A PHONE. useMotionBudget() returns 'reduced' there, which
 * turns off the parallax, drops the WebGL canvas entirely and leaves the
 * painting still. That is the intended mobile design, not a fallback: the
 * scene reads at rest, and a phone should spend its frame budget on scrolling.
 */

// Split out of the main bundle: the shader only ever loads for the visitors
// who are actually going to see it.
const SeaCanvas = lazy(() => import('./ui/SeaCanvas'));

interface HeroProps {
  backgroundImage: string;
  backgroundImageMobile?: string;
  backgroundVideo?: string;
}

const Hero: React.FC<HeroProps> = ({ backgroundImage, backgroundImageMobile, backgroundVideo }) => {
  const richDisplay = useRichDisplay();
  const { brandSettings } = useBrand();
  const budget = useMotionBudget();
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);

  const parallax = budget === 'full' && !reduced;

  // 0 at the top of the hero, 1 once it has scrolled fully past.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Far moves least, near moves most — which is the whole trick.
  const farY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const midY = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);
  const nearY = useTransform(scrollYProgress, [0, 1], ['0%', '-26%']);
  const nearYSlow = useTransform(scrollYProgress, [0, 1], ['0%', '-16%']);

  const desktopImage = backgroundImage || '/imgs/tours/tour_saona_island_detail_12.jpg';
  const mobileImage = backgroundImageMobile || desktopImage;

  const trustSignals = [
    { icon: <HiShieldCheck className="h-4 w-4 text-palm-dark" />, label: 'Licensed local crew' },
    { icon: <HiCheck className="h-4 w-4 text-mango-dark" />, label: 'Instant WhatsApp booking' },
    { icon: <HiCheck className="h-4 w-4 text-lagoon-dark" />, label: 'Hotel pick-up included' },
  ];

  return (
    <section ref={sectionRef} className="relative isolate z-0 w-full overflow-hidden">
      {/* ── FAR PLANE ────────────────────────────────────────────────────── */}
      <motion.div
        aria-hidden
        style={parallax ? { y: farY } : undefined}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] lg:h-[48%]"
      >
        {parallax && (
          <Suspense fallback={null}>
            <SeaCanvas className="absolute inset-0 h-full w-full opacity-80" />
          </Suspense>
        )}
        {/* The painted sea, always there — under the shader when it runs, and
            the whole of it when it does not. */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(180deg, rgba(31,98,133,0) 0%, rgba(31,98,133,0.26) 18%, rgba(47,182,164,0.28) 48%, rgba(143,220,208,0.2) 76%, rgba(242,230,205,0) 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/3"
          style={{
            background: 'linear-gradient(180deg, rgba(242,230,205,0) 0%, #F2E6CD 92%)',
          }}
        />
      </motion.div>

      {/* ── NEAR PLANE: foliage and creatures ────────────────────────────── */}
      <motion.div
        aria-hidden
        style={parallax ? { y: nearY } : undefined}
        className="pointer-events-none absolute inset-0"
      >
        <PalmTree className="absolute -left-16 bottom-0 h-72 w-56 opacity-95 sm:-left-12 sm:h-96 sm:w-72 lg:h-[32rem] lg:w-[24rem]" />
        <Starfish className="absolute bottom-20 right-[7%] hidden h-20 w-20 rotate-12 lg:block" />
        <Conch className="absolute bottom-10 left-[38%] hidden h-16 w-16 -rotate-6 opacity-90 xl:block" />
      </motion.div>

      <motion.div
        aria-hidden
        style={parallax ? { y: nearYSlow } : undefined}
        className="pointer-events-none absolute inset-0"
      >
        {/* The butterfly is the one thing in the hero that loops. It is a
            single small element, desktop-only, and it is the piece the brief
            asked for by name. */}
        <Butterfly className="animate-flutter-soft absolute left-[45%] top-16 hidden h-24 w-24 lg:block" />
        <Parrot className="absolute right-[6%] top-10 hidden h-32 w-28 xl:block" />
        <Hibiscus className="absolute left-[30%] top-[62%] hidden h-14 w-14 opacity-90 xl:block" />
      </motion.div>

      {/* ── MIDDLE PLANE: the content ────────────────────────────────────── */}
      <motion.div
        style={parallax ? { y: midY } : undefined}
        className="section-shell relative z-10 flex min-h-[calc(100vh-6rem)] items-center py-20 lg:py-28"
      >
        <div className="grid w-full gap-14 lg:grid-cols-12 lg:items-center lg:gap-16">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="lg:col-span-7"
          >
            <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[rgba(150,112,31,0.4)] bg-canvas-lift/80 px-4 py-1.5 shadow-oil-sm">
              <span className="h-2 w-2 rounded-full bg-palm" />
              <span className="text-[0.66rem] font-bold uppercase tracking-[0.24em] text-ink-soft">
                Saona · Catalina · Costa de Bávaro
              </span>
            </div>

            <p className="hand-note mb-2 text-xl">¡Hola, viajero!</p>

            <h1 className="mb-7 font-display text-[2.9rem] font-bold leading-[1.02] text-ink sm:text-6xl lg:text-[4.4rem]">
              <span className="marker-highlight">
                <FormattedMessage id="hero.title" values={{ brand: brandSettings.brandName }} />
              </span>
            </h1>

            <p className="mb-10 max-w-measure text-lg leading-relaxed text-ink-soft">
              <FormattedMessage id="hero.subtitle" />
            </p>

            <div className="mb-11 flex flex-col flex-wrap gap-4 sm:flex-row">
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
                className="btn-lagoon"
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
              {trustSignals.map((signal) => (
                <li
                  key={signal.label}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(150,112,31,0.32)] bg-canvas-lift/75 px-3.5 py-1.5 text-xs font-semibold text-ink-soft"
                >
                  {signal.icon}
                  <span>{signal.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* The one photographic element, framed as a souvenir. */}
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
            className="hidden lg:col-span-5 lg:block"
          >
            <div className="relative mx-auto max-w-md -rotate-2">
              <div className="rounded-[30px_22px_28px_24px] border border-[rgba(150,112,31,0.45)] bg-canvas-lift p-4 shadow-oil-lg">
                <div className="story-media-frame">
                  {backgroundVideo && richDisplay ? (
                    <video
                      className="photo-pop h-64 w-full object-cover"
                      src={backgroundVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster={desktopImage}
                      aria-hidden="true"
                    />
                  ) : (
                    <img
                      src={desktopImage}
                      alt=""
                      aria-hidden="true"
                      className="photo-pop h-64 w-full object-cover"
                    />
                  )}
                </div>

                <TainoBand className="mt-3 h-5 w-full opacity-60" />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl italic leading-none text-ochre-dark">
                      Saludos desde Bávaro
                    </p>
                    <p className="mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-light">
                      Excursión Saona VIP
                    </p>
                  </div>
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[rgba(150,112,31,0.5)] bg-gradient-to-br from-mango-light to-ochre shadow-oil-sm">
                    <span className="font-display text-lg font-bold leading-none text-ink">4.99</span>
                  </div>
                </div>
              </div>

              {/* A review, pinned below the corner of the souvenir — clear of
                  the caption, which it used to sit straight on top of. */}
              <div className="absolute -bottom-24 -left-16 w-56 rotate-3 rounded-[22px_16px_20px_18px] border border-[rgba(150,112,31,0.4)] bg-gradient-to-br from-canvas-lift to-hibiscus-light/50 p-4 shadow-oil">
                <div className="mb-1.5 flex gap-0.5 text-mango-dark">
                  {[...Array(5)].map((_, i) => (
                    <HiStar key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs font-semibold leading-snug text-ink">
                  “The most unforgettable day of our whole trip.”
                </p>
                <p className="mt-1.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink-light">
                  Sarah &amp; Michael · Miami
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Mobile souvenir: same object, stacked under the copy. */}
      <div className="section-shell relative z-10 pb-14 lg:hidden">
        <div className="mx-auto max-w-sm -rotate-1 rounded-[26px_18px_24px_20px] border border-[rgba(150,112,31,0.4)] bg-canvas-lift p-3 shadow-oil">
          <img
            src={mobileImage}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="photo-pop h-44 w-full rounded-[18px] object-cover"
          />
          <p className="mt-3 text-center font-display text-xl italic text-ochre-dark">
            Saludos desde Bávaro
          </p>
        </div>
      </div>

      <div className="relative z-10 flex justify-center pb-6">
        <a
          href="#adventure_preview"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
          className="tropical-button-outline text-[0.7rem] uppercase tracking-[0.2em]"
        >
          <span>Explore the excursions</span>
          <HiArrowDown className="h-4 w-4" />
        </a>
      </div>

      <WaveBand className="relative z-10 block h-20 w-full sm:h-28" />
    </section>
  );
};

export default Hero;
