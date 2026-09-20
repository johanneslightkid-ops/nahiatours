import React, { useId } from 'react';

/**
 * The painted vocabulary.
 *
 * Every drawing here is built the way an oil is built, in three passes:
 *
 *   1. A LOOSE WASH — a soft, slightly oversized shape in the lightest value
 *      of the pigment, offset a little from where the object finally sits. It
 *      is what shows through at the edges and it is why nothing looks
 *      die-cut.
 *   2. A SECOND WASH pooling over it, carrying the mixed colour. Every
 *      gradient here goes between two RELATED pigments — green into gold,
 *      turquoise into ultramarine — because a hue straight from the tube is
 *      what makes vector art look like vector art.
 *   3. A CONTOUR that does not close. A tapered, semi-transparent stroke on
 *      two or three edges only, plus one warm highlight where the light lands.
 *
 * There is no uniform outline anywhere and no pure black: the darkest value is
 * INK, a deep umber-teal, and it is never used at full opacity for a line.
 *
 * WHAT IS DRAWN. The brief: Caribbean nature and the things a visitor actually
 * comes for. Reef fish, starfish, a conch, a sea fan, a turtle; a rhinoceros
 * iguana and a squirrel monkey, both of which are on the excursions; parrots,
 * a hummingbird and an outsized butterfly; palms, hibiscus and flamboyan; a
 * catamaran and the swell under it.
 *
 * THE ORNAMENT is Taino, and it is deliberately only GEOMETRY — the spirals,
 * concentric rings and stepped frets off pottery and basketwork. No cemi, no
 * figures, no ritual iconography: a pattern, used as a pattern.
 *
 * MECHANICS. Each drawing is decorative, so it is `aria-hidden` and takes its
 * size from the caller's className. Gradient ids are namespaced per instance
 * with useId(), because two copies of the same drawing on one page sharing an
 * id is how you get one of them silently painted in the other one's colours.
 */

export const INK = '#22342E';

/** The pigments on the palette. Same values as tailwind.config.cjs. */
const P = {
  ink: '#22342E',
  inkSoft: '#476056',
  canvas: '#F7EEDC',
  canvasLift: '#FDF8EE',
  canvasDeep: '#EFE0C6',
  lagoon: '#2FB6A4',
  lagoonLight: '#8FDCD0',
  lagoonDark: '#12796F',
  sea: '#1F6285',
  seaLight: '#5C9DBA',
  seaDark: '#0E3B52',
  mango: '#F2A32B',
  mangoLight: '#FFCE7A',
  mangoDark: '#CE7A0D',
  ochre: '#C2963C',
  ochreDark: '#96701F',
  coral: '#E4573F',
  coralLight: '#FF9A81',
  coralDark: '#B33421',
  hibiscus: '#DB5589',
  hibiscusLight: '#F599BA',
  palm: '#57913C',
  palmLight: '#9CC873',
  palmDark: '#2F5B24',
  shade: '#6B5B8A',
  shadeLight: '#A79ABC',
};

export interface IllustrationProps {
  className?: string;
  style?: React.CSSProperties;
}

const svgProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false as const,
};

/** Per-instance id prefix, so gradients never collide between two copies. */
const useLocalIds = () => {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (name: string) => `${name}${raw}`;
};

/** The contour: never closed, never black, never the same weight twice. */
const contour = (opacity = 0.32, width = 2) => ({
  stroke: INK,
  strokeOpacity: opacity,
  strokeWidth: width,
});

/* ══════════════════════════════════════════════════════════════════════════
   SKY
   ══════════════════════════════════════════════════════════════════════════ */

/** The sun, seen through haze: a bloom first, a disc second. */
export const SunBurst: React.FC<IllustrationProps & { spin?: boolean }> = ({
  className = '',
  style,
}) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={id('halo')}>
          <stop offset="35%" stopColor={P.mangoLight} stopOpacity="0.85" />
          <stop offset="70%" stopColor={P.coralLight} stopOpacity="0.3" />
          <stop offset="100%" stopColor={P.coralLight} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('disc')} cx="38%" cy="34%">
          <stop offset="0%" stopColor="#FFF3D4" />
          <stop offset="55%" stopColor={P.mangoLight} />
          <stop offset="100%" stopColor={P.mango} />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#${id('halo')})`} />
      {/* Rays as soft wedges, not spokes. */}
      <g opacity="0.3">
        {Array.from({ length: 10 }, (_, i) => (
          <path
            key={i}
            d="M60 60 L64 8 L56 8 Z"
            fill={P.mangoLight}
            transform={`rotate(${i * 36} 60 60)`}
          />
        ))}
      </g>
      <circle cx="60" cy="60" r="27" fill={`url(#${id('disc')})`} />
      <path d="M40 48a26 26 0 0 1 22-14" {...contour(0.12, 2.5)} />
    </svg>
  );
};

/** Cumulus: warm on top where the light hits, violet underneath. */
export const Cloud: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 200 92" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('c')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF6" />
          <stop offset="58%" stopColor={P.canvasLift} />
          <stop offset="100%" stopColor={P.shadeLight} stopOpacity="0.75" />
        </linearGradient>
      </defs>
      {/* The wash that shows past the edge. */}
      <path
        d="M30 74c-16 0-26-10-26-22s11-21 24-20C33 16 47 6 63 8c11-10 30-10 41 2 16-6 33 3 37 18 14 1 24 11 24 23s-11 21-26 21Z"
        fill={P.shadeLight}
        opacity="0.28"
        transform="translate(5 5)"
      />
      <path
        d="M30 74c-16 0-26-10-26-22s11-21 24-20C33 16 47 6 63 8c11-10 30-10 41 2 16-6 33 3 37 18 14 1 24 11 24 23s-11 21-26 21Z"
        fill={`url(#${id('c')})`}
      />
      <path d="M22 44c6-9 17-13 26-10" stroke="#FFFDF6" strokeOpacity="0.9" strokeWidth="3" />
    </svg>
  );
};

/** Frigatebirds, far out. Two strokes each, which is all distance needs. */
export const Birds: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 56" className={className} style={style} {...svgProps}>
    <g stroke={P.inkSoft} strokeOpacity="0.5" strokeWidth="2.4" fill="none">
      <path d="M8 26c7-9 13-9 19 0 6-9 12-9 19 0" />
      <path d="M58 13c5-7 10-7 14 0 5-7 9-7 14 0" opacity="0.75" />
      <path d="M96 34c6-8 11-8 16 0 5-8 10-8 15 0" opacity="0.55" />
    </g>
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   BOTANY
   ══════════════════════════════════════════════════════════════════════════ */

/** A single frond. Leaflets thin towards the tip, gold at the edges. */
export const PalmFrond: React.FC<IllustrationProps & { color?: 'palm' | 'lagoon' | 'ochre' }> = ({
  className = '',
  style,
  color = 'palm',
}) => {
  const id = useLocalIds();
  const tones = {
    palm: [P.palmLight, P.palm, P.palmDark],
    lagoon: [P.lagoonLight, P.lagoon, P.lagoonDark],
    ochre: [P.mangoLight, P.ochre, P.ochreDark],
  }[color];

  return (
    <svg viewBox="0 0 160 220" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('f')} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={tones[2]} />
          <stop offset="55%" stopColor={tones[1]} />
          <stop offset="100%" stopColor={tones[0]} />
        </linearGradient>
      </defs>
      {/* Under-wash, offset so it reads as light coming through the leaf. */}
      <path
        d="M80 216C74 150 72 92 88 18c12 62 14 128 4 198Z"
        fill={tones[0]}
        opacity="0.35"
        transform="translate(-6 0)"
      />
      <g fill={`url(#${id('f')})`}>
        {Array.from({ length: 11 }, (_, i) => {
          const t = i / 10;
          const y = 200 - t * 176;
          const len = 62 * (1 - t * 0.72) + 10;
          const droop = 16 + t * 10;
          return (
            <g key={i}>
              <path d={`M82 ${y} q -${len * 0.6} -${droop} -${len} ${droop * 0.5} q ${len * 0.55} ${droop * 0.3} ${len} -${droop * 0.4} Z`} />
              <path d={`M82 ${y} q ${len * 0.6} -${droop} ${len} ${droop * 0.5} q -${len * 0.55} ${droop * 0.3} -${len} -${droop * 0.4} Z`} opacity="0.88" />
            </g>
          );
        })}
      </g>
      <path d="M82 214C78 150 79 88 88 20" stroke={tones[2]} strokeOpacity="0.7" strokeWidth="3.5" />
    </svg>
  );
};

/** A coconut palm, leaning the way they lean on the Bavaro shore. */
export const PalmTree: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 200 260" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('t')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={P.ochreDark} />
          <stop offset="45%" stopColor={P.ochre} />
          <stop offset="100%" stopColor="#7A5A18" />
        </linearGradient>
        <linearGradient id={id('l')} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={P.palmDark} />
          <stop offset="60%" stopColor={P.palm} />
          <stop offset="100%" stopColor={P.palmLight} />
        </linearGradient>
      </defs>

      {/* Trunk: the wash first, then the lit face on top of it. */}
      <path d="M96 256c-6-70 2-124 22-166l16 5C118 138 112 190 116 256Z" fill={P.shade} opacity="0.25" />
      <path d="M92 256c-6-70 2-124 22-166l14 4C112 138 108 190 112 256Z" fill={`url(#${id('t')})`} />
      {Array.from({ length: 7 }, (_, i) => (
        <path
          key={i}
          d={`M${93 + i * 2.4} ${236 - i * 22} q 9 -4 18 -1`}
          stroke="#6B4E14"
          strokeOpacity="0.45"
          strokeWidth="2.5"
        />
      ))}

      {/* Crown: six fronds radiating from one point. */}
      <g fill={`url(#${id('l')})`} transform="translate(124 88)">
        {[-78, -38, -6, 26, 58, 96].map((angle, i) => (
          <g key={i} transform={`rotate(${angle})`}>
            <path
              d="M0 0 q 34 -20 78 -6 q -30 6 -44 18 q -20 -10 -34 -12 Z"
              opacity={0.86 + (i % 2) * 0.14}
            />
            <path d="M0 0 q 36 -14 76 -6" {...contour(0.18, 1.6)} />
          </g>
        ))}
      </g>

      {/* Coconuts. */}
      <g>
        <circle cx="130" cy="96" r="8" fill={P.ochreDark} />
        <circle cx="128" cy="94" r="8" fill={P.ochre} />
        <circle cx="126" cy="91" r="2.4" fill={P.mangoLight} opacity="0.8" />
        <circle cx="144" cy="102" r="7" fill={P.ochreDark} />
        <circle cx="142" cy="100" r="7" fill={P.ochre} />
      </g>
    </svg>
  );
};

/** Hibiscus, five petals and a long style. */
export const Hibiscus: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={id('p')} cx="50%" cy="72%">
          <stop offset="0%" stopColor="#FFE0A8" />
          <stop offset="34%" stopColor={P.hibiscusLight} />
          <stop offset="100%" stopColor={P.hibiscus} />
        </radialGradient>
      </defs>
      <g transform="translate(60 62)">
        <g fill={P.hibiscus} opacity="0.3" transform="translate(4 4)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-30" rx="21" ry="30" transform={`rotate(${a})`} />
          ))}
        </g>
        <g fill={`url(#${id('p')})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-30" rx="21" ry="30" transform={`rotate(${a})`} />
          ))}
        </g>
        {[0, 72, 144, 216, 288].map((a) => (
          <path
            key={a}
            d="M0 -6 q 3 -22 0 -44"
            transform={`rotate(${a})`}
            stroke={P.coralDark}
            strokeOpacity="0.3"
            strokeWidth="1.8"
          />
        ))}
        <path d="M0 0 q 6 -26 26 -38" stroke={P.mangoDark} strokeWidth="3.2" strokeOpacity="0.9" />
        <circle cx="25" cy="-38" r="5" fill={P.mangoLight} />
        <circle cx="0" cy="0" r="7" fill={P.mango} />
      </g>
    </svg>
  );
};

/** Flamboyan — the national tree's blossom, red with orange in it. */
export const Flamboyan: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 120 110" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={id('fl')} cx="46%" cy="70%">
          <stop offset="0%" stopColor={P.mangoLight} />
          <stop offset="40%" stopColor={P.coralLight} />
          <stop offset="100%" stopColor={P.coralDark} />
        </radialGradient>
      </defs>
      <g transform="translate(60 66)">
        {[-62, -28, 6, 40, 74].map((a, i) => (
          <path
            key={a}
            d="M0 0 q -17 -20 -6 -40 q 9 -14 18 0 q 10 20 -6 40 Z"
            transform={`rotate(${a}) scale(${1 - (i % 2) * 0.1})`}
            fill={`url(#${id('fl')})`}
          />
        ))}
        <g stroke={P.mangoLight} strokeWidth="2" strokeOpacity="0.9">
          <path d="M0 2 q -12 -18 -8 -32" />
          <path d="M0 2 q 3 -20 1 -34" />
          <path d="M0 2 q 13 -17 10 -30" />
        </g>
        <circle cx="0" cy="2" r="5.5" fill={P.mango} />
      </g>
    </svg>
  );
};

/** Pineapple. */
export const Pineapple: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 110 170" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('b')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.mangoLight} />
          <stop offset="55%" stopColor={P.mango} />
          <stop offset="100%" stopColor={P.ochreDark} />
        </linearGradient>
      </defs>
      <g transform="translate(55 0)">
        {[-40, -20, 0, 20, 40].map((a, i) => (
          <path
            key={a}
            d="M0 54 q -8 -32 0 -52 q 8 20 0 52 Z"
            transform={`rotate(${a} 0 54) scale(${1 - Math.abs(i - 2) * 0.12} 1)`}
            fill={i % 2 ? P.palm : P.palmLight}
          />
        ))}
      </g>
      <ellipse cx="58" cy="112" rx="37" ry="52" fill={P.ochreDark} opacity="0.3" />
      <ellipse cx="55" cy="110" rx="36" ry="51" fill={`url(#${id('b')})`} />
      <g stroke={P.ochreDark} strokeOpacity="0.4" strokeWidth="1.8">
        {[-1, 0, 1].map((k) => (
          <React.Fragment key={k}>
            <path d={`M${25 + k * 20} 64 L${55 + k * 20} 156`} />
            <path d={`M${85 - k * 20} 64 L${55 - k * 20} 156`} />
          </React.Fragment>
        ))}
      </g>
      <path d="M30 82q14-10 28-4" stroke={P.mangoLight} strokeOpacity="0.85" strokeWidth="3" />
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   FAUNA
   ══════════════════════════════════════════════════════════════════════════ */

/** A big, deliberately outsized butterfly. Four wings, two pigments each. */
export const Butterfly: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 160 140" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('up')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.mangoLight} />
          <stop offset="45%" stopColor={P.coral} />
          <stop offset="100%" stopColor={P.hibiscus} />
        </linearGradient>
        <linearGradient id={id('lo')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.lagoonLight} />
          <stop offset="60%" stopColor={P.lagoon} />
          <stop offset="100%" stopColor={P.sea} />
        </linearGradient>
      </defs>
      <g transform="translate(80 72)">
        {/* Left */}
        <g>
          <path d="M-4 -6 q -50 -56 -66 -30 q -14 24 22 40 q 22 10 44 -10 Z" fill={`url(#${id('up')})`} />
          <path d="M-4 2 q -40 34 -52 16 q -10 -16 16 -30 q 20 -10 36 14 Z" fill={`url(#${id('lo')})`} />
          <g fill={P.canvasLift} opacity="0.7">
            <circle cx="-44" cy="-24" r="6" />
            <circle cx="-26" cy="-32" r="3.4" />
            <circle cx="-32" cy="14" r="4.4" />
          </g>
          <path d="M-4 -6 q -44 -48 -62 -30" {...contour(0.22, 1.8)} />
        </g>
        {/* Right */}
        <g transform="scale(-1 1)">
          <path d="M-4 -6 q -50 -56 -66 -30 q -14 24 22 40 q 22 10 44 -10 Z" fill={`url(#${id('up')})`} opacity="0.95" />
          <path d="M-4 2 q -40 34 -52 16 q -10 -16 16 -30 q 20 -10 36 14 Z" fill={`url(#${id('lo')})`} opacity="0.95" />
          <g fill={P.canvasLift} opacity="0.7">
            <circle cx="-44" cy="-24" r="6" />
            <circle cx="-26" cy="-32" r="3.4" />
            <circle cx="-32" cy="14" r="4.4" />
          </g>
          <path d="M-4 -6 q -44 -48 -62 -30" {...contour(0.22, 1.8)} />
        </g>
        {/* Body and antennae */}
        <ellipse cx="0" cy="2" rx="5" ry="26" fill={P.ink} opacity="0.82" />
        <path d="M-2 -24 q -12 -16 -20 -20 M2 -24 q 12 -16 20 -20" stroke={P.ink} strokeOpacity="0.6" strokeWidth="2" />
        <circle cx="-22" cy="-45" r="2.6" fill={P.mango} />
        <circle cx="22" cy="-45" r="2.6" fill={P.mango} />
      </g>
    </svg>
  );
};

/** Hispaniolan parrot: green body, red throat, blue in the flight feathers. */
export const Parrot: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 140 160" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('bd')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.palmLight} />
          <stop offset="55%" stopColor={P.palm} />
          <stop offset="100%" stopColor={P.palmDark} />
        </linearGradient>
        <linearGradient id={id('wg')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.lagoon} />
          <stop offset="70%" stopColor={P.sea} />
          <stop offset="100%" stopColor={P.seaDark} />
        </linearGradient>
      </defs>
      {/* Perch */}
      <path d="M18 138q40 10 104 2" stroke={P.ochreDark} strokeOpacity="0.55" strokeWidth="7" />
      {/* Under-wash */}
      <path d="M52 132q-22-22-14-56 8-32 38-34 30-2 38 26 8 30-14 50-20 18-48 14Z" fill={P.palmDark} opacity="0.28" transform="translate(5 4)" />
      {/* Body */}
      <path d="M52 132q-22-22-14-56 8-32 38-34 30-2 38 26 8 30-14 50-20 18-48 14Z" fill={`url(#${id('bd')})`} />
      {/* Wing */}
      <path d="M74 60q30 2 36 30 4 22-14 34-6-32-22-64Z" fill={`url(#${id('wg')})`} />
      <g stroke={P.seaDark} strokeOpacity="0.35" strokeWidth="1.8">
        <path d="M80 70q18 8 22 28" />
        <path d="M86 80q14 8 16 24" />
      </g>
      {/* Head, throat, beak, eye */}
      <circle cx="72" cy="52" r="24" fill={`url(#${id('bd')})`} />
      <path d="M62 62q10 8 21 3-4 12-13 12-8 0-8-15Z" fill={P.coral} />
      <path d="M50 48q-14 2-13 12 1 11 15 9" fill={P.canvasDeep} />
      <path d="M50 48q-14 2-13 12 1 11 15 9" {...contour(0.28, 1.8)} />
      <circle cx="64" cy="44" r="5.5" fill={P.canvasLift} />
      <circle cx="63" cy="44" r="3" fill={P.ink} />
      <circle cx="61.6" cy="42.6" r="1" fill={P.canvasLift} />
      {/* Tail */}
      <path d="M96 118q22 20 30 40-26-8-38-26Z" fill={P.palmDark} />
      <path d="M100 120q18 18 24 34" stroke={P.mango} strokeOpacity="0.5" strokeWidth="2.4" />
    </svg>
  );
};

/** Kept from the old set, repainted. */
export const Toucan: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 150 140" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('bk')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={P.mangoLight} />
          <stop offset="55%" stopColor={P.mango} />
          <stop offset="100%" stopColor={P.coral} />
        </linearGradient>
        <linearGradient id={id('bo')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B4A44" />
          <stop offset="100%" stopColor={P.ink} />
        </linearGradient>
      </defs>
      <path d="M30 124q-14-24-6-50 10-32 42-32 32 0 40 30 8 30-16 52Z" fill={P.shade} opacity="0.25" transform="translate(5 5)" />
      <path d="M30 124q-14-24-6-50 10-32 42-32 32 0 40 30 8 30-16 52Z" fill={`url(#${id('bo')})`} />
      <path d="M46 78q22 4 30 26 4 18-10 26-8-30-20-52Z" fill="#48584F" />
      <circle cx="56" cy="52" r="22" fill={`url(#${id('bo')})`} />
      <path d="M58 40q34-14 58 6-28 22-58 10Z" fill={`url(#${id('bk')})`} />
      <path d="M58 40q34-14 58 6" {...contour(0.3, 2)} />
      <path d="M62 44q28-8 46 4" stroke={P.canvasLift} strokeOpacity="0.4" strokeWidth="2" />
      <circle cx="50" cy="44" r="6" fill={P.canvasLift} />
      <circle cx="49" cy="44" r="3.2" fill={P.ink} />
      <path d="M36 84q16 6 26 2" stroke={P.mangoLight} strokeOpacity="0.55" strokeWidth="3" />
    </svg>
  );
};

/** Zumbadorcito, wings blurred the way they actually are. */
export const Hummingbird: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 140 110" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('h')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.lagoonLight} />
          <stop offset="50%" stopColor={P.lagoon} />
          <stop offset="100%" stopColor={P.seaDark} />
        </linearGradient>
      </defs>
      {/* Wing blur: two soft ellipses, not feathers. */}
      <ellipse cx="72" cy="36" rx="34" ry="12" fill={P.lagoonLight} opacity="0.4" transform="rotate(-28 72 36)" />
      <ellipse cx="74" cy="44" rx="30" ry="9" fill={P.canvasLift} opacity="0.35" transform="rotate(22 74 44)" />
      <path d="M56 70q-12-14-4-28 8-14 26-12 20 2 24 18 4 16-12 24-20 8-34-2Z" fill={`url(#${id('h')})`} />
      <path d="M50 58q-22 2-40 14 20 2 40-4Z" fill={P.seaDark} opacity="0.75" />
      <path d="M86 52q22 2 40 14" stroke={P.ink} strokeOpacity="0.55" strokeWidth="3.4" />
      <path d="M64 62q10 8 22 4" fill="none" stroke={P.coral} strokeOpacity="0.8" strokeWidth="5" />
      <circle cx="80" cy="46" r="4.6" fill={P.canvasLift} />
      <circle cx="79" cy="46" r="2.6" fill={P.ink} />
    </svg>
  );
};

/** Rhinoceros iguana — endemic to Hispaniola, and on half the excursions. */
export const Iguana: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 220 120" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('sk')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.palmLight} />
          <stop offset="45%" stopColor="#6F7F49" />
          <stop offset="100%" stopColor={P.palmDark} />
        </linearGradient>
      </defs>
      <path d="M30 90q-4-22 18-28 28-8 56-4 24 4 40-6 20-12 42-2-18 8-24 22-8 18-32 24-40 10-72 4-20-4-28-10Z" fill={P.palmDark} opacity="0.26" transform="translate(4 5)" />
      <path d="M30 90q-4-22 18-28 28-8 56-4 24 4 40-6 20-12 42-2-18 8-24 22-8 18-32 24-40 10-72 4-20-4-28-10Z" fill={`url(#${id('sk')})`} />
      {/* Dorsal crest */}
      <g fill={P.palmDark}>
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${48 + i * 12} ${64 - Math.sin(i / 3) * 4} l4 -12 l4 12 Z`} />
        ))}
      </g>
      {/* Scale texture, sparse on purpose */}
      <g fill={P.canvasLift} opacity="0.2">
        {Array.from({ length: 16 }, (_, i) => (
          <circle key={i} cx={46 + (i % 8) * 16} cy={80 + Math.floor(i / 8) * 11} r="3" />
        ))}
      </g>
      {/* Legs */}
      <path d="M62 102q-4 12-14 14M110 104q-2 12-12 14" stroke={P.palmDark} strokeWidth="7" strokeOpacity="0.85" />
      {/* Head */}
      <circle cx="182" cy="66" r="4.2" fill={P.mango} />
      <circle cx="182" cy="66" r="1.8" fill={P.ink} />
      <path d="M196 74q10 2 14 6-10 4-16 0Z" fill={P.ochre} />
      {/* Tail */}
      <path d="M32 88q-22 8-28 22 24-2 34-14Z" fill={P.palmDark} opacity="0.9" />
    </svg>
  );
};

/** Squirrel monkey — Monkeyland is one of the tours. */
export const Monkey: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 150 170" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('fur')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={P.mangoLight} />
          <stop offset="55%" stopColor={P.ochre} />
          <stop offset="100%" stopColor="#7A5A18" />
        </linearGradient>
      </defs>
      {/* Branch */}
      <path d="M6 44q52 16 138 8" stroke={P.palmDark} strokeOpacity="0.6" strokeWidth="9" />
      {/* Tail, curled over the branch */}
      <path d="M46 96q-32 14-30 44 2 24 26 22" stroke={`url(#${id('fur')})`} strokeWidth="11" fill="none" />
      {/* Body */}
      <path d="M52 120q-12-22 2-40 14-18 34-16 22 2 30 22 8 20-6 36-24 14-60-2Z" fill={P.ochreDark} opacity="0.3" transform="translate(4 4)" />
      <path d="M52 120q-12-22 2-40 14-18 34-16 22 2 30 22 8 20-6 36-24 14-60-2Z" fill={`url(#${id('fur')})`} />
      {/* Arms gripping */}
      <path d="M56 84q-14-14-16-34M112 84q14-14 16-34" stroke={`url(#${id('fur')})`} strokeWidth="10" />
      {/* Head */}
      <circle cx="84" cy="56" r="27" fill={`url(#${id('fur')})`} />
      <circle cx="56" cy="54" r="10" fill={P.ochre} />
      <circle cx="112" cy="54" r="10" fill={P.ochre} />
      <ellipse cx="84" cy="62" rx="19" ry="17" fill={P.canvasDeep} />
      <path d="M84 40q-16 0-21 12 12 5 21 5t21-5q-5-12-21-12Z" fill="#4A3B22" opacity="0.72" />
      <circle cx="76" cy="56" r="4.6" fill={P.ink} />
      <circle cx="92" cy="56" r="4.6" fill={P.ink} />
      <circle cx="74.6" cy="54.6" r="1.4" fill={P.canvasLift} />
      <circle cx="90.6" cy="54.6" r="1.4" fill={P.canvasLift} />
      <path d="M78 72q6 5 12 0" stroke={P.ink} strokeOpacity="0.55" strokeWidth="2.2" />
    </svg>
  );
};

/** Green turtle, seen from above and slightly behind. */
export const Turtle: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 180 150" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={id('sh')} cx="40%" cy="34%">
          <stop offset="0%" stopColor={P.palmLight} />
          <stop offset="55%" stopColor="#4C7E4A" />
          <stop offset="100%" stopColor={P.palmDark} />
        </radialGradient>
      </defs>
      {/* Flippers, under the shell */}
      <g fill={P.lagoonDark} opacity="0.92">
        <path d="M44 52q-32-18-40 2 10 20 40 14Z" />
        <path d="M136 52q32-18 40 2-10 20-40 14Z" />
        <path d="M56 118q-18 16-8 28 16 2 24-18Z" />
        <path d="M124 118q18 16 8 28-16 2-24-18Z" />
      </g>
      {/* Head */}
      <ellipse cx="90" cy="30" rx="18" ry="15" fill="#4C7E4A" />
      <circle cx="82" cy="27" r="3.4" fill={P.ink} />
      <circle cx="98" cy="27" r="3.4" fill={P.ink} />
      {/* Shell */}
      <ellipse cx="90" cy="86" rx="56" ry="48" fill={P.palmDark} opacity="0.3" transform="translate(4 4)" />
      <ellipse cx="90" cy="86" rx="56" ry="48" fill={`url(#${id('sh')})`} />
      {/* Scutes: a ring of six plus a centre, in ochre so they read as pattern */}
      <g fill={P.ochre} opacity="0.55">
        <ellipse cx="90" cy="86" rx="19" ry="17" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a} cx="90" cy="50" rx="12" ry="11" transform={`rotate(${a} 90 86)`} />
        ))}
      </g>
      <path d="M46 70q14-22 42-24" stroke={P.canvasLift} strokeOpacity="0.35" strokeWidth="4" />
    </svg>
  );
};

/** A reef fish. `tone` lets a shoal be painted in three related pigments. */
export const Fish: React.FC<IllustrationProps & { tone?: 'mango' | 'lagoon' | 'hibiscus' }> = ({
  className = '',
  style,
  tone = 'mango',
}) => {
  const id = useLocalIds();
  const tones = {
    mango: [P.mangoLight, P.mango, P.mangoDark],
    lagoon: [P.lagoonLight, P.lagoon, P.lagoonDark],
    hibiscus: [P.hibiscusLight, P.hibiscus, '#A82F5E'],
  }[tone];

  return (
    <svg viewBox="0 0 160 90" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('f')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tones[0]} />
          <stop offset="55%" stopColor={tones[1]} />
          <stop offset="100%" stopColor={tones[2]} />
        </linearGradient>
      </defs>
      <path d="M116 46q0 26-36 30-44 4-64-28 20-32 64-28 36 4 36 26Z" fill={tones[2]} opacity="0.28" transform="translate(4 4)" />
      <path d="M116 46q0 26-36 30-44 4-64-28 20-32 64-28 36 4 36 26Z" fill={`url(#${id('f')})`} />
      <path d="M116 46q16-18 36-24-8 24 0 48-20-6-36-24Z" fill={tones[1]} opacity="0.85" />
      <path d="M56 24q10-18 22-16-4 12-4 20Z" fill={tones[0]} opacity="0.8" />
      <g stroke={tones[2]} strokeOpacity="0.4" strokeWidth="2">
        <path d="M60 24q-4 22 2 44" />
        <path d="M78 22q-4 24 2 46" />
      </g>
      <circle cx="34" cy="38" r="6" fill={P.canvasLift} />
      <circle cx="33" cy="38" r="3.2" fill={P.ink} />
      <path d="M26 56q14 8 30 6" stroke={P.canvasLift} strokeOpacity="0.45" strokeWidth="2.6" />
    </svg>
  );
};

/** Starfish, five arms, pitted with light. */
export const Starfish: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={id('s')} cx="42%" cy="36%">
          <stop offset="0%" stopColor={P.mangoLight} />
          <stop offset="55%" stopColor={P.coralLight} />
          <stop offset="100%" stopColor={P.coralDark} />
        </radialGradient>
      </defs>
      <g transform="translate(60 62)">
        <path
          d="M0 -48 q 10 26 34 30 q -24 12 -22 38 q -12 -20 -36 -20 q 18 -16 12 -40 Z"
          fill={P.coralDark}
          opacity="0.28"
          transform="translate(4 4) rotate(12)"
        />
        <g fill={`url(#${id('s')})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d="M0 0 L-13 -20 Q0 -52 13 -20 Z" transform={`rotate(${a})`} />
          ))}
          <circle cx="0" cy="0" r="17" />
        </g>
        <g fill={P.canvasLift} opacity="0.55">
          {[0, 72, 144, 216, 288].map((a) => (
            <React.Fragment key={a}>
              <circle cx="0" cy="-24" r="2.6" transform={`rotate(${a})`} />
              <circle cx="0" cy="-34" r="2" transform={`rotate(${a})`} />
            </React.Fragment>
          ))}
          <circle cx="-4" cy="-4" r="3" />
        </g>
      </g>
    </svg>
  );
};

/** Lambi — the queen conch, which is on every Dominican menu and beach. */
export const Conch: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 140 130" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('c')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF0D8" />
          <stop offset="45%" stopColor={P.hibiscusLight} />
          <stop offset="100%" stopColor={P.coralDark} />
        </linearGradient>
      </defs>
      <path d="M26 104q-14-30 8-56 24-28 58-24 30 4 34 30 4 28-24 42-38 18-76 8Z" fill={P.coralDark} opacity="0.25" transform="translate(4 4)" />
      <path d="M26 104q-14-30 8-56 24-28 58-24 30 4 34 30 4 28-24 42-38 18-76 8Z" fill={`url(#${id('c')})`} />
      {/* The spiral, which is the whole point of a conch */}
      <path
        d="M96 44q-18-10-30 4-10 12 2 22 10 8 18-2 6-8-2-13"
        stroke={P.coralDark}
        strokeOpacity="0.45"
        strokeWidth="3"
      />
      <g stroke={P.canvasLift} strokeOpacity="0.5" strokeWidth="2.4">
        <path d="M36 92q22 8 48 0" />
        <path d="M30 76q26 10 56 0" />
      </g>
      <path d="M26 104q30 12 68-2" stroke={P.mangoLight} strokeOpacity="0.7" strokeWidth="4" />
    </svg>
  );
};

/** A sea fan — the reef's own ornament, and conveniently almost Taino. */
export const SeaFan: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 150" className={className} style={style} {...svgProps}>
    <g stroke={P.hibiscus} strokeOpacity="0.75" fill="none" strokeWidth="3">
      <path d="M70 148q0-50 0-78" />
      {[-46, -30, -14, 0, 14, 30, 46].map((a) => (
        <path key={a} d="M70 128 q 0 -44 0 -76" transform={`rotate(${a} 70 138)`} strokeWidth="2.4" />
      ))}
    </g>
    <g stroke={P.coralLight} strokeOpacity="0.55" strokeWidth="1.6" fill="none">
      {[-38, -22, -6, 10, 26, 42].map((a) => (
        <path key={a} d="M70 122 q 0 -40 0 -66" transform={`rotate(${a} 70 138)`} />
      ))}
      <path d="M30 76q40-16 80 0" />
      <path d="M36 102q34-12 68 0" />
    </g>
  </svg>
);

/** A cocktail, because half of these tours end with one. */
export const Cocktail: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 120 150" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('d')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.mangoLight} />
          <stop offset="60%" stopColor={P.coral} />
          <stop offset="100%" stopColor={P.hibiscus} />
        </linearGradient>
      </defs>
      <path d="M22 38h76l-34 40v42h22v8H34v-8h22V78Z" fill={P.shade} opacity="0.2" transform="translate(4 4)" />
      <path d="M26 40h68L62 76 28 40Z" fill={`url(#${id('d')})`} />
      <path d="M22 38h76l-34 40v42h22v8H34v-8h22V78Z" {...contour(0.3, 2.6)} />
      <path d="M32 46q22 6 46 0" stroke={P.canvasLift} strokeOpacity="0.55" strokeWidth="3" />
      {/* Slice of lime and a straw */}
      <circle cx="94" cy="36" r="14" fill={P.palmLight} />
      <circle cx="94" cy="36" r="9" fill="#D8EDBD" />
      <path d="M94 27v18M85 36h18" stroke={P.palm} strokeWidth="1.8" />
      <path d="M70 26 96 12" stroke={P.lagoon} strokeWidth="5" />
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SEA AND VESSELS
   ══════════════════════════════════════════════════════════════════════════ */

/** The catamaran that goes to Saona. */
export const Sailboat: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useLocalIds();
  return (
    <svg viewBox="0 0 180 170" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('s1')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFDF6" />
          <stop offset="70%" stopColor={P.canvasDeep} />
          <stop offset="100%" stopColor={P.shadeLight} />
        </linearGradient>
        <linearGradient id={id('s2')} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.mangoLight} />
          <stop offset="100%" stopColor={P.coral} />
        </linearGradient>
        <linearGradient id={id('hl')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.sea} />
          <stop offset="100%" stopColor={P.seaDark} />
        </linearGradient>
      </defs>
      <path d="M90 22 88 124" stroke={P.ochreDark} strokeWidth="4" strokeOpacity="0.8" />
      <path d="M86 26 34 120h52Z" fill={`url(#${id('s1')})`} />
      <path d="M86 26 34 120h52Z" {...contour(0.2, 2)} />
      <path d="M94 44l48 76H94Z" fill={`url(#${id('s2')})`} />
      <path d="M22 122h140l-20 30H42Z" fill={`url(#${id('hl')})`} />
      <path d="M26 128h132" stroke={P.lagoonLight} strokeOpacity="0.55" strokeWidth="3" />
      <path d="M42 134q30 8 62 0" stroke={P.canvasLift} strokeOpacity="0.3" strokeWidth="2.4" />
    </svg>
  );
};

/**
 * The swell. Three bands of water, back to front, painted rather than
 * scalloped — this is the shape that runs across the foot of a section.
 */
export const WaveBand: React.FC<IllustrationProps & { tone?: 'lagoon' | 'sky' | 'sunset' }> = ({
  className = '',
  style,
  tone = 'lagoon',
}) => {
  const id = useLocalIds();
  const tones = {
    lagoon: [P.lagoonLight, P.lagoon, P.lagoonDark],
    sky: [P.seaLight, P.sea, P.seaDark],
    sunset: [P.mangoLight, P.coralLight, P.coral],
  }[tone];

  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={id('w')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tones[1]} stopOpacity="0.9" />
          <stop offset="100%" stopColor={tones[2]} />
        </linearGradient>
      </defs>
      <path
        d="M0 54c120 26 240 34 360 20s240-46 360-38 240 46 360 46 240-24 360-40v78H0Z"
        fill={tones[0]}
        opacity="0.45"
      />
      <path
        d="M0 72c130 22 250 12 380-6s250-40 370-24 230 44 350 42 210-22 340-38v74H0Z"
        fill={`url(#${id('w')})`}
      />
      <path
        d="M0 84c150 18 260 4 400-14s260-26 380-10 220 34 330 32"
        stroke={P.canvasLift}
        strokeOpacity="0.35"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
};

/** The last inch of surf, where it goes to foam. */
export const FoamLine: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 400 24" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
    <path d="M0 16q40-12 80 0t80 0 80 0 80 0 80 0" stroke={P.lagoonLight} strokeOpacity="0.8" strokeWidth="3" fill="none" />
    <path d="M0 21q40-10 80 0t80 0 80 0 80 0 80 0" stroke={P.canvasLift} strokeOpacity="0.6" strokeWidth="2.4" fill="none" />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   ORNAMENT — Taino geometry, and only geometry.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * A stepped fret band, the pattern that runs round the rim of a vessel.
 *
 * Tiled with an SVG `<pattern>` rather than drawn N times across a stretched
 * viewBox: stretching meant the motif got wider as the element did, so the
 * same band was six fat steps in a footer and forty thin ones in a card. A
 * pattern keeps the motif at a fixed size and simply repeats it however far it
 * has to go.
 */
export const TainoBand: React.FC<IllustrationProps & { tone?: 'ochre' | 'lagoon' }> = ({
  className = '',
  style,
  tone = 'ochre',
}) => {
  const id = useLocalIds();
  const colour = tone === 'ochre' ? P.ochreDark : P.lagoonDark;
  return (
    <svg className={className} style={style} {...svgProps}>
      <defs>
        <pattern id={id('fret')} width="40" height="28" patternUnits="userSpaceOnUse">
          <path
            d="M4 24 v-8 h10 v-8 h10 v8 h10 v8"
            fill="none"
            stroke={colour}
            strokeOpacity="0.55"
            strokeWidth="2.6"
          />
          <circle cx="24" cy="6" r="2.6" fill={colour} opacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id('fret')})`} />
    </svg>
  );
};

/**
 * A concentric spiral rosette — the commonest motif on Taino pottery, and an
 * abstract one. Used as a corner ornament and a section marker.
 */
export const TainoSpiral: React.FC<IllustrationProps & { tone?: 'ochre' | 'lagoon' | 'coral' }> = ({
  className = '',
  style,
  tone = 'ochre',
}) => {
  const colour = { ochre: P.ochreDark, lagoon: P.lagoonDark, coral: P.coralDark }[tone];
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} {...svgProps}>
      <g stroke={colour} strokeOpacity="0.42" fill="none">
        <circle cx="50" cy="50" r="44" strokeWidth="2" strokeDasharray="6 7" />
        <circle cx="50" cy="50" r="34" strokeWidth="2.6" />
        <path
          d="M50 22a28 28 0 1 1-27 35 20 20 0 1 0 22-25 13 13 0 1 0-12 17"
          strokeWidth="3"
        />
      </g>
      <circle cx="50" cy="50" r="4" fill={colour} opacity="0.55" />
    </svg>
  );
};
