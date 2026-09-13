import React, { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { useBrand } from '../contexts/BrandContext';
import { PricingOption, perPersonTier } from '../services/toursService';
import PaymentDropdown from './ui/PaymentDropdown';
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

  // Principle 5: the closer a surface gets to taking money, the calmer it
  // is. A booking card is the calmest thing on the site — white, soft-edged,
  // hairline-ruled, with the one warm colour spent on the button.
  const radiusClass = 'rounded-3xl';

  return (
    <article
      onMouseEnter={() => playHoverFx()}
      className={`group mb-8 inline-block flex h-auto w-full break-inside-avoid flex-col justify-between overflow-hidden ${radiusClass} booking-card ${swayClass}`}
    >
      {/* Media Frame */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Link to={detailsPath} onClick={() => playClickFx()} className="block h-full w-full" aria-label={title}>
          <img
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            className="photo-pop h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </Link>
        {/* A soft scrim so the badge reads over any photograph. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/25 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-lagoon-dark shadow-sm backdrop-blur">
          <span className="text-sunset">★</span> Excursion
        </span>
      </div>

      {/* Content */}
      <div className="flex h-full flex-col justify-between p-6 sm:p-7">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-lagoon-dark">
                {brandName} Collection
              </span>
              <h3 className="mt-1 font-display text-2xl font-extrabold text-ink">
                {title}
              </h3>
            </div>
            {showDetailsLink && (
              <Link
                to={detailsPath}
                onClick={() => playClickFx()}
                className="shrink-0 text-xs font-extrabold uppercase tracking-wider text-lagoon-dark underline decoration-lagoon/50 decoration-2 underline-offset-4 transition hover:text-mango-dark hover:decoration-mango"
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
              <span className="inline-flex items-center rounded-full bg-lagoon-light/60 px-3.5 py-1.5 text-xs font-bold text-lagoon-dark">
                {rate.tier}: <strong className="ml-1 text-ink">{rate.price}</strong>
              </span>
            </div>
          )}
        </div>

        {enabled && (
          <div className="mt-6 space-y-4 border-t border-ink/10 pt-6">
            {/* One rate, so one box: the grid of tier counts this replaced had
                nothing left to lay out. */}
            <label className="block space-y-1.5 rounded-2xl bg-paper-warm/70 p-3 text-left ring-1 ring-ink/10">
              <span className="block text-xs font-extrabold uppercase tracking-wider text-ink-soft">
                {rate.tier}
              </span>
              <input
                type="number"
                min="0"
                value={persons}
                onChange={(event) => handlePersonsChange(event.target.value)}
                className="w-full rounded-xl bg-white px-3 py-1.5 text-sm font-extrabold text-ink outline-none ring-1 ring-ink/10 transition focus:ring-2 focus:ring-lagoon"
              />
            </label>

            <label className="block space-y-1.5 text-left">
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-soft">
                <FormattedMessage id="tours.dateLabel" defaultMessage="Preferred Date" />
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink outline-none ring-1 ring-ink/10 transition focus:ring-2 focus:ring-lagoon"
              />
            </label>

            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-lagoon-light/55 to-sky-light/70 px-5 py-3.5 ring-1 ring-lagoon/25">
              <span className="text-xs font-extrabold uppercase tracking-wider text-lagoon-dark">
                <FormattedMessage id="payment.total" defaultMessage="Total Estimate" />
              </span>
              <span className="font-display text-xl font-extrabold text-ink">
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
