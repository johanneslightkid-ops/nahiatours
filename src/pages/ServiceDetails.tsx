import React, { useEffect, useMemo, useState } from 'react';
import { localeText } from '../lib/localeText';
import { FormattedMessage } from 'react-intl';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getContentLocale, useI18n } from '../contexts/I18nContext';
import { ServiceCategory, Tour, getServiceSlug, getServicesByCategory, perPersonTier } from '../services/toursService';
import { useBrand } from '../contexts/BrandContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { getTransferConfig } from '../services/transferConfigService';
import { calculateDistancePrice } from '../services/transferPricingEngine';
import type { TransferConfig, TransferFormData, TransferPriceResult } from '../types/transport';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import DetailCarousel from '../components/details/DetailCarousel';
import DetailNav, { DetailOrigin, planReturnPath } from '../components/details/DetailNav';
import BookingPanel from '../components/details/BookingPanel';
import TourGuideSections, { GuideFacts } from '../components/details/TourGuideSections';
import { TOUR_PROFILES, matchTourProfile } from '../planner/tourProfiles';
import { TourGuide, langOf, loadTourGuide } from '../lib/tourGuide';
import { playClickFx } from '../lib/soundEngine';
import { track } from '../lib/activity';

/**
 * One tour (or transfer), with everything needed to choose it and book it:
 * its photographs in a carousel, the vendor's description, what there is to
 * know about the place and the day (src/lib/tourGuide.ts), the booking panel
 * beside it, and the ways back — to all tours, or to the plan when the guest
 * came from the planner.
 *
 * The layout is shared by every site; the look of each part is the site's own
 * `.dv-*` rules in globals.css.
 */

const money = (value: number) => `US$${Number.isInteger(value) ? value : value.toFixed(2)}`;

const ServiceDetails: React.FC = () => {
  const { locale } = useI18n();
  const { category = 'tours', id = '' } = useParams();
  const location = useLocation();
  const origin: DetailOrigin = (location.state as DetailOrigin | null) ?? {};
  const [services, setServices] = useState<Tour[]>([]);
  const [englishTitles, setEnglishTitles] = useState<Map<number, string>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [guide, setGuide] = useState<TourGuide | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const { brandSettings } = useBrand();
  const lang = langOf(locale);
  const isTour = category !== 'transport';

  useEffect(() => {
    let current = true;
    setLoaded(false);
    (async () => {
      const contentLocale = getContentLocale(locale);
      const [list, english] = await Promise.all([
        getServicesByCategory(category as ServiceCategory, contentLocale),
        // The guide is matched on the English title, which every language shares an id with.
        isTour && contentLocale !== 'en' ? getServicesByCategory('tours', 'en').catch(() => [] as Tour[]) : Promise.resolve([] as Tour[]),
      ]);
      if (!current) return;
      setServices(list);
      setEnglishTitles(new Map(english.map((item) => [item.id, item.title])));
      setLoaded(true);
    })();
    return () => {
      current = false;
    };
  }, [category, locale, isTour]);

  const routeId = id.split('-')[0];
  const index = services.findIndex((item) => String(item.id) === routeId);
  const service = index >= 0 ? services[index] : null;

  // Which tours are looked at, and from where: sent with the visit's next
  // event or when the page is left, never on its own (src/lib/activity.ts).
  useEffect(() => {
    if (!service) return;
    track('tour_view', { title: service.title, category, locale });
  }, [service?.id, category]);

  const profileOf = (tour: Tour) => matchTourProfile(englishTitles.get(tour.id) ?? tour.title);
  const profile = service && isTour ? profileOf(service) : null;

  useEffect(() => {
    let current = true;
    setGuide(null);
    if (profile && profile.key !== 'unknown') {
      loadTourGuide(profile.key).then((loadedGuide) => current && setGuide(loadedGuide));
    }
    return () => {
      current = false;
    };
  }, [profile?.key]);

  const images = useMemo(() => {
    if (!service) {
      return [];
    }

    return service.details.images.length > 0 ? service.details.images : [service.image];
  }, [service]);

  const pathOf = (item: Tour) => `/details/${isTour ? 'tours' : 'transport'}/${getServiceSlug(item)}`;
  const neighbour = (offset: number) => {
    if (index < 0 || services.length < 2) return undefined;
    const item = services[(index + offset + services.length) % services.length];
    return { title: item.title, path: pathOf(item) };
  };

  /** Three more of the same kind first, then whatever comes next. */
  const related = useMemo(() => {
    if (!service || !isTour) return [];
    const group = TOUR_PROFILES.find((item) => item.key === profile?.key)?.categoryGroup;
    const others = services.filter((item) => item.id !== service.id);
    const sameKind = group ? others.filter((item) => profileOf(item).categoryGroup === group) : [];
    const rest = others.filter((item) => !sameKind.includes(item));
    return [...sameKind, ...rest].slice(0, 3);
  }, [service, services, englishTitles, profile?.key]);

  useEffect(() => {
    if (!service?.transferRoutes?.length) {
      setSelectedOrigin('');
      setSelectedDestination('');
      return;
    }

    const origins = Array.from(new Set(service.transferRoutes.map((route) => route.origin)));
    const defaultOrigin = origins[0] || '';
    const destinations = service.transferRoutes
      .filter((route) => route.origin === defaultOrigin)
      .map((route) => route.destination);

    setSelectedOrigin(defaultOrigin);
    setSelectedDestination(destinations[0] || '');
  }, [service]);

  const availableOrigins = useMemo(
    () => (service?.transferRoutes?.map((route) => route.origin) ?? []).filter(Boolean),
    [service]
  );

  const availableDestinations = useMemo(() => {
    if (!service?.transferRoutes?.length || !selectedOrigin) {
      return [];
    }

    return service.transferRoutes
      .filter((route) => route.origin === selectedOrigin)
      .map((route) => route.destination);
  }, [service, selectedOrigin]);

  const selectedRoute = useMemo(() => {
    if (!service?.transferRoutes?.length) {
      return null;
    }

    return (
      service.transferRoutes.find(
        (route) => route.origin === selectedOrigin && route.destination === selectedDestination
      ) ?? service.transferRoutes[0]
    );
  }, [service, selectedOrigin, selectedDestination]);

  const [transferConfig, setTransferConfig] = useState<TransferConfig | null>(null);
  const [selectedVehicleKey, setSelectedVehicleKey] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [priceResult, setPriceResult] = useState<TransferPriceResult | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await getTransferConfig();
      setTransferConfig(config);
      if (config.vehicleTypes.length) {
        setSelectedVehicleKey(config.vehicleTypes[0].key);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (!transferConfig || !selectedRoute) {
      setPriceResult(null);
      return;
    }

    const activeVehicleKey = selectedVehicleKey || transferConfig.vehicleTypes[0]?.key;
    const transferData: TransferFormData = {
      vehicleKey: activeVehicleKey ?? transferConfig.vehicleTypes[0]?.key ?? 'sedan',
      passengers,
      roundTrip: false,
      nightTransfer: false,
      waitingHours: 0,
      childSeats: 0,
    };

    if (selectedRoute.distanceKm && selectedRoute.distanceKm > 0) {
      setPriceResult(
        calculateDistancePrice(
          transferConfig,
          selectedRoute.distanceKm,
          selectedRoute.durationMinutes ?? 0,
          selectedRoute.origin,
          selectedRoute.destination,
          transferData
        )
      );
    } else {
      setPriceResult(null);
    }
  }, [transferConfig, selectedRoute, selectedVehicleKey, passengers]);

  const getRegionFromAddress = (addr: string) => {
    if (!addr) return '';
    const parts = addr.split(',').map((p) => p.trim()).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : parts[0] || '';
  };

  const basePrice = selectedRoute?.amount ?? (selectedRoute ? Number(String(selectedRoute.price ?? '').replace(/[^\d.]/g, '')) : null);
  const totalDiscount = priceResult?.breakdown.discountAmount ?? 0;
  const otherAddons = 0;
  const finalTotal = priceResult?.estimatedPrice ?? (basePrice != null ? Math.round((basePrice - totalDiscount) + otherAddons) : null);

  if (!service) {
    return (
      <div className="dv-page section-shell page-top pb-20 text-center">
        {loaded && (
          <>
            <p className="text-lg text-ink-soft">
              <FormattedMessage id="details.notFound" defaultMessage="Service details could not be found." />
            </p>
            <Link to={isTour ? '/tours' : '/transport'} className="dv-nav-back mt-6 inline-flex">
              {localeText(locale, { en: 'See all tours', es: 'Ver todos los tours', de: 'Alle Touren ansehen', fr: 'Voir toutes les excursions' })}
            </Link>
          </>
        )}
      </div>
    );
  }

  const handleContactWhatsApp = () => {
    const originZone = getRegionFromAddress(selectedOrigin);
    const destZone = getRegionFromAddress(selectedDestination);
    const baseLine = locale === 'es' ? 'Precio base (distancia):' : 'Distance price:';
    const discountLine = locale === 'es' ? 'Descuento total:' : 'Total discount:';
    const addonsLine = locale === 'es' ? 'Otros recargos / extras:' : 'Other add-ons:';
    const totalLine = locale === 'es' ? 'Total estimado:' : 'Estimated total:';

    const lines = [] as string[];
    lines.push(locale === 'es' ? 'Hola, quisiera reservar un traslado:' : "Hello, I'd like to book a transfer:");
    if (selectedRoute) {
      lines.push(`${locale === 'es' ? 'Desde' : 'From'}: ${selectedRoute.origin} ${originZone ? `(${originZone})` : ''}`);
      lines.push(`${locale === 'es' ? 'Hasta' : 'To'}: ${selectedRoute.destination} ${destZone ? `(${destZone})` : ''}`);
      lines.push(`${baseLine} USD ${basePrice ?? 'N/A'}`);
      lines.push(`${discountLine} USD ${totalDiscount}`);
      lines.push(`${addonsLine} USD ${otherAddons}`);
      lines.push(`${totalLine} USD ${finalTotal ?? 'N/A'}`);
    } else {
      lines.push(`${locale === 'es' ? 'Servicio' : 'Service'}: ${service.title}`);
    }

    const msg = lines.join('\n');
    const url = generateWhatsAppMessage(brandSettings.phoneNumber, msg);
    if (url) window.open(url, '_blank');
  };

  const rate = service.pricingOptions[0] ?? { tier: perPersonTier(lang), price: service.price, amount: null };
  const detailsPath = pathOf(service);
  const scrollToBooking = () => {
    playClickFx();
    document.getElementById('dv-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="dv-page page-top pb-28 lg:pb-16">
      <div className="section-shell">
        <DetailNav category={isTour ? 'tours' : 'transport'} origin={origin} previous={neighbour(-1)} next={neighbour(1)} locale={locale} />

        <header className="dv-head mt-6">
          <p className="dv-eyebrow">
            {profile && profile.key !== 'unknown' ? `${profile.emoji} ` : ''}
            {isTour
              ? localeText(locale, { en: 'Excursion', es: 'Excursión', de: 'Ausflug', fr: 'Excursion' })
              : localeText(locale, { en: 'Transfer', es: 'Traslado', de: 'Transfer', fr: 'Transfert' })}
            {guide ? ` · ${guide.facts.duration[lang].split(/[,(]/)[0].trim()}` : ''}
          </p>
          <h1 className="dv-title">{service.title}</h1>
          {isTour && rate.amount ? (
            <p className="dv-head-price">
              {localeText(locale, { en: 'from', es: 'desde', de: 'ab', fr: 'dès' })} <strong>{money(rate.amount)}</strong>{' '}
              {localeText(locale, { en: 'per person', es: 'por persona', de: 'pro Person', fr: 'par personne' })}
            </p>
          ) : null}
        </header>

        <div className="dv-layout mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="dv-main min-w-0 space-y-8">
            <DetailCarousel images={images} title={service.title} locale={locale} />

            {guide && <GuideFacts guide={guide} lang={lang} />}

            <section className="dv-section" aria-labelledby="dv-description">
              <h2 id="dv-description" className="dv-h2">
                {isTour
                  ? localeText(locale, { en: 'About this tour', es: 'Sobre este tour', de: 'Über diese Tour', fr: 'À propos de cette excursion' })
                  : localeText(locale, { en: 'About this transfer', es: 'Sobre este traslado', de: 'Über diesen Transfer', fr: 'À propos de ce transfert' })}
              </h2>
              <div className="dv-prose">
                <MarkdownRenderer content={service.details.description} />
              </div>
            </section>

            {!isTour && (
              <div className="dv-section">
            <section>
              <h2 className="mb-4 text-2xl font-bold text-ink">
                <FormattedMessage id="details.pricing" defaultMessage="Pricing" />
              </h2>

              {service.transferRoutes?.length ? (
                <div className="space-y-6 rounded-3xl border border-ink/20 bg-paper-warm p-6">
                  <p className="text-ink-soft">
                    <FormattedMessage
                      id="transport.routeCalculator"
                      defaultMessage="Use the origin and destination selectors to estimate your transfer price."
                    />
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-soft">
                        <FormattedMessage id="transport.origin" defaultMessage="Origin" />
                      </span>
                      <select
                        value={selectedOrigin}
                        onChange={(event) => setSelectedOrigin(event.target.value)}
                        className="w-full rounded-2xl border-2 border-ink bg-white px-4 py-3 text-ink-soft outline-none"
                      >
                        {Array.from(new Set(availableOrigins)).map((origin) => (
                          <option key={origin} value={origin}>
                            {origin}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-ink-soft">
                        <FormattedMessage id="transport.destination" defaultMessage="Destination" />
                      </span>
                      <select
                        value={selectedDestination}
                        onChange={(event) => setSelectedDestination(event.target.value)}
                        className="w-full rounded-2xl border-2 border-ink bg-white px-4 py-3 text-ink-soft outline-none"
                      >
                        {availableDestinations.map((destination) => (
                          <option key={destination} value={destination}>
                            {destination}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-3xl border-[2.5px] border-ink bg-white p-5 shadow-ink-sm">
                    <p className="text-sm font-semibold text-ink-soft">
                      <FormattedMessage id="transport.estimate" defaultMessage="Estimated transfer price" />
                    </p>
                    <p className="mt-3 text-3xl font-bold text-lagoon-dark">
                      {priceResult ? `USD ${priceResult.estimatedPrice}` : selectedRoute?.price || service.price}
                    </p>

                    {transferConfig?.vehicleTypes.length ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-ink-soft">Vehicle</span>
                          <select
                            value={selectedVehicleKey}
                            onChange={(event) => setSelectedVehicleKey(event.target.value)}
                            className="w-full rounded-2xl border-2 border-ink bg-white px-4 py-3 text-ink-soft outline-none"
                          >
                            {transferConfig.vehicleTypes.map((vehicle) => (
                              <option key={vehicle.key} value={vehicle.key}>
                                {vehicle.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-ink-soft">Passengers</span>
                          <input
                            type="number"
                            min={1}
                            max={service.transferRoutes?.length ? 30 : 10}
                            value={passengers}
                            onChange={(event) => setPassengers(Number(event.target.value))}
                            className="w-full rounded-2xl border-2 border-ink bg-white px-4 py-3 text-ink-soft outline-none"
                          />
                        </label>
                      </div>
                    ) : null}

                    {selectedRoute && (
                      <div className="mt-3 grid gap-2 text-sm text-ink-soft">
                        <div>{selectedRoute.origin} → {selectedRoute.destination}</div>
                        <div>
                          <strong>{localeText(locale, { en: 'Zone/Region:', es: 'Zona/Región:', de: 'Zone/Region:', fr: 'Zone/Région :' })}</strong>{' '}
                          {getRegionFromAddress(selectedRoute.origin)} → {getRegionFromAddress(selectedRoute.destination)}
                        </div>
                        {selectedRoute.distanceKm ? (
                          <div>
                            <strong>{localeText(locale, { en: 'Distance:', es: 'Distancia estimada:', de: 'Entfernung:', fr: 'Distance :' })}</strong>{' '}
                            {selectedRoute.distanceKm} km
                          </div>
                        ) : null}

                        <div className="mt-3 rounded-lg border-2 border-ink/15 bg-paper-warm p-3">
                          <div className="flex justify-between">
                            <span>{localeText(locale, { en: 'Base distance price', es: 'Precio base', de: 'Grundpreis nach Entfernung', fr: 'Prix de base (distance)' })}</span>
                            <span>{priceResult ? `USD ${priceResult.breakdown.baseDistancePrice}` : basePrice != null ? `USD ${basePrice}` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{localeText(locale, { en: 'Total discount', es: 'Descuento total', de: 'Rabatt gesamt', fr: 'Remise totale' })}</span>
                            <span>{priceResult ? `USD ${priceResult.breakdown.discountAmount}` : `USD ${totalDiscount}`}</span>
                          </div>
                          {priceResult ? (
                            <>
                              <div className="flex justify-between">
                                <span>{localeText(locale, { en: 'Max discount', es: 'Descuento máximo', de: 'Maximaler Rabatt', fr: 'Remise maximale' })}</span>
                                <span>{`${priceResult.breakdown.distanceDiscountPercent}% (max ${priceResult.breakdown.distanceDiscountMaxPercent}%)`}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{localeText(locale, { en: 'Discount saturation', es: 'Curva de descuento', de: 'Rabattkurve', fr: 'Courbe de remise' })}</span>
                                <span>{`${priceResult.breakdown.distanceDiscountSaturationKm} km`}</span>
                              </div>
                            </>
                          ) : null}
                          <div className="flex justify-between font-semibold pt-2">
                            <span>{localeText(locale, { en: 'Estimated total', es: 'Total estimado', de: 'Geschätzter Gesamtpreis', fr: 'Total estimé' })}</span>
                            <span>{finalTotal != null ? `USD ${finalTotal}` : 'N/A'}</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <button onClick={handleContactWhatsApp} className="rounded-full bg-lagoon px-5 py-2 font-semibold text-white">
                            {localeText(locale, { en: 'Contact on WhatsApp', es: 'Contactar por WhatsApp', de: 'Per WhatsApp kontaktieren', fr: 'Contacter sur WhatsApp' })}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {service.pricingOptions.map((option) => (
                    <span key={option.tier} className="rounded-full bg-paper-warm px-4 py-2 text-sm font-semibold text-ink-soft">
                      {option.tier}: {option.price}
                    </span>
                  ))}
                </div>
              )}
            </section>
              </div>
            )}

            {guide && <TourGuideSections guide={guide} lang={lang} />}

            {related.length > 0 && (
              <section className="dv-section dv-more" aria-labelledby="dv-more">
                <h2 id="dv-more" className="dv-h2">
                  {localeText(locale, { en: 'You might also like', es: 'También te puede gustar', de: 'Das könnte dir auch gefallen', fr: 'Vous aimerez aussi' })}
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {related.map((item) => (
                    <Link key={item.id} to={pathOf(item)} state={origin} onClick={() => playClickFx()} className="dv-more-card group block overflow-hidden no-underline">
                      <span className="block aspect-[4/3] overflow-hidden">
                        <img src={item.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                      </span>
                      <span className="dv-more-body block">
                        <span className="dv-more-title block">{item.title}</span>
                        {item.pricingOptions[0]?.amount ? (
                          <span className="dv-more-price block">
                            {localeText(locale, { en: 'from', es: 'desde', de: 'ab', fr: 'dès' })} {money(item.pricingOptions[0].amount)}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {isTour && (
            <aside id="dv-booking" className="dv-aside scroll-mt-28">
              <div className="dv-aside-inner lg:sticky lg:top-24">
                <BookingPanel service={service} detailsPath={detailsPath} locale={locale} />
              </div>
            </aside>
          )}
        </div>
      </div>

      {isTour && (
        /* Phones: the price and the way to book stay at hand while reading. */
        <div className="dv-bar fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 px-4 py-3 lg:hidden">
          {origin.from === 'plan' && (
            <Link to={planReturnPath(origin)} onClick={() => playClickFx()} className="dv-bar-plan shrink-0">
              {localeText(locale, { en: 'My plan', es: 'Mi plan', de: 'Mein Plan', fr: 'Mon plan' })}
            </Link>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <span className="dv-bar-label block">{localeText(locale, { en: 'per person', es: 'por persona', de: 'pro Person', fr: 'par personne' })}</span>
            <span className="dv-bar-price block tabular-nums">{rate.amount ? money(rate.amount) : rate.price}</span>
          </div>
          <button type="button" onClick={scrollToBooking} className="dv-bar-book shrink-0">
            {localeText(locale, { en: 'Book', es: 'Reservar', de: 'Buchen', fr: 'Réserver' })}
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceDetails;
