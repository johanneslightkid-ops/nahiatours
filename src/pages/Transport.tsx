import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import PageHeader from '../components/layout/PageHeader';
import { Sailboat, Starfish } from '../components/ui/Illustrations';
import { getTransferConfig } from '../services/transferConfigService';
import { calculateDistancePrice } from '../services/transferPricingEngine';
import { getRouteBetweenPoints } from '../services/routingService';
import { detectMunicipio } from '../services/municipioService';
import { TransferConfig, TransferFormData, TransferPriceResult } from '../types/transport';
import { useI18n } from '../contexts/I18nContext';
import { useBrand } from '../contexts/BrandContext';
import { useMap } from '../contexts/MapContext';
import PlaceAutocomplete from '../components/PlaceAutocomplete';
import DateTimePicker from '../components/ui/DateTimePicker';
import MobileNumberPicker from '../components/ui/MobileNumberPicker';
import RouteMap from '../components/RouteMap';

type TripType = 'one-way' | 'round-trip';

const initialFormState: TransferFormData = {
  vehicleKey: '',
  passengers: 1,
  roundTrip: false,
  nightTransfer: false,
  waitingHours: 0,
  childSeats: 0,
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

const Transport: React.FC = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const { available: mapsAvailable } = useMap();

  const [config, setConfig] = useState<TransferConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<TransferFormData>(initialFormState);
  const [tripType, setTripType] = useState<TripType>('round-trip');
  const [priceResult, setPriceResult] = useState<TransferPriceResult | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [originAddress, setOriginAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [originLatLng, setOriginLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [destLatLng, setDestLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null);

  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const cfg = await getTransferConfig();
        setConfig(cfg);
        if (cfg.vehicleTypes.length > 0) {
          setForm((prev) => ({ ...prev, vehicleKey: cfg.vehicleTypes[0].key }));
        }
      } catch (err) {
        console.error('Failed to load transfer config', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setForm((prev) => ({ ...prev, roundTrip: tripType === 'round-trip' }));
  }, [tripType]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!config || !form.vehicleKey) {
        setPriceResult(null);
        setPriceError(null);
        return;
      }

      try {
        let distanceKm: number | null = null;
        let durationMinutes = 0;
        const originLabel = originAddress || '';
        const destinationLabel = destAddress || '';
        setRouteGeometry(null);

        if (originLatLng && destLatLng) {
          const route = await getRouteBetweenPoints(originLatLng, destLatLng);
          if (cancelled) return;
          distanceKm = route.distanceKm;
          durationMinutes = route.durationMinutes;
          setRouteGeometry(route.geometry);
        }

        if (distanceKm == null) {
          setPriceResult(null);
          setPriceError('Please select both pickup and drop-off (precise locations preferred)');
          return;
        }

        const result = calculateDistancePrice(config, distanceKm, durationMinutes, originLabel || 'Origin', destinationLabel || 'Destination', form);
        if (cancelled) return;
        setPriceResult(result);
        setPriceError(null);
      } catch (err) {
        if (cancelled) return;
        setPriceResult(null);
        setPriceError(err instanceof Error ? err.message : 'Calculation error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, form, originLatLng, destLatLng, originAddress, destAddress]);

  const selectedVehicle = useMemo(
    () => config?.vehicleTypes.find((v) => v.key === form.vehicleKey),
    [config, form.vehicleKey]
  );

  const handlePassengerChange = useCallback((value: number) => {
    setForm((prev) => ({ ...prev, passengers: Math.max(1, Math.min(100, value)) }));
  }, []);

  const needsTwoVehicles = useMemo(() => {
    if (!selectedVehicle) return false;
    const threshold = selectedVehicle.passengerThreshold ?? (selectedVehicle.maxPassengers + 1);
    return form.passengers > threshold;
  }, [selectedVehicle, form.passengers]);

  const waPhone = useMemo(() => {
    const raw = brandSettings.phoneNumber || '+18299999999';
    return digitsOnly(raw);
  }, [brandSettings.phoneNumber]);

  const formatPrice = (price: number) => `USD ${price}`;
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m`;
  };

  const buildWhatsAppMessage = useCallback(() => {
    if (!priceResult) return '';

    const baseMsg = locale === 'es'
      ? `Hola, quiero reservar un traslado:\n\n`
      : `Hello, I'd like to book a transfer:\n\n`;

    const details = [
      `${locale === 'es' ? 'Desde' : 'From'}: ${priceResult.originLabel}`,
      ...(priceResult.originMunicipio ? [`${locale === 'es' ? 'Municipio origen' : 'Origin municipio'}: ${priceResult.originMunicipio}`] : []),
      `${locale === 'es' ? 'Hasta' : 'To'}: ${priceResult.destinationLabel}`,
      ...(priceResult.destinationMunicipio ? [`${locale === 'es' ? 'Municipio destino' : 'Destination municipio'}: ${priceResult.destinationMunicipio}`] : []),
      `${locale === 'es' ? 'Vehículo' : 'Vehicle'}: ${priceResult.vehicleLabel}`,
      `${locale === 'es' ? 'Pasajeros' : 'Passengers'}: ${form.passengers}`,
      `${locale === 'es' ? 'Tipo' : 'Trip'}: ${tripType === 'round-trip' ? (locale === 'es' ? 'Ida y Vuelta' : 'Round Trip') : (locale === 'es' ? 'Solo Ida' : 'One Way')}`,
      `${locale === 'es' ? 'Salida' : 'Departure'}: ${departureDate}${departureTime ? ` ${departureTime}` : ''}`,
    ];

    if (originAddress) details.push(`📍 ${locale === 'es' ? 'Origen' : 'Origin'}: ${originAddress}`);
    if (destAddress) details.push(`📍 ${locale === 'es' ? 'Destino' : 'Destination'}: ${destAddress}`);
    if (tripType === 'round-trip' && returnDate) {
      details.push(`${locale === 'es' ? 'Regreso' : 'Return'}: ${returnDate}${returnTime ? ` ${returnTime}` : ''}`);
    }
    if (flightNumber) details.push(`${locale === 'es' ? 'Vuelo' : 'Flight'}: ${flightNumber}`);
    if (hotelName) details.push(`${locale === 'es' ? 'Hotel' : 'Hotel'}: ${hotelName}`);
    if (streetAddress) details.push(`${locale === 'es' ? 'Dirección' : 'Address'}: ${streetAddress}`);
    if (form.childSeats > 0) details.push(`${locale === 'es' ? 'Sillas infantiles' : 'Child seats'}: ${form.childSeats}`);
    if (form.waitingHours > 0) details.push(`${locale === 'es' ? 'Espera' : 'Waiting'}: ${form.waitingHours}h`);
    if (form.nightTransfer) details.push(locale === 'es' ? '🌙 Traslado nocturno' : '🌙 Night transfer');
    if (notes) details.push(`${locale === 'es' ? 'Notas' : 'Notes'}: ${notes}`);

    details.push(`\n💰 ${locale === 'es' ? 'Total estimado' : 'Estimated total'}: USD ${priceResult.estimatedPrice}`);

    return `${baseMsg}${details.join('\n')}`;
  }, [priceResult, form, tripType, departureDate, returnDate, departureTime, returnTime, flightNumber, hotelName, streetAddress, notes, locale, originAddress, destAddress]);

  const handleBookNow = useCallback(() => {
    const msg = buildWhatsAppMessage();
    if (!msg) return;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }, [buildWhatsAppMessage, waPhone]);

  const handleChatOnWhatsApp = useCallback(() => {
    const details = [
      `${locale === 'es' ? 'Desde' : 'From'}: ${priceResult?.originLabel ?? ''}`,
      `${locale === 'es' ? 'Hasta' : 'To'}: ${priceResult?.destinationLabel ?? ''}`,
      `${locale === 'es' ? 'Vehículo' : 'Vehicle'}: ${priceResult?.vehicleLabel ?? ''}`,
      `${locale === 'es' ? 'Pasajeros' : 'Passengers'}: ${form.passengers}`,
    ];
    if (hotelName) details.push(`${locale === 'es' ? 'Hotel' : 'Hotel'}: ${hotelName}`);
    if (departureDate) details.push(`${locale === 'es' ? 'Fecha' : 'Date'}: ${departureDate}`);

    const interestLine = details.join('\n');

    const msg = locale === 'es'
      ? `Hola, estoy interesado/a en reservar un traslado:\n\n${interestLine}\n\nTengo una consulta y quisiera asegurarme de algo. ¿Estás disponible?`
      : `Hi, I'm interested in booking a transfer:\n\n${interestLine}\n\nI have a question and would like to double-check something. Are you available?`;

    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }, [priceResult, form, hotelName, departureDate, locale, waPhone]);

  const handlePayWithPayPal = useCallback(() => {
    if (!priceResult) return;
    const total = priceResult.estimatedPrice;
    const paypalUrl = brandSettings.paypalMeLink || 'https://www.paypal.com/paypalme/carlostours';
    const separator = paypalUrl.endsWith('/') ? '' : '/';
    const url = total > 0 ? `${paypalUrl}${separator}${total}` : paypalUrl;
    window.open(url, '_blank');
  }, [priceResult, brandSettings.paypalMeLink]);

  const handleOriginSelect = useCallback((place: { placeId: string; address: string; lat: number; lng: number }) => {
    setOriginAddress(place.address);
    setOriginLatLng({ lat: place.lat, lng: place.lng });
    
    // Detect municipio from coordinates
    (async () => {
      const municipio = await detectMunicipio(place.lat, place.lng);
      if (municipio) {
        setForm((prev) => ({ ...prev, originMunicipio: municipio }));
      }
    })();
  }, []);

  const handleDestSelect = useCallback((place: { placeId: string; address: string; lat: number; lng: number }) => {
    setDestAddress(place.address);
    setDestLatLng({ lat: place.lat, lng: place.lng });
    
    // Detect municipio from coordinates
    (async () => {
      const municipio = await detectMunicipio(place.lat, place.lng);
      if (municipio) {
        setForm((prev) => ({ ...prev, destinationMunicipio: municipio }));
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center font-display text-xl font-extrabold text-ink">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-16">
      <PageHeader
        tone="lagoon"
        kicker="Door to door"
        title={<FormattedMessage id="transport.title" defaultMessage="Airport Transfers" />}
        subtitle={
          <FormattedMessage
            id="transport.subtitle"
            defaultMessage="Private transfers from Punta Cana Airport (PUJ) to any destination. Reliable, comfortable, and affordable."
          />
        }
        artLeft={<Sailboat className="h-28 w-28 animate-bob" />}
        artRight={<Starfish className="h-20 w-20 animate-sway" />}
      />

      <div className="section-shell max-w-5xl px-3 md:px-4">

        {!mapsAvailable && (
          <div className="mb-4 rounded-2xl bg-mango-light px-4 py-3 text-sm text-mango-dark">
            ⚠️ Map services unavailable. Enter your pickup/drop-off manually below.
          </div>
        )}

        {!config ? (
          <div className="rounded-3xl bg-red-50 p-8 text-center text-hibiscus-dark">
            <FormattedMessage id="transport.configError" defaultMessage="Unable to load transfer configuration. Please try again later." />
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <div className="flex-1 space-y-5 md:space-y-6">
              <div className="rounded-2xl ring-1 ring-ink/10 bg-white p-4 shadow-md md:p-6">
                <h2 className="mb-4 text-lg font-semibold text-ink-soft">
                  📍 <FormattedMessage id="transport.pickupDropoff" defaultMessage="Pickup & Drop-off" />
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-light">
                      <FormattedMessage id="transport.origin" defaultMessage="Pickup location" />
                    </label>
                    <PlaceAutocomplete
                      placeholder={locale === 'es' ? 'Ej: Hotel, aeropuerto, dirección...' : 'e.g. Hotel, airport, address...'}
                      value={originAddress}
                      onPlaceSelect={handleOriginSelect}
                      onClear={() => {
                        setOriginAddress('');
                        setOriginLatLng(null);
                        setForm((prev) => ({ ...prev, originMunicipio: undefined }));
                      }}
                    />
                    {form.originMunicipio && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-lagoon-light px-3 py-1 text-xs font-semibold text-lagoon-dark">
                        <span>📍</span>
                        <span>{locale === 'es' ? 'Municipio origen' : 'Origin municipio'}: {form.originMunicipio}</span>
                      </div>
                    )}
                  </div>

                  {priceResult && (
                    <div className="mt-3 rounded-lg bg-paper-warm px-3 py-2 text-sm text-ink-soft flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span>📏</span>
                        <span className="font-medium">{priceResult.distanceKm.toFixed(1)} km • {(priceResult.distanceKm * 0.621371).toFixed(1)} mi</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>🕒</span>
                        <span className="font-medium">{formatDuration(priceResult.durationMinutes)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const tmpAddr = originAddress;
                        const tmpLatLng = originLatLng;
                        const tmpMunicipio = form.originMunicipio;

                        setOriginAddress(destAddress);
                        setOriginLatLng(destLatLng);
                        setForm((prev) => ({ ...prev, originMunicipio: form.destinationMunicipio }));

                        setDestAddress(tmpAddr);
                        setDestLatLng(tmpLatLng);
                        setForm((prev) => ({ ...prev, destinationMunicipio: tmpMunicipio }));
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full bg-paper-warm text-ink-light transition hover:bg-lagoon-light hover:text-lagoon-dark active:scale-90"
                      aria-label="Swap origin and destination"
                    >
                      ⇅
                    </button>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-light">
                      <FormattedMessage id="transport.destination" defaultMessage="Drop-off location" />
                    </label>
                    <PlaceAutocomplete
                      placeholder={locale === 'es' ? 'Ej: Hotel, dirección, lugar turístico...' : 'e.g. Hotel, address, landmark...'}
                      value={destAddress}
                      onPlaceSelect={handleDestSelect}
                      onClear={() => {
                        setDestAddress('');
                        setDestLatLng(null);
                        setForm((prev) => ({ ...prev, destinationMunicipio: undefined }));
                      }}
                    />
                    {form.destinationMunicipio && (
                      <div className="mt-2 inline-block rounded-full bg-mango-light px-3 py-1 text-xs font-semibold text-mango-dark">
                        📍 {form.destinationMunicipio}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl ring-1 ring-ink/10 bg-white p-4 shadow-md md:p-6">
                <label className="mb-3 block text-sm font-semibold text-ink-soft">
                  <FormattedMessage id="transport.tripType" defaultMessage="Trip Type" />
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTripType('round-trip')}
                    className={`flex-1 rounded-2xl ring-1 ring-ink/10 px-4 py-4 text-center text-base font-extrabold shadow-md transition ${
                      tripType === 'round-trip'
                        ? 'bg-lagoon text-white'
                        : 'bg-paper text-ink hover:bg-mango-light'
                    }`}
                  >
                    🔄 <FormattedMessage id="transport.roundTrip" defaultMessage="Round Trip" />
                  </button>
                  <button
                    onClick={() => setTripType('one-way')}
                    className={`flex-1 rounded-2xl ring-1 ring-ink/10 px-4 py-4 text-center text-base font-extrabold shadow-md transition ${
                      tripType === 'one-way'
                        ? 'bg-lagoon text-white'
                        : 'bg-paper text-ink hover:bg-mango-light'
                    }`}
                  >
                    ➡️ <FormattedMessage id="transport.oneWay" defaultMessage="One Way" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl ring-1 ring-ink/10 bg-white p-4 shadow-md md:p-6">
                <h3 className="mb-4 text-lg font-semibold text-ink-soft">
                  📅 <FormattedMessage id="transport.dateTime" defaultMessage="Date & Time" />
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DateTimePicker
                    type="date"
                    value={departureDate}
                    onChange={setDepartureDate}
                    label={locale === 'es' ? 'Fecha de Salida' : 'Departure Date'}
                  />
                  <DateTimePicker
                    type="time"
                    value={departureTime}
                    onChange={setDepartureTime}
                    label={locale === 'es' ? 'Hora de Salida' : 'Departure Time'}
                  />
                  {tripType === 'round-trip' && (
                    <>
                      <DateTimePicker
                        type="date"
                        value={returnDate}
                        onChange={setReturnDate}
                        label={locale === 'es' ? 'Fecha de Regreso' : 'Return Date'}
                      />
                      <DateTimePicker
                        type="time"
                        value={returnTime}
                        onChange={setReturnTime}
                        label={locale === 'es' ? 'Hora de Regreso' : 'Return Time'}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl ring-1 ring-ink/10 bg-white p-4 shadow-md md:p-6">
                <h3 className="mb-4 text-lg font-semibold text-ink-soft">
                  🚗 <FormattedMessage id="transport.vehicleAndPassengers" defaultMessage="Vehicle & Passengers" />
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-light">
                      <FormattedMessage id="transport.vehicleType" defaultMessage="Vehicle Type" />
                    </label>
                    <select
                      value={form.vehicleKey}
                      onChange={(e) => setForm((prev) => ({ ...prev, vehicleKey: e.target.value }))}
                      className="w-full appearance-none rounded-2xl ring-1 ring-ink/10 bg-white px-4 py-4 text-base focus:bg-lagoon-light focus:outline-none"
                    >
                      {config.vehicleTypes.map((vt) => (
                        <option key={vt.key} value={vt.key}>
                          {vt.label} (≤{vt.maxPassengers} pax)
                        </option>
                      ))}
                    </select>
                  </div>
                  <MobileNumberPicker
                    value={form.passengers}
                    onChange={handlePassengerChange}
                    min={1}
                    max={100}
                    step={1}
                    label={locale === 'es' ? 'Pasajeros' : 'Passengers'}
                    ariaLabel="passengers"
                  />
                </div>
                {selectedVehicle && (
                  <div className="mt-3 space-y-2 text-sm text-ink-soft">
                    <p>
                      <FormattedMessage
                        id="transport.vehicleCapacity"
                        defaultMessage="Capacity: {min}–{max} passengers"
                        values={{ min: selectedVehicle.typicalPassengers[0], max: selectedVehicle.typicalPassengers[1] }}
                      />
                    </p>
                    <p className="text-xs text-ink-light">{selectedVehicle.description}</p>
                    {selectedVehicle.image && (
                      <div className="mt-2 h-28 w-full overflow-hidden rounded-xl bg-paper-warm md:h-36">
                        <img src={selectedVehicle.image} alt={selectedVehicle.label} className="h-full w-full object-cover" />
                      </div>
                    )}
                    {needsTwoVehicles && (
                      <p className="flex items-center gap-1 rounded-lg bg-mango-light px-3 py-2 text-mango-dark">
                        <span>⚠️</span>
                        <FormattedMessage
                          id="transport.twoVehiclesNeeded"
                          defaultMessage="Double price applied: passenger count exceeds typical capacity"
                        />
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl ring-1 ring-ink/10 bg-white p-4 shadow-md md:p-6">
                <h3 className="mb-4 text-lg font-semibold text-ink-soft">
                  ⚙️ <FormattedMessage id="transport.extras" defaultMessage="Extras" />
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-xl border border-ink/20 p-4 transition has-[:checked]:border-lagoon has-[:checked]:bg-lagoon-light/60 active:scale-[0.98]">
                    <input
                      type="checkbox"
                      checked={form.nightTransfer}
                      onChange={(e) => setForm((prev) => ({ ...prev, nightTransfer: e.target.checked }))}
                      className="h-5 w-5 rounded ring-1 ring-ink/10 text-lagoon-dark"
                    />
                    <span className="text-sm text-ink-soft">
                      🌙 <FormattedMessage id="transport.nightTransfer" defaultMessage="Night Transfer" />
                    </span>
                  </label>
                  <MobileNumberPicker
                    value={form.waitingHours}
                    onChange={(v) => setForm((prev) => ({ ...prev, waitingHours: v ?? 0 }))}
                    min={0}
                    max={10}
                    step={1}
                    label={locale === 'es' ? 'Espera (horas)' : 'Waiting (hours)'}
                    ariaLabel="waiting hours"
                  />
                  <MobileNumberPicker
                    value={form.childSeats}
                    onChange={(v) => setForm((prev) => ({ ...prev, childSeats: v ?? 0 }))}
                    min={0}
                    max={10}
                    step={1}
                    label={locale === 'es' ? 'Sillas Infantiles' : 'Child Seats'}
                    ariaLabel="child seats"
                  />
                </div>
                {form.nightTransfer && (
                  <p className="mt-2 text-xs text-mango-dark">🌙 +15% night surcharge after 10 PM</p>
                )}
              </div>

              <div className="rounded-2xl ring-1 ring-ink/10 bg-white p-4 shadow-md md:p-6">
                <h3 className="mb-4 text-lg font-semibold text-ink-soft">
                  📋 <FormattedMessage id="transport.locationInfo" defaultMessage="Location Details" />
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-light">
                      <FormattedMessage id="transport.flightNumber" defaultMessage="Flight Number" />
                    </label>
                    <input
                      type="text"
                      inputMode="text"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      placeholder={locale === 'es' ? 'Ej: AA 1234' : 'e.g. AA 1234'}
                      className="w-full rounded-2xl border border-ink/20 px-4 py-4 text-base focus:bg-lagoon-light focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-ink-light">
                      <FormattedMessage id="transport.hotelName" defaultMessage="Hotel / Resort" />
                    </label>
                    <input
                      type="text"
                      inputMode="text"
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      placeholder={locale === 'es' ? 'Ej: Iberostar' : 'e.g. Iberostar'}
                      className="w-full rounded-2xl border border-ink/20 px-4 py-4 text-base focus:bg-lagoon-light focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-ink-light">
                      <FormattedMessage id="transport.notes" defaultMessage="Notes" />
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={locale === 'es' ? 'Requisitos especiales...' : 'Special requirements...'}
                      rows={3}
                      className="w-full rounded-2xl border border-ink/20 px-4 py-4 text-base focus:bg-lagoon-light focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-80 xl:w-96">
              <div className="sticky top-24 space-y-5 md:space-y-6">
                <div className="rounded-2xl ring-1 ring-ink/10 bg-white p-5 shadow-md md:p-6">
                  <h2 className="mb-4 text-lg font-semibold text-ink-soft">
                    💰 <FormattedMessage id="transport.priceSummary" defaultMessage="Price Summary" />
                  </h2>

                  {priceError && (
                    <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-hibiscus-dark">{priceError}</div>
                  )}

                  {priceResult && !priceError && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-lagoon-dark">{formatPrice(priceResult.estimatedPrice)}</p>
                        <p className="text-xs text-ink-light">
                          <FormattedMessage id="transport.estimatedPrice" defaultMessage="Estimated total price" />
                        </p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {tripType === 'round-trip' ? (
                            <FormattedMessage id="transport.roundTripIncluded" defaultMessage="Round trip (both ways)" />
                          ) : (
                            <FormattedMessage id="transport.oneWayTrip" defaultMessage="One way transfer" />
                          )}
                        </p>
                      </div>

                      <div className="space-y-2 border-t-2 border-ink/15 pt-4 text-sm text-ink-soft">
                        <div className="flex justify-between">
                          <span><FormattedMessage id="transport.origin" defaultMessage="From" /></span>
                          <span className="font-medium">{priceResult.originLabel}</span>
                        </div>
                        {priceResult.originMunicipio && (
                          <div className="flex justify-between items-center text-lagoon-dark">
                            <span>📍 <FormattedMessage id="transport.originMunicipio" defaultMessage="Origin municipio" /></span>
                            <span className="font-semibold">{priceResult.originMunicipio}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span><FormattedMessage id="transport.destination" defaultMessage="To" /></span>
                          <span className="font-medium">{priceResult.destinationLabel}</span>
                        </div>
                        {priceResult.destinationMunicipio && (
                          <div className="flex justify-between items-center text-mango-dark">
                            <span>📍 <FormattedMessage id="transport.destMunicipio" defaultMessage="Destination municipio" /></span>
                            <span className="font-semibold">{priceResult.destinationMunicipio}</span>
                          </div>
                        )}
                        {priceResult.breakdown.municipioMultiplierApplied && priceResult.breakdown.municipioMultiplierApplied !== 1.0 && (
                          <div className="flex justify-between items-center rounded-lg bg-lagoon-light px-2 py-2 text-lagoon-dark font-semibold border-2 border-ink/15">
                            <span>🏘️ <FormattedMessage id="transport.municipioMultiplier" defaultMessage="Municipio multiplier" /></span>
                            <span className="text-lg">{priceResult.breakdown.municipioMultiplierApplied.toFixed(2)}×</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span><FormattedMessage id="transport.vehicle" defaultMessage="Vehicle" /></span>
                          <span className="font-medium">{priceResult.vehicleLabel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span><FormattedMessage id="transport.passengers" defaultMessage="Passengers" /></span>
                          <span className="font-medium">{priceResult.passengers}</span>
                        </div>
                        {priceResult.distanceKm !== undefined && (
                          <div className="flex justify-between">
                            <span>📏 <FormattedMessage id="transport.distance" defaultMessage="Distance" /></span>
                            <span className="font-medium">{priceResult.distanceKm.toFixed(1)} km • {(priceResult.distanceKm * 0.621371).toFixed(1)} mi</span>
                          </div>
                        )}
                        {priceResult.durationMinutes !== undefined && (
                          <div className="flex justify-between">
                            <span>🕒 <FormattedMessage id="transport.duration" defaultMessage="Estimated travel time" /></span>
                            <span className="font-medium">{formatDuration(priceResult.durationMinutes)}</span>
                          </div>
                        )}
                        {routeGeometry && (
                          <div className="mt-3">
                            <RouteMap origin={originLatLng ?? undefined} destination={destLatLng ?? undefined} geometry={routeGeometry} className="h-72 rounded-xl border-2 border-ink/15" />
                          </div>
                        )}
                        {form.nightTransfer && (
                          <div className="flex justify-between text-mango-dark">
                            <span>🌙 <FormattedMessage id="transport.nightFee" defaultMessage="Night fee" /></span>
                            <span className="font-medium">+15%</span>
                          </div>
                        )}
                        {priceResult.breakdown.distanceDiscountPercent !== undefined && priceResult.breakdown.distanceDiscountPercent > 0 && (
                          <div className="flex justify-between text-lagoon-dark">
                            <span>🏷️ <FormattedMessage id="transport.distanceDiscount" defaultMessage="Distance discount" /></span>
                            <span className="font-medium">{priceResult.breakdown.distanceDiscountPercent}%</span>
                          </div>
                        )}
                        {needsTwoVehicles && (
                          <div className="flex justify-between text-mango-dark">
                            <span>🚗🚗 <FormattedMessage id="transport.doubleVehicle" defaultMessage="Double vehicle" /></span>
                            <span className="font-medium">×2</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!priceResult && !priceError && (
                    <div className="py-8 text-center text-sm text-ink-light">
                      <FormattedMessage id="transport.fillFields" defaultMessage="Select pickup, drop-off, and vehicle to see the price" />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleBookNow}
                    disabled={!priceResult || !!priceError}
                    className={`w-full rounded-2xl px-6 py-4 text-center text-base font-bold text-white shadow-md transition active:scale-[0.97] ${
                      priceResult && !priceError
                        ? 'bg-lagoon hover:bg-lagoon-light hover:text-ink'
                        : 'cursor-not-allowed bg-ink/20'
                    }`}
                  >
                    📱 <FormattedMessage id="transport.bookNow" defaultMessage="Book via WhatsApp" />
                  </button>

                  {priceResult && !priceError && brandSettings.paypalMeLink && (
                    <button
                      onClick={handlePayWithPayPal}
                      className="w-full rounded-2xl bg-[#0070ba] px-6 py-4 text-center text-base font-bold text-white shadow-md transition hover:bg-[#003087] active:scale-[0.97]"
                    >
                      💳 <FormattedMessage id="payment.paypal" defaultMessage="Pay with PayPal" />
                    </button>
                  )}

                  <button
                    onClick={handleChatOnWhatsApp}
                    className="w-full rounded-2xl ring-1 ring-ink/10 bg-white px-6 py-4 text-center text-base font-semibold text-lagoon-dark transition hover:bg-lagoon-light active:scale-[0.97]"
                  >
                    💬 <FormattedMessage id="transport.chatOnWhatsApp" defaultMessage="Chat / Question" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transport;
