# Deployment — LD VIP

> **This branch is not for merging.** `ld_vip` is a second, parallel
> deployment of the site under a different design. Merging it into `main`
> would replace the live nahiatours design rather than standing a second one
> up. A pull request against `main` exists only as somewhere to read the diff.

`ld_vip` carries its own `wrangler.toml`, which names the Worker **`ld-vip`**
rather than `nahiatours`. That file is the reason a deploy from this branch can
never land on the production Worker by accident, whichever path below runs it.

| | `main` → nahiatours | `ld_vip` → LD VIP |
| --- | --- | --- |
| Worker name (`wrangler.toml`) | `nahiatours` | `ld-vip` |
| KV namespace | `nahiatours-data` | `ld-vip-data` |
| Deploy trigger | Workers Builds, production branch | Workers Builds, branch build on push |
| Canonical redirect | as configured | none — `CANONICAL_HOST` is unset |

`scripts/provision-kv.mjs` reads the Worker name out of `wrangler.toml` and
names the namespace after it, so the split is automatic — neither deployment
has to be told about the other.

## How a deploy runs

Two commands, in this order:

| Step | Command | What happens |
| --- | --- | --- |
| Build | `npm run build` | provisions KV → pulls remote data → generates the sitemap → writes the SEO block → `vite build` into `dist/` |
| Deploy | `npx wrangler deploy` | uploads `worker/index.ts` and everything in `dist/` |

`npm run build` runs `scripts/provision-kv.mjs` first, so by the time wrangler
reads `wrangler.toml` the KV binding is already written into it. Nothing has to
be pasted in by hand and nothing has to be committed.

Locally, `npm run deploy` does both steps in one go.

## How it actually ships today

The repository is **already connected to Cloudflare Workers Builds**, and that
connection builds this branch on every push and publishes it at its own branch
URL:

```
https://ld-vip-nahiatours.<subdomain>.workers.dev
```

`main` still builds and publishes the production site; a non-production branch
gets its own build and its own URL and does not become production. So this
branch is live, separate, and merged into nothing — which is the whole point of
it.

## Deploying it as a Worker of its own (optional)

If it should be a distinct Worker — `ld-vip`, with its own name in the
dashboard and its own `ld-vip-data` KV namespace — rather than a branch build of
the connected project, there are two ways.

### Option A — the GitHub Actions workflow (already written)

`.github/workflows/deploy-ld-vip.yml` builds and deploys on every push to
`ld_vip`. **It skips itself, in green, unless a token is configured**, because
this path is optional and a red check on the pull request would be a false
alarm.

To switch it on, add one repository secret under Settings → Secrets and
variables → Actions:

**`CLOUDFLARE_API_TOKEN`**, with

- **Workers Scripts: Edit** — to deploy at all.
- **Workers KV Storage: Edit** — so the namespace `ld-vip-data` gets created
  and bound. Without it the deploy still succeeds; the site just reads from the
  JSON bundled at `/data/*.json`, and only admin writes and `/api/init-data`
  need KV.

Add **`CLOUDFLARE_ACCOUNT_ID`** as well if the token can see more than one
Cloudflare account. `CF_API_TOKEN` / `CF_ACCOUNT_ID` are accepted as aliases.

### Option B — a second Workers Builds project

In the Cloudflare dashboard: **Workers & Pages → Create → Import a repository**,
pick `johanneslightkid-ops/nahiatours`, and set:

- **Branch to deploy**: `ld_vip`
- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`

Create it as a **new** project. Pointing the existing `nahiatours` project at
this branch would replace the live site rather than standing a second one up.

## Optional variables

| Variable | Effect |
| --- | --- |
| `SITE_URL` | Absolute URLs in the sitemap, canonical tag and OpenGraph block. Set it to the real `ld-vip.<subdomain>.workers.dev` once you know the subdomain; otherwise the build falls back to `https://ld-vip.workers.dev`. |
| `CANONICAL_HOST` | Left **unset** on purpose. `shared/canonical.ts` only 301s when it is set, so this deployment serves under its own hostname instead of redirecting visitors to the nahiatours domain. |
| `KV_NAMESPACE_ID` | Pin an existing namespace instead of letting the script manage one. |
| `KV_NAMESPACE_TITLE`, `KV_BINDING` | Override the derived namespace title / binding name. |
| `INIT_DATA_SECRET` | Required before `/api/init-data` will respond at all. |

## Seeding KV

The namespace starts empty, which is fine — the bundled JSON covers reads. To
populate it from JSONBin once:

```bash
curl -X POST https://<your-deployment>/api/init-data \
  -H "x-init-secret: $INIT_DATA_SECRET"
```

## Preview hostnames

`shared/canonical.ts` treats `*.workers.dev`, `*.pages.dev` and localhost as
preview hosts: they are served in place and marked `noindex`, never redirected.
Since `CANONICAL_HOST` is unset here, nothing is redirected anyway — but the
`noindex` still applies, which keeps this redesign out of search results while
it lives on a workers.dev hostname. Set `SITE_URL` and a custom domain when it
should be indexed.

## Still to do

`wrangler.toml` carries `CLOUDINARY_API_SECRET` and `ADMIN_PASSWORD` in
plaintext. They belong in `npx wrangler secret put <NAME>`. The `VITE_`-prefixed
copies are additionally compiled into the client bundle, where any visitor can
read them, so those need rotating rather than just moving.
