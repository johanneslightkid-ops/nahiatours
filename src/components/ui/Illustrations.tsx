import React, { useId } from 'react';

/**
 * Caribbean daylight scenery.
 *
 * These were flat poster shapes. They are now lit: every form is modelled
 * with gradients — a light side, a shadow side, and a bounce where the sea
 * throws light back up underneath. The result reads as photography reduced to
 * its essentials rather than as illustration, which is the register the rest
 * of the design works in.
 *
 * Two rules carry over from the research and apply to every drawing here:
 *
 *   • White is the light. Highlights are pure white, never a pale tint —
 *     sun on a wave crest, glare on a leaf, foam.
 *   • Warm light, cool shadow. Sunlit faces run towards gold, shadowed ones
 *     towards the sea. That single relationship is what makes flat vector
 *     shapes read as though they are actually outdoors.
 *
 * Gradients need document-unique ids, so each component takes one from
 * `useId()`. Sharing a static id across instances renders correctly today but
 * is invalid markup and breaks the moment two instances want to differ.
 *
 * Everything is decorative: each drawing is `aria-hidden` and takes its size
 * from the caller's className.
 */

export const INK = '#0E2E3B';

const PALETTE = {
  ink: INK,
  inkSoft: '#3D5A66',
  lagoonLight: '#9CEDE6',
  lagoon: '#14B8C4',
  lagoonDark: '#0A7C93',
  abyss: '#08415C',
  skyLight: '#D6F1FF',
  sky: '#5EC5F5',
  skyDark: '#2A7FB8',
  sand: '#FFF3E4',
  sandDeep: '#FBE6CB',
  coral: '#FF6B45',
  coralLight: '#FF9B76',
  gold: '#FFB703',
  goldLight: '#FFD68C',
  palm: '#2FA36B',
  palmLight: '#93DCA9',
  palmDark: '#186B48',
  white: '#FFFFFF',
};

export interface IllustrationProps {
  className?: string;
  style?: React.CSSProperties;
}

const svgProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  fill: 'none',
  'aria-hidden': true,
  focusable: false as const,
};

/* ── The sun ──────────────────────────────────────────────────────────────
   A disc of pure white at the core, blooming out through gold. The rays are
   soft wedges rather than spikes, because real glare has no edge. */
export const SunBurst: React.FC<IllustrationProps & { spin?: boolean }> = ({
  className = '',
  style,
  spin = false,
}) => {
  const id = useId();
  return (
    <svg viewBox="0 0 240 240" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={`${id}-core`}>
          <stop offset="0%" stopColor={PALETTE.white} />
          <stop offset="45%" stopColor="#FFF0C9" />
          <stop offset="100%" stopColor={PALETTE.gold} />
        </radialGradient>
        <radialGradient id={`${id}-bloom`}>
          <stop offset="0%" stopColor={PALETTE.white} stopOpacity="0.9" />
          <stop offset="38%" stopColor={PALETTE.goldLight} stopOpacity="0.42" />
          <stop offset="70%" stopColor={PALETTE.gold} stopOpacity="0.12" />
          <stop offset="100%" stopColor={PALETTE.gold} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Bloom first — the haze the disc sits inside. */}
      <circle cx="120" cy="120" r="118" fill={`url(#${id}-bloom)`} />

      {/* Soft rays, turning slowly if asked. */}
      <g
        className={spin ? 'animate-spin-slow' : undefined}
        style={{ transformOrigin: '120px 120px' }}
        opacity="0.5"
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <path
            key={i}
            d="M120 120 L112 8 L128 8 Z"
            fill={`url(#${id}-bloom)`}
            transform={`rotate(${i * 22.5} 120 120)`}
          />
        ))}
      </g>

      <circle cx="120" cy="120" r="46" fill={`url(#${id}-core)`} />
      <circle cx="120" cy="120" r="46" fill={PALETTE.white} opacity="0.35" />
    </svg>
  );
};

/* ── Cloud ────────────────────────────────────────────────────────────────
   Trade-wind cumulus: bright top where the sun hits, cool underside where
   the sea bounces light back into it. */
export const Cloud: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 200 110" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE.white} />
          <stop offset="58%" stopColor="#FAFDFF" />
          <stop offset="100%" stopColor="#D5E8F2" />
        </linearGradient>
      </defs>
      <path
        d="M42 96 C18 96 6 74 22 60 C10 38 34 16 54 28 C64 4 106 0 118 24 C142 10 172 28 164 52 C190 56 192 92 162 96 Z"
        fill={`url(#${id}-body)`}
      />
      {/* The lit crown, in unpainted white. */}
      <path
        d="M60 30 C70 12 100 8 112 26 C96 20 74 22 60 30 Z"
        fill={PALETTE.white}
        opacity="0.95"
      />
    </svg>
  );
};

/* ── Palm frond ───────────────────────────────────────────────────────────
   Each leaflet is its own gradient, so the frond turns from sunlit tip to
   shaded base the way a real one does. */
export const PalmFrond: React.FC<IllustrationProps & { color?: 'palm' | 'light' | 'dark' }> = ({
  className = '',
  style,
  color = 'palm',
}) => {
  const id = useId();
  const top =
    color === 'light' ? PALETTE.palmLight : color === 'dark' ? PALETTE.palm : PALETTE.palmLight;
  const bottom =
    color === 'light' ? PALETTE.palm : color === 'dark' ? PALETTE.palmDark : PALETTE.palmDark;

  return (
    <svg viewBox="0 0 110 130" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-leaf`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={bottom} />
        </linearGradient>
      </defs>
      {Array.from({ length: 9 }).map((_, i) => {
        const y = 12 + i * 12;
        const spread = 40 - i * 2.6;
        return (
          <g key={i}>
            <path
              d={`M55 ${y} C ${55 - spread * 0.5} ${y - 9} ${55 - spread} ${y - 2} ${55 - spread - 10} ${y + 14} C ${55 - spread * 0.7} ${y + 11} ${55 - spread * 0.25} ${y + 7} 55 ${y}`}
              fill={`url(#${id}-leaf)`}
            />
            <path
              d={`M55 ${y} C ${55 + spread * 0.5} ${y - 9} ${55 + spread} ${y - 2} ${55 + spread + 10} ${y + 14} C ${55 + spread * 0.7} ${y + 11} ${55 + spread * 0.25} ${y + 7} 55 ${y}`}
              fill={`url(#${id}-leaf)`}
            />
          </g>
        );
      })}
      <path d="M55 6 C52 44 54 84 55 124" stroke={PALETTE.palmDark} strokeWidth={3.5} strokeLinecap="round" />
    </svg>
  );
};

/* ── Palm tree ────────────────────────────────────────────────────────────
   Lit from the left: the trunk carries a bright edge and a shaded one, and
   the fronds run from sunlit at the crown to deep green underneath. */
export const PalmTree: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 160 200" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-trunk`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C89A6B" />
          <stop offset="35%" stopColor="#A97C4E" />
          <stop offset="100%" stopColor="#6E4A2C" />
        </linearGradient>
        <linearGradient id={`${id}-lit`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={PALETTE.palmLight} />
          <stop offset="100%" stopColor={PALETTE.palm} />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={PALETTE.palm} />
          <stop offset="100%" stopColor={PALETTE.palmDark} />
        </linearGradient>
      </defs>

      <path
        d="M70 196 C64 152 62 108 48 66 L74 58 C86 104 88 150 90 196 Z"
        fill={`url(#${id}-trunk)`}
      />
      {/* Bright edge where the sun rakes across the trunk. */}
      <path d="M68 190 C63 150 60 110 50 70 L56 68 C66 108 70 150 74 190 Z" fill={PALETTE.white} opacity="0.16" />

      {/* Back fronds in shade, front fronds in light — that ordering is what
          gives the crown depth. */}
      {[-96, -58, 96, 58].map((r, i) => (
        <path
          key={`b${i}`}
          d="M62 62 C36 40 16 44 0 62 C20 58 40 66 62 62 Z"
          fill={`url(#${id}-shade)`}
          transform={`rotate(${r} 62 62)`}
        />
      ))}
      {[-20, 20, 0, -140, 140].map((r, i) => (
        <path
          key={`f${i}`}
          d="M62 62 C36 38 16 42 2 60 C22 56 40 66 62 62 Z"
          fill={`url(#${id}-lit)`}
          transform={`rotate(${r} 62 62)`}
        />
      ))}
      <circle cx="62" cy="62" r="7" fill="#8B5E3C" />
      <circle cx="60" cy="60" r="3" fill={PALETTE.white} opacity="0.4" />
    </svg>
  );
};

/* ── Toucan ───────────────────────────────────────────────────────────────
   Kept colourful and friendly — this is the one drawing children look for. */
export const Toucan: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 150 120" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#2B4250" />
          <stop offset="100%" stopColor="#0E2E3B" />
        </linearGradient>
        <linearGradient id={`${id}-beak`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor={PALETTE.gold} />
          <stop offset="55%" stopColor={PALETTE.coralLight} />
          <stop offset="100%" stopColor={PALETTE.coral} />
        </linearGradient>
      </defs>
      <path
        d="M108 104 C84 114 54 104 47 79 C40 54 56 32 79 30 C104 28 118 48 116 71 C115 85 113 95 108 104 Z"
        fill={`url(#${id}-body)`}
      />
      <path
        d="M70 46 C56 55 54 76 65 90 C74 101 90 101 99 94 C83 87 74 67 70 46 Z"
        fill="#FFFDF7"
      />
      <path d="M63 42 C40 34 14 41 6 55 C18 67 44 69 65 60 Z" fill={`url(#${id}-beak)`} />
      <path d="M20 47 C30 49 46 51 62 51" stroke={PALETTE.coral} strokeWidth={2} opacity="0.5" strokeLinecap="round" />
      <circle cx="82" cy="45" r="7" fill={PALETTE.white} />
      <circle cx="83" cy="45" r="3.2" fill={PALETTE.ink} />
      <circle cx="85" cy="43" r="1.2" fill={PALETTE.white} />
    </svg>
  );
};

/* ── Hibiscus ─────────────────────────────────────────────────────────────
   Petals lit from the centre out, the way a flower actually catches sun. */
export const Hibiscus: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
      <defs>
        <radialGradient id={`${id}-petal`} cx="0.5" cy="0.85">
          <stop offset="0%" stopColor="#FFE0B8" />
          <stop offset="45%" stopColor="#FFA9B9" />
          <stop offset="100%" stopColor="#FF5F7E" />
        </radialGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d="M60 58 C46 50 34 30 44 16 C54 4 74 8 76 26 C77 40 70 52 60 58 Z"
          fill={`url(#${id}-petal)`}
          transform={`rotate(${i * 72} 60 60)`}
        />
      ))}
      <circle cx="60" cy="60" r="11" fill={PALETTE.gold} />
      <circle cx="58" cy="57" r="4" fill={PALETTE.white} opacity="0.65" />
    </svg>
  );
};

/* ── Pineapple ────────────────────────────────────────────────────────── */
export const Pineapple: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 100 145" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#FFD98A" />
          <stop offset="45%" stopColor={PALETTE.gold} />
          <stop offset="100%" stopColor="#C97F0A" />
        </linearGradient>
        <linearGradient id={`${id}-crown`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={PALETTE.palmLight} />
          <stop offset="100%" stopColor={PALETTE.palmDark} />
        </linearGradient>
      </defs>
      {[-40, -20, 0, 20, 40].map((r) => (
        <path
          key={r}
          d="M50 46 C44 30 46 14 50 2 C56 14 58 30 52 46 Z"
          fill={`url(#${id}-crown)`}
          transform={`rotate(${r} 50 48)`}
        />
      ))}
      <path
        d="M50 44 C74 44 86 64 86 90 C86 118 72 136 50 136 C28 136 14 118 14 90 C14 64 26 44 50 44 Z"
        fill={`url(#${id}-body)`}
      />
      {/* Diamond skin, kept faint so it reads as texture not as a grid. */}
      <g stroke="#A9670A" strokeWidth={1.3} opacity="0.35">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={`a${i}`} d={`M${16 + i * 15} 46 L${-14 + i * 15} 134`} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={`b${i}`} d={`M${16 + i * 15} 134 L${-14 + i * 15} 46`} />
        ))}
      </g>
      <ellipse cx="34" cy="72" rx="10" ry="16" fill={PALETTE.white} opacity="0.25" />
    </svg>
  );
};

/* ── Sailboat ─────────────────────────────────────────────────────────────
   White sails against sea: the sail facing the sun is unpainted, the one
   turned away picks up shadow. */
export const Sailboat: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 130 140" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-sail`} x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" stopColor={PALETTE.white} />
          <stop offset="100%" stopColor="#DDEEF5" />
        </linearGradient>
        <linearGradient id={`${id}-hull`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE.lagoonDark} />
          <stop offset="100%" stopColor={PALETTE.abyss} />
        </linearGradient>
      </defs>
      <path d="M64 12 L64 98" stroke="#B98B5E" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M60 22 C38 42 30 62 28 90 L60 90 Z" fill={PALETTE.white} />
      <path d="M68 34 C86 48 94 68 96 90 L68 90 Z" fill={`url(#${id}-sail)`} />
      <path d="M12 96 L118 96 L100 122 L30 122 Z" fill={`url(#${id}-hull)`} />
      <path d="M20 102 L110 102" stroke={PALETTE.white} strokeWidth={2} opacity="0.35" strokeLinecap="round" />
      <path d="M64 12 L88 18 L64 26 Z" fill={PALETTE.coral} />
    </svg>
  );
};

/* ── Starfish ─────────────────────────────────────────────────────────── */
export const Starfish: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 120 120" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-star`} x1="0.3" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#FFCF9A" />
          <stop offset="55%" stopColor={PALETTE.coralLight} />
          <stop offset="100%" stopColor="#E0663C" />
        </linearGradient>
      </defs>
      <path
        d="M60 8 C64 8 66 12 72 34 C74 42 78 44 96 44 C114 44 116 50 102 62 C90 72 88 76 94 96 C100 114 94 118 78 106 C64 96 58 96 44 106 C28 118 22 114 28 96 C34 76 32 72 20 62 C6 50 8 44 26 44 C44 44 48 42 50 34 C56 12 58 8 60 8 Z"
        fill={`url(#${id}-star)`}
      />
      <g fill={PALETTE.white} opacity="0.4">
        <circle cx="60" cy="46" r="3" />
        <circle cx="48" cy="66" r="2.4" />
        <circle cx="72" cy="66" r="2.4" />
        <circle cx="60" cy="82" r="2" />
      </g>
    </svg>
  );
};

/* ── Cocktail ─────────────────────────────────────────────────────────── */
export const Cocktail: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 110 140" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-drink`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={PALETTE.goldLight} />
          <stop offset="55%" stopColor={PALETTE.coralLight} />
          <stop offset="100%" stopColor={PALETTE.coral} />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={PALETTE.white} stopOpacity="0.8" />
          <stop offset="50%" stopColor={PALETTE.skyLight} stopOpacity="0.35" />
          <stop offset="100%" stopColor={PALETTE.white} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path d="M16 22 L94 22 L55 76 Z" fill={`url(#${id}-glass)`} />
      <path d="M26 32 L84 32 L55 72 Z" fill={`url(#${id}-drink)`} />
      <path d="M55 76 L55 116 M32 118 L78 118" stroke="#CBDDE6" strokeWidth={5} strokeLinecap="round" />
      <path d="M76 22 C88 6 100 2 106 6" stroke={PALETTE.palm} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx="104" cy="8" r="8" fill={PALETTE.coral} />
      <circle cx="101" cy="5" r="3" fill={PALETTE.white} opacity="0.5" />
    </svg>
  );
};

/* ── Fish ─────────────────────────────────────────────────────────────── */
export const Fish: React.FC<IllustrationProps> = ({ className = '', style }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 150 90" className={className} style={style} {...svgProps}>
      <defs>
        <linearGradient id={`${id}-fish`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor={PALETTE.goldLight} />
          <stop offset="45%" stopColor={PALETTE.coralLight} />
          <stop offset="100%" stopColor={PALETTE.lagoon} />
        </linearGradient>
      </defs>
      <path
        d="M18 46 C34 18 76 12 104 30 C118 39 126 46 126 46 C126 46 118 53 104 62 C76 80 34 74 18 46 Z"
        fill={`url(#${id}-fish)`}
      />
      <path d="M126 46 L148 24 L143 46 L148 68 Z" fill={PALETTE.coral} opacity="0.85" />
      <path d="M62 14 C74 4 90 6 98 16" stroke={PALETTE.coral} strokeWidth={4} opacity="0.7" strokeLinecap="round" />
      <circle cx="36" cy="42" r="6" fill={PALETTE.white} />
      <circle cx="37" cy="42" r="2.8" fill={PALETTE.ink} />
    </svg>
  );
};

/* ── Distant birds ────────────────────────────────────────────────────── */
export const Birds: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 160 60" className={className} style={style} {...svgProps}>
    <g stroke={PALETTE.inkSoft} strokeWidth={2.4} strokeLinecap="round" fill="none" opacity="0.55">
      <path d="M8 26 C16 16 24 16 32 26" />
      <path d="M32 26 C40 16 48 16 56 26" />
      <path d="M66 42 C72 34 78 34 84 42" />
      <path d="M84 42 C90 34 96 34 102 42" />
      <path d="M112 18 C117 12 122 12 127 18" />
      <path d="M127 18 C132 12 137 12 142 18" />
    </g>
  </svg>
);

/* ── The waterline ────────────────────────────────────────────────────────
   The over-under, as a component. Sky above, lit water below, and along the
   seam a band of foam left pure white. Used wherever a section has to hand
   over to the next one. */
export const WaveBand: React.FC<IllustrationProps & { tone?: 'lagoon' | 'sky' | 'deep' }> = ({
  className = '',
  style,
  tone = 'lagoon',
}) => {
  const id = useId();
  const top = tone === 'deep' ? PALETTE.lagoon : tone === 'sky' ? PALETTE.skyLight : PALETTE.lagoonLight;
  const bottom = tone === 'deep' ? PALETTE.abyss : tone === 'sky' ? PALETTE.lagoonLight : PALETTE.lagoon;

  return (
    <svg
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      className={className}
      style={style}
      {...svgProps}
    >
      <defs>
        <linearGradient id={`${id}-water`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={bottom} />
        </linearGradient>
      </defs>
      {/* The swell. */}
      <path
        d="M0,52 C150,10 300,94 450,56 C600,18 750,98 900,60 C1020,30 1120,74 1200,48 L1200,120 L0,120 Z"
        fill={`url(#${id}-water)`}
      />
      {/* Foam riding the crest — unpainted white, per Homer. */}
      <path
        d="M0,52 C150,10 300,94 450,56 C600,18 750,98 900,60 C1020,30 1120,74 1200,48"
        stroke={PALETTE.white}
        strokeWidth={7}
        fill="none"
        opacity="0.92"
        strokeLinecap="round"
      />
      <path
        d="M0,64 C150,22 300,106 450,68 C600,30 750,110 900,72 C1020,42 1120,86 1200,60"
        stroke={PALETTE.white}
        strokeWidth={3}
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

/* ── Foam line ────────────────────────────────────────────────────────────
   The last reach of a wave up wet sand. */
export const FoamLine: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <svg viewBox="0 0 300 20" preserveAspectRatio="none" className={className} style={style} {...svgProps}>
    <path
      d="M2 12 C40 4 62 16 104 9 C148 2 178 15 222 8 C254 3 278 12 298 6"
      stroke={PALETTE.lagoon}
      strokeWidth={3}
      fill="none"
      opacity="0.55"
      strokeLinecap="round"
    />
    <path
      d="M2 16 C40 9 62 19 104 13 C148 7 178 18 222 12 C254 8 278 15 298 10"
      stroke="#FFFFFF"
      strokeWidth={2.5}
      fill="none"
      opacity="0.9"
      strokeLinecap="round"
    />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   Light
   Two pieces of pure atmosphere, used to bed content into the scene.
   ══════════════════════════════════════════════════════════════════════════ */

/** Hockney's caustics as a drop-in layer: thin white light on rippled water. */
export const Caustics: React.FC<IllustrationProps & { soft?: boolean }> = ({
  className = '',
  style,
  soft = false,
}) => (
  <span
    aria-hidden="true"
    className={`caustics ${soft ? 'caustics-soft' : ''} ${className}`}
    style={style}
  />
);

/** Sun glare — a bloom of pure white, for corners the light comes from. */
export const SunGlare: React.FC<IllustrationProps> = ({ className = '', style }) => (
  <span aria-hidden="true" className={`sun-glare ${className}`} style={style} />
);
