import React, { useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { ServiceCategory, Tour, getServicesByCategory } from '../services/toursService';
import { useBrand } from '../contexts/BrandContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { getTransferConfig } from '../services/transferConfigService';
import { calculateDistancePrice } from '../services/transferPricingEngine';
import type { TransferConfig, TransferFormData, TransferPriceResult } from '../types/transport';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';

const ServiceDetails: React.FC = () => {
  const { locale } = useI18n();
  const { category = 'tours', id = '' } = useParams();
  const [service, setService] = useState<Tour | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const { brandSettings } = useBrand();

  useEffect(() => {
    const loadService = async () => {
      const services = await getServicesByCategory(category as ServiceCategory, locale);
      const routeId = id.split('-')[0];
      const match = services.find((item) => String(item.id) === routeId) ?? null;
      setService(match);
      setActiveIndex(0);
    };

    loadService();
  }, [category, id, locale]);

  const images = useMemo(() => {
    if (!service) {
      return [];
    }

    return service.details.images.length > 0 ? service.details.images : [service.image];
  }, [service]);

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
      <div className="section-shell py-20 text-center">
        <p className="text-lg text-ink-soft">
          <FormattedMessage id="details.notFound" defaultMessage="Service details could not be found." />
        </p>
      </div>
    );
  }

  const currentImage = images[activeIndex] ?? service.image;

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

  return (
    <div className="bg-paper py-16">
      <div className="section-shell space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link to={category === 'transport' ? '/transport' : '/tours'} className="text-sm font-semibold text-lagoon-dark hover:text-lagoon-dark">
            <FormattedMessage id="details.back" defaultMessage="← Back to listings" />
          </Link>
        </div>

        <article className="glass-card overflow-hidden rounded-[2rem]">
          <div className="relative bg-ink">
            <img src={currentImage} alt={service.title} className="h-[420px] w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-ink/75 p-8 text-white">
              <h1 className="text-4xl font-bold md:text-5xl">{service.title}</h1>
              <div className="mt-3 max-w-3xl text-paper/85">
                <MarkdownRenderer content={service.description} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-b border-ink/20 bg-white px-6 py-6 md:grid-cols-4">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                onClick={() => setActiveIndex(index)}
                className={`overflow-hidden rounded-2xl border-2 transition ${index === activeIndex ? 'border-lagoon' : 'border-ink/15'}`}
                aria-label={`Show image ${index + 1}`}
              >
                <img src={image} alt={`${service.title} ${index + 1}`} className="h-24 w-full object-cover" />
              </button>
            ))}
          </div>

          <div className="space-y-8 p-8">
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
                        className="w-full rounded-2xl ring-1 ring-ink/10 bg-white px-4 py-3 text-ink-soft outline-none"
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
                        className="w-full rounded-2xl ring-1 ring-ink/10 bg-white px-4 py-3 text-ink-soft outline-none"
                      >
                        {availableDestinations.map((destination) => (
                          <option key={destination} value={destination}>
                            {destination}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-3xl ring-1 ring-ink/10 bg-white p-5 shadow-md">
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
                            className="w-full rounded-2xl ring-1 ring-ink/10 bg-white px-4 py-3 text-ink-soft outline-none"
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
                            className="w-full rounded-2xl ring-1 ring-ink/10 bg-white px-4 py-3 text-ink-soft outline-none"
                          />
                        </label>
                      </div>
                    ) : null}

                    {selectedRoute && (
                      <div className="mt-3 grid gap-2 text-sm text-ink-soft">
                        <div>{selectedRoute.origin} → {selectedRoute.destination}</div>
                        <div>
                          <strong>{locale === 'es' ? 'Zona/Región:' : 'Zone/Region:'}</strong>{' '}
                          {getRegionFromAddress(selectedRoute.origin)} → {getRegionFromAddress(selectedRoute.destination)}
                        </div>
                        {selectedRoute.distanceKm ? (
                          <div>
                            <strong>{locale === 'es' ? 'Distancia estimada:' : 'Distance:'}</strong>{' '}
                            {selectedRoute.distanceKm} km
                          </div>
                        ) : null}

                        <div className="mt-3 rounded-lg border border-ink/10 bg-paper-warm p-3">
                          <div className="flex justify-between">
                            <span>{locale === 'es' ? 'Precio base' : 'Base distance price'}</span>
                            <span>{priceResult ? `USD ${priceResult.breakdown.baseDistancePrice}` : basePrice != null ? `USD ${basePrice}` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{locale === 'es' ? 'Descuento total' : 'Total discount'}</span>
                            <span>{priceResult ? `USD ${priceResult.breakdown.discountAmount}` : `USD ${totalDiscount}`}</span>
                          </div>
                          {priceResult ? (
                            <>
                              <div className="flex justify-between">
                                <span>{locale === 'es' ? 'Descuento máximo' : 'Max discount'}</span>
                                <span>{`${priceResult.breakdown.distanceDiscountPercent}% (max ${priceResult.breakdown.distanceDiscountMaxPercent}%)`}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{locale === 'es' ? 'Curva de descuento' : 'Discount saturation'}</span>
                                <span>{`${priceResult.breakdown.distanceDiscountSaturationKm} km`}</span>
                              </div>
                            </>
                          ) : null}
                          <div className="flex justify-between font-semibold pt-2">
                            <span>{locale === 'es' ? 'Total estimado' : 'Estimated total'}</span>
                            <span>{finalTotal != null ? `USD ${finalTotal}` : 'N/A'}</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <button onClick={handleContactWhatsApp} className="rounded-full bg-lagoon px-5 py-2 font-semibold text-white">
                            {locale === 'es' ? 'Contactar por WhatsApp' : 'Contact on WhatsApp'}
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

            <section>
              <h2 className="mb-4 text-2xl font-bold text-ink">
                <FormattedMessage id="details.description" defaultMessage="Description" />
              </h2>
              <MarkdownRenderer content={service.details.description} />
            </section>
          </div>
        </article>
      </div>
    </div>
  );
};

export default ServiceDetails;
