import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import PageHeader from '../components/layout/PageHeader';
import { Sailboat, Starfish, PalmTree, Pelican } from '../components/ui/Illustrations';
import { Reveal } from '../components/nature/Nature';
import { getTransferConfig, vehicleText } from '../services/transferConfigService';
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
import PaymentDropdown from '../components/ui/PaymentDropdown';
import AddToCartButton from '../components/cart/AddToCartButton';
import { vehicleImage } from '../lib/vehicleImage';

/**
 * Airport transfers — El Cortecito's own page.
 *
 * The form is a short journey in the field book: where, when, who, extras,
 * details, each a numbered page. Vehicles are picked from cards with their
 * photo instead of a dropdown, and the quote is written onto a boarding pass
 * that follows the reader down the page on wide screens. On a phone the pass
 * sits after the form, so a slim price bar at the foot of the screen carries
 * the total and jumps to it.
 *
 * The quote can be paid there and then, by card: the amount is computed from
 * the route, and the card is charged exactly that on a secure payment page by
 * whichever processor the operator configured (see PaymentDropdown). WhatsApp
 * booking stays beside it for anyone who would rather talk first.
 *
 * Every word on the page comes from the `transport.*` texts, so it reads in all
 * four languages and can be reworded from the admin's "Textos del sitio".
 */

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

/** Shorter place names for the pass and the payment line: "Iberostar Selection, Bávaro, …" → "Iberostar Selection". */
const shortPlace = (value: string) => value.split(',')[0].trim() || value;

const STEP_ICONS = ['📍', '📅', '🚐', '✨', '🧳'];

const Transport: React.FC = () => {
  const intl = useIntl();
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const { available: mapsAvailable } = useMap();

  const t = useCallback(
    (id: string, defaultMessage: string, values?: Record<string, string | number>) =>
      intl.formatMessage({ id: `transport.${id}`, defaultMessage }, values),
    [intl]
  );

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
  /** Vehicle photos that failed to load fall back to the drawing instead of an empty frame. */
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  /** The phone price bar steps aside while the pass itself is on screen. */
  const [passInView, setPassInView] = useState(false);

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
    const pass = document.getElementById('transfer-pass');
    if (!pass || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setPassInView(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(pass);
    return () => observer.disconnect();
  }, [config]);

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
          // Not an error yet: nothing has been picked. The pass says so itself.
          setPriceError(originLatLng || destLatLng ? 'needBoth' : null);
          return;
        }

        const result = calculateDistancePrice(
          config,
          distanceKm,
          durationMinutes,
          originAddress || 'Origin',
          destAddress || 'Destination',
          form
        );
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
  const selectedVehicleText = selectedVehicle ? vehicleText(selectedVehicle, locale) : null;

  // No more passengers than the chosen vehicle seats.
  const maxPassengers = Math.max(1, selectedVehicle?.maxPassengers ?? 100);

  const handlePassengerChange = useCallback(
    (value: number | null) => {
      setForm((prev) => ({ ...prev, passengers: Math.max(1, Math.min(maxPassengers, value ?? 1)) }));
    },
    [maxPassengers]
  );

  // Choosing a smaller vehicle winds the count down to what it seats — also
  // when the vehicle list arrives or the admin lowers a capacity.
  useEffect(() => {
    if (form.passengers > maxPassengers) {
      setForm((prev) => ({ ...prev, passengers: maxPassengers }));
    }
  }, [form.passengers, maxPassengers]);

  // The same rule as the pricing engine (passengers >= threshold), so the
  // warning never disagrees with the price.
  const needsTwoVehicles = useMemo(() => {
    if (!selectedVehicle) return false;
    const threshold = selectedVehicle.passengerThreshold ?? selectedVehicle.maxPassengers + 1;
    return Math.min(form.passengers, maxPassengers) >= threshold;
  }, [selectedVehicle, form.passengers, maxPassengers]);

  const waPhone = useMemo(() => digitsOnly(brandSettings.phoneNumber || ''), [brandSettings.phoneNumber]);

  const money = (price: number) =>
    `US$ ${new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, { maximumFractionDigits: 2 }).format(price)}`;
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? `${h} h ` : ''}${m} min`;
  };
  const nightPercent = Math.round(((config?.modifiers.nightFeeMultiplier ?? 1.15) - 1) * 100);
  const vehicleLabel = selectedVehicleText?.label ?? priceResult?.vehicleLabel ?? '';
  const when = `${departureDate}${departureTime ? ` ${departureTime}` : ''}`.trim();

  /** The operator reads Spanish; everyone else writes in English. */
  const buildWhatsAppMessage = useCallback(() => {
    if (!priceResult) return '';
    const es = locale === 'es';
    const details = [
      `${es ? 'Desde' : 'From'}: ${priceResult.originLabel}`,
      ...(priceResult.originMunicipio ? [`${es ? 'Municipio origen' : 'Origin municipio'}: ${priceResult.originMunicipio}`] : []),
      `${es ? 'Hasta' : 'To'}: ${priceResult.destinationLabel}`,
      ...(priceResult.destinationMunicipio ? [`${es ? 'Municipio destino' : 'Destination municipio'}: ${priceResult.destinationMunicipio}`] : []),
      `${es ? 'Vehículo' : 'Vehicle'}: ${priceResult.vehicleLabel}`,
      `${es ? 'Pasajeros' : 'Passengers'}: ${form.passengers}`,
      `${es ? 'Tipo' : 'Trip'}: ${tripType === 'round-trip' ? (es ? 'Ida y vuelta' : 'Round trip') : es ? 'Solo ida' : 'One way'}`,
      `${es ? 'Salida' : 'Departure'}: ${when || '—'}`,
    ];
    if (tripType === 'round-trip' && returnDate) {
      details.push(`${es ? 'Regreso' : 'Return'}: ${returnDate}${returnTime ? ` ${returnTime}` : ''}`);
    }
    if (flightNumber) details.push(`${es ? 'Vuelo' : 'Flight'}: ${flightNumber}`);
    if (hotelName) details.push(`Hotel: ${hotelName}`);
    if (streetAddress) details.push(`${es ? 'Dirección' : 'Address'}: ${streetAddress}`);
    if (form.childSeats > 0) details.push(`${es ? 'Sillas infantiles' : 'Child seats'}: ${form.childSeats}`);
    if (form.waitingHours > 0) details.push(`${es ? 'Espera' : 'Waiting'}: ${form.waitingHours}h`);
    if (form.nightTransfer) details.push(es ? '🌙 Traslado nocturno' : '🌙 Night transfer');
    if (notes) details.push(`${es ? 'Notas' : 'Notes'}: ${notes}`);
    details.push(`\n💰 ${es ? 'Total estimado' : 'Estimated total'}: USD ${priceResult.estimatedPrice}`);

    return `${es ? 'Hola, quiero reservar un traslado:' : "Hello, I'd like to book a transfer:"}\n\n${details.join('\n')}`;
  }, [priceResult, form, tripType, when, returnDate, returnTime, flightNumber, hotelName, streetAddress, notes, locale]);

  const handleBookNow = useCallback(() => {
    const msg = buildWhatsAppMessage();
    if (!msg || !waPhone) return;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }, [buildWhatsAppMessage, waPhone]);

  const handleChatOnWhatsApp = useCallback(() => {
    if (!waPhone) return;
    const es = locale === 'es';
    const details = [
      priceResult && `${es ? 'Desde' : 'From'}: ${priceResult.originLabel}`,
      priceResult && `${es ? 'Hasta' : 'To'}: ${priceResult.destinationLabel}`,
      vehicleLabel && `${es ? 'Vehículo' : 'Vehicle'}: ${vehicleLabel}`,
      `${es ? 'Pasajeros' : 'Passengers'}: ${form.passengers}`,
      hotelName && `Hotel: ${hotelName}`,
      departureDate && `${es ? 'Fecha' : 'Date'}: ${departureDate}`,
    ].filter(Boolean);
    const msg = es
      ? `Hola, estoy interesado/a en un traslado:\n\n${details.join('\n')}\n\nTengo una consulta. ¿Estás disponible?`
      : `Hi, I'm interested in a transfer:\n\n${details.join('\n')}\n\nI have a question — are you available?`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }, [priceResult, vehicleLabel, form.passengers, hotelName, departureDate, locale, waPhone]);

  const handleOriginSelect = useCallback((place: { placeId: string; address: string; lat: number; lng: number }) => {
    setOriginAddress(place.address);
    setOriginLatLng({ lat: place.lat, lng: place.lng });
    (async () => {
      const municipio = await detectMunicipio(place.lat, place.lng);
      if (municipio) setForm((prev) => ({ ...prev, originMunicipio: municipio }));
    })();
  }, []);

  const handleDestSelect = useCallback((place: { placeId: string; address: string; lat: number; lng: number }) => {
    setDestAddress(place.address);
    setDestLatLng({ lat: place.lat, lng: place.lng });
    (async () => {
      const municipio = await detectMunicipio(place.lat, place.lng);
      if (municipio) setForm((prev) => ({ ...prev, destinationMunicipio: municipio }));
    })();
  }, []);

  const swapEnds = () => {
    const tmpAddr = originAddress;
    const tmpLatLng = originLatLng;
    setOriginAddress(destAddress);
    setOriginLatLng(destLatLng);
    setDestAddress(tmpAddr);
    setDestLatLng(tmpLatLng);
    setForm((prev) => ({ ...prev, originMunicipio: prev.destinationMunicipio, destinationMunicipio: prev.originMunicipio }));
  };

  const scrollToPass = () => document.getElementById('transfer-pass')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center font-display text-xl font-extrabold text-ink">
        {t('loading', 'Loading…')}
      </div>
    );
  }

  const quoteReady = Boolean(priceResult && !priceError);
  const paymentTitle = priceResult
    ? `${t('paymentLine', 'Transfer')}: ${shortPlace(priceResult.originLabel)} → ${shortPlace(priceResult.destinationLabel)}`
    : '';
  const tripLabel = tripType === 'round-trip' ? t('roundTrip', 'Round Trip') : t('oneWay', 'One Way');

  const StepHead = ({ n, title, hint }: { n: number; title: string; hint?: string }) => (
    <div className="mb-5 flex items-start gap-3">
      <span className="transfer-step-badge" aria-hidden="true">
        <span>{n}</span>
      </span>
      <div>
        <h2 className="font-display text-xl font-bold text-ink md:text-2xl">
          <span className="mr-1.5" aria-hidden="true">{STEP_ICONS[n - 1]}</span>
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-sm text-ink-soft">{hint}</p>}
      </div>
    </div>
  );

  const field =
    'w-full rounded-2xl border border-ink/15 bg-white/90 px-4 py-3.5 text-base text-ink outline-none transition focus:border-lagoon focus:bg-white';

  return (
    <div className="min-h-screen bg-paper pb-28 lg:pb-16">
      <PageHeader
        tone="lagoon"
        image="/imgs/edt/banners/transfers.webp"
        kicker={t('kicker', 'Door to door')}
        title={t('title', 'Airport Transfers')}
        subtitle={t(
          'subtitle',
          'Private transfers from Punta Cana Airport (PUJ) to any destination. Reliable, comfortable, and affordable.'
        )}
        artLeft={<Sailboat className="h-28 w-28 animate-bob" />}
        artRight={<Starfish className="h-20 w-20 animate-sway" />}
      />

      {/* The promises, before the form: what booking here gets you. */}
      <div className="section-shell relative z-10 -mt-14 mb-10 max-w-6xl">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['💵', t('trustPriceTitle', 'Price before you book'), t('trustPriceText', 'Worked out from your real route before you commit to anything.')],
            ['✈️', t('trustFlightTitle', 'Timed to your flight'), t('trustFlightText', 'Add your flight number and the pickup is planned around your landing.')],
            ['🚐', t('trustPrivateTitle', 'Private, door to door'), t('trustPrivateText', 'Only your group on board, from the terminal to your hotel door.')],
            ['🧸', t('trustKidsTitle', 'Kids welcome'), t('trustKidsText', 'Child seats on request — just add them under Extras.')],
          ].map(([icon, title, text], index) => (
            <Reveal key={title} delay={index * 0.06} y={16}>
              <div className="transfer-promise h-full">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold leading-tight text-ink sm:block sm:text-base">
                  <span className="text-xl sm:block sm:text-2xl" aria-hidden="true">{icon}</span>
                  <span className="sm:mt-2 sm:block">{title}</span>
                </h3>
                <p className="mt-1 hidden text-sm leading-5 text-ink-soft sm:block">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="section-shell max-w-6xl">
        {!mapsAvailable && (
          <div className="mb-5 rounded-2xl bg-mango-light/60 px-4 py-3 text-sm font-semibold text-ink">
            ⚠️ {t('mapsUnavailable', 'Map services are unavailable. Enter your pickup and drop-off manually below.')}
          </div>
        )}

        {!config ? (
          <div className="transfer-page-card text-center text-hibiscus-dark">
            {t('configError', 'Unable to load transfer configuration. Please try again later.')}
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* ── The journey ─────────────────────────────────────────── */}
            <div className="min-w-0 flex-1 space-y-6">
              <section className="transfer-page-card">
                <StepHead n={1} title={t('pickupDropoff', 'Pickup & Drop-off')} hint={t('pickupHint', 'From the airport, a hotel, or any address in the east.')} />
                <div className="transfer-route">
                  <div className="transfer-route-stop">
                    <span className="transfer-route-dot" aria-hidden="true">✈</span>
                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink-light">
                        {t('origin', 'Pickup location')}
                      </label>
                      <PlaceAutocomplete
                        placeholder={t('originPlaceholder', 'e.g. hotel, airport, address…')}
                        value={originAddress}
                        onPlaceSelect={handleOriginSelect}
                        onClear={() => {
                          setOriginAddress('');
                          setOriginLatLng(null);
                          setForm((prev) => ({ ...prev, originMunicipio: undefined }));
                        }}
                      />
                      {form.originMunicipio && (
                        <span className="mt-2 inline-flex rounded-full bg-lagoon-light/60 px-3 py-1 text-xs font-semibold text-lagoon-dark">
                          {t('originMunicipio', 'Origin municipio')}: {form.originMunicipio}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="transfer-route-gap">
                    <button type="button" onClick={swapEnds} className="transfer-swap" aria-label={t('swap', 'Swap pickup and drop-off')} title={t('swap', 'Swap pickup and drop-off')}>
                      ⇅
                    </button>
                    {priceResult && (
                      <span className="text-xs font-semibold text-ink-soft">
                        {priceResult.distanceKm.toFixed(1)} km · {formatDuration(priceResult.durationMinutes)}
                      </span>
                    )}
                  </div>

                  <div className="transfer-route-stop">
                    <span className="transfer-route-dot transfer-route-dot-end" aria-hidden="true">⚑</span>
                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink-light">
                        {t('destination', 'Drop-off location')}
                      </label>
                      <PlaceAutocomplete
                        placeholder={t('destinationPlaceholder', 'e.g. hotel, address, landmark…')}
                        value={destAddress}
                        onPlaceSelect={handleDestSelect}
                        onClear={() => {
                          setDestAddress('');
                          setDestLatLng(null);
                          setForm((prev) => ({ ...prev, destinationMunicipio: undefined }));
                        }}
                      />
                      {form.destinationMunicipio && (
                        <span className="mt-2 inline-flex rounded-full bg-mango-light/60 px-3 py-1 text-xs font-semibold text-mango-dark">
                          {t('destMunicipio', 'Destination municipio')}: {form.destinationMunicipio}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="transfer-page-card">
                <StepHead n={2} title={t('dateTime', 'Date & Time')} />
                <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border border-ink/10 bg-paper-warm/70 p-1.5" role="radiogroup" aria-label={t('tripType', 'Trip Type')}>
                  {(['round-trip', 'one-way'] as TripType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={tripType === type}
                      onClick={() => setTripType(type)}
                      className={`rounded-full px-4 py-3 text-sm font-extrabold transition sm:text-base ${
                        tripType === type ? 'bg-lagoon text-white shadow-[var(--shade-sm)]' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      {type === 'round-trip' ? `⇄ ${t('roundTrip', 'Round Trip')}` : `→ ${t('oneWay', 'One Way')}`}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DateTimePicker type="date" value={departureDate} onChange={setDepartureDate} label={t('departureDate', 'Departure date')} />
                  <DateTimePicker type="time" value={departureTime} onChange={setDepartureTime} label={t('departureTime', 'Departure time')} />
                  {tripType === 'round-trip' && (
                    <>
                      <DateTimePicker type="date" value={returnDate} onChange={setReturnDate} label={t('returnDate', 'Return date')} />
                      <DateTimePicker type="time" value={returnTime} onChange={setReturnTime} label={t('returnTime', 'Return time')} />
                    </>
                  )}
                </div>
              </section>

              <section className="transfer-page-card">
                <StepHead n={3} title={t('vehicleAndPassengers', 'Vehicle & Passengers')} />
                <div className="mb-5 max-w-xs">
                  <MobileNumberPicker
                    value={form.passengers}
                    onChange={handlePassengerChange}
                    min={1}
                    max={maxPassengers}
                    step={1}
                    label={t('passengers', 'Passengers')}
                    ariaLabel={t('passengers', 'Passengers')}
                  />
                  {selectedVehicle && (
                    <p className="mt-1.5 text-xs text-ink-light">
                      {t('maxForVehicle', 'Up to {max} passengers in this vehicle', { max: maxPassengers })}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('vehicleType', 'Vehicle Type')}>
                  {config.vehicleTypes.map((vt) => {
                    const text = vehicleText(vt, locale);
                    const active = vt.key === form.vehicleKey;
                    const tooSmall = form.passengers > vt.maxPassengers;
                    return (
                      <button
                        key={vt.key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            vehicleKey: vt.key,
                            passengers: Math.min(prev.passengers, Math.max(1, vt.maxPassengers)),
                          }))
                        }
                        className={`transfer-vehicle ${active ? 'transfer-vehicle-active' : ''}`}
                      >
                        <span className="transfer-vehicle-photo">
                          {vehicleImage(vt) && !brokenImages[vt.key] ? (
                            <img
                              src={vehicleImage(vt)}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              onError={() => setBrokenImages((prev) => ({ ...prev, [vt.key]: true }))}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-4xl" aria-hidden="true">🚐</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block font-display text-base font-bold text-ink">{text.label}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-ink-soft">{text.description}</span>
                          <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${tooSmall ? 'bg-mango-light/70 text-mango-dark' : 'bg-lagoon-light/50 text-lagoon-dark'}`}>
                            👥 {t('upTo', 'up to {max}', { max: vt.maxPassengers })}
                          </span>
                        </span>
                        {active && <span className="transfer-vehicle-check" aria-hidden="true">✓</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedVehicle && (
                  <p className="mt-3 text-xs text-ink-light">
                    {t('vehicleCapacity', 'Capacity: {min}–{max} passengers', {
                      min: selectedVehicle.typicalPassengers[0],
                      max: selectedVehicle.typicalPassengers[1],
                    })}
                  </p>
                )}
                {needsTwoVehicles && (
                  <p className="mt-3 rounded-2xl bg-mango-light/60 px-4 py-2.5 text-sm font-semibold text-mango-dark">
                    ⚠️ {t('twoVehiclesNeeded', 'Double price applied: passenger count exceeds typical capacity')}
                  </p>
                )}
              </section>

              <section className="transfer-page-card">
                <StepHead n={4} title={t('extras', 'Extras')} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className={`transfer-chip ${form.nightTransfer ? 'transfer-chip-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.nightTransfer}
                      onChange={(e) => setForm((prev) => ({ ...prev, nightTransfer: e.target.checked }))}
                      className="h-5 w-5 accent-lagoon-dark"
                    />
                    <span>
                      <span className="block text-sm font-bold text-ink">🌙 {t('nightTransfer', 'Night Transfer')}</span>
                      <span className="block text-xs text-ink-soft">
                        {t('nightSurchargeNote', '+{percent}% after 10 PM', { percent: nightPercent })}
                      </span>
                    </span>
                  </label>
                  <MobileNumberPicker
                    value={form.waitingHours}
                    onChange={(v) => setForm((prev) => ({ ...prev, waitingHours: v ?? 0 }))}
                    min={0}
                    max={10}
                    step={1}
                    label={t('waitingHours', 'Waiting (hours)')}
                    ariaLabel={t('waitingHours', 'Waiting (hours)')}
                  />
                  <MobileNumberPicker
                    value={form.childSeats}
                    onChange={(v) => setForm((prev) => ({ ...prev, childSeats: v ?? 0 }))}
                    min={0}
                    max={10}
                    step={1}
                    label={t('childSeats', 'Child seats')}
                    ariaLabel={t('childSeats', 'Child seats')}
                  />
                </div>
              </section>

              <section className="transfer-page-card">
                <StepHead n={5} title={t('locationInfo', 'Location Details')} hint={t('detailsHint', 'Optional, but it helps the driver find you.')} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink-light">{t('flightNumber', 'Flight Number')}</span>
                    <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder={t('flightPlaceholder', 'e.g. AA 1234')} className={field} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink-light">{t('hotelName', 'Hotel / Resort')}</span>
                    <input type="text" value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder={t('hotelPlaceholder', 'e.g. Iberostar')} className={field} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink-light">{t('streetAddress', 'Street address')}</span>
                    <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder={t('streetPlaceholder', 'Only if it is not a hotel')} className={field} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-ink-light">{t('notes', 'Notes')}</span>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notesPlaceholder', 'Special requirements…')} rows={3} className={field} />
                  </label>
                </div>
              </section>
            </div>

            {/* ── The boarding pass ───────────────────────────────────── */}
            <aside id="transfer-pass" className="w-full scroll-mt-28 lg:sticky lg:top-40 lg:w-[23rem] xl:w-[25rem]">
              <div className="transfer-pass">
                <div className="transfer-pass-head">
                  <span className="text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-white/80">
                    {t('passTitle', 'Transfer pass')}
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[0.65rem] font-bold text-white">{tripLabel}</span>
                </div>

                <div className="px-5 pb-4 pt-5">
                  <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                    <div className="min-w-0">
                      <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink-light">{t('from', 'From')}</div>
                      <div className="truncate font-display text-lg font-bold text-ink">
                        {originAddress ? shortPlace(originAddress) : '—'}
                      </div>
                    </div>
                    <span className="text-xl text-lagoon" aria-hidden="true">{tripType === 'round-trip' ? '⇄' : '→'}</span>
                    <div className="min-w-0 text-right">
                      <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink-light">{t('to', 'To')}</div>
                      <div className="truncate font-display text-lg font-bold text-ink">
                        {destAddress ? shortPlace(destAddress) : '—'}
                      </div>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-paper-warm/70 px-2 py-2">
                      <dt className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-light">{t('passengers', 'Passengers')}</dt>
                      <dd className="font-display text-base font-bold text-ink">{form.passengers}</dd>
                    </div>
                    <div className="rounded-2xl bg-paper-warm/70 px-2 py-2">
                      <dt className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-light">{t('vehicle', 'Vehicle')}</dt>
                      <dd className="truncate font-display text-sm font-bold text-ink">{vehicleLabel || '—'}</dd>
                    </div>
                    <div className="rounded-2xl bg-paper-warm/70 px-2 py-2">
                      <dt className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-ink-light">{t('date', 'Date')}</dt>
                      <dd className="truncate font-display text-sm font-bold text-ink">{departureDate || '—'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="transfer-pass-tear" aria-hidden="true" />

                <div className="px-5 pb-5 pt-4">
                  {quoteReady && priceResult ? (
                    <>
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink-light">
                            {t('estimatedPrice', 'Estimated total price')}
                          </div>
                          <div className="font-display text-4xl font-bold leading-none text-lagoon-dark">
                            {money(priceResult.estimatedPrice)}
                          </div>
                        </div>
                        <span className="pb-1 text-right text-xs text-ink-soft">
                          {tripType === 'round-trip'
                            ? t('roundTripIncluded', 'Round trip (both ways)')
                            : t('oneWayTrip', 'One way transfer')}
                        </span>
                      </div>

                      <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
                        <li className="flex justify-between gap-3">
                          <span>📏 {t('distance', 'Distance')}</span>
                          <span className="font-semibold text-ink">
                            {priceResult.distanceKm.toFixed(1)} km · {(priceResult.distanceKm * 0.621371).toFixed(1)} mi
                          </span>
                        </li>
                        <li className="flex justify-between gap-3">
                          <span>🕒 {t('duration', 'Estimated travel time')}</span>
                          <span className="font-semibold text-ink">{formatDuration(priceResult.durationMinutes)}</span>
                        </li>
                        {form.nightTransfer && (
                          <li className="flex justify-between gap-3">
                            <span>🌙 {t('nightFee', 'Night fee')}</span>
                            <span className="font-semibold text-ink">{t('includedInTotal', 'included')}</span>
                          </li>
                        )}
                        {needsTwoVehicles && (
                          <li className="flex justify-between gap-3 text-mango-dark">
                            <span>🚐🚐 {t('doubleVehicle', 'Double vehicle')}</span>
                            <span className="font-semibold">{t('includedInTotal', 'included')}</span>
                          </li>
                        )}
                      </ul>

                    </>
                  ) : (
                    <div className="py-4 text-center">
                      <PalmTree className="mx-auto mb-2 h-16 w-16 opacity-80" />
                      <p className="text-sm text-ink-soft">
                        {priceError === 'needBoth'
                          ? t('selectBoth', 'Choose both the pickup and the drop-off — exact places give the best price.')
                          : priceError
                          ? priceError
                          : t('fillFields', 'Select pickup, drop-off, and vehicle to see the price')}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 space-y-3">
                    {quoteReady && priceResult && (
                      <PaymentDropdown
                        excursionTitle={paymentTitle}
                        selectedTier={`${vehicleLabel} · ${tripLabel}`}
                        selectedPrice={money(priceResult.estimatedPrice)}
                        amount={priceResult.estimatedPrice}
                        persons={form.passengers}
                        bookingDate={when}
                        category="transport"
                        locale={locale}
                        methods={['card', 'paypal']}
                        hideWhenEmpty
                        buttonLabel={t('payNow', 'Book & pay now')}
                        className="w-full"
                        buttonClassName="flex w-full items-center justify-between gap-2.5 rounded-full bg-lagoon px-6 py-4 font-extrabold text-white shadow-[var(--shade)] transition hover:-translate-y-0.5 hover:bg-lagoon-dark active:translate-y-0"
                      />
                    )}
                    {quoteReady && priceResult && (
                      <AddToCartButton
                        locale={locale}
                        item={() => ({
                          category: 'transport',
                          title: paymentTitle,
                          description: `${vehicleLabel} · ${tripLabel}`,
                          detailsPath: '/transport',
                          date: departureDate || undefined,
                          time: departureTime || undefined,
                          persons: Math.max(1, form.passengers),
                          fixedTotal: priceResult.estimatedPrice,
                          tier: vehicleLabel,
                          place: `${shortPlace(priceResult.originLabel)} → ${shortPlace(priceResult.destinationLabel)}`,
                          duration: formatDuration(priceResult.durationMinutes),
                          key: `transport:${shortPlace(priceResult.originLabel)}>${shortPlace(priceResult.destinationLabel)}:${tripType}:${departureDate || 'any'}`.toLowerCase(),
                        })}
                      />
                    )}
                    <button
                      onClick={handleBookNow}
                      disabled={!quoteReady || !waPhone}
                      className={`w-full rounded-full px-6 py-4 text-center text-base font-bold transition active:scale-[0.98] ${
                        quoteReady && waPhone
                          ? 'border border-jungle/30 bg-jungle text-white hover:bg-jungle-dark'
                          : 'cursor-not-allowed bg-ink/10 text-ink-light'
                      }`}
                    >
                      💬 {t('bookNow', 'Book via WhatsApp')}
                    </button>
                    <button
                      onClick={handleChatOnWhatsApp}
                      disabled={!waPhone}
                      className="w-full rounded-full border border-ink/15 bg-white/80 px-6 py-3 text-center text-sm font-semibold text-lagoon-dark transition hover:bg-lagoon-light/40 disabled:opacity-50"
                    >
                      {t('chatOnWhatsApp', 'Chat / Question')}
                    </button>
                    {quoteReady && (
                      <p className="text-center text-[0.7rem] leading-4 text-ink-light">
                        {t('payHint', 'Pay securely online by card — your card details are entered on a secure payment page, never on this site.')}
                      </p>
                    )}
                  </div>

                  {/* Below the buttons: the route is a confirmation, the buttons are the point. */}
                  {quoteReady && routeGeometry && (
                    <RouteMap
                      origin={originLatLng ?? undefined}
                      destination={destLatLng ?? undefined}
                      geometry={routeGeometry}
                      className="mt-5 h-40 overflow-hidden rounded-[22px_16px_24px_14px] border border-ink/10"
                    />
                  )}
                </div>
              </div>

              <div className="pointer-events-none mt-6 hidden justify-end lg:flex" aria-hidden="true">
                <Pelican className="h-20 w-20 animate-bob" />
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Phones: the pass is below the whole form, so the total rides along at the foot. */}
      {config && (
        <div className="transfer-mobile-bar lg:hidden" data-hidden={passInView} aria-hidden={passInView}>
          <div className="min-w-0">
            <div className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              {quoteReady ? t('estimatedPrice', 'Estimated total price') : t('passTitle', 'Transfer pass')}
            </div>
            <div className="truncate font-display text-lg font-bold text-ink">
              {quoteReady && priceResult ? money(priceResult.estimatedPrice) : t('mobilePrompt', 'Pick your route')}
            </div>
          </div>
          <button type="button" onClick={scrollToPass} className="shrink-0 rounded-full bg-lagoon px-5 py-3 text-sm font-extrabold text-white">
            {quoteReady ? t('mobileCta', 'Book') : t('mobileSee', 'See pass')} ↓
          </button>
        </div>
      )}
    </div>
  );
};

export default Transport;
