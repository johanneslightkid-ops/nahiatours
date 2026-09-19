import type { Tour } from '../services/toursService';

/**
 * Reading the catalogue, rather than describing it.
 *
 * The brief asked for browsing by activity, destination and who the day suits.
 * The honest way to build that is to derive the facets from what the business
 * actually sells: every keyword below is matched against the real title and
 * description of each excursion, in both languages, and a facet that matches
 * nothing is never shown. Nothing here invents an offering, a category or a
 * destination the catalogue does not already contain.
 *
 * It is deliberately a keyword match and not a taxonomy field. A taxonomy
 * would have to be maintained in the admin, and an unmaintained taxonomy
 * quietly stops matching reality; this cannot, because the text it reads is
 * the text the visitor reads.
 */

export interface Facet {
  id: string;
  /** Label in each language the site speaks. */
  label: { en: string; es: string };
  /** Matched case-insensitively against title + description, both locales. */
  keywords: string[];
}

export const FACETS: Facet[] = [
  {
    id: 'island',
    label: { en: 'Islands', es: 'Islas' },
    keywords: ['saona', 'catalina', 'island', 'isla', 'cayo', 'natural pool', 'piscina natural'],
  },
  {
    id: 'boat',
    label: { en: 'On the water', es: 'En el mar' },
    keywords: [
      'catamaran', 'catamarán', 'boat', 'barco', 'lancha', 'speedboat', 'sail', 'crucero',
      'yate', 'snorkel', 'buceo', 'diving', 'reef', 'arrecife', 'party boat',
    ],
  },
  {
    id: 'nature',
    label: { en: 'Nature & jungle', es: 'Naturaleza y selva' },
    keywords: [
      'jungle', 'selva', 'waterfall', 'cascada', 'salto', 'cave', 'cueva', 'river', 'río',
      'hoyo azul', 'lagoon', 'laguna', 'mangrove', 'manglar', 'eco', 'nature', 'naturaleza',
      'cenote',
    ],
  },
  {
    id: 'adventure',
    label: { en: 'Adventure', es: 'Aventura' },
    keywords: [
      'buggy', 'buggies', 'atv', 'quad', 'zip', 'tirolesa', 'zipline', '4x4', 'safari',
      'horseback', 'caballo', 'adventure', 'aventura', 'off-road',
    ],
  },
  {
    id: 'beach',
    label: { en: 'Beach & sunset', es: 'Playa y atardecer' },
    keywords: [
      'beach', 'playa', 'macao', 'bávaro', 'bavaro', 'sunset', 'atardecer', 'relax',
      'lounger', 'hamaca',
    ],
  },
  {
    id: 'culture',
    label: { en: 'Culture & towns', es: 'Cultura y pueblos' },
    keywords: [
      'santo domingo', 'chavón', 'chavon', 'colonial', 'village', 'pueblo', 'cultural',
      'taíno', 'taino', 'altos de', 'city', 'ciudad',
    ],
  },
  {
    id: 'family',
    label: { en: 'Good with kids', es: 'Ideal en familia' },
    keywords: [
      'family', 'familia', 'kids', 'niños', 'children', 'dolphin', 'delfín', 'delfines',
      'all ages', 'todas las edades',
    ],
  },
];

const haystack = (tour: Tour): string =>
  [tour.title, tour.description, (tour as { includes?: string }).includes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

/** Which facets a single excursion belongs to. */
export const facetsOf = (tour: Tour): string[] => {
  const text = haystack(tour);
  return FACETS.filter((facet) => facet.keywords.some((k) => text.includes(k))).map((f) => f.id);
};

/**
 * The facets worth offering for this catalogue, with their counts.
 *
 * A facet matching every single excursion is dropped as well as one matching
 * none: a filter that cannot narrow anything is a control that lies about
 * doing something.
 */
export const availableFacets = (tours: Tour[]): Array<Facet & { count: number }> => {
  if (tours.length === 0) return [];

  return FACETS.map((facet) => ({
    ...facet,
    count: tours.filter((tour) => facetsOf(tour).includes(facet.id)).length,
  })).filter((facet) => facet.count > 0 && facet.count < tours.length);
};

/** Free-text search over the same text the facets read. */
export const matchesQuery = (tour: Tour, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack(tour).includes(q);
};
