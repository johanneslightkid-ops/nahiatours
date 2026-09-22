/**
 * LD VIP — the trash-polka / tattoo-flash design system.
 *
 * The site used to be a flat illustrated tropical poster: cream paper, mango
 * and lagoon, rounded sticker shapes. It is now drawn the way a trash-polka
 * sleeve is drawn — bone paper, black ink, and exactly one red. Realistic
 * engraved linework collides with brush strokes, splatters, stencil slabs and
 * torn edges, and the whole thing is squared off: nothing here is a pill.
 *
 * Two rules make the palette do the work of the interface:
 *
 *   1. RED MEANS ACT. Every colour that is not black, bone or grey is the one
 *      red, and the red is reserved for things a visitor can do — book, plan,
 *      call, submit, the selected option, the live price.
 *   2. EVERYTHING ELSE IS INK. Structure, photography, chrome and body copy
 *      are black on bone. Nothing competes with the red.
 *
 * The old token names are kept on purpose. `mango` is the red, `lagoon` and
 * `sky` are greys, `jungle` is an ink-green — so the several hundred colour
 * utilities already scattered through the markup all land inside the new
 * system instead of leaving tropical pastels behind.
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
          DEFAULT: '#0C0C0D',
          soft: '#3B3B3F',
          light: '#6F6F76',
        },
        // Bone paper. Warm, slightly dirty, like the stock a flash sheet is
        // printed on.
        paper: {
          DEFAULT: '#EFE9DD',
          warm: '#E5DDCD',
          deep: '#D5CAB4',
        },
        // THE red. Named `mango` because that is what the markup already
        // calls the primary action colour.
        mango: {
          light: '#E63946',
          DEFAULT: '#C1121F',
          dark: '#8B0A15',
        },
        // Oxblood: the same red pushed into shadow, for alerts and the
        // second-tier accent.
        hibiscus: {
          light: '#E63946',
          DEFAULT: '#A4161A',
          dark: '#6A040F',
        },
        // Graphite. What used to be the water is now the neutral that carries
        // links, secondary chrome and quiet fills.
        lagoon: {
          light: '#CFC7B7',
          DEFAULT: '#4A4A4E',
          dark: '#151517',
        },
        // Smoke: a cooler grey for tertiary surfaces.
        sky: {
          light: '#DED7C9',
          DEFAULT: '#8A8A90',
          dark: '#26262A',
        },
        // Ink-green. Almost black; keeps "success" legible without opening a
        // second hue.
        jungle: {
          light: '#8A8F79',
          DEFAULT: '#3E4A38',
          dark: '#1F261C',
        },
        // Aliased to the red — the old warm CTA band is now a red band.
        sunset: {
          light: '#E63946',
          DEFAULT: '#C1121F',
          dark: '#8B0A15',
        },
        // Bruise: violet-black, the one place a third value is allowed.
        grape: {
          light: '#9A93A3',
          DEFAULT: '#3A3542',
          dark: '#1C1922',
        },
        // Legacy aliases from two redesigns ago. Kept pointing at live tokens
        // so a stray class name resolves to ink or red, never to a pastel.
        tropicalGreen: '#3E4A38',
        tropicalBlue: '#4A4A4E',
        sandyBeige: '#E5DDCD',
        sunsetOrange: '#C1121F',
        oceanWave: '#4A4A4E',
      },
      fontFamily: {
        // Anton is the shout: poster caps, headlines, prices.
        heading: ['Anton', '"Oswald"', 'Impact', 'sans-serif'],
        display: ['Anton', '"Oswald"', 'Impact', 'sans-serif'],
        // `font-serif` still appears in the markup; point it at the display
        // face so nothing falls back to Times.
        serif: ['Anton', '"Oswald"', 'Impact', 'sans-serif'],
        // Oswald is the condensed voice of the interface: labels, nav, badges.
        condensed: ['Oswald', '"Barlow Condensed"', 'sans-serif'],
        // Barlow reads long-form without breaking the industrial register.
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
        // Typewriter: stamps, catalogue numbers, filing marks.
        mono: ['"Special Elite"', '"Courier New"', 'monospace'],
        stamp: ['"Special Elite"', '"Courier New"', 'monospace'],
        // Marker: hand annotations scrawled over the layout.
        accent: ['"Permanent Marker"', 'cursive'],
        script: ['"Permanent Marker"', 'cursive'],
      },
      backgroundImage: {
        // Engraved ray burst, drawn in hairlines rather than as a glow.
        'sun-rays': 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(12,12,13,0.14) 0deg 1.4deg, transparent 1.4deg 9deg)',
        // Halftone: the dot screen a newspaper photo breaks into.
        'halftone': 'radial-gradient(circle at 50% 50%, rgba(12,12,13,0.5) 1.1px, transparent 1.4px)',
        'halftone-red': 'radial-gradient(circle at 50% 50%, rgba(193,18,31,0.55) 1.1px, transparent 1.4px)',
        // Hard diagonal hazard ruling, used on edges and progress rails.
        'hazard': 'repeating-linear-gradient(45deg, #0C0C0D 0 9px, transparent 9px 18px)',
        'hazard-red': 'repeating-linear-gradient(45deg, #C1121F 0 9px, transparent 9px 18px)',
        // Crosshatch, the engraver's shading.
        'crosshatch': 'repeating-linear-gradient(45deg, rgba(12,12,13,0.22) 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, rgba(12,12,13,0.22) 0 1px, transparent 1px 6px)',
        // Section washes, now made of ink and red rather than sea and sun.
        'sky-wash': 'linear-gradient(180deg, #EFE9DD 0%, #E5DDCD 60%, #D5CAB4 100%)',
        'sunset-wash': 'linear-gradient(180deg, #0C0C0D 0%, #1A0507 55%, #6A040F 100%)',
        'lagoon-wash': 'linear-gradient(180deg, #26262A 0%, #0C0C0D 100%)',
        'jungle-wash': 'linear-gradient(180deg, #3E4A38 0%, #1F261C 100%)',
        'paper-wash': 'linear-gradient(180deg, #EFE9DD 0%, #E5DDCD 100%)',
        'blood-wash': 'linear-gradient(180deg, #C1121F 0%, #8B0A15 55%, #0C0C0D 100%)',
      },
      boxShadow: {
        // Tailwind's own scale is overridden, not just extended. `shadow-lg`
        // and friends appear ~50 times in the markup and every one of them
        // was a soft haze; here they are all hard offsets, so a stray
        // utility can no longer soften a plate.
        'sm': '2px 2px 0 0 #0C0C0D',
        DEFAULT: '3px 3px 0 0 #0C0C0D',
        'md': '4px 4px 0 0 #0C0C0D',
        'lg': '6px 6px 0 0 #0C0C0D',
        'xl': '9px 9px 0 0 #0C0C0D',
        '2xl': '13px 13px 0 0 #0C0C0D',
        'inner': 'inset 3px 3px 0 0 rgba(12, 12, 13, 0.22)',
        'none': '0 0 #0000',
        // Hard, un-blurred offsets. The look is a block print out of
        // register, not a lifted card.
        'ink-sm': '3px 3px 0 0 #0C0C0D',
        'ink': '5px 5px 0 0 #0C0C0D',
        'ink-lg': '9px 9px 0 0 #0C0C0D',
        'ink-xl': '13px 13px 0 0 #0C0C0D',
        // A misprint: black offset one way, red the other.
        'misprint': '5px 5px 0 0 #0C0C0D, -3px -3px 0 0 #C1121F',
        'misprint-lg': '9px 9px 0 0 #0C0C0D, -5px -5px 0 0 #C1121F',
        'mango': '5px 5px 0 0 #C1121F',
        'lagoon': '5px 5px 0 0 #151517',
        'hibiscus': '5px 5px 0 0 #6A040F',
        'bone': '5px 5px 0 0 #EFE9DD',
        'lift': '0 14px 28px -14px rgba(12, 12, 13, 0.7)',
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
