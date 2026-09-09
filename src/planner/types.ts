import type { Tour } from '../services/toursService';
import type {
  CategoryGroup,
  DaySlot,
  InterestKey,
  OccasionKey,
  PartyType,
  TourProfile,
} from './tourProfiles';

export type AdultAgeBand = 'young' | 'prime' | 'mature' | 'senior';
export type KidAgeBand = 'toddler' | 'child' | 'tween' | 'teen';
export type DayShape = 'signature' | 'balanced' | 'packed' | 'max';
export type BudgetBand = 'value' | 'balanced' | 'premium' | 'open';
export type TransportChoice = 'included' | 'private_day' | 'private_full';
export type AimKey =
  | 'stories'
  | 'unwind'
  | 'together'
  | 'adrenaline'
  | 'romance'
  | 'discover'
  | 'party';
export type ConstraintKey =
  | 'non_swimmer'
  | 'seasick'
  | 'limited_mobility'
  | 'no_early'
  | 'no_alcohol'
  | 'early_nights'
  | 'sun_sensitive';

export interface TravelProfile {
  partyType?: PartyType;
  adults: number;
  children: number;
  kidAges: KidAgeBand[];
  adultAge?: AdultAgeBand;
  /** 1 = gentle · 5 = wild. */
  energy: number;
  interests: InterestKey[];
  aim?: AimKey;
  dayShape?: DayShape;
  days: number;
  budget?: BudgetBand;
  transport?: TransportChoice;
  constraints: ConstraintKey[];
  occasion: OccasionKey;
  startDate?: string;
  pickupZone?: string;
}

export const EMPTY_PROFILE: TravelProfile = {
  adults: 2,
  children: 0,
  kidAges: [],
  energy: 3,
  interests: [],
  days: 1,
  constraints: [],
  occasion: 'none',
};

/** A live catalogue tour joined with its structured profile. */
export interface CatalogueEntry {
  tour: Tour;
  profile: TourProfile;
  slug: string;
}

export interface PriceLine {
  label: string;
  qty: number;
  unit: number;
  total: number;
}

export interface TourPricing {
  lines: PriceLine[];
  total: number;
  perPerson: number;
}

export interface ScoreBreakdown {
  interest: number;
  energy: number;
  audience: number;
  aim: number;
  occasion: number;
  budget: number;
  kids: number;
  comfort: number;
  signature: number;
}

export interface ScoredTour {
  entry: CatalogueEntry;
  score: number;
  breakdown: ScoreBreakdown;
  /** Human-readable "why this fits you" lines, ranked. */
  reasons: string[];
  /** Soft warnings the guest should know about. */
  cautions: string[];
  pricing: TourPricing;
  excluded?: string;
}

export interface PlanItem extends ScoredTour {
  slot: DaySlot;
  slotLabel: string;
  /** True when the guest added this one by hand rather than the engine. */
  pinned: boolean;
}

export interface PlanDay {
  index: number;
  dateLabel?: string;
  items: PlanItem[];
  dayTotal: number;
  activeHours: number;
  /** Set when a hand-picked excursion used up the day's remaining time. */
  note?: string;
}

export interface TransportPlan {
  choice: TransportChoice;
  vehicleLabel: string;
  vehicleNote: string;
  passengers: number;
}

export interface DayPlan {
  persona: { title: string; blurb: string; emoji: string };
  days: PlanDay[];
  alternates: ScoredTour[];
  grandTotal: number;
  perPersonTotal: number;
  budgetCapPerPersonPerDay: number | null;
  overBudget: boolean;
  transport: TransportPlan;
  headcount: number;
  /** Keys of tours ruled out by hard constraints, with the reason. */
  ruledOut: Array<{ title: string; reason: string }>;
}

export type { CategoryGroup, DaySlot, InterestKey, OccasionKey, PartyType, TourProfile };
