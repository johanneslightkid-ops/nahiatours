/**
 * kv-brand-hunt.mjs — read-only search for surviving copies of a site's brand.
 *
 * Reads the `brand` key of every KV namespace on the account and prints its
 * public fields (the same ones the site serves at /api/data?resource=brand),
 * plus each namespace's key names, sizes and metadata. Credential keys are
 * never read. Never writes to KV.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const OUT = 'kv-brand-hunt';
const SECRET_KEYS = new Set(['admin-password', 'payment-secrets', 'ai-settings', 'ADMIN_PASSWORD']);
const isSecret = (name) => SECRET_KEYS.has(name) || name.startsWith('payment-order:');

const cf = async (path, raw = false) => {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (raw) {
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${path}`);
    return response.text();
  }
  const body = await response.json().catch(() => null);
  if (!body || body.success !== true) {
    throw new Error(body?.errors?.map((e) => `${e.code} ${e.message}`).join('; ') || `HTTP ${response.status}`);
  }
  return body;
};

if (!TOKEN) throw new Error('no CLOUDFLARE_API_TOKEN');
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || (await cf('/accounts?per_page=50')).result[0]?.id;
const namespaces = (await cf(`/accounts/${accountId}/storage/kv/namespaces?per_page=100`)).result;
mkdirSync(OUT, { recursive: true });

const report = {};
for (const ns of namespaces) {
  const base = `/accounts/${accountId}/storage/kv/namespaces/${ns.id}`;
  let keys = [];
  try {
    keys = (await cf(`${base}/keys?limit=1000`)).result;
  } catch (error) {
    console.log(`\n## ${ns.title} (${ns.id}) — keys unreadable: ${error.message}`);
    continue;
  }
  console.log(`\n## ${ns.title} (${ns.id}) — ${keys.length} key(s)`);
  for (const key of keys) {
    console.log(`   ${key.name}${isSecret(key.name) ? ' [credential, not read]' : ''}${key.metadata ? ` metadata=${JSON.stringify(key.metadata)}` : ''}${key.expiration ? ` expires=${key.expiration}` : ''}`);
  }
  const brandKeys = keys.filter((k) => /brand/i.test(k.name) && !isSecret(k.name));
  for (const key of brandKeys) {
    const raw = await cf(`${base}/values/${encodeURIComponent(key.name)}`, true);
    if (raw === undefined) continue;
    writeFileSync(join(OUT, `${ns.title}__${key.name.replace(/[^\w.-]/g, '_')}.json`), raw);
    let value;
    try { value = JSON.parse(raw); } catch { value = null; }
    const pick = value && typeof value === 'object'
      ? Object.fromEntries(['brandName', 'contactName', 'phoneNumber', 'paypalMeLink', 'brandicon', 'verifoneLink'].map((f) => [f, value[f]]))
      : { raw: raw.slice(0, 200) };
    report[`${ns.title}/${key.name}`] = pick;
    console.log(`   >> ${key.name}: ${JSON.stringify(pick)}`);
  }
}
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ takenAt: new Date().toISOString(), report }, null, 2));
