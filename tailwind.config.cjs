/**
 * BEAUTIFUL TOURS — the Caribbean daylight design system.
 *
 * This is a photographic world, not a drawn one. The site had been a flat
 * screen-printed poster; it is now the light itself — clear shallow water,
 * white sand glare, palm shade and golden hour — with the stylisation coming
 * from painting rather than from illustration.
 *
 * Five principles, each taken from a specific tradition:
 *
 *   1. WHITE IS THE LIGHT. Homer painted his Bahamas watercolours by leaving
 *      the paper bare where the sun hit. Highlights here are pure white, never
 *      a pale tint — sun glare, foam, sand. Nothing bright is "washed out".
 *   2. LIGHT ON WATER IS A WHITE LINE. Hockney drew pool caustics as thin
 *      wavy white strokes over flat turquoise. That is the signature motif,
 *      and it is a handful of gradients rather than a simulation.
 *   3. THE OVER-UNDER. Dive photographers split the frame at the waterline:
 *      sky and beach above, lit water below. Sections divide that way.
 *   4. SEA IS THE WORLD, SUN IS THE ACTION. Blue reads as trust, but a travel
 *      brand that leads with blue looks like every airline. So the blues build
 *      the place and the warm coral is spent only on what a visitor can do.
 *   5. EDITORIAL IS SATURATED, TRANSACTIONAL IS CALM. Story and hero surfaces
 *      lean into photographic colour; booking forms, prices and the planner go
 *      quiet and white. The closer to paying, the calmer the surface.
 *
 * The old token names are kept deliberately — several hundred colour utilities
 * are scattered through the markup, so remapping the tokens lands all of them
 * inside the new palette at once. Here `lagoon` finally means lagoon.
 */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep-sea navy rather than black: it is the colour of water read at
        // depth, and it is warmer and friendlier than neutral grey for type.
        ink: {
          DEFAULT: '#16302A',
          soft: '#40584F',
          light: '#5E7369',
        },
        // Sand, in three weights, warmed by sun.
        paper: {
          DEFAULT: '#FDF9F1',
          warm: '#F7EDDC',
          deep: '#EBD9BE',
        },
        // THE action colour. Coral at golden hour — the complement of the sea,
        // so it never disappears against any photograph of one.
        mango: {
          light: '#F4A87C',
          DEFAULT: '#E67C46',
          dark: '#B85526',
        },
        // Shallow water over white sand: the brand's signature hue.
        lagoon: {
          light: '#A9DED6',
          DEFAULT: '#3FA79E',
          dark: '#1F6F6C',
        },
        // Caribbean sky, from haze at the horizon to zenith.
        sky: {
          light: '#DCEFF3',
          DEFAULT: '#8CC3D6',
          dark: '#3C7E96',
        },
        // Palm and sea-grape.
        jungle: {
          light: '#A8CE9A',
          DEFAULT: '#5E9257',
          dark: '#35603A',
        },
        // Hibiscus, for warmth that is not an action.
        hibiscus: {
          light: '#E9A5AE',
          DEFAULT: '#CE6376',
          dark: '#A44458',
        },
        // The sun itself, and the low light it throws.
        sunset: {
          light: '#F5D79B',
          DEFAULT: '#E3A73F',
          dark: '#B97F22',
        },
        // Dusk, the one cool counterweight.
        grape: {
          light: '#C0B5DB',
          DEFAULT: '#7C6DA6',
          dark: '#55487A',
        },
        // Water read as depth, for deep surfaces and scrims over photography.
        abyss: {
          light: '#1C5E62',
          DEFAULT: '#14434A',
          dark: '#0C2C31',
        },
        // Legacy aliases from earlier designs, kept live so no stray class
        // name falls out of the palette.
        tropicalGreen: '#5E9257',
        tropicalBlue: '#3FA79E',
        sandyBeige: '#F7EDDC',
        sunsetOrange: '#E67C46',
        oceanWave: '#3FA79E',
      },
      fontFamily: {
        // Fraunces: a soft, sunny serif with real character. Warm and
        // family-facing where a geometric sans would read corporate.
        heading: ['Fraunces', 'Georgia', 'serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        // Plus Jakarta Sans: clean, open, highly legible at small sizes —
        // the voice of prices, forms and everything transactional.
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
        script: ['Caveat', 'cursive'],
      },
      backgroundImage: {
        // The sky, from horizon haze upward.
        'sky-wash': 'linear-gradient(180deg, #8CC3D6 0%, #BBDCE6 45%, #DCEFF3 78%, #FDF9F1 100%)',
        // Shallow water over sand: the single most important gradient here.
        'lagoon-wash': 'linear-gradient(180deg, #A9DED6 0%, #5FBDB2 45%, #1F6F6C 100%)',
        // Golden hour, low and warm.
        'sunset-wash': 'linear-gradient(180deg, #F5D79B 0%, #F4A87C 48%, #E67C46 100%)',
        'jungle-wash': 'linear-gradient(180deg, #A8CE9A 0%, #5E9257 55%, #35603A 100%)',
        'paper-wash': 'linear-gradient(180deg, #FDF9F1 0%, #F7EDDC 100%)',
        // Wet sand at the tideline, where the water has just pulled back.
        'shore-wash': 'linear-gradient(180deg, #FDF9F1 0%, #F7EDDC 40%, #EDF4EA 100%)',
        // Sun glare: the unpainted paper, as a radial.
        'sun-glare': 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(245, 215, 155,0.45) 35%, transparent 70%)',
        // Hockney's white squiggle, tiled. Light on a rippled surface.
        'caustics': 'repeating-linear-gradient(102deg, transparent 0 18px, rgba(255,255,255,0.30) 18px 21px, transparent 21px 30px), repeating-linear-gradient(78deg, transparent 0 26px, rgba(255,255,255,0.22) 26px 28px, transparent 28px 44px)',
      },
      boxShadow: {
        // Real light casts soft, layered shadows with a warm bounce. Every one
        // of these is two stops — a tight contact shadow and a wide ambient
        // one — tinted towards the sea rather than towards neutral grey.
        'sm': '0 1px 2px rgba(22, 48, 42, 0.06), 0 2px 6px rgba(22, 48, 42, 0.05)',
        DEFAULT: '0 2px 4px rgba(22, 48, 42, 0.06), 0 6px 14px rgba(22, 48, 42, 0.07)',
        'md': '0 3px 6px rgba(22, 48, 42, 0.07), 0 10px 22px rgba(22, 48, 42, 0.08)',
        'lg': '0 6px 12px rgba(22, 48, 42, 0.07), 0 18px 38px rgba(22, 48, 42, 0.10)',
        'xl': '0 10px 20px rgba(22, 48, 42, 0.08), 0 30px 60px rgba(22, 48, 42, 0.12)',
        '2xl': '0 16px 32px rgba(22, 48, 42, 0.10), 0 48px 90px rgba(22, 48, 42, 0.16)',
        'inner': 'inset 0 2px 6px rgba(22, 48, 42, 0.08)',
        'none': '0 0 #0000',
        // Named lifts used through the markup.
        'lift': '0 10px 20px -8px rgba(22, 48, 42, 0.18), 0 26px 50px -20px rgba(22, 48, 42, 0.22)',
        'float': '0 24px 48px -18px rgba(31, 111, 108, 0.35)',
        // A card resting on lit water picks up the water's colour underneath.
        'lagoon': '0 12px 30px -10px rgba(63, 167, 158, 0.45)',
        'sun': '0 12px 30px -10px rgba(227, 167, 63, 0.45)',
        'coral': '0 10px 26px -8px rgba(230, 124, 70, 0.5)',
        // The old hard-offset names, softened so any leftover use still fits.
        'ink-sm': '0 2px 5px rgba(22, 48, 42, 0.10)',
        'ink': '0 6px 16px rgba(22, 48, 42, 0.12)',
        'ink-lg': '0 14px 34px rgba(22, 48, 42, 0.16)',
        'ink-xl': '0 22px 52px rgba(22, 48, 42, 0.20)',
        // Sun glare blooming off a bright edge.
        'glow': '0 0 0 1px rgba(255,255,255,0.6), 0 8px 30px rgba(245, 215, 155, 0.55)',
      },
      borderRadius: {
        // Generous and friendly. Nothing here should feel sharp: this is a
        // family holiday, and the shapes are pebbles and pool edges.
        'sm': '8px',
        DEFAULT: '12px',
        'md': '14px',
        'lg': '18px',
        'xl': '24px',
        '2xl': '30px',
        '3xl': '38px',
        'full': '9999px',
        // A water-worn stone, for the occasional organic frame.
        'blob': '58% 42% 47% 53% / 46% 51% 49% 54%',
      },
      animation: {
        'float': 'float 7s ease-in-out infinite',
        'sway': 'sway 8s ease-in-out infinite',
        'spin-slow': 'spin 90s linear infinite',
        'bob': 'bob 5.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drift': 'drift 60s linear infinite',
        // The signature: light sliding across a rippled surface.
        'caustics': 'caustics 18s ease-in-out infinite alternate',
        'shimmer': 'shimmer 6s ease-in-out infinite',
        'tide': 'tide 11s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-1.6deg)' },
          '50%': { transform: 'rotate(1.6deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(-0.6deg)' },
          '50%': { transform: 'translateY(-9px) rotate(0.6deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(26px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(-50%, 0, 0)' },
        },
        // Two ripple layers sliding against each other at different rates —
        // which is what stops caustics reading as a repeating pattern.
        caustics: {
          '0%': { backgroundPosition: '0 0, 0 0', opacity: '0.5' },
          '50%': { opacity: '0.85' },
          '100%': { backgroundPosition: '120px -40px, -90px 60px', opacity: '0.55' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
        // The slow breath of water reaching up a beach and pulling back.
        tide: {
          '0%, 100%': { transform: 'translateY(0) scaleY(1)' },
          '50%': { transform: 'translateY(-6px) scaleY(1.04)' },
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
