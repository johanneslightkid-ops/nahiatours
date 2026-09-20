import React from 'react';
import { usePlanner } from '../../contexts/PlannerContext';
import { useI18n } from '../../contexts/I18nContext';
import { Sailboat, Starfish, Conch, Hummingbird } from '../ui/Illustrations';
import Reveal from '../ui/Reveal';

/**
 * A slim band of hard facts under the hero. The excursion count comes from the
 * live catalogue the planner already loaded, so it can never drift from truth.
 *
 * Each fact is a small painted panel — the four of them read as a predella,
 * the strip of little scenes along the bottom of an altarpiece. The tone is a
 * wash rather than a fill, so the canvas still shows through all four.
 */
const QuickFacts: React.FC = () => {
  const { catalogue } = usePlanner();
  const { locale } = useI18n();
  const isEs = locale === 'es';

  const facts = [
    {
      value: catalogue.length > 0 ? String(catalogue.length) : '—',
      label: isEs ? 'excursiones seleccionadas' : 'curated excursions',
      art: <Sailboat className="h-12 w-12" />,
      tone: 'from-canvas-lift to-mango-light/70',
    },
    {
      value: '4.99',
      label: isEs ? 'valoración media' : 'average guest rating',
      art: <Starfish className="h-12 w-12" />,
      tone: 'from-canvas-lift to-coral-light/50',
    },
    {
      value: '24/7',
      label: isEs ? 'respuesta por WhatsApp' : 'WhatsApp response',
      art: <Conch className="h-12 w-12" />,
      tone: 'from-canvas-lift to-hibiscus-light/50',
    },
    {
      value: isEs ? 'Incluido' : 'Included',
      label: isEs ? 'recogida en el hotel' : 'hotel pick-up & drop-off',
      art: <Hummingbird className="h-12 w-12" />,
      tone: 'from-canvas-lift to-lagoon-light/60',
    },
  ];

  return (
    <section className="relative z-10">
      <div className="section-shell grid grid-cols-2 gap-5 py-16 sm:gap-6 md:grid-cols-4 lg:py-20">
        {facts.map((fact, index) => (
          <Reveal
            key={fact.label}
            delay={index * 0.08}
            distance={18}
            className={`flex flex-col items-center rounded-[24px_16px_22px_18px] border border-[rgba(150,112,31,0.35)] bg-gradient-to-br ${fact.tone} px-3 py-6 text-center shadow-oil-sm transition-transform duration-500 hover:-translate-y-1.5 ${
              index % 2 === 0 ? '-rotate-1 hover:rotate-0' : 'rotate-1 hover:rotate-0'
            }`}
          >
            <span className="mb-3">{fact.art}</span>
            <div className="font-display text-3xl font-bold leading-none text-ink">
              {fact.value}
            </div>
            <div className="mt-2 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-ink-light">
              {fact.label}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default QuickFacts;
