import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HiOutlineSearch, HiX, HiAdjustments } from 'react-icons/hi';
import TourCard from '../components/TourCard';
import { getServiceSlug, Tour } from '../services/toursService';
import { useI18n, type Locale } from '../contexts/I18nContext';
import PageHeader from '../components/layout/PageHeader';
import AutoScrollGallery from '../components/edt/AutoScrollGallery';
import { DestinationItem, getDestinations } from '../edt/destinations';
import { buildIndex, FACETS, FacetId, scoreEntry, tourHours, tourPrice } from '../edt/tourFacets';
import { smallImage, useTours } from '../edt/useTours';
import { playClickFx } from '../lib/soundEngine';

type L = Record<Locale, string>;

const COPY = {
  kicker: { en: 'Excursions', es: 'Excursiones', fr: 'Excursions', de: 'Ausflüge' },
  title: { en: 'Pick your day', es: 'Elige tu día', fr: 'Choisissez votre journée', de: 'Wähle deinen Tag' },
  subtitle: {
    en: 'Islands, jungle, culture and open sea — every excursion with hotel pickup, certified guides and the price upfront.',
    es: 'Islas, selva, cultura y mar abierto: cada excursión con recogida en el hotel, guías certificados y el precio claro.',
    fr: 'Îles, jungle, culture et grand large — chaque excursion avec prise en charge à l’hôtel, guides certifiés et prix affiché.',
    de: 'Inseln, Dschungel, Kultur und offenes Meer — jeder Ausflug mit Hotelabholung, zertifizierten Guides und Preis vorab.',
  },
  destKicker: { en: 'Top destinations', es: 'Destinos top', fr: 'Destinations phares', de: 'Top-Ziele' },
  destTitle: { en: 'Where do you want to go?', es: '¿A dónde quieres ir?', fr: 'Où voulez-vous aller ?', de: 'Wohin soll es gehen?' },
  tours: { en: 'tours', es: 'tours', fr: 'excursions', de: 'Touren' },
  search: { en: 'Search: Saona, snorkel, dolphins, lunch…', es: 'Busca: Saona, snorkel, delfines, almuerzo…', fr: 'Rechercher : Saona, snorkeling, dauphins…', de: 'Suche: Saona, Schnorcheln, Delfine…' },
  any: { en: 'Anywhere', es: 'Cualquier lugar', fr: 'Partout', de: 'Überall' },
  departs: { en: 'Departs from', es: 'Sale desde', fr: 'Départ de', de: 'Abfahrt ab' },
  duration: { en: 'Duration', es: 'Duración', fr: 'Durée', de: 'Dauer' },
  anyLength: { en: 'Any length', es: 'Cualquier duración', fr: 'Toutes durées', de: 'Jede Dauer' },
  short: { en: 'Up to 4 hours', es: 'Hasta 4 horas', fr: 'Jusqu’à 4 heures', de: 'Bis 4 Stunden' },
  mid: { en: '5–7 hours', es: '5–7 horas', fr: '5–7 heures', de: '5–7 Stunden' },
  long: { en: '8 hours or more', es: '8 horas o más', fr: '8 heures et plus', de: '8 Stunden oder mehr' },
  maxPrice: { en: 'Up to', es: 'Hasta', fr: 'Jusqu’à', de: 'Bis' },
  sort: { en: 'Sort', es: 'Ordenar', fr: 'Trier', de: 'Sortieren' },
  popular: { en: 'Most popular', es: 'Más populares', fr: 'Les plus populaires', de: 'Beliebteste' },
  cheap: { en: 'Price: low to high', es: 'Precio: de menor a mayor', fr: 'Prix croissant', de: 'Preis aufsteigend' },
  dear: { en: 'Price: high to low', es: 'Precio: de mayor a menor', fr: 'Prix décroissant', de: 'Preis absteigend' },
  quick: { en: 'Shortest first', es: 'Más cortos primero', fr: 'Plus courtes d’abord', de: 'Kürzeste zuerst' },
  results: { en: 'excursions found', es: 'excursiones encontradas', fr: 'excursions trouvées', de: 'Ausflüge gefunden' },
  clear: { en: 'Clear all', es: 'Borrar todo', fr: 'Tout effacer', de: 'Alles zurücksetzen' },
  none: { en: 'Nothing matches that yet — try fewer filters, or ask us on WhatsApp.', es: 'Nada coincide todavía: prueba con menos filtros o pregúntanos por WhatsApp.', fr: 'Rien ne correspond — essayez moins de filtres ou écrivez-nous sur WhatsApp.', de: 'Noch nichts gefunden — versuche weniger Filter oder frag uns per WhatsApp.' },
  filters: { en: 'Filters', es: 'Filtros', fr: 'Filtres', de: 'Filter' },
  loading: { en: 'Loading excursions…', es: 'Cargando excursiones…', fr: 'Chargement des excursions…', de: 'Ausflüge werden geladen…' },
};

type SortKey = 'popular' | 'cheap' | 'dear' | 'quick';
type LengthKey = 'any' | 'short' | 'mid' | 'long';

const strip = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Does a tour belong to a destination card? Its departure point first, then its text. */
const matchesPlace = (tour: Tour, tag: string) => {
  const place = strip(tag);
  if (!place) return true;
  if (tour.destination) return strip(tour.destination).includes(place) || strip(tour.title).includes(place);
  return strip(`${tour.title} ${tour.description}`).includes(place);
};

const Tours: React.FC = () => {
  const { locale } = useI18n();
  const tours = useTours(locale);
  const destinationsRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [destinations, setDestinations] = useState<DestinationItem[]>([]);
  const [speed, setSpeed] = useState(32);
  const [query, setQuery] = useState('');
  const [facets, setFacets] = useState<Set<FacetId>>(new Set());
  const [place, setPlace] = useState('');
  const [length, setLength] = useState<LengthKey>('any');
  const [sort, setSort] = useState<SortKey>('popular');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getDestinations().then((config) => {
      if (!config.enabled) return;
      setDestinations(config.items.filter((item) => item.enabled && item.image));
      setSpeed(config.speed);
    });
  }, []);

  const list = tours ?? [];
  const index = useMemo(() => buildIndex(list, locale), [list, locale]);
  const priceCeiling = useMemo(() => Math.max(50, ...list.map((tour) => tourPrice(tour) ?? 0)), [list]);
  const places = useMemo(() => {
    const seen = new Map<string, string>();
    list.forEach((tour) => tour.destination && seen.set(strip(tour.destination), tour.destination));
    return [...seen.values()];
  }, [list]);

  const facetCounts = useMemo(() => {
    const counts = new Map<FacetId, number>();
    index.forEach((entry) => entry.facets.forEach((facet) => counts.set(facet, (counts.get(facet) ?? 0) + 1)));
    return counts;
  }, [index]);

  const placeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    destinations.forEach((item) => counts.set(item.id, list.filter((tour) => matchesPlace(tour, item.tag)).length));
    return counts;
  }, [destinations, list]);

  const results = useMemo(() => {
    const scored = index
      .map((entry, position) => ({ entry, position, score: scoreEntry(entry, query) }))
      .filter(({ entry, score }) => {
        if (!score) return false;
        for (const facet of facets) if (!entry.facets.has(facet)) return false;
        if (place && !matchesPlace(entry.tour, place)) return false;
        const hours = tourHours(entry.tour);
        if (length === 'short' && !(hours !== null && hours <= 4)) return false;
        if (length === 'mid' && !(hours !== null && hours > 4 && hours < 8)) return false;
        if (length === 'long' && !(hours !== null && hours >= 8)) return false;
        const price = tourPrice(entry.tour);
        if (maxPrice !== null && price !== null && price > maxPrice) return false;
        return true;
      });
    const byPrice = (a: (typeof scored)[number], b: (typeof scored)[number]) => (tourPrice(a.entry.tour) ?? 9e9) - (tourPrice(b.entry.tour) ?? 9e9);
    if (sort === 'cheap') scored.sort(byPrice);
    else if (sort === 'dear') scored.sort((a, b) => -byPrice(a, b));
    else if (sort === 'quick') scored.sort((a, b) => (tourHours(a.entry.tour) ?? 99) - (tourHours(b.entry.tour) ?? 99));
    else if (query.trim()) scored.sort((a, b) => b.score - a.score || a.position - b.position);
    return scored.map(({ entry, position }) => ({ tour: entry.tour, rank: position + 1 }));
  }, [index, query, facets, place, length, maxPrice, sort]);

  const active = query.trim() !== '' || facets.size > 0 || place !== '' || length !== 'any' || maxPrice !== null;
  const clear = () => {
    setQuery('');
    setFacets(new Set());
    setPlace('');
    setLength('any');
    setMaxPrice(null);
    setSort('popular');
  };

  const toggleFacet = (id: FacetId) => {
    playClickFx();
    setFacets((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pickDestination = (item: DestinationItem) => {
    playClickFx();
    setPlace((current) => (strip(current) === strip(item.tag) ? '' : item.tag));
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  return (
    <div className="pb-24">
      <PageHeader tone="lagoon" kicker={COPY.kicker[locale]} title={COPY.title[locale]} subtitle={COPY.subtitle[locale]} />

      {/* Top destinations — a reel; a card filters the list below. */}
      {destinations.length > 0 && (
        <section ref={destinationsRef} className="relative overflow-hidden bg-paper-warm py-14 sm:py-16" aria-label={COPY.destKicker[locale]}>
          <div className="section-shell mb-8 flex items-end justify-between gap-4">
            <div>
              <span className="kicker">{COPY.destKicker[locale]}</span>
              <h2 className="display-md mt-3">{COPY.destTitle[locale]}</h2>
            </div>
          </div>
          <AutoScrollGallery
            items={destinations}
            itemKey={(item) => item.id}
            regionRef={destinationsRef}
            speed={speed}
            label={COPY.destKicker[locale]}
            renderItem={(item) => (
              <button type="button" onClick={() => pickDestination(item)} aria-pressed={strip(place) === strip(item.tag)} className="destination-card group">
                <img src={smallImage(item.image)} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.07]" />
                <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-5">
                  <span className="block font-condensed text-xs font-bold uppercase tracking-[0.2em] text-mango-light">
                    {placeCounts.get(item.id) ?? 0} {COPY.tours[locale]}
                  </span>
                  <span className="mt-1 block font-display text-3xl uppercase leading-none text-white">{item.name}</span>
                  {item.caption[locale] && <span className="mt-2 block text-sm leading-snug text-white/80">{item.caption[locale]}</span>}
                </span>
              </button>
            )}
          />
        </section>
      )}

      {/* The finder. */}
      <div ref={resultsRef} className="section-shell scroll-mt-28 pt-12">
        <div className="finder-bar p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative flex-1">
              <span className="sr-only">{COPY.search[locale]}</span>
              <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-light" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={COPY.search[locale]}
                className="w-full rounded-[6px] border border-ink/15 bg-paper py-3.5 pl-12 pr-10 text-base font-medium text-ink outline-none transition focus:border-mango focus:bg-white"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-light hover:text-ink" aria-label={COPY.clear[locale]}>
                  <HiX className="h-4 w-4" />
                </button>
              )}
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} className="btn-outline btn-sm md:hidden">
                <HiAdjustments className="h-4 w-4" /> {COPY.filters[locale]}
              </button>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="finder-select flex-1 md:flex-none" aria-label={COPY.sort[locale]}>
                <option value="popular">{COPY.popular[locale]}</option>
                <option value="cheap">{COPY.cheap[locale]}</option>
                <option value="dear">{COPY.dear[locale]}</option>
                <option value="quick">{COPY.quick[locale]}</option>
              </select>
            </div>
          </div>

          {/* Hashtags. */}
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Hashtags">
            {FACETS.filter((facet) => (facetCounts.get(facet.id) ?? 0) > 0).map((facet) => (
              <button key={facet.id} type="button" onClick={() => toggleFacet(facet.id)} aria-pressed={facets.has(facet.id)} className="hashtag">
                #{facet.label[locale]} <span className="hashtag-count">{facetCounts.get(facet.id)}</span>
              </button>
            ))}
          </div>

          <div className={`mt-4 grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-3 ${showFilters ? '' : 'hidden md:grid'}`}>
            <label className="block">
              <span className="mb-1 block font-condensed text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">{COPY.departs[locale]}</span>
              <select value={place} onChange={(event) => setPlace(event.target.value)} className="finder-select w-full">
                <option value="">{COPY.any[locale]}</option>
                {places.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-condensed text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">{COPY.duration[locale]}</span>
              <select value={length} onChange={(event) => setLength(event.target.value as LengthKey)} className="finder-select w-full">
                <option value="any">{COPY.anyLength[locale]}</option>
                <option value="short">{COPY.short[locale]}</option>
                <option value="mid">{COPY.mid[locale]}</option>
                <option value="long">{COPY.long[locale]}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center justify-between font-condensed text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
                <span>{COPY.maxPrice[locale]}</span>
                <span className="text-ink">${maxPrice ?? priceCeiling}</span>
              </span>
              <input
                type="range"
                min={25}
                max={Math.ceil(priceCeiling / 25) * 25}
                step={5}
                value={maxPrice ?? Math.ceil(priceCeiling / 25) * 25}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setMaxPrice(value >= priceCeiling ? null : value);
                }}
                className="finder-range mt-3 w-full"
              />
            </label>
          </div>
        </div>

        <div className="mb-6 mt-8 flex items-center justify-between gap-4">
          <p className="font-condensed text-sm font-bold uppercase tracking-[0.18em] text-ink-soft">
            {tours === null ? COPY.loading[locale] : `${results.length} ${COPY.results[locale]}`}
          </p>
          {active && (
            <button type="button" onClick={clear} className="link-rule text-sm">
              {COPY.clear[locale]}
            </button>
          )}
        </div>

        {tours === null ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-[34rem] animate-pulse rounded-[8px] bg-white" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-gold/60 bg-white px-6 py-16 text-center text-lg text-ink-soft">{COPY.none[locale]}</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(({ tour, rank }) => (
              <TourCard
                key={tour.id}
                image={tour.image}
                title={tour.title}
                description={tour.description}
                price={tour.price}
                pricingOptions={tour.pricingOptions}
                excursionName={tour.title}
                detailsPath={`/details/tours/${getServiceSlug(tour)}`}
                destination={tour.destination}
                duration={tour.duration}
                rank={!active && sort === 'popular' && rank <= 3 ? rank : undefined}
                index={rank}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tours;
