/**
 * Amigo Tours — oil on canvas.
 *
 * The previous design was a sticker sheet: flat poster colour, a hard black
 * outline round every object and a 4px offset shadow under it. This one is a
 * painting, in the tradition of Dominican and Haitian tropical oils — thick
 * saturated colour, a warm linen ground showing through everywhere, and
 * ornament borrowed from Taino pottery geometry rather than from a marker pen.
 *
 * THREE RULES, and every token below serves one of them.
 *
 *   1. EVERYTHING IS ON CANVAS. One warm linen ground runs under the whole
 *      site. There is no pure white and no pure black anywhere: the lightest
 *      value is `canvas-lift` and the darkest is `ink`, a deep umber-teal —
 *      what a dark oil dries to, not what a printer prints.
 *
 *   2. EDGES ARE BRUSHED, NOT DRAWN. Where a shape meets the ground it does so
 *      with a soft painted edge. Depth comes from the paint lifting off the
 *      weave (`shadow-oil-*`, warm close in and violet further out), never
 *      from an offset slab of colour.
 *
 *   3. COLOUR IS MIXED, NOT PICKED. Every hue carries some of its neighbour —
 *      greens lean gold, blues lean green, pinks lean coral. Shadows go
 *      violet, highlights go warm. Nothing here is a hue straight from the
 *      tube.
 *
 * MOTION. Every keyframe in this file moves `transform` or `opacity` and
 * nothing else, so it composites on the GPU and never triggers layout or
 * paint. The durations are long on purpose: a painting that fidgets is a
 * cartoon. WHERE each one is allowed to run is decided by useMotionBudget(),
 * not here.
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── The ground ──────────────────────────────────────────────────────
        // Linen, sized and toned. `lift` is a sheet laid on top of the weave,
        // not a white card: it still carries the warmth underneath.
        canvas: {
          DEFAULT: '#F7EEDC',
          deep: '#EFE0C6',
          shade: '#E4D2B4',
          lift: '#FDF8EE',
        },

        // ── The darkest value ───────────────────────────────────────────────
        // Umber mixed into viridian. Every piece of text is one of these, and
        // `ink` at full strength is as dark as this site goes.
        ink: {
          DEFAULT: '#22342E',
          soft: '#476056',
          light: '#84978D',
          wash: '#B9C4BB',
        },

        // ── Sea ─────────────────────────────────────────────────────────────
        // Bavaro turquoise over an ultramarine shelf.
        lagoon: {
          light: '#8FDCD0',
          DEFAULT: '#2FB6A4',
          dark: '#12796F',
        },
        sea: {
          light: '#5C9DBA',
          DEFAULT: '#1F6285',
          dark: '#0E3B52',
          // The admin's primary action, and the deepest water in the paintings.
          deep: '#0E3B52',
        },

        // ── Sun and sand ────────────────────────────────────────────────────
        mango: {
          light: '#FFCE7A',
          DEFAULT: '#F2A32B',
          dark: '#CE7A0D',
        },
        ochre: {
          light: '#E2C078',
          DEFAULT: '#C2963C',
          dark: '#96701F',
        },

        // ── Flamboyan ───────────────────────────────────────────────────────
        // The national tree's flower: red with orange in it, never scarlet.
        coral: {
          light: '#FF9A81',
          DEFAULT: '#E4573F',
          dark: '#B33421',
          deep: '#B33421',
        },
        hibiscus: {
          light: '#F599BA',
          DEFAULT: '#DB5589',
          dark: '#A82F5E',
        },

        // ── Foliage ─────────────────────────────────────────────────────────
        palm: {
          light: '#9CC873',
          DEFAULT: '#57913C',
          dark: '#2F5B24',
        },

        // ── The shadow colour ───────────────────────────────────────────────
        // Nothing is shadowed with black. Violet-grey is what a warm light
        // leaves behind, and it is most of the reason the page reads as paint.
        shade: {
          light: '#A79ABC',
          DEFAULT: '#6B5B8A',
          dark: '#413656',
        },

        // ── Admin surface roles ─────────────────────────────────────────────
        // The back office is written against roles rather than hues, so it
        // follows this palette without a single edit to its markup.
        paper: {
          DEFAULT: '#F7EEDC',
          warm: '#EFE0C6',
          deep: '#E4D2B4',
          card: '#FDF8EE',
        },

        // Legacy aliases, so a class name left over from an older design still
        // lands somewhere inside this palette instead of disappearing.
        sky: { light: '#B7E2EC', DEFAULT: '#5C9DBA', dark: '#1F6285' },
        jungle: { light: '#9CC873', DEFAULT: '#57913C', dark: '#2F5B24' },
        sunset: { light: '#FFB68F', DEFAULT: '#E4573F', dark: '#B33421' },
        grape: { light: '#A79ABC', DEFAULT: '#6B5B8A', dark: '#413656' },
        tropicalGreen: '#57913C',
        tropicalBlue: '#5C9DBA',
        sandyBeige: '#EFE0C6',
        sunsetOrange: '#E4573F',
        oceanWave: '#2FB6A4',
      },

      fontFamily: {
        // A high-contrast serif for anything that is a statement, set the way
        // a sign painter would set it. Italic is used deliberately and often.
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        // A warm humanist sans underneath it, so the paragraphs stay quiet.
        sans: ['Figtree', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Figtree', 'system-ui', '-apple-system', 'sans-serif'],
      },

            boxShadow: {
        // The admin panels are shared with four other designs, which all spell
        // their shadows `shadow-ink*`. This branch renamed them `oil` when it
        // became an oil painting; these aliases point the shared names at the
        // same values so a shared component keeps its depth here too.
        'ink-sm': 'var(--tw-shadow-oil-sm, 0 2px 6px -2px rgba(23, 18, 12, 0.22))',
        'ink': '0 12px 26px -18px rgba(23, 18, 12, 0.5), 0 2px 6px -3px rgba(23, 18, 12, 0.16)',
        'ink-lg': '0 24px 44px -28px rgba(23, 18, 12, 0.55), 0 4px 10px -6px rgba(23, 18, 12, 0.16)',
        'ink-xl': '0 34px 60px -38px rgba(23, 18, 12, 0.6), 0 6px 14px -8px rgba(23, 18, 12, 0.18)',
        // Paint lifting off the weave: warm close in, violet further out.
        // Never offset sideways — that reads as a sticker, which is the look
        // this design replaces.
        'oil-sm': '0 2px 6px -2px rgba(65, 54, 86, 0.22)',
        oil: '0 10px 24px -14px rgba(65, 54, 86, 0.38), 0 2px 6px -3px rgba(150, 112, 31, 0.18)',
        'oil-lg':
          '0 24px 48px -26px rgba(65, 54, 86, 0.42), 0 6px 14px -8px rgba(150, 112, 31, 0.2)',
        'oil-xl':
          '0 40px 80px -40px rgba(65, 54, 86, 0.48), 0 10px 22px -12px rgba(150, 112, 31, 0.22)',
        // A gilded edge, for the few things that are literally framed.
        frame: '0 0 0 1px rgba(150, 112, 31, 0.28), 0 18px 38px -22px rgba(65, 54, 86, 0.45)',
        glow: '0 0 34px -6px rgba(47, 182, 164, 0.55)',
      },

      borderRadius: {
        // Shapes vary on purpose — a painted edge is never the same twice —
        // but they all come from this small vocabulary, so the variation reads
        // as intent rather than as noise.
        brush: '18px 26px 20px 30px',
        'brush-lg': '34px 48px 36px 52px',
        petal: '60% 40% 55% 45% / 50% 55% 45% 50%',
        shell: '50% 50% 46% 54% / 60% 58% 42% 40%',
      },

      spacing: {
        // Generous, painterly gutters. These are the two steps the sections
        // actually use.
        gallery: '7.5rem',
        'gallery-lg': '11rem',
      },

      maxWidth: {
        measure: '64ch',
      },

      keyframes: {
        // Every one of these is transform/opacity only.
        drift: {
          '0%': { transform: 'translate3d(-12vw, 0, 0)' },
          '100%': { transform: 'translate3d(112vw, 0, 0)' },
        },
        glide: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          '50%': { transform: 'translate3d(0, -14px, 0) rotate(1.5deg)' },
        },
        flutter: {
          '0%, 100%': { transform: 'translate3d(0,0,0) rotate(-4deg) scale(1)' },
          '25%': { transform: 'translate3d(6px,-10px,0) rotate(3deg) scale(0.97)' },
          '50%': { transform: 'translate3d(2px,-18px,0) rotate(-2deg) scale(1.02)' },
          '75%': { transform: 'translate3d(-5px,-9px,0) rotate(4deg) scale(0.98)' },
        },
        swell: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scaleY(1)' },
          '50%': { transform: 'translate3d(0,-6px,0) scaleY(1.04)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.7' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-1.6deg)' },
          '50%': { transform: 'rotate(1.6deg)' },
        },
      },

      animation: {
        // Slow. A painting that fidgets is a cartoon.
        drift: 'drift 90s linear infinite',
        'drift-slow': 'drift 150s linear infinite',
        glide: 'glide 11s ease-in-out infinite',
        flutter: 'flutter 9s ease-in-out infinite',
        swell: 'swell 7s ease-in-out infinite',
        shimmer: 'shimmer 6s ease-in-out infinite',
        sway: 'sway 8s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
