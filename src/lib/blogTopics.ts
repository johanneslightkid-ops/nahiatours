/**
 * The topic vocabulary the blog generator and its admin share.
 *
 * These are the things a Punta Cana operator actually writes about, so the
 * admin can offer them as one-tap chips instead of asking someone to think of
 * a subject from a blank box, and the prompt can be told which ones to lean
 * into. Nothing here is invented marketing: every entry names a real place, a
 * real activity or a real practical concern of a visitor to the Dominican
 * Republic.
 */

export interface Topic {
  /** Stable id, also the hashtag stem. */
  id: string;
  label: { en: string; es: string };
  /** Hashtags a tourism account would really use for this topic. */
  hashtags: string[];
}

export const TOPICS: Topic[] = [
  {
    id: 'saona',
    label: { en: 'Saona Island', es: 'Isla Saona' },
    hashtags: ['SaonaIsland', 'IslaSaona', 'NaturalPool', 'PiscinaNatural'],
  },
  {
    id: 'catalina',
    label: { en: 'Catalina & the reef', es: 'Catalina y el arrecife' },
    hashtags: ['IslaCatalina', 'Snorkeling', 'CaribbeanReef'],
  },
  {
    id: 'buggy',
    label: { en: 'Buggies & off-road', es: 'Buggies y todoterreno' },
    hashtags: ['BuggyTour', 'OffRoad', 'DominicanAdventure'],
  },
  {
    id: 'catamaran',
    label: { en: 'Catamaran & party boat', es: 'Catamarán y party boat' },
    hashtags: ['Catamaran', 'PartyBoat', 'BavaroBeach'],
  },
  {
    id: 'waterfall',
    label: { en: 'Waterfalls & jungle', es: 'Cascadas y selva' },
    hashtags: ['Waterfalls', 'Cascadas', 'JungleTour', 'EcoTourism'],
  },
  {
    id: 'beach',
    label: { en: 'Beaches & sunsets', es: 'Playas y atardeceres' },
    hashtags: ['PuntaCana', 'Bavaro', 'MacaoBeach', 'CaribbeanSunset'],
  },
  {
    id: 'family',
    label: { en: 'Family days', es: 'Días en familia' },
    hashtags: ['FamilyTravel', 'ViajarEnFamilia', 'KidFriendly'],
  },
  {
    id: 'couples',
    label: { en: 'Couples & honeymoon', es: 'Parejas y luna de miel' },
    hashtags: ['Honeymoon', 'CouplesTravel', 'LunaDeMiel'],
  },
  {
    id: 'food',
    label: { en: 'Food & rum', es: 'Comida y ron' },
    hashtags: ['DominicanFood', 'ComidaDominicana', 'Mamajuana'],
  },
  {
    id: 'culture',
    label: { en: 'Culture & towns', es: 'Cultura y pueblos' },
    hashtags: ['SantoDomingo', 'DominicanCulture', 'AltosDeChavon'],
  },
  {
    id: 'transfers',
    label: { en: 'Airport transfers', es: 'Traslados al aeropuerto' },
    hashtags: ['PuntaCanaAirport', 'PUJ', 'AirportTransfer', 'Traslados'],
  },
  {
    id: 'tips',
    label: { en: 'Practical tips', es: 'Consejos prácticos' },
    hashtags: ['TravelTips', 'ConsejosDeViaje', 'DominicanRepublic'],
  },
];

/** Hashtags every post can carry, whatever it is about. */
export const EVERGREEN_HASHTAGS = [
  'PuntaCana',
  'DominicanRepublic',
  'RepublicaDominicana',
  'Bavaro',
  'Caribbean',
  'Excursions',
  'Excursiones',
  'VisitDR',
];

export const topicById = (id: string) => TOPICS.find((t) => t.id === id);

export const hashtagsFor = (topicIds: string[]): string[] => {
  const picked = topicIds.flatMap((id) => topicById(id)?.hashtags ?? []);
  return [...new Set([...picked, ...EVERGREEN_HASHTAGS])];
};
