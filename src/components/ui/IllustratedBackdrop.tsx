import React from 'react';
import { SunBurst, Cloud, PalmFrond, Birds } from './Illustrations';

/**
 * The place the whole site stands in.
 *
 * This is the over-under, held still behind every page: sky and haze at the
 * top, a horizon, then shallow water running down to the foot of the
 * viewport with light moving across it. Content bands are opaque, so the
 * scene reads through the hero, through the gaps the waterlines leave
 * between sections, and down the page margins.
 *
 * Everything is CSS and inline SVG — no images, no canvas, no GL context.
 * The one moving part is the caustic layer, which is two repeating gradients
 * sliding against each other, so it costs a composite and nothing else.
 */
const IllustratedBackdrop: React.FC = () => (
  <div
    className="pointer-events-none fixed inset-0 select-none overflow-hidden"
    style={{ zIndex: -1 }}
    aria-hidden="true"
  >
    {/* Sky: zenith blue, dropping to haze, then to the glare that sits on
        every horizon over water. */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg, #7FD3F7 0%, #A5DFF9 22%, #D6F1FF 44%, #F2FBFF 56%, #FFFBF5 64%, #FFFBF5 100%)',
      }}
    />

    {/* The sun, high and to the right, turning once every 90 seconds. */}
    <SunBurst
      spin
      className="absolute -right-[16vw] -top-[22vw] h-[62vw] w-[62vw] opacity-70 sm:-right-[8vw] sm:-top-[16vw] sm:h-[46vw] sm:w-[46vw]"
    />

    {/* Trade-wind cloud, crossing on its own clock. */}
    <div
      className="absolute"
      style={{ top: '9%', animation: 'cloudDrift 150s linear infinite' }}
    >
      <Cloud className="h-16 w-28 opacity-80 sm:h-20 sm:w-36" />
    </div>
    <div
      className="absolute"
      style={{ top: '22%', animation: 'cloudDrift 220s linear infinite', animationDelay: '-80s' }}
    >
      <Cloud className="h-11 w-20 opacity-60 sm:h-14 sm:w-24" />
    </div>

    <Birds
      className="absolute left-[18%] top-[16%] h-8 w-28 opacity-45"
      style={{ animation: 'cloudDrift 300s linear infinite' }}
    />

    {/* The sea. Three bands of depth — shallow over sand, then the drop-off,
        then deep water — with a hard bright line where it meets the sky. */}
    <div className="absolute inset-x-0 bottom-0 h-[32vh]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #BFEFEA 0%, #6FD9DC 26%, #21B4C4 58%, #0A7C93 100%)',
        }}
      />

      {/* Light on the surface. This is the signature — Hockney's white
          squiggle, built from two gradients drifting at different rates. */}
      <span className="caustics" />

      {/* Glare sitting on the water directly under the sun. */}
      <div
        className="absolute -top-6 right-[6%] h-40 w-[52vw] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 32%, transparent 68%)',
        }}
      />

      {/* Foam along the horizon: unpainted white, the brightest thing here. */}
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
    </div>

    {/* Palms leaning in from the corners. The lean lives on the wrapper so
        the wind animation on the frond itself owns `transform` outright. */}
    <div
      className="absolute -left-24 bottom-[-12%] h-80 w-80 sm:h-[26rem] sm:w-[26rem]"
      style={{ transform: 'rotate(24deg)' }}
    >
      <PalmFrond color="dark" className="animate-frond h-full w-full opacity-25" />
    </div>
    <div
      className="absolute -right-28 bottom-[-16%] hidden h-80 w-80 lg:block"
      style={{ transform: 'rotate(-30deg) scaleX(-1)' }}
    >
      <PalmFrond
        color="palm"
        className="animate-frond h-full w-full opacity-20"
        style={{ animationDelay: '-4s' }}
      />
    </div>
  </div>
);

export default IllustratedBackdrop;
