import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePlanner } from '../../contexts/PlannerContext';
import { useI18n } from '../../contexts/I18nContext';
import Reveal from '../ui/Reveal';
import { Island, Waterfall, Cave, Shell, Coral, Turtle, IllustrationProps } from '../ui/Illustrations';

interface Place {
  id: string;
  /** Matched against the catalogue text; a place with no match is not shown. */
  match: string[];
  name: string;
  line: { en: string; es: string };
  art: React.FC<IllustrationProps>;
}

/**
 * The places the catalogue actually goes.
 *
 * Every entry is checked against the live excursion text before it is
 * rendered, so this section can only ever advertise a destination the business
 * really sells — and the count under each name is the real number of
 * excursions that reach it.
 */
const PLACES: Place[] = [
  {
    id: 'saona',
    match: ['saona'],
    name: 'Isla Saona',
    line: {
      en: 'Catamaran, the Natural Pool, and a long afternoon on the sand.',
      es: 'Catamarán, la Piscina Natural y una tarde larga en la arena.',
    },
    art: Island,
  },
  {
    id: 'catalina',
    match: ['catalina'],
    name: 'Isla Catalina',
    line: {
      en: 'Reef snorkelling off a protected island, an hour from the coast.',
      es: 'Snorkel en el arrecife de una isla protegida, a una hora de la costa.',
    },
    art: Coral,
  },
  {
    id: 'macao',
    match: ['macao', 'bávaro', 'bavaro', 'beach', 'playa'],
    name: 'Macao & Bávaro',
    line: {
      en: 'The open Atlantic beaches north of the resorts.',
      es: 'Las playas abiertas del Atlántico, al norte de los hoteles.',
    },
    art: Shell,
  },
  {
    id: 'jungle',
    match: ['jungle', 'selva', 'waterfall', 'cascada', 'salto', 'river', 'río'],
    name: 'Jungle & waterfalls',
    line: {
      en: 'Inland, where the rivers come down through the green.',
      es: 'Tierra adentro, donde los ríos bajan entre el verde.',
    },
    art: Waterfall,
  },
  {
    id: 'caves',
    match: ['cave', 'cueva', 'hoyo azul', 'cenote', 'lagoon', 'laguna'],
    name: 'Caves & blue holes',
    line: {
      en: 'Fresh water under the limestone, cold and impossibly clear.',
      es: 'Agua dulce bajo la caliza, fría y de una claridad imposible.',
    },
    art: Cave,
  },
  {
    id: 'reef',
    match: ['snorkel', 'reef', 'arrecife', 'buceo', 'diving', 'dolphin', 'delfín'],
    name: 'The reef',
    line: {
      en: 'Rays, starfish and warm shallow water over the coral.',
      es: 'Rayas, estrellas de mar y agua tibia sobre el coral.',
    },
    art: Turtle,
  },
];

const DestinationStrip: React.FC = () => {
  const { catalogue } = usePlanner();
  const { locale } = useI18n();
  const isEs = locale === 'es';

  const places = useMemo(() => {
    const entries = catalogue.map((entry) => ({
      text: `${entry.tour.title} ${entry.tour.description}`.toLowerCase(),
    }));
    if (entries.length === 0) return [];

    return PLACES.map((place) => ({
      ...place,
      count: entries.filter((entry) => place.match.some((m) => entry.text.includes(m))).length,
    })).filter((place) => place.count > 0);
  }, [catalogue]);

  // Nothing loaded, or nothing matched: say nothing rather than show a section
  // full of destinations the catalogue cannot take anybody to.
  if (places.length < 3) return null;

  return (
    <section className="home-section cove-section wavy-band relative overflow-hidden py-20 sm:py-24">
      <div className="section-shell relative z-10">
        <div className="mb-10 max-w-2xl">
          <p className="hand-note mb-4">{isEs ? 'La costa' : 'The coast'}</p>
          <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl md:text-[2.8rem]">
            {isEs ? 'Dónde te lleva el día' : 'Where the day takes you'}
          </h2>
          <p className="mt-4 text-lg leading-8 text-ink-soft">
            {isEs
              ? 'Seis lugares de la República Dominicana a los que llegan nuestras excursiones. Toca uno para ver las que van allí.'
              : 'Six places in the Dominican Republic our excursions actually reach. Tap one to see the trips that go there.'}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place, index) => {
            const Art = place.art;
            return (
              <Reveal key={place.id} delay={Math.min(index, 5) * 70}>
                <Link
                  to={`/tours?q=${encodeURIComponent(place.match[0])}#top`}
                  className="postcard group flex h-full items-start gap-4 p-5 sm:p-6"
                >
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-paper-warm">
                    <Art className="h-11 w-11" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-xl font-semibold text-ink">
                      {place.name}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-ink-soft">
                      {isEs ? place.line.es : place.line.en}
                    </span>
                    <span className="mt-3 block text-[0.66rem] font-bold uppercase tracking-[0.18em] text-sea-deep">
                      {place.count}{' '}
                      {isEs
                        ? place.count === 1
                          ? 'excursión'
                          : 'excursiones'
                        : place.count === 1
                        ? 'excursion'
                        : 'excursions'}
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DestinationStrip;
