/**
 * TRANSPORTURIST — the Caribbean, painted in oils.
 *
 * The previous design was daylight: watercolour, unpainted white paper, the
 * clear shallow light of a Bávaro morning. This one is the opposite material.
 * It is pigment — acrylic laid thick and oil glazed over it — and it behaves
 * the way paint behaves rather than the way a screen does.
 *
 * The subject is a transport and excursion business, so the picture it paints
 * is not a beach in isolation. It is the journey: the coast road, the long
 * horizon out of a window, the arrival. Somebody drives you there.
 *
 * Five principles. Each is how painters actually work, and each decides a
 * concrete rule in this file.
 *
 *   1. NOTHING STARTS ON WHITE. A painter tones the canvas before the first
 *      stroke, because white lies about value — every colour laid on it looks
 *      darker than it is. So `paper` here is raw linen, not near-white, and no
 *      surface on this site is `#ffffff`.
 *   2. THE DARKS CARRY THE PICTURE. Value structure is built before colour:
 *      deep viridian-umber masses with the light pulled out of them. This is
 *      why the deep surfaces here go far darker than the last design dared.
 *   3. PIGMENT, NOT LIGHT. Every colour below is named for the tube it comes
 *      out of and mixed the way paint mixes — cadmium, alizarin, viridian,
 *      ultramarine, raw sienna, burnt umber. Screen primaries are banned.
 *      Even the white is titanium white, which is warm; `#fff` on a painted
 *      ground reads as a hole torn in the canvas.
 *   4. THE BRUSH IS VISIBLE. Edges are worked, not geometric. Sections break
 *      on a palette-knife edge, canvas tooth runs under everything, and the
 *      corners are a stretched panel rather than a pebble — hence the much
 *      tighter radii below.
 *   5. VARNISH UNIFIES. A finished canvas is varnished, and the glaze is what
 *      makes a dozen separately-painted passages read as one picture. Here it
 *      is what makes a dozen photographs, shot by different people on
 *      different phones, belong to the same site.
 *
 * Token names are inherited from the previous design on purpose: several
 * hundred colour utilities are already scattered through the markup, so
 * remapping the tokens repaints all of them at once. `lagoon` is still the
 * sea — it is just mixed from cerulean and viridian now instead of picked
 * off a colour wheel.
 */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ivory black is never sold as a true black, and nobody paints with
        // one: this is black mixed toward ultramarine, which is what a dark
        // reads as when there is daylight in the room.
        ink: {
          DEFAULT: '#22252B',
          soft: '#4A4E57',
          light: '#6E727B',
        },
        // The ground. Raw linen, then two heavier umber washes over it. This
        // is principle one — the site's "white" is a toned canvas.
        paper: {
          DEFAULT: '#F0E7D7',
          warm: '#E5D7BE',
          deep: '#D2BF9E',
        },
        // THE ACTION COLOUR. Cadmium orange, knocked back into burnt sienna
        // so that white type can actually sit on it — straight from the tube
        // it is too light to carry a label, which is a real constraint of the
        // pigment and not a compromise of the design.
        mango: {
          light: '#EE8B4A',
          DEFAULT: '#C4501A',
          dark: '#8E3409',
        },
        // The sea, mixed the way you would mix it: cerulean into viridian,
        // never a screen cyan.
        lagoon: {
          light: '#7FCFC8',
          DEFAULT: '#1E8E96',
          dark: '#0E5C66',
        },
        // Cerulean, for the sky and everything reading as distance.
        sky: {
          light: '#CFE3EC',
          DEFAULT: '#6FAFCE',
          dark: '#3A6E93',
        },
        // Sap green over viridian: foliage in shadow is cooler and darker
        // than anybody expects.
        jungle: {
          light: '#92B36A',
          DEFAULT: '#4C7A3A',
          dark: '#2A4A27',
        },
        // Alizarin crimson. Warmth that is not an action — flowers, roofs.
        hibiscus: {
          light: '#C9697C',
          DEFAULT: '#9E2B3F',
          dark: '#6E1A2A',
        },
        // Cadmium yellow deep: the light source itself.
        sunset: {
          light: '#F6D36A',
          DEFAULT: '#EDA91B',
          dark: '#C07C0A',
        },
        // Ultramarine — the one true cool on the palette, for dusk and for
        // the shadow side of anything sunlit.
        grape: {
          light: '#8E9BCB',
          DEFAULT: '#35478C',
          dark: '#1E2A5A',
        },
        // The darkest masses on the site: viridian dirtied with burnt umber.
        // Principle two lives here — this is what the picture is built on.
        abyss: {
          light: '#1B4E56',
          DEFAULT: '#123A41',
          dark: '#0A2429',
        },
        // The earths. Not decoration — these are what keep the brights
        // believable, and they are half of any real palette.
        earth: {
          sienna: '#B07A3C',
          umber: '#6B4626',
          shadow: '#3E2A1A',
        },
        // Legacy aliases from earlier designs, kept live so no stray class
        // name falls out of the palette.
        tropicalGreen: '#4C7A3A',
        tropicalBlue: '#1E8E96',
        sandyBeige: '#E5D7BE',
        sunsetOrange: '#C4501A',
        oceanWave: '#1E8E96',
      },
      fontFamily: {
        // Playfair Display: a high-contrast serif from the era these paintings
        // belong to. Thick-thin stroke modulation is the typographic form of a
        // loaded brush, and at display sizes it carries the whole register.
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        // Manrope: warm geometric-humanist, and completely quiet. Prices,
        // forms and pickup times want to be read, not admired.
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
        // The signature in the corner of the canvas. This is Playfair's own
        // italic rather than a script face — a painter signs in their own
        // hand, not in someone else's, and it saves a font download.
        accent: ['"Playfair Display"', 'Georgia', 'serif'],
        script: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        // Skies are mixed downward into the haze at the horizon, which is
        // always warmer and lighter than the zenith.
        'sky-wash': 'linear-gradient(180deg, #3A6E93 0%, #6FAFCE 42%, #CFE3EC 76%, #F0E7D7 100%)',
        // The sea, read downward into depth.
        'lagoon-wash': 'linear-gradient(180deg, #7FCFC8 0%, #1E8E96 46%, #123A41 100%)',
        // Late light. Cadmium yellow burning down through orange into crimson.
        'sunset-wash': 'linear-gradient(180deg, #F6D36A 0%, #EDA91B 34%, #C4501A 72%, #6E1A2A 100%)',
        'jungle-wash': 'linear-gradient(180deg, #92B36A 0%, #4C7A3A 52%, #2A4A27 100%)',
        'paper-wash': 'linear-gradient(180deg, #F0E7D7 0%, #E5D7BE 100%)',
        // Wet asphalt at the edge of the sand — the road this business drives.
        'shore-wash': 'linear-gradient(180deg, #E5D7BE 0%, #D2BF9E 45%, #6B4626 100%)',
        // The sun through haze. Titanium white at the core, never #fff.
        'sun-glare': 'radial-gradient(circle at 50% 50%, rgba(251,246,236,0.92) 0%, rgba(246,211,106,0.45) 34%, transparent 70%)',
      },
      boxShadow: {
        // A painted world has no photographic drop shadows: depth comes from
        // value and from edge, not from blur. So these are tight and warm —
        // tinted burnt umber, the colour a shadow actually is on a toned
        // ground — and they stay close to the object instead of hazing out
        // beneath it. Where the last design floated its cards, this one sets
        // them down on the canvas.
        'sm': '0 1px 2px rgba(62, 42, 26, 0.10)',
        DEFAULT: '0 2px 4px rgba(62, 42, 26, 0.12), 0 4px 8px rgba(62, 42, 26, 0.08)',
        'md': '0 2px 5px rgba(62, 42, 26, 0.13), 0 8px 16px rgba(62, 42, 26, 0.10)',
        'lg': '0 4px 8px rgba(62, 42, 26, 0.14), 0 14px 28px rgba(62, 42, 26, 0.12)',
        'xl': '0 6px 14px rgba(62, 42, 26, 0.16), 0 24px 44px rgba(62, 42, 26, 0.16)',
        '2xl': '0 10px 22px rgba(62, 42, 26, 0.18), 0 38px 70px rgba(62, 42, 26, 0.20)',
        'inner': 'inset 0 2px 5px rgba(62, 42, 26, 0.12)',
        'none': '0 0 #0000',
        'lift': '0 8px 16px -6px rgba(62, 42, 26, 0.24), 0 20px 38px -16px rgba(62, 42, 26, 0.26)',
        'float': '0 18px 36px -14px rgba(18, 58, 65, 0.40)',
        'lagoon': '0 10px 24px -10px rgba(14, 92, 102, 0.50)',
        'sun': '0 10px 24px -10px rgba(192, 124, 10, 0.45)',
        'coral': '0 8px 20px -8px rgba(142, 52, 9, 0.50)',
        'ink-sm': '0 1px 3px rgba(34, 37, 43, 0.14)',
        'ink': '0 4px 12px rgba(34, 37, 43, 0.16)',
        'ink-lg': '0 10px 26px rgba(34, 37, 43, 0.20)',
        'ink-xl': '0 18px 42px rgba(34, 37, 43, 0.24)',
        // The wet edge where thick paint catches the light coming across it.
        'glow': '0 0 0 1px rgba(251, 246, 236, 0.55), 0 6px 22px rgba(237, 169, 27, 0.45)',
      },
      borderRadius: {
        // A stretched canvas and a painted panel, not a pebble. The previous
        // design rounded everything hard because it was drawn; this one is
        // painted on something with corners, and the tighter radii are most
        // of why the two feel unrelated at a glance.
        'sm': '3px',
        DEFAULT: '5px',
        'md': '7px',
        'lg': '9px',
        'xl': '13px',
        '2xl': '17px',
        '3xl': '22px',
        'full': '9999px',
        // Kept so any leftover use still resolves.
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
