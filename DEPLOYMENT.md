# Deployment

The site ships as a **Cloudflare Worker with static assets** — project
`nahiatours`, deployed from this repository on every push to the connected
branch.

## How a deploy runs

Cloudflare runs two commands, in this order:

| Step | Command | What happens |
| --- | --- | --- |
| Build | `npm run build` | provisions KV → generates the sitemap → pulls remote data → `vite build` into `dist/` |
| Deploy | `npx wrangler deploy` | uploads `worker/index.ts` and everything in `dist/` |

`npm run build` runs `scripts/provision-kv.mjs` first, so by the time wrangler
reads `wrangler.toml` the KV binding is already written into it. Nothing has to
be pasted in by hand and nothing has to be committed.

Locally, `npm run deploy` does both steps in one go.

## The one thing to set up

Add **`CLOUDFLARE_API_TOKEN`** to the project's build environment variables
(Cloudflare dashboard → the `nahiatours` project → Settings → Variables and
Secrets → add as a **secret**). It needs the **Workers KV Storage: Edit**
permission.

With it, every deploy makes the namespace `nahiatours-data` exist and binds it
as `DATA_KV_F`, creating it on first run and reusing it afterwards.

Without it the deploy still succeeds — `provision-kv` warns and steps aside,
and the site serves reads from the JSON bundled at `/data/*.json`. Only admin
writes and `/api/init-data` actually need KV.

If you would rather pin a namespace than let the script manage one, set
`KV_NAMESPACE_ID` instead and no API call is made.

Other variables the script understands: `CLOUDFLARE_ACCOUNT_ID` (needed only if
the token can see more than one account), `KV_NAMESPACE_TITLE`, `KV_BINDING`.

## Seeding KV

The namespace starts empty, which is fine — the bundled JSON covers reads. To
populate it from JSONBin once:

```bash
curl -X POST https://<your-deployment>/api/init-data \
  -H "x-init-secret: $INIT_DATA_SECRET"
```

`INIT_DATA_SECRET` must be set in the project's variables for that endpoint to
respond at all.

## Preview hostnames

`shared/canonical.ts` 301s any non-canonical hostname to `ferreras.tours`,
**except** preview hosts (`*.workers.dev`, `*.pages.dev`, localhost), which are
served in place and marked `noindex`. Without that exception a preview
deployment would redirect away from itself and you could never look at it.

## Still to do

`wrangler.toml` carries `CLOUDINARY_API_SECRET` and `ADMIN_PASSWORD` in
plaintext. They belong in `npx wrangler secret put <NAME>`. The `VITE_`-prefixed
copies are additionally compiled into the client bundle, where any visitor can
read them, so those need rotating rather than just moving.
