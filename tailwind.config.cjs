/**
 * BÁVARO TOURS — "CARNIVAL PRESS".
 *
 * The starting point is a trash-polka sleeve: bone paper, black ink, exactly
 * one red, realistic engraving colliding with brush strokes, stencil slabs
 * and torn edges. Nothing here is a pill. That discipline is what stops a
 * tattoo-flash look turning into a template, so it stays.
 *
 * What the press is PRINTING has changed. This one runs Dominican carnival —
 * the Diablo Cojuelo mask, the gagá drums, colmado hand-lettering — and the
 * Afro-Latin line it descends from: Adinkra stamps, mola appliqué stripes,
 * Taíno petroglyph. So the single red opens into the rasta triad, and each of
 * the three is given exactly ONE job, which is the only thing that stops red,
 * gold and green becoming a parrot:
 *
 *   RED IS ACT.     Book, call, submit, the chosen option, the live price.
 *                   Nothing else on the site is red. This is inherited whole
 *                   from the trash-polka sheet and it is the rule that makes
 *                   the rest safe.
 *   GOLD IS SHOUT.  Flat stencil slabs under display type, stamps, the sun.
 *                   It carries ink and never white — 9:1 against ink, 2:1
 *                   against white, so the decision is arithmetic.
 *   GREEN IS LAND.  Palm and bush, the tropical subject, "included" and
 *                   "ready". Structural. Never an action.
 *
 * Bone and ink carry everything else, exactly as before: structure, body
 * copy, photography and chrome are black on bone, and nothing competes.
 *
 * The old token names are kept deliberately. Several hundred colour utilities
 * are already scattered through the markup, so remapping the tokens lands all
 * of them inside this system at once rather than leaving pastels behind.
 */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ink. Near-black rather than black, so the red never vibrates.
        ink: {
          DEFAULT: '#14100E',
          soft: '#3B342F',
          light: '#6E645C',
        },
        // Bone paper. Warm, slightly dirty, like the stock a flash sheet is
        // printed on.
        paper: {
          DEFAULT: '#EDE4D3',
          warm: '#E3D7C0',
          deep: '#CEBDA0',
        },
        // THE red. Named `mango` because that is what the markup already
        // calls the primary action colour.
        mango: {
          light: '#E23A3A',
          DEFAULT: '#C1121F',
          dark: '#7A0A14',
        },
        // Oxblood: the same red pushed into shadow, for alerts and the
        // second-tier accent.
        hibiscus: {
          light: '#E23A3A',
          DEFAULT: '#8E0F1E',
          dark: '#560711',
        },
        // Graphite. What used to be the water is now the neutral that carries
        // links, secondary chrome and quiet fills.
        // The sea, read at depth. Structural, quiet, carries links and
        // secondary chrome without ever competing with the red.
        lagoon: {
          light: '#8FC9C2',
          DEFAULT: '#16787A',
          dark: '#0B4548',
        },
        // Smoke: a cooler grey for tertiary surfaces.
        // Smoke on bone. The tertiary surface — dust, shadow on paper, the
        // grey of a photocopy that has been run one time too many.
        sky: {
          light: '#DCD2BF',
          DEFAULT: '#8A8076',
          dark: '#2A2520',
        },
        // Ink-green. Almost black; keeps "success" legible without opening a
        // second hue.
        // THE LAND. Palm and bush, cut as a woodblock rather than grown — it
        // is the tropical subject and the "included / ready" of the
        // interface. Never an action; that is the red's job alone.
        jungle: {
          light: '#7FB069',
          DEFAULT: '#2E7D4F',
          dark: '#14532D',
        },
        // Aliased to the red — the old warm CTA band is now a red band.
        // THE SHOUT. Gilt stencil, brass, the sun on a carnival mask. It goes
        // under display type as a flat slab and it carries INK, never white:
        // ink on this gold is 9:1, white on it is 2:1, so the choice is made
        // for us. Never body text, never a whole surface.
        sunset: {
          light: '#FFD24A',
          DEFAULT: '#F2A413',
          dark: '#B36F00',
        },
        // Bruise: violet-black, the one place a third value is allowed.
        // Carnival violet — the dusk in a Diablo Cojuelo costume. Spent on
        // almost nothing, which is what keeps it worth having.
        grape: {
          light: '#C0B3D6',
          DEFAULT: '#5B4B8A',
          dark: '#332A52',
        },
        // Legacy aliases from two redesigns ago. Kept pointing at live tokens
        // so a stray class name resolves to ink or red, never to a pastel.
        tropicalGreen: '#3E4A38',
        tropicalBlue: '#2E7D4F',
        sandyBeige: '#E3D7C0',
        sunsetOrange: '#C1121F',
        oceanWave: '#2E7D4F',
      },
      fontFamily: {
        // Anton: one weight, condensed, no taste of its own — which is what a
        // poster wants. It is set enormous, tight and in caps, and the gold
        // slab does the decorating.
        heading: ['Anton', 'Impact', 'sans-serif'],
        display: ['Anton', 'Impact', 'sans-serif'],
        // Permanent Marker is the hand on the sheet: the correction, the
        // price scrawled over the printed one, the arrow drawn in afterwards.
        accent: ['"Permanent Marker"', 'cursive'],
        script: ['"Permanent Marker"', 'cursive'],
        // Barlow reads cleanly at small sizes over a textured ground, which
        // the display face emphatically does not.
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
        serif: ['Barlow', 'system-ui', 'sans-serif'],
        // The documentary layer — stamped serials, coordinates, the
        // barcode's caption. Trash polka is full of paperwork, and Special
        // Elite is a typewriter that has been photocopied a few times, which
        // is more of the right thing than a clean mono would be. It is
        // already in the sheet's font request, so it costs nothing to use.
        mono: ['"Special Elite"', 'ui-monospace', 'monospace'],
        stamp: ['"Special Elite"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        // Engraved ray burst, drawn in hairlines rather than as a glow.
        'sun-rays': 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(20, 16, 14,0.14) 0deg 1.4deg, transparent 1.4deg 9deg)',
        // Halftone: the dot screen a newspaper photo breaks into.
        'halftone': 'radial-gradient(circle at 50% 50%, rgba(20, 16, 14,0.5) 1.1px, transparent 1.4px)',
        'halftone-red': 'radial-gradient(circle at 50% 50%, rgba(193,18,31,0.55) 1.1px, transparent 1.4px)',
        // Hard diagonal hazard ruling, used on edges and progress rails.
        'hazard': 'repeating-linear-gradient(45deg, #14100E 0 9px, transparent 9px 18px)',
        'hazard-red': 'repeating-linear-gradient(45deg, #C1121F 0 9px, transparent 9px 18px)',
        // Crosshatch, the engraver's shading.
        'crosshatch': 'repeating-linear-gradient(45deg, rgba(20, 16, 14,0.22) 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, rgba(20, 16, 14,0.22) 0 1px, transparent 1px 6px)',
        // Section washes, now made of ink and red rather than sea and sun.
        'sky-wash': 'linear-gradient(180deg, #EDE4D3 0%, #E3D7C0 60%, #CEBDA0 100%)',
        'sunset-wash': 'linear-gradient(180deg, #14100E 0%, #1A0507 55%, #560711 100%)',
        'lagoon-wash': 'linear-gradient(180deg, #0B4548 0%, #14100E 100%)',
        'jungle-wash': 'linear-gradient(180deg, #3E4A38 0%, #1F261C 100%)',
        'paper-wash': 'linear-gradient(180deg, #EDE4D3 0%, #E3D7C0 100%)',
        'blood-wash': 'linear-gradient(180deg, #C1121F 0%, #7A0A14 55%, #14100E 100%)',
      },
      boxShadow: {
        // Tailwind's own scale is overridden, not just extended. `shadow-lg`
        // and friends appear ~50 times in the markup and every one of them
        // was a soft haze; here they are all hard offsets, so a stray
        // utility can no longer soften a plate.
        'sm': '2px 2px 0 0 #14100E',
        DEFAULT: '3px 3px 0 0 #14100E',
        'md': '4px 4px 0 0 #14100E',
        'lg': '6px 6px 0 0 #14100E',
        'xl': '9px 9px 0 0 #14100E',
        '2xl': '13px 13px 0 0 #14100E',
        'inner': 'inset 3px 3px 0 0 rgba(20, 16, 14, 0.22)',
        'none': '0 0 #0000',
        // Hard, un-blurred offsets. The look is a block print out of
        // register, not a lifted card.
        'ink-sm': '3px 3px 0 0 #14100E',
        'ink': '5px 5px 0 0 #14100E',
        'ink-lg': '9px 9px 0 0 #14100E',
        'ink-xl': '13px 13px 0 0 #14100E',
        // A misprint: black offset one way, red the other.
        'misprint': '5px 5px 0 0 #14100E, -3px -3px 0 0 #C1121F',
        'misprint-lg': '9px 9px 0 0 #14100E, -5px -5px 0 0 #C1121F',
        'mango': '5px 5px 0 0 #C1121F',
        'lagoon': '5px 5px 0 0 #14532D',
        'hibiscus': '5px 5px 0 0 #560711',
        'bone': '5px 5px 0 0 #EDE4D3',
        'lift': '0 14px 28px -14px rgba(20, 16, 14, 0.7)',
      },
      borderRadius: {
        // Trash polka has no soft corners. The whole scale collapses to a
        // hairline so every `rounded-*` and `rounded-full` already in the
        // markup produces a cut slab instead of a pill.
        'none': '0px',
        'sm': '0px',
        DEFAULT: '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '1px',
        '3xl': '1px',
        'full': '0px',
        // Opt back in where a circle is genuinely the meaning (a stamp, a
        // seal, a bullet).
        'seal': '9999px',
        'blob': '48% 52% 40% 60% / 55% 44% 56% 45%',
      },
      letterSpacing: {
        stencil: '0.22em',
      },
      animation: {
        'float': 'float 7s ease-in-out infinite',
        'sway': 'jitter 5s steps(1, end) infinite',
        'spin-slow': 'spin 90s linear infinite',
        'bob': 'bob 5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drift': 'drift 60s linear infinite',
        'ink-bleed': 'inkBleed 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'flicker': 'flicker 6s steps(1, end) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-9px)' },
        },
        // Not a sway any more — a nervous, stepped twitch, like a stencil
        // that keeps slipping.
        jitter: {
          '0%, 92%, 100%': { transform: 'rotate(0deg) translate(0, 0)' },
          '94%': { transform: 'rotate(-0.6deg) translate(-1px, 1px)' },
          '96%': { transform: 'rotate(0.5deg) translate(1px, -1px)' },
          '98%': { transform: 'rotate(-0.3deg) translate(0, 1px)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(-0.8deg)' },
          '50%': { transform: 'translateY(-7px) rotate(0.8deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(-50%, 0, 0)' },
        },
        // Ink soaking into paper: the reveal for stamped elements.
        inkBleed: {
          '0%': { opacity: '0', filter: 'blur(6px)', transform: 'scale(1.04)' },
          '100%': { opacity: '1', filter: 'blur(0)', transform: 'scale(1)' },
        },
        flicker: {
          '0%, 88%, 100%': { opacity: '1' },
          '90%': { opacity: '0.35' },
          '92%': { opacity: '1' },
          '94%': { opacity: '0.6' },
        },
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
