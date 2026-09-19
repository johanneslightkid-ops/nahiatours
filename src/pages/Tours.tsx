import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSearchParams } from 'react-router-dom';
import { HiSearch, HiX } from 'react-icons/hi';
import TourCard from '../components/TourCard';
import { Tour, getTours, getServiceSlug } from '../services/toursService';
import { useI18n } from '../contexts/I18nContext';
import { useBrand } from '../contexts/BrandContext';
import PageHeader from '../components/layout/PageHeader';
import { Catamaran, Pineapple, LeafSprig } from '../components/ui/Illustrations';
import { availableFacets, facetsOf, matchesQuery } from '../lib/catalogueFacets';

/**
 * The excursion catalogue, with a way through it.
 *
 * Sixteen cards in one undifferentiated grid is a list, not a way of choosing.
 * The explorer above the grid is built from the catalogue itself (see
 * lib/catalogueFacets.ts): every chip corresponds to excursions that actually
 * exist, carries the count, and disappears when it would match everything or
 * nothing.
 *
 * The state lives in the URL, so a filtered view can be sent to someone — and
 * so the destination cards on the home page can link straight into it.
 */
const Tours: React.FC = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  // Seeded from the URL so the destination cards on the home page can link
  // straight to a place, then purely local — typing should not write a history
  // entry per keystroke.
  const [query, setQuery] = useState(() => searchParams.get('q') || '');

  const isEs = locale === 'es';
  const active = searchParams.get('focus') || '';

  useEffect(() => {
    let current = true;
    setLoading(true);
    getTours(locale).then((fetched) => {
      if (!current) return;
      setTours(fetched);
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [locale]);

  const facets = useMemo(() => availableFacets(tours), [tours]);

  const visible = useMemo(
    () =>
      tours.filter(
        (tour) => (!active || facetsOf(tour).includes(active)) && matchesQuery(tour, query)
      ),
    [tours, active, query]
  );

  const setFocus = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (!id || id === active) next.delete('focus');
    else next.set('focus', id);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="pb-24">
      <PageHeader
        tone="lagoon"
        kicker={isEs ? 'Elige tu día' : 'Pick your day'}
        title={<FormattedMessage id="tours.title" />}
        subtitle={
          <FormattedMessage id="tours.dynamicSubtitle" values={{ brand: brandSettings.brandName }} />
        }
        artLeft={<Catamaran className="h-36 w-36" />}
        artRight={<Pineapple className="h-32 w-24" />}
      />

      <div className="section-shell -mt-4">
        {/* ── The explorer ─────────────────────────────────────────────── */}
        {!loading && tours.length > 0 && (
          <div className="mb-10 border-b border-ink/10 pb-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              {facets.length > 0 && (
                <div>
                  <p className="hand-note mb-3">{isEs ? 'Explora por' : 'Browse by'}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFocus('')}
                      data-selected={!active}
                      className="planner-chip"
                    >
                      {isEs ? 'Todo' : 'Everything'}
                      <span className="text-ink-light">{tours.length}</span>
                    </button>
                    {facets.map((facet) => (
                      <button
                        key={facet.id}
                        type="button"
                        onClick={() => setFocus(facet.id)}
                        data-selected={active === facet.id}
                        aria-pressed={active === facet.id}
                        className="planner-chip"
                      >
                        {isEs ? facet.label.es : facet.label.en}
                        <span className={active === facet.id ? 'text-paper/70' : 'text-ink-light'}>
                          {facet.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="relative block w-full lg:w-72">
                <span className="sr-only">{isEs ? 'Buscar excursiones' : 'Search excursions'}</span>
                <HiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isEs ? 'Saona, buggy, cascada…' : 'Saona, buggy, waterfall…'}
                  className="w-full !rounded-full py-2.5 pl-10 pr-4 text-sm"
                />
              </label>
            </div>

            <p className="mt-5 text-sm text-ink-soft">
              {isEs
                ? `Mostrando ${visible.length} de ${tours.length} excursiones`
                : `Showing ${visible.length} of ${tours.length} excursions`}
              {(active || query) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFocus('');
                  }}
                  className="ml-3 inline-flex items-center gap-1 text-sm font-semibold text-coral-deep hover:underline"
                >
                  <HiX className="h-3.5 w-3.5" />
                  {isEs ? 'Quitar filtros' : 'Clear filters'}
                </button>
              )}
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="postcard h-[28rem] animate-pulse" aria-hidden="true" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <LeafSprig className="mx-auto mb-6 h-12 w-40 opacity-60" />
            <p className="font-display text-2xl text-ink">
              {isEs ? 'Nada coincide con esa búsqueda' : 'Nothing matches that search'}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFocus('');
              }}
              className="tropical-button-outline mt-6"
            >
              {isEs ? 'Ver todas las excursiones' : 'See every excursion'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((tour, index) => (
              <TourCard
                key={tour.id}
                image={tour.image}
                title={tour.title}
                description={tour.description}
                price={tour.price}
                pricingOptions={tour.pricingOptions}
                excursionName={tour.title}
                detailsPath={`/details/tours/${getServiceSlug(tour)}`}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tours;
