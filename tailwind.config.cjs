/**
 * Watercolour & ink design tokens.
 *
 * The previous system was a sticker sheet: flat poster colour, a 2.5px black
 * outline round everything, and a hard un-blurred drop shadow. This one is
 * painted. Three rules replace those three:
 *
 *   1. PIGMENT, NOT SCREEN COLOUR. Every hue below is mixed to sit where a
 *      real watercolour pigment sits — desaturated in the shadows, warm in the
 *      lights. Nothing is neon and nothing is pure.
 *   2. INK IS BLUE-GREEN. There is no black on this site. The darkest value is
 *      a deep botanical teal, which is what a dip pen actually dries to over a
 *      wash and what keeps the page warm.
 *   3. DEPTH COMES FROM PAPER. Shadows are soft, low-contrast and tinted with
 *      the ink, the way a sheet lifts off a table — never an offset block.
 *
 * The old token NAMES are kept (mango, lagoon, jungle…) because hundreds of
 * class names across the app spell them, but each one now resolves to its
 * pigment equivalent. The newer, plainer names below them (sea, palm, coral,
 * sand) are the vocabulary to reach for in new markup.
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Ink ──────────────────────────────────────────────────────────
        // Deep blue-green instead of black, at three dilutions.
        ink: {
          DEFAULT: '#14332F',
          soft: '#3E605A',
          light: '#7B968F',
        },

        // ── Paper ────────────────────────────────────────────────────────
        // Handmade stock: warm ivory, a warmer tone, and the sand it sits on.
        paper: {
          DEFAULT: '#FBF5E9',
          warm: '#F6EBD8',
          deep: '#EEDCC0',
          edge: '#E3CEAE',
        },
        sand: {
          light: '#F6EBD8',
          DEFAULT: '#EEDCC0',
          dark: '#D9BE96',
        },

        // ── Caribbean sea ────────────────────────────────────────────────
        lagoon: {
          light: '#7FCBCE',
          DEFAULT: '#2E9AA6',
          dark: '#14636F',
        },
        sea: {
          foam: '#C9E8E2',
          light: '#7FCBCE',
          DEFAULT: '#2E9AA6',
          deep: '#14636F',
          night: '#0E3F4A',
        },
        sky: {
          light: '#D6ECF2',
          DEFAULT: '#9CC9DA',
          dark: '#5E93AC',
        },

        // ── Vegetation ───────────────────────────────────────────────────
        jungle: {
          light: '#8DBE8A',
          DEFAULT: '#4C8657',
          dark: '#235141',
        },
        palm: {
          light: '#8DBE8A',
          DEFAULT: '#4C8657',
          deep: '#235141',
        },

        // ── Tropical flowers ─────────────────────────────────────────────
        // Decorative pigments. `hibiscus` is a wash, not a text background:
        // neither ink nor paper clears 4.5:1 on it. Use it under, never behind.
        hibiscus: {
          light: '#E9A8B8',
          DEFAULT: '#C9557A',
          dark: '#9A3A5C',
        },
        coral: {
          light: '#F3A98F',
          DEFAULT: '#E0735B',
          deep: '#B4492F',
        },

        // ── Sunset ───────────────────────────────────────────────────────
        mango: {
          light: '#F6C98B',
          DEFAULT: '#E9A13B',
          dark: '#C07A1E',
        },
        sunset: {
          light: '#F3A98F',
          DEFAULT: '#E0735B',
          dark: '#B4492F',
        },
        dusk: {
          light: '#C4B7D8',
          DEFAULT: '#9C8CB8',
          dark: '#6E5B8C',
        },
        grape: {
          light: '#C4B7D8',
          DEFAULT: '#9C8CB8',
          dark: '#6E5B8C',
        },

        // Legacy aliases, kept so a stray class name still lands on a pigment.
        tropicalGreen: '#4C8657',
        tropicalBlue: '#2E9AA6',
        sandyBeige: '#EEDCC0',
        sunsetOrange: '#E0735B',
        oceanWave: '#2E9AA6',
      },

      fontFamily: {
        // Fraunces carries the voice: a soft, slightly wonky serif that reads
        // hand-cut rather than corporate. Karla does the work.
        heading: ['Fraunces', 'Georgia', 'serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Karla', 'system-ui', 'sans-serif'],
        body: ['Karla', 'system-ui', 'sans-serif'],
        // `font-accent` used to be a marker pen. A hand face next to painted
        // artwork tips the whole page into a nursery book, so the accent is
        // now the display face italic — the travel-journal caption, not the
        // crayon.
        accent: ['Fraunces', 'Georgia', 'serif'],
        script: ['Fraunces', 'Georgia', 'serif'],
      },

      backgroundImage: {
        'sky-wash': 'linear-gradient(180deg, #D6ECF2 0%, #E8F2F0 42%, #FBF5E9 100%)',
        'sunset-wash': 'linear-gradient(180deg, #A85338 0%, #8A3F55 55%, #5E3560 100%)',
        'lagoon-wash': 'linear-gradient(180deg, #25767F 0%, #17606C 50%, #0E4450 100%)',
        'jungle-wash': 'linear-gradient(180deg, #8DBE8A 0%, #4C8657 60%, #235141 100%)',
        'paper-wash': 'linear-gradient(180deg, #FBF5E9 0%, #F6EBD8 100%)',
      },

      boxShadow: {
        // Paper lifting off a table: soft, tinted with the ink, never black.
        // The old names are kept because the markup is full of them.
        'ink-sm': '0 2px 6px -2px rgba(20, 51, 47, 0.22)',
        'ink': '0 10px 22px -16px rgba(20, 51, 47, 0.45), 0 2px 6px -3px rgba(20, 51, 47, 0.18)',
        'ink-lg': '0 20px 38px -26px rgba(20, 51, 47, 0.5), 0 4px 10px -6px rgba(20, 51, 47, 0.16)',
        'ink-xl': '0 34px 60px -38px rgba(20, 51, 47, 0.55), 0 6px 14px -8px rgba(20, 51, 47, 0.18)',
        'mango': '0 10px 22px -16px rgba(192, 122, 30, 0.6)',
        'lagoon': '0 10px 22px -16px rgba(20, 99, 111, 0.6)',
        'hibiscus': '0 10px 22px -16px rgba(154, 58, 92, 0.6)',
        'lift': '0 24px 44px -28px rgba(20, 51, 47, 0.55)',
      },

      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
        '3xl': '30px',
        blob: '46% 54% 52% 48% / 52% 46% 54% 48%',
      },

      animation: {
        float: 'float 9s ease-in-out infinite',
        sway: 'sway 11s ease-in-out infinite',
        'spin-slow': 'spin 120s linear infinite',
        bob: 'bob 8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.7s ease-out forwards',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        drift: 'drift 60s linear infinite',
      },

      keyframes: {
        // Amplitudes are half what they were. A painted boat rocks; it does
        // not bounce.
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-1.2deg)' },
          '50%': { transform: 'rotate(1.2deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(-0.4deg)' },
          '50%': { transform: 'translateY(-4px) rotate(0.4deg)' },
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
      },

      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
