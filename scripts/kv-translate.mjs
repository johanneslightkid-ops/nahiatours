/**
 * kv-translate.mjs — give each site German and French content in its own KV.
 *
 * For every site namespace and every localized content resource, a missing
 * `<resource>-fr` / `<resource>-de` is created by translating that site's own
 * copy of the resource:
 *
 *   1. its stored English record, if it has one;
 *   2. else its stored Spanish record (the one an operator maintains);
 *   3. else the English JSON bundled with that site's branch.
 *
 * Nothing that exists is ever overwritten, and nothing is deleted: a key is
 * checked again immediately before it is written. Prices, ids, image paths and
 * the like are carried over untranslated (the same rules as the admin's own
 * translator, src/lib/autoTranslate.ts).
 *
 * Translation runs on Workers AI through a deployed site's /api/ai with the
 * `cloudflare` provider, so it uses the account's own binding and no key.
 *
 * Dry run unless KV_TRANSLATE_APPLY=1. Writes a report to kv-translate/.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const APPLY = process.env.KV_TRANSLATE_APPLY === '1';
const AI_URL = process.env.AI_URL || 'https://elcortecito.johannes-neugschwentner.workers.dev/api/ai';
const AI_PASSWORD = process.env.AI_PASSWORD || 'admin';
const ONLY = (process.env.KV_TRANSLATE_SITES || '').split(',').map((s) => s.trim()).filter(Boolean);

const SITES = [
  { site: 'nahiatours', branch: 'main', ns: 'b4e2637d5f45438aac8e504353a92a9f' },
  { site: 'beautifull', branch: 'beautiful-tours', ns: 'b866189176fb46188c10240cdce3bf9d' },
  { site: 'transporturist', branch: 'transporturist', ns: '9f66ad41f7c0469fb1178d3de75b0e68' },
  { site: 'ldvip', branch: 'ldvip', ns: '39da5ca1858a4251a3130eaf7b8f2172' },
  { site: 'amigotours', branch: 'amigotours', ns: '03cc4cd848174de1bfdbd8009b9a3cc0' },
  { site: 'bavarotours', branch: 'bavaro-tours', ns: '341c4ac0817a40bbb87c94dcb1525114' },
];

/** Content that is read per language. Site texts only when a site stored its own. */
const RESOURCES = ['tours', 'transport-services', 'example-tours', 'blog', 'story-elements', 'intro-story', 'story-nodes', 'translations'];
const STORED_ONLY = new Set(['translations']);
const TARGETS = ['fr', 'de'];
const LANG_NAME = { en: 'English', es: 'Spanish (Latin American, Dominican Republic)', fr: 'French', de: 'German' };

// ── Same rules as src/lib/autoTranslate.ts ───────────────────────────────────
const NEVER_TRANSLATE = new Set(['id', 'slug', 'key', 'code', 'icon', 'image', 'imageUrl', 'images', 'thumbnail', 'video', 'videoUrl', 'url', 'href', 'link', 'currency', 'color', 'colour', 'type', 'variant', 'locale', 'lang', 'createdAt', 'updatedAt', 'date', 'price', 'rating', 'order', 'position', 'email', 'phone', 'whatsapp', 'tier', 'role', 'localPath', 'language', 'name', 'profileImage', 'emoji', 'videoSource', 'videoOrientation', 'target']);
const isProse = (value) => {
  const v = value.trim();
  if (v.length < 2) return false;
  if (/^https?:\/\//i.test(v)) return false;
  if (/^[#/.]/.test(v)) return false;
  if (/^[\w-]+\.(jpg|jpeg|png|webp|svg|gif|mp4|webm)$/i.test(v)) return false;
  if (/^-?\d+([.,]\d+)?$/.test(v)) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return false;
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/i.test(v) && !v.includes(' ')) return false;
  return /[a-záéíóúñü]/i.test(v);
};
const collect = (node, slots, key) => {
  if (typeof node === 'string') return;
  if (Array.isArray(node)) {
    node.forEach((child, i) => {
      if (typeof child === 'string') {
        if (isProse(child) && !(key && NEVER_TRANSLATE.has(key))) slots.push({ text: child, set: (v) => (node[i] = v) });
      } else collect(child, slots, key);
    });
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, child] of Object.entries(node)) {
      if (NEVER_TRANSLATE.has(k)) continue;
      if (typeof child === 'string') {
        if (isProse(child)) slots.push({ text: child, set: (v) => (node[k] = v) });
      } else collect(child, slots, k);
    }
  }
};

// ── Cloudflare KV ────────────────────────────────────────────────────────────
let account;
const cf = (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers || {}) } });
const kvGet = async (ns, key) => {
  const r = await cf(`/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(key)}`);
  if (r.status === 404) return undefined;
  if (!r.ok) throw new Error(`read ${key}: HTTP ${r.status}`);
  return JSON.parse(await r.text());
};
const kvKeys = async (ns) => {
  const body = await (await cf(`/accounts/${account}/storage/kv/namespaces/${ns}/keys?limit=1000`)).json();
  if (!body.success) throw new Error(JSON.stringify(body.errors));
  return new Set(body.result.map((k) => k.name));
};
const kvPut = async (ns, key, value) => {
  const r = await cf(`/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(value) });
  if (!r.ok) throw new Error(`write ${key}: HTTP ${r.status} ${await r.text()}`);
};

const bundled = (branch, file) => {
  try {
    return JSON.parse(execFileSync('git', ['show', `origin/${branch}:public/data/${file}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch {
    return undefined;
  }
};

// ── Translation ──────────────────────────────────────────────────────────────
const memory = new Map(); // `${from}>${to}\u0000${text}` → translation
let calls = 0;
const callAi = async (system, prompt, maxTokens) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      calls += 1;
      const r = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': AI_PASSWORD },
        // The 70b model, whatever the site saved: an 8b translation reads like one.
        body: JSON.stringify({
          provider: 'cloudflare',
          settings: { cloudflare: { selectedModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' } },
          system,
          prompt,
          maxTokens,
          temperature: 0.2,
        }),
      });
      const data = await r.json().catch(() => null);
      if (data?.ok && data.text) return data.text;
      throw new Error(data?.error || `HTTP ${r.status}`);
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((res) => setTimeout(res, 2000 * attempt));
    }
  }
  return '';
};

const translateLines = async (lines, from, to) => {
  const system =
    `You are a translator for a Caribbean tour operator's website. Translate from ${LANG_NAME[from]} into ${LANG_NAME[to]}. ` +
    'Keep the tone, keep it natural — this is website copy. Leave brand names, place names and prices exactly as they are. ' +
    'Preserve any Markdown formatting. Preserve the ⏎ marks, which stand for line breaks, and keep anything in {curly braces} ' +
    'or {{double braces}} and any [[IMAGE-n]] marker exactly as written.';
  const numbered = lines.map((line, i) => `${i + 1}. ${line.replace(/\n/g, ' ⏎ ')}`).join('\n');
  const chars = numbered.length;
  const text = await callAi(
    system,
    'Translate each numbered line. Reply with the same numbers, one line each, and nothing else — no preamble, no commentary, no blank lines.\n\n' + numbered,
    Math.min(8000, Math.max(1500, Math.ceil(chars / 2)))
  );
  const out = new Array(lines.length).fill(null);
  for (const row of text.split('\n')) {
    const m = /^\s*(\d+)[.)]\s*(.+)$/.exec(row);
    if (!m) continue;
    const i = Number(m[1]) - 1;
    if (i >= 0 && i < out.length) out[i] = m[2].trim().replace(/\s*⏎\s*/g, '\n');
  }
  return out;
};

/** Batches of ~4k characters, a long article on its own; four at a time. */
const translateAll = async (texts, from, to) => {
  const todo = [...new Set(texts)].filter((t) => !memory.has(`${from}>${to}\u0000${t}`));
  const batches = [];
  let batch = [];
  let size = 0;
  for (const t of todo) {
    if (batch.length && (size + t.length > 4000 || batch.length >= 25)) {
      batches.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(t);
    size += t.length;
  }
  if (batch.length) batches.push(batch);
  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const mine = batches[next++];
      try {
        const result = await translateLines(mine, from, to);
        mine.forEach((t, i) => {
          if (result[i]) memory.set(`${from}>${to}\u0000${t}`, result[i]);
        });
      } catch (error) {
        console.log(`    a batch failed (${String(error?.message || error).slice(0, 120)}); its strings stay untranslated`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return texts.map((t) => memory.get(`${from}>${to}\u0000${t}`) ?? null);
};

const translateRecord = async (record, from, to) => {
  const copy = JSON.parse(JSON.stringify(record));
  const slots = [];
  collect(copy, slots);
  const result = await translateAll(slots.map((s) => s.text), from, to);
  let missed = 0;
  slots.forEach((slot, i) => {
    if (result[i]) slot.set(result[i]);
    else missed += 1;
  });
  return { value: copy, total: slots.length, missed };
};

// ── Repair: strings that came back identical to their source ──────────────────
/** A long text, translated a paragraph at a time. */
const translateLong = async (text, from, to) => {
  const parts = text.split(/(\n{2,})/);
  const prose = parts.filter((p, i) => i % 2 === 0 && isProse(p));
  const done = await translateAll(prose, from, to);
  const map = new Map(prose.map((p, i) => [p, done[i]]));
  return parts.map((p, i) => (i % 2 === 0 && map.get(p)) || p).join('');
};

const repair = async (s, keys) => {
  for (const resource of RESOURCES) {
    for (const to of TARGETS) {
      const key = `${resource}-${to}`;
      // Only what this script created; nahia.tours' story was translated by hand.
      if (!keys.has(key) || (s.site === 'nahiatours' && resource === 'story-elements')) continue;
      let source;
      let from;
      if (keys.has(`${resource}-en`)) [source, from] = [await kvGet(s.ns, `${resource}-en`), 'en'];
      else if (keys.has(`${resource}-es`)) [source, from] = [await kvGet(s.ns, `${resource}-es`), 'es'];
      else if (!STORED_ONLY.has(resource)) [source, from] = [bundled(s.branch, `${resource}-en.json`), 'en'];
      if (!source) continue;
      const target = await kvGet(s.ns, key);
      const a = [];
      const b = [];
      collect(JSON.parse(JSON.stringify(source)), a);
      collect(target, b);
      if (a.length !== b.length) {
        console.log(`  ${key}: shapes differ (${a.length}/${b.length}) — left alone`);
        continue;
      }
      let fixed = 0;
      for (let i = 0; i < b.length; i += 1) {
        if (b[i].text === a[i].text && b[i].text.length > 40) {
          const t = await translateLong(a[i].text, from, to);
          if (t && t !== a[i].text) {
            b[i].set(t);
            fixed += 1;
          }
        }
      }
      if (fixed) {
        if (APPLY) await kvPut(s.ns, key, target);
        console.log(`  ${key}: ${APPLY ? 'repaired' : 'would repair'} ${fixed} untranslated string(s)`);
      }
    }
  }
};

// ── Fix: one field, by path, e.g. "bavarotours:tours:0.description" ─────────
const fixField = async (spec) => {
  const [site, resource, path] = spec.split(':');
  const s = SITES.find((x) => x.site === site);
  const keys = await kvKeys(s.ns);
  const from = keys.has(`${resource}-en`) ? 'en' : 'es';
  const source = await kvGet(s.ns, `${resource}-${from}`);
  const get = (obj) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const text = get(source);
  for (const to of TARGETS) {
    const key = `${resource}-${to}`;
    const target = await kvGet(s.ns, key);
    if (!target || typeof text !== 'string') continue;
    const translated = await translateLong(text, from, to);
    const parts = path.split('.');
    const parent = parts.slice(0, -1).reduce((o, k) => o[k], target);
    console.log(`  ${site} ${key} ${path}: ${translated.slice(0, 80).replace(/\n/g, ' ')}…`);
    if (translated && translated !== text) {
      parent[parts[parts.length - 1]] = translated;
      if (APPLY) await kvPut(s.ns, key, target);
    }
  }
};

// ── Run ──────────────────────────────────────────────────────────────────────
if (!TOKEN) throw new Error('no CLOUDFLARE_API_TOKEN');
account = process.env.CLOUDFLARE_ACCOUNT_ID || (await (await cf('/accounts?per_page=50')).json()).result[0].id;
console.log(APPLY ? '[kv-translate] APPLYING' : '[kv-translate] dry run — nothing is written, nothing is translated');
mkdirSync('kv-translate', { recursive: true });
const report = [];
if (process.env.KV_TRANSLATE_FIX) {
  for (const spec of process.env.KV_TRANSLATE_FIX.split(',')) await fixField(spec.trim());
  process.exit(0);
}

for (const s of SITES) {
  if (ONLY.length && !ONLY.includes(s.site)) continue;
  const keys = await kvKeys(s.ns);
  console.log(`\n## ${s.site} (${s.ns}) — ${keys.size} key(s) before`);
  if (process.env.KV_TRANSLATE_REPAIR === '1') {
    await repair(s, keys);
    continue;
  }
  for (const resource of RESOURCES) {
    const missing = TARGETS.filter((l) => !keys.has(`${resource}-${l}`));
    if (!missing.length) {
      console.log(`  ${resource}: fr and de already stored — left alone`);
      continue;
    }
    let source;
    let from;
    let origin;
    if (keys.has(`${resource}-en`)) [source, from, origin] = [await kvGet(s.ns, `${resource}-en`), 'en', 'stored en'];
    else if (keys.has(`${resource}-es`)) [source, from, origin] = [await kvGet(s.ns, `${resource}-es`), 'es', 'stored es'];
    else if (!STORED_ONLY.has(resource)) [source, from, origin] = [bundled(s.branch, `${resource}-en.json`), 'en', `bundled en (${s.branch})`];
    if (source === undefined || source === null) {
      console.log(`  ${resource}: no source — skipped`);
      continue;
    }
    const slots = [];
    collect(JSON.parse(JSON.stringify(source)), slots);
    for (const to of missing) {
      const key = `${resource}-${to}`;
      if (!APPLY) {
        console.log(`  ${key}: would create from ${origin} (${slots.length} strings)`);
        report.push({ site: s.site, key, origin, strings: slots.length, written: false });
        continue;
      }
      const { value, total, missed } = await translateRecord(source, from, to);
      if (total > 0 && missed / total > 0.2) {
        console.log(`  ${key}: NOT written — ${missed}/${total} strings came back untranslated`);
        report.push({ site: s.site, key, origin, strings: total, missed, written: false });
        continue;
      }
      // Checked again right before writing: never overwrite.
      if ((await kvGet(s.ns, key)) !== undefined) {
        console.log(`  ${key}: appeared meanwhile — left alone`);
        continue;
      }
      await kvPut(s.ns, key, value);
      writeFileSync(`kv-translate/${s.site}__${key}.json`, JSON.stringify(value, null, 2));
      console.log(`  ${key}: WRITTEN from ${origin} (${total - missed}/${total} strings translated)`);
      report.push({ site: s.site, key, origin, strings: total, missed, written: true });
    }
  }
  const after = await kvKeys(s.ns);
  const removed = [...keys].filter((k) => !after.has(k));
  console.log(`  ${after.size} key(s) after; removed: ${removed.length ? removed.join(', ') : 'none'}`);
}
writeFileSync('kv-translate/report.json', JSON.stringify({ apply: APPLY, aiCalls: calls, report }, null, 2));
console.log(`\n[kv-translate] AI calls: ${calls}`);
