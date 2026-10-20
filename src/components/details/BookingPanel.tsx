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
  // One rate on most sites (everyone pays the same); some sites sell at
  // several (adults, children), and then each gets its own count.
  const rates: PricingOption[] = service.pricingOptions.length
    ? service.pricingOptions
    : [{ tier: perPersonTier(lang), price: service.price, amount: null }];
  const rate = rates[0];
  const multi = rates.length > 1;
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(rates.map((option, index) => [option.tier, index === 0 ? 2 : 0]))
  );
  const [date, setDate] = useState('');

  const persons = Math.max(1, rates.reduce((sum, option) => sum + (counts[option.tier] ?? 0), 0));
  const total = rates.reduce((sum, option) => sum + (option.amount ?? 0) * (counts[option.tier] ?? 0), 0);
  const priced = rates.some((option) => option.amount);
  const money = (value: number) => `US$${Number.isInteger(value) ? value : value.toFixed(2)}`;
  const longDate = date
    ? new Intl.DateTimeFormat(localeTag(locale), { dateStyle: 'full' }).format(new Date(`${date}T00:00:00`))
    : '';
  const facts = useMemo(() => summariseDescription(service.description), [service.description]);
  const breakdown = rates
    .filter((option) => (counts[option.tier] ?? 0) > 0)
    .map((option) => `${counts[option.tier]} × ${option.tier}${option.amount ? ` (${money(option.amount)})` : ''}`)
    .join(', ');

  const cartItem = () => ({
    category: 'tours',
    serviceId: service.id,
    title: service.title,
    image: service.image,
    description: facts.intro,
    detailsPath,
    date: date || undefined,
    persons,
    ...(multi
      ? { quantities: counts, fixedTotal: total > 0 ? total : null, tier: breakdown }
      : { unitPrice: rate.amount ?? null, tier: rate.tier }),
    duration: facts.duration || undefined,
    included: facts.included,
    goodToKnow: facts.goodToKnow,
  });

  const reserveOnWhatsApp = () => {
    playClickFx();
    const name = brandSettings.brandName;
    const english = [
      `Hello ${name}! I would like to book: ${service.title}`,
      `People: ${multi ? breakdown : persons}`,
      `Date: ${longDate || 'flexible — please suggest one'}`,
      priced ? `Price: ${money(total)}${multi ? '' : ` (${persons} × ${money(rate.amount ?? 0)})`}` : `Price: ${rate.price}`,
      'Could you please confirm availability for that day? Thank you!',
    ].join('\n');
    const spanish = [
      `¡Hola ${name}! Quisiera reservar: ${service.title}`,
      `Personas: ${multi ? breakdown : persons}`,
      `Fecha: ${longDate || 'flexible — sugiéranme una'}`,
      priced ? `Precio: ${money(total)}${multi ? '' : ` (${persons} × ${money(rate.amount ?? 0)})`}` : `Precio: ${rate.price}`,
      '¿Me confirman la disponibilidad para ese día? ¡Gracias!',
    ].join('\n');
    const url = generateWhatsAppMessage(brandSettings.phoneNumber, lang === 'es' ? spanish : `${english}\n\n${spanish}`);
    track('reserve', { method: 'whatsapp', title: service.title, date: date || undefined, persons, total, source: 'details', locale });
    if (url) window.open(url, '_blank');
  };

  const step = (tier: string, delta: number) => {
    playClickFx();
    setCounts((current) => {
      const next = Math.min(MAX_PERSONS, Math.max(0, (current[tier] ?? 0) + delta));
      const updated = { ...current, [tier]: next };
      // Never nobody at all: the first rate keeps at least one person.
      if (Object.values(updated).every((count) => count === 0)) updated[rates[0].tier] = 1;
      return updated;
    });
  };

  const stepper = (option: PricingOption, label: React.ReactNode) => {
    const count = counts[option.tier] ?? 0;
    const floor = !multi || rates.every((other) => other.tier === option.tier || (counts[other.tier] ?? 0) === 0) ? 1 : 0;
    return (
      <div key={option.tier}>
        <span className="dv-book-label mb-1.5 flex items-center gap-1.5">{label}</span>
        <div className="dv-book-stepper flex items-center justify-between">
          <button type="button" onClick={() => step(option.tier, -1)} disabled={count <= floor} className="dv-book-step grid h-11 w-11 place-items-center" aria-label={`${option.tier} −1`}>
            <HiMinus />
          </button>
          <output className="dv-book-count tabular-nums" aria-live="polite">{count}</output>
          <button type="button" onClick={() => step(option.tier, 1)} disabled={count >= MAX_PERSONS} className="dv-book-step grid h-11 w-11 place-items-center" aria-label={`${option.tier} +1`}>
            <HiPlus />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="dv-book" aria-labelledby="dv-book-title">
      <div className="dv-book-price flex items-end justify-between gap-3">
        <div>
          <p id="dv-book-title" className="dv-book-label">
            {multi
              ? say({ en: 'Prices', es: 'Precios', de: 'Preise', fr: 'Prix' })
              : say({ en: 'Price per person', es: 'Precio por persona', de: 'Preis pro Person', fr: 'Prix par personne' })}
          </p>
          <p className="dv-book-amount tabular-nums">{rate.amount ? money(rate.amount) : rate.price || '—'}</p>
        </div>
        <span className="dv-book-tag">{rate.tier}</span>
      </div>
      {multi && (
        <ul className="dv-book-rates mt-2 flex flex-wrap gap-2">
          {rates.slice(1).map((option) => (
            <li key={option.tier} className="dv-book-tag">
              {option.tier}: {option.amount ? money(option.amount) : option.price}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid gap-4">
        {multi
          ? rates.map((option) => stepper(option, <><MdGroups aria-hidden="true" /> {option.tier}</>))
          : stepper(rate, <><MdGroups aria-hidden="true" /> {say({ en: 'People', es: 'Personas', de: 'Personen', fr: 'Personnes' })}</>)}

        <label className="block">
          <span className="dv-book-label mb-1.5 flex items-center gap-1.5">
            <MdEvent aria-hidden="true" /> {say({ en: 'Date', es: 'Fecha', de: 'Datum', fr: 'Date' })}
          </span>
          <input type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} className="dv-book-date w-full" />
        </label>
      </div>

      <div className="dv-book-total mt-5 flex items-center justify-between">
        <span>{say({ en: 'Total', es: 'Total', de: 'Gesamt', fr: 'Total' })}</span>
        <strong className="tabular-nums">{priced ? money(total) : rate.price}</strong>
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
          selectedPrice={priced ? `${money(total)} USD` : rate.price}
          amount={priced ? total : undefined}
          persons={persons}
          {...(multi ? { quantities: counts } : {})}
          bookingDate={longDate}
          category="tours"
          serviceId={service.id}
          locale={locale}
          methods={['card', 'applepay', 'googlepay', 'paypal']}
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
