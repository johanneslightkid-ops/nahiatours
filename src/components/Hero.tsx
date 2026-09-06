import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { HiArrowDown, HiCheck, HiStar, HiShieldCheck } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useBrand } from '../contexts/BrandContext';
import {
  PalmTree,
  Toucan,
  Starfish,
  Splatter,
  Crosshair,
  Barcode,
  Arrow,
  WaveBand,
} from './ui/Illustrations';
import { playClickFx, playHoverFx } from '../lib/soundEngine';

interface HeroProps {
  backgroundImage: string;
  backgroundImageMobile?: string;
  backgroundVideo?: string;
}

/**
 * The hero is a flash sheet, not a beach.
 *
 * It used to be a drawn scene with a postcard pasted into it. It is now a
 * collage: a black radiant burning out of the top right, thrown ink, tattoo
 * linework in the margins, and one torn-out clipping of real footage taped
 * down at an angle. The clipping is near-monochrome until you reach for it —
 * hovering the frame brings the colour back, which is the whole design in
 * miniature: the thing you are about to act on is the thing that is alive.
 */
const Hero: React.FC<HeroProps> = ({ backgroundImage, backgroundImageMobile, backgroundVideo }) => {
  const { brandSettings } = useBrand();

  const desktopImage = backgroundImage || '/imgs/tours/tour_saona_island_detail_12.jpg';
  const mobileImage = backgroundImageMobile || desktopImage;

  const trustSignals = [
    { icon: <HiShieldCheck className="h-4 w-4" />, label: 'Licensed local crew' },
    { icon: <HiCheck className="h-4 w-4" />, label: 'Instant WhatsApp booking' },
    { icon: <HiCheck className="h-4 w-4" />, label: 'Hotel pick-up included' },
  ];

  return (
    <section className="relative isolate z-0 w-full overflow-hidden">
      {/* Collage furniture. All decorative, all behind the copy. */}
      <Splatter
        tone="blood"
        variant={2}
        className="pointer-events-none absolute -left-24 top-[-6rem] h-[30rem] w-[30rem] opacity-[0.10]"
      />
      <PalmTree className="pointer-events-none absolute -left-12 bottom-0 h-64 w-52 opacity-25 sm:h-80 sm:w-64 lg:h-[26rem] lg:w-80" />
      <Toucan className="animate-bob pointer-events-none absolute right-[38%] top-8 hidden h-24 w-28 opacity-90 xl:block" />
      <Starfish className="pointer-events-none absolute bottom-20 right-[6%] hidden h-14 w-14 rotate-12 opacity-80 lg:block" />

      {/* Hazard rule down the left edge — the margin of the printed sheet. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-2 opacity-40 lg:block"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #0C0C0D 0 8px, transparent 8px 16px)' }}
      />

      <div className="section-shell relative z-10 flex min-h-[calc(100vh-6rem)] items-center py-16 lg:py-24">
        <div className="grid w-full gap-12 lg:grid-cols-12 lg:items-center">
          {/* Headline column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            {/* Filing strip: where this is, stamped like a case number. */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="tp-slab">Saona · Catalina · Bávaro</span>
              <span className="tp-filenum">FILE 18.69°N / 68.41°W</span>
              <Barcode value="LDVIP-COAST" className="h-5 w-24 opacity-80" />
            </div>

            <div className="mb-3">
              <span className="hand-note">no filters. no resorts. no lines.</span>
            </div>

            <h1 className="mb-7 font-display text-[3.25rem] leading-[0.92] sm:text-7xl lg:text-[5.25rem]">
              <span className="marker-highlight">
                <FormattedMessage id="hero.title" values={{ brand: brandSettings.brandName }} />
              </span>
            </h1>

            {/* The lede sits behind a heavy red rule, the way a caption sits
                under a plate. */}
            <div className="relative mb-9 max-w-xl pl-5">
              <span className="absolute inset-y-0 left-0 w-[5px] bg-ink" />
              <span className="absolute left-0 top-0 h-10 w-[5px] bg-mango" />
              <p className="text-lg font-medium leading-relaxed text-ink-soft sm:text-xl">
                <FormattedMessage id="hero.subtitle" />
              </p>
            </div>

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

            {/* Guarantees, stamped rather than badged. */}
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {trustSignals.map((signal) => (
                <li
                  key={signal.label}
                  className="inline-flex items-center gap-2 border-b-2 border-ink pb-1 font-condensed text-xs uppercase tracking-[0.14em] text-ink"
                >
                  <span className="text-mango">{signal.icon}</span>
                  <span>{signal.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* The clipping: the one piece of real footage, torn out and taped
              down over the collage. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:col-span-5 lg:block"
          >
            <div className="group relative mx-auto max-w-md">
              {/* Tape, top-left and bottom-right. */}
              <span className="tp-tape -left-6 -top-4 z-20 -rotate-12" />
              <span className="tp-tape -bottom-4 -right-6 z-20 -rotate-12" />

              <div
                className="relative border-[3px] border-ink bg-ink p-3 shadow-[13px_13px_0_0_#0C0C0D,-6px_-6px_0_0_#C1121F]"
                style={{ transform: 'rotate(-2.5deg)' }}
              >
                <div className="relative overflow-hidden border-[3px] border-ink">
                  {backgroundVideo ? (
                    <video
                      className="photo-pop h-72 w-full object-cover"
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
                      className="photo-pop h-72 w-full object-cover"
                    />
                  )}
                  {/* Halftone screen over the clipping; it lifts as the frame
                      comes back to colour. */}
                  <span
                    className="pointer-events-none absolute inset-0 opacity-45 transition-opacity duration-500 group-hover:opacity-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 50% 50%, rgba(12,12,13,0.85) 1.2px, transparent 1.6px)',
                      backgroundSize: '5px 5px',
                    }}
                  />
                  <Crosshair className="pointer-events-none absolute bottom-2 right-2 h-7 w-7" />
                </div>

                <div className="mt-3 flex items-end justify-between gap-3 px-1">
                  <div>
                    <p className="font-accent text-xl leading-none text-mango-light">
                      Greetings from Bávaro
                    </p>
                    <p className="tp-filenum mt-1.5 text-paper/55">
                      Plate 01 · Saona VIP excursion
                    </p>
                  </div>
                  <div className="shrink-0 border-2 border-mango bg-mango px-3 py-1.5 text-center">
                    <span className="block font-display text-xl leading-none text-paper">4.99</span>
                    <span className="block font-condensed text-[0.6rem] uppercase tracking-[0.18em] text-paper/80">
                      rated
                    </span>
                  </div>
                </div>

                <Barcode value="SAONA-VIP" tone="bone" className="mt-3 h-6 w-full px-1 opacity-70" />
              </div>

              {/* Review, torn off and pinned to the corner. */}
              <div
                className="absolute -left-16 bottom-20 z-30 w-56 border-[3px] border-ink bg-paper p-4 shadow-ink"
                style={{ transform: 'rotate(3deg)' }}
              >
                <div className="mb-2 flex gap-0.5 text-mango">
                  {[...Array(5)].map((_, i) => (
                    <HiStar key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs font-semibold leading-snug text-ink">
                  “The most unforgettable day of our whole trip.”
                </p>
                <p className="tp-filenum mt-2">Sarah &amp; Michael · Miami</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile clipping: same torn-out plate, stacked under the copy. */}
      <div className="section-shell relative z-10 pb-12 lg:hidden">
        <div className="group relative mx-auto max-w-sm">
          <span className="tp-tape -left-3 -top-3 z-20 -rotate-12" />
          <div
            className="border-[3px] border-ink bg-ink p-2.5 shadow-[8px_8px_0_0_#0C0C0D,-4px_-4px_0_0_#C1121F]"
            style={{ transform: 'rotate(-1.5deg)' }}
          >
            <img
              src={mobileImage}
              alt=""
              aria-hidden="true"
              className="photo-pop h-48 w-full border-[3px] border-ink object-cover"
            />
            <p className="mt-2.5 text-center font-accent text-lg text-mango-light">
              Greetings from Bávaro
            </p>
          </div>
        </div>
      </div>

      {/* The scroll cue points, literally. */}
      <div className="relative z-10 flex justify-center pb-6">
        <a
          href="#adventure_preview"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
          className="group inline-flex items-center gap-3 border-b-[3px] border-ink pb-1.5 font-condensed text-xs uppercase tracking-[0.2em] text-ink transition hover:border-mango hover:text-mango"
        >
          <Arrow className="h-5 w-10 rotate-[68deg] transition-transform group-hover:translate-y-1" />
          <span>Explore the excursions</span>
          <HiArrowDown className="h-4 w-4 animate-bounce" />
        </a>
      </div>

      <WaveBand className="relative z-10 block h-12 w-full sm:h-16" />
    </section>
  );
};

export default Hero;
