import React from 'react';

/**
 * The illustration vocabulary.
 *
 * Every drawing here is built the way a watercolour is built, in three passes:
 *
 *   1. a loose wash, laid wide and translucent;
 *   2. a second wash where the pigment pools, overlapping the first so the
 *      two multiply into a darker value at the edges;
 *   3. an ink contour on top — loose, not closed, and never the same weight
 *      all the way round.
 *
 * That is why the shapes below use `fillOpacity` and overlap rather than flat
 * fills with a uniform outline. It is also why none of them uses an SVG
 * `filter`: a real watercolour texture from feTurbulence would cost a filter
 * region per drawing, per frame, on every scroll. The layering does the work
 * and the paper texture underneath does the rest.
 *
 * All of it is decorative, so each drawing is `aria-hidden` and takes its size
 * from the caller.
 */

export const INK = '#14332F';

const P = {
  ink: '#14332F',
  inkSoft: '#3E605A',
  paper: '#FBF5E9',
  paperCard: '#FEFAF1',
  sand: '#EEDCC0',
  sandDark: '#D9BE96',
  sea: '#2E9AA6',
  seaLight: '#7FCBCE',
  seaFoam: '#C9E8E2',
  seaDeep: '#14636F',
  sky: '#9CC9DA',
  skyLight: '#D6ECF2',
  palm: '#4C8657',
  palmLight: '#8DBE8A',
  palmDeep: '#235141',
  coral: '#E0735B',
  coralLight: '#F3A98F',
  coralDeep: '#B4492F',
  hibiscus: '#C9557A',
  hibiscusLight: '#E9A8B8',
  sun: '#E9A13B',
  sunLight: '#F6C98B',
  dusk: '#9C8CB8',
};

export type Pigment = keyof typeof P;

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

/** The ink contour. Thin, diluted, and deliberately not closed. */
const line = (w = 1.6, opacity = 0.55) => ({
  stroke: P.ink,
  strokeWidth: w,
  strokeOpacity: opacity,
});

/* ── Sky ─────────────────────────────────────────────────────────────────── */

/** A low sun: two washes pooling into a disc, with the light bleeding out. */
export const SunDisc: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 160 160" className={className} style={style} {...svgProps}>
    <circle cx="80" cy="80" r="72" fill={P.sunLight} fillOpacity={0.22} />
    <circle cx="80" cy="80" r="52" fill={P.sunLight} fillOpacity={0.35} />
    <circle cx="80" cy="80" r="34" fill={P.sun} fillOpacity={0.72} />
    <circle cx="74" cy="72" r="20" fill={P.sunLight} fillOpacity={0.5} />
  </svg>
);

/** Kept under its old name: the header and backdrop still ask for it. */
export const SunBurst: React.FC<IllustrationProps & { spin?: boolean }> = ({
  className = '',
  style,
}) => <SunDisc className={className} style={style} />;

export const Cloud: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 160 80" className={className} style={style} {...svgProps}>
    <path
      d="M18 60 C6 60 4 44 16 40 C14 26 32 18 44 26 C50 10 76 8 84 24 C98 14 120 22 120 38 C138 36 148 50 140 60 Z"
      fill={P.paper}
      fillOpacity={0.9}
    />
    <path
      d="M30 58 C22 56 22 46 32 46 C36 34 54 32 60 42 C70 34 86 40 86 50 C96 48 102 56 96 60 Z"
      fill={P.skyLight}
      fillOpacity={0.75}
    />
    <path d="M22 60 C40 56 62 62 86 58 C104 55 124 60 140 58" {...line(1.4, 0.2)} />
  </svg>
);

export const Birds: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 40" className={className} style={style} {...svgProps}>
    <g {...line(1.7, 0.5)}>
      <path d="M8 22 C14 14 18 14 24 21" />
      <path d="M24 21 C30 14 34 14 40 22" />
      <path d="M54 12 C58 6 61 6 66 11" />
      <path d="M66 11 C70 6 73 6 78 12" />
      <path d="M86 28 C90 23 93 23 97 27" />
      <path d="M97 27 C101 23 104 23 108 28" />
    </g>
  </svg>
);

/* ── Botanicals ──────────────────────────────────────────────────────────── */

export const PalmFrond: React.FC<IllustrationProps & { color?: Pigment }> = ({
  className = '',
  style,
  color = 'palm',
}) => (
  <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
    <path d="M100 196 C104 140 110 92 128 42" {...line(2.2, 0.45)} />
    {[
      'M126 52 C104 34 76 30 56 40 C78 50 102 58 124 62',
      'M122 74 C98 60 70 58 50 70 C74 78 98 84 120 84',
      'M117 98 C94 88 66 90 48 104 C72 108 96 110 116 108',
      'M112 124 C90 118 64 124 48 140 C72 140 94 138 111 134',
      'M130 50 C152 36 178 40 192 54 C170 58 148 60 130 60',
      'M126 74 C150 64 176 72 188 86 C166 86 144 84 126 82',
      'M121 100 C146 94 170 106 180 120 C158 116 136 110 119 108',
    ].map((d, i) => (
      <path key={i} d={d} fill={P[color]} fillOpacity={i % 2 ? 0.42 : 0.58} />
    ))}
    <path d="M126 52 C104 34 76 30 56 40" {...line(1.3, 0.28)} />
    <path d="M130 50 C152 36 178 40 192 54" {...line(1.3, 0.28)} />
  </svg>
);

export const PalmTree: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 200 260" className={className} style={style} {...svgProps}>
    {/* trunk: two washes, the darker one on the shaded side */}
    <path d="M92 258 C86 200 88 150 104 96 L124 100 C110 152 106 202 110 258 Z" fill={P.sand} fillOpacity={0.9} />
    <path d="M104 258 C100 202 102 154 114 100 L124 102 C112 154 108 204 112 258 Z" fill={P.sandDark} fillOpacity={0.55} />
    <g {...line(1.3, 0.3)}>
      <path d="M92 250 C88 200 90 150 105 98" />
      <path d="M110 250 C106 202 108 152 122 100" />
      <path d="M94 226 L108 224 M95 200 L110 197 M98 172 L113 168 M102 144 L117 140" />
    </g>
    {/* crown */}
    {[
      'M112 92 C82 62 42 58 18 78 C48 84 82 92 110 102',
      'M114 90 C140 56 182 56 198 78 C168 80 138 86 116 100',
      'M110 96 C78 92 40 108 26 134 C56 124 88 112 110 108',
      'M116 96 C148 92 184 110 194 136 C166 124 136 112 116 108',
      'M112 88 C104 52 116 20 140 8 C134 36 126 66 118 92',
    ].map((d, i) => (
      <path key={i} d={d} fill={i % 2 ? P.palm : P.palmLight} fillOpacity={i % 2 ? 0.6 : 0.5} />
    ))}
    <circle cx="106" cy="98" r="7" fill={P.palmDeep} fillOpacity={0.5} />
    <circle cx="120" cy="101" r="6" fill={P.palmDeep} fillOpacity={0.4} />
  </svg>
);

export const Monstera: React.FC<IllustrationProps & { color?: Pigment }> = ({
  className = '',
  style,
  color = 'palm',
}) => (
  <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
    <path d="M100 198 C98 156 96 128 92 104" {...line(2, 0.4)} />
    <path
      d="M92 106 C46 100 18 66 24 30 C58 18 100 32 118 60 C142 48 178 62 184 96 C172 128 132 140 100 124 Z"
      fill={P[color]}
      fillOpacity={0.5}
    />
    <path
      d="M92 106 C60 98 40 74 42 46 C70 42 96 56 108 76 C130 68 156 80 160 100 C146 120 114 122 92 106 Z"
      fill={P[color]}
      fillOpacity={0.4}
    />
    {/* the cuts that make a monstera a monstera */}
    <g fill={P.paper} fillOpacity={0.85}>
      <path d="M62 44 C70 54 76 66 78 78 C68 74 58 62 54 48 Z" />
      <path d="M110 66 C116 78 118 90 118 102 C108 96 100 84 98 70 Z" />
      <path d="M146 80 C154 90 158 100 158 110 C148 106 140 96 138 84 Z" />
      <path d="M46 78 C56 84 66 94 70 104 C58 104 46 96 40 84 Z" />
    </g>
    <path d="M92 106 C74 84 58 56 52 28" {...line(1.3, 0.3)} />
    <path d="M92 106 C114 92 142 82 174 84" {...line(1.3, 0.25)} />
  </svg>
);

export const BananaLeaf: React.FC<IllustrationProps & { color?: Pigment }> = ({
  className = '',
  style,
  color = 'palmLight',
}) => (
  <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
    <path
      d="M28 178 C44 104 96 40 178 20 C168 96 118 158 34 180 Z"
      fill={P[color]}
      fillOpacity={0.55}
    />
    <path d="M32 176 C50 112 98 54 172 28" {...line(2, 0.4)} />
    <g {...line(1.1, 0.22)}>
      <path d="M52 152 C70 132 76 116 78 98" />
      <path d="M72 132 C92 110 98 94 100 76" />
      <path d="M94 110 C112 90 120 74 122 58" />
      <path d="M116 88 C132 72 142 56 146 42" />
    </g>
  </svg>
);

export const Hibiscus: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    {[0, 72, 144, 216, 288].map((r) => (
      <path
        key={r}
        d="M60 60 C42 48 36 24 52 12 C68 4 82 18 78 38 C76 50 68 58 60 60 Z"
        fill={P.hibiscus}
        fillOpacity={0.45}
        transform={`rotate(${r} 60 60)`}
      />
    ))}
    {[36, 108, 180, 252, 324].map((r) => (
      <path
        key={r}
        d="M60 60 C48 50 46 32 58 26 C70 22 78 34 74 46 C71 54 66 59 60 60 Z"
        fill={P.hibiscusLight}
        fillOpacity={0.5}
        transform={`rotate(${r} 60 60)`}
      />
    ))}
    <circle cx="60" cy="60" r="9" fill={P.sun} fillOpacity={0.8} />
    <path d="M60 58 C64 44 66 34 64 24" {...line(1.4, 0.4)} />
    <circle cx="64" cy="24" r="3" fill={P.sun} fillOpacity={0.9} />
  </svg>
);

export const Bougainvillea: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 140" className={className} style={style} {...svgProps}>
    <path d="M12 130 C40 108 66 80 96 40" {...line(1.8, 0.35)} />
    {[
      [96, 38],
      [74, 62],
      [52, 86],
      [30, 110],
      [84, 58],
      [60, 78],
    ].map(([x, y], i) => (
      <g key={i} transform={`translate(${x} ${y})`}>
        {[0, 120, 240].map((r) => (
          <path
            key={r}
            d="M0 0 C-8 -6 -10 -18 0 -20 C10 -18 8 -6 0 0 Z"
            fill={i % 2 ? P.hibiscus : P.coral}
            fillOpacity={0.5}
            transform={`rotate(${r})`}
          />
        ))}
        <circle cx="0" cy="0" r="2.4" fill={P.sunLight} fillOpacity={0.9} />
      </g>
    ))}
  </svg>
);

/** A generic leafy accent, for dividers and corners. */
export const LeafSprig: React.FC<IllustrationProps & { color?: Pigment }> = ({
  className = '',
  style,
  color = 'palm',
}) => (
  <svg viewBox="0 0 160 60" className={className} style={style} {...svgProps}>
    <path d="M6 42 C46 42 104 34 154 18" {...line(1.6, 0.35)} />
    {[20, 44, 68, 92, 116].map((x, i) => (
      <g key={x}>
        <path
          d={`M${x} ${40 - i * 2} C${x + 6} ${26 - i * 2} ${x + 18} ${24 - i * 2} ${x + 22} ${34 - i * 2} C${x + 16} ${42 - i * 2} ${x + 6} ${44 - i * 2} ${x} ${40 - i * 2} Z`}
          fill={P[color]}
          fillOpacity={0.45}
        />
        <path
          d={`M${x} ${42 - i * 2} C${x + 6} ${52 - i * 2} ${x + 16} ${54 - i * 2} ${x + 22} ${48 - i * 2} C${x + 16} ${40 - i * 2} ${x + 6} ${38 - i * 2} ${x} ${42 - i * 2} Z`}
          fill={P[color]}
          fillOpacity={0.32}
        />
      </g>
    ))}
  </svg>
);

/* ── On the water ────────────────────────────────────────────────────────── */

export const Catamaran: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 180 160" className={className} style={style} {...svgProps}>
    <path d="M90 126 L90 26" {...line(1.8, 0.45)} />
    <path d="M88 30 C120 54 134 84 136 116 L90 116 Z" fill={P.paperCard} fillOpacity={0.95} />
    <path d="M88 30 C108 50 120 76 124 104 L90 104 Z" fill={P.seaFoam} fillOpacity={0.5} />
    <path d="M86 44 C70 70 62 96 60 116 L86 116 Z" fill={P.paperCard} fillOpacity={0.9} />
    <path d="M88 30 C120 54 134 84 136 116 L90 116 Z" {...line(1.4, 0.35)} />
    <path d="M86 44 C70 70 62 96 60 116 L86 116 Z" {...line(1.4, 0.3)} />
    <path d="M36 122 C70 118 116 118 150 122 C146 134 132 140 94 140 C58 140 42 132 36 122 Z" fill={P.coralDeep} fillOpacity={0.62} />
    <path d="M36 122 C70 118 116 118 150 122 C146 134 132 140 94 140 C58 140 42 132 36 122 Z" {...line(1.5, 0.4)} />
    <path d="M30 148 C60 143 118 143 156 148" {...line(1.6, 0.28)} />
  </svg>
);

export const Sailboat: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <Catamaran className={className} style={style} />
);

export const Speedboat: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 180 100" className={className} style={style} {...svgProps}>
    <path d="M26 66 L150 62 C154 76 142 86 108 86 L48 86 C34 86 28 78 26 66 Z" fill={P.paperCard} fillOpacity={0.95} />
    <path d="M26 66 L150 62 C154 76 142 86 108 86 L48 86 C34 86 28 78 26 66 Z" {...line(1.5, 0.4)} />
    <path d="M62 62 L74 42 L120 42 L128 60 Z" fill={P.seaFoam} fillOpacity={0.7} />
    <path d="M62 62 L74 42 L120 42 L128 60 Z" {...line(1.3, 0.32)} />
    <path d="M30 60 L148 57" {...line(2.4, 0.5)} stroke={P.coralDeep} strokeOpacity={0.55} />
    <path d="M14 92 C48 86 122 86 166 92" {...line(1.6, 0.25)} />
  </svg>
);

export const SnorkelMask: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 100" className={className} style={style} {...svgProps}>
    <path d="M20 34 C20 22 100 22 100 34 L100 56 C100 72 78 78 60 70 C42 78 20 72 20 56 Z" fill={P.seaLight} fillOpacity={0.45} />
    <path d="M20 34 C20 22 100 22 100 34 L100 56 C100 72 78 78 60 70 C42 78 20 72 20 56 Z" {...line(1.6, 0.45)} />
    <path d="M100 38 C114 40 116 62 108 84" {...line(2.2, 0.45)} />
    <path d="M28 40 C44 36 54 36 56 40 L56 58 C46 64 32 60 28 52 Z" fill={P.paper} fillOpacity={0.7} />
    <path d="M64 40 C70 36 80 36 94 40 L94 52 C90 60 74 64 64 58 Z" fill={P.paper} fillOpacity={0.7} />
  </svg>
);

export const Fish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 70" className={className} style={style} {...svgProps}>
    <path d="M18 36 C34 16 74 14 92 34 C74 56 34 56 18 36 Z" fill={P.sun} fillOpacity={0.55} />
    <path d="M18 36 C32 24 60 22 76 32 C60 44 32 46 18 36 Z" fill={P.coral} fillOpacity={0.4} />
    <path d="M92 34 L112 18 L110 52 Z" fill={P.coral} fillOpacity={0.5} />
    <path d="M18 36 C34 16 74 14 92 34 C74 56 34 56 18 36 Z" {...line(1.4, 0.4)} />
    <circle cx="36" cy="32" r="2.6" fill={P.ink} fillOpacity={0.7} />
  </svg>
);

export const Turtle: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 110" className={className} style={style} {...svgProps}>
    <path d="M36 56 C36 30 102 30 104 56 C106 80 38 82 36 56 Z" fill={P.palm} fillOpacity={0.5} />
    <g fill={P.palmDeep} fillOpacity={0.35}>
      <path d="M58 40 L76 38 L80 54 L60 56 Z" />
      <path d="M84 42 L96 48 L92 62 L80 58 Z" />
      <path d="M46 50 L58 58 L50 68 L40 58 Z" />
    </g>
    <path d="M36 56 C36 30 102 30 104 56 C106 80 38 82 36 56 Z" {...line(1.5, 0.4)} />
    <path d="M104 50 C118 44 128 50 126 60 C124 68 112 68 104 62" fill={P.palmLight} fillOpacity={0.55} />
    <path d="M40 74 C32 86 22 88 18 82 M94 76 C100 88 112 90 116 84 M42 38 C30 32 22 36 22 44" fill={P.palmLight} fillOpacity={0.5} {...line(1.3, 0.3)} />
    <circle cx="120" cy="56" r="2" fill={P.ink} fillOpacity={0.7} />
  </svg>
);

export const Starfish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <path
      d="M60 12 L74 48 L112 50 L82 74 L92 110 L60 88 L28 110 L38 74 L8 50 L46 48 Z"
      fill={P.coral}
      fillOpacity={0.55}
    />
    <path
      d="M60 26 L70 52 L96 54 L75 71 L82 96 L60 81 L38 96 L45 71 L24 54 L50 52 Z"
      fill={P.coralLight}
      fillOpacity={0.5}
    />
    <path
      d="M60 12 L74 48 L112 50 L82 74 L92 110 L60 88 L28 110 L38 74 L8 50 L46 48 Z"
      {...line(1.5, 0.35)}
    />
  </svg>
);

export const Shell: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 110" className={className} style={style} {...svgProps}>
    <path d="M60 96 C22 92 8 54 26 28 C44 4 76 4 94 28 C112 54 98 92 60 96 Z" fill={P.sand} fillOpacity={0.8} />
    <g {...line(1.2, 0.3)}>
      <path d="M60 96 C52 66 50 40 54 16" />
      <path d="M60 96 C66 66 70 40 68 16" />
      <path d="M60 96 C44 72 34 50 30 28" />
      <path d="M60 96 C76 72 86 50 90 28" />
    </g>
    <path d="M60 96 C22 92 8 54 26 28 C44 4 76 4 94 28 C112 54 98 92 60 96 Z" {...line(1.5, 0.4)} />
  </svg>
);

export const Coral: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    <g stroke={P.coral} strokeOpacity={0.55} strokeWidth={6} strokeLinecap="round">
      <path d="M60 112 L60 62" />
      <path d="M60 78 C48 68 40 54 40 38" />
      <path d="M60 72 C72 62 82 50 84 34" />
      <path d="M60 92 C46 86 34 78 28 66" />
      <path d="M60 88 C74 82 86 74 92 62" />
    </g>
    <g fill={P.hibiscus} fillOpacity={0.5}>
      <circle cx="40" cy="36" r="6" />
      <circle cx="84" cy="32" r="6" />
      <circle cx="27" cy="64" r="5" />
      <circle cx="93" cy="60" r="5" />
      <circle cx="60" cy="58" r="6" />
    </g>
  </svg>
);

/* ── Wildlife ────────────────────────────────────────────────────────────── */

export const Toucan: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 120" className={className} style={style} {...svgProps}>
    <path d="M56 30 C86 24 106 44 104 70 C102 96 76 108 56 98 C36 88 32 44 56 30 Z" fill={P.ink} fillOpacity={0.72} />
    <path d="M62 60 C80 54 94 62 96 76 C90 88 70 90 60 80 Z" fill={P.paper} fillOpacity={0.6} />
    <path d="M58 36 C40 30 16 34 6 48 C18 60 40 62 56 56 Z" fill={P.sun} fillOpacity={0.85} />
    <path d="M58 36 C42 32 24 34 12 44 C24 52 42 54 56 50 Z" fill={P.coral} fillOpacity={0.6} />
    <path d="M58 36 C40 30 16 34 6 48 C18 60 40 62 56 56" {...line(1.4, 0.4)} />
    <circle cx="66" cy="44" r="3.4" fill={P.paper} fillOpacity={0.9} />
    <circle cx="66" cy="44" r="1.6" fill={P.ink} />
    <path d="M88 96 C92 108 88 116 78 116" {...line(1.6, 0.4)} />
  </svg>
);

export const Butterfly: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 100" className={className} style={style} {...svgProps}>
    <path d="M60 50 C42 22 16 18 12 38 C8 58 34 62 60 50 Z" fill={P.dusk} fillOpacity={0.5} />
    <path d="M60 50 C78 22 104 18 108 38 C112 58 86 62 60 50 Z" fill={P.dusk} fillOpacity={0.5} />
    <path d="M60 52 C46 74 26 84 20 70 C16 58 38 52 60 52 Z" fill={P.sun} fillOpacity={0.45} />
    <path d="M60 52 C74 74 94 84 100 70 C104 58 82 52 60 52 Z" fill={P.sun} fillOpacity={0.45} />
    <path d="M60 36 L60 66" {...line(2.2, 0.55)} />
    <path d="M60 36 C56 28 52 24 46 22 M60 36 C64 28 68 24 74 22" {...line(1.3, 0.45)} />
  </svg>
);

/* ── Fruit & table ───────────────────────────────────────────────────────── */

export const Pineapple: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 100 140" className={className} style={style} {...svgProps}>
    <path d="M50 134 C26 134 18 108 20 84 C22 58 34 44 50 44 C66 44 78 58 80 84 C82 108 74 134 50 134 Z" fill={P.sun} fillOpacity={0.6} />
    <g {...line(1, 0.25)}>
      <path d="M24 66 L76 98 M24 88 L74 62 M22 108 L64 82 M36 122 L78 96" />
    </g>
    <path d="M50 134 C26 134 18 108 20 84 C22 58 34 44 50 44 C66 44 78 58 80 84 C82 108 74 134 50 134 Z" {...line(1.5, 0.4)} />
    {[
      'M50 44 C46 26 40 12 30 4 C34 20 38 34 44 46',
      'M50 44 C54 26 60 12 70 4 C66 20 62 34 56 46',
      'M50 44 C50 24 52 10 50 0 C48 12 46 26 46 46',
    ].map((d, i) => (
      <path key={i} d={d} fill={P.palm} fillOpacity={0.55 - i * 0.08} />
    ))}
  </svg>
);

export const Cocktail: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 110 130" className={className} style={style} {...svgProps}>
    <path d="M20 30 L90 30 L58 74 L52 74 Z" fill={P.seaFoam} fillOpacity={0.55} />
    <path d="M28 40 L82 40 L58 72 L52 72 Z" fill={P.sun} fillOpacity={0.45} />
    <path d="M20 30 L90 30 L58 74 L52 74 Z" {...line(1.5, 0.45)} />
    <path d="M55 74 L55 112 M34 114 L76 114" {...line(2, 0.45)} />
    <path d="M70 26 C78 8 92 2 104 6" {...line(2, 0.4)} />
    <circle cx="80" cy="30" r="9" fill={P.coral} fillOpacity={0.6} />
    <path d="M80 21 L80 39" {...line(1.1, 0.3)} />
  </svg>
);

/* ── Transfers ───────────────────────────────────────────────────────────── */

/** The transfer language: a van on a palm-lined road, seen side-on. */
export const TransferVan: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 200 110" className={className} style={style} {...svgProps}>
    <path d="M18 76 L18 44 C18 36 34 30 60 30 L124 30 C142 30 160 42 176 54 L180 76 Z" fill={P.paperCard} fillOpacity={0.96} />
    <path d="M18 62 L180 62 L180 76 L18 76 Z" fill={P.seaDeep} fillOpacity={0.5} />
    <path d="M28 40 L64 40 L64 58 L26 58 Z" fill={P.seaFoam} fillOpacity={0.7} />
    <path d="M74 40 L112 40 L112 58 L74 58 Z" fill={P.seaFoam} fillOpacity={0.7} />
    <path d="M122 40 C138 42 152 50 164 58 L122 58 Z" fill={P.seaFoam} fillOpacity={0.7} />
    <path d="M18 76 L18 44 C18 36 34 30 60 30 L124 30 C142 30 160 42 176 54 L180 76 Z" {...line(1.6, 0.42)} />
    <circle cx="56" cy="80" r="15" fill={P.ink} fillOpacity={0.72} />
    <circle cx="56" cy="80" r="6" fill={P.paper} fillOpacity={0.85} />
    <circle cx="150" cy="80" r="15" fill={P.ink} fillOpacity={0.72} />
    <circle cx="150" cy="80" r="6" fill={P.paper} fillOpacity={0.85} />
    <path d="M4 96 C50 90 150 90 196 96" {...line(1.8, 0.22)} />
  </svg>
);

export const Suitcase: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 110 110" className={className} style={style} {...svgProps}>
    <path d="M40 30 C40 18 70 18 70 30" {...line(2.2, 0.45)} />
    <path d="M16 34 L94 34 C98 34 100 38 100 42 L100 86 C100 92 96 94 92 94 L18 94 C14 94 12 90 12 86 L12 42 C12 38 12 34 16 34 Z" fill={P.coralDeep} fillOpacity={0.55} />
    <path d="M16 46 L94 46 M16 76 L94 76" {...line(1.4, 0.3)} />
    <path d="M16 34 L94 34 C98 34 100 38 100 42 L100 86 C100 92 96 94 92 94 L18 94 C14 94 12 90 12 86 L12 42 C12 38 12 34 16 34 Z" {...line(1.6, 0.42)} />
    <path d="M44 58 L66 58 L66 68 L44 68 Z" fill={P.sunLight} fillOpacity={0.8} />
  </svg>
);

/* ── Land ────────────────────────────────────────────────────────────────── */

export const Island: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 220 120" className={className} style={style} {...svgProps}>
    <path d="M10 96 C40 78 70 74 110 76 C154 78 186 84 210 96 Z" fill={P.sand} fillOpacity={0.9} />
    <path d="M32 90 C60 80 92 78 126 80 C158 82 182 86 200 92" fill={P.sandDark} fillOpacity={0.4} />
    <path d="M96 78 C92 60 96 44 108 34 C104 50 104 64 106 78 Z" fill={P.sand} fillOpacity={0.9} />
    <g fill={P.palm} fillOpacity={0.55}>
      <path d="M106 36 C90 22 70 22 60 32 C78 34 94 38 106 44 Z" />
      <path d="M108 34 C122 18 144 20 152 32 C134 32 118 36 108 44 Z" />
      <path d="M106 40 C92 40 76 50 70 62 C86 54 98 48 106 46 Z" />
    </g>
    <path d="M0 108 C50 100 170 100 220 108" {...line(1.8, 0.2)} />
  </svg>
);

export const Waterfall: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 180" className={className} style={style} {...svgProps}>
    <path d="M10 20 C40 8 100 8 130 22 L130 120 L10 120 Z" fill={P.palmDeep} fillOpacity={0.4} />
    <path d="M52 24 L88 24 C92 70 92 108 86 142 L54 142 C48 108 48 70 52 24 Z" fill={P.seaFoam} fillOpacity={0.75} />
    <g {...line(1.2, 0.3)} stroke={P.paper} strokeOpacity={0.55}>
      <path d="M62 30 C60 66 60 106 62 138" />
      <path d="M72 28 C71 66 71 108 72 140" />
      <path d="M82 30 C83 66 83 106 81 138" />
    </g>
    <ellipse cx="70" cy="152" rx="52" ry="18" fill={P.sea} fillOpacity={0.45} />
    <ellipse cx="70" cy="150" rx="32" ry="10" fill={P.seaFoam} fillOpacity={0.6} />
    <g fill={P.palm} fillOpacity={0.5}>
      <path d="M14 34 C4 22 4 10 14 6 C22 12 22 26 18 36 Z" />
      <path d="M126 34 C136 22 136 10 126 6 C118 12 118 26 122 36 Z" />
    </g>
  </svg>
);

export const Cave: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 160 140" className={className} style={style} {...svgProps}>
    <path d="M6 132 C6 60 40 14 80 14 C120 14 154 60 154 132 Z" fill={P.sandDark} fillOpacity={0.55} />
    <path d="M30 132 C30 76 52 44 80 44 C108 44 130 76 130 132 Z" fill={P.seaDeep} fillOpacity={0.7} />
    <path d="M46 132 C46 92 60 70 80 70 C100 70 114 92 114 132 Z" fill={P.sea} fillOpacity={0.5} />
    <g fill={P.sandDark} fillOpacity={0.6}>
      <path d="M52 46 L58 72 L46 70 Z" />
      <path d="M74 44 L80 66 L68 64 Z" />
      <path d="M100 48 L106 74 L94 70 Z" />
    </g>
    <path d="M6 132 C6 60 40 14 80 14 C120 14 154 60 154 132" {...line(1.6, 0.35)} />
  </svg>
);

/* ── Structural ──────────────────────────────────────────────────────────── */

/** A painted waterline, used where a section hands over to the next. */
export const WaveBand: React.FC<IllustrationProps & { tone?: 'lagoon' | 'sky' | 'sand' }> = ({
  className = '',
  style,
  tone = 'lagoon',
}) => {
  const tones = {
    lagoon: [P.seaFoam, P.seaLight, P.sea],
    sky: [P.skyLight, P.sky, P.sea],
    sand: [P.paper, P.sand, P.sandDark],
  }[tone];

  return (
    <svg
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      className={className}
      style={style}
      {...svgProps}
    >
      <path
        d="M0 42 C140 22 260 56 400 44 C540 32 640 62 780 50 C900 40 1060 58 1200 40 L1200 120 L0 120 Z"
        fill={tones[0]}
        fillOpacity={0.7}
      />
      <path
        d="M0 66 C150 48 270 80 410 68 C550 56 660 84 800 74 C920 66 1070 80 1200 64 L1200 120 L0 120 Z"
        fill={tones[1]}
        fillOpacity={0.65}
      />
      <path
        d="M0 92 C160 78 280 104 420 94 C560 84 680 106 820 98 C940 92 1080 102 1200 90 L1200 120 L0 120 Z"
        fill={tones[2]}
        fillOpacity={0.6}
      />
      <g stroke={P.paper} strokeWidth={3} strokeOpacity={0.5} strokeLinecap="round" fill="none">
        <path d="M120 84 C150 80 180 84 210 80" />
        <path d="M470 100 C500 96 526 100 556 96" />
        <path d="M800 90 C830 86 858 90 888 86" />
        <path d="M1010 104 C1036 100 1060 104 1086 100" />
      </g>
    </svg>
  );
};

/** A single line of foam, for dividers inside a section. */
export const FoamLine: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 600 24" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
    <path d="M0 14 C80 6 140 20 220 12 C300 4 360 18 440 11 C500 6 550 14 600 9" {...line(2, 0.28)} />
    <path d="M0 19 C90 12 150 23 240 17 C320 12 380 21 460 16 C520 12 560 18 600 15" {...line(1.2, 0.16)} />
  </svg>
);

export default {
  SunDisc,
  SunBurst,
  Cloud,
  Birds,
  PalmFrond,
  PalmTree,
  Monstera,
  BananaLeaf,
  Hibiscus,
  Bougainvillea,
  LeafSprig,
  Catamaran,
  Sailboat,
  Speedboat,
  SnorkelMask,
  Fish,
  Turtle,
  Starfish,
  Shell,
  Coral,
  Toucan,
  Butterfly,
  Pineapple,
  Cocktail,
  TransferVan,
  Suitcase,
  Island,
  Waterfall,
  Cave,
  WaveBand,
  FoamLine,
};
