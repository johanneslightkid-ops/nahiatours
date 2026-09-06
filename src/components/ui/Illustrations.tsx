import React from 'react';

/**
 * Tattoo-flash illustration set.
 *
 * These were flat tropical stickers. They are now drawn the way a flash sheet
 * is drawn: heavy black outline, bone fill, hatched shading, and the one red
 * spent only on the part of the drawing that carries the point. Nothing here
 * has a gradient and nothing is rounded.
 *
 * The names are unchanged on purpose — the site still sells palms, boats and
 * starfish, they are just tattooed now — and the new parts below them
 * (splatter, ray burst, banner, barcode, crosshair, arrow) are the collage
 * furniture the layout is assembled from.
 *
 * Everything is decorative, so each drawing is `aria-hidden` and takes its
 * size from the caller's className.
 */

export const INK = '#0C0C0D';
export const BLOOD = '#C1121F';

const PALETTE = {
  ink: INK,
  inkSoft: '#3B3B3F',
  blood: BLOOD,
  bloodLight: '#E63946',
  bloodDark: '#8B0A15',
  oxblood: '#6A040F',
  bone: '#F5F1E8',
  paper: '#EFE9DD',
  paperWarm: '#E5DDCD',
  grey: '#8A8A90',
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

/* ── Ray burst ────────────────────────────────────────────────────────────
   The sun, drawn as a radiant: forty hairline spokes and a solid disc. The
   spokes live in their own group so a caller can turn them slowly without
   moving the disc. This is the single most trash-polka mark on the site. */
export const SunBurst: React.FC<IllustrationProps & { spin?: boolean; tone?: 'ink' | 'blood' }> = ({
  className = '',
  style,
  spin = false,
  tone = 'ink',
}) => {
  const color = tone === 'blood' ? PALETTE.blood : PALETTE.ink;
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
      <g
        className={spin ? 'animate-spin-slow' : undefined}
        style={{ transformOrigin: '100px 100px' }}
      >
        {Array.from({ length: 36 }).map((_, i) => (
          <path
            key={i}
            d="M100 100 L96 2 L104 2 Z"
            fill={color}
            transform={`rotate(${i * 10} 100 100)`}
          />
        ))}
      </g>
      <circle cx="100" cy="100" r="36" fill={PALETTE.blood} stroke={PALETTE.ink} strokeWidth={4} />
      <circle cx="100" cy="100" r="27" fill="none" stroke={PALETTE.bone} strokeWidth={2} />
    </svg>
  );
};

/* ── Ink cloud ────────────────────────────────────────────────────────────
   Where a soft paper cloud used to drift, an ink blot now hangs: the same
   silhouette, but blotted and dripping. */
export const Cloud: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 90" className={className} style={style} {...svgProps}>
    <path
      d="M28 66 C10 66 4 48 16 40 C8 24 26 10 40 20 C48 2 76 0 84 18 C102 8 122 24 114 40 C130 46 126 66 106 66 Z"
      fill={PALETTE.ink}
    />
    {/* Drips: what makes it ink and not weather. */}
    <path d="M44 66 C44 76 40 80 40 86 C40 89 46 89 46 86 C46 80 50 76 50 66 Z" fill={PALETTE.ink} />
    <path d="M78 66 C78 72 76 74 76 78 C76 81 81 81 81 78 C81 74 83 72 83 66 Z" fill={PALETTE.ink} />
    <circle cx="63" cy="84" r="3.5" fill={PALETTE.ink} />
    <circle cx="96" cy="76" r="2.4" fill={PALETTE.ink} />
  </svg>
);

/* ── Palm frond ───────────────────────────────────────────────────────────
   Bone leaflets on a black spine, each one hatched. The workhorse mark for
   section corners. */
export const PalmFrond: React.FC<IllustrationProps & { color?: 'ink' | 'blood' | 'bone' }> = ({
  className = '',
  style,
  color = 'ink',
}) => {
  const fill =
    color === 'blood' ? PALETTE.blood : color === 'bone' ? PALETTE.bone : PALETTE.paper;

  const leaflets = Array.from({ length: 8 }).map((_, i) => {
    const y = 14 + i * 11;
    const spread = 36 - i * 2.6;
    return (
      <g key={i}>
        <path
          d={`M50 ${y} C ${50 - spread * 0.5} ${y - 8} ${50 - spread} ${y - 2} ${50 - spread - 9} ${y + 12} C ${50 - spread * 0.7} ${y + 10} ${50 - spread * 0.25} ${y + 6} 50 ${y}`}
          fill={fill}
          stroke={PALETTE.ink}
          strokeWidth={2.6}
        />
        <path
          d={`M50 ${y} C ${50 + spread * 0.5} ${y - 8} ${50 + spread} ${y - 2} ${50 + spread + 9} ${y + 12} C ${50 + spread * 0.7} ${y + 10} ${50 + spread * 0.25} ${y + 6} 50 ${y}`}
          fill={fill}
          stroke={PALETTE.ink}
          strokeWidth={2.6}
        />
        {/* Vein hatching down each leaflet. */}
        <path
          d={`M50 ${y + 1} L ${50 - spread * 0.8} ${y + 7}`}
          stroke={PALETTE.ink}
          strokeWidth={1.2}
          opacity={0.7}
        />
        <path
          d={`M50 ${y + 1} L ${50 + spread * 0.8} ${y + 7}`}
          stroke={PALETTE.ink}
          strokeWidth={1.2}
          opacity={0.7}
        />
      </g>
    );
  });

  return (
    <svg viewBox="0 0 100 118" className={className} style={style} {...svgProps}>
      {leaflets}
      <path d="M50 6 C47 42 49 78 50 112" stroke={PALETTE.ink} strokeWidth={4.5} />
    </svg>
  );
};

/* ── Palm tree ────────────────────────────────────────────────────────────
   Old-school flash: solid black trunk with ring hatching, eight blades, one
   red coconut. */
export const PalmTree: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 140 180" className={className} style={style} {...svgProps}>
    <path
      d="M62 176 C58 138 56 100 44 62 L66 56 C74 96 76 138 78 176 Z"
      fill={PALETTE.paper}
      stroke={PALETTE.ink}
      strokeWidth={4}
    />
    {/* Trunk rings — the shorthand that makes a shape read as bark. */}
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <path
        key={i}
        d={`M${57 - i * 1.6} ${72 + i * 14} Q ${67 - i * 1.2} ${78 + i * 14} ${77 - i * 0.4} ${71 + i * 14}`}
        stroke={PALETTE.ink}
        strokeWidth={2.2}
      />
    ))}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <path
        key={i}
        d="M56 58 C34 40 16 42 2 58 C20 54 36 60 56 58 Z"
        fill={i % 2 === 0 ? PALETTE.paper : PALETTE.paperWarm}
        stroke={PALETTE.ink}
        strokeWidth={3.2}
        transform={`rotate(${-92 + i * 26} 56 58)`}
      />
    ))}
    <circle cx="56" cy="58" r="8" fill={PALETTE.blood} stroke={PALETTE.ink} strokeWidth={3} />
  </svg>
);

/* ── Toucan ───────────────────────────────────────────────────────────────
   Traditional-tattoo bird: solid black body, bone breast, and a red beak that
   carries the only colour in the drawing. */
export const Toucan: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 150 120" className={className} style={style} {...svgProps}>
    <path
      d="M108 104 C84 114 54 104 47 79 C40 54 56 32 79 30 C104 28 118 48 116 71 C115 85 113 95 108 104 Z"
      fill={PALETTE.ink}
      stroke={PALETTE.ink}
      strokeWidth={4}
    />
    {/* Breast, knocked out of the black so the silhouette still reads. */}
    <path
      d="M70 46 C56 55 54 76 65 90 C74 101 90 101 99 94 C83 87 74 67 70 46 Z"
      fill={PALETTE.bone}
      stroke={PALETTE.ink}
      strokeWidth={3}
    />
    <path d="M70 60 L92 74 M68 70 L88 84 M69 80 L84 91" stroke={PALETTE.ink} strokeWidth={1.6} opacity={0.6} />
    {/* The beak. */}
    <path
      d="M63 42 C40 34 14 41 6 55 C18 67 44 69 65 60 Z"
      fill={PALETTE.blood}
      stroke={PALETTE.ink}
      strokeWidth={4}
    />
    <path d="M20 47 C30 49 46 51 62 51" stroke={PALETTE.ink} strokeWidth={2.4} />
    <path
      d="M114 66 C130 63 141 74 137 88 C127 83 118 77 114 66 Z"
      fill={PALETTE.paper}
      stroke={PALETTE.ink}
      strokeWidth={3}
    />
    <circle cx="82" cy="45" r="7" fill={PALETTE.bone} stroke={PALETTE.ink} strokeWidth={3} />
    <circle cx="82" cy="45" r="2.6" fill={PALETTE.ink} />
  </svg>
);

/* ── Hibiscus ─────────────────────────────────────────────────────────────
   Drawn as a traditional rose-hibiscus: five outlined petals, spiral centre,
   red only in the heart. */
export const Hibiscus: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    {[0, 1, 2, 3, 4].map((i) => (
      <g key={i} transform={`rotate(${i * 72} 60 60)`}>
        <path
          d="M60 58 C46 50 34 30 44 16 C54 4 74 8 76 26 C77 40 70 52 60 58 Z"
          fill={PALETTE.paper}
          stroke={PALETTE.ink}
          strokeWidth={3.2}
        />
        <path d="M58 52 C52 42 50 30 54 20" stroke={PALETTE.ink} strokeWidth={1.6} opacity={0.75} />
        <path d="M64 52 C68 42 70 32 68 22" stroke={PALETTE.ink} strokeWidth={1.6} opacity={0.75} />
      </g>
    ))}
    <circle cx="60" cy="60" r="15" fill={PALETTE.blood} stroke={PALETTE.ink} strokeWidth={3.4} />
    <path
      d="M60 60 C66 60 68 54 63 52 C57 50 53 56 56 61 C59 67 68 66 71 60"
      stroke={PALETTE.bone}
      strokeWidth={2.4}
    />
  </svg>
);

/* ── Pineapple ────────────────────────────────────────────────────────────
   Cross-hatched body, black crown. */
export const Pineapple: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 100 140" className={className} style={style} {...svgProps}>
    {[-40, -20, 0, 20, 40].map((r) => (
      <path
        key={r}
        d="M50 44 C44 28 46 12 50 2 C56 12 58 28 52 44 Z"
        fill={PALETTE.ink}
        stroke={PALETTE.ink}
        strokeWidth={3}
        transform={`rotate(${r} 50 46)`}
      />
    ))}
    <path
      d="M50 42 C74 42 86 62 86 88 C86 116 72 134 50 134 C28 134 14 116 14 88 C14 62 26 42 50 42 Z"
      fill={PALETTE.paper}
      stroke={PALETTE.ink}
      strokeWidth={3.6}
    />
    {/* The diamond skin, drawn as two crossing rulings. */}
    <g stroke={PALETTE.ink} strokeWidth={1.7} opacity={0.85}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={`a${i}`} d={`M${12 + i * 14} 44 L${-24 + i * 14} 136`} />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={`b${i}`} d={`M${12 + i * 14} 136 L${-24 + i * 14} 44`} />
      ))}
    </g>
    <path
      d="M50 42 C74 42 86 62 86 88 C86 116 72 134 50 134 C28 134 14 116 14 88 C14 62 26 42 50 42 Z"
      stroke={PALETTE.ink}
      strokeWidth={3.6}
    />
    <circle cx="50" cy="88" r="8" fill={PALETTE.blood} stroke={PALETTE.ink} strokeWidth={2.6} />
  </svg>
);

/* ── Sailboat ─────────────────────────────────────────────────────────────
   Traditional clipper: black hull, bone sails, red pennant. */
export const Sailboat: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 130" className={className} style={style} {...svgProps}>
    <path d="M60 10 L60 96" stroke={PALETTE.ink} strokeWidth={4} />
    <path
      d="M56 22 C34 42 26 62 24 88 L56 88 Z"
      fill={PALETTE.paper}
      stroke={PALETTE.ink}
      strokeWidth={3.4}
    />
    <path
      d="M64 34 C82 48 90 66 92 88 L64 88 Z"
      fill={PALETTE.paperWarm}
      stroke={PALETTE.ink}
      strokeWidth={3.4}
    />
    <path d="M34 78 C42 74 50 72 56 72 M30 86 C40 82 48 80 56 80" stroke={PALETTE.ink} strokeWidth={1.6} opacity={0.7} />
    <path d="M72 66 C78 70 84 78 88 86" stroke={PALETTE.ink} strokeWidth={1.6} opacity={0.7} />
    <path
      d="M10 94 L110 94 L94 118 L26 118 Z"
      fill={PALETTE.ink}
      stroke={PALETTE.ink}
      strokeWidth={3.4}
    />
    <path d="M22 104 L98 104" stroke={PALETTE.bone} strokeWidth={2.4} />
    <path d="M60 10 L84 16 L60 24 Z" fill={PALETTE.blood} stroke={PALETTE.ink} strokeWidth={2.6} />
  </svg>
);

/* ── Nautical star ────────────────────────────────────────────────────────
   The starfish is now the sailor's star: eight points, each split light and
   dark, which is exactly how the old flash drew it. */
export const Starfish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <g key={i} transform={`rotate(${i * 45} 60 60)`}>
        <path d="M60 60 L52 12 L60 4 Z" fill={PALETTE.ink} stroke={PALETTE.ink} strokeWidth={2} />
        <path
          d="M60 60 L68 12 L60 4 Z"
          fill={i % 2 === 0 ? PALETTE.blood : PALETTE.paper}
          stroke={PALETTE.ink}
          strokeWidth={2}
        />
      </g>
    ))}
    <circle cx="60" cy="60" r="7" fill={PALETTE.bone} stroke={PALETTE.ink} strokeWidth={2.6} />
  </svg>
);

/* ── Cocktail ─────────────────────────────────────────────────────────────
   Coupe glass with a red measure and a hatched shadow. */
export const Cocktail: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 110 130" className={className} style={style} {...svgProps}>
    <path
      d="M14 20 L96 20 L55 74 Z"
      fill={PALETTE.paper}
      stroke={PALETTE.ink}
      strokeWidth={3.6}
    />
    <path d="M24 30 L86 30 L55 70 Z" fill={PALETTE.blood} />
    <path d="M55 74 L55 110 M32 112 L78 112" stroke={PALETTE.ink} strokeWidth={4} />
    <path d="M76 20 C86 6 98 2 106 4" stroke={PALETTE.ink} strokeWidth={3} />
    <circle cx="106" cy="4" r="6" fill={PALETTE.blood} stroke={PALETTE.ink} strokeWidth={2.6} />
    <path d="M40 40 L48 34 M46 48 L58 38" stroke={PALETTE.bone} strokeWidth={2.2} opacity={0.85} />
  </svg>
);

/* ── Fish ─────────────────────────────────────────────────────────────────
   Scaled and hatched, the way a woodcut prints one. */
export const Fish: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 150 90" className={className} style={style} {...svgProps}>
    <path
      d="M18 46 C34 18 76 12 104 30 C118 39 126 46 126 46 C126 46 118 53 104 62 C76 80 34 74 18 46 Z"
      fill={PALETTE.paper}
      stroke={PALETTE.ink}
      strokeWidth={3.6}
    />
    <path d="M126 46 L146 26 L142 46 L146 66 Z" fill={PALETTE.ink} stroke={PALETTE.ink} strokeWidth={3} />
    <g stroke={PALETTE.ink} strokeWidth={1.6} opacity={0.8}>
      <path d="M46 26 C54 38 54 54 46 66" />
      <path d="M64 22 C72 36 72 56 64 70" />
      <path d="M82 24 C90 37 90 55 82 68" />
      <path d="M100 30 C107 40 107 52 100 62" />
    </g>
    <path d="M62 14 C74 4 90 6 98 16" stroke={PALETTE.ink} strokeWidth={3} />
    <circle cx="34" cy="42" r="6" fill={PALETTE.blood} stroke={PALETTE.ink} strokeWidth={2.6} />
  </svg>
);

/* ── Swallows ─────────────────────────────────────────────────────────────
   The distant birds are now the sailor's swallows: solid, sharp, three of
   them, the classic "safe passage" mark. */
export const Birds: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 160 60" className={className} style={style} {...svgProps}>
    {[
      { x: 0, y: 6, s: 1 },
      { x: 58, y: 0, s: 0.82 },
      { x: 112, y: 14, s: 0.66 },
    ].map((b, i) => (
      <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
        <path
          d="M4 22 C14 6 30 4 38 14 C44 4 60 6 66 22 C54 18 44 22 38 30 C30 22 18 18 4 22 Z"
          fill={PALETTE.ink}
        />
        <path d="M38 30 L34 44 L44 40 Z" fill={PALETTE.ink} />
      </g>
    ))}
  </svg>
);

/* ── Wave band ────────────────────────────────────────────────────────────
   The divider between sections. It was a rolling sea; it is now a torn strip
   of ink with the red plate showing under the rip.
   `tone` picks which plate is on top. */
export const WaveBand: React.FC<IllustrationProps & { tone?: 'lagoon' | 'sky' | 'blood' }> = ({
  className = '',
  style,
  tone = 'lagoon',
}) => {
  const top = tone === 'blood' ? PALETTE.blood : PALETTE.ink;
  const under = tone === 'blood' ? PALETTE.ink : PALETTE.blood;
  return (
    <svg
      viewBox="0 0 1200 80"
      preserveAspectRatio="none"
      className={className}
      style={style}
      {...svgProps}
    >
      {/* Under-plate, offset so the print reads out of register. */}
      <path
        d="M0 34 L54 22 L108 40 L162 18 L228 38 L282 24 L344 44 L402 20 L470 42 L530 26 L598 46 L664 22 L726 40 L790 20 L856 42 L918 26 L982 44 L1046 22 L1114 40 L1200 26 L1200 80 L0 80 Z"
        fill={under}
        transform="translate(0 8)"
      />
      <path
        d="M0 30 L54 18 L108 36 L162 14 L228 34 L282 20 L344 40 L402 16 L470 38 L530 22 L598 42 L664 18 L726 36 L790 16 L856 38 L918 22 L982 40 L1046 18 L1114 36 L1200 22 L1200 80 L0 80 Z"
        fill={top}
      />
      {/* Fibres torn loose along the rip. */}
      <g fill={top}>
        <circle cx="196" cy="12" r="3" />
        <circle cx="438" cy="9" r="4" />
        <circle cx="700" cy="12" r="2.6" />
        <circle cx="1002" cy="10" r="3.4" />
      </g>
    </svg>
  );
};

/* ── Foam line ────────────────────────────────────────────────────────────
   Was a line of surf; now a dry-brush swipe in red. */
export const FoamLine: React.FC<IllustrationProps & { tone?: 'blood' | 'ink' }> = ({
  className = '',
  style,
  tone = 'blood',
}) => (
  <svg viewBox="0 0 300 22" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
    <path
      d="M2 13 C40 5 62 16 104 9 C148 2 178 15 222 8 C254 3 278 12 298 6 L298 17 C276 21 252 13 220 18 C176 25 148 12 104 19 C62 26 40 15 2 21 Z"
      fill={tone === 'ink' ? PALETTE.ink : PALETTE.blood}
    />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   The collage furniture
   Marks with a job: they point, label, number, frame and interrupt.
   ══════════════════════════════════════════════════════════════════════════ */

/* Thrown ink. Two densities so a page can be dirtied without repeating. */
export const Splatter: React.FC<IllustrationProps & { tone?: 'ink' | 'blood'; variant?: 1 | 2 }> = ({
  className = '',
  style,
  tone = 'blood',
  variant = 1,
}) => {
  const fill = tone === 'ink' ? PALETTE.ink : PALETTE.blood;
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} {...svgProps}>
      {variant === 1 ? (
        <g fill={fill}>
          <path d="M62 44 c30 -34 84 -18 92 22 c8 38 -22 54 -12 80 c10 26 -26 46 -58 38 C48 175 40 148 16 132 C-10 114 30 80 62 44 z" />
          <circle cx="172" cy="52" r="11" />
          <circle cx="186" cy="88" r="5" />
          <circle cx="26" cy="176" r="8" />
          <circle cx="56" cy="192" r="4" />
          <circle cx="150" cy="180" r="6" />
          <path d="M176 138 c10 -12 24 -4 20 10 c-4 14 -22 14 -24 4 z" />
        </g>
      ) : (
        <g fill={fill}>
          <path d="M96 26 c40 -18 76 22 62 58 c-12 32 -50 26 -58 56 c-8 30 -56 34 -70 4 C16 114 26 92 40 72 C56 48 68 38 96 26 z" />
          <circle cx="30" cy="34" r="9" />
          <circle cx="12" cy="62" r="4.5" />
          <circle cx="164" cy="150" r="10" />
          <circle cx="186" cy="128" r="4" />
          <circle cx="112" cy="186" r="6.5" />
        </g>
      )}
    </svg>
  );
};

/* Ribbon banner, for a label that has to be read as a title. */
export const Banner: React.FC<IllustrationProps & { tone?: 'ink' | 'blood' }> = ({
  className = '',
  style,
  tone = 'blood',
}) => {
  const fill = tone === 'ink' ? PALETTE.ink : PALETTE.blood;
  return (
    <svg viewBox="0 0 320 80" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
      <path d="M0 14 L44 26 L44 62 L0 74 L14 44 Z" fill={PALETTE.ink} />
      <path d="M320 14 L276 26 L276 62 L320 74 L306 44 Z" fill={PALETTE.ink} />
      <path d="M40 12 L280 12 L280 68 L40 68 Z" fill={fill} stroke={PALETTE.ink} strokeWidth={4} />
    </svg>
  );
};

/* Hand-drawn arrow. Used literally: it points at the thing to do next. */
export const Arrow: React.FC<IllustrationProps & { tone?: 'ink' | 'blood' }> = ({
  className = '',
  style,
  tone = 'blood',
}) => (
  <svg viewBox="0 0 120 60" className={className} style={style} {...svgProps}>
    <path
      d="M4 44 C24 14 56 4 96 20"
      stroke={tone === 'ink' ? PALETTE.ink : PALETTE.blood}
      strokeWidth={5}
    />
    <path
      d="M96 20 L72 16 M96 20 L86 42"
      stroke={tone === 'ink' ? PALETTE.ink : PALETTE.blood}
      strokeWidth={5}
    />
  </svg>
);

/* Registration crosshair. Printers use it to line the plates up; here it
   marks a corner or a point of interest. */
export const Crosshair: React.FC<IllustrationProps & { tone?: 'ink' | 'blood' }> = ({
  className = '',
  style,
  tone = 'blood',
}) => {
  const c = tone === 'ink' ? PALETTE.ink : PALETTE.blood;
  return (
    <svg viewBox="0 0 60 60" className={className} style={style} {...svgProps}>
      <circle cx="30" cy="30" r="17" stroke={c} strokeWidth={2.4} />
      <path d="M30 2 L30 22 M30 38 L30 58 M2 30 L22 30 M38 30 L58 30" stroke={c} strokeWidth={2.4} />
      <circle cx="30" cy="30" r="3" fill={c} />
    </svg>
  );
};

/* Barcode. The bars are derived from the label so the same tour always prints
   the same code — it is a real identifier, not decoration. */
export const Barcode: React.FC<IllustrationProps & { value?: string; tone?: 'ink' | 'bone' }> = ({
  className = '',
  style,
  value = 'LDVIP',
  tone = 'ink',
}) => {
  let seed = 0;
  for (let i = 0; i < value.length; i += 1) seed = (seed * 31 + value.charCodeAt(i)) >>> 0;

  const bars: React.ReactNode[] = [];
  let x = 0;
  let n = seed || 7;
  while (x < 160) {
    n = (n * 1103515245 + 12345) >>> 0;
    const w = 1 + (n % 4);
    n = (n * 1103515245 + 12345) >>> 0;
    const gap = 1 + (n % 3);
    bars.push(<rect key={x} x={x} y={0} width={w} height={40} />);
    x += w + gap;
  }

  return (
    <svg viewBox="0 0 160 40" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
      <g fill={tone === 'bone' ? PALETTE.bone : PALETTE.ink}>{bars}</g>
    </svg>
  );
};

/* A torn strip of paper, for pinning something onto the collage. */
export const TornStrip: React.FC<IllustrationProps & { tone?: 'ink' | 'blood' | 'bone' }> = ({
  className = '',
  style,
  tone = 'bone',
}) => (
  <svg viewBox="0 0 400 60" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
    <path
      d="M0 14 L38 6 L74 18 L118 4 L164 16 L214 6 L262 18 L308 8 L352 18 L400 8 L400 48 L356 56 L308 44 L258 54 L212 42 L162 54 L116 44 L70 56 L34 44 L0 52 Z"
      fill={tone === 'ink' ? PALETTE.ink : tone === 'blood' ? PALETTE.blood : PALETTE.bone}
      stroke={tone === 'bone' ? PALETTE.ink : 'none'}
      strokeWidth={tone === 'bone' ? 2.5 : 0}
    />
  </svg>
);

/* Anchor — the mark for the fixed points: pick-up, guarantee, the thing that
   does not move. */
export const Anchor: React.FC<IllustrationProps & { tone?: 'ink' | 'blood' }> = ({
  className = '',
  style,
  tone = 'ink',
}) => {
  const c = tone === 'blood' ? PALETTE.blood : PALETTE.ink;
  return (
    <svg viewBox="0 0 100 130" className={className} style={style} {...svgProps}>
      <circle cx="50" cy="16" r="11" stroke={c} strokeWidth={6} />
      <path d="M50 27 L50 112" stroke={c} strokeWidth={7} />
      <path d="M24 44 L76 44" stroke={c} strokeWidth={6} />
      <path
        d="M12 74 C12 104 30 118 50 118 C70 118 88 104 88 74"
        stroke={c}
        strokeWidth={7}
      />
      <path d="M2 68 L22 78 L14 56 Z" fill={c} />
      <path d="M98 68 L78 78 L86 56 Z" fill={c} />
    </svg>
  );
};
