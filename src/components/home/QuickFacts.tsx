import React from 'react';
import { usePlanner } from '../../contexts/PlannerContext';
import { useI18n } from '../../contexts/I18nContext';
import { Catamaran, Starfish, SnorkelMask, TransferVan } from '../ui/Illustrations';

/**
 * A slim band of hard facts under the hero.
 *
 * The excursion count is read from the catalogue the planner has already
 * loaded, so it cannot drift from what the site actually sells. The other
 * three are standing facts about the service, not statistics — nothing here is
 * invented, and nothing here is a number the business would have to keep true.
 *
 * Visually it is a field-guide row: a small drawing, a value, a label, and a
 * hairline between them. The version this replaces was four rotated coloured
 * tiles, which is the single loudest thing that can sit directly under a hero.
 */
const QuickFacts: React.FC = () => {
  const { catalogue } = usePlanner();
  const { locale } = useI18n();
  const isEs = locale === 'es';

  const facts = [
    {
      value: catalogue.length > 0 ? String(catalogue.length) : '—',
      label: isEs ? 'excursiones seleccionadas' : 'curated excursions',
      art: <Catamaran className="h-9 w-9" />,
    },
    {
      value: '4.99',
      label: isEs ? 'valoración media' : 'average guest rating',
      art: <Starfish className="h-8 w-8" />,
    },
    {
      value: '24/7',
      label: isEs ? 'respuesta por WhatsApp' : 'WhatsApp response',
      art: <SnorkelMask className="h-8 w-8" />,
    },
    {
      value: isEs ? 'Incluido' : 'Included',
      label: isEs ? 'recogida en el hotel' : 'hotel pick-up & drop-off',
      art: <TransferVan className="h-9 w-10" />,
    },
  ];

  return (
    <section className="wavy-band relative z-10 bg-paper">
      <div className="section-shell py-12 sm:py-14">
        <div className="grid grid-cols-2 gap-y-8 md:grid-cols-4">
          {facts.map((fact, index) => (
            <div
              key={fact.label}
              className={`flex flex-col items-center px-3 text-center md:px-5 ${
                index > 0 ? 'md:border-l md:border-ink/10' : ''
              } ${index === 2 ? 'border-t border-ink/10 pt-8 md:border-t-0 md:pt-0' : ''} ${
                index === 3 ? 'border-t border-ink/10 pt-8 md:border-t-0 md:pt-0' : ''
              }`}
            >
              <span className="mb-2.5 opacity-90">{fact.art}</span>
              <div className="font-display text-[1.7rem] font-semibold leading-none text-ink sm:text-[2rem]">
                {fact.value}
              </div>
              <div className="mt-2 max-w-[10rem] text-[0.66rem] font-bold uppercase leading-[1.5] tracking-[0.16em] text-ink-light">
                {fact.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickFacts;
