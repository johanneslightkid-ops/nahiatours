import React from 'react';
import { SunBurst, Cloud, PalmFrond, Birds, TainoSpiral } from './Illustrations';
import { useMotionBudget } from '../../lib/useMotionBudget';

/**
 * The painting behind every page.
 *
 * One composed scene of the Bavaro coast — a low horizon, the sun burning
 * through haze above it, headlands either side and fronds leaning in at the
 * top corners. It is `position: fixed`, so the content scrolls over a still
 * painting the way a page of a book moves over the table under it.
 *
 * NOTHING INSIDE THIS LAYER ANIMATES, and that is a performance decision, not
 * an aesthetic one. A fixed, full-viewport element is the largest composited
 * layer on the page; anything that moves inside it forces the compositor to
 * re-raster all of it, on every frame, for the whole session. An earlier
 * design on this repository ran two drifting clouds here and gave up roughly
 * half its scroll frame rate for them. The drifting happens in the hero
 * instead, where the layer is bounded.
 *
 * `contain: paint` tells the browser that nothing here can draw outside its
 * own box, so it can skip this subtree entirely while compositing the rest.
 */
const IllustratedBackdrop: React.FC = () => {
  const budget = useMotionBudget();
  // On a phone the corner ornaments are the first things to go: they are
  // nearly off-screen at that width, and every one of them is a paint.
  const ornate = budget === 'full';

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ contain: 'paint' }}
    >
      {/* ── Sky ──────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 top-0 h-[62vh]"
        style={{
          background:
            'linear-gradient(180deg, #B3DDE2 0%, #D8E9DC 30%, #F2DDBA 58%, #F2E6CD 100%)',
        }}
      />

      {/* Sun, burning through the haze just above the horizon. */}
      <SunBurst className="absolute left-[64%] top-[6vh] h-[34vh] w-[34vh] opacity-80" />

      {/* Two clouds, painted in place. */}
      <Cloud className="absolute left-[6%] top-[9vh] w-[30vw] max-w-[420px] opacity-70" />
      <Cloud className="absolute left-[52%] top-[19vh] w-[22vw] max-w-[320px] opacity-45" />

      <Birds className="absolute left-[22%] top-[22vh] w-[14vw] max-w-[190px] opacity-60" />

      {/* ── Sea ──────────────────────────────────────────────────────────── */}
      {/* The water has to ARRIVE rather than start: a gradient that opens at
          full strength draws a hard horizontal rule across the page, and the
          eye reads it as a seam rather than as a horizon.

          Hidden below `sm`. A fixed band across the middle of a phone screen
          does not read as a horizon at all — the content scrolls over it and
          it just looks like a grey panel someone left behind the text. */}
      <div
        className="absolute inset-x-0 top-[44vh] hidden h-[26vh] sm:block"
        style={{
          background:
            'linear-gradient(180deg, rgba(31,98,133,0) 0%, rgba(31,98,133,0.3) 14%, rgba(47,182,164,0.26) 48%, rgba(143,220,208,0.16) 78%, rgba(247,238,220,0) 100%)',
        }}
      />
      {/* The line where the water meets the sky, softened and faded at both
          ends so it never reaches the edge of the frame. */}
      <div
        className="absolute inset-x-0 top-[45vh] hidden h-px sm:block"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(14,59,82,0.28) 18%, rgba(14,59,82,0.28) 82%, transparent)',
          filter: 'blur(0.6px)',
        }}
      />

      {/* Headlands, left and right, keeping the eye in the middle. */}
      <svg
        className="absolute inset-x-0 top-[40vh] hidden h-[12vh] w-full sm:block"
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d="M0 140V72c90-30 180-22 268 10 42 15 78 22 110 20V140Z" fill="#4C7E6E" opacity="0.4" />
        <path d="M1440 140V60c-110-26-200-12-276 26-38 19-72 28-102 28V140Z" fill="#4C7E6E" opacity="0.32" />
      </svg>

      {/* ── Sand ─────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0 top-[52vh] sm:top-[64vh]"
        style={{
          background:
            'linear-gradient(180deg, rgba(255,206,122,0.24) 0%, rgba(233,217,185,0.5) 40%, #F2E6CD 100%)',
        }}
      />

      {/* ── Foliage leaning into the frame ───────────────────────────────── */}
      <PalmFrond className="absolute -left-[14vw] -top-[3vh] h-[30vh] origin-top rotate-[24deg] opacity-60 sm:-left-[7vw] sm:-top-[4vh] sm:h-[46vh] sm:opacity-80" />
      <PalmFrond
        color="lagoon"
        className="absolute -right-[8vw] -top-[6vh] hidden h-[52vh] origin-top -rotate-[26deg] scale-x-[-1] opacity-70 sm:block"
      />

      {ornate && (
        <>
          <PalmFrond
            color="ochre"
            className="absolute -bottom-[14vh] -left-[4vw] h-[40vh] rotate-[168deg] opacity-40"
          />
          {/* Pottery ornament, ghosted into the corners. */}
          <TainoSpiral className="absolute bottom-[6vh] right-[4vw] h-24 w-24 opacity-25" />
          <TainoSpiral tone="lagoon" className="absolute left-[5vw] top-[52vh] h-16 w-16 opacity-20" />
        </>
      )}

      {/* A final varnish, so the content always has something to sit on. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(130% 85% at 50% 38%, rgba(242,230,205,0) 0%, rgba(242,230,205,0.42) 62%, rgba(242,230,205,0.8) 100%)',
        }}
      />
    </div>
  );
};

export default IllustratedBackdrop;
