/**
 * The topic vocabulary the blog generator and its admin share.
 *
 * These are the things a Punta Cana operator actually writes about, so the
 * admin can offer them as one-tap chips instead of asking someone to think of
 * a subject from a blank box, and the prompt can be told which ones to lean
 * into. Nothing here is invented marketing: every entry names a real place, a
 * real activity or a real practical concern of a visitor to the Dominican
 * Republic.
 *
 * Each topic also carries the phrases people really type into a search box or
 * a social search, per language. A German visitor does not search for
 * "Saona Island tour", and the French edition of an article ranks on French
 * queries, so the keywords travel with the language they are written in.
 */

export type BlogLang = 'en' | 'es' | 'fr' | 'de';

export interface Topic {
  /** Stable id, also the hashtag stem. */
  id: string;
  label: Record<BlogLang, string>;
  /** Hashtags a tourism account would really use for this topic. */
  hashtags: string[];
  /** Search phrases per language: the head term first, then long-tail questions. */
  keywords: Record<BlogLang, string[]>;
}

export const TOPICS: Topic[] = [
  {
    id: 'saona',
    label: { en: 'Saona Island', es: 'Isla Saona', fr: 'Île Saona', de: 'Insel Saona' },
    hashtags: ['SaonaIsland', 'IslaSaona', 'NaturalPool', 'PiscinaNatural'],
    keywords: {
      en: ['Saona Island tour', 'Saona Island from Punta Cana', 'natural pool Saona', 'is Saona Island worth it'],
      es: ['excursión Isla Saona', 'Isla Saona desde Punta Cana', 'piscina natural Saona', 'qué llevar a Isla Saona'],
      fr: ['excursion île Saona', 'île Saona depuis Punta Cana', 'piscine naturelle Saona', 'Saona vaut-elle le coup'],
      de: ['Saona Ausflug', 'Insel Saona ab Punta Cana', 'Naturpool Saona', 'lohnt sich Saona'],
    },
  },
  {
    id: 'catalina',
    label: { en: 'Catalina & the reef', es: 'Catalina y el arrecife', fr: 'Catalina et le récif', de: 'Catalina und das Riff' },
    hashtags: ['IslaCatalina', 'Snorkeling', 'CaribbeanReef'],
    keywords: {
      en: ['Catalina Island snorkeling', 'best snorkeling Punta Cana', 'Catalina Island day trip'],
      es: ['snorkel Isla Catalina', 'mejor snorkel en Punta Cana', 'excursión Isla Catalina'],
      fr: ['snorkeling île Catalina', 'meilleur snorkeling Punta Cana', 'excursion île Catalina'],
      de: ['Schnorcheln Catalina', 'bestes Schnorcheln Punta Cana', 'Catalina Tagesausflug'],
    },
  },
  {
    id: 'buggy',
    label: { en: 'Buggies & off-road', es: 'Buggies y todoterreno', fr: 'Buggys et tout-terrain', de: 'Buggys und Offroad' },
    hashtags: ['BuggyTour', 'OffRoad', 'DominicanAdventure'],
    keywords: {
      en: ['buggy tour Punta Cana', 'Macao beach buggy', 'ATV Punta Cana cenote'],
      es: ['tour en buggy Punta Cana', 'buggies playa Macao', 'cuatrimotos Punta Cana'],
      fr: ['excursion buggy Punta Cana', 'buggy plage de Macao', 'quad Punta Cana'],
      de: ['Buggy Tour Punta Cana', 'Buggy Macao Strand', 'Quad fahren Punta Cana'],
    },
  },
  {
    id: 'catamaran',
    label: { en: 'Catamaran & party boat', es: 'Catamarán y party boat', fr: 'Catamaran et bateau festif', de: 'Katamaran und Partyboot' },
    hashtags: ['Catamaran', 'PartyBoat', 'BavaroBeach'],
    keywords: {
      en: ['catamaran Punta Cana', 'party boat Punta Cana', 'snorkel and party boat Bavaro'],
      es: ['catamarán Punta Cana', 'party boat Punta Cana', 'fiesta en barco Bávaro'],
      fr: ['catamaran Punta Cana', 'bateau fête Punta Cana', 'sortie catamaran Bávaro'],
      de: ['Katamaran Punta Cana', 'Partyboot Punta Cana', 'Katamaranfahrt Bávaro'],
    },
  },
  {
    id: 'waterfall',
    label: { en: 'Waterfalls & jungle', es: 'Cascadas y selva', fr: 'Cascades et jungle', de: 'Wasserfälle und Dschungel' },
    hashtags: ['Waterfalls', 'Cascadas', 'JungleTour', 'EcoTourism'],
    keywords: {
      en: ['waterfalls near Punta Cana', 'Montaña Redonda', 'eco tour Dominican Republic'],
      es: ['cascadas cerca de Punta Cana', 'Montaña Redonda', 'ecoturismo República Dominicana'],
      fr: ['cascades près de Punta Cana', 'Montaña Redonda', 'écotourisme République dominicaine'],
      de: ['Wasserfälle bei Punta Cana', 'Montaña Redonda', 'Ökotourismus Dominikanische Republik'],
    },
  },
  {
    id: 'beach',
    label: { en: 'Beaches & sunsets', es: 'Playas y atardeceres', fr: 'Plages et couchers de soleil', de: 'Strände und Sonnenuntergänge' },
    hashtags: ['PuntaCana', 'Bavaro', 'MacaoBeach', 'CaribbeanSunset'],
    keywords: {
      en: ['best beaches Punta Cana', 'Macao beach', 'Bavaro beach sunset'],
      es: ['mejores playas de Punta Cana', 'playa Macao', 'atardecer en Bávaro'],
      fr: ['plus belles plages Punta Cana', 'plage de Macao', 'coucher de soleil Bávaro'],
      de: ['schönste Strände Punta Cana', 'Macao Strand', 'Sonnenuntergang Bávaro'],
    },
  },
  {
    id: 'family',
    label: { en: 'Family days', es: 'Días en familia', fr: 'Journées en famille', de: 'Familientage' },
    hashtags: ['FamilyTravel', 'ViajarEnFamilia', 'KidFriendly'],
    keywords: {
      en: ['Punta Cana with kids', 'family excursions Punta Cana', 'kid friendly tours Dominican Republic'],
      es: ['Punta Cana con niños', 'excursiones en familia Punta Cana', 'planes con niños República Dominicana'],
      fr: ['Punta Cana avec des enfants', 'excursions en famille Punta Cana', 'activités enfants République dominicaine'],
      de: ['Punta Cana mit Kindern', 'Familienausflüge Punta Cana', 'kinderfreundliche Ausflüge Dominikanische Republik'],
    },
  },
  {
    id: 'couples',
    label: { en: 'Couples & honeymoon', es: 'Parejas y luna de miel', fr: 'Couples et lune de miel', de: 'Paare und Flitterwochen' },
    hashtags: ['Honeymoon', 'CouplesTravel', 'LunaDeMiel'],
    keywords: {
      en: ['romantic things to do Punta Cana', 'honeymoon excursions Punta Cana', 'private tour for couples'],
      es: ['planes románticos en Punta Cana', 'luna de miel Punta Cana', 'excursión privada en pareja'],
      fr: ['activités romantiques Punta Cana', 'lune de miel Punta Cana', 'excursion privée en couple'],
      de: ['romantische Ausflüge Punta Cana', 'Flitterwochen Punta Cana', 'private Tour für Paare'],
    },
  },
  {
    id: 'food',
    label: { en: 'Food & rum', es: 'Comida y ron', fr: 'Cuisine et rhum', de: 'Essen und Rum' },
    hashtags: ['DominicanFood', 'ComidaDominicana', 'Mamajuana'],
    keywords: {
      en: ['Dominican food to try', 'mamajuana', 'local food tour Punta Cana'],
      es: ['comida dominicana típica', 'mamajuana', 'dónde comer en Punta Cana'],
      fr: ['cuisine dominicaine à goûter', 'mamajuana', 'où manger à Punta Cana'],
      de: ['dominikanisches Essen probieren', 'Mamajuana', 'wo essen in Punta Cana'],
    },
  },
  {
    id: 'culture',
    label: { en: 'Culture & towns', es: 'Cultura y pueblos', fr: 'Culture et villages', de: 'Kultur und Orte' },
    hashtags: ['SantoDomingo', 'DominicanCulture', 'AltosDeChavon'],
    keywords: {
      en: ['Santo Domingo day trip', 'Altos de Chavón', 'Dominican culture tour'],
      es: ['excursión a Santo Domingo', 'Altos de Chavón', 'cultura dominicana'],
      fr: ['excursion Saint-Domingue', 'Altos de Chavón', 'culture dominicaine'],
      de: ['Tagesausflug Santo Domingo', 'Altos de Chavón', 'dominikanische Kultur'],
    },
  },
  {
    id: 'transfers',
    label: { en: 'Airport transfers', es: 'Traslados al aeropuerto', fr: 'Transferts aéroport', de: 'Flughafentransfer' },
    hashtags: ['PuntaCanaAirport', 'PUJ', 'AirportTransfer', 'Traslados'],
    keywords: {
      en: ['Punta Cana airport transfer', 'PUJ to Bavaro', 'private transfer Punta Cana'],
      es: ['traslado aeropuerto Punta Cana', 'PUJ a Bávaro', 'transporte privado Punta Cana'],
      fr: ['transfert aéroport Punta Cana', 'PUJ vers Bávaro', 'transfert privé Punta Cana'],
      de: ['Flughafentransfer Punta Cana', 'PUJ nach Bávaro', 'privater Transfer Punta Cana'],
    },
  },
  {
    id: 'tips',
    label: { en: 'Practical tips', es: 'Consejos prácticos', fr: 'Conseils pratiques', de: 'Praktische Tipps' },
    hashtags: ['TravelTips', 'ConsejosDeViaje', 'DominicanRepublic'],
    keywords: {
      en: ['Punta Cana travel tips', 'what to pack for Punta Cana', 'tipping in the Dominican Republic'],
      es: ['consejos para viajar a Punta Cana', 'qué llevar a Punta Cana', 'propinas en República Dominicana'],
      fr: ['conseils voyage Punta Cana', 'quoi emporter à Punta Cana', 'pourboire République dominicaine'],
      de: ['Punta Cana Reisetipps', 'was einpacken Punta Cana', 'Trinkgeld Dominikanische Republik'],
    },
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

/** Extra hashtags people in each language really follow. */
export const LANGUAGE_HASHTAGS: Record<BlogLang, string[]> = {
  en: ['TravelGram', 'CaribbeanVibes'],
  es: ['ViajesRD', 'Caribe'],
  fr: ['VoyageCaraibes', 'RepubliqueDominicaine', 'Vacances'],
  de: ['Karibik', 'DominikanischeRepublik', 'Urlaub', 'Reiselust'],
};

export const topicById = (id: string) => TOPICS.find((t) => t.id === id);

export const hashtagsFor = (topicIds: string[], lang?: BlogLang): string[] => {
  const picked = topicIds.flatMap((id) => topicById(id)?.hashtags ?? []);
  return [...new Set([...picked, ...EVERGREEN_HASHTAGS, ...(lang ? LANGUAGE_HASHTAGS[lang] : [])])];
};

/** The search phrases for the chosen topics, in one language, head terms first. */
export const keywordsFor = (topicIds: string[], lang: BlogLang): string[] => {
  const chosen = topicIds.map((id) => topicById(id)).filter(Boolean) as Topic[];
  const heads = chosen.map((t) => t.keywords[lang][0]);
  const tails = chosen.flatMap((t) => t.keywords[lang].slice(1));
  return [...new Set([...heads, ...tails])];
};

/**
 * What is happening in the region this month, so an article written in
 * February talks about whales and one written in September is honest about
 * the weather. Only facts that hold every year.
 */
export const seasonalNote = (month: number = new Date().getMonth()): string => {
  if (month <= 2) {
    return 'January to March is humpback whale season in Samaná Bay, and the driest, busiest stretch of the year on the east coast — book ahead.';
  }
  if (month <= 4) {
    return 'Spring brings calm, clear water and fewer crowds after Easter week (Semana Santa), when Dominicans themselves head for the beach.';
  }
  if (month <= 7) {
    return 'Summer is hot and humid with short tropical showers in the afternoon; mornings are best for boat trips, and families from abroad and from the capital fill the coast in July.';
  }
  if (month <= 10) {
    return 'August to October is the heart of the Atlantic hurricane season: most days are still sunny, but flexible plans and an operator who reschedules for the weather matter.';
  }
  return 'November and December bring the dry season back, Christmas lights in the towns and the start of the high season.';
};
