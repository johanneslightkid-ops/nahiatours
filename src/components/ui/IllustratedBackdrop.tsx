import React from 'react';
import { SunBurst, Cloud, PalmFrond, Birds, Splatter } from './Illustrations';

/**
 * The collage behind the whole site.
 *
 * The old backdrop painted a sky: gradient, sun, drifting clouds, a drawn sea.
 * This one is the sheet the site is pasted onto — bone stock, a red radiant
 * burning through from the top right, a black wash rising from the floor,
 * thrown ink in the corners, and a single palm hanging in as the last piece of
 * the tropics still standing.
 *
 * Everything is CSS and inline SVG, and all of it sits behind the content at
 * z-index -1. Content bands are opaque, so the collage reads through the hero,
 * the torn gaps between sections, and the page margins.
 */
const IllustratedBackdrop: React.FC = () => (
  <div
    className="pointer-events-none fixed inset-0 select-none overflow-hidden"
    style={{ zIndex: -1 }}
    aria-hidden="true"
  >
    {/* Bone stock, dirtied towards the bottom edge. */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(178deg, #F5F1E8 0%, #EFE9DD 42%, #E5DDCD 78%, #D5CAB4 100%)',
      }}
    />

    {/* The radiant. Enormous, mostly off-canvas, turning once every 90s — the
        one thing on the page that never stops. */}
    <SunBurst
      spin
      className="absolute -right-[28vw] -top-[34vw] h-[80vw] w-[80vw] opacity-[0.045] sm:-right-[18vw] sm:-top-[26vw] sm:h-[62vw] sm:w-[62vw]"
    />

    {/* Black wash rising off the floor, halftoned so it dissolves rather than
        stopping at a line. */}
    <div
      className="absolute inset-x-0 bottom-0 h-[46vh]"
      style={{
        background: 'linear-gradient(0deg, rgba(12,12,13,0.30) 0%, rgba(12,12,13,0.10) 46%, transparent 100%)',
        WebkitMaskImage:
          'radial-gradient(circle at 50% 50%, #000 1.1px, transparent 1.5px), linear-gradient(0deg, #000 40%, transparent 100%)',
        WebkitMaskSize: '5px 5px, 100% 100%',
        WebkitMaskComposite: 'source-in',
        maskImage:
          'radial-gradient(circle at 50% 50%, #000 1.1px, transparent 1.5px), linear-gradient(0deg, #000 40%, transparent 100%)',
        maskSize: '5px 5px, 100% 100%',
        maskComposite: 'intersect',
      }}
    />

    {/* A red slash torn diagonally across the whole sheet. It sits under every
        section band, so it only shows in the gaps — which is what makes the
        page feel like layers of paper rather than a scroll. */}
    <div
      className="absolute -left-[10vw] top-[18vh] h-[52vh] w-[130vw] opacity-[0.055]"
      style={{
        background: 'linear-gradient(96deg, #0C0C0D 0%, #0C0C0D 62%, #C1121F 100%)',
        transform: 'rotate(-14deg)',
        WebkitMaskImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 200' preserveAspectRatio='none'%3E%3Cpath d='M0,54 L120,28 L260,72 L400,20 L540,66 L700,26 L840,70 L980,32 L1120,66 L1200,38 L1200,150 L1080,178 L940,136 L800,180 L660,132 L500,176 L360,130 L220,174 L90,132 L0,164 Z' fill='%23000'/%3E%3C/svg%3E\")",
        WebkitMaskSize: '100% 100%',
        maskImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 200' preserveAspectRatio='none'%3E%3Cpath d='M0,54 L120,28 L260,72 L400,20 L540,66 L700,26 L840,70 L980,32 L1120,66 L1200,38 L1200,150 L1080,178 L940,136 L800,180 L660,132 L500,176 L360,130 L220,174 L90,132 L0,164 Z' fill='%23000'/%3E%3C/svg%3E\")",
        maskSize: '100% 100%',
      }}
    />

    {/* Thrown ink, corner to corner. */}
    <Splatter
      tone="ink"
      variant={1}
      className="absolute -left-[6vw] top-[6vh] h-[30vw] w-[30vw] opacity-[0.05]"
    />
    <Splatter
      tone="blood"
      variant={2}
      className="absolute -right-[8vw] bottom-[4vh] h-[34vw] w-[34vw] opacity-[0.06]"
    />

    {/* Blots drifting where the clouds used to be. Each crosses on its own
        clock so they never line up into a pattern. */}
    <Cloud
      className="absolute h-14 w-24 opacity-[0.10] sm:h-16 sm:w-28"
      style={{ top: '11%', animation: 'cloudDrift 120s linear infinite' }}
    />
    <Cloud
      className="absolute h-9 w-16 opacity-[0.08] sm:h-11 sm:w-20"
      style={{ top: '29%', animation: 'cloudDrift 180s linear infinite', animationDelay: '-60s' }}
    />

    <Birds
      className="absolute left-[16%] top-[16%] h-8 w-28 opacity-[0.16]"
      style={{ animation: 'cloudDrift 260s linear infinite' }}
    />

    {/* Hazard ruling along the very bottom of the sheet — the edge of the
        printed area. */}
    <div
      className="absolute inset-x-0 bottom-0 h-3 opacity-30"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, #0C0C0D 0 10px, transparent 10px 20px)',
      }}
    />

    {/* One frond still hanging in from the left. The lean lives on the wrapper
        so the drift animation on the frond itself owns `transform` outright. */}
    <div
      className="absolute -left-24 bottom-[-14%] h-72 w-72 sm:h-96 sm:w-96"
      style={{ transform: 'rotate(26deg)' }}
    >
      <PalmFrond color="ink" className="animate-frond h-full w-full opacity-[0.08]" />
    </div>
    <div
      className="absolute -right-28 top-[46%] hidden h-80 w-80 lg:block"
      style={{ transform: 'rotate(-146deg)' }}
    >
      <PalmFrond
        color="blood"
        className="animate-frond h-full w-full opacity-[0.07]"
        style={{ animationDelay: '-6s' }}
      />
    </div>
  </div>
);

export default IllustratedBackdrop;
