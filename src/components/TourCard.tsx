import React, { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { useBrand } from '../contexts/BrandContext';
import { PricingOption, perPersonTier } from '../services/toursService';
import PaymentDropdown from './ui/PaymentDropdown';
import MarkdownRenderer from './ui/MarkdownRenderer';
import Reveal from './ui/Reveal';
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
  const locale = intl.locale === 'es' ? 'es' : 'en';

  // Everyone pays the same rate, so a tour has exactly one price and the only
  // thing to ask for is how many people are coming.
  const rate: PricingOption = pricingOptions[0] ?? {
    tier: perPersonTier(locale),
    price,
    amount: null,
  };

  const [selectedDate, setSelectedDate] = useState('');
  const [persons, setPersons] = useState(1);

  const totalAmount = useMemo(() => (rate.amount ?? 0) * persons, [rate.amount, persons]);

  const formattedSelectedDate = selectedDate
    ? new Intl.DateTimeFormat(intl.locale === 'es' ? 'es-DO' : 'en-US', {
      dateStyle: 'full',
    }).format(new Date(`${selectedDate}T00:00:00`))
    : '';

  const handlePersonsChange = (nextValue: string) => {
    setPersons(Math.max(0, Number(nextValue) || 0));
  };

  const handleBookNow = () => {
    playClickFx();
    let message = '';
    message += `Hello, I want to book ${excursionName} with ${brandName}\n`;
    message += `Participants: ${persons} ${persons === 1 ? 'person' : 'persons'}\n`;
    message += `Preferred date: ${formattedSelectedDate || 'Not specified'}\n`;
    message += `Price: ${totalAmount > 0 ? totalAmount : price} USD`;
    message += `\n`;
    message += `Hola, deseo reservar el ${excursionName} con ${brandName}\n`;
    message += `Participantes: ${persons} ${persons === 1 ? 'persona' : 'personas'}\n`;
    message += `Fecha preferida: ${formattedSelectedDate || 'No especificada'}\n`;
    message += `Precio: ${totalAmount > 0 ? totalAmount : price} USD`;

    const whatsappUrl = generateWhatsAppMessage(brandSettings.phoneNumber, message);

    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <Reveal
      as="article"
      delay={Math.min(index, 5) * 60}
      className="postcard group flex h-full w-full flex-col justify-between overflow-hidden"
    >
      <div onMouseEnter={() => playHoverFx()} className="contents">
      {/* The picture side of the postcard. */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Link to={detailsPath} onClick={() => playClickFx()} className="block h-full w-full" aria-label={title}>
          <img
            src={image}
            alt={title}
            width={640}
            height={400}
            // Below the fold on every page that renders these, so the browser
            // should not be racing them against the hero.
            loading="lazy"
            decoding="async"
            className="photo-pop h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          />
        </Link>
        {/* A wash running up from the bottom of the photograph, so the frame
            hands over to the paper instead of stopping at a hard edge. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(254,250,241,0.85))' }}
        />
        <div className="artsy-brick-badge absolute left-4 top-4">
          <span>{locale === 'es' ? 'Excursión' : 'Excursion'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-full flex-col justify-between p-6 sm:p-7">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[0.64rem] font-bold uppercase tracking-[0.2em] text-ink-light">
                {brandName}
              </span>
              <h3 className="mt-1.5 font-display text-2xl font-semibold leading-tight text-ink">
                {title}
              </h3>
            </div>
            {showDetailsLink && (
              <Link
                to={detailsPath}
                onClick={() => playClickFx()}
                className="shrink-0 text-xs font-semibold uppercase tracking-wider text-lagoon-dark underline decoration-mango decoration-2 underline-offset-4 transition hover:text-mango-dark"
              >
                <FormattedMessage id="details.view" defaultMessage="View Details" />
              </Link>
            )}
          </div>

          <div className="text-sm font-semibold leading-relaxed text-ink-soft">
            <MarkdownRenderer content={description} />
          </div>

          {showPrice && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sea-foam px-3.5 py-1 text-xs font-semibold text-sea-deep">
                {rate.tier}
                <strong className="font-display text-sm font-semibold text-ink">{rate.price}</strong>
              </span>
            </div>
          )}
        </div>

        {enabled && (
          <div className="mt-6 space-y-4 border-t-2 border-dashed border-ink/25 pt-6">
            <label className="block space-y-1.5 rounded-2xl border border-ink/15 bg-paper p-3 text-left">
              <span className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                {rate.tier}
              </span>
              <input
                type="number"
                min="0"
                value={persons}
                onChange={(event) => handlePersonsChange(event.target.value)}
                className="w-full rounded-xl border border-ink/15 bg-white px-3 py-1.5 text-sm font-semibold text-ink outline-none transition focus:border-sea"
              />
            </label>

            <label className="block space-y-1.5 text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <FormattedMessage id="tours.dateLabel" defaultMessage="Preferred Date" />
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-bold text-ink outline-none transition focus:border-sea"
              />
            </label>

            <div className="flex items-center justify-between rounded-[14px_11px_16px_10px/11px_16px_10px_15px] bg-mango px-5 py-3">
              <span className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-ink">
                <FormattedMessage id="payment.total" defaultMessage="Total Estimate" />
              </span>
              <span className="font-display text-xl font-semibold text-ink">
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
      </div>
    </Reveal>
  );
};

export default TourCard;
