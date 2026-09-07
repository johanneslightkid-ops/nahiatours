/**
 * provision-kv.mjs
 *
 * Makes the KV namespace exist and binds it, as part of the deploy — so a
 * fresh Cloudflare project wires itself up instead of waiting on someone to
 * paste an id into wrangler.toml.
 *
 * It runs inside `npm run build`, which Cloudflare runs before `wrangler
 * deploy`, so by the time wrangler reads wrangler.toml the binding is there.
 *
 * Resolution order for the namespace id:
 *
 *   1. KV_NAMESPACE_ID           — use it as-is, no API call.
 *   2. CLOUDFLARE_API_TOKEN      — find the namespace by title, create it if
 *                                  it does not exist yet.
 *   3. neither                   — skip.
 *
 * Skipping is not a failure. Without a binding the site still serves: reads
 * fall back to the JSON bundled at /data/*.json (functions/api/data.ts). Only
 * admin writes and /api/init-data need KV. A deploy should never be blocked by
 * this script, so every failure path here warns and exits 0.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(ROOT, 'wrangler.toml');
const API = 'https://api.cloudflare.com/client/v4';

const NAMESPACE_TITLE = process.env.KV_NAMESPACE_TITLE || 'nahiatours-data';
const BINDING = process.env.KV_BINDING || 'DATA_KV_F';

// The generated block is delimited so re-runs replace it rather than stacking
// up duplicate bindings.
const BEGIN = '# >>> managed by scripts/provision-kv.mjs — do not edit by hand';
const END = '# <<< managed by scripts/provision-kv.mjs';

const log = (message) => console.log(`[provision-kv] ${message}`);
const warn = (message) => console.warn(`[provision-kv] ${message}`);

/** Cloudflare wraps every response in {success, result, errors}. */
const cf = async (path, token, init = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!body || body.success !== true) {
    // Cloudflare hides the useful half of an error inside error_chain.
    const detail = (body?.errors || [])
      .map((e) => {
        const chain = (e.error_chain || []).map((c) => `${c.code} ${c.message}`).join(' → ');
        return chain ? `${e.code} ${e.message} (${chain})` : `${e.code} ${e.message}`;
      })
      .join('; ');
    throw new Error(detail || `HTTP ${response.status} from ${path}`);
  }
  return body.result;
};

const resolveAccountId = async (token) => {
  const fromEnv = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  if (fromEnv) {
    return fromEnv;
  }
  const accounts = await cf('/accounts?per_page=50', token);
  if (accounts.length !== 1) {
    throw new Error(
      `token can see ${accounts.length} accounts — set CLOUDFLARE_ACCOUNT_ID to pick one`
    );
  }
  return accounts[0].id;
};

const findOrCreateNamespace = async (token, accountId) => {
  const existing = await cf(
    `/accounts/${accountId}/storage/kv/namespaces?per_page=100`,
    token
  );
  const match = existing.find((ns) => ns.title === NAMESPACE_TITLE);
  if (match) {
    log(`found existing namespace "${NAMESPACE_TITLE}"`);
    return match.id;
  }
  const created = await cf(`/accounts/${accountId}/storage/kv/namespaces`, token, {
    method: 'POST',
    body: JSON.stringify({ title: NAMESPACE_TITLE }),
  });
  log(`created namespace "${NAMESPACE_TITLE}"`);
  return created.id;
};

/** Write (or rewrite) the managed binding block in wrangler.toml. */
const writeBinding = (namespaceId) => {
  const config = readFileSync(CONFIG_PATH, 'utf8');
  const block = [
    BEGIN,
    `# Namespace "${NAMESPACE_TITLE}", bound as ${BINDING}.`,
    '[[kv_namespaces]]',
    `binding = "${BINDING}"`,
    `id = "${namespaceId}"`,
    END,
  ].join('\n');

  const managed = new RegExp(
    `${escapeRegExp(BEGIN)}[\\s\\S]*?${escapeRegExp(END)}`,
    'm'
  );

  const next = managed.test(config)
    ? config.replace(managed, block)
    : `${config.trimEnd()}\n\n${block}\n`;

  if (next === config) {
    log('binding already up to date');
    return false;
  }

  writeFileSync(CONFIG_PATH, next);
  log(`bound ${BINDING} → ${namespaceId} in wrangler.toml`);
  return true;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const main = async () => {
  if (process.env.KV_NAMESPACE_ID) {
    log('using KV_NAMESPACE_ID from the environment');
    writeBinding(process.env.KV_NAMESPACE_ID);
    return;
  }

  // Trimmed: a secret pasted with a trailing newline builds an Authorization
  // header Cloudflare rejects with 6003, which this script would then swallow.
  const token = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
  if (!token) {
    warn('no CLOUDFLARE_API_TOKEN and no KV_NAMESPACE_ID — skipping.');
    warn('The deploy continues; reads fall back to the bundled /data/*.json.');
    warn('To wire KV up, set CLOUDFLARE_API_TOKEN in the project\'s build');
    warn('environment variables (Workers KV Storage: Edit), then redeploy.');
    return;
  }

  const accountId = await resolveAccountId(token);
  const namespaceId = await findOrCreateNamespace(token, accountId);
  writeBinding(namespaceId);
};

main().catch((error) => {
  // Never fail the build over this — a site without KV still serves.
  warn(`could not provision KV: ${error.message}`);
  warn('Continuing the deploy without a KV binding.');
});
