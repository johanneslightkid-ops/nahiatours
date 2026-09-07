/**
 * clone-kv.mjs
 *
 * Copies every key/value out of one Workers KV namespace and into another, so
 * a new deployment starts life with the real catalogue — tours, transport,
 * story, brand, testimonials — instead of the seed JSON bundled in /data.
 *
 * It picks the source namespace itself: of all the namespaces the token can
 * see, it takes the newest one that is not the destination. "Newest" is the
 * namespace with the highest id-ordering under Cloudflare's own listing, so
 * SOURCE_KV_TITLE is there to override the guess whenever it matters.
 *
 * Resolution:
 *
 *   SOURCE_KV_ID          — use this namespace, no lookup.
 *   SOURCE_KV_TITLE       — find the namespace with this exact title.
 *   (neither)             — newest namespace that is not the destination.
 *
 *   DEST_KV_ID            — write into this namespace, no lookup.
 *   DEST_KV_TITLE         — find or create a namespace with this title.
 *                           Defaults to KV_NAMESPACE_TITLE, then
 *                           "beautiful-tours-data".
 *
 * Set OVERWRITE=false to keep any key the destination already has; the default
 * is to make the destination match the source for every key the source holds.
 * Keys that exist only in the destination are never deleted — this is a copy,
 * not a mirror, so a namespace that already has hand-edited data cannot be
 * emptied by running it.
 *
 * Unlike provision-kv.mjs, this one exits non-zero on failure. Deploying a
 * site that silently fell back to seed data would look like it worked.
 */

const API = 'https://api.cloudflare.com/client/v4';

// Trimmed, because this is the single most common way a working token fails:
// pasted into a secret with a trailing newline, it produces an Authorization
// header Cloudflare rejects outright (6003 "Invalid request headers", chained
// to 6111 "Invalid format for Authorization header"). That reads like a bad
// token but is really a bad header, and costs an hour if you believe it.
const token = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
const OVERWRITE = process.env.OVERWRITE !== 'false';
const DEST_TITLE =
  process.env.DEST_KV_TITLE || process.env.KV_NAMESPACE_TITLE || 'beautiful-tours-data';

const log = (message) => console.log(`[clone-kv] ${message}`);

/** Cloudflare hides the useful half of an error inside error_chain. */
const describe = (errors) =>
  (errors || [])
    .map((e) => {
      const chain = (e.error_chain || []).map((c) => `${c.code} ${c.message}`).join(' → ');
      return chain ? `${e.code} ${e.message} (${chain})` : `${e.code} ${e.message}`;
    })
    .join('; ');

const cf = async (path, init = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body && !init.raw ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!body || body.success !== true) {
    throw new Error(describe(body?.errors) || `HTTP ${response.status} from ${path}`);
  }
  return body.result;
};

/**
 * Ask Cloudflare what it thinks of the token before doing anything with it, so
 * a rejected credential is reported as a rejected credential rather than as
 * whichever call happened to run first.
 */
const verifyToken = async () => {
  const response = await fetch(`${API}/user/tokens/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => null);
  if (body?.success === true) {
    log(`token verified — status "${body.result?.status}"`);
    return;
  }
  const detail = describe(body?.errors) || `HTTP ${response.status}`;
  const shape =
    `it is ${token.length} characters` +
    (/^[A-Za-z0-9_.-]+$/.test(token) ? '' : ', and contains characters outside [A-Za-z0-9_.-]');
  throw new Error(
    `Cloudflare rejected the token: ${detail}. For reference ${shape}. ` +
      'A 6003/6111 here means the Authorization header itself was malformed — ' +
      'usually a newline or space captured when the secret was pasted, so re-adding ' +
      'CLOUDFLARE_API_TOKEN with no trailing whitespace is the fix. Note also that ' +
      'this endpoint only accepts an API token: an OAuth credential from `wrangler ' +
      'login`, or a Global API Key, will not verify here.'
  );
};

const resolveAccountId = async () => {
  const fromEnv = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  if (fromEnv) {
    log('using CLOUDFLARE_ACCOUNT_ID from the environment');
    return fromEnv;
  }
  let accounts;
  try {
    accounts = await cf('/accounts?per_page=50');
  } catch (error) {
    // A token scoped to Workers alone is often not allowed to enumerate
    // accounts. That is a fine token; it just cannot answer this question.
    throw new Error(
      `could not list accounts (${error.message}). Add a CLOUDFLARE_ACCOUNT_ID ` +
        'repository secret — the id is on the right-hand side of any Cloudflare ' +
        'dashboard page, and in the URL as dash.cloudflare.com/<account id>.'
    );
  }
  if (accounts.length !== 1) {
    throw new Error(
      `token can see ${accounts.length} account(s) — set CLOUDFLARE_ACCOUNT_ID to pick one`
    );
  }
  log(`resolved account "${accounts[0].name}"`);
  return accounts[0].id;
};

const listNamespaces = async (accountId) => {
  const all = [];
  for (let page = 1; ; page += 1) {
    const batch = await cf(
      `/accounts/${accountId}/storage/kv/namespaces?per_page=100&page=${page}`
    );
    all.push(...batch);
    if (batch.length < 100) return all;
  }
};

/** Every key in a namespace, following Cloudflare's cursor pagination. */
const listKeys = async (accountId, namespaceId) => {
  const keys = [];
  let cursor = '';
  do {
    const query = `limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const response = await fetch(
      `${API}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/keys?${query}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const body = await response.json();
    if (body.success !== true) {
      const detail = body.errors?.map((e) => `${e.code} ${e.message}`).join('; ');
      throw new Error(detail || `HTTP ${response.status} listing keys`);
    }
    keys.push(...body.result.map((k) => k.name));
    cursor = body.result_info?.cursor || '';
  } while (cursor);
  return keys;
};

/** Values are opaque here — read and written as raw bytes, never parsed. */
const readValue = async (accountId, namespaceId, key) => {
  const response = await fetch(
    `${API}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status} reading "${key}"`);
  return response.text();
};

const writeValue = async (accountId, namespaceId, key, value) => {
  const form = new FormData();
  form.append('value', value);
  form.append('metadata', '{}');
  const response = await fetch(
    `${API}/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  const body = await response.json().catch(() => null);
  if (!body || body.success !== true) {
    const detail = body?.errors?.map((e) => `${e.code} ${e.message}`).join('; ');
    throw new Error(detail || `HTTP ${response.status} writing "${key}"`);
  }
};

const resolveDestination = async (accountId, namespaces) => {
  if (process.env.DEST_KV_ID) return { id: process.env.DEST_KV_ID, title: '(by id)' };
  const match = namespaces.find((ns) => ns.title === DEST_TITLE);
  if (match) return match;
  const created = await cf(`/accounts/${accountId}/storage/kv/namespaces`, {
    method: 'POST',
    body: JSON.stringify({ title: DEST_TITLE }),
  });
  log(`created destination namespace "${DEST_TITLE}"`);
  return created;
};

const resolveSource = (namespaces, destinationId) => {
  if (process.env.SOURCE_KV_ID) {
    return { id: process.env.SOURCE_KV_ID, title: '(by id)' };
  }
  if (process.env.SOURCE_KV_TITLE) {
    const match = namespaces.find((ns) => ns.title === process.env.SOURCE_KV_TITLE);
    if (!match) {
      throw new Error(
        `no namespace titled "${process.env.SOURCE_KV_TITLE}" — saw: ` +
          namespaces.map((ns) => ns.title).join(', ')
      );
    }
    return match;
  }
  const candidates = namespaces.filter((ns) => ns.id !== destinationId);
  if (candidates.length === 0) {
    throw new Error('no other namespace to copy from — set SOURCE_KV_TITLE');
  }
  // Cloudflare returns namespaces oldest-first, so the last is the newest.
  return candidates[candidates.length - 1];
};

const main = async () => {
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is required');

  await verifyToken();
  const accountId = await resolveAccountId();
  const namespaces = await listNamespaces(accountId);
  log(`token sees ${namespaces.length} namespace(s): ${namespaces.map((n) => n.title).join(', ')}`);

  const destination = await resolveDestination(accountId, namespaces);
  const source = resolveSource(namespaces, destination.id);

  if (source.id === destination.id) {
    throw new Error('source and destination are the same namespace');
  }

  log(`copying "${source.title}" (${source.id}) → "${destination.title}" (${destination.id})`);

  const sourceKeys = await listKeys(accountId, source.id);
  log(`${sourceKeys.length} key(s) in the source`);
  if (sourceKeys.length === 0) {
    log('nothing to copy — the source namespace is empty');
    return;
  }

  const existing = OVERWRITE ? new Set() : new Set(await listKeys(accountId, destination.id));

  let copied = 0;
  let skipped = 0;
  for (const key of sourceKeys) {
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    const value = await readValue(accountId, source.id, key);
    await writeValue(accountId, destination.id, key, value);
    copied += 1;
    log(`  ${key} (${value.length} bytes)`);
  }

  log(`done — ${copied} copied${skipped ? `, ${skipped} left alone` : ''}`);
  // Hand the id back so the deploy can bind exactly what was just filled.
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_OUTPUT, `namespace_id=${destination.id}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `source_title=${source.title}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `keys_copied=${copied}\n`);
  }
};

main().catch((error) => {
  console.error(`[clone-kv] ${error.message}`);
  process.exit(1);
});
