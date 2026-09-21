/**
 * kv-inventory.mjs — what KV namespaces this account has, and how full.
 *
 * Read-only, and deliberately so. It prints titles, ids and key names. It
 * never prints a VALUE, and it skips the key names that are credentials
 * outright, because this output goes into a CI log.
 *
 * It exists because of a question nobody could answer without the dashboard:
 * "is this site reading its own data?". Five sites share one Cloudflare
 * account and one repository, the namespaces are resolved by title at deploy
 * time, and a title that resolves to the wrong namespace — or to none — looks
 * exactly like a site whose content was reset. One printed inventory settles
 * it, and gives the ids that can then be pinned in wrangler.toml so a build
 * without an API token binds KV too.
 */

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

/** Key names that hold a credential. Listed, never read, never counted apart. */
const SECRET_KEYS = new Set(['admin-password', 'payment-secrets', 'ai-settings']);

const cf = async (path) => {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  const body = await response.json().catch(() => null);
  if (!body || body.success !== true) {
    const detail = body?.errors?.map((e) => `${e.code} ${e.message}`).join('; ');
    throw new Error(detail || `HTTP ${response.status} from ${path}`);
  }
  return body.result;
};

const main = async () => {
  if (!TOKEN) {
    console.warn('[kv-inventory] no CLOUDFLARE_API_TOKEN — nothing to list.');
    return;
  }

  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (await cf('/accounts?per_page=50').then((a) => a[0]?.id));
  if (!accountId) throw new Error('could not resolve an account id');

  // Only the namespaces this repository's sites use. The account carries
  // dozens belonging to unrelated projects, and listing those would be both
  // noise and somebody else's business.
  const wanted = (process.env.KV_INVENTORY_TITLES || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const namespaces = await cf(`/accounts/${accountId}/storage/kv/namespaces?per_page=100`);
  const mine = wanted.length
    ? namespaces.filter((ns) => wanted.includes(ns.title))
    : namespaces.filter((ns) => /nahiatours|beautiful|transport|ldvip|amigo/i.test(ns.title));

  console.log(`[kv-inventory] ${mine.length} namespace(s) belonging to this repository:\n`);

  for (const ns of mine) {
    let keys = [];
    try {
      keys = await cf(`/accounts/${accountId}/storage/kv/namespaces/${ns.id}/keys?limit=1000`);
    } catch (error) {
      console.log(`  ${ns.title.padEnd(24)} ${ns.id}   (keys unreadable: ${error.message})`);
      continue;
    }
    const names = keys.map((k) => k.name).sort();
    const shown = names.filter((n) => !SECRET_KEYS.has(n));
    const hidden = names.length - shown.length;
    console.log(`  ${ns.title.padEnd(24)} ${ns.id}   ${names.length} key(s)`);
    console.log(`      ${shown.join(', ') || '(none)'}${hidden ? `  [+${hidden} credential key(s), not named]` : ''}`);
  }

  console.log(
    '\n[kv-inventory] Pin an id in wrangler.toml to bind KV even on a build\n' +
      '               that has no API token to resolve the title with.'
  );
};

main().catch((error) => {
  console.warn(`[kv-inventory] could not list namespaces: ${error.message}`);
});
