# Design system — LD VIP, trash polka

The site is **tattooed, not illustrated**. It reads like a trash-polka sleeve
or a flash sheet: bone stock, black ink, exactly one red, and a collage of
engraved linework, brush strokes, splatters, stencil slabs and torn paper.

Everything lives in three files — `src/styles/globals.css` (tokens and
component classes), `tailwind.config.cjs` (palette, type, radius, shadows) and
`src/components/ui/Illustrations.tsx` (the drawings and the collage furniture).

## The four rules

1. **Red means act.** Bone, black and grey build the page. The one red is spent
   only on what a visitor can *do* — book, plan, call, submit, the chosen
   planner option, the live total, the focus ring. Scanning the page for red is
   the same as scanning it for the next move. If something new is not
   actionable, it is not red.
2. **Nothing is rounded.** The Tailwind radius scale collapses to zero, so
   every `rounded-*` and `rounded-full` already in the markup produces a cut
   slab. `[class*='rounded-[']` in globals.css squares the arbitrary radii the
   config cannot reach. Opt back in with `.is-round` only where a circle is the
   *meaning* — a seal, a bullet.
3. **Out of register.** Depth is a misprint: a hard, un-blurred offset of the
   black plate (`shadow-ink`, `shadow-ink-lg`), sometimes with the red plate
   slipped the other way (`shadow-misprint`). Never a haze. Tailwind's own
   `shadow-sm … shadow-2xl` are overridden to hard offsets too, so a stray
   utility cannot soften a plate.
4. **Photos are engravings until you touch them.** Photography is pushed to
   `grayscale(0.88) contrast(1.28)` under a halftone screen, and blooms back to
   full colour on hover or focus. The picture you are reaching for is the one
   that is alive.

Keep those four and anything new will sit inside the collage.

## Palette

The token *names* are inherited from the previous design on purpose: several
hundred colour utilities are scattered through the markup, and remapping the
tokens lands every one of them inside this system instead of leaving pastels
behind. So `mango` is the red, `lagoon` and `sky` are greys, `jungle` is an
ink-green.

| Token | Hex | Used for |
| --- | --- | --- |
| `ink` | `#0C0C0D` | the black plate: outlines, type, hard shadows |
| `ink-soft` / `ink-light` | `#3B3B3F` / `#6F6F76` | secondary and tertiary copy |
| `paper` / `paper-warm` / `paper-deep` | `#EFE9DD` / `#E5DDCD` / `#D5CAB4` | bone stock, in three weights |
| `--bone` | `#F5F1E8` | the lightest stock; plates and cards |
| `mango` | `#C1121F` | **the red.** Primary action, live totals, selection |
| `mango-light` / `mango-dark` | `#E63946` / `#8B0A15` | the red on black / on bone |
| `hibiscus` | `#A4161A` | oxblood: alerts and the second-tier accent |
| `lagoon` | `#4A4A4E` | graphite: links, quiet fills, secondary chrome |
| `sky` | `#8A8A90` | smoke: tertiary surfaces |
| `jungle` | `#3E4A38` | ink-green: "success" without opening a second hue |
| `grape` | `#3A3542` | bruise; the one place a third value is allowed |

## Type

Five faces, each with one job:

- **Anton** (`font-display`, all `h1`–`h3`) — the shout. Poster caps, headlines,
  prices, stencil ordinals. One weight only, so headings are pinned to 400 and
  `font-synthesis-weight: none` stops a faux-bold smearing it.
- **Oswald** (`font-condensed`, `h4`–`h6`, buttons, nav, badges) — the voice of
  the interface. Condensed uppercase with wide tracking.
- **Barlow** (`font-sans`, body) — long-form, at weight 500.
- **Special Elite** (`font-mono` / `font-stamp`, `.tp-filenum`) — the typewriter:
  filing numbers, catalogue marks, rubber stamps.
- **Permanent Marker** (`font-accent`, `.hand-note`) — annotations scrawled over
  the layout. Small doses.

Heading *colour* is set on `h1`–`h6` element selectors only, never on
`.font-display`. A class there would tie with `text-paper` and — being later in
the file — win, painting every heading on a black panel black.

## Component classes

| Class | What it prints |
| --- | --- |
| `.sticker-card` / `.artsy-glass-card` / `.glass-card` | the standard plate: bone stock, 3px keyline, hard offset, a red registration crosshair in the corner; slips further out of register on hover |
| `.tropical-button` | the red action slab, with a squeegee wipe on hover; presses into its own shadow |
| `.tropical-button-outline` | the same slab in bone; inverts to black on hover. `.btn-lagoon` / `.btn-hibiscus` recolour it |
| `.artsy-brick-badge` | rubber stamp: doubled red keyline, typewriter caps, rotated, ink worn through by a mask |
| `.section-icon` | black seal ringed in red; its mark is knocked back to one ink value by a filter on the child |
| `.marker-highlight` | red brush stroke behind a headline; ragged-edged by a mask, cloned per line |
| `.scribble-title-bg` | dry-brush swipe dragged under a title |
| `.hand-note` | Permanent Marker kicker, rotated |
| `.wavy-band` / `-top` / `-bottom` | tears the band's top and bottom edges (see below) |
| `.shore- / cove- / lagoon- / bay- / dawn- / sunset- / reef-section` | the printing plates |
| `.planner-*` | the planner's black surfaces |
| `.photo-pop` | the engraving treatment, and the colour bloom on hover |

### The trash-polka kit

Small parts the markup reaches for directly. Each is a piece of the collage
that also carries meaning:

| Class | Meaning |
| --- | --- |
| `.tp-slab` / `.tp-slab-ink` | a label that has to be obeyed |
| `.tp-filenum` | typewriter catalogue number |
| `.tp-barcode` | a rule that is also an identifier (purely typographic — no image) |
| `.tp-rule` | heavy divider with a red tick at the head |
| `.tp-index` | outlined stencil ordinal, the way a step is numbered on a wall |
| `.tp-tape` | a strip of masking tape pinning a plate to the page |
| `.tp-redact` | a censored word |
| `.tp-cut` | a notched corner (no shadow survives a clip-path, so accents only) |
| `.tp-screen` | halftone screen over any surface |

## Section bands

Each band declares **only two things** — `--band` (the paint) and
`--band-texture` (the screen over it). The tear rules read those, which is what
lets one rule rip any band without knowing its colour.

| Band | Plate |
| --- | --- |
| `.shore-section` | bone, plain |
| `.cove-section` | deep stock, coarse halftone |
| `.lagoon-section` | bone, engraver's crosshatch |
| `.bay-section` | warm stock, red ledger ruling |
| `.dawn-section` | deep stock, red hazard rule along the top |
| `.sunset-section` | **the black plate** — red ray burst, thrown ink |
| `.reef-section` | **the red plate** — oxblood into black, ink splatter |

Values step in tone from one band to the next, so a tear between two of them
actually reads.

### Torn edges

A mask alone would only reveal the bone collage behind — bone on bone. So each
band paints an **ink margin** along its own top and bottom, a strip exactly as
tall as the tear, and the mask rips through *that*. What is left is a ragged
black fibre edge printed by the band itself, with the backdrop showing through
the deepest bites. `--tear-ink` flips it to red on the dark plates, where a
black margin would show nothing.

## Illustrations

`Illustrations.tsx` exports the flash — engraved palms, a traditional toucan
with a red beak, a nautical star, a clipper, a hatched pineapple, a rose-
hibiscus, a woodcut fish, sailor's swallows — plus the collage furniture the
layout is assembled from: `Splatter`, `SunBurst` (the radiant), `Banner`,
`Arrow` (which points, literally), `Crosshair` (registration mark),
`Barcode` (derived from its label, so the same tour always prints the same
code), `TornStrip` and `Anchor`.

`IllustratedBackdrop.tsx` paints the fixed sheet behind every page: bone stock,
a radiant turning once every 90 seconds, a halftoned black wash rising off the
floor, a torn diagonal slash, thrown ink in the corners, and one palm frond
still hanging in. Everything sits at very low opacity — it must read through
the tears without competing with a single line of copy.

## Motion

The old design breathed; this one is pinned down. `.animate-wave-sway-1…10`
hold plates at fixed, slightly wrong angles and only **twitch** — a stencil
slipping under the hand — on stepped timing, and pause on hover so the lift
reads cleanly. `animate-bob`, `animate-frond`, `animate-spin-slow` and
`cloudDrift` move the scenery slowly. `animate-ink-bleed` is the reveal for
stamped elements. Everything is disabled under `prefers-reduced-motion`.
