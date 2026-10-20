import React from 'react';
import { localeText } from '../../lib/localeText';
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

  const copy = localeText(locale, {
    en: {
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
          'Seven questions about your crew, your energy and your budget. You get a day-by-day itinerary with real prices and no impossible timings.',
        plannerCta: hasProgress ? 'Resume my plan' : 'Start the planner',
        plannerBadge: 'Intelligent',
        or: 'or just ask us',
        whatsapp: 'Chat on WhatsApp',
        whatsappMessage: 'Hi! I would like to put together a day of excursions. What do you recommend?',
      },
    es: {
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
          'Siete preguntas sobre tu grupo, tu energía y tu presupuesto. Recibes un itinerario día por día, con precios reales y sin horarios imposibles.',
        plannerCta: hasProgress ? 'Retomar mi plan' : 'Empezar el planificador',
        plannerBadge: 'Inteligente',
        or: 'o pregunta directamente',
        whatsapp: 'Escribir por WhatsApp',
        whatsappMessage: '¡Hola! Me gustaría armar un día de excursiones. ¿Qué me recomiendas?',
      },
    de: {
      eyebrow: 'Zwei Wege zum Start',
      title: 'Wähle, wie du deinen Tag gestaltest',
      subtitle:
        'Stöbere in Ruhe im Katalog, oder beantworte ein paar Fragen und lass den Planer einen echten Tagesablauf mit Preisen für deine Gruppe zusammenstellen.',
      catalogueTitle: 'Katalog',
      catalogueText:
        catalogue.length > 0
          ? `Alle ${catalogue.length} Ausflüge mit Fotos, Preisen und Details. Buche den, in den du dich verliebst.`
          : 'Alle Ausflüge mit Fotos, Preisen und Details. Buche den, in den du dich verliebst.',
      catalogueCta: 'Ausflüge ansehen',
      plannerTitle: 'Meinen Tag planen',
      plannerText:
        'Sieben Fragen zu deiner Gruppe, deiner Energie und deinem Budget. Du bekommst einen Plan für jeden Tag, mit echten Preisen und ohne unmögliche Zeiten.',
      plannerCta: hasProgress ? 'Meinen Plan fortsetzen' : 'Planer starten',
      plannerBadge: 'Intelligent',
      or: 'oder frag uns einfach',
      whatsapp: 'Per WhatsApp schreiben',
      whatsappMessage: 'Hallo! Ich möchte einen Ausflugstag zusammenstellen. Was empfehlt ihr?',
    },
    fr: {
      eyebrow: 'Deux façons de commencer',
      title: 'Choisissez comment composer votre journée',
      subtitle:
        'Parcourez le catalogue à votre rythme, ou répondez à quelques questions et laissez le planificateur composer un vrai programme, chiffré pour votre groupe.',
      catalogueTitle: 'Mode catalogue',
      catalogueText:
        catalogue.length > 0
          ? `Les ${catalogue.length} excursions avec photos, prix et détails. Réservez celle qui vous fait craquer.`
          : 'Toutes les excursions avec photos, prix et détails. Réservez celle qui vous fait craquer.',
      catalogueCta: 'Voir les excursions',
      plannerTitle: 'Planifier ma journée',
      plannerText:
        'Sept questions sur votre groupe, votre énergie et votre budget. Vous recevez un programme jour par jour, avec de vrais prix et sans horaires impossibles.',
      plannerCta: hasProgress ? 'Reprendre mon plan' : 'Lancer le planificateur',
      plannerBadge: 'Intelligent',
      or: 'ou demandez-nous directement',
      whatsapp: 'Écrire sur WhatsApp',
      whatsappMessage: 'Bonjour ! J’aimerais composer une journée d’excursions. Que me conseillez-vous ?',
    },
  });

  return (
    <section id="plan-my-day" className="home-section relative overflow-hidden bg-paper py-20 sm:py-28">
      <div className="section-shell relative">
        <div className="mb-12 grid gap-6 lg:grid-cols-[1.2fr,1fr] lg:items-end">
          <div>
            <span className="kicker">{copy.eyebrow}</span>
            <h2 className="display-lg mt-4">{copy.title}</h2>
          </div>
          <p className="lede">{copy.subtitle}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Manual mode: the catalogue, over its own photograph. */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="pathway-card group flex min-h-[26rem] flex-col justify-end overflow-hidden"
          >
            <img src="/imgs/edt/tours/catalina-island-tour/1-sm.webp" alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/5" />
            <div className="relative p-8 sm:p-10">
              <span className="badge badge-light">01 · {copy.catalogueTitle}</span>
              <h3 className="mt-4 font-display text-4xl uppercase text-white">{copy.catalogueTitle}</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-white/85">{copy.catalogueText}</p>
              <Link to="/tours#top" onClick={() => playClickFx()} onMouseEnter={() => playHoverFx()} className="btn-amber mt-7">
                {copy.catalogueCta} <HiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          {/* Guided mode. */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="pathway-card pathway-card-dark flex min-h-[26rem] flex-col justify-between p-8 sm:p-10"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="badge badge-gold">02 · {copy.plannerTitle}</span>
              <span className="badge badge-amber"><HiSparkles className="h-3 w-3" /> {copy.plannerBadge}</span>
            </div>
            <div>
              <h3 className="font-display text-4xl uppercase text-white">{copy.plannerTitle}</h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-paper/80">{copy.plannerText}</p>
              <Link to="/plan#top" onClick={() => playClickFx()} onMouseEnter={() => playHoverFx()} className="planner-cta mt-7">
                {copy.plannerCta} <HiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <span className="font-accent text-2xl text-ink-soft">{copy.or}</span>
          <button
            onMouseEnter={() => playHoverFx()}
            onClick={() => {
              playClickFx();
              window.open(generateWhatsAppMessage(brandSettings.phoneNumber, copy.whatsappMessage), '_blank');
            }}
            className="btn-wa"
          >
            <FaWhatsapp className="h-5 w-5" /> {copy.whatsapp}
          </button>
        </div>
      </div>
    </section>
  );
};

export default PathwaysSection;
