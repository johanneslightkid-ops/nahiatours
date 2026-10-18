import React from 'react';

/**
 * The wall of the gallery behind every page: primed canvas with a few large,
 * faint fields of colour laid over it — a nod to Ada Balcácer's layered
 * colour, quiet enough to read on.
 *
 * Fixed and full-viewport, so it is entirely static: one gradient and one
 * inline SVG, nothing moves, nothing repaints while the page scrolls.
 */
const IllustratedBackdrop: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 select-none overflow-hidden" style={{ zIndex: -1 }} aria-hidden="true">
    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #F7EFE1 0%, #F4E9D6 60%, #F0E2C8 100%)' }} />
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
      <path d="M-40 120 C120 60 260 140 300 260 C340 380 180 440 40 420 C-60 404 -80 200 -40 120 Z" fill="#A9BAF5" opacity="0.18" />
      <path d="M780 -40 C920 -20 1060 80 1040 220 C1020 340 880 360 800 300 C700 220 660 -60 780 -40 Z" fill="#FFDD6E" opacity="0.28" />
      <path d="M700 640 C820 600 980 660 1020 780 C1060 900 940 1040 800 1020 C660 1000 600 680 700 640 Z" fill="#F2AEDB" opacity="0.16" />
      <path d="M60 760 C160 700 320 740 340 860 C360 960 200 1040 80 1010 C-20 986 -40 820 60 760 Z" fill="#B4D98A" opacity="0.16" />
    </svg>
  </div>
);

export default IllustratedBackdrop;
