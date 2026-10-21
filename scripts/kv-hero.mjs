// Puts the AI-enhanced hero photographs (exclusive-dominican-tours,
// src/config/siteDefaults.ts) into Exclusive Dominican Tours' STORED brand
// record, so Admin → Look lists them and the home page no longer reaches them
// only as a fallback. Touches one key — `brand` in exclusive-tours-data — and
// only its heroMedia (plus the hero transition and seconds when unset).
// Everything else in the record is written back exactly as read.
//
// Refuses unless the namespace is exclusive-tours-data and the value is a
// brand record. Saves the record before and after as an artifact,
// so the old value can be put back. Dry run unless KV_HERO_APPLY=1.
import { mkdirSync, writeFileSync } from 'node:fs';

const TOKEN = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
const ACCOUNT = (process.env.CLOUDFLARE_ACCOUNT_ID || 'd5272033401c64f8cc6ce650a8321cb2').trim();
const NAMESPACE = '5c534450c0cf47fa9d50560f235c4630';
const TITLE = 'exclusive-tours-data';
const APPLY = process.env.KV_HERO_APPLY === '1';
const OUT = 'kv-hero';

const HERO = [
  { url: "/imgs/edt/banners/hero-palm-beach.webp", type: 'image', alt: "A palm leaning over the white sand of Saona Island" },
  { url: "/imgs/edt/banners/hero-zipline.webp", type: 'image', alt: "A zipline ride over the green hills behind Punta Cana" },
  { url: "/imgs/edt/banners/hero-saona-aerial.webp", type: 'image', alt: "Boats moored off a pink sandbank at Saona, from the air" },
  { url: "/imgs/edt/banners/hero-buggy.webp", type: 'image', alt: "A buggy splashing through the jungle at Scape Park" },
  { url: "/imgs/edt/banners/hero-cayo-levantado.webp", type: 'image', alt: "Cayo Levantado and its white beach in Samaná Bay, from the air" },
  { url: "/imgs/edt/banners/hero-dolphins.webp", type: 'image', alt: "Two dolphins leaping by the pier" },
  { url: "/imgs/edt/banners/hero-santo-domingo.webp", type: 'image', alt: "The Puerta de la Misericordia in Santo Domingo’s Colonial Zone" },
  { url: "/imgs/edt/banners/hero-catamaran.webp", type: 'image', alt: "Guests swimming beside a catamaran in turquoise water" },
  { url: "/imgs/edt/banners/hero-diving.webp", type: 'image', alt: "Divers over the reef at Isla Catalina" },
  { url: "/imgs/edt/banners/hero-whale.webp", type: 'image', alt: "A humpback whale breaching in Samaná Bay" },
  { url: "/imgs/edt/banners/hero-golden-hour.webp", type: 'image', alt: "Cayo Levantado in the golden light of late afternoon" },
];

if (!TOKEN) throw new Error('No CLOUDFLARE_API_TOKEN.');
const API = 'https://api.cloudflare.com/client/v4';
const cf = (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers || {}) } });
const valueUrl = `/accounts/${ACCOUNT}/storage/kv/namespaces/${NAMESPACE}/values/brand`;

mkdirSync(OUT, { recursive: true });

const ns = await (await cf(`/accounts/${ACCOUNT}/storage/kv/namespaces/${NAMESPACE}`)).json();
if (!ns.success || ns.result?.title !== TITLE) throw new Error(`Namespace ${NAMESPACE} is not ${TITLE}: ${JSON.stringify(ns.errors ?? ns.result?.title)}`);
console.log(`namespace ${NAMESPACE} = ${ns.result.title}`);

const read = async () => {
  const response = await cf(valueUrl);
  if (!response.ok) throw new Error(`Reading brand: ${response.status} ${await response.text()}`);
  return response.json();
};

const before = await read();
writeFileSync(`${OUT}/brand-before.json`, JSON.stringify(before, null, 2));
const record = before?.record ?? before;
// The namespace is what makes it this site's; the business may have been renamed
// in the admin (it is "MyN Excursiones" now), so only check it is a brand record.
if (!record || typeof record !== 'object' || typeof record.brandName !== 'string' || !('phoneNumber' in record)) {
  throw new Error(`Not a brand record: ${JSON.stringify(record).slice(0, 200)}`);
}
console.log(`brand record of ${record.brandName}; heroMedia now: ${JSON.stringify(record.heroMedia)}`);

const nextRecord = {
  ...record,
  heroMedia: HERO,
  heroTransition: record.heroTransition || 'kenburns',
  heroSeconds: Number(record.heroSeconds) >= 3 ? Number(record.heroSeconds) : 7,
};
const next = before?.record ? { ...before, record: nextRecord } : nextRecord;
writeFileSync(`${OUT}/brand-after.json`, JSON.stringify(next, null, 2));

if (!APPLY) {
  console.log('Dry run: nothing written. heroMedia would be', HERO.length, 'photographs.');
  process.exit(0);
}

const put = await cf(valueUrl, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(next) });
const putBody = await put.json().catch(() => ({}));
if (!put.ok || putBody.success === false) throw new Error(`Writing brand: ${put.status} ${JSON.stringify(putBody.errors ?? putBody)}`);

const after = await read();
const stored = (after?.record ?? after).heroMedia ?? [];
const same = JSON.stringify(after) === JSON.stringify(next);
console.log(`written; read back: ${stored.length} photographs, first ${stored[0]?.url}, record identical to what was sent: ${same}`);
if (!same) throw new Error('The record read back differs from what was written.');
