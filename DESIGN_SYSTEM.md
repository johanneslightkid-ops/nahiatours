# Design system — the illustrated tropical poster

The site is **drawn, not photographed**. It reads like a screen-printed travel
poster: flat colour, ink outlines, chunky rounded shapes and a friendly display
face, aimed at holiday travellers rather than at a luxury catalogue.

Everything below lives in two files — `src/styles/globals.css` (tokens and
component classes) and `tailwind.config.cjs` (palette, fonts, shadows) — plus
the drawing set in `src/components/ui/Illustrations.tsx`.

## The three rules

1. **Flat colour.** No frosted glass, no `backdrop-blur`, no photo-real
   gradients. Every surface is opaque poster paint. Gradients are allowed only
   as a broad two- or three-stop wash across a whole section band.
2. **One ink outline.** Cards, buttons, badges, form fields and framed photos
   are drawn with the same pen: `2.5px solid var(--ink)` (`2px` on mobile).
3. **Hard shadow.** Depth is an un-blurred offset block of ink
   (`shadow-ink-sm` / `shadow-ink` / `shadow-ink-lg`), never a soft haze.

Keep those three and anything new will sit inside the illustration.

## Palette

| Token | Hex | Used for |
| --- | --- | --- |
| `ink` | `#1E2A3A` | outlines, body text, hard shadows |
| `ink-soft` / `ink-light` | `#42566B` / `#7C8FA3` | secondary and tertiary copy |
| `paper` / `paper-warm` | `#FFF6E5` / `#FFEFD6` | page and card grounds |
| `mango` | `#FFA62B` | primary action, price tags, highlights |
| `hibiscus` | `#FF5D73` | accents, alerts, one of the card tints |
| `lagoon` | `#21C0B7` | secondary action, links, water |
| `sky` | `#4CC3F0` | sky, cool sections |
| `jungle` | `#2FA84F` | WhatsApp, foliage, success |
| `sunset` | `#FF7A45` | the warm CTA band |

Each has `-light` and (mostly) `-dark` variants. Text on a saturated band is
white; text on paper is `ink`.

## Type

- **Display — Baloo 2** (700/800): headings, buttons, prices, numbers.
- **Body — Nunito** (600/700): everything else. The body weight is 600, because
  400 looks thin against heavy outlines.
- **Accent — Caveat**: the hand-lettered kickers (`.hand-note`). Small doses.

`font-serif` is aliased to the display face, so any leftover use of it in the
markup still lands inside the system.

## Component classes

| Class | What it draws |
| --- | --- |
| `.sticker-card` / `.artsy-glass-card` / `.glass-card` | the standard card: cream fill, ink outline, hard shadow, lifts on hover |
| `.tropical-button` / `.tropical-button-outline` | the pill button; presses into its own shadow on `:active`. `.btn-lagoon` / `.btn-hibiscus` recolour it |
| `.artsy-brick-badge` | small rotated sticker badge |
| `.section-icon` | round emoji sticker at the head of a section |
| `.marker-highlight` | marker stroke behind a headline; wraps per line |
| `.scribble-title-bg` | crayon rule under a title |
| `.hand-note` | Caveat kicker, rotated slightly |
| `.wavy-band` / `-top` / `-bottom` | masks a section with a rolling wave edge, so the backdrop shows through the troughs |
| `.shore- / cove- / lagoon- / bay- / dawn- / sunset- / reef-section` | the painted section bands |
| `.planner-*` | the planner's deliberately dark "night" surfaces |
| `.photo-pop` | the small saturation/contrast lift applied to photography |

## Photography

Photos stay — they are the product — but they are treated as objects pasted
into a drawing: ink border, hard shadow, rounded corners and `.photo-pop`. The
hero shows the one video as a postcard rather than as a full-bleed background.

## Illustrations

`src/components/ui/Illustrations.tsx` exports flat SVG drawings (sun, cloud,
palm frond, palm tree, toucan, hibiscus, pineapple, sailboat, starfish,
cocktail, fish, birds, wave band, foam line). They take a `className` for
sizing and are `aria-hidden`, since they are always decorative.

`IllustratedBackdrop.tsx` paints the fixed scene behind every page — sky, sun,
drifting clouds, a sea of three crests, and fronds at the edges. It replaced a
WebGL ocean shader, so there is no GL context anywhere in the app.

## Motion

`.animate-wave-sway-1…10` give cards a gentle pinned-paper tilt; they pause on
hover. `animate-bob`, `animate-sway`, `animate-frond`, `animate-spin-slow` and
`cloudDrift` animate the scenery. Everything is disabled under
`prefers-reduced-motion: reduce`.
