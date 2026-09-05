import React from 'react';
import { SunBurst, Cloud, PalmFrond, Birds } from './Illustrations';

/**
 * The drawn scene behind the whole site.
 *
 * This replaces the WebGL ocean shader that used to sit here. That shader
 * simulated real water — exactly the photographic register this redesign moves
 * away from — and cost a GL context on every page. What is left is a flat
 * painted sky: a gradient, a sun, drifting paper clouds, a sea drawn as three
 * stacked crests, and palm fronds leaning in from the edges. All of it is CSS
 * and inline SVG, so it costs nothing to run and scales to any viewport.
 *
 * Content sections above are opaque, so the scene reads through the hero, the
 * wave-shaped gaps between bands, and the page margins.
 */
const IllustratedBackdrop: React.FC = () => (
  <div
    className="pointer-events-none fixed inset-0 select-none overflow-hidden"
    style={{ zIndex: -1 }}
    aria-hidden="true"
  >
    {/* Sky */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg, #A5E4FF 0%, #C9EFFF 28%, #EAF8FF 52%, #FFF6E5 74%, #FFF6E5 100%)',
      }}
    />

    {/* Sun, high on the right. The rays turn once every 40s. */}
    <SunBurst spin className="absolute -right-16 -top-16 h-72 w-72 sm:h-96 sm:w-96" />

    {/* Clouds. Each drifts the full width on its own clock, so they never
        line up into a repeating pattern. */}
    <Cloud
      className="absolute h-16 w-28 opacity-95 sm:h-20 sm:w-36"
      style={{ top: '12%', animation: 'cloudDrift 90s linear infinite' }}
    />
    <Cloud
      className="absolute h-10 w-20 opacity-80 sm:h-14 sm:w-24"
      style={{ top: '26%', animation: 'cloudDrift 140s linear infinite', animationDelay: '-40s' }}
    />
    <Cloud
      className="absolute h-12 w-24 opacity-70 sm:h-16 sm:w-28"
      style={{ top: '5%', animation: 'cloudDrift 190s linear infinite', animationDelay: '-120s' }}
    />

    <Birds
      className="absolute left-[18%] top-[18%] h-8 w-24 opacity-40"
      style={{ animation: 'cloudDrift 240s linear infinite' }}
    />

    {/* Sea: three drawn crests stacked at the foot of the viewport. */}
    <svg
      className="absolute inset-x-0 bottom-0 h-[38vh] w-full"
      viewBox="0 0 1200 380"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 92 C150 56 300 124 450 96 C600 68 750 126 900 100 C1020 79 1110 88 1200 78 L1200 380 L0 380 Z"
        fill="#A5E4FF"
      />
      <path
        d="M0 150 C150 116 300 182 450 154 C600 126 750 184 900 158 C1020 137 1110 146 1200 136 L1200 380 L0 380 Z"
        fill="#7FE3DA"
      />
      <path
        d="M0 212 C150 180 300 244 450 216 C600 188 750 246 900 220 C1020 199 1110 208 1200 198 L1200 380 L0 380 Z"
        fill="#21C0B7"
      />
      {/* Foam ticks: the shorthand for moving water in a flat drawing. */}
      <g stroke="#FFFDF7" strokeWidth={5} strokeLinecap="round" opacity={0.75}>
        <path d="M120 250 L190 250" />
        <path d="M330 286 L392 286" />
        <path d="M620 262 L690 262" />
        <path d="M880 300 L946 300" />
        <path d="M1040 258 L1096 258" />
      </g>
    </svg>

    {/* Fronds leaning in from the bottom corners. The static lean lives on the
        wrapper so the sway animation on the frond itself is free to own
        `transform` outright. */}
    <div
      className="absolute -left-28 bottom-[-16%] h-72 w-72 sm:h-96 sm:w-96"
      style={{ transform: 'rotate(28deg)' }}
    >
      <PalmFrond color="jungleLight" className="animate-frond h-full w-full opacity-70" />
    </div>
    <div
      className="absolute -right-32 bottom-[-18%] h-72 w-72 sm:h-[26rem] sm:w-[26rem]"
      style={{ transform: 'rotate(-34deg) scaleX(-1)' }}
    >
      <PalmFrond
        color="jungle"
        className="animate-frond h-full w-full opacity-70"
        style={{ animationDelay: '-3s' }}
      />
    </div>
  </div>
);

export default IllustratedBackdrop;
