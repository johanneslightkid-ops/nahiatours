// Exclusive Dominican Tours (now trading as the name in its brand record):
// the stored site pages and blog posts get the name tokens the site fills in
// from Admin › Marca (exclusive-dominican-tours 35ec460, src/utils/brandText.ts):
//
//   site-pages-<locale>  {{brand}} stays in the legal pages (policies); in the
//                        rest — about, FAQ, contact — it becomes {{name}}, the
//                        name the admin prefers.
//   blog-<locale>        the name written out by the last rewrite (the brand
//                        record's) and the old company name become {{name}}.
//
// Every other character is written back as read. Refuses unless the
// namespace is exclusive-tours-data. Snapshots before and after are kept as an
// artifact. Dry run unless KV_NAMES_APPLY=1.
import { mkdirSync, writeFileSync } from 'node:fs';

const TOKEN = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
const ACCOUNT = (process.env.CLOUDFLARE_ACCOUNT_ID || 'd5272033401c64f8cc6ce650a8321cb2').trim();
const NAMESPACE = '5c534450c0cf47fa9d50560f235c4630';
const TITLE = 'exclusive-tours-data';
const APPLY = process.env.KV_NAMES_APPLY === '1';
const OUT = 'kv-names';
const LOCALES = ['en', 'es', 'fr', 'de'];

if (!TOKEN) throw new Error('No CLOUDFLARE_API_TOKEN.');
const API = 'https://api.cloudflare.com/client/v4';
const cf = (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers || {}) } });
const valueUrl = (key) => `/accounts/${ACCOUNT}/storage/kv/namespaces/${NAMESPACE}/values/${encodeURIComponent(key)}`;
const read = async (key) => {
  const response = await cf(valueUrl(key));
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Reading ${key}: ${response.status} ${await response.text()}`);
  return response.json();
};

mkdirSync(OUT, { recursive: true });
const ns = await (await cf(`/accounts/${ACCOUNT}/storage/kv/namespaces/${NAMESPACE}`)).json();
if (!ns.success || ns.result?.title !== TITLE) throw new Error(`Namespace ${NAMESPACE} is not ${TITLE}`);

const brand = await read('brand');
const current = String((brand?.record ?? brand)?.brandName ?? '').trim();
if (!current) throw new Error('The brand record has no name.');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const written = new RegExp(`${esc(current)}|Exclusive Dominican Tours`, 'g');
console.log(`brand record names: ${current}`);

const map = (v, fn, path = []) =>
  typeof v === 'string'
    ? fn(v, path)
    : Array.isArray(v)
    ? v.map((x, i) => map(x, fn, [...path, i]))
    : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, map(x, fn, [...path, k])]))
    : v;
const sitePages = (rec) => map(rec, (t, path) => (path.includes('policies') ? t : t.replace(/\{\{\s*brand\s*\}\}/g, '{{name}}')));
const blog = (rec) => map(rec, (t) => t.replace(written, '{{name}}'));
const count = (rec, re) => (JSON.stringify(rec).match(re) ?? []).length;

let failures = 0;
for (const key of [...LOCALES.map((l) => `site-pages-${l}`), ...LOCALES.map((l) => `blog-${l}`)]) {
  const before = await read(key);
  if (before === undefined) {
    console.log(`${key}: not stored, skipped`);
    continue;
  }
  const after = key.startsWith('site-pages-') ? sitePages(before) : blog(before);
  writeFileSync(`${OUT}/${key}-before.json`, JSON.stringify(before, null, 2));
  writeFileSync(`${OUT}/${key}-after.json`, JSON.stringify(after, null, 2));
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  console.log(`${key}: {{brand}} ${count(after, /\{\{brand\}\}/g)}, {{name}} ${count(after, /\{\{name\}\}/g)}, written-out name left ${count(after, written)}${changed ? '' : ' (nothing to change)'}`);
  if (!changed || !APPLY) continue;
  const put = await cf(valueUrl(key), { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(after) });
  const body = await put.json().catch(() => ({}));
  if (!put.ok || body.success === false) {
    console.log(`  ✗ writing ${key}: ${put.status} ${JSON.stringify(body.errors ?? body)}`);
    failures += 1;
    continue;
  }
  const same = JSON.stringify(await read(key)) === JSON.stringify(after);
  console.log(`  written; read back identical: ${same}`);
  if (!same) failures += 1;
}
if (!APPLY) console.log('Dry run: nothing written.');
if (failures) throw new Error(`${failures} record(s) not written as intended.`);
