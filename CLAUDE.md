# Working in this repository

## Branches are sites, not proposals

Six branches of this repository are six live websites. They are permanent
and parallel: none of them is ever meant to be merged into another, and `main`
is not "the truth" the others are drafts of — it is just the branch that
happens to be nahia.tours.

| branch            | Cloudflare Worker | domain                |
| ----------------- | ----------------- | --------------------- |
| `main`            | `nahiatours`      | nahia.tours           |
| `beautiful-tours` | `beautifull`      | beautiful-tours.com   |
| `transporturist`  | `transporturist`  | (workers.dev only)    |
| `ldvip`           | `ldvip`           | (workers.dev only)    |
| `amigotours`      | `amigotours`      | amigotours.vip        |
| `bavaro-tours`    | `bavarotours`     | bavaro.tours          |

**Commit and push straight to the site branch. Never open a pull request.**
There is nothing to review a site branch *into* — a PR against `main` would
propose replacing the production site with another one's design. Work on a
branch, commit it, push it, and the branch's workflow deploys it. That is the
whole process.

GitHub will still show a "`<branch>` had recent pushes — Compare & pull
request" banner on the repository page after any push. That is GitHub's own
prompt, it appears for every non-default branch, it cannot be turned off, and
it means nothing here. Ignore it; it disappears on its own.

**Never merge between site branches.** It would drag one site's design into
another. Fixes are ported file by file — see below.

## Shared code versus design

Every branch runs the same application in different clothes. Which is which
decides how a change travels:

* **Shared** — `functions/`, `worker/`, `shared/`, `scripts/`, `src/services/`,
  `src/lib/`, `src/components/admin/`, `src/components/layout/AdminNav.tsx`.
  These are the same job everywhere and are copied wholesale between branches.
  Keep them styled only in the nine colour families every `tailwind.config.cjs`
  defines — `ink paper mango hibiscus lagoon sky jungle sunset grape` — or half
  the classes silently do nothing on the branches that lack the rest.
* **This branch's own** — `src/styles/globals.css`, `tailwind.config.cjs`,
  `index.html`, `src/components/Hero.tsx`, `src/components/layout/Header.tsx`,
  `Footer.tsx`, `src/components/ui/Illustrations.tsx`, the card components.
  **Never copy these across.** When a fix touches one, patch each branch's own
  copy instead of replacing it.

Before porting anything, diff it across the branches first. More than once a
branch has been *ahead* on a file that looked shared.

## Deploys

Each branch has a workflow in `.github/workflows/` that builds it and deploys
it to its own Worker on push. `main`'s is manual (`workflow_dispatch`) so it
cannot race Cloudflare's own git integration.

`npm run build` begins with `scripts/provision-kv.mjs`, which resolves the KV
namespace by title and writes the binding into `wrangler.toml`. **It needs
`CLOUDFLARE_API_TOKEN`, and without one it warns and exits 0.** A deploy whose
build skipped that step ships a config with no `[[kv_namespaces]]`, and a
Worker deploy replaces its bindings with exactly what the config declares — so
the namespace gets unbound, the site silently falls back to the JSON bundled
in the build, and every admin save goes nowhere. That is what "the site reset
itself to the default values again" has always meant here. Any new deploy path
must carry that token.

## KV belongs to the site that uses it

Each site has its own namespace and they are independent. `scripts/clone-kv.mjs`
copies from `nahiatours-data` into another site's namespace; it was the
one-time bootstrap for a new site and it is **opt-in** on every workflow now.
Do not switch it back on by default: even seeding only the keys a site is
missing will restore content that was deleted on purpose, and hand any newly
stored key production's value.

### This branch inherited its namespace

`bavaro-tours` is the one branch that does not read a namespace of its own
making. bavaro.tours was a Cloudflare **Pages** project (`mariotours`) built
from a different repository, and this branch replaced it. The design is new;
the content is the one that was already live, in `DATA_KV_M`
(`341c4ac0817a40bbb87c94dcb1525114`) — `brand`, `tours-en`, `tours-es`,
`social-media`, `story-elements-en`, `story-elements-es`, `transfer-config`.

Two consequences worth knowing before touching anything here:

* **The id is pinned literally in `wrangler.toml`**, not resolved by title.
  `provision-kv.mjs` now leaves a hand-pinned binding alone, so the pin
  survives a build that has no API token — which is exactly the build that
  otherwise ships a Worker with no KV at all. Do not replace it with a title.
* **Keys this design added are simply absent there**, and that is fine: reads
  fall back to the JSON bundled at `/data/*.json` until the admin panel saves
  one. Do not "fix" it by seeding — the namespace is not empty, it is
  somebody's live content.

## Answering "which build is this?"

`GET /api/health` on any deployment reports the site, the branch, the commit
and which bindings are present. It is served `no-store`, so it cannot be a
cached answer.

The `Inspect Cloudflare deployments` workflow (manual) prints, per Worker, the
last deployments with Cloudflare's own trigger annotation and the custom
domains routed to it. Between the two, "a site is serving another site's
pages" is answerable without dashboard access.

## Performance

Held to a throttled mid-range phone, not a laptop. Animate `transform` and
`opacity` only — `background-position`, `box-shadow`, `width`/`height` and
`filter` are repainted every frame. `backdrop-filter` is cheap on a small
static element and expensive on a sticky full-width one, which re-blurs on
every scroll frame. A `<video>` or `<img>` inside a hidden wrapper is still
downloaded, so anything whose *cost* depends on screen size is decided with
`useMediaQuery`, not a CSS breakpoint.

Measure before and after. The harness that produced the numbers in the commit
history is a Playwright script on a Pixel 5 profile with the CPU throttled 4x.
