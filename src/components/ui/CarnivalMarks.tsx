import React from 'react';

/**
 * The marks this site is printed with.
 *
 * Every one of these is a STENCIL, not a picture: flat shapes in one or two
 * colours, cut the way a screen is cut. That is the discipline the trash
 * polka sheet already had, and it is what lets these sit beside engraved
 * linework without either looking pasted on.
 *
 * They are inline SVG rather than files. Each is a few hundred bytes of path
 * data, so as separate requests they would cost more in latency than they do
 * in bytes — and inline they inherit `currentColor`, which means one mark
 * serves the red, the gold and the ink without three copies existing.
 *
 * WHAT THEY ARE. The references are specific rather than decorative:
 * the Diablo Cojuelo mask of Dominican carnival, the two-headed gagá drum,
 * Adinkra stamp geometry, the Taíno petroglyph's single doubling-back line,
 * and the sun that every Caribbean poster has ever had. They are drawn from
 * the shapes, not traced from anyone's artwork.
 */

type MarkProps = { className?: string; title?: string };

const svg = (className?: string) => ({
  className,
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none' as const,
  'aria-hidden': true as const,
  focusable: 'false' as const,
});

/** Diablo Cojuelo — the horned carnival mask. The signature of the site. */
export const CojueloMask: React.FC<MarkProps> = ({ className }) => (
  <svg {...svg(className)} viewBox="0 0 120 132">
    {/* horns */}
    <path
      d="M24 44C14 30 12 14 18 4c8 6 16 14 20 26M96 44c10-14 12-30 6-40-8 6-16 14-20 26"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    />
    {/* face */}
    <path
      d="M60 20c24 0 38 16 38 40 0 30-18 56-38 66-20-10-38-36-38-66 0-24 14-40 38-40Z"
      fill="currentColor"
    />
    {/* eyes, knocked out of the face so the paper shows through */}
    <path d="M40 60c5-6 13-6 18 0-5 6-13 6-18 0Z" fill="var(--paper, #EDE4D3)" />
    <path d="M62 60c5-6 13-6 18 0-5 6-13 6-18 0Z" fill="var(--paper, #EDE4D3)" />
    {/* teeth */}
    <path
      d="M42 92h36l-4 8h-6l-3-6-3 6h-6l-3-6-3 6h-5Z"
      fill="var(--paper, #EDE4D3)"
    />
    {/* snout line */}
    <path d="M60 68v12" stroke="var(--paper, #EDE4D3)" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

/** The gagá drum, seen end on, with its tension ropes. */
export const GagaDrum: React.FC<MarkProps> = ({ className }) => (
  <svg {...svg(className)} viewBox="0 0 96 120">
    <path d="M18 22h60v76H18Z" fill="currentColor" />
    <ellipse cx="48" cy="22" rx="30" ry="11" fill="currentColor" />
    <ellipse cx="48" cy="22" rx="30" ry="11" stroke="var(--paper, #EDE4D3)" strokeWidth="3" />
    {/* the ropes, zig-zagged the way a drum is actually laced */}
    <path
      d="M20 30 46 48 20 66 46 84M76 30 50 48 76 66 50 84"
      stroke="var(--paper, #EDE4D3)"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <ellipse cx="48" cy="98" rx="30" ry="10" fill="currentColor" />
  </svg>
);

/** Adinkra-family stamp. A ground mark, used small and repeated. */
export const AdinkraStamp: React.FC<MarkProps> = ({ className }) => (
  <svg {...svg(className)} viewBox="0 0 48 48">
    <path
      d="M24 4v40M4 24h40M10 10l28 28M38 10 10 38"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="3" />
  </svg>
);

/** The sun every Caribbean poster has, cut with a knife rather than drawn. */
export const StencilSun: React.FC<MarkProps> = ({ className }) => (
  <svg {...svg(className)} viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="26" fill="currentColor" />
    {Array.from({ length: 16 }).map((_, i) => {
      const a = (i * Math.PI * 2) / 16;
      const x1 = 60 + Math.cos(a) * 34;
      const y1 = 60 + Math.sin(a) * 34;
      const x2 = 60 + Math.cos(a) * (i % 2 ? 48 : 56);
      const y2 = 60 + Math.sin(a) * (i % 2 ? 48 : 56);
      return (
        <path
          key={i}
          d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`}
          stroke="currentColor"
          strokeWidth={i % 2 ? 4 : 7}
          strokeLinecap="butt"
        />
      );
    })}
  </svg>
);

/** A palm reduced to a stencil — five strokes and a trunk. */
export const StencilPalm: React.FC<MarkProps> = ({ className }) => (
  <svg {...svg(className)} viewBox="0 0 110 140">
    <path d="M52 44c2 30 4 60 14 94" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    <path
      d="M52 42C36 24 18 20 4 28c14-2 28 4 38 16M52 42c10-22 28-34 46-32-16 4-28 14-34 30M52 42c20-8 40-2 50 14-16-8-32-8-44 0M52 42C34 44 20 56 16 74c8-14 22-24 36-26M52 42c16 6 26 20 28 38-8-16-18-28-30-32"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
    />
  </svg>
);

/** Taíno petroglyph line — one stroke that doubles back on itself. */
export const PetroglyphRule: React.FC<MarkProps> = ({ className }) => (
  <svg {...svg(className)} viewBox="0 0 240 14" preserveAspectRatio="none">
    <path
      d="M0 8Q12 2 24 8T48 8T72 8T96 8T120 8T144 8T168 8T192 8T216 8T240 8"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  </svg>
);

/** The barcode trash polka always has somewhere. Deliberately meaningless. */
export const Barcode: React.FC<MarkProps> = ({ className }) => {
  // Fixed widths rather than random ones: a barcode that reshuffles on every
  // render is a barcode that makes the page repaint for no reason.
  const bars = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 1, 1, 4, 2, 1];
  let x = 0;
  return (
    <svg {...svg(className)} viewBox="0 0 96 28" preserveAspectRatio="none">
      {bars.map((w, i) => {
        const el =
          i % 2 === 0 ? <rect key={i} x={x} y="0" width={w} height="28" fill="currentColor" /> : null;
        x += w + 1;
        return el;
      })}
    </svg>
  );
};

export default CojueloMask;
