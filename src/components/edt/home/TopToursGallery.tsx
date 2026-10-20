import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { HiArrowRight, HiClock, HiLocationMarker } from 'react-icons/hi';
import AutoScrollGallery from '../AutoScrollGallery';
import { useI18n, type Locale } from '../../../contexts/I18nContext';
import { useBrand } from '../../../contexts/BrandContext';
import { getServiceSlug, Tour } from '../../../services/toursService';
import { generateWhatsAppMessage } from '../../../utils/whatsapp';
import { descriptionField, smallImage, useTours } from '../../../edt/useTours';
import { playClickFx } from '../../../lib/soundEngine';

type L = Record<Locale, string>;

const COPY = {
  kicker: { en: 'Top tours', es: 'Top tours', fr: 'Top excursions', de: 'Top-Touren' },
  title1: { en: 'Booked most.', es: 'Los más reservados.', fr: 'Les plus réservées.', de: 'Am meisten gebucht.' },
  title2: { en: 'Rated best.', es: 'Los mejor valorados.', fr: 'Les mieux notées.', de: 'Am besten bewertet.' },
  text: {
    en: 'The days our guests choose again and again — ranked, priced upfront, ready to book.',
    es: 'Los días que nuestros viajeros eligen una y otra vez: en orden, con precio claro y listos para reservar.',
    fr: 'Les journées que nos voyageurs choisissent encore et encore — classées, avec le prix affiché, prêtes à réserver.',
    de: 'Die Tage, die unsere Gäste immer wieder wählen — nach Rang, mit Preis vorab, sofort buchbar.',
  },
  all: { en: 'All excursions', es: 'Todas las excursiones', fr: 'Toutes les excursions', de: 'Alle Ausflüge' },
  from: { en: 'from', es: 'desde', fr: 'dès', de: 'ab' },
  details: { en: 'Details', es: 'Detalles', fr: 'Détails', de: 'Details' },
  book: { en: 'Book', es: 'Reservar', fr: 'Réserver', de: 'Buchen' },
  person: { en: 'per person', es: 'por persona', fr: 'par personne', de: 'pro Person' },
  ask: { en: 'Hello! I would like to book', es: '¡Hola! Me gustaría reservar', fr: 'Bonjour ! Je voudrais réserver', de: 'Hallo! Ich möchte buchen:' },
  label: { en: 'Top tours', es: 'Top tours', fr: 'Top excursions', de: 'Top-Touren' },
};

export const RankedTourCard: React.FC<{ tour: Tour; rank: number; locale: Locale; phone: string }> = ({ tour, rank, locale, phone }) => {
  const path = `/details/tours/${getServiceSlug(tour)}`;
  const duration = tour.duration || descriptionField(tour.description, 'duration');
  const departs = tour.destination || descriptionField(tour.description, 'departs');
  return (
    <article className="ranked-card group w-[18.5rem] sm:w-[21rem]">
      <Link to={path} onClick={() => playClickFx()} className="relative block aspect-[4/3] overflow-hidden no-underline" draggable={false}>
        <img src={smallImage(tour.image)} alt={tour.title} loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
        <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
        <span className="ranked-number">#{String(rank).padStart(2, '0')}</span>
        {departs && (
          <span className="absolute right-3 top-3 badge badge-light">
            <HiLocationMarker className="h-3 w-3 text-mango-dark" /> {departs}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 font-condensed text-[0.78rem] font-bold uppercase tracking-[0.16em] text-ink-soft">
          {duration && (
            <span className="inline-flex items-center gap-1"><HiClock className="h-3.5 w-3.5 text-gold" /> {duration}</span>
          )}
        </div>
        <h3 className="mt-2 font-display text-[1.65rem] uppercase leading-[0.98] text-ink">
          <Link to={path} className="text-ink no-underline hover:text-mango-dark" draggable={false}>{tour.title}</Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <span className="block font-condensed text-[0.7rem] font-bold uppercase tracking-[0.2em] text-gold-dark">{COPY.from[locale]}</span>
            <span className="font-display text-[2.3rem] leading-none text-ink">{tour.price}</span>
            <span className="ml-1.5 text-xs font-semibold text-ink-light">{COPY.person[locale]}</span>
          </div>
          <div className="flex gap-2">
            <Link to={path} onClick={() => playClickFx()} className="grid h-11 w-11 place-items-center rounded-[3px] text-ink ring-1 ring-ink/15 transition hover:bg-ink hover:text-paper" aria-label={COPY.details[locale]} draggable={false}>
              <HiArrowRight className="h-5 w-5" />
            </Link>
            <a
              href={generateWhatsAppMessage(phone, `${COPY.ask[locale]} ${tour.title}.`)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playClickFx()}
              className="btn-wa btn-sm"
              draggable={false}
            >
              <FaWhatsapp className="h-4 w-4" /> {COPY.book[locale]}
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};

/** Above the welcome: the best sellers, ranked, in a reel that stops when you reach for it. */
const TopToursGallery: React.FC<{ count?: number }> = ({ count = 10 }) => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const tours = useTours(locale);
  const region = useRef<HTMLElement>(null);
  const top = (tours ?? []).slice(0, count);

  return (
    <section id="top-tours" ref={region} className="home-section relative overflow-hidden bg-paper-warm py-20 sm:py-28" aria-label={COPY.label[locale]}>
      <div className="pointer-events-none absolute -right-10 top-6 select-none font-display text-[16vw] uppercase leading-none text-ink/[0.035]" aria-hidden="true">
        Top
      </div>
      <div className="section-shell relative mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="kicker">{COPY.kicker[locale]}</span>
          <h2 className="display-lg mt-4">
            {COPY.title1[locale]}
            <br />
            <span className="text-mango-dark">{COPY.title2[locale]}</span>
          </h2>
          <p className="lede mt-5 max-w-xl">{COPY.text[locale]}</p>
        </div>
        <Link to="/tours" onClick={() => playClickFx()} className="link-rule shrink-0 self-start md:self-end">
          {COPY.all[locale]} <HiArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {tours === null ? (
        <div className="section-shell flex gap-5 overflow-hidden">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="h-[26rem] w-[21rem] shrink-0 animate-pulse rounded-[8px] bg-white/70" />
          ))}
        </div>
      ) : (
        <AutoScrollGallery
          items={top}
          itemKey={(item) => String(item.id)}
          renderItem={(item, index) => <RankedTourCard tour={item} rank={index + 1} locale={locale} phone={brandSettings.phoneNumber} />}
          regionRef={region}
          speed={30}
          label={COPY.label[locale]}
        />
      )}
    </section>
  );
};

export default TopToursGallery;
