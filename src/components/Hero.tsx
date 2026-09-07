import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { HiArrowDown, HiCheck, HiStar, HiShieldCheck } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { useBrand } from '../contexts/BrandContext';
import { Toucan, Caustics, SunGlare, WaveBand } from './ui/Illustrations';
import { playClickFx, playHoverFx } from '../lib/soundEngine';

interface HeroProps {
  backgroundImage: string;
  backgroundImageMobile?: string;
  backgroundVideo?: string;
}

/**
 * The hero is a window onto the water.
 *
 * The old one pasted a postcard into a drawing. This one does the opposite:
 * the photography is the subject, held in a large soft-cornered frame with
 * light moving over it, and everything else — the headline, the promises, the
 * review — sits around it in clean air.
 *
 * Three things from the research are doing work here. The footage carries a
 * caustic layer, so the picture belongs to the same water the page is standing
 * in. The review is frosted glass pinned to the *bottom* edge, because a card
 * over a family's faces is the one thing that would break a family photograph.
 * And of everything on screen, only the booking button is warm.
 */
const Hero: React.FC<HeroProps> = ({ backgroundImage, backgroundImageMobile, backgroundVideo }) => {
  const { brandSettings } = useBrand();

  const desktopImage = backgroundImage || '/imgs/tours/tour_saona_island_detail_12.jpg';
  const mobileImage = backgroundImageMobile || desktopImage;

  const trustSignals = [
    { icon: <HiShieldCheck className="h-4 w-4 text-jungle" />, label: 'Licensed local crew' },
    { icon: <HiCheck className="h-4 w-4 text-lagoon-dark" />, label: 'Instant WhatsApp booking' },
    { icon: <HiCheck className="h-4 w-4 text-lagoon-dark" />, label: 'Hotel pick-up included' },
  ];

  return (
    <section className="relative isolate z-0 w-full overflow-hidden">
      {/* Sun coming in over the right shoulder, and a frond of shade on the
          left — the two things that tell you where the light is. */}
      <SunGlare className="-right-[10vw] -top-[16vw] h-[46vw] w-[46vw]" />

      {/* Copy has to stay readable wherever the horizon happens to fall on a
          given viewport, so the text column carries its own breath of haze. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[62%] lg:block"
        style={{
          background:
            'linear-gradient(100deg, rgba(255,251,245,0.92) 0%, rgba(255,251,245,0.72) 46%, rgba(255,251,245,0) 100%)',
        }}
      />

      <div className="section-shell relative z-10 grid min-h-[calc(100vh-5rem)] items-center gap-12 py-16 lg:grid-cols-12 lg:py-20">
        {/* Words */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6"
        >
          <span className="artsy-brick-badge mb-5">
            <span className="h-2 w-2 rounded-full bg-jungle" />
            Saona · Catalina · Bávaro Coast
          </span>

          <div className="mb-2">
            <span className="hand-note">¡Hola, traveller!</span>
          </div>

          <h1 className="mb-6 text-[3.4rem] leading-[1.02] text-ink sm:text-6xl lg:text-7xl">
            <span className="marker-highlight">
              <FormattedMessage id="hero.title" values={{ brand: brandSettings.brandName }} />
            </span>
          </h1>

          <p className="mb-9 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            <FormattedMessage id="hero.subtitle" />
          </p>

          <div className="mb-10 flex flex-col flex-wrap gap-3.5 sm:flex-row">
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
              className="tropical-button-outline"
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

          {/* The three promises that answer a parent's first three questions. */}
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {trustSignals.map((signal) => (
              <li
                key={signal.label}
                className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft"
              >
                {signal.icon}
                <span>{signal.label}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* The window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="relative lg:col-span-6"
        >
          <div className="group relative mx-auto max-w-xl">
            {/* A toucan perched on the top edge of the frame, rather than
                floating in the sky like a sticker. */}
            <Toucan className="animate-bob pointer-events-none absolute -left-8 -top-9 z-20 hidden h-16 w-20 drop-shadow-lg lg:block" />

            <div className="photo-frame animate-float relative aspect-[4/3]">
              {backgroundVideo ? (
                <video
                  className="photo-pop h-full w-full object-cover"
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
                  className="photo-pop h-full w-full object-cover"
                />
              )}

              {/* Light on the water, over the footage — it ties the picture to
                  the sea the whole page is standing in. */}
              <Caustics soft className="z-10" />

              {/* The rating, top-left, well clear of anyone's face. */}
              <div className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 shadow-md backdrop-blur">
                <HiStar className="h-4 w-4 fill-current text-sunset" />
                <span className="text-sm font-extrabold text-ink">4.99</span>
                <span className="text-xs font-semibold text-ink-soft">· 600+ guests</span>
              </div>

              {/* Caption on the scrim along the bottom. */}
              <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-6">
                <p className="font-accent text-2xl leading-none text-white drop-shadow-md">
                  Greetings from Bávaro
                </p>
                <p className="mt-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/85">
                  Saona VIP excursion
                </p>
              </div>
            </div>

            {/* The review, frosted, hung off the bottom-left corner — below the
                frame, so it can never sit over a face. */}
            <div className="hero-glass absolute -bottom-7 left-2 z-30 w-60 p-4 sm:-left-8 sm:w-64">
              <div className="mb-1.5 flex gap-0.5 text-sunset">
                {[...Array(5)].map((_, i) => (
                  <HiStar key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm font-semibold leading-snug text-ink">
                “The most unforgettable day of our whole trip.”
              </p>
              <p className="mt-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-ink-light">
                Sarah &amp; Michael · Miami
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile window: the same picture, full width. */}
      <div className="section-shell relative z-10 pb-12 lg:hidden">
        <div className="photo-frame group relative aspect-[4/3]">
          <img
            src={mobileImage}
            alt=""
            aria-hidden="true"
            className="photo-pop h-full w-full object-cover"
          />
          <Caustics soft className="z-10" />
          <p className="absolute inset-x-0 bottom-0 z-20 p-4 text-center font-accent text-xl text-white drop-shadow-md">
            Greetings from Bávaro
          </p>
        </div>
      </div>

      {/* Down to the water. */}
      <div className="relative z-10 flex justify-center pb-6">
        <a
          href="#adventure_preview"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
          className="group inline-flex items-center gap-2 rounded-full bg-white/85 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:text-lagoon-dark hover:shadow-md"
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
