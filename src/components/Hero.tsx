import React from 'react';
import { useMediaQuery } from '../lib/useMediaQuery';
import { AdinkraStamp, Barcode, CojueloMask, GagaDrum, StencilPalm } from './ui/CarnivalMarks';
import { useDeferredVideo } from '../lib/useDeferredVideo';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { HiArrowDown, HiCheck, HiStar, HiShieldCheck } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useBrand } from '../contexts/BrandContext';
import { Starfish, WaveBand } from './ui/Illustrations';
import { playClickFx, playHoverFx } from '../lib/soundEngine';

interface HeroProps {
  backgroundImage: string;
  backgroundImageMobile?: string;
  backgroundVideo?: string;
}

/**
 * The hero is a drawn beach scene, not a photograph.
 *
 * The dark full-bleed video wall this replaces put a real photo behind every
 * word. Now the page's own sky shows through, the drawings sit in the margins,
 * and the one piece of real footage is pasted into the scene as a postcard —
 * so the photography reads as an object inside the illustration rather than as
 * the background of the site.
 */
const Hero: React.FC<HeroProps> = ({ backgroundImage, backgroundImageMobile, backgroundVideo }) => {
  /* The footage plays on every screen, phones included. It is mounted once
     the browser is idle rather than in the first pass, so a megabyte of
     decoration never queues ahead of the stylesheet — and the poster it
     replaces is its own first frame, so the swap is invisible. */
  const showVideo = useDeferredVideo(Boolean(backgroundVideo));
  /* Which of the two hero windows is actually on screen. `hidden lg:block`
     and `lg:hidden` take care of what is SEEN; this takes care of what is
     FETCHED, which CSS cannot. */
  const isWideHero = useMediaQuery('(min-width: 1024px)');
  const { brandSettings } = useBrand();

  const desktopImage = backgroundImage || '/imgs/tours/tour_saona_island_detail_12.jpg';
  const mobileImage = backgroundImageMobile || desktopImage;

  const trustSignals = [
    { icon: <HiShieldCheck className="h-5 w-5 text-jungle-dark" />, label: 'Licensed local crew' },
    { icon: <HiCheck className="h-5 w-5 text-mango-dark" />, label: 'Instant WhatsApp booking' },
    { icon: <HiCheck className="h-5 w-5 text-lagoon-dark" />, label: 'Hotel pick-up included' },
  ];

  return (
    <section className="relative isolate z-0 w-full overflow-hidden">
      {/* Scenery. Everything here is decorative and sits behind the copy. */}
      {/* Cut, not drawn — five strokes and a trunk, in the land green. */}
      <StencilPalm className="pointer-events-none absolute -left-12 bottom-0 h-64 w-48 text-jungle-dark/30 sm:h-72 sm:w-52 lg:h-[22rem] lg:w-64" />
      {/* The Diablo Cojuelo, pinned up where the toucan used to float. A
          carnival mask is the one image that carries both halves of this
          brief — Afro-Latin and Caribbean — in a single silhouette. */}
      <CojueloMask className="lift-corner pointer-events-none absolute right-[38%] top-4 hidden h-24 w-24 text-ink/90 xl:block" />
      <Starfish className="pointer-events-none absolute bottom-16 right-[8%] hidden h-16 w-16 rotate-12 lg:block" />
      {/* The gagá drum, beating. Scale only, so it costs a composite. */}
      <GagaDrum className="beat-drum pointer-events-none absolute left-[42%] top-8 hidden h-20 w-16 text-mango xl:block" />

      <div className="section-shell relative z-10 flex min-h-[calc(100vh-6rem)] items-center py-16 lg:py-24">
        <div className="grid w-full gap-12 lg:grid-cols-12 lg:items-center">
          {/* Headline column */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            {/* A stamped docket rather than a pill — this design has no
                rounded shapes, and the typewriter face is the paperwork
                layer that makes a collage read as found. */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="stamp-box stamp-box--red">
                <AdinkraStamp className="h-3.5 w-3.5" />
                <span className="stamp !text-[0.66rem] !text-mango">
                  Saona · Catalina · Bávaro
                </span>
              </span>
              <span className="stamp hidden sm:inline">18°41&apos;N / 68°26&apos;W</span>
              <Barcode className="hidden h-5 w-16 text-ink/70 sm:block" />
            </div>

            <div className="mb-2">
              <span className="hand-note text-mango">¡Hola, traveller!</span>
            </div>

            <h1 className="mb-6 font-display text-5xl uppercase leading-[0.94] tracking-[-0.01em] text-ink sm:text-6xl lg:text-[5.2rem]">
              <span className="marker-highlight">
                <FormattedMessage id="hero.title" values={{ brand: brandSettings.brandName }} />
              </span>
            </h1>

            <p className="mb-9 max-w-xl text-lg font-semibold leading-relaxed text-ink-soft sm:text-xl">
              <FormattedMessage id="hero.subtitle" />
            </p>

            <div className="mb-10 flex flex-col flex-wrap gap-4 sm:flex-row">
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

            <ul className="flex flex-wrap items-center gap-3">
              {trustSignals.map((signal) => (
                <li
                  key={signal.label}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-3.5 py-1.5 text-xs font-extrabold text-ink shadow-ink-sm"
                >
                  {signal.icon}
                  <span>{signal.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Postcard column: the one photographic element, framed like a
              souvenir someone stuck onto the page. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:col-span-5 lg:block"
          >
            <div className="relative mx-auto max-w-md -rotate-2">
              <div className="rounded-[28px] border-[3px] border-ink bg-paper p-4 shadow-ink-xl">
                <div className="overflow-hidden rounded-[18px] border-[3px] border-ink">
                  {backgroundVideo && showVideo && isWideHero ? (
                    <video
                      className="h-64 w-full object-cover photo-pop"
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
                      className="h-64 w-full object-cover photo-pop"
                    />
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-accent text-2xl leading-none text-mango-dark">
                      Greetings from Bávaro
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
                      Saona VIP excursion
                    </p>
                  </div>
                  <div className="grid h-14 w-14 shrink-0 rotate-6 place-items-center rounded-full border-[3px] border-ink bg-mango text-center shadow-ink-sm">
                    <span className="font-display text-lg font-extrabold leading-none text-ink">
                      4.99
                    </span>
                  </div>
                </div>
              </div>

              {/* Review sticker, pinned to the corner of the postcard. */}
              <div className="absolute -left-14 bottom-24 w-56 rotate-3 rounded-2xl border-[3px] border-ink bg-hibiscus-light p-4 shadow-ink">
                <div className="mb-1.5 flex gap-0.5 text-ink">
                  {[...Array(5)].map((_, i) => (
                    <HiStar key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs font-bold leading-snug text-ink">
                  “The most unforgettable day of our whole trip.”
                </p>
                <p className="mt-1.5 text-[0.68rem] font-extrabold uppercase tracking-wider text-ink-soft">
                  Sarah &amp; Michael · Miami
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile postcard: same souvenir, stacked under the copy. */}
      <div className="section-shell relative z-10 pb-12 lg:hidden">
        <div className="mx-auto max-w-sm -rotate-1 rounded-[24px] border-[3px] border-ink bg-paper p-3 shadow-ink-lg">
          {backgroundVideo && showVideo && !isWideHero ? (
            <video
              className="h-44 w-full rounded-[14px] border-[3px] border-ink object-cover photo-pop"
              src={backgroundVideo}
              autoPlay
              muted
              loop
              playsInline
              poster={mobileImage}
              aria-hidden="true"
            />
          ) : (
            <img
              src={mobileImage}
              alt=""
              aria-hidden="true"
              decoding="async"
              className="h-44 w-full rounded-[14px] border-[3px] border-ink object-cover photo-pop"
            />
          )}
          <p className="mt-3 text-center font-accent text-xl text-mango-dark">
            Greetings from Bávaro
          </p>
        </div>
      </div>

      {/* Scroll cue, then the drawn shoreline into the next band. */}
      <div className="relative z-10 flex justify-center pb-4">
        <a
          href="#adventure_preview"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
          className="inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-paper px-5 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-ink shadow-ink-sm transition hover:bg-mango-light"
        >
          <span>Explore the excursions</span>
          <HiArrowDown className="h-4 w-4 animate-bounce" />
        </a>
      </div>

      <WaveBand className="relative z-10 block h-16 w-full sm:h-24" />
    </section>
  );
};

export default Hero;
