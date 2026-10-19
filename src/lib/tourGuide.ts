/// <reference types="vite/client" />
/**
 * What there is to know about a tour beyond the vendor's own description.
 *
 * Every site sells the same common Bávaro / Punta Cana excursions, so the
 * facts about them — what Saona actually is, how far Montaña Redonda is, what
 * to bring on a buggy, what people who went tend to say — are the same on
 * every site too. They live in src/data/tourGuide/<profile key>.json, one file
 * per tour in all four languages, researched from what is publicly known about
 * each excursion and written fresh (nothing copied). They are matched to the
 * live catalogue through the planner's tour profiles, so a tour renamed in the
 * admin still finds its guide.
 *
 * What a booking INCLUDES is deliberately not here: that differs from vendor
 * to vendor and stays in each site's own description.
 */

export type Lang = 'en' | 'es' | 'de' | 'fr';
type L<T = string> = Record<Lang, T>;

export interface TourGuide {
  key: string;
  facts: {
    duration: L;
    pickup: L;
    where: L;
    fromBavaro: L;
    level: 'easy' | 'moderate' | 'active';
    minAge: L;
    bestFor: L;
  };
  about: L;
  highlights: L<string[]>;
  itinerary: L<Array<{ time: string; title: string; text: string }>>;
  bring: L<string[]>;
  goodToKnow: L<string[]>;
  travellersSay: L<string[]>;
  faq: L<Array<{ q: string; a: string }>>;
}

/** One lazily loaded chunk per tour: a page only downloads its own guide. */
const files = import.meta.glob<{ default: TourGuide }>('../data/tourGuide/*.json');

export const loadTourGuide = async (key: string): Promise<TourGuide | null> => {
  const loader = files[`../data/tourGuide/${key}.json`];
  if (!loader) return null;
  try {
    return (await loader()).default;
  } catch {
    return null;
  }
};

export const langOf = (locale: string): Lang => {
  const lang = locale.slice(0, 2).toLowerCase();
  return lang === 'es' || lang === 'de' || lang === 'fr' ? lang : 'en';
};
