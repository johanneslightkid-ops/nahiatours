import React from 'react';

/**
 * La Galería's drawings.
 *
 * Painted the way the Dominican masters paint the island: flat, saturated
 * colour inside a confident indigo contour, the sun drawn as a disc with a
 * crown of rays, birds as a few calligraphic strokes, leaves as broad
 * blades. The idea is Cándido Bidó's — a world reduced to its brightest
 * shapes and outlined with love — not a copy of any one painting.
 *
 * The animals and plants are the island's own: the cigua palmera (the
 * national bird) and the cotorra, the Hispaniolan emerald, frigatebirds
 * over Bávaro, the flamingos of Oviedo, the humpbacks of Samaná, cayenas
 * and flamboyán, the reef below.
 *
 * Every drawing is decorative (`aria-hidden`) and takes its size from the
 * caller's className. The export names are the ones the rest of the site
 * already asks for, so nothing outside this file needs to know the style
 * changed.
 */

export const INK = '#1D2346';

const C = {
  ink: '#1D2346',
  canvas: '#FFFBF3',
  sun: '#F5B921',
  sunLight: '#FFDD6E',
  sunPale: '#FFF3B0',
  flame: '#E5482F',
  flameLight: '#FF9E8A',
  flameDark: '#B3301D',
  larimar: '#3FAFC9',
  larimarLight: '#A9E4EE',
  larimarDark: '#1F7D94',
  ultramar: '#2F4FD1',
  ultramarLight: '#A9BAF5',
  ultramarDark: '#1A2F94',
  cane: '#4F9136',
  caneLight: '#B4D98A',
  caneDark: '#2F611E',
  mamey: '#EE7A3C',
  bouga: '#BF3A8F',
  bougaLight: '#F2AEDB',
  bark: '#8A5A36',
  barkLight: '#C08A5A',
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

/** The painter's line. */
const line = (width = 3) => ({ stroke: C.ink, strokeWidth: width });

/* ══════════════════════════════════════════════════════════════════════════
   Leaves and flowers
   ══════════════════════════════════════════════════════════════════════════ */

/** Monstera: a broad heart with its windows, as flat as a cut-out. */
export const MonsteraLeaf: React.FC<IllustrationProps & { tone?: 'deep' | 'fresh' }> = ({ className = '', style, tone = 'deep' }) => (
  <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
    <path
      fillRule="evenodd"
      d="M100 190 C52 176 14 136 14 88 C14 44 50 12 96 14 C146 16 186 52 186 98 C186 144 150 178 100 190 Z
         M70 70 C78 60 88 58 92 66 C86 74 76 78 70 70 Z M126 64 C134 58 144 62 142 72 C134 76 126 72 126 64 Z
         M58 118 C66 108 78 110 80 118 C72 126 62 126 58 118 Z M132 116 C140 108 152 112 150 122 C142 128 132 124 132 116 Z"
      fill={tone === 'fresh' ? C.caneLight : C.cane}
      {...line(4)}
    />
    <path d="M100 190 C100 140 100 80 96 14" {...line(3.5)} />
    <path d="M100 150 C76 140 50 128 30 104 M100 150 C126 140 152 126 172 102 M99 100 C80 92 60 78 46 56 M99 100 C120 90 140 76 152 54" stroke={tone === 'fresh' ? C.cane : C.caneDark} strokeWidth={3} />
  </svg>
);

/** A palm frond: a spine and a comb of blades, painted in one sweep. */
export const PalmFrond: React.FC<IllustrationProps & { color?: 'jungle' | 'jungleLight' | 'deep' }> = ({ className = '', style, color = 'jungle' }) => {
  const fill = color === 'jungleLight' ? C.caneLight : color === 'deep' ? C.caneDark : C.cane;
  const blades = Array.from({ length: 13 }, (_, i) => {
    const t = (i + 1) / 14;
    const x = 12 + t * 170;
    const y = 190 - t * 160 + Math.sin(t * Math.PI) * -30;
    const len = 52 * Math.sin(t * Math.PI) + 14;
    return { x, y, len, i };
  });
  return (
    <svg viewBox="0 0 200 200" overflow="visible" className={className} style={style} {...svgProps}>
      {blades.map(({ x, y, len, i }) => (
        <g key={i}>
          <path d={`M${x} ${y} q ${-len * 0.2} ${-len * 0.7} ${-len * 0.55} ${-len} q ${len * 0.25} ${len * 0.45} ${len * 0.55} ${len} Z`} fill={fill} {...line(2.4)} />
          <path d={`M${x} ${y} q ${len * 0.7} ${len * 0.15} ${len} ${len * 0.5} q ${-len * 0.5} ${-len * 0.05} ${-len} ${-len * 0.5} Z`} fill={fill} {...line(2.4)} />
        </g>
      ))}
      <path d="M12 190 C70 150 120 80 192 26" {...line(4)} />
    </svg>
  );
};

/** A fern frond, upright. */
export const Fern: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
    {Array.from({ length: 9 }, (_, i) => {
      const y = 180 - i * 19;
      const w = 64 - i * 6;
      return (
        <g key={i}>
          <path d={`M100 ${y} C${100 - w * 0.4} ${y - 14} ${100 - w} ${y - 10} ${100 - w} ${y - 4} C${100 - w * 0.6} ${y + 2} ${100 - w * 0.2} ${y + 2} 100 ${y} Z`} fill={i % 2 ? C.cane : C.caneLight} {...line(2.2)} />
          <path d={`M100 ${y} C${100 + w * 0.4} ${y - 14} ${100 + w} ${y - 10} ${100 + w} ${y - 4} C${100 + w * 0.6} ${y + 2} ${100 + w * 0.2} ${y + 2} 100 ${y} Z`} fill={i % 2 ? C.caneLight : C.cane} {...line(2.2)} />
        </g>
      );
    })}
    <path d="M100 196 C98 140 102 70 108 10" {...line(3.5)} />
  </svg>
);

/** A banana leaf, torn by the wind into a few strips. */
export const BananaLeaf: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
    <path d="M30 186 C40 120 80 48 176 14 C172 44 160 70 146 86 L132 80 L138 96 C124 116 108 130 92 140 L84 128 L84 150 C66 162 48 174 30 186 Z" fill={C.cane} {...line(4)} />
    <path d="M30 186 C70 140 120 70 176 14" stroke={C.caneLight} strokeWidth={5} />
    <path d="M30 186 C70 140 120 70 176 14" {...line(2)} />
  </svg>
);

/** Heliconia — the bird-of-paradise of the roadside, red and gold. */
export const Heliconia: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 200" className={className} style={style} {...svgProps}>
    <path d="M60 196 C58 140 62 80 60 20" {...line(4)} />
    {[0, 1, 2, 3, 4].map((i) => {
      const y = 40 + i * 30;
      const left = i % 2 === 0;
      return (
        <path
          key={i}
          d={left ? `M60 ${y} C40 ${y - 6} 22 ${y - 22} 16 ${y - 34} C34 ${y - 30} 50 ${y - 18} 60 ${y - 6} Z` : `M60 ${y} C80 ${y - 6} 98 ${y - 22} 104 ${y - 34} C86 ${y - 30} 70 ${y - 18} 60 ${y - 6} Z`}
          fill={C.flame}
          {...line(3)}
        />
      );
    })}
    {[0, 1, 2, 3, 4].map((i) => (
      <path key={`t${i}`} d={`M${i % 2 === 0 ? 22 : 98} ${8 + i * 30} l ${i % 2 === 0 ? 8 : -8} 4`} stroke={C.sun} strokeWidth={4} />
    ))}
  </svg>
);

/** Cayena: the five-petalled hibiscus on every patio wall. */
export const Hibiscus: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    {[0, 72, 144, 216, 288].map((angle) => (
      <path
        key={angle}
        d="M60 60 C46 46 40 22 52 12 C60 6 70 8 74 16 C80 30 72 48 60 60 Z"
        fill={C.flame}
        {...line(3)}
        transform={`rotate(${angle} 60 60)`}
      />
    ))}
    <circle cx="60" cy="60" r="9" fill={C.flameDark} {...line(2.5)} />
    <path d="M60 60 C70 50 80 40 90 30" stroke={C.sun} strokeWidth={4} />
    <circle cx="92" cy="28" r="4.5" fill={C.sun} {...line(2)} />
  </svg>
);

/** A pineapple from the market cart, crown and all. */
export const Pineapple: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 100 160" className={className} style={style} {...svgProps}>
    {[-30, -12, 0, 12, 30].map((angle, i) => (
      <path key={i} d="M50 62 C44 46 46 26 50 8 C54 26 56 46 50 62 Z" fill={i % 2 ? C.caneLight : C.cane} {...line(2.5)} transform={`rotate(${angle} 50 62)`} />
    ))}
    <ellipse cx="50" cy="106" rx="30" ry="44" fill={C.sun} {...line(3.5)} />
    <path d="M26 82 L74 130 M22 104 L60 146 M34 68 L80 112 M74 82 L26 130 M78 104 L40 146 M66 68 L20 112" stroke={C.mamey} strokeWidth={2.5} />
  </svg>
);

/** Not a cocktail: a cup of café, the island's real welcome. */
export const Cocktail: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <path d="M40 30 C34 22 46 18 42 10 M58 30 C52 22 64 18 60 10 M76 30 C70 22 82 18 78 10" stroke={C.ink} strokeOpacity={0.55} strokeWidth={3} />
    <path d="M22 42 L98 42 L90 92 C88 100 80 104 72 104 L48 104 C40 104 32 100 30 92 Z" fill={C.canvas} {...line(3.5)} />
    <path d="M26 56 L94 56" stroke={C.ultramar} strokeWidth={5} />
    <path d="M28 66 L92 66" stroke={C.flame} strokeWidth={5} />
    <path d="M96 52 C112 52 112 76 94 78" {...line(3.5)} />
    <path d="M14 110 L106 110" {...line(3.5)} />
    <ellipse cx="60" cy="44" rx="34" ry="5" fill={C.bark} {...line(2)} />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   Sea and shore
   ══════════════════════════════════════════════════════════════════════════ */

/** A fishing boat with a patched sail. */
export const Sailboat: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <path d="M58 14 L58 84" {...line(3.5)} />
    <path d="M60 18 C82 34 92 58 94 78 L60 78 Z" fill={C.canvas} {...line(3)} />
    <path d="M62 52 L92 60 L93 70 L62 64 Z" fill={C.flame} />
    <path d="M56 26 C40 42 30 60 28 78 L56 78 Z" fill={C.sun} {...line(3)} />
    <path d="M14 86 L106 86 C102 98 92 104 80 104 L36 104 C26 104 18 98 14 86 Z" fill={C.ultramar} {...line(3.5)} />
    <path d="M24 94 L96 94" stroke={C.sunLight} strokeWidth={3} />
    <path d="M4 112 C16 106 26 116 38 110 C50 104 60 116 72 110 C84 104 94 116 106 110 C110 108 114 108 118 110" stroke={C.larimar} strokeWidth={3.5} />
  </svg>
);

/** A conch, the queen of the beach market. */
export const Conch: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <path d="M20 80 C14 50 40 20 72 18 C96 16 108 34 102 52 C98 66 84 72 74 80 C64 90 58 104 44 104 C32 104 24 94 20 80 Z" fill={C.flameLight} {...line(3.5)} />
    <path d="M40 70 C50 56 66 48 84 48" stroke={C.flame} strokeWidth={4} />
    <path d="M32 84 C42 74 56 70 70 70" stroke={C.flame} strokeWidth={3} />
    <path d="M72 18 L80 6 M90 22 L100 12 M102 38 L114 34" {...line(3)} />
  </svg>
);

/** A starfish, a little lopsided, as a child would paint one. */
export const Starfish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <path
      d="M60 8 C66 30 70 40 88 44 C110 48 112 52 94 64 C80 74 82 84 88 108 C68 94 60 92 40 108 C44 86 44 76 28 64 C10 52 14 48 34 44 C52 40 56 30 60 8 Z"
      fill={C.mamey}
      {...line(3.5)}
    />
    {[
      [60, 30],
      [80, 52],
      [72, 82],
      [48, 82],
      [40, 52],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="3" fill={C.sunLight} />
    ))}
  </svg>
);

/** A seashell-pink ribbon of foam along the shore. */
export const FoamLine: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 160 24" className={className} style={style} {...svgProps}>
    <path d="M4 14 C20 4 34 22 50 12 C66 2 80 22 96 12 C112 2 126 22 142 12 C148 8 152 10 156 12" stroke={C.larimar} strokeWidth={4} />
    <path d="M4 14 C20 4 34 22 50 12 C66 2 80 22 96 12 C112 2 126 22 142 12 C148 8 152 10 156 12" {...line(1.5)} />
    <circle cx="80" cy="12" r="3.5" fill={C.flame} {...line(1.5)} />
  </svg>
);

/** Waves as a painted band, for the foot of a section. */
export const WaveBand: React.FC<IllustrationProps & { tone?: 'lagoon' | 'sky' | 'abyss' }> = ({ className = '', style, tone = 'lagoon' }) => {
  const fill = tone === 'abyss' ? '#141A3C' : tone === 'sky' ? C.ultramar : C.larimar;
  return (
    <svg viewBox="0 0 1200 80" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
      <path d="M0 40 C100 10 200 70 300 40 C400 10 500 70 600 40 C700 10 800 70 900 40 C1000 10 1100 70 1200 40 L1200 80 L0 80 Z" fill={fill} />
      <path d="M0 40 C100 10 200 70 300 40 C400 10 500 70 600 40 C700 10 800 70 900 40 C1000 10 1100 70 1200 40" {...line(4)} />
    </svg>
  );
};

/** The sun, Bidó's way: a disc, a ring, a crown of rays. */
export const SunBurst: React.FC<IllustrationProps & { spin?: boolean }> = ({ className = '', style, spin = false }) => (
  <svg viewBox="0 0 120 120" overflow="visible" className={className} style={style} {...svgProps}>
    <g className={spin ? 'animate-spin-slow' : undefined} style={{ transformOrigin: '60px 60px' }}>
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d="M60 4 L66 22 L54 22 Z" fill={i % 2 ? C.sun : C.mamey} {...line(2)} transform={`rotate(${i * 22.5} 60 60)`} />
      ))}
    </g>
    <circle cx="60" cy="60" r="34" fill={C.sun} {...line(3.5)} />
    <circle cx="60" cy="60" r="22" fill={C.sunLight} />
    <circle cx="60" cy="60" r="11" fill={C.sunPale} />
  </svg>
);

/** A cloud as a child paints it: three bumps and a flat bottom. */
export const Cloud: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 60" className={className} style={style} {...svgProps}>
    <path d="M14 50 C2 50 4 32 18 32 C18 16 40 12 48 24 C54 8 82 8 86 26 C100 20 116 32 106 50 Z" fill={C.canvas} {...line(3)} />
  </svg>
);

/** A royal palm, curving toward the light, with a bold crown. */
export const PalmTree: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 200 300" overflow="visible" className={className} style={style} {...svgProps}>
    <path d="M74 300 C78 230 88 160 114 94 L128 98 C104 160 96 230 96 300 Z" fill={C.barkLight} {...line(4)} />
    {[130, 160, 190, 220, 250, 280].map((y, i) => (
      <path key={i} d={`M${82 + (300 - y) * 0.12} ${y} L${100 + (300 - y) * 0.1} ${y - 4}`} stroke={C.bark} strokeWidth={3} />
    ))}
    {[
      'M120 96 C150 60 182 56 198 74 C170 70 146 80 122 100 Z',
      'M120 96 C140 50 170 30 192 36 C164 46 144 66 122 100 Z',
      'M120 96 C110 50 120 18 140 6 C130 36 128 64 124 100 Z',
      'M120 96 C90 56 60 50 38 62 C66 64 92 78 118 100 Z',
      'M120 96 C84 76 50 84 30 106 C60 94 90 94 118 102 Z',
      'M120 96 C150 90 178 104 190 128 C164 112 140 106 122 104 Z',
    ].map((d, i) => (
      <path key={i} d={d} fill={i % 2 ? C.cane : C.caneDark} {...line(3)} />
    ))}
    <circle cx="118" cy="104" r="6" fill={C.bark} {...line(2.5)} />
    <circle cx="128" cy="106" r="5" fill={C.bark} {...line(2.5)} />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   Birds
   ══════════════════════════════════════════════════════════════════════════ */

/** The cotorra, the Hispaniolan parrot: green, a white brow, a red throat. */
export const Parrot: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 140" className={className} style={style} {...svgProps}>
    <path d="M56 134 C58 118 60 106 64 96" {...line(3)} />
    <path d="M44 120 C34 92 36 60 56 40 C70 26 92 30 96 48 C100 66 92 92 72 112 C64 120 54 124 44 120 Z" fill={C.cane} {...line(3.5)} />
    <path d="M52 70 C60 84 62 100 58 116" stroke={C.ultramar} strokeWidth={6} />
    <path d="M84 58 C92 62 96 70 92 78 C86 74 82 68 84 58 Z" fill={C.flame} {...line(2.5)} />
    <path d="M70 36 C80 32 90 36 94 44 C86 44 78 42 70 36 Z" fill={C.canvas} {...line(2.5)} />
    <path d="M94 48 C106 48 112 56 106 66 C102 60 98 56 94 56 Z" fill={C.sunLight} {...line(3)} />
    <circle cx="84" cy="48" r="4.5" fill={C.canvas} {...line(2)} />
    <circle cx="85" cy="48" r="2" fill={C.ink} />
    <path d="M22 132 L100 132" stroke={C.bark} strokeWidth={6} />
    <path d="M22 132 L100 132" {...line(2)} />
  </svg>
);

/** The cigua palmera, the national bird — where the old drawing had a toucan. */
export const Toucan: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 140" className={className} style={style} {...svgProps}>
    <path d="M30 126 L100 126" stroke={C.bark} strokeWidth={6} />
    <path d="M30 126 L100 126" {...line(2)} />
    <path d="M44 116 C36 92 40 64 62 50 C78 40 96 48 96 66 C96 88 82 106 62 116 Z" fill={C.cane} {...line(3.5)} />
    <path d="M50 74 C60 86 66 100 64 114" stroke={C.canvas} strokeWidth={4} strokeDasharray="2 7" />
    <path d="M58 60 C66 70 70 84 68 100" stroke={C.canvas} strokeWidth={4} strokeDasharray="2 7" />
    <path d="M44 116 L28 134 L50 122 Z" fill={C.caneDark} {...line(3)} />
    <path d="M94 60 L108 66 L94 70 Z" fill={C.sun} {...line(2.5)} />
    <circle cx="84" cy="60" r="4.5" fill={C.canvas} {...line(2)} />
    <circle cx="85" cy="60" r="2" fill={C.flame} />
  </svg>
);

/** The Hispaniolan emerald, a hummingbird; wings blur when it hovers. */
export const Hummingbird: React.FC<IllustrationProps & { flutter?: boolean }> = ({ className = '', style, flutter = true }) => (
  <svg viewBox="0 0 120 80" className={className} style={style} {...svgProps}>
    <g className={flutter ? 'wing-flutter' : undefined} style={{ transformOrigin: '56px 40px' }}>
      <path d="M56 40 C46 18 54 4 74 2 C72 18 66 30 56 40 Z" fill={C.larimarLight} {...line(2.5)} />
    </g>
    <path d="M24 46 C34 34 52 32 70 38 C80 42 84 50 76 54 C62 60 40 58 24 46 Z" fill={C.cane} {...line(3)} />
    <path d="M24 46 L4 40 L10 52 Z" fill={C.caneDark} {...line(2.5)} />
    <path d="M58 46 C64 50 70 52 76 50" stroke={C.flame} strokeWidth={4} />
    <path d="M78 42 L116 36" {...line(2.5)} />
    <circle cx="72" cy="42" r="2.2" fill={C.ink} />
  </svg>
);

/** A frigatebird: two long calligraphic wings and a red throat. */
export const Frigatebird: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 50" className={className} style={style} {...svgProps}>
    <path
      d="M60 26 C50 20 40 12 28 8 C18 6 8 10 2 16 C14 14 26 18 36 24 C44 28 52 30 56 30 L58 40 L55 49 L60 43 L65 49 L62 40 L64 30 C68 30 76 28 84 24 C94 18 106 14 118 16 C112 10 102 6 92 8 C80 12 70 20 60 26 Z"
      fill="currentColor"
    />
    <circle cx="60" cy="29" r="2.6" fill={C.flame} />
  </svg>
);

/** A loose V of birds, three strokes each, as on Bidó's skies. */
export const Birds: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 40" className={className} style={style} {...svgProps}>
    <g stroke="currentColor" strokeWidth={3}>
      <path d="M8 22 Q16 12 24 22 Q32 12 40 22" />
      <path d="M52 12 Q58 4 64 12 Q70 4 76 12" />
      <path d="M86 26 Q92 18 98 26 Q104 18 110 26" />
    </g>
  </svg>
);

/** A flamingo from the lagoon at Oviedo, on one leg. */
export const Flamingo: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 100 160" className={className} style={style} {...svgProps}>
    <path d="M50 96 L50 156 M50 124 L62 112" {...line(3)} />
    <path d="M24 84 C22 66 40 56 58 60 C76 64 80 82 70 92 C60 100 32 102 24 84 Z" fill={C.flameLight} {...line(3.5)} />
    <path d="M30 76 C40 70 54 70 62 76" stroke={C.flame} strokeWidth={4} />
    <path d="M64 66 C74 54 72 36 62 26 C54 18 56 8 66 8 C74 8 78 14 76 20" fill="none" {...line(4)} />
    <path d="M64 66 C74 54 72 36 62 26 C54 18 56 8 66 8 C74 8 78 14 76 20" stroke={C.flameLight} strokeWidth={2} />
    <path d="M76 20 L84 26 L76 28 Z" fill={C.ink} />
  </svg>
);

/** A brown pelican, about to fold and dive. */
export const Pelican: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 110" className={className} style={style} {...svgProps}>
    <path d="M20 60 C30 36 60 28 84 40 C98 48 96 66 82 74 C64 84 34 84 20 60 Z" fill={C.barkLight} {...line(3.5)} />
    <path d="M30 56 C48 46 70 46 86 52" stroke={C.bark} strokeWidth={4} />
    <path d="M84 42 C92 26 104 22 112 28 C116 32 114 38 108 40 L136 56 L106 50 C98 50 90 48 84 46 Z" fill={C.canvas} {...line(3)} />
    <path d="M106 46 L134 56" stroke={C.sun} strokeWidth={3} />
    <circle cx="106" cy="32" r="2.2" fill={C.ink} />
    <path d="M44 80 L40 102 M60 82 L60 104" {...line(3)} />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   The reef
   ══════════════════════════════════════════════════════════════════════════ */

/** A parrotfish, in the blues and greens of a mosaic. */
export const ParrotFish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 80" className={className} style={style} {...svgProps}>
    <path d="M28 40 L4 20 C8 34 8 46 4 60 Z" fill={C.larimarDark} {...line(3)} />
    <path d="M20 40 C34 14 82 8 112 22 C126 28 134 34 136 40 C134 46 126 52 112 58 C82 72 34 66 20 40 Z" fill={C.larimar} {...line(3.5)} />
    <path d="M56 18 C62 30 62 50 56 62 M80 14 C86 28 86 52 80 66" stroke={C.cane} strokeWidth={5} />
    <path d="M100 30 C104 36 104 44 100 50" stroke={C.bouga} strokeWidth={4} />
    <circle cx="116" cy="34" r="4.5" fill={C.canvas} {...line(2)} />
    <circle cx="117" cy="34" r="2" fill={C.ink} />
  </svg>
);

/** A queen angelfish, gold and blue, tall as a sail. */
export const AngelFish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 100 100" className={className} style={style} {...svgProps}>
    <path d="M50 4 C40 24 40 40 46 50 C40 60 40 76 50 96 C64 82 80 66 88 50 C80 34 64 18 50 4 Z" fill={C.sun} {...line(3.5)} />
    <path d="M46 50 L18 34 L24 50 L18 66 Z" fill={C.ultramar} {...line(3)} />
    <path d="M58 28 C62 40 62 60 58 72" stroke={C.ultramar} strokeWidth={5} />
    <circle cx="76" cy="46" r="4" fill={C.canvas} {...line(2)} />
    <circle cx="77" cy="46" r="1.8" fill={C.ink} />
  </svg>
);

/** A small fish in whatever colour the caller sets (`currentColor`). */
export const Fish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 60 30" className={className} style={style} {...svgProps}>
    <path d="M12 15 L1 6 C3 12 3 18 1 24 Z" fill="currentColor" {...line(1.8)} />
    <path d="M8 15 C16 5 38 2 50 9 C55 12 58 14 59 15 C58 16 55 18 50 21 C38 28 16 25 8 15 Z" fill="currentColor" {...line(2)} />
    <circle cx="49" cy="13" r="1.8" fill={C.canvas} />
  </svg>
);

/** A sea turtle from above, swimming toward the top of its box. */
export const SeaTurtle: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 100 120" className={className} style={style} {...svgProps}>
    <path className="flipper-l" style={{ transformOrigin: '34px 44px' }} d="M34 44 C18 34 8 26 6 16 C20 18 32 28 40 40 Z" fill={C.cane} {...line(3)} />
    <path className="flipper-r" style={{ transformOrigin: '66px 44px' }} d="M66 44 C82 34 92 26 94 16 C80 18 68 28 60 40 Z" fill={C.cane} {...line(3)} />
    <path d="M36 82 C26 90 20 100 22 108 C32 104 40 96 44 86 Z M64 82 C74 90 80 100 78 108 C68 104 60 96 56 86 Z" fill={C.cane} {...line(3)} />
    <ellipse cx="50" cy="20" rx="11" ry="13" fill={C.caneLight} {...line(3)} />
    <ellipse cx="50" cy="62" rx="30" ry="36" fill={C.sun} {...line(3.5)} />
    <path d="M50 30 L50 96 M24 50 L76 50 M24 74 L76 74 M36 34 L36 92 M64 34 L64 92" stroke={C.mamey} strokeWidth={3} />
    <circle cx="45" cy="16" r="1.8" fill={C.ink} />
    <circle cx="55" cy="16" r="1.8" fill={C.ink} />
  </svg>
);

/** A humpback of Samaná, breaching in a single arc. */
export const Humpback: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 200 100" className={className} style={style} {...svgProps}>
    <path d="M10 70 C40 30 100 18 150 30 C170 36 186 44 194 54 C180 58 168 66 150 70 C110 80 50 86 10 70 Z" fill={C.ultramar} {...line(4)} />
    <path d="M40 72 C80 78 120 76 160 66" stroke={C.ultramarLight} strokeWidth={6} />
    <path d="M90 66 C96 82 92 94 80 98 C80 86 82 76 86 68 Z" fill={C.ultramarDark} {...line(3)} />
    <path d="M10 70 L2 52 L20 62 Z" fill={C.ultramarDark} {...line(3)} />
    <circle cx="170" cy="46" r="2.4" fill={C.canvas} />
  </svg>
);

/** A spotted eagle ray, wings wide, gliding. */
export const EagleRay: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 100" className={className} style={style} {...svgProps}>
    <g className="ray-wings" style={{ transformOrigin: '70px 40px' }}>
      <path d="M70 20 C50 22 22 30 4 46 C26 48 50 50 66 60 L74 60 C90 50 114 48 136 46 C118 30 90 22 70 20 Z" fill={C.ultramarDark} {...line(3.5)} />
    </g>
    {[
      [40, 40],
      [54, 34],
      [86, 34],
      [100, 40],
      [70, 32],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="2.6" fill={C.canvas} />
    ))}
    <path d="M70 60 C70 76 72 88 76 98" {...line(2.5)} />
  </svg>
);

/** A seahorse, curled. */
export const Seahorse: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 80 140" className={className} style={style} {...svgProps}>
    <path d="M46 14 C60 14 66 26 60 36 C70 46 72 66 62 82 C56 92 50 102 52 114 C54 124 46 132 38 126 C32 120 38 112 44 112 C42 98 40 86 34 76 C26 62 28 46 36 36 C30 30 32 16 46 14 Z" fill={C.mamey} {...line(3.5)} />
    <path d="M60 22 L76 18 L64 30 Z" fill={C.mamey} {...line(2.5)} />
    <circle cx="50" cy="24" r="2.4" fill={C.ink} />
    <path d="M38 50 C44 54 50 54 56 50 M36 62 C44 66 52 66 60 62" stroke={C.sunLight} strokeWidth={3} />
  </svg>
);

/** Branching coral, in three of the reef's colours. */
export const Coral: React.FC<IllustrationProps & { tone?: 'coral' | 'orchid' | 'mango' }> = ({ className = '', style, tone = 'coral' }) => {
  const fill = tone === 'orchid' ? C.bouga : tone === 'mango' ? C.sun : C.flame;
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
      <path
        d="M56 118 C56 96 52 82 40 70 C30 60 24 46 26 30 C34 44 40 56 48 62 C46 46 48 30 56 16 C60 32 60 48 62 62 C70 52 80 38 94 32 C90 50 80 62 70 74 C64 84 64 100 66 118 Z"
        fill={fill}
        {...line(3.5)}
      />
      <circle cx="26" cy="28" r="5" fill={fill} {...line(2.5)} />
      <circle cx="56" cy="14" r="5" fill={fill} {...line(2.5)} />
      <circle cx="94" cy="30" r="5" fill={fill} {...line(2.5)} />
    </svg>
  );
};

/** A sea fan, a lattice of violet. */
export const SeaFan: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <path d="M60 118 C20 100 6 60 20 24 C40 8 80 8 100 24 C114 60 100 100 60 118 Z" fill={C.bougaLight} {...line(3.5)} />
    <path d="M60 116 L60 20 M60 80 L28 40 M60 80 L92 40 M60 60 L36 26 M60 60 L84 26 M60 96 L24 70 M60 96 L96 70" stroke={C.bouga} strokeWidth={3} />
  </svg>
);

/** Seaweed, swaying (the strands carry the `seaweed-strand` animation). */
export const Seaweed: React.FC<IllustrationProps & { tone?: 'green' | 'gold' }> = ({ className = '', style, tone = 'green' }) => {
  const fill = tone === 'gold' ? C.sun : C.cane;
  return (
    <svg viewBox="0 0 60 160" className={className} style={style} {...svgProps}>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          className="seaweed-strand"
          style={{ transformOrigin: `${16 + i * 14}px 160px`, animationDelay: `${-i * 1.3}s` }}
          d={`M${16 + i * 14} 160 C${8 + i * 14} 120 ${28 + i * 14} 90 ${14 + i * 14} 50 C${8 + i * 14} 30 ${20 + i * 14} 14 ${18 + i * 14} ${6 + i * 8} C${30 + i * 14} 30 ${26 + i * 14} 60 ${30 + i * 14} 90 C${34 + i * 14} 120 ${24 + i * 14} 140 ${24 + i * 14} 160 Z`}
          fill={fill}
          {...line(2.5)}
        />
      ))}
    </svg>
  );
};

/** A column of bubbles. */
export const Bubbles: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 30 100" className={className} style={style} {...svgProps}>
    {[
      [15, 90, 5],
      [10, 66, 4],
      [18, 44, 3.5],
      [12, 24, 2.8],
      [16, 8, 2.2],
    ].map(([cx, cy, r], i) => (
      <circle key={i} cx={cx} cy={cy} r={r} fill={C.larimarLight} stroke={C.canvas} strokeWidth={1.4} />
    ))}
  </svg>
);

export default {
  MonsteraLeaf,
  PalmFrond,
  Fern,
  BananaLeaf,
  Heliconia,
  Hibiscus,
  Pineapple,
  Cocktail,
  Sailboat,
  Conch,
  Starfish,
  Parrot,
  Toucan,
  Hummingbird,
  Frigatebird,
  Birds,
  Flamingo,
  Pelican,
  ParrotFish,
  AngelFish,
  Fish,
  SeaTurtle,
  Humpback,
  EagleRay,
  Seahorse,
  Coral,
  SeaFan,
  Seaweed,
  Bubbles,
  SunBurst,
  Cloud,
  PalmTree,
  WaveBand,
  FoamLine,
};
