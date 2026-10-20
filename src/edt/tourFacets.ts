import type { Tour } from '../services/toursService';
import type { Locale } from '../contexts/I18nContext';

/**
 * Search and hashtags for the tours page.
 *
 * Tags come from two places: the facets stored with a tour (its categories
 * and where it departs from) and what its own text says — a tour whose
 * included list mentions lunch is #lunch whether or not anyone tagged it. So a
 * tour added in the admin with nothing but a title and a description still
 * lands under the right hashtags.
 */

export type FacetId =
  | 'water'
  | 'adventure'
  | 'cultural'
  | 'nature'
  | 'full-day'
  | 'half-day'
  | 'island'
  | 'snorkel'
  | 'wildlife'
  | 'offroad'
  | 'party'
  | 'lunch'
  | 'family'
  | 'vip';

type L = Record<Locale, string>;

export const FACETS: Array<{ id: FacetId; label: L; test?: RegExp }> = [
  { id: 'water', label: { en: 'WaterTours', es: 'Acuáticos', fr: 'Aquatique', de: 'Wasser' } },
  { id: 'adventure', label: { en: 'Adventure', es: 'Aventura', fr: 'Aventure', de: 'Abenteuer' } },
  { id: 'cultural', label: { en: 'Culture', es: 'Cultura', fr: 'Culture', de: 'Kultur' } },
  { id: 'nature', label: { en: 'Nature', es: 'Naturaleza', fr: 'Nature', de: 'Natur' }, test: /\b(eco|nature|natural park|parque nacional|jungle|selva|cenote|waterfall|cascada|mangrove|manglar)/i },
  { id: 'full-day', label: { en: 'FullDay', es: 'DíaCompleto', fr: 'JournéeEntière', de: 'Ganztags' } },
  { id: 'half-day', label: { en: 'HalfDay', es: 'MedioDía', fr: 'DemiJournée', de: 'Halbtags' } },
  { id: 'island', label: { en: 'Islands', es: 'Islas', fr: 'Îles', de: 'Inseln' }, test: /\b(island|isla|île|insel|saona|catalina|cayo)/i },
  { id: 'snorkel', label: { en: 'Snorkel', es: 'Snorkel', fr: 'Snorkeling', de: 'Schnorcheln' }, test: /snorkel|schnorchel|buceo|scuba/i },
  { id: 'wildlife', label: { en: 'Wildlife', es: 'Animales', fr: 'Animaux', de: 'Tiere' }, test: /dolphin|delf|dauphin|monkey|mono|singe|affe|whale|ballena|baleine|wal\b|horse|caballo|cheval|pferd|shark|tibur|stingray|raya|parrot|loro/i },
  { id: 'offroad', label: { en: 'OffRoad', es: 'TodoTerreno', fr: 'ToutTerrain', de: 'Offroad' }, test: /buggy|boogie|polaris|safari|atv|quad|4x4|zipline|tirolesa|tyrolienne|seilrutsche/i },
  { id: 'party', label: { en: 'Party', es: 'Fiesta', fr: 'Fête', de: 'Party' }, test: /party|fiest|fête|open bar|barra libre|pirate|pirat/i },
  { id: 'lunch', label: { en: 'LunchIncluded', es: 'ConAlmuerzo', fr: 'DéjeunerInclus', de: 'MitMittagessen' }, test: /lunch|almuerzo|déjeuner|mittagessen|buffet|lobster|langosta|homard|hummer/i },
  { id: 'family', label: { en: 'Family', es: 'Familia', fr: 'Famille', de: 'Familie' }, test: /child|niñ|enfant|kinder|family|familia|famille|familie/i },
  { id: 'vip', label: { en: 'VIPPrivate', es: 'VIPPrivado', fr: 'VIPPrivé', de: 'VIPPrivat' }, test: /\bvip\b|private|privad|privé|privat/i },
];

const strip = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const words = (value: string) => strip(value).split(/[^a-z0-9$]+/).filter(Boolean);

/** Hours a tour lasts, from its facet or its description. */
export const tourHours = (tour: Tour): number | null => {
  const text = tour.duration || /\*\*(?:duration|duración|durée|dauer)\s*:?\*\*\s*:?\s*([^\n]+)/i.exec(tour.description)?.[1] || '';
  const match = /(\d+(?:[.,]\d+)?)/.exec(text);
  return match ? Number(match[1].replace(',', '.')) : null;
};

/** The adult (headline) price as a number. */
export const tourPrice = (tour: Tour): number | null => tour.pricingOptions[0]?.amount ?? null;

const STORED: Record<string, FacetId> = {
  water: 'water',
  'water-tours': 'water',
  adventure: 'adventure',
  cultural: 'cultural',
  culture: 'cultural',
  nature: 'nature',
  ecological: 'nature',
  'full-day': 'full-day',
  'half-day': 'half-day',
};

/** Every hashtag that applies to a tour. */
export const tourFacets = (tour: Tour): Set<FacetId> => {
  const found = new Set<FacetId>();
  (tour.tags ?? []).forEach((tag) => {
    const id = STORED[strip(tag).replace(/\s+/g, '-')];
    if (id) found.add(id);
  });
  const text = `${tour.title}\n${tour.description}`;
  FACETS.forEach((facet) => {
    if (facet.test && facet.test.test(text)) found.add(facet.id);
  });
  if (!found.has('full-day') && !found.has('half-day')) {
    const hours = tourHours(tour);
    if (hours !== null) found.add(hours >= 7 ? 'full-day' : 'half-day');
  }
  return found;
};

/** Levenshtein distance, capped: anything past `max` is just "too far". */
const distance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      best = Math.min(best, current[j]);
    }
    if (best > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
};

export interface SearchIndexEntry {
  tour: Tour;
  title: string[];
  meta: string[];
  body: string[];
  facets: Set<FacetId>;
}

export const buildIndex = (tours: Tour[], locale: Locale): SearchIndexEntry[] =>
  tours.map((tour) => {
    const facets = tourFacets(tour);
    const labels = FACETS.filter((facet) => facets.has(facet.id)).map((facet) => `${facet.label[locale]} ${facet.label.en}`);
    return {
      tour,
      facets,
      title: words(tour.title),
      meta: words(`${tour.destination ?? ''} ${(tour.tags ?? []).join(' ')} ${labels.join(' ')}`),
      body: words(tour.description),
    };
  });

/**
 * How well a tour answers the query: every word typed must land somewhere —
 * in the title (worth most), the tags and place, or the description — either
 * as the start of a word or within one or two typos of one.
 */
export const scoreEntry = (entry: SearchIndexEntry, query: string): number => {
  const terms = words(query);
  if (!terms.length) return 1;
  let score = 0;
  for (const term of terms) {
    const allowed = term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0;
    const match = (list: string[]) => {
      let best = 0;
      for (const word of list) {
        if (word === term) return 1;
        if (word.startsWith(term)) best = Math.max(best, 0.85);
        else if (term.length >= 3 && word.includes(term)) best = Math.max(best, 0.6);
        else if (allowed && distance(word.slice(0, term.length + 1), term, allowed) <= allowed) best = Math.max(best, 0.5);
      }
      return best;
    };
    const termScore = Math.max(match(entry.title) * 3, match(entry.meta) * 2, match(entry.body));
    if (!termScore) return 0;
    score += termScore;
  }
  return score;
};
