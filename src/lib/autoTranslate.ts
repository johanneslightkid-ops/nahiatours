import { apiPost } from '../services/apiClient';

/**
 * Translate what was just edited into the other language.
 *
 * Every piece of content on these sites is kept twice, once per language, and
 * the second copy is the one that rots: a price gets corrected in Spanish, the
 * English still says last season's, and nobody notices because nobody in the
 * office reads the site in English. The fix is not discipline, it is not
 * having to remember — so the editors can hand what they just saved to the
 * provider that is already configured for the blog writer and get the other
 * language filled in.
 *
 * TWO RULES THIS IS BUILT AROUND.
 *
 *   1. IT TRANSLATES VALUES, NOT STRUCTURE. The payload is walked, the strings
 *      are pulled out into a numbered list, the list comes back translated and
 *      is put back in the same places. The model never sees the JSON and so
 *      can never reshape it — no renamed keys, no dropped fields, no array
 *      that came back an object.
 *   2. IT NEVER TOUCHES WHAT IS NOT PROSE. Ids, slugs, URLs, image paths,
 *      currency codes, hex colours, dates and numbers-as-strings are left
 *      exactly as they are. Translating an id is how a tour loses its photos.
 */

/** Keys whose values are machinery, whatever they look like. */
const NEVER_TRANSLATE = new Set([
  'id',
  'slug',
  'key',
  'code',
  'icon',
  'image',
  'imageUrl',
  'images',
  'thumbnail',
  'video',
  'videoUrl',
  'url',
  'href',
  'link',
  'currency',
  'color',
  'colour',
  'type',
  'variant',
  'locale',
  'lang',
  'createdAt',
  'updatedAt',
  'date',
  'price',
  'rating',
  'order',
  'position',
  'email',
  'phone',
  'whatsapp',
  'tier',
  'role',
  'localPath',
  'language',
  'name', // a reviewer's name
  'profileImage',
  'emoji',
  'videoSource',
  'videoOrientation',
]);

/** A value that is prose rather than a token. */
const isProse = (value: string): boolean => {
  const v = value.trim();
  if (v.length < 2) return false;
  if (/^https?:\/\//i.test(v)) return false;
  if (/^[#/.]/.test(v)) return false; // hex colour, path, relative url
  if (/^[\w-]+\.(jpg|jpeg|png|webp|svg|gif|mp4|webm)$/i.test(v)) return false;
  if (/^-?\d+([.,]\d+)?$/.test(v)) return false; // a number in a string
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return false; // an ISO date
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/i.test(v) && !v.includes(' ')) return false; // a slug
  return /[a-záéíóúñü]/i.test(v);
};

interface Slot {
  set: (value: string) => void;
  text: string;
}

/** Walk any JSON shape and collect every translatable string with a way back. */
const collect = (node: any, slots: Slot[], key?: string): void => {
  if (typeof node === 'string') return; // handled by the parent, which can write back
  if (Array.isArray(node)) {
    node.forEach((child, i) => {
      if (typeof child === 'string') {
        if (isProse(child) && !(key && NEVER_TRANSLATE.has(key))) {
          slots.push({ text: child, set: (v) => (node[i] = v) });
        }
      } else {
        collect(child, slots, key);
      }
    });
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, child] of Object.entries(node)) {
      if (NEVER_TRANSLATE.has(k)) continue;
      if (typeof child === 'string') {
        if (isProse(child)) slots.push({ text: child, set: (v) => (node[k] = v) });
      } else {
        collect(child, slots, k);
      }
    }
  }
};

export type Lang = 'en' | 'es' | 'de' | 'fr';

export const LANG_NAME: Record<Lang, string> = {
  en: 'English',
  es: 'Spanish (Latin American, Dominican Republic)',
  de: 'German',
  fr: 'French',
};

const LANGUAGE = LANG_NAME;

/**
 * All other languages that should receive a translation — of the languages
 * this site actually offers, so a two-language site does not pay for German
 * and French copies nobody can switch to.
 */
export const getTargetLanguages = (from: Lang, available: readonly string[] = ['en', 'es', 'de', 'fr']): Lang[] =>
  (['en', 'es', 'de', 'fr'] as Lang[]).filter((l) => l !== from && available.includes(l));

/**
 * Batched, because one call per string is both slow and expensive — and
 * because a model translating a whole screen at once keeps the terminology
 * consistent across it, which one-at-a-time does not.
 */
const BATCH = 40;

const translateBatch = async (lines: string[], from: Lang, to: Lang): Promise<string[]> => {
  const numbered = lines.map((line, i) => `${i + 1}. ${line.replace(/\n/g, ' ⏎ ')}`).join('\n');
  const data = await apiPost<{ ok: boolean; text?: string; error?: string }>('ai', {
    system:
      `You are a translator for a Caribbean tour operator's website. Translate from ${LANGUAGE[from]} ` +
      `into ${LANGUAGE[to]}. Keep the tone, keep it natural, and keep it short — this is website copy, ` +
      'not literature. Leave brand names, place names and prices exactly as they are. ' +
      'Preserve any Markdown formatting. Preserve the ⏎ marks, which stand for line breaks, and ' +
      'keep anything in {curly braces} exactly as written — those are placeholders.',
    prompt:
      'Translate each numbered line. Reply with the same numbers, one line each, and nothing else — ' +
      'no preamble, no commentary, no blank lines.\n\n' +
      numbered,
    maxTokens: 4000,
    temperature: 0.2,
  });
  if (!data?.ok || !data.text) {
    throw new Error(data?.error || 'The AI provider returned nothing.');
  }

  // Put them back by number, not by order. A model that drops or merges a line
  // would otherwise shift every translation after it onto the wrong field,
  // which is far worse than leaving one untranslated.
  const out = [...lines];
  for (const line of data.text.split('\n')) {
    const m = /^\s*(\d+)[.)]\s*(.+)$/.exec(line);
    if (!m) continue;
    const index = Number(m[1]) - 1;
    if (index >= 0 && index < out.length) out[index] = m[2].trim().replace(/ ⏎ /g, '\n');
  }
  return out;
};

export interface TranslateResult<T> {
  value: T;
  translated: number;
  total: number;
}

/**
 * Translate a whole record in place, returning a copy.
 *
 * `onProgress` is called per batch, because a page of tours is a slow enough
 * job that a button which only says "working" looks broken.
 */
export const translateRecord = async <T,>(
  record: T,
  from: Lang,
  to: Lang,
  onProgress?: (done: number, total: number) => void
): Promise<TranslateResult<T>> => {
  const copy: T = JSON.parse(JSON.stringify(record));
  const slots: Slot[] = [];
  collect(copy, slots);

  if (slots.length === 0) return { value: copy, translated: 0, total: 0 };

  let done = 0;
  for (let i = 0; i < slots.length; i += BATCH) {
    const chunk = slots.slice(i, i + BATCH);
    const translated = await translateBatch(chunk.map((s) => s.text), from, to);
    chunk.forEach((slot, j) => slot.set(translated[j]));
    done += chunk.length;
    onProgress?.(done, slots.length);
  }

  return { value: copy, translated: done, total: slots.length };
};

/*
 * TRANSLATING ONLY WHAT CHANGED.
 *
 * The strips above used to translate a whole screen — every tour, every
 * review — into every language, each time. That re-bought translations
 * nobody needed, and it overwrote whatever had been corrected by hand in the
 * other languages. Saving now hands over only what the save changed, one
 * record at a time: a tour whose text was edited is translated whole into the
 * other languages; a tour whose price or photo changed has that carried over
 * without asking the AI; every other tour in the other languages is left
 * exactly as it is.
 */

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value ?? null));

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Every translatable string in a record, in the order it is walked. */
export const proseOf = (record: unknown): string[] => {
  if (typeof record === 'string') return isProse(record) ? [record] : [];
  const slots: Slot[] = [];
  collect(clone(record), slots);
  return slots.map((slot) => slot.text);
};

/** Same text in both — for two languages' copies, it means one was never translated. */
export const sameProse = (a: unknown, b: unknown): boolean => sameJson(proseOf(a), proseOf(b));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Apply what changed between `prev` and `next` to `existing`, and keep
 * everything else of `existing` — its prose, and anything it holds that is
 * its own (a slug in its language, say).
 */
const applyChange = (prev: unknown, next: unknown, existing: unknown): unknown => {
  if (sameJson(prev, next)) return clone(existing === undefined ? next : existing);
  if (isPlainObject(prev) && isPlainObject(next) && isPlainObject(existing)) {
    const out: Record<string, unknown> = { ...clone(existing) };
    for (const key of new Set([...Object.keys(prev), ...Object.keys(next)])) {
      if (!(key in next)) delete out[key];
      else out[key] = applyChange(prev[key], next[key], existing[key]);
    }
    return out;
  }
  if (
    Array.isArray(prev) &&
    Array.isArray(next) &&
    Array.isArray(existing) &&
    prev.length === next.length &&
    next.length === existing.length
  ) {
    return next.map((item, i) => applyChange(prev[i], item, existing[i]));
  }
  return clone(next);
};

export interface RecordSync<T> {
  value: T;
  /** Whether the AI was asked; false when only non-text fields were carried over. */
  translated: boolean;
}

/**
 * Bring one record of another language up to date with an edit.
 *
 * `prev` is the record as it was before the edit, `next` as it was saved and
 * `existing` the other language's copy, if it has one. When the edit changed
 * no text, the change is carried into `existing` and nothing is translated.
 * When it changed any text, the whole record is translated — a tour whose
 * title changed gets its description translated with it, so the two read as
 * one piece.
 */
export const syncRecord = async <T,>(
  prev: T | undefined,
  next: T,
  existing: T | undefined,
  from: Lang,
  to: Lang,
  onProgress?: (done: number, total: number) => void
): Promise<RecordSync<T>> => {
  if (existing !== undefined && prev !== undefined) {
    // Same text as before the edit, and the other language really holds a
    // translation (not a copy of the original): carry the change, keep theirs.
    const neverTranslated = proseOf(existing).length > 0 && sameProse(existing, prev);
    if (sameProse(prev, next) && !neverTranslated) {
      const merged = applyChange(prev, next, existing) as T;
      const theirs = new Set(proseOf(existing));
      if (proseOf(merged).every((text) => theirs.has(text))) return { value: merged, translated: false };
    }
  }
  if (proseOf(next).length === 0) {
    const value = (existing !== undefined && prev !== undefined ? applyChange(prev, next, existing) : clone(next)) as T;
    return { value, translated: false };
  }
  const result = await translateRecord(next, from, to, onProgress);
  return { value: result.value, translated: true };
};

export interface ListSyncOptions<T> {
  /** Who an item is between the list as loaded and as saved — an id, usually. */
  keyOf: (item: T) => string;
  /**
   * How the same item is found in another language's list: by its key, or by
   * its place in the list (tours, whose languages are paired by position).
   */
  match: 'key' | 'position';
  /**
   * With `match: 'key'`: when the other language has nothing under that key,
   * take the item at the same place, if that one belongs to no item here.
   * For lists whose languages were written apart and given different ids.
   */
  positionalFallback?: boolean;
  /** Told "3/16" as each item is worked on, for the strip. */
  onProgress?: (line: string) => void;
}

export interface ListSyncResult<T> {
  list: T[];
  /** Items the AI translated. */
  translated: number;
  /** Items updated without translating — a price, a photo, an approval. */
  carried: number;
  removed: number;
  /** Whether anything about the other language's list changed. */
  changed: boolean;
}

const kindOf = (item: unknown): unknown => (isPlainObject(item) ? item.type : undefined);

const makeFinder = <T,>(opts: ListSyncOptions<T>, ownKeys: Set<string>) => (
  list: T[],
  item: T,
  index: number,
  allowPositional = true
): number => {
  if (opts.match === 'position') return index < list.length ? index : -1;
  const key = opts.keyOf(item);
  const at = list.findIndex((candidate) => opts.keyOf(candidate) === key);
  if (at !== -1 || !opts.positionalFallback || !allowPositional) return at;
  const candidate = list[index];
  return candidate !== undefined && !ownKeys.has(opts.keyOf(candidate)) && kindOf(candidate) === kindOf(item)
    ? index
    : -1;
};

/** Where to put an item the other language does not have: after its neighbour. */
const insertionPoint = <T,>(
  list: T[],
  source: T[],
  index: number,
  find: (list: T[], item: T, index: number, allowPositional?: boolean) => number,
  opts: ListSyncOptions<T>
): number => {
  if (opts.match === 'position') return Math.min(index, list.length);
  if (index === 0) return 0;
  const before = find(list, source[index - 1], index - 1);
  return before === -1 ? Math.min(index, list.length) : before + 1;
};

/**
 * Bring another language's copy of a list up to date with one save.
 *
 * Only the items the save touched are looked at: edited ones are synced as
 * {@link syncRecord} describes, new ones are translated and put in at the same
 * place, deleted ones are deleted there too. Everything else in `target` is
 * returned untouched — however old, however hand-corrected.
 */
export const syncList = async <T,>(
  target: T[],
  before: T[],
  after: T[],
  from: Lang,
  to: Lang,
  opts: ListSyncOptions<T>
): Promise<ListSyncResult<T>> => {
  const ownKeys = new Set([...before, ...after].map(opts.keyOf));
  const find = makeFinder(opts, ownKeys);
  const beforeByKey = new Map(before.map((item) => [opts.keyOf(item), item]));
  const afterKeys = new Set(after.map(opts.keyOf));
  const list = [...target];
  const result: ListSyncResult<T> = { list, translated: 0, carried: 0, removed: 0, changed: false };

  // Deletions first, from the end, so positions still mean what they meant.
  const removals = before
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !afterKeys.has(opts.keyOf(item)))
    .reverse();
  for (const { item, index } of removals) {
    // By position, only when the lists line up — otherwise there is no telling
    // which of theirs is this one, and deleting the wrong tour is worse.
    const aligned = target.length === before.length;
    if (opts.match === 'position' && !aligned) continue;
    const at = find(list, item, index, aligned);
    if (at === -1) continue;
    list.splice(at, 1);
    result.removed += 1;
  }

  for (let index = 0; index < after.length; index++) {
    const item = after[index];
    const prev = beforeByKey.get(opts.keyOf(item));
    if (prev !== undefined && sameJson(prev, item)) continue;

    // A list by position cannot have holes: anything missing before this one
    // is translated too, or this one would land in somebody else's place.
    if (opts.match === 'position') {
      while (list.length < index) {
        const missing = after[list.length];
        opts.onProgress?.(`${list.length + 1}/${after.length}`);
        list.push((await translateRecord(missing, from, to)).value);
        result.translated += 1;
      }
    }

    const at = prev === undefined ? -1 : find(list, item, index);
    opts.onProgress?.(`${index + 1}/${after.length}`);
    if (at === -1) {
      const value = (await translateRecord(item, from, to)).value;
      list.splice(insertionPoint(list, after, index, find, opts), 0, value);
      result.translated += proseOf(item).length ? 1 : 0;
      continue;
    }
    const synced = await syncRecord(prev, item, list[at], from, to);
    list[at] = synced.value;
    if (synced.translated) result.translated += 1;
    else result.carried += 1;
  }

  // A new order is carried over for the items both languages share; items only
  // the other language has stay where they are.
  if (opts.match === 'key') {
    const order = new Map(after.map((item, i) => [opts.keyOf(item), i]));
    const slots = list.map((item, i) => (order.has(opts.keyOf(item)) ? i : -1)).filter((i) => i !== -1);
    const sorted = slots.map((i) => list[i]).sort((a, b) => order.get(opts.keyOf(a))! - order.get(opts.keyOf(b))!);
    slots.forEach((slot, i) => (list[slot] = sorted[i]));
  }

  result.changed = !sameJson(list, target);
  return result;
};

/**
 * Translate only what another language is missing: items it has no copy of,
 * or whose copy is still word for word the original. Nothing it already has
 * in its own words is touched.
 */
export const fillMissingList = async <T,>(
  target: T[],
  source: T[],
  from: Lang,
  to: Lang,
  opts: ListSyncOptions<T>
): Promise<ListSyncResult<T>> => {
  const ownKeys = new Set(source.map(opts.keyOf));
  const find = makeFinder(opts, ownKeys);
  const list = [...target];
  const result: ListSyncResult<T> = { list, translated: 0, carried: 0, removed: 0, changed: false };

  for (let index = 0; index < source.length; index++) {
    const item = source[index];
    if (proseOf(item).length === 0) continue;
    const at = find(list, item, index);
    if (at !== -1 && !sameProse(list[at], item)) continue;
    opts.onProgress?.(`${index + 1}/${source.length}`);
    const value = (await translateRecord(item, from, to)).value;
    if (at !== -1) list[at] = value;
    else list.splice(insertionPoint(list, source, index, find, opts), 0, value);
    result.translated += 1;
  }

  result.changed = result.translated > 0;
  return result;
};

/** "2 traducidas · 1 actualizada" — what a sync did, for the strip. */
export const describeSync = (result: Pick<ListSyncResult<unknown>, 'translated' | 'carried' | 'removed'>): string | null => {
  const parts: string[] = [];
  if (result.translated) parts.push(`${result.translated} traducido(s)`);
  if (result.carried) parts.push(`${result.carried} actualizado(s) sin traducir`);
  if (result.removed) parts.push(`${result.removed} eliminado(s)`);
  return parts.length ? parts.join(', ') : null;
};
