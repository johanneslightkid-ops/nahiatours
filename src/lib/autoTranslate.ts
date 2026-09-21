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
  'href',
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

export type Lang = 'en' | 'es';

const LANGUAGE = {
  en: 'English',
  es: 'Latin American Spanish, as spoken in the Dominican Republic',
};

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
      'Preserve any Markdown formatting. Preserve the ⏎ marks, which stand for line breaks.',
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
