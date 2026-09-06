import React, { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { useBrand } from '../contexts/BrandContext';
import { PricingOption } from '../services/toursService';
import PaymentDropdown from './ui/PaymentDropdown';
import { Barcode, Crosshair } from './ui/Illustrations';
import MarkdownRenderer from './ui/MarkdownRenderer';
import { playClickFx, playHoverFx } from '../lib/soundEngine';

interface TourCardProps {
  image: string;
  title: string;
  description: string;
  price: string;
  pricingOptions?: PricingOption[];
  excursionName: string;
  detailsPath: string;
  enabled?: boolean;
  showPrice?: boolean;
  showDetailsLink?: boolean;
  index?: number;
}

const TourCard: React.FC<TourCardProps> = ({
  image,
  title,
  description,
  price,
  pricingOptions = [],
  excursionName,
  detailsPath,
  enabled = true,
  showPrice = true,
  showDetailsLink = true,
  index = 0,
}) => {
  const intl = useIntl();
  const { brandSettings } = useBrand();
  const brandName = brandSettings.brandName;
  const swayClass = `animate-wave-sway-${(index % 10) + 1}`;
  const resolvedPricingOptions = pricingOptions.length > 0
    ? pricingOptions
    : [{ tier: intl.locale === 'es' ? 'Personas' : 'People', price, amount: null }];
  const [selectedDate, setSelectedDate] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    resolvedPricingOptions.reduce<Record<string, number>>((accumulator, option, idx) => {
      accumulator[option.tier] = idx === 0 ? 1 : 0;
      return accumulator;
    }, {})
  );

  const totalAmount = useMemo(
    () =>
      resolvedPricingOptions.reduce((sum, option) => {
        const quantity = quantities[option.tier] ?? 0;
        return sum + (option.amount ?? 0) * quantity;
      }, 0),
    [quantities, resolvedPricingOptions]
  );

  const selectedQuantitySummary = resolvedPricingOptions
    .filter((option) => (quantities[option.tier] ?? 0) > 0)
    .map((option) => `${option.tier}: ${quantities[option.tier]}`)
    .join(', ');

  const formattedSelectedDate = selectedDate
    ? new Intl.DateTimeFormat(intl.locale === 'es' ? 'es-DO' : 'en-US', {
      dateStyle: 'full',
    }).format(new Date(`${selectedDate}T00:00:00`))
    : '';

  const handleQuantityChange = (tier: string, nextValue: string) => {
    const parsedValue = Math.max(0, Number(nextValue) || 0);
    setQuantities((current) => ({ ...current, [tier]: parsedValue }));
  };

  const handleBookNow = () => {
    playClickFx();
    let message = '';
    message += `Hello, I want to book ${excursionName} with ${brandName}\n`;
    message += `Participants: ${selectedQuantitySummary || 'N/A'}\n`;
    message += `Preferred date: ${formattedSelectedDate || 'Not specified'}\n`;
    message += `Price: ${totalAmount > 0 ? totalAmount : price} USD`;
    message += `\n`;
    message += `Hola, deseo reservar el ${excursionName} con ${brandName}\n`;
    message += `Participantes: ${selectedQuantitySummary || 'N/A'}\n`;
    message += `Fecha preferida: ${formattedSelectedDate || 'No especificada'}\n`;
    message += `Precio: ${totalAmount > 0 ? totalAmount : price} USD`;

    const whatsappUrl = generateWhatsAppMessage(brandSettings.phoneNumber, message);

    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <article
      onMouseEnter={() => playHoverFx()}
      className={`artsy-glass-card group mb-8 flex h-auto w-full break-inside-avoid flex-col justify-between overflow-hidden ${swayClass}`}
    >
      {/* The clipping. Near-monochrome under a halftone screen until the card
          is hovered, when both lift and the photograph comes back to colour. */}
      <div className="relative aspect-[16/10] overflow-hidden border-b-[3px] border-ink">
        <Link to={detailsPath} onClick={() => playClickFx()} className="block h-full w-full" aria-label={title}>
          <img
            src={image}
            alt={title}
            className="photo-pop h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </Link>
        <span
          className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(12,12,13,0.8) 1.2px, transparent 1.6px)',
            backgroundSize: '5px 5px',
          }}
        />
        <div className="artsy-brick-badge absolute left-4 top-4">
          <span>★ Excursion</span>
        </div>
        <Crosshair className="pointer-events-none absolute bottom-2 right-2 h-6 w-6 opacity-80" />
      </div>

      {/* Content */}
      <div className="flex h-full flex-col justify-between p-6 sm:p-7">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="tp-filenum">
                {brandName} Collection · No. {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-1.5 font-display text-2xl leading-none text-ink">
                {title}
              </h3>
              <span className="mt-2 block h-[3px] w-10 bg-mango transition-all duration-300 group-hover:w-24" />
            </div>
            {showDetailsLink && (
              <Link
                to={detailsPath}
                onClick={() => playClickFx()}
                className="shrink-0 border-b-2 border-mango pb-0.5 font-condensed text-xs uppercase tracking-[0.14em] text-ink transition hover:bg-mango hover:text-paper"
              >
                <FormattedMessage id="details.view" defaultMessage="View Details" />
              </Link>
            )}
          </div>

          <div className="text-sm font-medium leading-relaxed text-ink-soft">
            <MarkdownRenderer content={description} />
          </div>

          {showPrice && (
            <div className="flex flex-wrap gap-2 pt-1">
              {resolvedPricingOptions.map((option) => (
                <span
                  key={`${title}-${option.tier}`}
                  className="inline-flex items-center border-2 border-ink bg-paper-warm px-3.5 py-1 font-condensed text-xs uppercase tracking-[0.1em] text-ink"
                >
                  {option.tier}: <strong className="ml-1 text-ink">{option.price}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {enabled && (
          <div className="mt-6 space-y-4 border-t-[3px] border-ink pt-6">
            <div className="-mt-3 flex items-center justify-between">
              <span className="tp-slab-ink tp-slab">Book it</span>
              <Barcode value={excursionName || title} className="h-4 w-24 opacity-40" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {resolvedPricingOptions.map((option) => (
                <label key={option.tier} className="space-y-1.5 border-2 border-ink bg-paper p-3 text-left">
                  <span className="block font-condensed text-xs uppercase tracking-[0.14em] text-ink-soft">
                    {option.tier}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={quantities[option.tier] ?? 0}
                    onChange={(event) => handleQuantityChange(option.tier, event.target.value)}
                    className="w-full border-2 border-ink bg-white px-3 py-1.5 font-mono text-sm text-ink outline-none"
                  />
                </label>
              ))}
            </div>

            <label className="block space-y-1.5 text-left">
              <span className="font-condensed text-xs uppercase tracking-[0.14em] text-ink-soft">
                <FormattedMessage id="tours.dateLabel" defaultMessage="Preferred Date" />
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full border-2 border-ink bg-white px-4 py-2.5 font-mono text-sm text-ink outline-none"
              />
            </label>

            {/* The live total is red because it is the number the visitor is
                about to act on. */}
            <div className="flex items-center justify-between border-[3px] border-ink bg-mango px-5 py-3 shadow-ink-sm">
              <span className="font-condensed text-xs uppercase tracking-[0.16em] text-paper">
                <FormattedMessage id="payment.total" defaultMessage="Total Estimate" />
              </span>
              <span className="font-display text-2xl leading-none text-paper">
                {totalAmount > 0 ? `$${totalAmount} USD` : price}
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <button onClick={handleBookNow} className="tropical-button w-full justify-center">
                <FormattedMessage id="tours.bookNow" />
              </button>
              <div className="flex justify-center w-full">
                <PaymentDropdown
                  excursionTitle={title}
                  selectedPrice={totalAmount > 0 ? `$${totalAmount} USD` : price}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default TourCard;
