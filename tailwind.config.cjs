/**
 * Exclusive Dominican Tours — Full Throttle, in daylight.
 *
 * Action-documentary photography graded like a jet-set film: ivory and sand
 * where the other cut was black, charcoal ink, amber for energy, a thin line
 * of champagne gold for the luxury, and WhatsApp green for the one thing every
 * page wants you to press. Anton for the shouting, Barlow for the reading.
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
        // Charcoal, not pure black: it reads as black on ivory without the glare.
        ink: {
          DEFAULT: '#14161A',
          soft: '#454B54',
          light: '#8A9099',
        },
        // Ivory, sand and the white of a card.
        paper: {
          DEFAULT: '#F7F4EE',
          warm: '#EFE9DF',
          deep: '#E2D9C9',
          card: '#FFFFFF',
        },
        // Amber: the energy colour. Buttons, ranks, the price.
        mango: {
          light: '#FFD08A',
          DEFAULT: '#F2A33A',
          dark: '#C27812',
        },
        hibiscus: {
          light: '#FFB8AC',
          DEFAULT: '#E4553F',
          dark: '#B63B28',
        },
        // The logo's Caribbean blue.
        lagoon: {
          light: '#B5DDF2',
          DEFAULT: '#1F7DC1',
          dark: '#155B8F',
        },
        sky: {
          light: '#D3EBF8',
          DEFAULT: '#4BA7DD',
          dark: '#1F6EA2',
        },
        // The logo's palm green; WhatsApp gets its own brighter one below.
        jungle: {
          light: '#ABE2B9',
          DEFAULT: '#1E9E57',
          dark: '#11733D',
        },
        sunset: {
          light: '#FFC79E',
          DEFAULT: '#EE7D30',
          dark: '#BF561A',
        },
        grape: {
          light: '#D8CCF0',
          DEFAULT: '#7A5DC3',
          dark: '#56409A',
        },
        // Champagne gold: hairlines, small caps, the luxury.
        gold: {
          light: '#EADCB7',
          DEFAULT: '#C6A15B',
          dark: '#9A7A3B',
        },
        whatsapp: {
          DEFAULT: '#25D366',
          dark: '#128C4B',
        },
        // Roles the admin panel is written against.
        coral: {
          deep: '#B63B28',
        },
        sea: {
          deep: '#155B8F',
        },
        abyss: {
          DEFAULT: '#14161A',
          light: '#23272E',
        },

        tropicalGreen: '#1E9E57',
        tropicalBlue: '#4BA7DD',
        sandyBeige: '#EFE9DF',
        sunsetOrange: '#EE7D30',
        oceanWave: '#1F7DC1',
      },
      // `border-ink` is everywhere in the shared markup: here a fine hairline.
      borderColor: {
        ink: {
          DEFAULT: 'rgb(20 22 26 / 0.14)',
          soft: 'rgb(20 22 26 / 0.22)',
          light: 'rgb(20 22 26 / 0.08)',
        },
      },
      fontFamily: {
        heading: ['Anton', 'Impact', 'sans-serif'],
        display: ['Anton', 'Impact', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
        condensed: ['"Barlow Condensed"', 'Barlow', 'sans-serif'],
        accent: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        script: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'sun-rays': 'radial-gradient(circle at 70% 20%, rgba(242,163,58,0.35) 0%, transparent 60%)',
        'sky-wash': 'linear-gradient(180deg, #FFFFFF 0%, #F7F4EE 100%)',
        'sunset-wash': 'linear-gradient(135deg, #FFD08A 0%, #F2A33A 55%, #EE7D30 100%)',
        'lagoon-wash': 'linear-gradient(135deg, #B5DDF2 0%, #1F7DC1 100%)',
        'jungle-wash': 'linear-gradient(135deg, #ABE2B9 0%, #1E9E57 100%)',
        'paper-wash': 'linear-gradient(180deg, #F7F4EE 0%, #EFE9DF 100%)',
        'abyss-wash': 'linear-gradient(180deg, #23272E 0%, #14161A 100%)',
      },
      boxShadow: {
        'ink-sm': '0 2px 8px -3px rgba(20, 22, 26, 0.18)',
        'ink': '0 12px 30px -14px rgba(20, 22, 26, 0.28)',
        'ink-lg': '0 24px 50px -22px rgba(20, 22, 26, 0.34)',
        'ink-xl': '0 36px 70px -28px rgba(20, 22, 26, 0.4)',
        'mango': '0 14px 30px -14px rgba(194, 120, 18, 0.55)',
        'lagoon': '0 14px 30px -14px rgba(21, 91, 143, 0.5)',
        'hibiscus': '0 14px 30px -14px rgba(182, 59, 40, 0.5)',
        'lift': '0 16px 34px -16px rgba(20, 22, 26, 0.4)',
        'glow': '0 0 0 4px rgba(242, 163, 58, 0.3)',
        'gold': '0 0 0 1px rgba(198, 161, 91, 0.45)',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '10px',
        'xl': '14px',
        '2xl': '18px',
        '3xl': '24px',
        'blob': '18px',
        'leaf': '999px',
        'pebble': '14px',
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
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
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
