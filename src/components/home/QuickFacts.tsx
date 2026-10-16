import React from 'react';
import { usePlanner } from '../../contexts/PlannerContext';
import { useI18n } from '../../contexts/I18nContext';
import { Sailboat, Starfish, Hibiscus, Cocktail } from '../ui/Illustrations';

/**
 * A slim band of hard facts under the hero. The excursion count comes from the
 * live catalogue the planner already loaded, so it can never drift from truth.
 * Each fact is a drawn ticket: illustration, number, label.
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
      tone: 'bg-mango-light',
    },
    {
      value: '4.99',
      label: isEs ? 'valoración media' : 'average guest rating',
      art: <Starfish className="h-10 w-10" />,
      tone: 'bg-lagoon-light',
    },
    {
      value: '24/7',
      label: isEs ? 'respuesta por WhatsApp' : 'WhatsApp response',
      art: <Cocktail className="h-10 w-10" />,
      tone: 'bg-hibiscus-light',
    },
    {
      value: isEs ? 'Incluido' : 'Included',
      label: isEs ? 'recogida en el hotel' : 'hotel pick-up & drop-off',
      art: <Hibiscus className="h-10 w-10" />,
      tone: 'bg-jungle-light',
    },
  ];

  return (
    <section className="wavy-band relative z-10 bg-paper">
      <div className="section-shell grid grid-cols-2 gap-5 py-16 sm:gap-6 md:grid-cols-4">
        {facts.map((fact, index) => (
          <div
            key={fact.label}
            className={`flex flex-col items-center rounded-[22px] border-[2.5px] border-ink ${fact.tone} px-3 py-5 text-center shadow-ink-sm transition-transform duration-300 hover:-translate-y-1.5 ${
              index % 2 === 0 ? '-rotate-1 hover:rotate-1' : 'rotate-1 hover:-rotate-1'
            }`}
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
