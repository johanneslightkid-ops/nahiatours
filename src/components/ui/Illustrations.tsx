import React from 'react';

/**
 * Flat-vector illustration set.
 *
 * Every drawing here follows the same rules as the rest of the design system:
 * flat fills from the poster palette, one ink outline weight, no gradients and
 * no photographic detail. They are decorative, so each is `aria-hidden` and
 * inherits sizing from the caller's className.
 */

export const INK = '#1E2A3A';

const PALETTE = {
  mango: '#FFA62B',
  mangoLight: '#FFC861',
  hibiscus: '#FF5D73',
  hibiscusLight: '#FF9AA8',
  lagoon: '#21C0B7',
  lagoonLight: '#7FE3DA',
  sky: '#4CC3F0',
  skyLight: '#A5E4FF',
  jungle: '#2FA84F',
  jungleLight: '#7BD389',
  sunset: '#FF7A45',
  paper: '#FFF6E5',
  cream: '#FFFDF7',
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

/* ── Sun ─────────────────────────────────────────────────────────────────
   Twelve tapered rays around a flat disc. The rays sit in their own group so
   a caller can spin them slowly without moving the disc. */
export const SunBurst: React.FC<IllustrationProps & { spin?: boolean }> = ({
  className = '',
  style,
  spin = false,
}) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <g
      className={spin ? 'animate-spin-slow' : undefined}
      style={{ transformOrigin: '60px 60px' }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <path
          key={i}
          d="M60 6 L66 26 L54 26 Z"
          fill={PALETTE.mangoLight}
          stroke={INK}
          strokeWidth={3}
          transform={`rotate(${i * 30} 60 60)`}
        />
      ))}
    </g>
    <circle cx="60" cy="60" r="30" fill={PALETTE.mango} stroke={INK} strokeWidth={3.5} />
    <path
      d="M46 52 C50 44 58 44 62 50"
      stroke={PALETTE.cream}
      strokeWidth={3}
      opacity={0.7}
    />
  </svg>
);

/* ── Cloud ───────────────────────────────────────────────────────────── */
export const Cloud: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 70" className={className} style={style} {...svgProps}>
    <path
      d="M24 62 C10 62 4 48 14 40 C8 26 24 14 36 22 C42 6 66 4 72 20 C88 12 104 26 98 40 C112 44 110 62 94 62 Z"
      fill={PALETTE.cream}
      stroke={INK}
      strokeWidth={3.5}
    />
  </svg>
);

/* ── Palm frond ──────────────────────────────────────────────────────────
   A stem with leaflets stepped down both sides — the workhorse decoration
   for section corners. */
export const PalmFrond: React.FC<IllustrationProps & { color?: keyof typeof PALETTE }> = ({
  className = '',
  style,
  color = 'jungle',
}) => {
  const leaflets = Array.from({ length: 7 }).map((_, i) => {
    const y = 16 + i * 11;
    const spread = 34 - i * 2.5;
    return (
      <g key={i}>
        <path
          d={`M50 ${y} C ${50 - spread * 0.6} ${y - 7} ${50 - spread} ${y + 1} ${50 - spread - 8} ${y + 13} C ${50 - spread * 0.7} ${y + 11} ${50 - spread * 0.25} ${y + 7} 50 ${y}`}
          fill={PALETTE[color]}
          stroke={INK}
          strokeWidth={2.5}
        />
        <path
          d={`M50 ${y} C ${50 + spread * 0.6} ${y - 7} ${50 + spread} ${y + 1} ${50 + spread + 8} ${y + 13} C ${50 + spread * 0.7} ${y + 11} ${50 + spread * 0.25} ${y + 7} 50 ${y}`}
          fill={PALETTE[color]}
          stroke={INK}
          strokeWidth={2.5}
        />
      </g>
    );
  });

  return (
    <svg viewBox="0 0 100 110" className={className} style={style} {...svgProps}>
      {leaflets}
      <path d="M50 8 C48 40 49 74 50 104" stroke={INK} strokeWidth={4} />
    </svg>
  );
};

/* ── Palm tree ───────────────────────────────────────────────────────── */
export const PalmTree: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 160" className={className} style={style} {...svgProps}>
    <path
      d="M58 156 C56 120 54 90 44 58 L62 54 C68 88 68 122 70 156 Z"
      fill="#A9713F"
      stroke={INK}
      strokeWidth={3.5}
    />
    {[0, 1, 2, 3, 4].map((i) => (
      <path
        key={i}
        d="M54 54 C34 40 18 42 6 54 C22 52 36 56 54 54 Z"
        fill={i % 2 === 0 ? PALETTE.jungle : PALETTE.jungleLight}
        stroke={INK}
        strokeWidth={3}
        transform={`rotate(${-72 + i * 36} 54 54)`}
      />
    ))}
    <circle cx="54" cy="54" r="7" fill={PALETTE.mango} stroke={INK} strokeWidth={3} />
  </svg>
);

/* ── Toucan ──────────────────────────────────────────────────────────── */
export const Toucan: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 130 110" className={className} style={style} {...svgProps}>
    <path
      d="M96 96 C74 104 48 96 42 74 C36 52 50 32 70 30 C92 28 104 46 102 66 C101 78 100 88 96 96 Z"
      fill="#2B3B4E"
      stroke={INK}
      strokeWidth={3.5}
    />
    <path
      d="M62 44 C50 52 48 70 58 82 C66 92 80 92 88 86 C74 80 66 62 62 44 Z"
      fill={PALETTE.paper}
      stroke={INK}
      strokeWidth={3}
    />
    <path
      d="M56 40 C36 34 14 40 8 52 C18 62 40 64 58 56 Z"
      fill={PALETTE.mango}
      stroke={INK}
      strokeWidth={3.5}
    />
    <path d="M22 44 C30 46 44 48 56 48" stroke={INK} strokeWidth={2.5} />
    <path
      d="M100 62 C114 60 124 70 120 82 C112 78 104 72 100 62 Z"
      fill={PALETTE.hibiscus}
      stroke={INK}
      strokeWidth={3}
    />
    <circle cx="72" cy="44" r="6" fill={PALETTE.cream} stroke={INK} strokeWidth={2.5} />
    <circle cx="72" cy="44" r="2.4" fill={INK} />
  </svg>
);

/* ── Hibiscus ────────────────────────────────────────────────────────── */
export const Hibiscus: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 100 100" className={className} style={style} {...svgProps}>
    {[0, 1, 2, 3, 4].map((i) => (
      <ellipse
        key={i}
        cx="50"
        cy="27"
        rx="17"
        ry="22"
        fill={i % 2 === 0 ? PALETTE.hibiscus : PALETTE.hibiscusLight}
        stroke={INK}
        strokeWidth={3}
        transform={`rotate(${i * 72} 50 50)`}
      />
    ))}
    <circle cx="50" cy="50" r="10" fill={PALETTE.mangoLight} stroke={INK} strokeWidth={3} />
    <path d="M50 50 L64 34" stroke={INK} strokeWidth={3} />
    <circle cx="66" cy="32" r="4" fill={PALETTE.mango} stroke={INK} strokeWidth={2.5} />
  </svg>
);

/* ── Pineapple ───────────────────────────────────────────────────────── */
export const Pineapple: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 90 130" className={className} style={style} {...svgProps}>
    <path
      d="M45 36 C22 36 14 58 16 82 C18 106 30 122 45 122 C60 122 72 106 74 82 C76 58 68 36 45 36 Z"
      fill={PALETTE.mango}
      stroke={INK}
      strokeWidth={3.5}
    />
    {[0, 1, 2, 3].map((i) => (
      <path key={`a${i}`} d={`M18 ${52 + i * 18} L72 ${68 + i * 18}`} stroke={INK} strokeWidth={2} opacity={0.65} />
    ))}
    {[0, 1, 2, 3].map((i) => (
      <path key={`b${i}`} d={`M18 ${68 + i * 18} L72 ${50 + i * 18}`} stroke={INK} strokeWidth={2} opacity={0.65} />
    ))}
    <path
      d="M45 38 C40 22 32 12 22 6 C34 8 40 14 45 22 C50 14 56 8 68 6 C58 12 50 22 45 38 Z"
      fill={PALETTE.jungle}
      stroke={INK}
      strokeWidth={3.5}
    />
  </svg>
);

/* ── Sailboat ────────────────────────────────────────────────────────── */
export const Sailboat: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <path d="M60 12 L60 84" stroke={INK} strokeWidth={4} />
    <path d="M56 20 L20 78 L56 78 Z" fill={PALETTE.cream} stroke={INK} strokeWidth={3.5} />
    <path d="M66 34 L98 78 L66 78 Z" fill={PALETTE.hibiscus} stroke={INK} strokeWidth={3.5} />
    <path
      d="M12 84 L108 84 L92 104 C86 110 34 110 28 104 Z"
      fill={PALETTE.mango}
      stroke={INK}
      strokeWidth={3.5}
    />
  </svg>
);

/* ── Starfish ────────────────────────────────────────────────────────── */
export const Starfish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 100 100" className={className} style={style} {...svgProps}>
    <path
      d="M50 8 C55 8 58 12 60 20 L66 38 L86 40 C94 41 98 46 96 52 C95 57 90 59 84 62 L70 72 L74 90 C76 98 72 102 66 100 C61 99 57 95 50 90 C43 95 39 99 34 100 C28 102 24 98 26 90 L30 72 L16 62 C10 59 5 57 4 52 C2 46 6 41 14 40 L34 38 L40 20 C42 12 45 8 50 8 Z"
      fill={PALETTE.mangoLight}
      stroke={INK}
      strokeWidth={3.5}
    />
    <circle cx="50" cy="52" r="3.5" fill={INK} opacity={0.5} />
    <circle cx="38" cy="42" r="2.6" fill={INK} opacity={0.35} />
    <circle cx="62" cy="42" r="2.6" fill={INK} opacity={0.35} />
  </svg>
);

/* ── Cocktail ────────────────────────────────────────────────────────── */
export const Cocktail: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 100 120" className={className} style={style} {...svgProps}>
    <path d="M18 26 L82 26 L54 62 L46 62 Z" fill={PALETTE.lagoonLight} stroke={INK} strokeWidth={3.5} />
    <path d="M24 34 L76 34" stroke={INK} strokeWidth={2.5} opacity={0.5} />
    <path d="M50 62 L50 98" stroke={INK} strokeWidth={4} />
    <path d="M28 104 L72 104" stroke={INK} strokeWidth={4.5} />
    <path d="M66 12 L54 44" stroke={PALETTE.hibiscus} strokeWidth={5} />
    <circle cx="70" cy="26" r="11" fill={PALETTE.mango} stroke={INK} strokeWidth={3} />
    <path d="M70 15 L70 37" stroke={INK} strokeWidth={2} opacity={0.6} />
  </svg>
);

/* ── Fish ────────────────────────────────────────────────────────────── */
export const Fish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 70" className={className} style={style} {...svgProps}>
    <path
      d="M30 35 C42 12 78 10 96 22 C108 30 108 40 96 48 C78 60 42 58 30 35 Z"
      fill={PALETTE.sky}
      stroke={INK}
      strokeWidth={3.5}
    />
    <path d="M30 35 L8 16 L14 35 L8 54 Z" fill={PALETTE.skyLight} stroke={INK} strokeWidth={3.5} />
    <path d="M62 14 L70 30" stroke={INK} strokeWidth={3} />
    <path d="M62 56 L70 40" stroke={INK} strokeWidth={3} />
    <circle cx="88" cy="30" r="4.5" fill={PALETTE.cream} stroke={INK} strokeWidth={2.5} />
  </svg>
);

/* ── Bird pair ───────────────────────────────────────────────────────────
   Two ink strokes — the shorthand for "sky" in a flat illustration. */
export const Birds: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 50" className={className} style={style} {...svgProps}>
    <path d="M8 26 C18 12 26 12 34 24 C42 12 50 12 60 26" stroke={INK} strokeWidth={3.5} />
    <path d="M64 40 C72 30 78 30 84 38 C90 30 96 30 104 40" stroke={INK} strokeWidth={3} opacity={0.75} />
  </svg>
);

/* ── Wave band ───────────────────────────────────────────────────────────
   Three stacked crests used to close a section or head a footer. Stretches to
   any width via preserveAspectRatio. */
export const WaveBand: React.FC<IllustrationProps & { tone?: 'lagoon' | 'sky' }> = ({
  className = '',
  style,
  tone = 'lagoon',
}) => {
  const back = tone === 'lagoon' ? PALETTE.lagoonLight : PALETTE.skyLight;
  const front = tone === 'lagoon' ? PALETTE.lagoon : PALETTE.sky;
  return (
    <svg
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      className={className}
      style={style}
      {...svgProps}
    >
      <path
        d="M0 46 C120 12 240 78 360 52 C480 26 600 78 720 56 C840 34 960 74 1080 52 C1140 41 1170 44 1200 40 L1200 120 L0 120 Z"
        fill={back}
      />
      <path
        d="M0 74 C120 44 240 100 360 78 C480 56 600 100 720 82 C840 64 960 96 1080 78 C1140 69 1170 72 1200 68 L1200 120 L0 120 Z"
        fill={front}
        stroke={INK}
        strokeWidth={3}
      />
    </svg>
  );
};

/* ── Sea foam line ───────────────────────────────────────────────────────
   A single drawn crest with dashes above it, for use as a divider. */
export const FoamLine: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 400 40" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
    <path
      d="M0 26 C50 8 90 40 140 24 C190 8 230 38 280 24 C330 10 360 30 400 20"
      stroke={INK}
      strokeWidth={4}
    />
    <path d="M40 12 L58 12 M150 8 L172 8 M280 10 L300 10" stroke={INK} strokeWidth={3.5} opacity={0.45} />
  </svg>
);

export default {
  SunBurst,
  Cloud,
  PalmFrond,
  PalmTree,
  Toucan,
  Hibiscus,
  Pineapple,
  Sailboat,
  Starfish,
  Cocktail,
  Fish,
  Birds,
  WaveBand,
  FoamLine,
};
