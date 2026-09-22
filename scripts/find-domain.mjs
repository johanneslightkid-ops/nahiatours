/**
 * Which Cloudflare thing actually serves a hostname?
 *
 * `workers/domains` only knows about Workers custom domains. A hostname can
 * reach a site three other ways, and a deploy aimed at the wrong one either
 * does nothing or replaces something it should not have touched:
 *
 *   • a Pages project, which keeps its domains in a different API entirely;
 *   • a Worker ROUTE on the zone, which is a pattern rather than a domain;
 *   • a different account.
 *
 * So this asks all of them, for one hostname, and prints what owns it —
 * together with the KV namespaces on the account, because whatever is found
 * has to keep reading its own data afterwards.
 *
 * Read-only. Names and ids only; never a value, never a secret.
 */

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const HOST = (process.env.LOOKUP_HOST || '').trim();

const cf = async (path) => {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => null);
  if (!body || body.success !== true) {
    const detail = body?.errors?.map((e) => `${e.code} ${e.message}`).join('; ');
    throw new Error(detail || `HTTP ${res.status} from ${path}`);
  }
  return body.result;
};

const try_ = async (label, fn) => {
  try {
    return await fn();
  } catch (error) {
    console.log(`  ${label}: unreadable — ${error.message}`);
    return null;
  }
};

const main = async () => {
  if (!TOKEN) return console.warn('[find-domain] no CLOUDFLARE_API_TOKEN.');
  if (!HOST) return console.warn('[find-domain] set LOOKUP_HOST.');

  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (await cf('/accounts?per_page=50').then((a) => a[0]?.id));
  console.log(`[find-domain] looking for "${HOST}" on account ${accountId}\n`);

  // ── Pages projects and every domain attached to them.
  console.log('── Pages projects');
  const pages = await try_('pages', () => cf(`/accounts/${accountId}/pages/projects`));
  for (const p of pages || []) {
    const domains = p.domains || [];
    const hit = domains.some((d) => d === HOST || d.endsWith(`.${HOST}`) || HOST.endsWith(d));
    console.log(
      `  ${hit ? '>>' : '  '} ${p.name}  [${domains.join(', ') || 'no domains'}]` +
        `  prod_branch=${p.source?.config?.production_branch || '?'}` +
        `  repo=${p.source?.config?.owner || ''}/${p.source?.config?.repo_name || ''}`
    );
  }
  if (!pages?.length) console.log('  (none)');

  // ── Zones on the account, and any Worker routes defined on the matching one.
  console.log('\n── Zones and Worker routes');
  const zones = await try_('zones', () => cf('/zones?per_page=100'));
  for (const z of zones || []) {
    if (!(HOST === z.name || HOST.endsWith(`.${z.name}`))) continue;
    console.log(`  zone ${z.name} (${z.id})  status=${z.status}`);
    const routes = await try_('routes', () => cf(`/zones/${z.id}/workers/routes`));
    for (const r of routes || []) console.log(`    route ${r.pattern}  ->  ${r.script || '(none)'}`);
    if (!routes?.length) console.log('    (no worker routes)');
  }
  if (!zones?.some((z) => HOST === z.name || HOST.endsWith(`.${z.name}`))) {
    console.log(`  no zone on this account matches ${HOST}`);
  }

  // ── KV, so whatever serves it can keep its data.
  console.log('\n── KV namespaces');
  const ns = await try_('kv', () => cf(`/accounts/${accountId}/storage/kv/namespaces?per_page=100`));
  for (const n of (ns || []).sort((a, b) => a.title.localeCompare(b.title))) {
    console.log(`  ${n.title.padEnd(30)} ${n.id}`);
  }
};

main().catch((e) => console.warn(`[find-domain] ${e.message}`));
