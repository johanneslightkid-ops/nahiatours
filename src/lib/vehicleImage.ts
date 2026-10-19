/**
 * A photograph for every kind of vehicle, for the ones that have none yet.
 *
 * A vehicle type's own image (set in the admin) always wins. Without one, the
 * transfer page used to show nothing; now it shows a stock photograph of that
 * kind of vehicle from public/vehicles/, matched on the type's key and, for
 * types the operator added under other names, on words in its name — in
 * English and Spanish, the way vehicles are named here (jeepeta, guagua…).
 *
 * The photographs are free to use without credit (Unsplash / Pexels
 * licences); where they came from, for the record:
 *   sedan: White Toyota Corolla sedan, side profile, seafront road with blue sky — Bestami Sarıkaya, Unsplash License, https://unsplash.com/photos/white-sedan-on-gray-asphalt-road-during-daytime-73XAgT8DOpo
 *   suv: Blue Toyota RAV4 (Adventure trim), front three-quarter view, no licence plate — Stephen Andrews, Unsplash License, https://unsplash.com/photos/a-blue-toyota-rav-parked-in-front-of-a-house-PNyyffLvWIs
 *   minivan: Dark grey Kia Carnival minivan parked by a sandy beach (placeholder 'Carnival' plate) — Hyundai Motor Group, Unsplash License, https://unsplash.com/photos/a-grey-suv-parked-on-the-side-of-a-road-near-the-ocean-owV1KjM6e7s
 *   sprinter: Black Mercedes-Benz Sprinter high-roof van with tinted windows, palm trees behind, no plate (cropped from portrait original to 3:2) — Eduardo Valdes, Pexels License, https://www.pexels.com/photo/a-2023-black-mercedes-benz-sprinter-parked-among-palm-tree-19871521/
 *   minibus: White Toyota Coaster minibus on a road in Siem Reap, Cambodia (front plate legible) — Humphrey M, Unsplash License, https://unsplash.com/photos/T-WRLSsiZYE
 *   coach_bus: Blue Hyundai Universe Xpress Noble full-size coach, front three-quarter view, trees behind — Safi Erneste, Pexels License, https://www.pexels.com/photo/blue-hyundai-bus-18029634/
 *   vip_sports: Dark blue/black Mercedes-Benz S-Class (W223, S450) sedan, daylight, blank plate — Mike Bird, Pexels License, https://www.pexels.com/photo/black-mercedes-s450-26691371/
 *   luxury_suv: Black Chevrolet Suburban, front three-quarter view, daylight; 'UNITED' vanity front plate (cropped to 3:2, campus sign removed) — Lee Salem, Pexels License, https://www.pexels.com/photo/elegant-black-suv-at-belk-chapel-entrance-36377053/
 */

export type VehicleClass = 'sedan' | 'suv' | 'minivan' | 'sprinter' | 'minibus' | 'coach_bus' | 'vip_sports' | 'luxury_suv';

const CLASSES: VehicleClass[] = ['sedan', 'suv', 'minivan', 'sprinter', 'minibus', 'coach_bus', 'vip_sports', 'luxury_suv'];

/** Tried in order: the most specific kinds first. */
const BY_NAME: Array<[RegExp, VehicleClass]> = [
  [/coach|autocar|reisebus|bus grande|autob[uú]s(?! peque)/i, 'coach_bus'],
  [/mini ?-?bus|micro ?-?b[uú]s|coaster|guagua/i, 'minibus'],
  [/sprinter|group van|van grupal|van de grupo|furgoneta|high ?roof/i, 'sprinter'],
  [/(luxury|lujo|luxus|premium|vip).*(suv|jeepeta)|(suv|jeepeta).*(luxury|lujo|luxus|premium|vip)|suburban|escalade|yukon|tahoe/i, 'luxury_suv'],
  [/vip|luxury|lujo|luxus|limo|s-?class|sports?\b|deportivo|premium/i, 'vip_sports'],
  [/mini ?-?van|hiace|carnival|sienna|staria|\bvan\b/i, 'minivan'],
  [/suv|jeepeta|4x4|family|familiar|familia/i, 'suv'],
  [/sed[aá]n|car\b|carro|auto|economy|econ[oó]mico|taxi/i, 'sedan'],
];

export const vehicleClass = (vehicle: { key?: string; label?: string }): VehicleClass => {
  const key = String(vehicle.key ?? '').toLowerCase();
  if ((CLASSES as string[]).includes(key)) return key as VehicleClass;
  const words = `${vehicle.key ?? ''} ${vehicle.label ?? ''}`.replace(/_/g, ' ');
  return BY_NAME.find(([pattern]) => pattern.test(words))?.[1] ?? 'sedan';
};

/** The vehicle's own photograph, or the stock one for its kind. */
export const vehicleImage = (vehicle: { key?: string; label?: string; image?: string }): string =>
  String(vehicle.image ?? '').trim() || `/vehicles/${vehicleClass(vehicle)}.webp`;
