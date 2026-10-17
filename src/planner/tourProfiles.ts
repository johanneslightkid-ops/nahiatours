/**
 * Tour profile metadata
 * ---------------------
 * The live catalogue (public/data/tours-{en,es}.json) only carries marketing
 * copy, prices and images. To reason about a day plan we need structured facts:
 * how long a tour runs, how demanding it is, who it delights, what it requires.
 *
 * Everything in here is derived from the real tour descriptions in the
 * catalogue — durations, minimum ages, inclusions and price tiers are not
 * invented. Each profile is matched onto the live tour objects by title so the
 * planner keeps working when Francisco edits copy in the admin panel.
 */

export type InterestKey =
  | 'beach_island'
  | 'snorkel_reef'
  | 'wildlife'
  | 'adrenaline'
  | 'offroad'
  | 'culture'
  | 'nightlife'
  | 'food_drink'
  | 'views_photo'
  | 'relax';

export type PartyType = 'solo' | 'couple' | 'family' | 'friends' | 'multigen';

export type DaySlot = 'full' | 'half' | 'short' | 'evening';

/** Broad family used for variety control inside one plan. */
export type CategoryGroup =
  | 'island_day'
  | 'boat_party'
  | 'watersport'
  | 'offroad'
  | 'wildlife'
  | 'culture'
  | 'nightlife'
  | 'aerial'
  | 'adventure_park';

export interface TourProfile {
  key: string;
  /** Regexes tried in order against the live (EN or ES) tour title. */
  match: RegExp[];
  emoji: string;
  /** Advertised on-tour hours including hotel transfers, from the catalogue. */
  durationHours: number;
  slot: DaySlot;
  categoryGroup: CategoryGroup;
  /** 1 = gentle · 5 = full send. */
  intensity: number;
  /** How much time is spent in/on the water: 0 none · 3 swimming required. */
  water: number;
  /** Boat exposure — proxy for sea-sickness risk. 0 none · 3 long crossing. */
  boat: number;
  /** Physical demand: 1 easy · 3 needs decent mobility. */
  mobility: number;
  /** Realistic minimum age for the activity. */
  minAge: number;
  /** How much children (within age) love it: 0 not for kids · 3 magnet. */
  kidJoy: number;
  /** Adults-only venue (open-bar clubs). */
  adultsOnly?: boolean;
  /** Departs at dawn — relevant for "no early mornings". */
  earlyStart?: boolean;
  servesAlcohol?: boolean;
  /** Premium feel: 1 casual · 3 luxury. */
  luxury: number;
  /** Flagship pull — used as a light tiebreaker, never as a hard rule. */
  signature: number;
  /** Interest affinity, 0–3 per key. */
  tags: Partial<Record<InterestKey, number>>;
  /** Party-type affinity, 0–3. */
  audience: Record<PartyType, number>;
  /** Occasion affinity, 0–3. */
  occasion?: Partial<Record<OccasionKey, number>>;
  /** Never place these two in the same plan (same destination twice). */
  conflicts?: string[];
  /**
   * Priced per vehicle rather than per head — a jet ski carries two. The
   * catalogue rate is then charged once for every this-many travellers.
   */
  seatsPerUnit?: number;
}

export type OccasionKey =
  | 'none'
  | 'honeymoon'
  | 'anniversary'
  | 'birthday'
  | 'bachelor'
  | 'reunion';

export const TOUR_PROFILES: TourProfile[] = [
  {
    key: 'saona_lobster',
    match: [/saona.*(lobster|langosta|hummer|homard|exclusiv)/i, /(lobster|langosta|hummer|homard).*saona/i],
    emoji: '🦞',
    durationHours: 10,
    slot: 'full',
    categoryGroup: 'island_day',
    intensity: 2,
    water: 2,
    boat: 3,
    mobility: 1,
    minAge: 0,
    kidJoy: 2,
    earlyStart: true,
    servesAlcohol: true,
    luxury: 3,
    signature: 3,
    tags: { beach_island: 3, food_drink: 3, relax: 3, views_photo: 2, snorkel_reef: 1 },
    audience: { solo: 2, couple: 3, family: 2, friends: 3, multigen: 3 },
    occasion: { honeymoon: 3, anniversary: 3, birthday: 2, reunion: 2 },
    conflicts: ['saona_classic'],
  },
  {
    key: 'saona_classic',
    match: [/saona/i],
    emoji: '🏝️',
    durationHours: 10,
    slot: 'full',
    categoryGroup: 'island_day',
    intensity: 2,
    water: 2,
    boat: 3,
    mobility: 1,
    minAge: 0,
    kidJoy: 3,
    earlyStart: true,
    servesAlcohol: true,
    luxury: 2,
    signature: 3,
    tags: { beach_island: 3, relax: 3, food_drink: 2, views_photo: 2, snorkel_reef: 1 },
    audience: { solo: 3, couple: 3, family: 3, friends: 3, multigen: 3 },
    occasion: { honeymoon: 2, anniversary: 2, birthday: 2, reunion: 3 },
    conflicts: ['saona_lobster'],
  },
  {
    key: 'catalina_reef',
    match: [/catalina/i],
    emoji: '🤿',
    durationHours: 12,
    slot: 'full',
    categoryGroup: 'island_day',
    intensity: 3,
    water: 3,
    boat: 3,
    mobility: 2,
    minAge: 6,
    kidJoy: 2,
    earlyStart: true,
    luxury: 2,
    signature: 2,
    tags: { snorkel_reef: 3, beach_island: 3, relax: 2, food_drink: 2, views_photo: 2 },
    audience: { solo: 3, couple: 3, family: 2, friends: 3, multigen: 2 },
    occasion: { honeymoon: 2, anniversary: 2 },
  },
  {
    key: 'party_boat',
    match: [/party ?bo[ao]t/i, /fiesta en el mar/i],
    emoji: '🛥️',
    durationHours: 4,
    slot: 'half',
    categoryGroup: 'boat_party',
    intensity: 3,
    water: 2,
    boat: 3,
    mobility: 2,
    minAge: 18,
    kidJoy: 0,
    adultsOnly: true,
    servesAlcohol: true,
    luxury: 2,
    signature: 2,
    tags: { nightlife: 2, beach_island: 2, snorkel_reef: 2, food_drink: 2, relax: 1 },
    audience: { solo: 3, couple: 2, family: 0, friends: 3, multigen: 1 },
    occasion: { bachelor: 3, birthday: 3, reunion: 2 },
  },
  {
    key: 'montana_redonda',
    match: [/monta[nñ]a redonda/i, /redonda/i],
    emoji: '⛰️',
    durationHours: 5,
    slot: 'half',
    categoryGroup: 'culture',
    intensity: 2,
    water: 0,
    boat: 0,
    mobility: 2,
    minAge: 3,
    kidJoy: 3,
    luxury: 2,
    signature: 2,
    tags: { views_photo: 3, food_drink: 2, culture: 2, relax: 2, beach_island: 1 },
    audience: { solo: 3, couple: 3, family: 3, friends: 3, multigen: 3 },
    occasion: { honeymoon: 3, anniversary: 3, birthday: 2 },
  },
  {
    key: 'buggies',
    match: [/buggy|buggies/i],
    emoji: '🏎️',
    durationHours: 4,
    slot: 'half',
    categoryGroup: 'offroad',
    intensity: 4,
    water: 2,
    boat: 0,
    mobility: 3,
    minAge: 8,
    kidJoy: 3,
    luxury: 1,
    signature: 3,
    tags: { offroad: 3, adrenaline: 3, beach_island: 2, culture: 1, views_photo: 2 },
    audience: { solo: 3, couple: 3, family: 2, friends: 3, multigen: 1 },
    occasion: { bachelor: 3, birthday: 2 },
  },
  {
    key: 'santo_domingo',
    match: [/santo domingo/i, /saint-domingue/i],
    emoji: '🏛️',
    durationHours: 10,
    slot: 'full',
    categoryGroup: 'culture',
    intensity: 2,
    water: 0,
    boat: 0,
    mobility: 3,
    minAge: 6,
    kidJoy: 1,
    earlyStart: true,
    luxury: 2,
    signature: 2,
    tags: { culture: 3, views_photo: 2, food_drink: 2 },
    audience: { solo: 3, couple: 3, family: 1, friends: 2, multigen: 2 },
    occasion: { anniversary: 2 },
  },
  {
    key: 'cultural_safari',
    match: [/^(?!.*jet ?-?ski).*safari/i],
    emoji: '🚜',
    durationHours: 8,
    slot: 'full',
    categoryGroup: 'offroad',
    intensity: 3,
    water: 1,
    boat: 0,
    mobility: 2,
    minAge: 3,
    kidJoy: 3,
    luxury: 1,
    signature: 2,
    tags: { culture: 3, food_drink: 3, offroad: 2, wildlife: 1, beach_island: 2, views_photo: 2 },
    audience: { solo: 3, couple: 3, family: 3, friends: 3, multigen: 3 },
    occasion: { reunion: 3 },
  },
  {
    key: 'speed_boat',
    match: [/speed ?bo[ao]t/i, /hors-bord/i, /lancha/i],
    emoji: '⚡',
    durationHours: 3,
    slot: 'half',
    categoryGroup: 'watersport',
    intensity: 4,
    water: 3,
    boat: 3,
    mobility: 2,
    minAge: 8,
    kidJoy: 2,
    luxury: 2,
    signature: 2,
    tags: { adrenaline: 3, snorkel_reef: 3, beach_island: 1, views_photo: 2 },
    audience: { solo: 2, couple: 3, family: 2, friends: 3, multigen: 1 },
    occasion: { honeymoon: 3, anniversary: 2, bachelor: 2 },
  },
  {
    key: 'parasailing',
    match: [/parasail/i, /parachute ascensionnel/i],
    emoji: '🪂',
    durationHours: 2,
    slot: 'short',
    categoryGroup: 'aerial',
    intensity: 3,
    water: 1,
    boat: 2,
    mobility: 2,
    minAge: 8,
    kidJoy: 3,
    luxury: 2,
    signature: 2,
    tags: { adrenaline: 3, views_photo: 3, beach_island: 1 },
    audience: { solo: 2, couple: 3, family: 3, friends: 3, multigen: 2 },
    occasion: { honeymoon: 3, birthday: 2, anniversary: 2 },
  },
  {
    key: 'coco_bongo',
    match: [/coco ?bongo/i],
    emoji: '🪩',
    durationHours: 5,
    slot: 'evening',
    categoryGroup: 'nightlife',
    intensity: 3,
    water: 0,
    boat: 0,
    mobility: 2,
    minAge: 18,
    kidJoy: 0,
    adultsOnly: true,
    servesAlcohol: true,
    luxury: 3,
    signature: 3,
    tags: { nightlife: 3, food_drink: 1, views_photo: 1 },
    audience: { solo: 2, couple: 3, family: 0, friends: 3, multigen: 1 },
    occasion: { bachelor: 3, birthday: 3, anniversary: 1 },
    conflicts: ['imagine_cave'],
  },
  {
    key: 'imagine_cave',
    match: [/imagin[ea]/i],
    emoji: '🕳️',
    durationHours: 4,
    slot: 'evening',
    categoryGroup: 'nightlife',
    intensity: 3,
    water: 0,
    boat: 0,
    mobility: 2,
    minAge: 18,
    kidJoy: 0,
    adultsOnly: true,
    servesAlcohol: true,
    luxury: 2,
    signature: 2,
    tags: { nightlife: 3, views_photo: 2 },
    audience: { solo: 3, couple: 2, family: 0, friends: 3, multigen: 0 },
    occasion: { bachelor: 3, birthday: 3 },
    conflicts: ['coco_bongo'],
  },
  {
    key: 'monkeyland',
    match: [/monkey/i, /monos/i],
    emoji: '🐒',
    durationHours: 4,
    slot: 'half',
    categoryGroup: 'wildlife',
    intensity: 1,
    water: 0,
    boat: 0,
    mobility: 1,
    minAge: 0,
    kidJoy: 3,
    luxury: 2,
    signature: 3,
    tags: { wildlife: 3, food_drink: 2, culture: 1, views_photo: 2, relax: 1 },
    audience: { solo: 2, couple: 2, family: 3, friends: 2, multigen: 3 },
    occasion: { reunion: 3, birthday: 2 },
  },
  {
    key: 'scape_park',
    match: [/scape ?park/i],
    emoji: '🌀',
    durationHours: 5,
    slot: 'half',
    categoryGroup: 'adventure_park',
    intensity: 4,
    water: 2,
    boat: 0,
    mobility: 3,
    minAge: 6,
    kidJoy: 3,
    luxury: 3,
    signature: 3,
    tags: { adrenaline: 3, views_photo: 3, snorkel_reef: 1, relax: 1, offroad: 1 },
    audience: { solo: 3, couple: 3, family: 3, friends: 3, multigen: 2 },
    occasion: { birthday: 2, honeymoon: 2 },
    conflicts: ['zipline'],
  },
  {
    key: 'zipline',
    match: [/zip ?line/i, /zipline/i, /tirolina/i, /tyrolienne/i],
    emoji: '🌿',
    durationHours: 5,
    slot: 'half',
    categoryGroup: 'adventure_park',
    intensity: 4,
    water: 0,
    boat: 0,
    mobility: 3,
    minAge: 8,
    kidJoy: 3,
    luxury: 1,
    signature: 2,
    tags: { adrenaline: 3, offroad: 2, views_photo: 3 },
    audience: { solo: 3, couple: 3, family: 2, friends: 3, multigen: 1 },
    occasion: { bachelor: 2, birthday: 2 },
    conflicts: ['scape_park'],
  },
  {
    key: 'dolphin',
    match: [/dolphin/i, /delfin/i, /dauphin/i],
    emoji: '🐬',
    durationHours: 3,
    slot: 'short',
    categoryGroup: 'wildlife',
    intensity: 1,
    water: 2,
    boat: 0,
    mobility: 1,
    minAge: 3,
    kidJoy: 3,
    luxury: 3,
    signature: 2,
    tags: { wildlife: 3, relax: 1, views_photo: 2 },
    audience: { solo: 2, couple: 3, family: 3, friends: 2, multigen: 3 },
    occasion: { honeymoon: 2, birthday: 3, reunion: 2 },
  },
  {
    key: 'scuba_doo',
    match: [/scuba ?doo/i],
    emoji: '🫧',
    durationHours: 3.5,
    slot: 'half',
    categoryGroup: 'watersport',
    intensity: 3,
    water: 3,
    boat: 1,
    mobility: 2,
    minAge: 10,
    kidJoy: 3,
    luxury: 2,
    signature: 2,
    tags: { snorkel_reef: 3, wildlife: 2, adrenaline: 1, views_photo: 2 },
    audience: { solo: 2, couple: 3, family: 3, friends: 3, multigen: 1 },
    occasion: { honeymoon: 2, birthday: 2, anniversary: 1 },
  },
  {
    key: 'deep_sea_fishing',
    match: [/fishing/i, /pesca/i, /angeln/i, /p[eê]che/i],
    emoji: '🎣',
    durationHours: 5,
    slot: 'half',
    categoryGroup: 'watersport',
    intensity: 2,
    water: 0,
    boat: 3,
    mobility: 2,
    minAge: 5,
    kidJoy: 2,
    servesAlcohol: true,
    luxury: 2,
    signature: 1,
    tags: { wildlife: 2, relax: 2, adrenaline: 1, food_drink: 1, views_photo: 1 },
    audience: { solo: 2, couple: 1, family: 2, friends: 3, multigen: 3 },
    occasion: { bachelor: 2, birthday: 2, reunion: 2 },
  },
  {
    key: 'banana_boat',
    match: [/banan/i],
    emoji: '🍌',
    durationHours: 2,
    slot: 'short',
    categoryGroup: 'watersport',
    intensity: 3,
    water: 3,
    boat: 1,
    mobility: 2,
    minAge: 6,
    kidJoy: 3,
    luxury: 1,
    signature: 1,
    tags: { adrenaline: 2, beach_island: 2 },
    audience: { solo: 1, couple: 1, family: 3, friends: 3, multigen: 2 },
    occasion: { bachelor: 3, birthday: 2, reunion: 3 },
  },
  {
    key: 'jet_ski',
    match: [/jet ?-?ski/i],
    emoji: '🌊',
    durationHours: 5,
    slot: 'half',
    categoryGroup: 'watersport',
    intensity: 5,
    water: 2,
    boat: 2,
    mobility: 2,
    minAge: 6,
    kidJoy: 2,
    luxury: 3,
    signature: 2,
    tags: { adrenaline: 3, beach_island: 2, views_photo: 2, snorkel_reef: 1 },
    audience: { solo: 2, couple: 3, family: 1, friends: 3, multigen: 1 },
    occasion: { honeymoon: 2, bachelor: 3, birthday: 2 },
    seatsPerUnit: 2,
  },
];

const FALLBACK_PROFILE: TourProfile = {
  key: 'unknown',
  match: [],
  emoji: '🌴',
  durationHours: 5,
  slot: 'half',
  categoryGroup: 'culture',
  intensity: 3,
  water: 1,
  boat: 1,
  mobility: 2,
  minAge: 6,
  kidJoy: 2,
  luxury: 2,
  signature: 1,
  tags: { beach_island: 1, views_photo: 1 },
  audience: { solo: 2, couple: 2, family: 2, friends: 2, multigen: 2 },
};

/**
 * Resolve a live catalogue title (EN or ES) to its structured profile.
 * Unknown titles get a neutral profile so newly added tours still show up.
 */
export const matchTourProfile = (title: string): TourProfile => {
  const clean = String(title ?? '').trim();
  if (!clean) return FALLBACK_PROFILE;

  for (const profile of TOUR_PROFILES) {
    if (profile.match.some((pattern) => pattern.test(clean))) {
      return profile;
    }
  }

  return { ...FALLBACK_PROFILE, key: `unknown:${clean.toLowerCase()}` };
};
