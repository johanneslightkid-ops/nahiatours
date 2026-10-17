/**
 * The question flow.
 *
 * Steps are declarative so the UI stays dumb: it renders whatever the current
 * step describes and the flow decides what is relevant. Solo travellers never
 * see a headcount stepper, childless groups never see kid ages, and every step
 * knows when it counts as answered.
 */
import type {
  AdultAgeBand,
  AimKey,
  BudgetBand,
  ConstraintKey,
  DayShape,
  KidAgeBand,
  TransportChoice,
  TravelProfile,
} from './types';
import type { InterestKey, OccasionKey, PartyType } from './tourProfiles';

export type StepId =
  | 'partyType'
  | 'headcount'
  | 'adultAge'
  | 'energy'
  | 'interests'
  | 'aim'
  | 'dayShape'
  | 'days'
  | 'budget'
  | 'transport'
  | 'constraints'
  | 'occasion'
  | 'logistics';

export type StepKind = 'choice' | 'multi' | 'counts' | 'scale' | 'stepper' | 'logistics';

export interface StepDef {
  id: StepId;
  kind: StepKind;
  /** Can be passed without answering. */
  optional?: boolean;
  /** Hidden when it cannot tell us anything new. */
  applies?: (profile: TravelProfile) => boolean;
  isAnswered: (profile: TravelProfile) => boolean;
  /** Single-choice steps jump forward on tap; multi-selects wait. */
  autoAdvance?: boolean;
  /** `core` is asked in the guided flow, `refine` is offered on the plan. */
  tier: 'core' | 'refine';
}

export const PARTY_TYPES: PartyType[] = ['solo', 'couple', 'family', 'friends', 'multigen'];
export const ADULT_AGES: AdultAgeBand[] = ['young', 'prime', 'mature', 'senior'];
export const KID_AGES: KidAgeBand[] = ['toddler', 'child', 'tween', 'teen'];
export const INTERESTS: InterestKey[] = [
  'beach_island',
  'snorkel_reef',
  'wildlife',
  'adrenaline',
  'offroad',
  'culture',
  'nightlife',
  'food_drink',
  'views_photo',
  'relax',
];
export const AIMS: AimKey[] = ['stories', 'unwind', 'together', 'adrenaline', 'romance', 'discover', 'party'];
export const DAY_SHAPES: DayShape[] = ['signature', 'balanced', 'packed', 'max'];
export const BUDGETS: BudgetBand[] = ['value', 'balanced', 'premium', 'open'];
export const TRANSPORTS: TransportChoice[] = ['included', 'private_day', 'private_full'];
export const CONSTRAINTS: ConstraintKey[] = [
  'non_swimmer',
  'seasick',
  'limited_mobility',
  'no_early',
  'no_alcohol',
  'early_nights',
  'sun_sensitive',
];
export const OCCASIONS: OccasionKey[] = ['none', 'honeymoon', 'anniversary', 'birthday', 'bachelor', 'reunion'];

export const MAX_INTERESTS = 5;

/**
 * The guided flow is the short list of questions a plan genuinely cannot be
 * built without, ordered so the fun one (what pulls you in) comes second and
 * the dull one (anything to plan around) comes last with a one-tap way out.
 *
 * Everything else — budget, pace, transport, what to take home, the date —
 * has a sensible default and is offered on the plan itself as a "fine-tune",
 * where the guest can see what each answer changes. Thirteen questions in a
 * row was the single biggest reason people left before seeing a plan.
 */
export const STEPS: StepDef[] = [
  {
    id: 'partyType',
    kind: 'choice',
    tier: 'core',
    autoAdvance: true,
    isAnswered: (p) => Boolean(p.partyType),
  },
  {
    id: 'headcount',
    kind: 'counts',
    tier: 'core',
    // A couple is two and a solo traveller is one: asking would be noise.
    applies: (p) => p.partyType !== 'solo' && p.partyType !== 'couple',
    isAnswered: (p) => p.adults + p.children > 0,
  },
  {
    id: 'interests',
    kind: 'multi',
    tier: 'core',
    isAnswered: (p) => p.interests.length > 0,
  },
  {
    id: 'energy',
    kind: 'scale',
    tier: 'core',
    isAnswered: () => true,
  },
  {
    id: 'adultAge',
    kind: 'choice',
    tier: 'core',
    autoAdvance: true,
    isAnswered: (p) => Boolean(p.adultAge),
  },
  {
    id: 'days',
    kind: 'stepper',
    tier: 'core',
    isAnswered: (p) => p.days >= 1,
  },
  {
    id: 'occasion',
    kind: 'choice',
    // Honeymoons, hen parties and milestone birthdays change the shortlist
    // most for couples and groups; for the rest it waits on the plan page.
    tier: 'core',
    optional: true,
    autoAdvance: true,
    applies: (p) => p.partyType === 'couple' || p.partyType === 'friends' || p.partyType === 'multigen',
    isAnswered: (p) => Boolean(p.occasion),
  },
  {
    id: 'constraints',
    kind: 'multi',
    tier: 'core',
    optional: true,
    isAnswered: () => true,
  },
  {
    id: 'budget',
    kind: 'choice',
    tier: 'refine',
    autoAdvance: true,
    isAnswered: (p) => Boolean(p.budget),
  },
  {
    id: 'dayShape',
    kind: 'choice',
    tier: 'refine',
    autoAdvance: true,
    isAnswered: (p) => Boolean(p.dayShape),
  },
  {
    id: 'aim',
    kind: 'choice',
    tier: 'refine',
    autoAdvance: true,
    isAnswered: (p) => Boolean(p.aim),
  },
  {
    id: 'transport',
    kind: 'choice',
    tier: 'refine',
    autoAdvance: true,
    isAnswered: (p) => Boolean(p.transport),
  },
  {
    id: 'occasion',
    kind: 'choice',
    tier: 'refine',
    optional: true,
    autoAdvance: true,
    applies: (p) => !(p.partyType === 'couple' || p.partyType === 'friends' || p.partyType === 'multigen'),
    isAnswered: (p) => Boolean(p.occasion),
  },
  {
    id: 'logistics',
    kind: 'logistics',
    tier: 'refine',
    optional: true,
    isAnswered: () => true,
  },
];

const applies = (step: StepDef, profile: TravelProfile) => (step.applies ? step.applies(profile) : true);

/** The guided questions, in order, for this traveller. */
export const visibleSteps = (profile: TravelProfile): StepDef[] =>
  STEPS.filter((step) => step.tier === 'core' && applies(step, profile));

/** The optional answers offered on the plan page. */
export const refineSteps = (profile: TravelProfile): StepDef[] =>
  STEPS.filter((step) => step.tier === 'refine' && applies(step, profile));

/** Any step by id, whichever tier it sits in for this traveller. */
export const stepById = (profile: TravelProfile, id: StepId): StepDef | undefined =>
  STEPS.find((step) => step.id === id && applies(step, profile)) ?? STEPS.find((step) => step.id === id);

/**
 * Who comes first in the party list depends on who actually travels here
 * from each market: Latin-American visitors come as families, very often with
 * the grandparents; German-speaking and French guests are mostly couples and
 * families; North America sends couples, families and friends' trips alike.
 */
export const partyOrder = (locale: string): PartyType[] => {
  if (locale.startsWith('es')) return ['family', 'multigen', 'couple', 'friends', 'solo'];
  if (locale.startsWith('de')) return ['couple', 'family', 'friends', 'solo', 'multigen'];
  if (locale.startsWith('fr')) return ['couple', 'family', 'friends', 'multigen', 'solo'];
  return ['couple', 'family', 'friends', 'solo', 'multigen'];
};

/** Sensible defaults so a skipped headcount still prices correctly. */
export const defaultsForParty = (party: PartyType): Partial<TravelProfile> => {
  switch (party) {
    case 'solo':
      return { adults: 1, children: 0, kidAges: [] };
    case 'couple':
      return { adults: 2, children: 0, kidAges: [] };
    case 'family':
      return { adults: 2, children: 2, kidAges: ['child'] };
    case 'friends':
      return { adults: 4, children: 0, kidAges: [] };
    case 'multigen':
      return { adults: 4, children: 2, kidAges: ['child'] };
    default:
      return {};
  }
};
