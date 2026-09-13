# Design system — Caribbean daylight

The site is **photographic, not drawn**. It is the light of a Bávaro morning:
clear shallow water, white sand glare, palm shade and golden hour. The
stylisation comes from painting and from dive photography rather than from
illustration, and the pictures of real families on real boats are the subject —
everything else is the room they hang in.

Everything below lives in three files — `tailwind.config.cjs` (palette, type,
shadows, radii), `src/styles/globals.css` (tokens and component classes) and
`src/components/ui/Illustrations.tsx` (the SVG set) — plus the fixed scene in
`src/components/ui/IllustratedBackdrop.tsx`.

## The five principles

Each is taken from a specific tradition, and each one decides a concrete rule.

1. **White is the light.** Homer painted his Bahamas watercolours by leaving the
   paper bare where the sun hit. Highlights here are pure `#fff`, never a pale
   tint — sun glare, foam, sand, the unpainted stripe in a section divider.
   Nothing bright is a washed-out version of a colour.
2. **Light on water is a white line.** Hockney drew pool caustics as thin wavy
   white strokes over flat turquoise. That is the signature motif: `.caustics`,
   a fractal-noise texture thresholded to hard white filaments, drifting in
   `soft-light`. It costs one composite, not a simulation.
3. **The over-under.** Dive photographers split the frame at the waterline: sky
   and beach above, lit water below. Sections divide that way — see *The
   waterline* below.
4. **Sea is the world, sun is the action.** Blue reads as trust, but a travel
   brand that leads with blue looks like every airline. So the blues build the
   place and the warm coral is spent **only** on what a visitor can do. If a
   surface is warm, the action inverts to white rather than competing.
5. **Editorial is saturated, transactional is calm.** Story and hero surfaces
   lean into photographic colour; booking cards, prices and the planner go quiet
   and white. The closer a surface gets to taking money, the calmer it is.

## Palette

The legacy token *names* are kept on purpose — several hundred colour utilities
are scattered through the markup, so remapping the tokens landed all of them
inside the new palette at once. Here `lagoon` finally means lagoon.

| Token | Value | What it is |
| --- | --- | --- |
| `ink` / `-soft` / `-light` | `#0E2E3B` `#3D5A66` `#7B95A1` | Deep-sea navy for type — warmer and friendlier than neutral grey |
| `paper` / `-warm` / `-deep` | `#FFFBF5` `#FFF3E4` `#FBE6CB` | Sand, in three weights |
| `mango` (coral) | `#FF9B76` `#FF6B45` `#DC4A22` | **The action colour.** Complement of the sea, so it never sinks into a photograph of one |
| `lagoon` | `#9CEDE6` `#14B8C4` `#0A7C93` | Shallow water over white sand — the signature hue |
| `sky` | `#D6F1FF` `#5EC5F5` `#2A7FB8` | Horizon haze up to zenith |
| `jungle` | `#93DCA9` `#2FA36B` `#186B48` | Palm and sea-grape |
| `sunset` | `#FFD68C` `#FFB703` `#E08700` | The sun and the light it throws |
| `hibiscus` | `#FFA9B9` `#FF5F7E` `#D33A5C` | Warmth that is *not* an action |
| `abyss` | `#0F5A73` `#08415C` `#052A3D` | Water read as depth: deep panels, scrims over photography |

## Type

- **Fraunces** — display, headings, the serif voice. Soft, sunny, and warm
  where a geometric sans would read corporate.
- **Plus Jakarta Sans** — body, prices, forms. Clean and open at small sizes.
- **Caveat** — `.hand-note`, the hand-lettered aside above a headline.

`.marker-highlight` washes a headline in a soft gold gradient that fades out at
both edges; `.scribble-title-bg` rules a section heading with a lagoon stroke.

## Shape and depth

Tailwind's own `borderRadius` and `boxShadow` scales are **overridden**, not
extended, so every existing utility in the markup adopts the new system.

- Radii are generous — `lg` 18px through `3xl` 38px. Nothing is sharp: the
  shapes are pebbles and pool edges.
- Every shadow is two stops — a tight contact shadow plus a wide ambient one —
  tinted `rgba(14,46,59,…)` towards the sea rather than towards neutral grey.
  Named lifts: `lift`, `float`, `lagoon`, `sun`, `coral`, `glow`.
- The old hard-offset `ink-*` names survive as softened aliases so any stray
  class still lands inside the system.

## The waterline

Bands meet the way a dive photographer's frame does: the edge is a swell, and
along that swell the band goes white — foam. Principle 1, structurally: the
foam is not painted on top, it is a white stripe in the band's *own* background
that the wave mask cuts through.

- `.wavy-band` cuts both edges, `.wavy-band-top` / `.wavy-band-bottom` one.
- A section declares its colour with `--band` and optionally `--band-texture`;
  `.home-section` reads both. The bands are `shore`, `cove`, `lagoon`, `bay`,
  `dawn`, `sunset` and `reef`.
- Parking an unused foam layer uses the **length** `0 -9999px`, never a
  percentage: a percentage background-position collapses to `0` for a layer
  that is 100% wide, which prints the hidden stripe across the band.

## Surfaces

| Class | Use |
| --- | --- |
| `.photo-frame` | A picture bedded into the page: soft corners, wide shadow, a gradient scrim for captions |
| `.photo-pop` | Golden-hour grading (`saturate`/`contrast`/`brightness`) that lifts further on hover |
| `.booking-card` | Principle 5: white, hairline-ruled, softly lifted. Tour cards, adventure cards, feature cards |
| `.story-copy-card` | The narrative aside inside a story section |
| `.hero-glass` | Frosted glass, used once — the review pinned below the hero photograph |
| `.planner-panel` | Deep water. `.planner-option` answers are white cards on it, and choosing one warms it |
| `.planner-card` | A white planner card **outside** the deep panel, where frosted white would go muddy |
| `.tropical-button` | The coral action, with a highlight that sweeps across on hover |
| `.tropical-button-outline` | Everything secondary |

On `.sunset-section` and `.reef-section` the action rules invert: the coral
button becomes unpainted white with coral type, because coral on coral is
invisible and principle 4 is about *contrast with the surface*, not about the
hue itself.

## Motion

Slow and ambient — nothing snaps. `caustics` (18s), `tide` (11s), `float` (7s),
`bob` (5.5s), `frondSway`, `cloudDrift` (150–300s), and the `animate-wave-sway-*`
family that gives a grid of cards a gentle, uncorrelated swell. Interaction
easing is `cubic-bezier(0.16, 1, 0.3, 1)`.

## The backdrop

`IllustratedBackdrop` is the fixed world the whole site stands in: a sky
gradient, a slowly turning sun, two drifting clouds and a line of birds above;
a 32vh block of sea below with caustics, sun glare on the water and a white foam
line along the horizon; and two palm fronds leaning in from the corners at 20–25%
opacity. It is all CSS and inline SVG — no images, no canvas, no GL context.
The horizon sits at 32vh rather than mid-viewport so it never runs through hero
copy, and the hero carries its own haze scrim over the text column for the
viewports where it still would.
