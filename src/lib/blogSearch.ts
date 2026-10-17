/**
 * Client-side blog search: fuzzy, typo-tolerant, accent-blind, no backend.
 *
 * A site has a few dozen articles per language, a few thousand words each —
 * small enough to index in the browser the moment the list arrives and search
 * on every keystroke. Every field is reduced to a set of normalised words;
 * a query word matches a field word exactly, as a prefix, inside it, or within
 * one or two typos, and the field's weight decides how much that is worth.
 * All query words must match somewhere (AND), so adding a word narrows.
 */

export interface SearchableArticle {
  slug: string;
  title: string;
  tour?: string;
  caption?: string;
  prelude?: string;
  post?: string;
  tags?: string[];
}

interface Field {
  weight: number;
  words: string[];
  /** The same words folded by sound, computed once with the index. */
  folded: string[];
}

interface Entry {
  slug: string;
  fields: Field[];
  /** Normalised title, for whole-phrase bonuses. */
  title: string;
  /** Plain text of the article, for snippets. */
  text: string;
}

interface Posting {
  word: string;
  folded: string;
  /** [entry index, best field weight of this word in that entry] */
  hits: Array<[number, number]>;
}

export interface SearchIndex {
  entries: Entry[];
  /** Every distinct word once, with where it occurs — scored once per query word. */
  postings: Posting[];
  /** Every word of every article with how often it occurs, for autocomplete. */
  vocabulary: Array<{ word: string; count: number }>;
}

export interface SearchHit {
  slug: string;
  score: number;
  /** Field words the query matched, so the UI can highlight them. */
  matched: string[];
}

const WEIGHTS = { title: 6, tags: 4, tour: 3, caption: 2, prelude: 1.5, post: 1 } as const;

export const normalizeText = (text: string): string =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const words = (text: string): string[] => normalizeText(text).split(' ').filter((w) => w.length > 1);

/** Markdown and image markers out, readable prose in. */
export const plainText = (markdown: string): string =>
  String(markdown ?? '')
    .replace(/\[\[IMAGE-\d+\]\]/gi, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>`~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const unique = (list: string[]) => [...new Set(list)];

/** Words plus each adjacent pair joined, so "jetski" finds "jet ski". */
const fieldWords = (text: string): string[] => {
  const list = words(text);
  const pairs = list.slice(1).map((word, i) => list[i] + word).filter((pair) => pair.length <= 16);
  return unique([...list, ...pairs]);
};

export const buildSearchIndex = (articles: SearchableArticle[]): SearchIndex => {
  const counts = new Map<string, number>();
  const entries = articles.map((article) => {
    const text = plainText([article.caption, article.prelude, article.post].filter(Boolean).join(' '));
    const field = (weight: number, list: string[]): Field => ({ weight, words: list, folded: list.map(fold) });
    const fields: Field[] = [
      field(WEIGHTS.title, fieldWords(article.title)),
      field(WEIGHTS.tags, unique((article.tags ?? []).flatMap(fieldWords))),
      field(WEIGHTS.tour, fieldWords(article.tour ?? '')),
      field(WEIGHTS.caption, fieldWords(article.caption ?? '')),
      field(WEIGHTS.prelude, fieldWords(article.prelude ?? '')),
      // Joined pairs only where names live; across whole articles they double
      // the vocabulary for nothing.
      field(WEIGHTS.post, unique(words(plainText(article.post ?? '')))),
    ];
    for (const word of words(`${article.title} ${(article.tags ?? []).join(' ')} ${text}`)) {
      if (word.length > 2 && !/^\d+$/.test(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
    }
    return { slug: article.slug, fields, title: normalizeText(article.title), text };
  });

  const byWord = new Map<string, Posting>();
  entries.forEach((entry, entryIndex) => {
    for (const field of entry.fields) {
      field.words.forEach((word, i) => {
        let posting = byWord.get(word);
        if (!posting) {
          posting = { word, folded: field.folded[i], hits: [] };
          byWord.set(word, posting);
        }
        const last = posting.hits[posting.hits.length - 1];
        if (last && last[0] === entryIndex) last[1] = Math.max(last[1], field.weight);
        else posting.hits.push([entryIndex, field.weight]);
      });
    }
  });
  const postings = [...byWord.values()];

  const vocabulary = [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));

  return { entries, postings, vocabulary };
};

/** Edit distance with transpositions, giving up early past `max`. */
// Three reusable rows: the search calls this thousands of times per keystroke,
// and allocating a table each time is what made typing stutter on phones.
let rowA = new Int32Array(32);
let rowB = new Int32Array(32);
let rowC = new Int32Array(32);
const distance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = b.length;
  if (rowA.length <= n) {
    rowA = new Int32Array(n + 1);
    rowB = new Int32Array(n + 1);
    rowC = new Int32Array(n + 1);
  }
  let prev2 = rowA; // row i-2
  let prev = rowB; // row i-1
  let cur = rowC; // row i
  for (let j = 0; j <= n; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    cur[0] = i;
    let rowMin = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j += 1) {
      const cb = b.charCodeAt(j - 1);
      let value = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca === cb ? 0 : 1));
      if (i > 1 && j > 1 && ca === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === cb) {
        value = Math.min(value, prev2[j - 2] + 1);
      }
      cur[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    const spare = prev2;
    prev2 = prev;
    prev = cur;
    cur = spare;
  }
  return prev[n];
};

/**
 * Spelling by ear: "dolfin" and "dolphin", "snorkle" and "snorkel",
 * "kayak" and "cayak" fold to the same shape before typos are counted.
 */
const fold = (word: string): string =>
  word
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ck|qu|q/g, 'k')
    .replace(/c(?=[aou])/g, 'k')
    .replace(/[yj]/g, 'i')
    .replace(/z/g, 's')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1');

/** How well one query word matches one field word, 0…1. */
const wordScore = (query: string, word: string, foldedQuery = fold(query), foldedWord = fold(word)): number => {
  if (word === query) return 1;
  if (word.startsWith(query)) return query.length >= 2 ? 0.85 : 0;
  if (query.length >= 4 && word.includes(query)) return 0.6;
  // Typos: one for mid-length words, two for long ones; also allow a typo in
  // a word still being typed ("snorkle" → "snorkeling").
  if (query.length >= 4) {
    const max = query.length >= 8 ? 2 : 1;
    const q = foldedQuery.length >= 3 ? foldedQuery : query;
    const w = foldedQuery.length >= 3 ? foldedWord : word;
    const full = distance(q, w, max);
    if (full <= max) return 0.7 - full * 0.15;
    if (w.length > q.length) {
      const head = distance(q, w.slice(0, q.length), max);
      if (head <= max) return 0.55 - head * 0.15;
    }
  }
  return 0;
};

export const queryWords = (query: string): string[] => words(query);

export const searchArticles = (index: SearchIndex, query: string): SearchHit[] => {
  const terms = queryWords(query);
  if (terms.length === 0) return [];
  const phrase = normalizeText(query);
  const count = index.entries.length;

  const totals = new Float64Array(count);
  const found = new Uint8Array(count); // how many query words each entry matched
  const matched: string[] = [];

  for (const term of terms) {
    const foldedTerm = fold(term);
    const best = new Float64Array(count);
    for (const posting of index.postings) {
      const s = wordScore(term, posting.word, foldedTerm, posting.folded);
      if (s === 0) continue;
      matched.push(posting.word);
      for (const [entry, weight] of posting.hits) {
        const value = s * weight;
        if (value > best[entry]) best[entry] = value;
      }
    }
    for (let e = 0; e < count; e += 1) {
      if (best[e] > 0) {
        totals[e] += best[e];
        found[e] += 1;
      }
    }
  }

  const hits: SearchHit[] = [];
  const words = unique(matched);
  for (let e = 0; e < count; e += 1) {
    // Every query word must match somewhere (AND), so adding a word narrows.
    if (found[e] !== terms.length) continue;
    let score = totals[e];
    if (terms.length > 1 && index.entries[e].title.includes(phrase)) score += 8;
    hits.push({ slug: index.entries[e].slug, score, matched: words });
  }
  return hits.sort((a, b) => b.score - a.score);
};

/** Words of the vocabulary that complete the last word being typed. */
export const completeWord = (index: SearchIndex, query: string, limit = 3): string[] => {
  const terms = queryWords(query);
  const last = terms[terms.length - 1];
  if (!last || last.length < 2 || /\s$/.test(query)) return [];
  return index.vocabulary
    .filter(({ word }) => word !== last && (word.startsWith(last) || (last.length >= 4 && wordScore(last, word) >= 0.55)))
    .slice(0, limit)
    .map(({ word }) => word);
};

/** A short excerpt around the first matched word, for a result's preview. */
export const snippetFor = (text: string, matched: string[], size = 160): string => {
  if (!text) return '';
  const lower = normalizeText(text);
  // normalizeText keeps character positions only for plain ASCII, so search
  // the normalised copy and map back through a word count instead.
  let position = -1;
  for (const word of matched) {
    const at = lower.search(new RegExp(`\\b${word}`));
    if (at >= 0 && (position < 0 || at < position)) position = at;
  }
  if (position < 0) return text.slice(0, size) + (text.length > size ? '…' : '');
  const wordIndex = lower.slice(0, position).split(' ').length - 1;
  const original = text.split(/\s+/);
  const start = Math.max(0, wordIndex - 8);
  const excerpt = original.slice(start, start + Math.round(size / 6)).join(' ');
  return `${start > 0 ? '…' : ''}${excerpt}${start + Math.round(size / 6) < original.length ? '…' : ''}`;
};

/** Split text into plain and highlighted parts for the given matched words. */
export const highlightParts = (text: string, matched: string[]): Array<{ text: string; hit: boolean }> => {
  if (!matched.length) return [{ text, hit: false }];
  const set = new Set(matched);
  return text
    .split(/(\s+)/)
    .map((part) => ({ text: part, hit: set.has(normalizeText(part)) || [...set].some((m) => normalizeText(part).startsWith(m) && m.length >= 3) }))
    .reduce<Array<{ text: string; hit: boolean }>>((out, part) => {
      const last = out[out.length - 1];
      if (last && last.hit === part.hit) last.text += part.text;
      else out.push({ ...part });
      return out;
    }, []);
};
