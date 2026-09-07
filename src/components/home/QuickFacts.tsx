import React from 'react';
import { usePlanner } from '../../contexts/PlannerContext';
import { useI18n } from '../../contexts/I18nContext';
import { Sailboat, Starfish, Hibiscus, Cocktail } from '../ui/Illustrations';

/**
 * A slim band of hard facts under the hero. The excursion count comes from the
 * live catalogue the planner already loaded, so it can never drift from truth.
 *
 * Each fact is a tile washed with one colour of the place — gold, lagoon, sky,
 * palm — fading up into white, so the row reads as light on sand rather than
 * as four coloured boxes.
 */
const QuickFacts: React.FC = () => {
  const { catalogue } = usePlanner();
  const { locale } = useI18n();
  const isEs = locale === 'es';

  const facts = [
    {
      value: catalogue.length > 0 ? String(catalogue.length) : '—',
      label: isEs ? 'excursiones seleccionadas' : 'curated excursions',
      art: <Sailboat className="h-10 w-10" />,
      tone: 'from-sunset-light/55 to-white',
    },
    {
      value: '4.99',
      label: isEs ? 'valoración media' : 'average guest rating',
      art: <Starfish className="h-10 w-10" />,
      tone: 'from-lagoon-light/55 to-white',
    },
    {
      value: '24/7',
      label: isEs ? 'respuesta por WhatsApp' : 'WhatsApp response',
      art: <Cocktail className="h-10 w-10" />,
      tone: 'from-sky-light/70 to-white',
    },
    {
      value: isEs ? 'Incluido' : 'Included',
      label: isEs ? 'recogida en el hotel' : 'hotel pick-up & drop-off',
      art: <Hibiscus className="h-10 w-10" />,
      tone: 'from-jungle-light/45 to-white',
    },
  ];

  return (
    <section className="wavy-band relative z-10 bg-paper">
      <div className="section-shell grid grid-cols-2 gap-5 py-16 sm:gap-6 md:grid-cols-4">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className={`flex flex-col items-center rounded-3xl bg-gradient-to-b ${fact.tone} px-3 py-6 text-center shadow-md ring-1 ring-white/70 transition duration-300 hover:-translate-y-1.5 hover:shadow-lg`}
          >
            <span className="mb-2">{fact.art}</span>
            <div className="font-display text-2xl font-extrabold leading-none text-ink sm:text-3xl">
              {fact.value}
            </div>
            <div className="mt-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
              {fact.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default QuickFacts;
