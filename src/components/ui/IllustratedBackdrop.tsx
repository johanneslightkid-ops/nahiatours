import React from 'react';
import { PalmFrond, Monstera } from './Illustrations';

/**
 * The painted scene the whole site sits in front of.
 *
 * It is a single watercolour of the Bávaro coast: a washed sky, a bank of
 * cloud, the sun low over the water, two headlands, three bands of sea and the
 * sand coming up to meet the page. Content sections are opaque, so the scene
 * reads through the hero, through the gaps between the painted section edges,
 * and down the page margins on a wide screen.
 *
 * NOTHING IN HERE MOVES, and that is a measured decision rather than a
 * stylistic one. This element is `position: fixed` across the whole viewport.
 * Animating anything inside a full-viewport fixed layer forces the compositor
 * to re-raster that layer every frame — on the previous design that cost this
 * page roughly half its frame rate on a desktop, and more on a phone, no
 * matter which property was being animated. The hero owns the site's motion
 * instead: it is a normal, bounded element, and it stops when it scrolls away.
 *
 * Everything below is a gradient or a filled path. No `filter`, no
 * `mix-blend-mode`, no backdrop blur — the three things that turn a static
 * backdrop into a per-frame bill.
 */
const IllustratedBackdrop: React.FC = () => (
  <div
    className="pointer-events-none fixed inset-0 select-none overflow-hidden"
    style={{ zIndex: -1 }}
    aria-hidden="true"
  >
    {/* Sky: a wet-in-wet wash running from a cool zenith down to the warm haze
        that sits on a Caribbean horizon at midday. */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg, #CFE7EF 0%, #DCEBEF 22%, #E9F1EC 44%, #F4F0E4 60%, #FBF5E9 72%, #FBF5E9 100%)',
      }}
    />

    {/* The sun, low and off-centre, bleeding into the haze. */}
    <div
      className="absolute"
      style={{
        top: '6%',
        right: '12%',
        width: 'min(46vw, 460px)',
        aspectRatio: '1',
        borderRadius: '9999px',
        background:
          'radial-gradient(circle, rgba(246,201,139,0.55) 0%, rgba(246,201,139,0.28) 38%, rgba(246,201,139,0) 68%)',
      }}
    />

    {/* Cloud bank. Drawn as soft elliptical washes rather than outlined puffs —
        a cloud in watercolour is where the paper was left alone. */}
    <svg
      className="absolute inset-x-0 top-0 h-[42vh] w-full"
      viewBox="0 0 1200 420"
      preserveAspectRatio="xMidYMin slice"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <g fill="#FBF5E9">
        <ellipse cx="200" cy="120" rx="210" ry="58" opacity="0.5" />
        <ellipse cx="300" cy="96" rx="140" ry="42" opacity="0.42" />
        <ellipse cx="880" cy="86" rx="230" ry="52" opacity="0.45" />
        <ellipse cx="760" cy="112" rx="150" ry="38" opacity="0.38" />
        <ellipse cx="560" cy="180" rx="260" ry="44" opacity="0.3" />
      </g>
      <g fill="#D6ECF2">
        <ellipse cx="250" cy="142" rx="180" ry="30" opacity="0.5" />
        <ellipse cx="900" cy="118" rx="200" ry="26" opacity="0.45" />
      </g>
    </svg>

    {/* The sea. Three wash bands, each darker and each with a painted crest
        line, plus a scatter of foam where light breaks. */}
    <svg
      className="absolute inset-x-0 bottom-0 h-[32vh] w-full"
      viewBox="0 0 1200 460"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <path
        d="M0 56 C160 36 300 70 450 54 C600 38 720 68 880 54 C1000 43 1110 58 1200 44 L1200 460 L0 460 Z"
        fill="#C9E8E2"
        fillOpacity="0.72"
      />
      <path
        d="M0 128 C150 108 300 142 450 126 C600 110 730 140 880 126 C1010 114 1110 128 1200 114 L1200 460 L0 460 Z"
        fill="#7FCBCE"
        fillOpacity="0.62"
      />
      <path
        d="M0 214 C160 196 300 228 460 212 C620 196 740 224 900 212 C1020 203 1120 214 1200 202 L1200 460 L0 460 Z"
        fill="#2E9AA6"
        fillOpacity="0.5"
      />
      {/* Wet sand: where the last wash runs out on the beach. */}
      <path
        d="M0 336 C170 318 320 348 480 334 C640 320 780 344 940 334 C1060 326 1130 336 1200 328 L1200 460 L0 460 Z"
        fill="#EEDCC0"
        fillOpacity="0.85"
      />
      <path
        d="M0 336 C170 318 320 348 480 334 C640 320 780 344 940 334 C1060 326 1130 336 1200 328"
        stroke="#FBF5E9"
        strokeWidth="6"
        strokeOpacity="0.7"
        strokeLinecap="round"
      />
      <g stroke="#FBF5E9" strokeWidth="4" strokeOpacity="0.55" strokeLinecap="round">
        <path d="M120 176 C158 170 186 178 224 172" />
        <path d="M520 158 C556 152 582 160 620 154" />
        <path d="M860 184 C896 178 922 186 960 180" />
        <path d="M250 262 C288 256 316 264 354 258" />
        <path d="M700 272 C736 266 764 274 802 268" />
        <path d="M1000 250 C1034 244 1058 252 1094 246" />
      </g>
    </svg>

    {/* Foliage leaning into the frame from the corners — the repoussoir a
        painter puts in the foreground so the eye reads distance. Low opacity:
        it is the edge of the picture, not part of it. Hidden on small screens,
        where the content needs the width more than the composition does. */}
    <div className="absolute -left-28 bottom-[-8%] hidden h-72 w-72 opacity-[0.2] md:block lg:h-[26rem] lg:w-[26rem]">
      <Monstera color="palmDeep" className="h-full w-full" />
    </div>
    <div
      className="absolute -right-32 bottom-[-12%] hidden h-72 w-72 opacity-[0.16] md:block lg:h-[28rem] lg:w-[28rem]"
      style={{ transform: 'scaleX(-1) rotate(-8deg)' }}
    >
      <PalmFrond color="palm" className="h-full w-full" />
    </div>
    <div className="absolute -left-16 top-[-4%] hidden h-64 w-64 opacity-[0.1] xl:block">
      <PalmFrond color="palmLight" className="h-full w-full" style={{ transform: 'rotate(150deg)' }} />
    </div>
  </div>
);

export default IllustratedBackdrop;
