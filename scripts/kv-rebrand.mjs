// Takes the old company name out of Exclusive Dominican Tours' STORED content
// (the owner is trading as a new brand now; the name in the brand record is
// the new one):
//
//   site-pages-<locale>  the name becomes {{brand}} and the old addresses
//                        {{email}}; the site fills both in from Admin › Marca
//                        as the page is read (exclusive-dominican-tours,
//                        src/edt/sitePages.ts). contact.email itself — the
//                        stored address — is left as it is.
//   blog-<locale>        the name becomes the brand record's name, written
//                        out: posts are edited by hand and read raw by
//                        crawlers.
//
// Every other character of each record is written back as read. Refuses
// unless the namespace is exclusive-tours-data and the brand record names a
// brand other than the old one. Saves each record before and after as an
// artifact, so any of them can be put back. Dry run unless KV_REBRAND_APPLY=1.
import { mkdirSync, writeFileSync } from 'node:fs';

const TOKEN = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
const ACCOUNT = (process.env.CLOUDFLARE_ACCOUNT_ID || 'd5272033401c64f8cc6ce650a8321cb2').trim();
const NAMESPACE = '5c534450c0cf47fa9d50560f235c4630';
const TITLE = 'exclusive-tours-data';
const APPLY = process.env.KV_REBRAND_APPLY === '1';
const OUT = 'kv-rebrand';
const LOCALES = ['en', 'es', 'fr', 'de'];

const OLD_NAME = /Exclusive Dominican Tours/g;
const OLD_EMAIL = /\b(?:info|booking)@exclusivedominicantours\.com\b/g;

const map = (value, fn, path = []) => {
  if (typeof value === 'string') return fn(value, path);
  if (Array.isArray(value)) return value.map((item, index) => map(item, fn, [...path, index]));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, map(item, fn, [...path, key])]));
  return value;
};
const rebrandSitePages = (record) =>
  map(record, (text, path) => (path.at(-1) === 'email' && path.at(-2) === 'contact' ? text : text.replace(OLD_NAME, '{{brand}}').replace(OLD_EMAIL, '{{email}}')));
const rebrandBlog = (record, name) => map(record, (text) => text.replace(OLD_NAME, name));
const count = (record) => {
  const text = JSON.stringify(record);
  return { name: (text.match(OLD_NAME) ?? []).length, email: (text.match(OLD_EMAIL) ?? []).length };
};

if (!TOKEN) throw new Error('No CLOUDFLARE_API_TOKEN.');
const API = 'https://api.cloudflare.com/client/v4';
const cf = (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers || {}) } });
const valueUrl = (key) => `/accounts/${ACCOUNT}/storage/kv/namespaces/${NAMESPACE}/values/${encodeURIComponent(key)}`;

mkdirSync(OUT, { recursive: true });

const ns = await (await cf(`/accounts/${ACCOUNT}/storage/kv/namespaces/${NAMESPACE}`)).json();
if (!ns.success || ns.result?.title !== TITLE) throw new Error(`Namespace ${NAMESPACE} is not ${TITLE}: ${JSON.stringify(ns.errors ?? ns.result?.title)}`);
console.log(`namespace ${NAMESPACE} = ${ns.result.title}`);

const read = async (key) => {
  const response = await cf(valueUrl(key));
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Reading ${key}: ${response.status} ${await response.text()}`);
  return response.json();
};

const brand = await read('brand');
const name = String((brand?.record ?? brand)?.brandName ?? '').trim();
if (!name || OLD_NAME.test(name)) throw new Error(`The brand record names "${name}"; refusing to write the old name back over itself.`);
OLD_NAME.lastIndex = 0;
console.log(`brand record names: ${name}`);

const keys = [...LOCALES.map((locale) => `site-pages-${locale}`), ...LOCALES.map((locale) => `blog-${locale}`)];
let failures = 0;
for (const key of keys) {
  const before = await read(key);
  if (before === undefined) {
    console.log(`${key}: not stored, skipped`);
    continue;
  }
  const after = key.startsWith('site-pages-') ? rebrandSitePages(before) : rebrandBlog(before, name);
  writeFileSync(`${OUT}/${key}-before.json`, JSON.stringify(before, null, 2));
  writeFileSync(`${OUT}/${key}-after.json`, JSON.stringify(after, null, 2));
  const was = count(before);
  const now = count(after);
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  console.log(`${key}: name ${was.name} → ${now.name}, old address ${was.email} → ${now.email}${changed ? '' : ' (nothing to change)'}`);
  if (!changed || !APPLY) continue;
  const put = await cf(valueUrl(key), { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(after) });
  const putBody = await put.json().catch(() => ({}));
  if (!put.ok || putBody.success === false) {
    console.log(`  ✗ writing ${key}: ${put.status} ${JSON.stringify(putBody.errors ?? putBody)}`);
    failures += 1;
    continue;
  }
  const stored = await read(key);
  const same = JSON.stringify(stored) === JSON.stringify(after);
  console.log(`  written; read back identical: ${same}`);
  if (!same) failures += 1;
}
if (!APPLY) console.log('Dry run: nothing written.');
if (failures) throw new Error(`${failures} record(s) not written as intended.`);
