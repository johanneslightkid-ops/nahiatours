import type { IconType } from 'react-icons';
import {
  TbAlarmOff, TbBeach, TbBolt, TbBook2, TbBuildingMonument, TbBus, TbCake, TbCalendar, TbCalendarUser, TbCamera, TbCar,
  TbCoin, TbCoins, TbCompass, TbConfetti, TbCrown, TbDiamond, TbFeather, TbFriends, TbGauge, TbGlassFull, TbGlassOff,
  TbHeart, TbHeartHandshake, TbHome, TbLayoutColumns, TbLifebuoy, TbMapPin, TbMoodKid, TbMoon, TbMusic, TbNumbers,
  TbParachute, TbPaw, TbPlaneArrival, TbRings, TbRipple, TbRocket, TbScale, TbScubaMask, TbShieldCheck, TbStack2,
  TbSteeringWheel, TbSun, TbSunOff, TbTarget, TbToolsKitchen2, TbUser, TbUsers, TbUsersGroup, TbWheelchair, TbYoga,
} from 'react-icons/tb';
import type { StepId } from './questions';

/**
 * The planner's symbols: one line icon per question and per answer, in place
 * of the emoji they used to carry. Emoji render differently on every phone
 * and read as playful; a single drawn set reads as considered, and takes the
 * site's colours. The emoji stay in the copy files (the voice guide and older
 * screens still have them) — only what is drawn on screen comes from here.
 */
export const STEP_ICONS: Record<StepId, IconType> = {
  partyType: TbUsers,
  headcount: TbNumbers,
  interests: TbHeart,
  energy: TbGauge,
  adultAge: TbCalendarUser,
  days: TbCalendar,
  occasion: TbConfetti,
  constraints: TbShieldCheck,
  budget: TbCoin,
  dayShape: TbLayoutColumns,
  aim: TbTarget,
  transport: TbBus,
  logistics: TbMapPin,
};

/** By `${step}.${option}`, and by bare key for interests and constraints. */
const OPTION_ICONS: Record<string, IconType> = {
  'partyType.solo': TbUser,
  'partyType.couple': TbHeartHandshake,
  'partyType.family': TbMoodKid,
  'partyType.friends': TbUsersGroup,
  'partyType.multigen': TbFriends,
  'adultAge.young': TbBolt,
  'adultAge.prime': TbSun,
  'adultAge.mature': TbCompass,
  'adultAge.senior': TbFeather,
  'aim.stories': TbBook2,
  'aim.unwind': TbYoga,
  'aim.together': TbHeartHandshake,
  'aim.adrenaline': TbBolt,
  'aim.romance': TbGlassFull,
  'aim.discover': TbCompass,
  'aim.party': TbConfetti,
  'dayShape.signature': TbDiamond,
  'dayShape.balanced': TbScale,
  'dayShape.packed': TbStack2,
  'dayShape.max': TbRocket,
  'budget.value': TbCoin,
  'budget.balanced': TbCoins,
  'budget.premium': TbCrown,
  'budget.open': TbDiamond,
  'transport.included': TbBus,
  'transport.private_day': TbCar,
  'transport.private_full': TbPlaneArrival,
  'occasion.none': TbBeach,
  'occasion.honeymoon': TbRings,
  'occasion.anniversary': TbGlassFull,
  'occasion.birthday': TbCake,
  'occasion.bachelor': TbConfetti,
  'occasion.reunion': TbHome,
  // Constraints
  non_swimmer: TbLifebuoy,
  seasick: TbRipple,
  limited_mobility: TbWheelchair,
  no_early: TbAlarmOff,
  no_alcohol: TbGlassOff,
  early_nights: TbMoon,
  sun_sensitive: TbSunOff,
  // Interests
  beach_island: TbBeach,
  snorkel_reef: TbScubaMask,
  wildlife: TbPaw,
  adrenaline: TbParachute,
  offroad: TbSteeringWheel,
  culture: TbBuildingMonument,
  nightlife: TbMusic,
  food_drink: TbToolsKitchen2,
  views_photo: TbCamera,
  relax: TbYoga,
};

export const optionIcon = (step: string, option: string): IconType | undefined =>
  OPTION_ICONS[`${step}.${option}`] ?? OPTION_ICONS[option];
