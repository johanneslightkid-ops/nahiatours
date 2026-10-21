import React, { useMemo, useState } from 'react';
import { localeTag } from '../lib/localeText';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { HiCheck, HiChevronDown, HiClock, HiLocationMarker } from 'react-icons/hi';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { useBrand } from '../contexts/BrandContext';
import { PricingOption, perPersonTier } from '../services/toursService';
import PaymentDropdown from './ui/PaymentDropdown';
import AddToCartButton from './cart/AddToCartButton';
import { summariseDescription } from '../lib/cart';
import { playClickFx } from '../lib/soundEngine';
import { descriptionField, excerpt, includedItems, smallImage } from '../edt/useTours';
import { siteNames } from '../utils/brandText';

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
  /** Departure point and length, when the catalogue has them. */
  destination?: string;
  duration?: string;
  /** A rank to print on the photograph (#01). */
  rank?: number;
}

type Lang = 'en' | 'es' | 'de' | 'fr';
const COPY: Record<string, Record<Lang, string>> = {
  from: { en: 'from', es: 'desde', fr: 'dès', de: 'ab' },
  person: { en: 'per person', es: 'por persona', fr: 'par personne', de: 'pro Person' },
  book: { en: 'Book', es: 'Reservar', fr: 'Réserver', de: 'Buchen' },
  details: { en: 'Details', es: 'Detalles', fr: 'Détails', de: 'Details' },
  pay: { en: 'Book & pay online', es: 'Reservar y pagar en línea', fr: 'Réserver et payer en ligne', de: 'Online buchen & bezahlen' },
  guests: { en: 'Guests', es: 'Personas', fr: 'Personnes', de: 'Personen' },
};

/**
 * A tour, the way the poster would sell it: the photograph first, the length
 * and the departure point in small caps, the name in Anton, two lines of why,
 * three things that are included, and the price upfront. "Book" is WhatsApp;
 * paying online opens below the card without leaving the list.
 */
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
  destination,
  duration,
  rank,
}) => {
  const intl = useIntl();
  const { brandSettings } = useBrand();
  const brandName = siteNames(brandSettings).name;
  const locale = (['es', 'de', 'fr'].includes(intl.locale) ? intl.locale : 'en') as Lang;

  // Everyone pays the same rate, so a tour has one price and the only thing
  // to ask for is how many people are coming.
  const rate: PricingOption = pricingOptions[0] ?? { tier: perPersonTier(locale), price, amount: null };

  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [persons, setPersons] = useState(2);
  const totalAmount = useMemo(() => (rate.amount ?? 0) * persons, [rate.amount, persons]);

  const formattedSelectedDate = selectedDate
    ? new Intl.DateTimeFormat(localeTag(intl.locale), { dateStyle: 'full' }).format(new Date(`${selectedDate}T00:00:00`))
    : '';

  const facts = useMemo(() => summariseDescription(description), [description]);
  const lasts = duration || descriptionField(description, 'duration') || facts.duration;
  const departs = destination || descriptionField(description, 'departs');
  const included = useMemo(() => includedItems(description).slice(0, 3), [description]);

  const cartItem = () => ({
    category: 'tours',
    serviceId: /\/(\d+)/.exec(detailsPath)?.[1],
    title,
    image,
    description: facts.intro,
    detailsPath,
    date: selectedDate || undefined,
    persons: Math.max(1, persons),
    unitPrice: rate.amount ?? null,
    tier: rate.tier,
    duration: lasts || undefined,
    included: facts.included,
    goodToKnow: facts.goodToKnow,
  });

  const whatsapp = () => {
    let message = `Hello, I want to book ${excursionName} with ${brandName}\n`;
    message += `Participants: ${persons} ${persons === 1 ? 'person' : 'persons'}\n`;
    message += `Preferred date: ${formattedSelectedDate || 'Not specified'}\n`;
    message += `Price: ${totalAmount > 0 ? totalAmount : price} USD\n`;
    message += `Hola, deseo reservar el ${excursionName} con ${brandName}\n`;
    message += `Participantes: ${persons} ${persons === 1 ? 'persona' : 'personas'}\n`;
    message += `Fecha preferida: ${formattedSelectedDate || 'No especificada'}\n`;
    message += `Precio: ${totalAmount > 0 ? totalAmount : price} USD`;
    return generateWhatsAppMessage(brandSettings.phoneNumber, message);
  };

  return (
    <article className="tour-card group">
      <Link to={detailsPath} onClick={() => playClickFx()} className="relative block aspect-[4/3] overflow-hidden no-underline" aria-label={title}>
        <img src={smallImage(image)} alt={title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
        <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        {rank ? <span className="ranked-number">#{String(rank).padStart(2, '0')}</span> : null}
        {departs && (
          <span className="absolute right-3 top-3 badge badge-light">
            <HiLocationMarker className="h-3 w-3 text-mango-dark" /> {departs}
          </span>
        )}
        {lasts && (
          <span className="absolute left-3 top-3 badge badge-ink">
            <HiClock className="h-3.5 w-3.5 text-mango-light" /> {lasts}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-[1.7rem] uppercase leading-[0.98] text-ink">
          <Link to={detailsPath} onClick={() => playClickFx()} className="text-ink no-underline hover:text-mango-dark">{title}</Link>
        </h3>
        <p className="mt-3 text-[0.97rem] leading-relaxed text-ink-soft">{excerpt(description, 140)}</p>
        {included.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink">
                <HiCheck className="mt-0.5 h-4 w-4 shrink-0 text-jungle" /> <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-6">
          <div className="flex items-end justify-between gap-3 border-t border-ink/10 pt-5">
            {showPrice && (
              <div>
                <span className="block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.2em] text-gold-dark">{COPY.from[locale]}</span>
                <span className="font-display text-[2.3rem] leading-none text-ink">{rate.price || price}</span>
                <span className="ml-1.5 text-xs font-semibold text-ink-light">{COPY.person[locale]}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {showDetailsLink && (
                <Link to={detailsPath} onClick={() => playClickFx()} className="link-rule text-sm">
                  {COPY.details[locale]}
                </Link>
              )}
              {enabled && (
                <a href={whatsapp()} target="_blank" rel="noopener noreferrer" onClick={() => playClickFx()} className="btn-wa btn-sm">
                  <FaWhatsapp className="h-4 w-4" /> {COPY.book[locale]}
                </a>
              )}
            </div>
          </div>

          {enabled && (
            <>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="mt-4 flex w-full items-center justify-between rounded-[4px] bg-paper px-4 py-3 font-condensed text-sm font-bold uppercase tracking-[0.14em] text-ink transition hover:bg-paper-warm"
              >
                {COPY.pay[locale]}
                <HiChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-left">
                      <span className="mb-1 block font-condensed text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{COPY.guests[locale]}</span>
                      <input
                        type="number"
                        min="1"
                        value={persons}
                        onChange={(event) => setPersons(Math.max(1, Number(event.target.value) || 1))}
                        className="w-full rounded-[4px] border border-ink/15 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-mango"
                      />
                    </label>
                    <label className="block text-left">
                      <span className="mb-1 block font-condensed text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
                        <FormattedMessage id="tours.dateLabel" defaultMessage="Preferred date" />
                      </span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(event) => setSelectedDate(event.target.value)}
                        className="w-full rounded-[4px] border border-ink/15 bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-mango"
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between rounded-[4px] bg-ink px-4 py-3 text-paper">
                    <span className="font-condensed text-xs font-bold uppercase tracking-[0.16em] text-gold-light">
                      <FormattedMessage id="payment.total" defaultMessage="Total" />
                    </span>
                    <span className="font-display text-2xl">{totalAmount > 0 ? `$${totalAmount} USD` : price}</span>
                  </div>
                  <PaymentDropdown
                    excursionTitle={title}
                    selectedPrice={totalAmount > 0 ? `$${totalAmount} USD` : price}
                    amount={totalAmount > 0 ? totalAmount : undefined}
                    persons={Math.max(1, persons)}
                    bookingDate={formattedSelectedDate}
                    category="tours"
                    locale={intl.locale}
                    className="w-full"
                  />
                  <AddToCartButton item={cartItem} locale={intl.locale} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default TourCard;
