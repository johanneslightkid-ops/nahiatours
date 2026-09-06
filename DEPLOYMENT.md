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
| workers.dev hostname | `nahiatours.…` | `ld-vip.…` |
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

## Where it is meant to live

```
https://ld-vip.johannes-neugschwentner.workers.dev
```

That is a Worker of its own, named `ld-vip`, standing beside `nahiatours` in
the dashboard with its own `ld-vip-data` KV namespace. `workers_dev = true` in
`wrangler.toml` is what serves it at that hostname, and
`scripts/site-config.mjs` defaults every absolute URL — canonical tag,
OpenGraph, sitemap, structured data — to it.

Standing it up needs a Cloudflare credential, which the repository does not
have yet. Pick either route below; both produce the same Worker at the same
URL.

### Route A — the GitHub Actions workflow (written, waiting on one secret)

`.github/workflows/deploy-ld-vip.yml` builds and deploys on every push to
`ld_vip`, and can also be run by hand from the Actions tab. It **skips itself
in green** while unconfigured, so it never shows a false failure.

Add one repository secret — Settings → Secrets and variables → Actions → New
repository secret:

| | |
| --- | --- |
| Name | `CLOUDFLARE_API_TOKEN` |
| Permissions | **Account → Workers Scripts → Edit**<br>**Account → Workers KV Storage → Edit** |

Create the token at *My Profile → API Tokens → Create Token → Create Custom
Token*. Workers Scripts: Edit is what deploys; Workers KV Storage: Edit lets
`scripts/provision-kv.mjs` create and bind `ld-vip-data`. Without the KV
permission the deploy still succeeds — reads fall back to the JSON bundled at
`/data/*.json`, and only admin writes and `/api/init-data` need KV.

Add `CLOUDFLARE_ACCOUNT_ID` too if the token can see more than one account.
`CF_API_TOKEN` / `CF_ACCOUNT_ID` work as aliases.

The next push to `ld_vip` — or *Actions → Deploy LD VIP → Run workflow* —
publishes it.

### Route B — a second Workers Builds project

In the Cloudflare dashboard: **Workers & Pages → Create → Import a
repository**, pick `johanneslightkid-ops/nahiatours`, and set:

- **Branch to deploy**: `ld_vip`
- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`

Create it as a **new** project. Pointing the existing `nahiatours` project at
this branch would replace the live site rather than standing a second one up.

### What exists in the meantime

The repository is already connected to Workers Builds for the `nahiatours`
project, so pushes to `ld_vip` also produce a *branch build* of that project at

```
https://ld-vip-nahiatours.johannes-neugschwentner.workers.dev
```

That URL is a branch build, not a Worker of its own: it is fine for looking at
the redesign, but the standalone `ld-vip` Worker above is the deployment this
branch is written for.

## Optional variables

| Variable | Effect |
| --- | --- |
| `SITE_URL` | Overrides the host used for absolute URLs. The build already defaults to `https://ld-vip.johannes-neugschwentner.workers.dev`, so this is only needed once a custom domain exists. |
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
