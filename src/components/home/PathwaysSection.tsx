import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight, HiSparkles } from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useI18n } from '../../contexts/I18nContext';
import { useBrand } from '../../contexts/BrandContext';
import { usePlanner } from '../../contexts/PlannerContext';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';

/**
 * The closing section of the welcome page: two honest ways in — browse the
 * catalogue yourself, or let the planner read your group and build the day.
 */
const PathwaysSection: React.FC = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const { catalogue, hasProgress } = usePlanner();
  const isEs = locale === 'es';

  const copy = isEs
    ? {
        eyebrow: 'Dos formas de empezar',
        title: 'Elige tu manera de armar el día',
        subtitle:
          'Explora el catálogo a tu ritmo, o responde unas preguntas y deja que el planificador arme un itinerario real con precios para tu grupo exacto.',
        catalogueTitle: 'Modo catálogo',
        catalogueText:
          catalogue.length > 0
            ? `Mira las ${catalogue.length} excursiones con fotos, precios y detalles. Reserva la que te enamore.`
            : 'Mira todas las excursiones con fotos, precios y detalles. Reserva la que te enamore.',
        catalogueCta: 'Ver excursiones',
        plannerTitle: 'Planea mi Día',
        plannerText:
          'Doce preguntas sobre tu grupo, tu energía y tu presupuesto. Recibes un itinerario día por día, con precios reales y sin horarios imposibles.',
        plannerCta: hasProgress ? 'Retomar mi plan' : 'Empezar el planificador',
        plannerBadge: 'Inteligente',
        or: 'o pregunta directamente',
        whatsapp: 'Escribir por WhatsApp',
        whatsappMessage: '¡Hola! Me gustaría armar un día de excursiones. ¿Qué me recomiendas?',
      }
    : {
        eyebrow: 'Two ways to begin',
        title: 'Pick how you want to build the day',
        subtitle:
          'Browse the catalogue at your own pace, or answer a few questions and let the planner build a real itinerary priced for your exact group.',
        catalogueTitle: 'Catalogue mode',
        catalogueText:
          catalogue.length > 0
            ? `Scroll all ${catalogue.length} excursions with photos, prices and details. Book the one you fall for.`
            : 'Scroll every excursion with photos, prices and details. Book the one you fall for.',
        catalogueCta: 'View excursions',
        plannerTitle: 'Plan My Day',
        plannerText:
          'Twelve questions about your crew, your energy and your budget. You get a day-by-day itinerary with real prices and no impossible timings.',
        plannerCta: hasProgress ? 'Resume my plan' : 'Start the planner',
        plannerBadge: 'Intelligent',
        or: 'or just ask us',
        whatsapp: 'Chat on WhatsApp',
        whatsappMessage: 'Hi! I would like to put together a day of excursions. What do you recommend?',
      };

  return (
    <section
      id="plan-my-day"
      className="home-section dawn-section wavy-band relative overflow-hidden px-4 py-24 sm:py-32 md:px-8"
    >
      <div className="parallax-wash parallax-wash-left" />
      <div className="parallax-wash parallax-wash-right" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="artsy-brick-badge-inverted mb-5 inline-flex">{copy.eyebrow}</span>
          <h2 className="mb-4 font-display text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
            {copy.title}
          </h2>
          <p className="text-lg font-medium leading-8 text-ink-soft">{copy.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Manual mode */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="pathway-card flex flex-col p-8 sm:p-10"
          >
            <div className="flex items-center justify-between">
              <span className="text-4xl" style={{ filter: 'grayscale(1) contrast(1.3)' }}>🗂️</span>
              <span className="tp-index">01</span>
            </div>
            <span className="mt-4 block h-[3px] w-12 bg-mango" />
            <h3 className="mt-3 font-display text-2xl text-ink">{copy.catalogueTitle}</h3>
            <p className="mt-3 flex-1 text-base font-medium leading-relaxed text-ink-soft">{copy.catalogueText}</p>
            <Link
              to="/tours#top"
              onClick={() => playClickFx()}
              onMouseEnter={() => playHoverFx()}
              className="tropical-button-outline mt-7 self-start"
            >
              {copy.catalogueCta} <HiArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>

          {/* Guided mode */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="pathway-card pathway-card-dark flex flex-col p-8 sm:p-10"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-4xl" style={{ filter: 'grayscale(1) contrast(1.3) brightness(1.8)' }}>🧭</span>
              <span className="inline-flex items-center gap-1.5 border-2 border-mango bg-mango px-3 py-1 font-condensed text-[0.68rem] uppercase tracking-[0.18em] text-paper">
                <HiSparkles className="h-3 w-3" /> {copy.plannerBadge}
              </span>
            </div>
            <span className="mt-4 block h-[3px] w-12 bg-mango" />
            <h3 className="mt-3 font-display text-2xl text-paper">{copy.plannerTitle}</h3>
            <p className="mt-3 flex-1 text-base font-medium leading-relaxed text-paper/85">{copy.plannerText}</p>
            <Link
              to="/plan#top"
              onClick={() => playClickFx()}
              onMouseEnter={() => playHoverFx()}
              className="planner-cta mt-7 self-start"
            >
              {copy.plannerCta} <HiArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <span className="hand-note">{copy.or}</span>
          <button
            onMouseEnter={() => playHoverFx()}
            onClick={() => {
              playClickFx();
              window.open(
                generateWhatsAppMessage(brandSettings.phoneNumber, copy.whatsappMessage),
                '_blank'
              );
            }}
            className="tropical-button"
          >
            <FaWhatsapp className="mr-2 h-4 w-4" /> {copy.whatsapp}
          </button>
        </div>
      </div>
    </section>
  );
};

export default PathwaysSection;
