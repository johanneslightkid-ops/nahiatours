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
 *
 * It is also a full-viewport layer fixed behind every page, and that is what
 * decides what is allowed to move in here. Anything animating inside it keeps
 * the whole layer dirty, so the browser re-rasterises a screenful of sky and
 * sea every frame. Measured on a throttled desktop, the scene costs 60fps
 * when it is still and 34fps the moment any single part of it moves — and it
 * made no difference which part. The sun turning once every ninety seconds
 * and the clouds crossing over three minutes are, between them, most of the
 * page's frame budget, for motion nobody watching the page can actually see.
 *
 * So the scene is held still, exactly as this file's first line claims it is.
 * The one thing that still moves is the light on the water, which is the
 * signature and which — with no filter and no blend mode on it — is free.
 *
 * The sun, clouds, birds and the second palm are still rationed by screen
 * size on top of that: a phone has no room to show them properly.
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

    {/* The sun, high and to the right. */}
    <SunBurst className="absolute -right-[16vw] -top-[22vw] h-[62vw] w-[62vw] opacity-70 lg:-right-[8vw] lg:-top-[16vw] lg:h-[46vw] lg:w-[46vw]" />

    {/* Trade-wind cloud, and a second one further down the sky. */}
    <div className="absolute left-[8%] hidden lg:block" style={{ top: '9%' }}>
      <Cloud className="h-16 w-28 opacity-80 sm:h-20 sm:w-36" />
    </div>
    <div className="absolute left-[62%] hidden lg:block" style={{ top: '22%' }}>
      <Cloud className="h-11 w-20 opacity-60 sm:h-14 sm:w-24" />
    </div>

    <Birds className="absolute left-[18%] top-[16%] hidden h-8 w-28 opacity-45 lg:block" />

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
          squiggle. `caustics-scene` marks it as the copy that lives in the
          fixed layer, which decides where it is allowed to drift; see
          `globals.css`. */}
      <span className="caustics caustics-scene" />

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

    {/* Palms leaning in from the corners. */}
    <div
      className="absolute -left-24 bottom-[-12%] h-80 w-80 sm:h-[26rem] sm:w-[26rem]"
      style={{ transform: 'rotate(24deg)' }}
    >
      <PalmFrond color="dark" className="h-full w-full opacity-25" />
    </div>
    <div
      className="absolute -right-28 bottom-[-16%] hidden h-80 w-80 lg:block"
      style={{ transform: 'rotate(-30deg) scaleX(-1)' }}
    >
      <PalmFrond color="palm" className="h-full w-full opacity-20" />
    </div>
  </div>
);

export default IllustratedBackdrop;
