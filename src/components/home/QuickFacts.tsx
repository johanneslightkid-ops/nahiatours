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
      tone: 'plate',
    },
    {
      value: '4.99',
      label: isEs ? 'valoración media' : 'average guest rating',
      art: <Starfish className="h-10 w-10" />,
      tone: 'invert',
    },
    {
      value: '24/7',
      label: isEs ? 'respuesta por WhatsApp' : 'WhatsApp response',
      art: <Cocktail className="h-10 w-10" />,
      tone: 'plate',
    },
    {
      value: isEs ? 'Incluido' : 'Included',
      label: isEs ? 'recogida en el hotel' : 'hotel pick-up & drop-off',
      art: <Hibiscus className="h-10 w-10" />,
      tone: 'plate',
    },
  ];

  return (
    <section className="wavy-band relative z-10 bg-paper">
      <div className="section-shell grid grid-cols-2 gap-5 py-16 sm:gap-6 md:grid-cols-4">
        {facts.map((fact, index) => (
          <div
            key={fact.label}
            className={`flex flex-col items-center border-[3px] border-ink px-3 py-6 text-center shadow-ink-sm transition-transform duration-200 hover:-translate-x-1 hover:-translate-y-1 ${
              fact.tone === 'invert' ? 'bg-ink text-paper' : 'bg-paper'
            } ${
              index % 2 === 0 ? '-rotate-1 hover:rotate-1' : 'rotate-1 hover:-rotate-1'
            }`}
          >
            <span className="mb-2">{fact.art}</span>
            {/* A red rule between the drawing and the number: the same tick
                that marks every other block on the site. */}
            <span className="mb-3 block h-[3px] w-8 bg-mango" />
            <div
              className={`font-display text-3xl leading-none sm:text-4xl ${
                fact.tone === 'invert' ? 'text-paper' : 'text-ink'
              }`}
            >
              {fact.value}
            </div>
            <div
              className={`mt-2 font-condensed text-[0.68rem] uppercase tracking-[0.16em] ${
                fact.tone === 'invert' ? 'text-paper/70' : 'text-ink-soft'
              }`}
            >
              {fact.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default QuickFacts;
