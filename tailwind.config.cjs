/**
 * Illustrated tropical design system.
 *
 * The site used to be a dark "luxury" theme leaning on photography, glass and
 * blur. It is now drawn rather than photographed: flat poster colours, ink
 * outlines, hard offset shadows and rounded sticker shapes. Everything here is
 * intentionally opaque — no translucent surfaces — so the illustration reads
 * cleanly at any size.
 */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Poster palette. Each hue is flat and saturated enough to hold its own
        // next to a black ink outline.
        ink: {
          DEFAULT: '#1E2A3A',
          soft: '#42566B',
          light: '#7C8FA3',
        },
        paper: {
          DEFAULT: '#FFF6E5',
          warm: '#FFEFD6',
          deep: '#F7E3C2',
        },
        mango: {
          light: '#FFC861',
          DEFAULT: '#FFA62B',
          dark: '#F07E13',
        },
        hibiscus: {
          light: '#FF9AA8',
          DEFAULT: '#FF5D73',
          dark: '#E03B57',
        },
        lagoon: {
          light: '#7FE3DA',
          DEFAULT: '#21C0B7',
          dark: '#128C8A',
        },
        sky: {
          light: '#A5E4FF',
          DEFAULT: '#4CC3F0',
          dark: '#1C86BE',
        },
        jungle: {
          light: '#7BD389',
          DEFAULT: '#2FA84F',
          dark: '#1B7A3C',
        },
        sunset: {
          light: '#FFB38A',
          DEFAULT: '#FF7A45',
          dark: '#DD4F1E',
        },
        grape: {
          light: '#C9A7F5',
          DEFAULT: '#9163DE',
          dark: '#6B3FB5',
        },
        // Legacy aliases kept so any stray class name still resolves to a
        // colour inside the new palette instead of disappearing.
        tropicalGreen: '#2FA84F',
        tropicalBlue: '#4CC3F0',
        sandyBeige: '#FFEFD6',
        sunsetOrange: '#FF7A45',
        oceanWave: '#21C0B7',
      },
      fontFamily: {
        // Rounded poster display + a friendly humanist body face.
        heading: ['"Baloo 2"', '"Nunito"', 'system-ui', 'sans-serif'],
        display: ['"Baloo 2"', '"Nunito"', 'system-ui', 'sans-serif'],
        // `font-serif` is still sprinkled through the markup; point it at the
        // display face so nothing falls back to Times.
        serif: ['"Baloo 2"', '"Nunito"', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
        accent: ['Caveat', '"Baloo 2"', 'cursive'],
        script: ['Caveat', 'cursive'],
      },
      backgroundImage: {
        'sun-rays': 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,200,97,0.35) 0deg 9deg, transparent 9deg 18deg)',
        'sky-wash': 'linear-gradient(180deg, #A5E4FF 0%, #CFF1FF 45%, #FFF6E5 100%)',
        'sunset-wash': 'linear-gradient(180deg, #FFC861 0%, #FF9A5B 55%, #FF5D73 100%)',
        'lagoon-wash': 'linear-gradient(180deg, #7FE3DA 0%, #21C0B7 60%, #128C8A 100%)',
        'jungle-wash': 'linear-gradient(180deg, #7BD389 0%, #2FA84F 60%, #1B7A3C 100%)',
        'paper-wash': 'linear-gradient(180deg, #FFF6E5 0%, #FFEFD6 100%)',
      },
      boxShadow: {
        // Hard, un-blurred drop shadows: the sticker look.
        'ink-sm': '2px 2px 0 0 #1E2A3A',
        'ink': '4px 4px 0 0 #1E2A3A',
        'ink-lg': '7px 7px 0 0 #1E2A3A',
        'ink-xl': '10px 10px 0 0 #1E2A3A',
        'mango': '4px 4px 0 0 #F07E13',
        'lagoon': '4px 4px 0 0 #128C8A',
        'hibiscus': '4px 4px 0 0 #E03B57',
        // A very soft lift used sparingly under floating elements.
        'lift': '0 12px 24px -12px rgba(30, 42, 58, 0.45)',
      },
      borderRadius: {
        'sm': '10px',
        'md': '14px',
        'lg': '20px',
        'xl': '26px',
        '2xl': '32px',
        '3xl': '40px',
        'blob': '46% 54% 52% 48% / 52% 46% 54% 48%',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'sway': 'sway 7s ease-in-out infinite',
        'spin-slow': 'spin 40s linear infinite',
        'bob': 'bob 4.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.7s ease-out forwards',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drift': 'drift 60s linear infinite',
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
          '0%, 100%': { transform: 'translateY(0) rotate(-1deg)' },
          '50%': { transform: 'translateY(-8px) rotate(1deg)' },
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
