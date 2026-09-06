# Deployment — LD VIP

This branch (`ld_vip`) is a **separate deployment**, not a change to the
existing one. It ships as its own **Cloudflare Worker with static assets**,
named `ld-vip`, and it is never merged into `main`.

Nothing is shared with `nahiatours`:

| | `main` → nahiatours | `ld_vip` → LD VIP |
| --- | --- | --- |
| Worker name (`wrangler.toml`) | `nahiatours` | `ld-vip` |
| Hostname | `nahiatours.<subdomain>.workers.dev` | `ld-vip.<subdomain>.workers.dev` |
| KV namespace | `nahiatours-data` | `ld-vip-data` |
| Deploy trigger | its own connected branch | push to `ld_vip` |

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

## Setting the deployment up

Pick **one** of these. Both produce the same `ld-vip` Worker.

### Option A — GitHub Actions (already wired)

`.github/workflows/deploy-ld-vip.yml` builds and deploys on every push to
`ld_vip`. It needs one repository secret:

**`CLOUDFLARE_API_TOKEN`** — Settings → Secrets and variables → Actions → New
repository secret. The token needs:

- **Workers Scripts: Edit** — to deploy at all.
- **Workers KV Storage: Edit** — so the namespace `ld-vip-data` gets created
  and bound. Without it the deploy still succeeds; the site just reads from the
  JSON bundled at `/data/*.json`, and only admin writes and `/api/init-data`
  need KV.

Add **`CLOUDFLARE_ACCOUNT_ID`** as well if the token can see more than one
Cloudflare account.

### Option B — Cloudflare Workers Builds

In the Cloudflare dashboard: **Workers & Pages → Create → Import a repository**,
pick `johanneslightkid-ops/nahiatours`, and set:

- **Branch to deploy**: `ld_vip`
- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`

Then add `CLOUDFLARE_API_TOKEN` (Workers KV Storage: Edit) to that project's
build variables, as a secret, for the same KV reason as above.

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
