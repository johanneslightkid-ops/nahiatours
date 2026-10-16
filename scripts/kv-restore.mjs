/**
 * kv-restore.mjs — undo El Cortecito's writes into nahiatours-data, without
 * deleting anything.
 *
 * El Cortecito's Worker was bound to nahiatours-data by its Cloudflare git
 * build, so from about 13 October its admin read and wrote nahia.tours's data.
 * elcortecito-data still holds nahia's data as copied on 11 October.
 *
 * 1. elcortecito-data gets El Cortecito's own work back from nahiatours-data
 *    (German/French story, brand fields, the edits its admin made), so it
 *    shows the same as today once it reads its own namespace. Its reviews stay.
 * 2. nahiatours-data gets back what El Cortecito overwrote: the reviews it
 *    emptied, and the Spanish tour and story texts its "translate all" replaced
 *    with machine translations. Prices, the edited video block and every key
 *    El Cortecito added are kept.
 *
 * Dry run unless KV_RESTORE_APPLY=1. Never deletes a key. Prints titles and
 * field names, never review contents or emails.
 */
const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const APPLY = process.env.KV_RESTORE_APPLY === '1';
const NAHIA = 'b4e2637d5f45438aac8e504353a92a9f';
const ELCO = '5026f24391e24f13b76f5e4918d6d72d';
/** Blocks whose change in nahiatours-data is an edit by hand, not a translation. */
const KEEP_BLOCKS = new Set(['element-1014']);

const call = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers || {}) } });
  return r;
};
let account;
const kv = (ns) => `/accounts/${account}/storage/kv/namespaces/${ns}`;
const get = async (ns, key) => {
  const r = await call(`${kv(ns)}/values/${encodeURIComponent(key)}`);
  if (r.status === 404) return undefined;
  if (!r.ok) throw new Error(`read ${key}: HTTP ${r.status}`);
  return JSON.parse(await r.text());
};
const put = async (ns, key, value, label) => {
  console.log(`  ${APPLY ? 'WRITE' : 'would write'} ${label} ${key} (${JSON.stringify(value).length} bytes)`);
  if (!APPLY) return;
  const r = await call(`${kv(ns)}/values/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(value) });
  if (!r.ok) throw new Error(`write ${key}: HTTP ${r.status} ${await r.text()}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

if (!TOKEN) throw new Error('no CLOUDFLARE_API_TOKEN');
account = process.env.CLOUDFLARE_ACCOUNT_ID || (await (await call('/accounts?per_page=50')).json()).result[0].id;
console.log(APPLY ? '[kv-restore] APPLYING' : '[kv-restore] dry run — nothing is written');

const n = {}, e = {};
for (const key of ['brand', 'testimonials', 'tours-es', 'story-elements-en', 'story-elements-es', 'story-elements-de', 'story-elements-fr']) {
  n[key] = await get(NAHIA, key);
  e[key] = await get(ELCO, key);
}

// ── 1. elcortecito-data: El Cortecito's own work, back home ─────────────────
console.log('\nelcortecito-data');
for (const key of ['story-elements-de', 'story-elements-fr', 'story-elements-en', 'story-elements-es', 'tours-es']) {
  if (n[key] !== undefined && !same(n[key], e[key])) await put(ELCO, key, n[key], 'elcortecito-data');
}
const elcoBrand = { ...(e.brand || {}), ...(n.brand || {}) };
if (!same(elcoBrand, e.brand)) await put(ELCO, 'brand', elcoBrand, 'elcortecito-data');
console.log(`  reviews kept: ${e.testimonials?.testimonials?.length ?? 0}`);

// ── 2. nahiatours-data: what El Cortecito overwrote, back ───────────────────
console.log('\nnahiatours-data');
// Reviews: everything in either, by id. Nothing is removed.
const reviews = [...(n.testimonials?.testimonials || [])];
for (const t of e.testimonials?.testimonials || []) if (!reviews.some((r) => r.id === t.id)) reviews.push(t);
console.log(`  reviews: ${n.testimonials?.testimonials?.length ?? 0} now, ${reviews.length} after`);
if (reviews.length !== (n.testimonials?.testimonials?.length ?? 0)) {
  await put(NAHIA, 'testimonials', { ...(n.testimonials || {}), testimonials: reviews }, 'nahiatours-data');
}

// Spanish tours: the 11 October title and description, today's price and the rest.
if (Array.isArray(n['tours-es']) && Array.isArray(e['tours-es'])) {
  const tours = n['tours-es'].map((tour, i) => {
    const original = e['tours-es'][i];
    if (!original) return tour;
    const restored = { ...tour, title: original.title, description: original.description };
    if (!same(restored, tour)) console.log(`  tour ${i + 1}: "${tour.title}" → "${original.title}"`);
    return restored;
  });
  if (!same(tours, n['tours-es'])) await put(NAHIA, 'tours-es', tours, 'nahiatours-data');
}

// Spanish story: the 11 October wording, except blocks edited by hand.
const es = n['story-elements-es'], esOld = e['story-elements-es'];
if (es && esOld) {
  const byId = new Map(esOld.elements.map((b) => [b.id, b]));
  const elements = es.elements.map((block) => {
    const original = byId.get(block.id);
    if (!original || KEEP_BLOCKS.has(block.id)) return block;
    const content = { ...block.content };
    for (const field of ['title', 'text', 'description']) if (original.content?.[field] !== undefined) content[field] = original.content[field];
    if (!same(content, block.content)) console.log(`  story block ${block.id}: ${Object.keys(content).filter((f) => content[f] !== block.content[f]).join(', ')}`);
    return { ...block, content };
  });
  const story = { ...es, storyTitle: esOld.storyTitle ?? es.storyTitle, storyTagline: esOld.storyTagline ?? es.storyTagline, elements };
  if (!same(story, es)) await put(NAHIA, 'story-elements-es', story, 'nahiatours-data');
}
console.log('\nKept as they are in nahiatours-data: brand, story-elements-en, story-elements-de, story-elements-fr, prices.');
