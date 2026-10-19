import React, { useMemo, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { HiMinus, HiPlus } from 'react-icons/hi';
import { MdEvent, MdGroups } from 'react-icons/md';
import { useBrand } from '../../contexts/BrandContext';
import { localeTag, localeText } from '../../lib/localeText';
import { summariseDescription } from '../../lib/cart';
import { track } from '../../lib/activity';
import { playClickFx } from '../../lib/soundEngine';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { PricingOption, Tour, perPersonTier } from '../../services/toursService';
import AddToCartButton from '../cart/AddToCartButton';
import PaymentDropdown from '../ui/PaymentDropdown';

/**
 * Booking, beside the tour: the price per person, how many are coming, which
 * day, the total — and the three ways on from there: set it aside in the cart,
 * ask on WhatsApp for the day to be confirmed, or pay now (the payment menu,
 * which asks afterwards whether the payment went through).
 *
 * Styled by the site's own `.dv-book*` rules.
 */

interface Props {
  service: Tour;
  detailsPath: string;
  locale: string;
}

const MAX_PERSONS = 40;

const today = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const BookingPanel: React.FC<Props> = ({ service, detailsPath, locale }) => {
  const { brandSettings } = useBrand();
  const say = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);
  const lang = (['es', 'de', 'fr'].includes(locale) ? locale : 'en') as 'en' | 'es' | 'de' | 'fr';
  const rate: PricingOption = service.pricingOptions[0] ?? { tier: perPersonTier(lang), price: service.price, amount: null };
  const [persons, setPersons] = useState(2);
  const [date, setDate] = useState('');

  const total = (rate.amount ?? 0) * persons;
  const money = (value: number) => `US$${Number.isInteger(value) ? value : value.toFixed(2)}`;
  const longDate = date
    ? new Intl.DateTimeFormat(localeTag(locale), { dateStyle: 'full' }).format(new Date(`${date}T00:00:00`))
    : '';
  const facts = useMemo(() => summariseDescription(service.description), [service.description]);

  const cartItem = () => ({
    category: 'tours',
    serviceId: service.id,
    title: service.title,
    image: service.image,
    description: facts.intro,
    detailsPath,
    date: date || undefined,
    persons,
    unitPrice: rate.amount ?? null,
    tier: rate.tier,
    duration: facts.duration || undefined,
    included: facts.included,
    goodToKnow: facts.goodToKnow,
  });

  const reserveOnWhatsApp = () => {
    playClickFx();
    const name = brandSettings.brandName;
    const english = [
      `Hello ${name}! I would like to book: ${service.title}`,
      `People: ${persons}`,
      `Date: ${longDate || 'flexible — please suggest one'}`,
      rate.amount ? `Price: ${money(total)} (${persons} × ${money(rate.amount)})` : `Price: ${rate.price}`,
      'Could you please confirm availability for that day? Thank you!',
    ].join('\n');
    const spanish = [
      `¡Hola ${name}! Quisiera reservar: ${service.title}`,
      `Personas: ${persons}`,
      `Fecha: ${longDate || 'flexible — sugiéranme una'}`,
      rate.amount ? `Precio: ${money(total)} (${persons} × ${money(rate.amount)})` : `Precio: ${rate.price}`,
      '¿Me confirman la disponibilidad para ese día? ¡Gracias!',
    ].join('\n');
    const url = generateWhatsAppMessage(brandSettings.phoneNumber, lang === 'es' ? spanish : `${english}\n\n${spanish}`);
    track('reserve', { method: 'whatsapp', title: service.title, date: date || undefined, persons, total, source: 'details', locale });
    if (url) window.open(url, '_blank');
  };

  const step = (delta: number) => {
    playClickFx();
    setPersons((current) => Math.min(MAX_PERSONS, Math.max(1, current + delta)));
  };

  return (
    <section className="dv-book" aria-labelledby="dv-book-title">
      <div className="dv-book-price flex items-end justify-between gap-3">
        <div>
          <p id="dv-book-title" className="dv-book-label">
            {say({ en: 'Price per person', es: 'Precio por persona', de: 'Preis pro Person', fr: 'Prix par personne' })}
          </p>
          <p className="dv-book-amount tabular-nums">{rate.amount ? money(rate.amount) : rate.price || '—'}</p>
        </div>
        <span className="dv-book-tag">{rate.tier}</span>
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <span className="dv-book-label mb-1.5 flex items-center gap-1.5">
            <MdGroups aria-hidden="true" /> {say({ en: 'People', es: 'Personas', de: 'Personen', fr: 'Personnes' })}
          </span>
          <div className="dv-book-stepper flex items-center justify-between">
            <button type="button" onClick={() => step(-1)} disabled={persons <= 1} className="dv-book-step grid h-11 w-11 place-items-center" aria-label={say({ en: 'One person less', es: 'Una persona menos', de: 'Eine Person weniger', fr: 'Une personne de moins' })}>
              <HiMinus />
            </button>
            <output className="dv-book-count tabular-nums" aria-live="polite">{persons}</output>
            <button type="button" onClick={() => step(1)} disabled={persons >= MAX_PERSONS} className="dv-book-step grid h-11 w-11 place-items-center" aria-label={say({ en: 'One person more', es: 'Una persona más', de: 'Eine Person mehr', fr: 'Une personne de plus' })}>
              <HiPlus />
            </button>
          </div>
        </div>

        <label className="block">
          <span className="dv-book-label mb-1.5 flex items-center gap-1.5">
            <MdEvent aria-hidden="true" /> {say({ en: 'Date', es: 'Fecha', de: 'Datum', fr: 'Date' })}
          </span>
          <input type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} className="dv-book-date w-full" />
        </label>
      </div>

      <div className="dv-book-total mt-5 flex items-center justify-between">
        <span>{say({ en: 'Total', es: 'Total', de: 'Gesamt', fr: 'Total' })}</span>
        <strong className="tabular-nums">{rate.amount ? money(total) : rate.price}</strong>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="dv-book-cart">
          <AddToCartButton item={cartItem} locale={locale} />
        </div>
        <button type="button" onClick={reserveOnWhatsApp} className="dv-book-whatsapp flex w-full items-center justify-center gap-2">
          <FaWhatsapp className="h-5 w-5" />
          {say({ en: 'Reserve & confirm on WhatsApp', es: 'Reservar y confirmar por WhatsApp', de: 'Per WhatsApp reservieren & bestätigen', fr: 'Réserver et confirmer sur WhatsApp' })}
        </button>
        <PaymentDropdown
          excursionTitle={service.title}
          selectedPrice={rate.amount ? `${money(total)} USD` : rate.price}
          amount={rate.amount ? total : undefined}
          persons={persons}
          bookingDate={longDate}
          category="tours"
          serviceId={service.id}
          locale={locale}
          methods={['card', 'paypal']}
          hideWhenEmpty
          className="w-full"
        />
      </div>

      <p className="dv-book-note mt-4">
        {say({
          en: 'Asking costs nothing: we confirm the day on WhatsApp before anything is paid.',
          es: 'Preguntar no cuesta nada: confirmamos el día por WhatsApp antes de cualquier pago.',
          de: 'Fragen kostet nichts: Wir bestätigen den Tag per WhatsApp, bevor etwas bezahlt wird.',
          fr: 'Demander ne coûte rien : nous confirmons le jour sur WhatsApp avant tout paiement.',
        })}
      </p>
    </section>
  );
};

export default BookingPanel;
