/**
 * kv-snapshot.mjs — a read-only copy of what some KV namespaces hold.
 *
 * Writes every key's value into kv-snapshot/<namespace title>/<key>.json so
 * it can be uploaded as a workflow artifact: a backup taken before anything is
 * restored, and the material to tell one site's data from another's. It never
 * writes to KV. Credentials (admin password, payment secrets, AI settings) and
 * pending payment orders are skipped — their names are listed, their values
 * are not read.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SECRET_KEYS = new Set(['admin-password', 'payment-secrets', 'ai-settings', 'ADMIN_PASSWORD']);
const isSecret = (name) => SECRET_KEYS.has(name) || name.startsWith('payment-order:');
const OUT = 'kv-snapshot';

const cf = async (path, raw = false) => {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (raw) {
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${path}`);
    return response.text();
  }
  const body = await response.json().catch(() => null);
  if (!body || body.success !== true) {
    throw new Error(body?.errors?.map((e) => `${e.code} ${e.message}`).join('; ') || `HTTP ${response.status}`);
  }
  return body.result;
};

if (!TOKEN) throw new Error('no CLOUDFLARE_API_TOKEN');
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || (await cf('/accounts?per_page=50'))[0]?.id;
const wanted = (process.env.KV_SNAPSHOT_TITLES || '').split(',').map((t) => t.trim()).filter(Boolean);
const namespaces = (await cf(`/accounts/${accountId}/storage/kv/namespaces?per_page=100`)).filter((ns) =>
  wanted.includes(ns.title)
);

const index = {};
for (const ns of namespaces) {
  const dir = join(OUT, ns.title);
  mkdirSync(dir, { recursive: true });
  const keys = await cf(`/accounts/${accountId}/storage/kv/namespaces/${ns.id}/keys?limit=1000`);
  index[ns.title] = { id: ns.id, keys: [] };
  for (const key of keys) {
    if (isSecret(key.name)) {
      index[ns.title].keys.push({ name: key.name, skipped: 'credential' });
      continue;
    }
    const value = await cf(
      `/accounts/${accountId}/storage/kv/namespaces/${ns.id}/values/${encodeURIComponent(key.name)}`,
      true
    );
    writeFileSync(join(dir, `${key.name.replace(/[^\w.-]/g, '_')}.json`), value);
    index[ns.title].keys.push({ name: key.name, bytes: value.length, metadata: key.metadata ?? null });
  }
  console.log(`[kv-snapshot] ${ns.title}: ${keys.length} key(s)`);
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ takenAt: new Date().toISOString(), index }, null, 2));
