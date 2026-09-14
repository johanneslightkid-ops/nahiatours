# Design system — Transporturist

The Caribbean, **painted in oils**. The previous design was watercolour:
unpainted white paper, clear light, everything quick and transparent. This one
is the opposite material — acrylic laid thick and glazed over in oil — and
every rule below follows from the medium rather than from taste.

The subject follows the business. This is a transport and excursion operator,
so the picture is not a beach on its own: it is the journey. The coast road,
the long horizon out of a window, the arrival. Somebody drives you there.

Everything lives in four files — `tailwind.config.cjs` (palette, type, shadows,
radii), `src/styles/globals.css` (tokens and component classes),
`src/components/ui/Illustrations.tsx` (the SVG set) and the painted scene in
`src/components/ui/IllustratedBackdrop.tsx`.

## The five principles

1. **Nothing starts on white.** Painters tone the canvas before the first
   stroke, because white lies about value — every colour laid on it looks
   darker than it really is. `--paper` is raw linen (`#F0E7D7`), and there is
   no `#ffffff` anywhere on the site. Even the white is titanium white
   (`--white: #FBF6EC`), which is warm. Pure white on a toned ground reads as a
   hole torn in the canvas.
2. **The darks carry the picture.** Value structure before colour: deep
   viridian-umber masses with the light pulled out of them. This is why the sea
   bands go far darker here than the last design dared — and why `lagoon` and
   `bay` now take white type, which on the old pale palette they did not.
3. **Pigment, not light.** Every colour is named for the tube it comes out of
   and mixed the way paint mixes: cadmium orange, cadmium yellow deep, alizarin
   crimson, ultramarine, viridian, sap green, raw sienna, burnt umber. Screen
   primaries are banned, and the earths are under everything — they are what
   stop the cadmiums looking like a monitor.
4. **The brush is visible.** Canvas tooth runs under every band and over every
   photograph. Sections break on a palette-knife edge — flat pulls with abrupt
   steps where the blade lifted — not on a wave. Corners are a stretched panel,
   not a pebble, which is why the radii are a third of what they were.
5. **A painting does not move.** The last design's signature drifted; this one
   cannot, because paint is dry. Nothing animates on its own. The life is in
   the surface and in what happens when you reach for something.

## The palette

Named from the box, not the colour wheel.

| Token | Pigment | Value |
| --- | --- | --- |
| `--ink` | ivory black toward ultramarine | `#22252B` |
| `--paper` | raw linen ground | `#F0E7D7` |
| `--paper-warm` / `--paper-deep` | umber washes over it | `#E5D7BE` / `#D2BF9E` |
| `--white` | titanium white — warm, the lightest value allowed | `#FBF6EC` |
| `--coral` | cadmium orange into burnt sienna — **the action colour** | `#C4501A` |
| `--gold` | cadmium yellow deep — the light source | `#EDA91B` |
| `--lagoon` | cerulean into viridian — the sea | `#1E8E96` |
| `--abyss` | viridian dirtied with burnt umber — the darkest mass | `#123A41` |
| `--sky` | cerulean | `#6FAFCE` |
| `--palm` | sap green over viridian | `#4C7A3A` |
| `--hibiscus` | alizarin crimson | `#9E2B3F` |
| `--grape` | ultramarine | `#35478C` |
| `--sienna` / `--umber` | the earths, under everything | `#B07A3C` / `#6B4626` |

The action colour is knocked back from the tube on purpose. Cadmium orange
straight is too light to carry white type; running it down into burnt sienna
is what lets the button label actually pass. That is a property of the paint,
not a compromise of the design.

## Type

Two variable families, three files.

- **Playfair Display** carries every display size. A Didone's thick-to-thin is
  the typographic form of a loaded brush, and it only shows up with weight
  behind it — headings are set at 800, not 600.
- Its **italic** is the signature in the corner of the canvas (`.hand-note`).
  A painter signs in their own hand, not in a script face bought for the
  occasion, and it saves a font download.
- **Manrope** says the prices. Warm, geometric-humanist and completely quiet:
  pickup times and totals want to be read, not admired.

## The surfaces

- **Canvas tooth** (`--canvas-tooth`) is one 180px tile of fractal noise,
  tinted umber and thresholded low, generated once as a data URI. It goes under
  every band and over every photograph. No filter, no blend, nothing per frame.
- **The glaze** (`.caustics`, keeping its old class name) is what goes over a
  photograph: a thin warm film plus the weave. Together they pull a snapshot
  into the same material as everything around it — the reason a dozen pictures
  shot on a dozen phones read as one painted surface.
- **The varnish** (`body::after`) is a fixed, static warm glaze with a slight
  darkening toward the edges, exactly as a finished canvas is varnished.
- **Cards** are panels painted on the same canvas, not glass floating above
  it: they carry the weave, sit on a toned ground, and are held down by a tight
  umber shadow rather than a soft photographic one.

## Motion

There is none, at rest. What exists:

- `.reveal` — the entrance, as the canvas goes up on the wall.
- **Raking light** — reaching for a panel brings a warm sheen across it, the
  way tilting a canvas toward a window makes the brushwork show. Pointer
  devices only.

Both are `transform` and `opacity`. Every `animate-*` class the markup still
asks for resolves to `animation: none`, held as explicit no-ops so a stray
class cannot resurrect a drift this design does not have.

Measured on an emulated Pixel 5 (CPU ×6) and a 1440×900 desktop (CPU ×4), both
in a software renderer — worst case, no GPU:

| | original | after the perf pass | this design |
| --- | --- | --- | --- |
| phone, idle | 12.7 fps | 60.2 | **60.1** |
| phone, scrolling | 8.6 fps | 60.0 | **60.2** |
| desktop, idle | 10.0 fps | 34.6 | **60.1** |
| desktop, scrolling | 9.0 fps | 21.5 | **59.5** |

The desktop column is the interesting one. The optimisation pass could not get
past ~34/21 there, because a full-viewport fixed scene re-composites a
screenful for any animation inside it, whichever animation it is. Deciding the
painting holds still removed the cause rather than trimming the cost — a design
decision doing what an optimisation could not.

## Deployment

This design deploys as its own Cloudflare Worker, `transporturist`, from the
branch of the same name, with its own KV namespace `transporturist-data`
cloned from the newest existing one. It shares a codebase with `nahiatours`
(production) and `beautiful-tours` (the daylight design) and nothing else.

`wrangler.toml` names the Worker and `.github/workflows/deploy-transporturist.yml`
runs on pushes to this branch. Both have to be wrong at once for a deploy here
to touch another site.
