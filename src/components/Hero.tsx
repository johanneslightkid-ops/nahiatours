import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { HiArrowDown, HiCheck, HiStar, HiShieldCheck } from 'react-icons/hi';
import { useBrand } from '../contexts/BrandContext';
import {
  Cloud,
  Birds,
  Catamaran,
  Island,
  Monstera,
  BananaLeaf,
  Hibiscus,
  WaveBand,
} from './ui/Illustrations';
import { useIsWide, usePrefersReducedMotion } from '../lib/useMediaQuery';
import { playClickFx, playHoverFx } from '../lib/soundEngine';

interface HeroProps {
  backgroundImage: string;
  backgroundImageMobile?: string;
  backgroundVideo?: string;
}

/**
 * Hold the drifting clouds until the hero is actually on screen.
 *
 * A CSS animation that has scrolled out of view is not free: the compositor
 * still ticks it. One observer for the whole scene, toggling
 * `animation-play-state` on a container, costs nothing and stops the sky
 * moving for someone who is three sections down reading prices.
 */
const useInView = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
};

/**
 * Defer the hero video until the page has finished the work that matters.
 *
 * The clip is around a megabyte. On a phone on hotel wifi that is the whole
 * first-impression budget spent on decoration, so it is never fetched below
 * the desktop breakpoint, never on a metered or slow connection, and even on a
 * fast desktop only once the main thread has gone idle.
 */
const useDeferredVideo = (hasVideo: boolean, isWide: boolean) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasVideo || !isWide) {
      setReady(false);
      return;
    }

    const connection = (navigator as never as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (connection?.saveData) return;
    if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return;

    const idle =
      (window as never as { requestIdleCallback?: (cb: () => void, o?: object) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const handle = idle(() => setReady(true), { timeout: 3000 });

    return () => {
      const cancel = (window as never as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (cancel) cancel(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, [hasVideo, isWide]);

  return ready;
};

/**
 * The hero is a composed painting, not a photograph with words on it.
 *
 * It reads in three planes, the way a landscape is built:
 *
 *   BACKGROUND  the site's own sky and sea, showing through from the fixed
 *               backdrop behind, with an island on the horizon;
 *   MIDGROUND   a catamaran on the water and birds crossing — small, so the
 *               eye reads them as far away;
 *   FOREGROUND  leaves pushing in from the edges at full size and full colour,
 *               which is what makes the rest of the picture recede.
 *
 * The one photograph on the page is pasted into that painting as a postcard,
 * so the real business reads as an object inside the illustration rather than
 * as the wallpaper behind it.
 */
const Hero: React.FC<HeroProps> = ({ backgroundImage, backgroundImageMobile, backgroundVideo }) => {
  const { brandSettings } = useBrand();
  const intl = useIntl();
  const isWide = useIsWide();
  const reduceMotion = usePrefersReducedMotion();
  const { ref: sceneRef, inView } = useInView<HTMLElement>();
  const videoReady = useDeferredVideo(Boolean(backgroundVideo), isWide);

  const desktopImage = backgroundImage || '/imgs/tours/tour_saona_island_detail_12.jpg';
  const mobileImage = backgroundImageMobile || desktopImage;
  const isEs = intl.locale === 'es';

  const drift = !reduceMotion && isWide && inView;

  const trustSignals = [
    {
      icon: <HiShieldCheck className="h-4 w-4 text-jungle-dark" />,
      label: isEs ? 'Equipo local con licencia' : 'Licensed local crew',
    },
    {
      icon: <HiCheck className="h-4 w-4 text-sea-deep" />,
      label: isEs ? 'Reserva por WhatsApp' : 'Booking by WhatsApp',
    },
    {
      icon: <HiCheck className="h-4 w-4 text-coral-deep" />,
      label: isEs ? 'Recogida en el hotel' : 'Hotel pick-up included',
    },
  ];

  return (
    <section ref={sceneRef as never} className="relative isolate z-0 w-full overflow-hidden">
      {/* ── MIDGROUND ──────────────────────────────────────────────────────
          Small, pale, high in the frame: distance. All of it is decorative and
          hidden on a phone, where the copy needs the room. */}
      <div
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{ animationPlayState: drift ? 'running' : 'paused' }}
        aria-hidden="true"
      >
        {/* Everything in this plane sits on or above the waterline, which the
            backdrop paints across the bottom third — so the island and the
            catamaran belong near the bottom of the frame, not floating in the
            sky behind the headline where they were. */}
        <Island className="absolute right-[3%] bottom-[13%] h-20 w-40 opacity-70 lg:h-24 lg:w-52" />
        <Catamaran className="animate-bob absolute left-[7%] bottom-[10%] h-20 w-20 opacity-90 lg:h-24 lg:w-24" />
        <Birds className="absolute left-[30%] top-[14%] h-7 w-20 opacity-35" />

        {/* The site's only ambient motion. Two clouds, transform-only, running
            on the compositor, paused the moment the hero leaves the screen and
            never started at all below `lg` or under reduced motion. */}
        {drift && (
          <>
            <Cloud
              className="absolute h-14 w-32 opacity-60"
              style={{ top: '8%', animation: 'cloudDrift 150s linear infinite' }}
            />
            <Cloud
              className="absolute h-10 w-24 opacity-40"
              style={{ top: '19%', animation: 'cloudDrift 230s linear infinite', animationDelay: '-90s' }}
            />
          </>
        )}
      </div>

      {/* ── FOREGROUND ─────────────────────────────────────────────────────
          Leaves at the frame edge, and only at the edge. This is the plane
          that gives the picture depth, so it stays on a phone — but it is also
          the plane most likely to end up on top of the copy, so each one is
          anchored to a corner, pulled well outside the container, and kept
          pale enough to read as the edge of the picture. */}
      <Monstera
        color="palm"
        className="pointer-events-none absolute -left-24 -bottom-10 h-44 w-44 opacity-40 sm:h-56 sm:w-56 lg:-left-20 lg:h-72 lg:w-72"
      />
      <BananaLeaf
        color="palmDeep"
        className="pointer-events-none absolute -right-24 -bottom-8 hidden h-56 w-56 opacity-25 lg:block"
        style={{ transform: 'scaleX(-1)' }}
      />
      <Hibiscus className="animate-sway pointer-events-none absolute -left-4 top-16 hidden h-12 w-12 opacity-60 xl:block" />

      <div className="section-shell relative z-10 flex min-h-[min(46rem,calc(100vh-5.5rem))] items-center py-10 lg:py-14">
        <div className="grid w-full gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
          {/* ── Copy ─────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <p className="hand-note mb-5">
              {isEs ? 'Saona · Catalina · Costa de Bávaro' : 'Saona · Catalina · Bávaro Coast'}
            </p>

            {/* No entrance animation on the headline. It is the largest element
                on the page and therefore almost certainly the LCP candidate —
                fading it in would push that metric out by the length of the
                animation for no gain the visitor can see. */}
            <h1 className="mb-6 font-display text-[2.6rem] leading-[1.05] text-ink sm:text-6xl lg:text-7xl">
              <span className="marker-highlight">
                <FormattedMessage id="hero.title" values={{ brand: brandSettings.brandName }} />
              </span>
            </h1>

            <p className="mb-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              <FormattedMessage id="hero.subtitle" />
            </p>

            <div className="mb-9 flex flex-col flex-wrap gap-3 sm:flex-row sm:gap-4">
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
                className="tropical-button btn-lagoon"
              >
                <FormattedMessage id="nav.plan" defaultMessage="Plan my day" />
              </Link>
              <Link
                to="/transport#top"
                onClick={() => playClickFx()}
                onMouseEnter={() => playHoverFx()}
                className="tropical-button-outline"
              >
                <FormattedMessage id="nav.transport" defaultMessage="Transfers" />
              </Link>
            </div>

            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
              {trustSignals.map((signal) => (
                <li
                  key={signal.label}
                  className="inline-flex items-center gap-2 text-[0.82rem] font-semibold text-ink-soft"
                >
                  {signal.icon}
                  <span>{signal.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── The postcard ─────────────────────────────────────────────── */}
          <div className="hidden lg:col-span-5 lg:block">
            <div className="relative mx-auto max-w-md" style={{ transform: 'rotate(-1.6deg)' }}>
              <div className="photo-mount">
                {videoReady && backgroundVideo ? (
                  <video
                    className="photo-mount-media photo-pop h-64 w-full object-cover"
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
                    width={640}
                    height={420}
                    // The hero image is the one asset worth fetching ahead of
                    // everything else, and decoding it off the main thread
                    // keeps the headline from waiting on it.
                    fetchPriority="high"
                    decoding="async"
                    className="photo-pop h-64 w-full object-cover"
                  />
                )}

                <div className="mt-4 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="journal-caption text-xl leading-tight text-ink">
                      {isEs ? 'Saludos desde Bávaro' : 'Greetings from Bávaro'}
                    </p>
                    <p className="mt-1 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-ink-light">
                      {isEs ? 'Excursión a Saona' : 'Saona excursion'}
                    </p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-ink/15 bg-paper-warm text-center">
                    <span className="font-display text-base font-semibold leading-none text-ink">4.99</span>
                  </div>
                </div>
              </div>

              {/* A guest note, stacked under the postcard rather than laid
                  across it — the previous placement put the card over a face
                  and over the caption. */}
              <div
                className="mx-auto mt-5 w-64 rounded-[14px_11px_16px_10px/11px_16px_10px_15px] border border-ink/10 bg-paper p-4 shadow-ink"
                style={{ transform: 'rotate(1.8deg)' }}
              >
                <div className="mb-1.5 flex gap-0.5 text-sun">
                  {[...Array(5)].map((_, i) => (
                    <HiStar key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="journal-caption text-[0.9rem] leading-snug text-ink">
                  “The most unforgettable day of our whole trip.”
                </p>
                <p className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink-light">
                  Sarah &amp; Michael · Miami
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The postcard again on a phone, under the copy rather than beside it.
          One image, one size — a phone never fetches the desktop crop. */}
      <div className="section-shell relative z-10 pb-10 lg:hidden">
        <div className="photo-mount mx-auto max-w-sm" style={{ transform: 'rotate(-1deg)' }}>
          <img
            src={mobileImage}
            alt=""
            aria-hidden="true"
            width={560}
            height={300}
            fetchPriority="high"
            decoding="async"
            className="photo-pop h-44 w-full object-cover"
          />
          <p className="journal-caption mt-3 text-center text-lg text-ink">
            {isEs ? 'Saludos desde Bávaro' : 'Greetings from Bávaro'}
          </p>
        </div>
      </div>

      <div className="relative z-10 flex justify-center pb-6">
        <a
          href="#adventure_preview"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper/80 px-5 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink-soft transition hover:border-sea hover:text-ink"
        >
          <span>{isEs ? 'Ver las excursiones' : 'Explore the excursions'}</span>
          <HiArrowDown className="h-3.5 w-3.5" />
        </a>
      </div>

      <WaveBand className="relative z-10 block h-16 w-full sm:h-24" />
    </section>
  );
};

export default Hero;
