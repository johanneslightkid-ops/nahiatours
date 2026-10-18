/**
 * Willy Tours — "La Galería".
 *
 * The site is a walk through a painter's gallery in a colonial street. The
 * palette is borrowed from the Dominican masters rather than from a travel
 * brochure: Cándido Bidó's ultramarine skies, his dark indigo contours and
 * the big yellow sun; Ada Balcácer's layered colour fields; the larimar
 * stone found only on this island; flamboyán in bloom, sugar cane, mamey and
 * bougainvillea on a whitewashed wall. Shapes are flat colour with a confident
 * outline and a small offset — a painted panel, not a glass card.
 *
 * The nine colour families every branch defines are all here, under the same
 * names, so the shared admin and planner code keeps resolving. Only their
 * values are this site's own.
 */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The painter's contour: deep indigo, almost night.
        ink: {
          DEFAULT: '#1D2346',
          soft: '#4A5175',
          light: '#8A8FAD',
        },
        // Primed canvas, from fresh gesso to an old wall.
        paper: {
          DEFAULT: '#F7EFE1',
          warm: '#F0E2C8',
          deep: '#E2CDA6',
          card: '#FFFBF3',
        },
        // The sun Bidó paints over every village.
        mango: {
          light: '#FFDD6E',
          DEFAULT: '#F5B921',
          dark: '#C98A06',
        },
        // Flamboyán in June.
        hibiscus: {
          light: '#FF9E8A',
          DEFAULT: '#E5482F',
          dark: '#B3301D',
        },
        // Larimar, the island's own blue stone.
        lagoon: {
          light: '#A9E4EE',
          DEFAULT: '#3FAFC9',
          dark: '#1F7D94',
        },
        // Bidó's ultramarine sky.
        sky: {
          light: '#A9BAF5',
          DEFAULT: '#2F4FD1',
          dark: '#1A2F94',
        },
        // Cane field and royal palm.
        jungle: {
          light: '#B4D98A',
          DEFAULT: '#4F9136',
          dark: '#2F611E',
        },
        // Mamey and late afternoon.
        sunset: {
          light: '#FFC09A',
          DEFAULT: '#EE7A3C',
          dark: '#BF5218',
        },
        // Bougainvillea on a white wall.
        grape: {
          light: '#F2AEDB',
          DEFAULT: '#BF3A8F',
          dark: '#8A2266',
        },
        // Roles the admin panel is written against.
        coral: {
          deep: '#B3301D',
        },
        sea: {
          deep: '#1F7D94',
        },
        // Night over the Malecón, for the footer and the night planner.
        abyss: {
          DEFAULT: '#141A3C',
          light: '#263068',
        },

        tropicalGreen: '#4F9136',
        tropicalBlue: '#2F4FD1',
        sandyBeige: '#F0E2C8',
        sunsetOrange: '#EE7A3C',
        oceanWave: '#3FAFC9',
      },
      // `border-ink` is everywhere in the shared markup: here it is the
      // painter's line — indigo, and confident.
      borderColor: {
        ink: {
          DEFAULT: '#1D2346',
          soft: 'rgb(29 35 70 / 0.45)',
          light: 'rgb(29 35 70 / 0.18)',
        },
      },
      fontFamily: {
        heading: ['"DM Serif Display"', 'Georgia', 'serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
        script: ['Caveat', 'cursive'],
      },
      backgroundImage: {
        'sun-rays': 'radial-gradient(circle at 50% 50%, rgba(255,221,110,0.6) 0%, transparent 60%)',
        'sky-wash': 'linear-gradient(180deg, #2F4FD1 0%, #4F6FE0 55%, #A9BAF5 100%)',
        'sunset-wash': 'linear-gradient(180deg, #F5B921 0%, #EE7A3C 55%, #E5482F 100%)',
        'lagoon-wash': 'linear-gradient(180deg, #A9E4EE 0%, #3FAFC9 60%, #1F7D94 100%)',
        'jungle-wash': 'linear-gradient(180deg, #B4D98A 0%, #4F9136 60%, #2F611E 100%)',
        'paper-wash': 'linear-gradient(180deg, #F7EFE1 0%, #F0E2C8 100%)',
        'abyss-wash': 'linear-gradient(180deg, #263068 0%, #141A3C 100%)',
      },
      boxShadow: {
        // A painted panel lifts off the wall by a small, hard offset in the
        // contour colour — the names are the shared markup's.
        'ink-sm': '3px 3px 0 0 rgba(29, 35, 70, 0.9)',
        'ink': '5px 5px 0 0 rgba(29, 35, 70, 0.9)',
        'ink-lg': '8px 8px 0 0 rgba(29, 35, 70, 0.9)',
        'ink-xl': '12px 12px 0 0 rgba(29, 35, 70, 0.9)',
        'mango': '5px 5px 0 0 #C98A06',
        'lagoon': '5px 5px 0 0 #1F7D94',
        'hibiscus': '5px 5px 0 0 #B3301D',
        'lift': '0 14px 30px -14px rgba(29, 35, 70, 0.45)',
        'glow': '0 0 0 6px rgba(255, 221, 110, 0.45)',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '30px',
        // A hand-cut paper shape and a sun.
        'blob': '42% 58% 55% 45% / 50% 44% 56% 50%',
        'leaf': '70% 14% 70% 14% / 70% 14% 70% 14%',
        'pebble': '55% 45% 52% 48% / 46% 56% 44% 54%',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'sway': 'sway 7s ease-in-out infinite',
        'spin-slow': 'spin 60s linear infinite',
        'bob': 'bob 4.8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.7s ease-out forwards',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drift': 'drift 70s linear infinite',
        'flutter': 'flutter 0.22s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-8px) rotate(2deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drift: {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(-50%, 0, 0)' },
        },
        flutter: {
          from: { transform: 'scaleY(1)' },
          to: { transform: 'scaleY(0.4)' },
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
