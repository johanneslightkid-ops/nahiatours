/**
 * El Cortecito — the living-water design system.
 *
 * Where the other sites are posters or paintings, this one is a naturalist's
 * field book laid open on the sand at El Cortecito: botanical leaves, reef
 * fish, birds of the Hispaniolan coast, and real moving water underneath it
 * all (src/components/water/*, WebGL). Shapes are organic — leaves, pebbles,
 * currents — never boxes with hard offset shadows.
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
        // Mangrove ink: a deep green-teal that reads as near-black on sand.
        ink: {
          DEFAULT: '#0E3B36',
          soft: '#3E615B',
          light: '#7D9A94',
        },
        // Sand, from dry dune to wet shoreline.
        paper: {
          DEFAULT: '#FBF5E8',
          warm: '#F5EAD3',
          deep: '#E9D8B6',
          card: '#FFFDF8',
        },
        // Papaya and morning sun.
        mango: {
          light: '#FFD47E',
          DEFAULT: '#F7B23B',
          dark: '#D98612',
        },
        // Hibiscus and coral reef.
        hibiscus: {
          light: '#FFB1A6',
          DEFAULT: '#F2675C',
          dark: '#CF453E',
        },
        // Caribbean turquoise.
        lagoon: {
          light: '#93ECE1',
          DEFAULT: '#17B5AC',
          dark: '#0A7C76',
        },
        sky: {
          light: '#BDE9FA',
          DEFAULT: '#4DB6E5',
          dark: '#197DB1',
        },
        // Leaf greens, from new fern to old palm.
        jungle: {
          light: '#A3DB93',
          DEFAULT: '#3E9B50',
          dark: '#1E6A3B',
        },
        // Flamboyán blossom.
        sunset: {
          light: '#FFB592',
          DEFAULT: '#F2723C',
          dark: '#C7491C',
        },
        // Wild orchid.
        grape: {
          light: '#D9BAF2',
          DEFAULT: '#9C6CD0',
          dark: '#6E45A3',
        },
        // Roles the admin panel is written against.
        coral: {
          deep: '#CF453E',
        },
        sea: {
          deep: '#0A7C76',
        },
        // Deep water, for the footer and the reef.
        abyss: {
          DEFAULT: '#06323D',
          light: '#0B4F5C',
        },

        tropicalGreen: '#3E9B50',
        tropicalBlue: '#4DB6E5',
        sandyBeige: '#F5EAD3',
        sunsetOrange: '#F2723C',
        oceanWave: '#17B5AC',
      },
      // `border-ink` is everywhere in the shared markup. Here it is a soft
      // hairline the colour of wet leaves rather than a black pen outline —
      // the field-book page has pencil edges, not sticker outlines.
      borderColor: {
        ink: {
          DEFAULT: 'rgb(14 59 54 / 0.16)',
          soft: 'rgb(14 59 54 / 0.24)',
          light: 'rgb(14 59 54 / 0.1)',
        },
      },
      fontFamily: {
        heading: ['Fraunces', 'Georgia', 'serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
        script: ['Caveat', 'cursive'],
      },
      backgroundImage: {
        'sun-rays': 'radial-gradient(circle at 50% 50%, rgba(255,212,126,0.55) 0%, transparent 60%)',
        'sky-wash': 'linear-gradient(180deg, #BDE9FA 0%, #E3F6FB 50%, #FBF5E8 100%)',
        'sunset-wash': 'linear-gradient(180deg, #FFD47E 0%, #F7965C 55%, #F2675C 100%)',
        'lagoon-wash': 'linear-gradient(180deg, #93ECE1 0%, #17B5AC 60%, #0A7C76 100%)',
        'jungle-wash': 'linear-gradient(180deg, #A3DB93 0%, #3E9B50 60%, #1E6A3B 100%)',
        'paper-wash': 'linear-gradient(180deg, #FBF5E8 0%, #F5EAD3 100%)',
        'abyss-wash': 'linear-gradient(180deg, #0B4F5C 0%, #06323D 100%)',
      },
      boxShadow: {
        // Soft, green-tinted daylight shadows. The names are kept because the
        // shared markup asks for them; the look is leaf-shade, not ink.
        'ink-sm': '0 3px 10px -4px rgba(14, 59, 54, 0.22)',
        'ink': '0 10px 26px -12px rgba(14, 59, 54, 0.32)',
        'ink-lg': '0 18px 42px -16px rgba(14, 59, 54, 0.36)',
        'ink-xl': '0 30px 60px -22px rgba(14, 59, 54, 0.42)',
        'mango': '0 12px 28px -12px rgba(217, 134, 18, 0.55)',
        'lagoon': '0 12px 28px -12px rgba(10, 124, 118, 0.55)',
        'hibiscus': '0 12px 28px -12px rgba(207, 69, 62, 0.5)',
        'lift': '0 14px 30px -14px rgba(14, 59, 54, 0.45)',
        'glow': '0 0 0 6px rgba(147, 236, 225, 0.35)',
      },
      borderRadius: {
        'sm': '10px',
        'md': '14px',
        'lg': '20px',
        'xl': '26px',
        '2xl': '32px',
        '3xl': '40px',
        'blob': '46% 54% 52% 48% / 52% 46% 54% 48%',
        // A leaf lying on its side, and a pebble.
        'leaf': '72% 12% 72% 12% / 72% 12% 72% 12%',
        'pebble': '58% 42% 55% 45% / 48% 56% 44% 52%',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'sway': 'sway 7s ease-in-out infinite',
        'spin-slow': 'spin 40s linear infinite',
        'bob': 'bob 4.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.7s ease-out forwards',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drift': 'drift 60s linear infinite',
        'flutter': 'flutter 0.18s ease-in-out infinite alternate',
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
          '0%, 100%': { transform: 'translateY(0) rotate(-1.5deg)' },
          '50%': { transform: 'translateY(-9px) rotate(1.5deg)' },
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
          to: { transform: 'scaleY(0.35)' },
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
