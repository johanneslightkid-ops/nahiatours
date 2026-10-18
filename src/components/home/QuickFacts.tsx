import React, { useEffect, useState } from 'react';
import { localeText } from '../../lib/localeText';
import { motion } from 'framer-motion';
import { usePlanner } from '../../contexts/PlannerContext';
import { useI18n } from '../../contexts/I18nContext';
import { useBrand } from '../../contexts/BrandContext';
import { getPublishedTestimonials, getRatingVisibility } from '../../services/testimonialService';
import { Sailboat, Starfish, Hibiscus, Cocktail } from '../ui/Illustrations';

/**
 * Four pebbles washed up on the sand, each holding one hard fact. The
 * excursion count comes from the live catalogue the planner already loaded,
 * so it can never drift from the truth.
 */
const SHAPES = [
  'rounded-[58%_42%_55%_45%/48%_56%_44%_52%]',
  'rounded-[44%_56%_46%_54%/56%_44%_56%_44%]',
  'rounded-[52%_48%_40%_60%/46%_58%_42%_54%]',
  'rounded-[46%_54%_58%_42%/54%_46%_52%_48%]',
];

const QuickFacts: React.FC = () => {
  const { catalogue } = usePlanner();
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const isEs = locale === 'es';
  const say = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);
  const [ratingValue, setRatingValue] = useState<string>('—');

  useEffect(() => {
    let active = true;

    const load = async () => {
      const testimonials = await getPublishedTestimonials();
      if (!active) return;
      const range = brandSettings.heroRatingRange ?? { min: 3, max: 5 };
      const result = getRatingVisibility(testimonials, {
        enabled: brandSettings.heroRatingEnabled,
        min: range.min,
        max: range.max,
      });
      setRatingValue(result.visible && result.average !== null ? result.average.toFixed(2) : '—');
    };

    void load();
    return () => { active = false; };
  }, [brandSettings.heroRatingEnabled, brandSettings.heroRatingRange]);

  const ratingFact = {
    value: ratingValue,
    label: say({ en: 'average guest rating', es: 'valoración media', de: 'durchschnittliche Gästebewertung', fr: 'note moyenne des voyageurs' }),
    art: <Starfish className="h-11 w-11" />,
    tone: 'from-[#E6F6F9] to-[#A9E4EE]',
  };

  const facts = [
    {
      value: catalogue.length > 0 ? String(catalogue.length) : '—',
      label: say({ en: 'curated excursions', es: 'excursiones seleccionadas', de: 'ausgewählte Ausflüge', fr: 'excursions sélectionnées' }),
      art: <Sailboat className="h-12 w-12" />,
      tone: 'from-[#FFF3B0] to-[#FFDD6E]',
    },
    ...(ratingValue !== '—' ? [ratingFact] : []),
    {
      value: '24/7',
      label: say({ en: 'WhatsApp response', es: 'respuesta por WhatsApp', de: 'Antwort per WhatsApp', fr: 'réponse sur WhatsApp' }),
      art: <Cocktail className="h-11 w-11" />,
      tone: 'from-[#FFE4DC] to-[#FF9E8A]',
    },
    {
      value: say({ en: 'Included', es: 'Incluido', de: 'Inklusive', fr: 'Inclus' }),
      label: say({ en: 'hotel pick-up & drop-off', es: 'recogida en el hotel', de: 'Abholung & Rückfahrt zum Hotel', fr: 'aller-retour depuis l’hôtel' }),
      art: <Hibiscus className="h-11 w-11" />,
      tone: 'from-[#EEF7E2] to-[#B4D98A]',
    },
  ];

  return (
    <section className="relative z-10 bg-paper">
      <div className="section-shell grid grid-cols-2 gap-x-5 gap-y-7 pb-14 pt-8 sm:gap-8 md:grid-cols-4">
        {facts.map((fact, index) => (
          <motion.div
            key={fact.label}
            initial={{ opacity: 0, y: 24, rotate: index % 2 ? 4 : -4 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14, delay: index * 0.08 }}
            whileHover={{ y: -6, rotate: index % 2 ? 2 : -2 }}
            className={`flex aspect-[1.15] flex-col items-center justify-center bg-gradient-to-br ${fact.tone} ${SHAPES[index]} border-[3px] border-ink px-3 text-center shadow-ink`}
          >
            <span className="mb-1.5">{fact.art}</span>
            <div className="font-display text-2xl font-bold leading-none text-ink sm:text-3xl">{fact.value}</div>
            <div className="mt-1.5 max-w-[9rem] text-[0.64rem] font-extrabold uppercase tracking-[0.12em] text-ink-soft">
              {fact.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default QuickFacts;
