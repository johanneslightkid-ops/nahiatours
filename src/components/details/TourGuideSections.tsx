import React from 'react';
import { MdAccessTime, MdAirportShuttle, MdPlace, MdDirectionsCar, MdDirectionsRun, MdChildCare, MdFavoriteBorder, MdCheckCircle, MdBackpack, MdInfoOutline, MdFormatQuote } from 'react-icons/md';
import { Lang, TourGuide } from '../../lib/tourGuide';
import { localeText } from '../../lib/localeText';

/**
 * Everything there is to know about a tour beyond the vendor's own text (see
 * src/lib/tourGuide.ts). Each part is its own `.dv-section`, so a site can
 * set them out the way its design wants.
 */

const LEVEL: Record<TourGuide['facts']['level'], Record<Lang, string>> = {
  easy: { en: 'Easy', es: 'Fácil', de: 'Leicht', fr: 'Facile' },
  moderate: { en: 'Moderate', es: 'Moderado', de: 'Mittel', fr: 'Modéré' },
  active: { en: 'Active', es: 'Activo', de: 'Aktiv', fr: 'Sportif' },
};

export const GuideFacts: React.FC<{ guide: TourGuide; lang: Lang }> = ({ guide, lang }) => {
  const say = (texts: Record<Lang, string>) => localeText(lang, texts);
  const facts = [
    { icon: <MdAccessTime />, label: say({ en: 'Duration', es: 'Duración', de: 'Dauer', fr: 'Durée' }), value: guide.facts.duration[lang] },
    { icon: <MdAirportShuttle />, label: say({ en: 'Pick-up', es: 'Recogida', de: 'Abholung', fr: 'Prise en charge' }), value: guide.facts.pickup[lang] },
    { icon: <MdPlace />, label: say({ en: 'Where', es: 'Dónde', de: 'Wo', fr: 'Où' }), value: guide.facts.where[lang] },
    { icon: <MdDirectionsCar />, label: say({ en: 'From Bávaro', es: 'Desde Bávaro', de: 'Ab Bávaro', fr: 'Depuis Bávaro' }), value: guide.facts.fromBavaro[lang] },
    { icon: <MdDirectionsRun />, label: say({ en: 'Activity level', es: 'Nivel de actividad', de: 'Aktivitätslevel', fr: 'Niveau d’activité' }), value: LEVEL[guide.facts.level]?.[lang] },
    { icon: <MdChildCare />, label: say({ en: 'Ages', es: 'Edades', de: 'Alter', fr: 'Âges' }), value: guide.facts.minAge[lang] },
    { icon: <MdFavoriteBorder />, label: say({ en: 'Best for', es: 'Ideal para', de: 'Ideal für', fr: 'Idéal pour' }), value: guide.facts.bestFor[lang] },
  ].filter((fact) => fact.value);
  return (
    <dl className="dv-facts grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="dv-fact flex gap-3">
          <span className="dv-fact-icon grid h-10 w-10 shrink-0 place-items-center text-xl" aria-hidden="true">
            {fact.icon}
          </span>
          <div className="min-w-0">
            <dt className="dv-fact-label">{fact.label}</dt>
            <dd className="dv-fact-value m-0">{fact.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
};

const Section: React.FC<{ id: string; title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ id, title, icon, children }) => (
  <section className="dv-section" aria-labelledby={id}>
    <h2 id={id} className="dv-h2 flex items-center gap-2">
      {icon && <span className="dv-h2-icon" aria-hidden="true">{icon}</span>}
      {title}
    </h2>
    {children}
  </section>
);

const TourGuideSections: React.FC<{ guide: TourGuide; lang: Lang }> = ({ guide, lang }) => {
  const say = (texts: Record<Lang, string>) => localeText(lang, texts);
  const itinerary = guide.itinerary[lang] ?? [];
  const faq = guide.faq[lang] ?? [];
  return (
    <>
      <Section id="dv-about-place" title={say({ en: 'The place', es: 'El lugar', de: 'Der Ort', fr: 'Le lieu' })}>
        <div className="dv-prose">
          {guide.about[lang].split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </Section>

      <Section id="dv-highlights" title={say({ en: 'Highlights', es: 'Lo mejor', de: 'Höhepunkte', fr: 'Points forts' })}>
        <ul className="dv-highlights grid gap-2.5 sm:grid-cols-2">
          {guide.highlights[lang].map((item) => (
            <li key={item} className="dv-highlight flex gap-2.5">
              <MdCheckCircle className="dv-highlight-icon mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {itinerary.length > 0 && (
        <Section id="dv-day" title={say({ en: 'A typical day', es: 'Un día típico', de: 'Ein typischer Tag', fr: 'Une journée type' })}>
          <ol className="dv-timeline relative grid gap-4">
            {itinerary.map((step, index) => (
              <li key={`${step.time}-${index}`} className="dv-step relative grid grid-cols-[4.5rem_1fr] gap-3">
                <span className="dv-step-time tabular-nums">{step.time}</span>
                <div className="dv-step-body">
                  <p className="dv-step-title">{step.title}</p>
                  <p className="dv-step-text">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="dv-small mt-4">
            {say({
              en: 'Times and stops vary a little by day and departure; your pick-up time is confirmed the evening before. What your booking includes is listed in the description above.',
              es: 'Los horarios y paradas varían un poco según el día y la salida; la hora de recogida se confirma la noche anterior. Lo que incluye tu reserva está en la descripción de arriba.',
              de: 'Zeiten und Stopps variieren je nach Tag und Abfahrt etwas; die Abholzeit wird am Vorabend bestätigt. Was Ihre Buchung enthält, steht in der Beschreibung oben.',
              fr: 'Les horaires et arrêts varient un peu selon le jour et le départ ; l’heure de prise en charge est confirmée la veille. Ce que comprend votre réservation figure dans la description ci-dessus.',
            })}
          </p>
        </Section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Section id="dv-bring" icon={<MdBackpack />} title={say({ en: 'What to bring', es: 'Qué llevar', de: 'Was mitnehmen', fr: 'À emporter' })}>
          <ul className="dv-list">
            {guide.bring[lang].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
        <Section id="dv-know" icon={<MdInfoOutline />} title={say({ en: 'Good to know', es: 'Bueno saber', de: 'Gut zu wissen', fr: 'Bon à savoir' })}>
          <ul className="dv-list">
            {guide.goodToKnow[lang].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>
      </div>

      <Section id="dv-say" icon={<MdFormatQuote />} title={say({ en: 'What travellers say', es: 'Lo que dicen los viajeros', de: 'Was Reisende sagen', fr: 'Ce qu’en disent les voyageurs' })}>
        <ul className="dv-quotes grid gap-3 sm:grid-cols-2">
          {guide.travellersSay[lang].map((line) => (
            <li key={line} className="dv-quote">
              {line}
            </li>
          ))}
        </ul>
      </Section>

      {faq.length > 0 && (
        <Section id="dv-faq" title={say({ en: 'Questions', es: 'Preguntas', de: 'Fragen', fr: 'Questions' })}>
          <div className="dv-faq grid gap-2">
            {faq.map((item) => (
              <details key={item.q} className="dv-faq-item group">
                <summary className="dv-faq-q flex cursor-pointer list-none items-center justify-between gap-3">
                  <span>{item.q}</span>
                  <span className="dv-faq-mark transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="dv-faq-a">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>
      )}
    </>
  );
};

export default TourGuideSections;
