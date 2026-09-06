/**
 * The planning engine.
 *
 * Three stages:
 *   1. price   — every catalogue tour is priced for this exact group
 *   2. score   — weighted fit across interests, energy, audience, budget, kids
 *   3. assemble— greedy day-by-day fill that respects real-world timing rules
 *
 * The engine is pure: give it the live catalogue plus a TravelProfile and it
 * returns a DayPlan. No network, no React — which makes it easy to reason about
 * and cheap to recompute on every answer change.
 */
import type { PricingOption } from '../services/toursService';
import type { PlannerCopy } from './copy';
import type { DaySlot, InterestKey, PartyType, TourProfile } from './tourProfiles';
import type {
  AimKey,
  BudgetBand,
  CatalogueEntry,
  DayPlan,
  KidAgeBand,
  PlanDay,
  PlanItem,
  ScoredTour,
  TourPricing,
  TransportPlan,
  TravelProfile,
} from './types';

// ── Tunables ────────────────────────────────────────────────────────────────

const BUDGET_CAPS: Record<BudgetBand, number | null> = {
  value: 80,
  balanced: 150,
  premium: 260,
  open: null,
};

const KID_AGE_YEARS: Record<KidAgeBand, number> = {
  toddler: 1,
  child: 5,
  tween: 10,
  teen: 15,
};

const DAY_TARGET: Record<string, number> = {
  signature: 1,
  balanced: 2,
  packed: 3,
  max: 4,
};

/** How much each "what do you want to take home" answer pulls each interest. */
const AIM_AFFINITY: Record<AimKey, Partial<Record<InterestKey, number>>> = {
  stories: { adrenaline: 2, offroad: 2, beach_island: 1, views_photo: 2, culture: 1 },
  unwind: { relax: 3, beach_island: 2, food_drink: 1 },
  together: { wildlife: 2, beach_island: 2, food_drink: 2, culture: 1 },
  adrenaline: { adrenaline: 3, offroad: 3, views_photo: 1 },
  romance: { relax: 2, beach_island: 2, food_drink: 2, views_photo: 2 },
  discover: { culture: 3, food_drink: 2, wildlife: 1, offroad: 1 },
  party: { nightlife: 3, food_drink: 1, beach_island: 1 },
};

/** Energy nudge implied by the aim — a wish for rest lowers the target pace. */
const AIM_ENERGY_SHIFT: Record<AimKey, number> = {
  stories: 0.5,
  unwind: -1,
  together: 0,
  adrenaline: 1,
  romance: -0.5,
  discover: 0,
  party: 0.5,
};

const VEHICLES: Array<{ maxPax: number; en: string; es: string }> = [
  { maxPax: 3, en: 'Economy sedan', es: 'Sedán económico' },
  { maxPax: 5, en: 'SUV / family vehicle', es: 'SUV / vehículo familiar' },
  { maxPax: 7, en: 'Minivan', es: 'Minivan' },
  { maxPax: 14, en: 'Sprinter group van', es: 'Sprinter para grupos' },
  { maxPax: 24, en: 'Mini bus', es: 'Mini bus' },
  { maxPax: 999, en: 'Coach bus', es: 'Autobús grande' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isAdultTier = (tier: string) => /adult|adulto/i.test(tier);
const isChildTier = (tier: string) => /child|kid|ni[ñn]/i.test(tier);

const youngestChildAge = (profile: TravelProfile): number => {
  if (profile.children <= 0) return 99;
  if (profile.kidAges.length === 0) return 5;
  return Math.min(...profile.kidAges.map((band) => KID_AGE_YEARS[band] ?? 5));
};

export const budgetCap = (band?: BudgetBand): number | null =>
  band ? BUDGET_CAPS[band] : null;

/**
 * Price one tour for this group using the live pricing tiers.
 * Multi-tier tours (e.g. Coco Bongo regular / gold / front row) pick the tier
 * that matches the guest's budget band instead of always quoting the cheapest.
 */
export const priceTour = (
  entry: CatalogueEntry,
  profile: TravelProfile,
  copy: PlannerCopy
): TourPricing => {
  const options = entry.tour.pricingOptions?.filter((option) => (option.amount ?? 0) > 0) ?? [];
  const adults = Math.max(0, profile.adults);
  const children = Math.max(0, profile.children);
  const heads = Math.max(1, adults + children);

  if (options.length === 0) {
    return { lines: [], total: 0, perPerson: 0, childrenAtAdultRate: false };
  }

  const adultOption = options.find((option) => isAdultTier(option.tier));
  const childOption = options.find((option) => isChildTier(option.tier));

  // Tiered tickets (no adult/child split) — choose by budget appetite.
  if (!adultOption && !childOption && options.length > 1) {
    const sorted = [...options].sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));
    const pickIndex =
      profile.budget === 'open'
        ? sorted.length - 1
        : profile.budget === 'premium'
        ? Math.min(1, sorted.length - 1)
        : 0;
    const chosen = sorted[pickIndex];
    const unit = chosen.amount ?? 0;
    return {
      lines: [{ label: chosen.tier, qty: heads, unit, total: unit * heads }],
      total: unit * heads,
      perPerson: unit,
      tierNote: chosen.tier,
      childrenAtAdultRate: false,
    };
  }

  const base: PricingOption = adultOption ?? options[0];
  const baseUnit = base.amount ?? 0;
  const lines = [];
  let total = 0;
  let childrenAtAdultRate = false;

  // Without a child tier everyone pays the adult rate, so it stays one line.
  const childOnAdultRate = children > 0 && !childOption;
  const baseQty = adults + (childOnAdultRate ? children : 0);

  if (baseQty > 0) {
    lines.push({ label: base.tier, qty: baseQty, unit: baseUnit, total: baseUnit * baseQty });
    total += baseUnit * baseQty;
    childrenAtAdultRate = childOnAdultRate;
  }

  if (children > 0 && childOption) {
    const unit = childOption.amount ?? 0;
    lines.push({ label: childOption.tier, qty: children, unit, total: unit * children });
    total += unit * children;
  }

  return {
    lines,
    total,
    perPerson: Math.round(total / heads),
    childrenAtAdultRate,
  };
};

// ── Scoring ─────────────────────────────────────────────────────────────────

const interestLabels = (
  keys: InterestKey[],
  copy: PlannerCopy
): string => keys.map((key) => copy.interests[key].label.toLowerCase()).join(', ');

const hardExclusion = (
  tourProfile: TourProfile,
  profile: TravelProfile,
  copy: PlannerCopy
): string | undefined => {
  const youngest = youngestChildAge(profile);

  if (profile.children > 0 && tourProfile.adultsOnly) {
    return copy.cautions.adults;
  }
  if (profile.children > 0 && tourProfile.minAge > youngest) {
    return copy.cautions.minAge(tourProfile.minAge);
  }
  if (profile.constraints.includes('limited_mobility') && tourProfile.mobility >= 3) {
    return copy.cautions.mobility;
  }
  if (profile.constraints.includes('early_nights') && tourProfile.slot === 'evening') {
    return copy.questions.constraints.options.early_nights.label;
  }
  return undefined;
};

export const scoreTour = (
  entry: CatalogueEntry,
  profile: TravelProfile,
  copy: PlannerCopy
): ScoredTour => {
  const tp = entry.profile;
  const pricing = priceTour(entry, profile, copy);
  const cap = budgetCap(profile.budget);
  const reasons: string[] = [];
  const cautions: string[] = [];

  const excluded = hardExclusion(tp, profile, copy);

  // 1. Interests — the heaviest single signal.
  const selected = profile.interests;
  const matched: InterestKey[] = [];
  let interestRaw = 0;
  selected.forEach((key) => {
    const weight = tp.tags[key] ?? 0;
    interestRaw += weight;
    if (weight >= 2) matched.push(key);
  });
  const interestNorm = selected.length
    ? clamp(interestRaw / (3 * Math.min(selected.length, 3)), 0, 1)
    : 0.4;
  const interest = interestNorm * 42;

  // 2. Energy fit against the requested pace (nudged by the stated aim).
  const targetEnergy = clamp(profile.energy + (profile.aim ? AIM_ENERGY_SHIFT[profile.aim] : 0), 1, 5);
  const energy = (1 - Math.abs(tp.intensity - targetEnergy) / 4) * 25;

  // 3. Who it is built for.
  const party: PartyType = profile.partyType ?? 'couple';
  const audience = ((tp.audience[party] ?? 1) / 3) * 18;

  // 4. The feeling they want to take home.
  let aim = 0;
  if (profile.aim) {
    const affinity = AIM_AFFINITY[profile.aim];
    let raw = 0;
    let max = 0;
    (Object.keys(affinity) as InterestKey[]).forEach((key) => {
      const w = affinity[key] ?? 0;
      raw += (tp.tags[key] ?? 0) * w;
      max += 3 * w;
    });
    aim = max > 0 ? (raw / max) * 14 : 0;
  }

  // 5. Occasion.
  const occasion = ((tp.occasion?.[profile.occasion] ?? 0) / 3) * 10;

  // 6. Budget fit.
  let budget = 0;
  if (cap === null) {
    budget = 4 + tp.luxury * 2;
  } else if (pricing.perPerson <= cap) {
    budget = 10;
  } else {
    const overshoot = pricing.perPerson / cap;
    budget = -clamp((overshoot - 1) * 60, 0, 38);
    cautions.push(copy.cautions.overBudget);
  }

  // 7. Children.
  let kids = 0;
  if (profile.children > 0) {
    kids = (tp.kidJoy / 3) * 16;
    if (tp.durationHours >= 10 && youngestChildAge(profile) < 8) kids -= 10;
  }

  // 8. Comfort, constraints and physical reality.
  let comfort = 0;
  if (profile.adultAge === 'senior' && tp.mobility >= 3) comfort -= 18;
  if (profile.adultAge === 'senior' && tp.durationHours >= 10) comfort -= 6;
  if (profile.adultAge === 'mature' && tp.mobility >= 3) comfort -= 5;
  if (profile.adultAge === 'young' && tp.intensity >= 4) comfort += 4;
  if (profile.constraints.includes('limited_mobility') && tp.mobility === 2) comfort -= 15;
  if (profile.adultAge === 'senior' && tp.boat >= 2) comfort -= 6;
  if (profile.constraints.includes('non_swimmer') && tp.water >= 3) comfort -= 22;
  if (profile.constraints.includes('non_swimmer') && tp.water === 2) comfort -= 6;
  if (profile.constraints.includes('seasick') && tp.boat >= 3) comfort -= 20;
  if (profile.constraints.includes('seasick') && tp.boat === 2) comfort -= 7;
  if (profile.constraints.includes('no_early') && tp.earlyStart) comfort -= 14;
  if (profile.constraints.includes('no_alcohol') && tp.servesAlcohol) comfort -= 6;
  if (profile.constraints.includes('sun_sensitive') && tp.durationHours >= 8 && tp.slot !== 'evening') comfort -= 8;
  if (profile.partyType === 'multigen' && tp.mobility >= 3) comfort -= 8;

  const signature = tp.signature * 3;

  const breakdown = { interest, energy, audience, aim, occasion, budget, kids, comfort, signature };
  const score = interest + energy + audience + aim + occasion + budget + kids + comfort + signature;

  // ── Reason lines, ranked by how much they actually contributed ────────────
  const candidates: Array<{ weight: number; text: string }> = [];
  if (matched.length > 0) {
    candidates.push({ weight: interest, text: copy.reasons.interest(interestLabels(matched.slice(0, 2), copy)) });
  }
  if (energy >= 18) {
    candidates.push({ weight: energy, text: copy.reasons.energy(tp.intensity) });
  }
  if (audience >= 15) {
    candidates.push({ weight: audience, text: copy.reasons.audience(copy.parties[party]) });
  }
  if (profile.children > 0 && tp.kidJoy === 3) {
    candidates.push({ weight: kids + 6, text: copy.reasons.kidsMagnet });
  } else if (profile.children > 0 && tp.minAge <= youngestChildAge(profile) && tp.kidJoy >= 2) {
    candidates.push({ weight: kids, text: copy.reasons.kids(Math.max(tp.minAge, 3)) });
  }
  if (profile.aim && aim >= 8) {
    candidates.push({ weight: aim, text: copy.reasons.aim(copy.aims[profile.aim]) });
  }
  if (occasion >= 6) {
    candidates.push({ weight: occasion, text: copy.reasons.occasion(copy.occasions[profile.occasion]) });
  }
  if (cap !== null && pricing.perPerson > 0 && pricing.perPerson <= cap) {
    candidates.push({ weight: 9, text: copy.reasons.budget(pricing.perPerson) });
  }
  if (tp.mobility === 1 && (profile.adultAge === 'senior' || profile.constraints.includes('limited_mobility'))) {
    candidates.push({ weight: 12, text: copy.reasons.gentle });
  }
  if (tp.signature === 3) {
    candidates.push({ weight: 6, text: copy.reasons.signature });
  }

  candidates.sort((a, b) => b.weight - a.weight);
  reasons.push(...candidates.slice(0, 3).map((c) => c.text));

  // ── Honest warnings ───────────────────────────────────────────────────────
  if (tp.boat >= 3) cautions.push(copy.cautions.boat);
  if (tp.water >= 3) cautions.push(copy.cautions.water);
  if (tp.earlyStart) cautions.push(copy.cautions.early);
  if (tp.durationHours >= 10) cautions.push(copy.cautions.long(tp.durationHours));
  if (tp.mobility >= 3) cautions.push(copy.cautions.mobility);
  if (tp.adultsOnly) cautions.push(copy.cautions.adults);

  return {
    entry,
    score: Math.round(score * 10) / 10,
    breakdown,
    reasons,
    cautions: Array.from(new Set(cautions)).slice(0, 3),
    pricing,
    excluded,
  };
};

// ── Day assembly ────────────────────────────────────────────────────────────

interface DayState {
  load: number;
  count: number;
  hasEvening: boolean;
  heavy: boolean;
  groups: Set<string>;
}

/**
 * Nobody enjoys four pickups in one day. Three is already a lot, and the
 * time-based capacity below usually stops well before that.
 */
const MAX_ITEMS_PER_DAY = 3;

/**
 * Share of a day's daylight an excursion consumes. Derived from the advertised
 * door-to-door duration rather than a coarse slot weight, so a 12-hour island
 * crossing owns the whole day while a 3-hour speedboat run leaves room.
 */
export const daytimeLoad = (tourProfile: TourProfile): number =>
  tourProfile.slot === 'evening' ? 0 : Math.min(1, tourProfile.durationHours / 10);

/** A day that already runs 8+ hours has no room for a club night afterwards. */
const isHeavy = (tourProfile: TourProfile) => tourProfile.durationHours >= 8;

const fitsDay = (tourProfile: TourProfile, state: DayState): boolean => {
  if (state.count >= MAX_ITEMS_PER_DAY) return false;
  // Two excursions of the same kind on one day is a wasted day — two boat
  // crossings, two off-road trips, two clubs. Hard rule, not a preference.
  if (state.groups.has(tourProfile.categoryGroup)) return false;

  if (tourProfile.slot === 'evening') {
    return !state.hasEvening && !state.heavy;
  }
  if (state.hasEvening && isHeavy(tourProfile)) return false;
  return state.load + daytimeLoad(tourProfile) <= 1.001;
};

/** Daytime excursions first, the night out last. */
const SLOT_ORDER: Record<DaySlot, number> = { full: 0, half: 1, short: 2, evening: 3 };

const slotLabel = (slot: DaySlot, copy: PlannerCopy) => copy.slots[slot];

export interface PlanOptions {
  /** Tours the guest added by hand. They always land in the plan. */
  pinned?: string[];
  /** Tours the guest removed. Never auto-picked again, but still offerable. */
  banned?: string[];
}

/** Hard ceiling on how far a plan may grow to host hand-picked excursions. */
export const MAX_PLAN_DAYS = 7;

export const buildPlan = (
  catalogue: CatalogueEntry[],
  profile: TravelProfile,
  copy: PlannerCopy,
  locale: string = 'en',
  options: PlanOptions = {}
): DayPlan => {
  const pinned = options.pinned ?? [];
  const banned = options.banned ?? [];

  const scored = catalogue
    .map((entry) => scoreTour(entry, profile, copy))
    .sort((a, b) => b.score - a.score);

  const available = scored.filter((item) => !item.excluded);
  const ruledOut = scored
    .filter((item) => item.excluded)
    .map((item) => ({ title: item.entry.tour.title, reason: item.excluded as string }));

  const heads = Math.max(1, profile.adults + profile.children);
  const cap = budgetCap(profile.budget);
  const targetPerDay = Math.min(MAX_ITEMS_PER_DAY, DAY_TARGET[profile.dayShape ?? 'balanced'] ?? 2);
  const requestedDays = clamp(profile.days || 1, 1, MAX_PLAN_DAYS);

  const usedKeys = new Set<string>();
  const usedGroups = new Map<string, number>();

  interface DayBucket {
    state: DayState;
    items: PlanItem[];
    total: number;
  }

  const emptyState = (): DayState => ({
    load: 0,
    count: 0,
    hasEvening: false,
    heavy: false,
    groups: new Set<string>(),
  });

  const buckets: DayBucket[] = Array.from({ length: requestedDays }, () => ({
    state: emptyState(),
    items: [],
    total: 0,
  }));

  const place = (bucket: DayBucket, item: ScoredTour, byGuest: boolean) => {
    const slot = item.entry.profile.slot;
    bucket.items.push({ ...item, slot, slotLabel: slotLabel(slot, copy), pinned: byGuest });
    usedKeys.add(item.entry.profile.key);
    usedGroups.set(
      item.entry.profile.categoryGroup,
      (usedGroups.get(item.entry.profile.categoryGroup) ?? 0) + 1
    );
    bucket.state.groups.add(item.entry.profile.categoryGroup);
    bucket.state.load += daytimeLoad(item.entry.profile);
    bucket.state.count += 1;
    if (slot === 'evening') bucket.state.hasEvening = true;
    if (isHeavy(item.entry.profile)) bucket.state.heavy = true;
    bucket.total += item.pricing.total;
  };

  const conflictsWith = (item: ScoredTour, key: string) => {
    const other = available.find((candidate) => candidate.entry.profile.key === key);
    return (
      (item.entry.profile.conflicts ?? []).includes(key) ||
      (other?.entry.profile.conflicts ?? []).includes(item.entry.profile.key)
    );
  };

  const conflictsWithPlan = (item: ScoredTour) =>
    Array.from(usedKeys).some((key) => conflictsWith(item, key));

  // ── 1. Hand-picked excursions go in first ────────────────────────────────
  // They ignore the "how many per day" preference (the guest asked for them by
  // name) but still respect the clock, and the plan grows a day rather than
  // dropping one silently.
  pinned.forEach((key) => {
    const item = available.find((candidate) => candidate.entry.profile.key === key);
    if (!item || usedKeys.has(key)) return;

    // A newer pick wins over an older one it cannot coexist with — picking the
    // lobster Saona should swap out the classic Saona, not be ignored.
    buckets.forEach((bucket) => {
      const kept = bucket.items.filter((existing) => !conflictsWith(item, existing.entry.profile.key));
      if (kept.length !== bucket.items.length) {
        bucket.items
          .filter((existing) => conflictsWith(item, existing.entry.profile.key))
          .forEach((dropped) => usedKeys.delete(dropped.entry.profile.key));
        bucket.items = kept;
        bucket.total = kept.reduce((sum, entry) => sum + entry.pricing.total, 0);
        bucket.state = {
          load: kept.reduce((sum, entry) => sum + daytimeLoad(entry.entry.profile), 0),
          count: kept.length,
          hasEvening: kept.some((entry) => entry.slot === 'evening'),
          heavy: kept.some((entry) => isHeavy(entry.entry.profile)),
          groups: new Set(kept.map((entry) => entry.entry.profile.categoryGroup)),
        };
      }
    });

    const home = buckets.find((bucket) => fitsDay(item.entry.profile, bucket.state));
    if (home) {
      place(home, item, true);
      return;
    }

    if (buckets.length < MAX_PLAN_DAYS) {
      const extraDay: DayBucket = { state: emptyState(), items: [], total: 0 };
      buckets.push(extraDay);
      place(extraDay, item, true);
    }
  });

  // ── 2. Fill the remaining room around them ───────────────────────────────
  buckets.forEach((bucket) => {
    // A hand-picked excursion adds to the day rather than eating the slot the
    // guest asked for: one pick plus "one signature experience" means two, as
    // long as the clock and the per-day ceiling still allow it.
    const handPicked = bucket.items.filter((item) => item.pinned).length;
    const target = Math.min(MAX_ITEMS_PER_DAY, targetPerDay + handPicked);

    while (bucket.items.length < target) {
      const ranked = available
        .filter((item) => !usedKeys.has(item.entry.profile.key))
        .filter((item) => !banned.includes(item.entry.profile.key))
        .filter((item) => fitsDay(item.entry.profile, bucket.state))
        .filter((item) => !conflictsWithPlan(item))
        .map((item) => {
          let adjusted = item.score;
          // Same-day repeats are already impossible; this keeps variety across
          // the whole plan.
          const group = item.entry.profile.categoryGroup;
          if ((usedGroups.get(group) ?? 0) > 0) adjusted -= 18;
          // Keep the day inside the stated budget where possible.
          if (cap !== null) {
            const projected = (bucket.total + item.pricing.total) / heads;
            if (projected > cap) adjusted -= clamp((projected / cap - 1) * 70, 0, 45);
          }
          return { item, adjusted };
        })
        .sort((a, b) => b.adjusted - a.adjusted);

      const next = ranked[0];
      // Below this bar the pick would hurt the plan more than an empty slot.
      if (!next || next.adjusted < 12) break;
      // Never blow far past the stated budget just to fill a slot — a day with
      // one great excursion beats a day the guest cannot afford.
      if (cap !== null && bucket.items.length > 0) {
        const projected = (bucket.total + next.item.pricing.total) / heads;
        if (projected > cap * 1.5) break;
      }
      place(bucket, next.item, false);
    }
  });

  const days: PlanDay[] = buckets.map((bucket, index) => {
    const items = [...bucket.items].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
    // Explain a short day rather than letting excursions seem to vanish.
    const handPicked = items.filter((item) => item.pinned).length;
    const target = Math.min(MAX_ITEMS_PER_DAY, targetPerDay + handPicked);
    const squeezed = items.length > 0 && handPicked > 0 && items.length < target;
    return {
      index: index + 1,
      items,
      dayTotal: bucket.total,
      activeHours: items.reduce((sum, item) => sum + item.entry.profile.durationHours, 0),
      note: squeezed ? copy.result.dayFull : undefined,
    };
  });

  // Removed tours stay on offer — taking one out must never be a one-way door.
  const alternates = available
    .filter((item) => !usedKeys.has(item.entry.profile.key))
    .filter((item) => !conflictsWithPlan(item))
    .slice(0, 6);

  const grandTotal = days.reduce((sum, day) => sum + day.dayTotal, 0);
  const perPersonTotal = Math.round(grandTotal / heads);
  const perPersonPerDay = perPersonTotal / Math.max(1, days.length);

  return {
    persona: pickPersona(profile, days, copy),
    days,
    alternates,
    grandTotal,
    perPersonTotal,
    budgetCapPerPersonPerDay: cap,
    overBudget: cap !== null && perPersonPerDay > cap * 1.05,
    transport: buildTransportPlan(profile, copy, locale),
    headcount: heads,
    ruledOut,
  };
};

// ── Persona ─────────────────────────────────────────────────────────────────

const topInterest = (profile: TravelProfile): InterestKey | undefined => profile.interests[0];

export const pickPersona = (
  profile: TravelProfile,
  days: PlanDay[],
  copy: PlannerCopy
): { title: string; blurb: string; emoji: string } => {
  const P = copy.personas;
  const interests = profile.interests;
  const has = (key: InterestKey) => interests.includes(key);
  const groups = new Set(days.flatMap((day) => day.items.map((item) => item.entry.profile.categoryGroup)));

  const pick = (key: keyof typeof P) => ({ ...P[key] });

  if (profile.adultAge === 'senior' || profile.constraints.includes('limited_mobility')) {
    if (profile.energy <= 3) return pick('gentle_wanderer');
  }
  if (topInterest(profile) === 'snorkel_reef') {
    return pick('reef_chaser');
  }
  if (profile.energy >= 4 && (has('adrenaline') || has('offroad') || profile.aim === 'adrenaline')) {
    return pick('thrill_seeker');
  }
  if (profile.children > 0 && (profile.partyType === 'family' || profile.partyType === 'multigen')) {
    return pick('family_explorer');
  }
  if (profile.aim === 'party' && profile.partyType === 'friends') {
    return pick('crew_of_legends');
  }
  if (has('nightlife') || groups.has('nightlife')) {
    return pick('night_legend');
  }
  if (
    profile.partyType === 'couple' &&
    (profile.aim === 'romance' || profile.occasion === 'honeymoon' || profile.occasion === 'anniversary')
  ) {
    return pick('slow_romantic');
  }
  if (has('snorkel_reef') && profile.energy >= 3) {
    return pick('reef_chaser');
  }
  if (has('culture') && (profile.aim === 'discover' || topInterest(profile) === 'culture')) {
    return pick('culture_seeker');
  }
  if (has('beach_island') && profile.energy <= 2) {
    return pick('island_dreamer');
  }
  if (profile.partyType === 'friends') {
    return pick('crew_of_legends');
  }
  return pick('all_rounder');
};

// ── Transport ───────────────────────────────────────────────────────────────

export const recommendVehicle = (passengers: number, locale: string): string => {
  const vehicle = VEHICLES.find((v) => passengers <= v.maxPax) ?? VEHICLES[VEHICLES.length - 1];
  return locale.startsWith('es') ? vehicle.es : vehicle.en;
};

const buildTransportPlan = (
  profile: TravelProfile,
  copy: PlannerCopy,
  locale: string
): TransportPlan => {
  const passengers = Math.max(1, profile.adults + profile.children);
  const vehicleLabel = recommendVehicle(passengers, locale);
  const choice = profile.transport ?? 'included';

  return {
    choice,
    vehicleLabel,
    vehicleNote:
      choice === 'included' ? copy.result.transportIncluded : copy.result.transportQuote,
    passengers,
  };
};

// ── WhatsApp hand-off ───────────────────────────────────────────────────────

export const buildPlanMessage = (
  plan: DayPlan,
  profile: TravelProfile,
  copy: PlannerCopy,
  /** Configured company name, so the message never hardcodes a brand. */
  brandName: string
): string => {
  const lines: string[] = [];
  lines.push(copy.whatsapp.intro(brandName));
  lines.push('');
  lines.push(`*${copy.whatsapp.profile}:* ${plan.persona.title}`);
  lines.push(
    `• ${copy.result.priceFor(profile.adults, profile.children)}${
      profile.partyType ? ` · ${copy.questions.partyType.options[profile.partyType].label}` : ''
    }`
  );
  if (profile.interests.length > 0) {
    lines.push(`• ${profile.interests.map((key) => copy.interests[key].label).join(', ')}`);
  }
  if (profile.occasion !== 'none') {
    lines.push(`• ${copy.questions.occasion.options[profile.occasion].label}`);
  }
  if (profile.startDate) lines.push(`• ${copy.whatsapp.date}: ${profile.startDate}`);
  if (profile.pickupZone) lines.push(`• ${copy.whatsapp.zone}: ${profile.pickupZone}`);

  lines.push('');
  lines.push(`*${copy.whatsapp.plan}:*`);
  plan.days.forEach((day) => {
    if (day.items.length === 0) return;
    lines.push(`${copy.result.dayLabel(day.index)}`);
    day.items.forEach((item) => {
      const tier = item.pricing.tierNote ? ` (${item.pricing.tierNote})` : '';
      lines.push(`  • ${item.entry.tour.title}${tier} — $${item.pricing.total} USD`);
    });
  });

  lines.push('');
  lines.push(`*${copy.whatsapp.total}:* $${plan.grandTotal} USD (${plan.headcount} pax)`);
  lines.push(
    `*${copy.whatsapp.transport}:* ${
      profile.transport ? copy.questions.transport.options[profile.transport].label : ''
    }${plan.transport.choice === 'included' ? '' : ` · ${plan.transport.vehicleLabel}`}`
  );
  lines.push('');
  lines.push(copy.whatsapp.closing);

  return lines.join('\n');
};
