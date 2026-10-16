export interface VehicleType {
  key: string;
  label: string;
  multiplier: number;
  pricePerKmMultiplier?: number;
  passengerThreshold?: number;
  passengerMultiplier?: number;
  maxPassengers: number;
  typicalPassengers: [number, number];
  description: string;
  image?: string;
}

export interface TransferRoute {
  id: string;
  origin: string;
  destination: string;
  price: string;
  amount: number | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
}

export interface Modifiers {
  pricePerKm: number;
  minimumPrice: number;
  roundTripDiscount: number;
  nightFeeMultiplier: number;
  waitingPerHour: number;
  childSeat: number;
  premiumZoneBoost: number;
  fuelVolatility: number;
  priceMarkup: number;
  distanceDiscountMaxPercent: number;
  distanceDiscountSaturationKm: number;
  municipioMultipliers?: Record<string, number>;
}

export interface TransferConfig {
  airport: string;
  currency: string;
  vehicleTypes: VehicleType[];
  zones?: ZoneData[];
  modifiers: Modifiers;
}

export interface TransferFormData {
  vehicleKey: string;
  passengers: number;
  roundTrip: boolean;
  nightTransfer: boolean;
  waitingHours: number;
  childSeats: number;
  originMunicipio?: string;
  destinationMunicipio?: string;
}

export interface TransferPriceResult {
  originLabel: string;
  destinationLabel: string;
  vehicleLabel: string;
  passengers: number;
  roundTrip: boolean;
  estimatedPrice: number;
  currency: string;
  distanceKm: number;
  durationMinutes: number;
  originMunicipio?: string;
  destinationMunicipio?: string;
  breakdown: {
    distanceKm: number;
    pricePerKm: number;
    baseDistancePrice: number;
    discountAmount: number;
    finalDistancePrice: number;
    vehicleMultiplierApplied: number;
    fuelVolatilityApplied: number;
    nightFeeApplied: number;
    roundTripApplied: number;
    waitingApplied: number;
    childSeatsApplied: number;
    distanceDiscountPercent: number;
    distanceDiscountMaxPercent: number;
    distanceDiscountSaturationKm: number;
    markupApplied: number;
    minimumPriceApplied: boolean;
    municipioMultiplierApplied?: number;
  };
}

export interface BookingInfo {
  id: string;
  date: string;
  time?: string;
  flight?: string;
  hotel: string;
  street?: string;
  notes?: string;
}

export interface GooglePlaceResult {
  placeId: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
}

export interface ZoneData {
  key: string;
  label: string;
  kmApprox: number;
  basePrice: number;
  difficulty: number;
  premium: boolean;
}

export interface ZonePair {
  fromZone: string;
  toZone: string;
  basePrice: number;
  kilometers: number;
}
