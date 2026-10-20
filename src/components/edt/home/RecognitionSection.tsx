import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HiArrowUpRight } from 'react-icons/hi2';
import { useI18n, type Locale } from '../../../contexts/I18nContext';
import { useSocialAccounts } from '../brand';

type L = Record<Locale, string>;

const COPY = {
  kicker: { en: 'Recognitions', es: 'Reconocimientos', fr: 'Reconnaissances', de: 'Auszeichnungen' },
  title: { en: 'Certifications & recognition', es: 'Certificaciones y reconocimientos', fr: 'Certifications et reconnaissances', de: 'Zertifizierungen & Anerkennung' },
  text: {
    en: 'We proudly show the institutions that endorse and recognise our commitment to excellence in tourism.',
    es: 'Mostramos con orgullo las instituciones que avalan y reconocen nuestro compromiso con la excelencia en el turismo.',
    fr: 'Nous présentons avec fierté les institutions qui soutiennent et reconnaissent notre engagement pour l’excellence touristique.',
    de: 'Stolz zeigen wir die Institutionen, die unser Engagement für exzellenten Tourismus bestätigen und anerkennen.',
  },
  mitur: { en: 'Registered tour operator with the Dominican Ministry of Tourism.', es: 'Operador turístico registrado en el Ministerio de Turismo de la República Dominicana.', fr: 'Voyagiste enregistré auprès du ministère du Tourisme dominicain.', de: 'Beim dominikanischen Tourismusministerium registrierter Reiseveranstalter.' },
  trip: { en: 'Reviewed by travellers on Tripadvisor — read what they say.', es: 'Reseñado por viajeros en Tripadvisor: lee lo que dicen.', fr: 'Évalué par les voyageurs sur Tripadvisor — lisez leurs avis.', de: 'Von Reisenden auf Tripadvisor bewertet — lies, was sie sagen.' },
  read: { en: 'Read reviews', es: 'Leer reseñas', fr: 'Lire les avis', de: 'Bewertungen lesen' },
};

/** Between the transfers and the testimonials: who stands behind the company. */
const RecognitionSection: React.FC = () => {
  const { locale } = useI18n();
  const reduced = useReducedMotion();
  const tripadvisor = useSocialAccounts().find((account) => account.platform === 'tripadvisor')?.url;

  const items = [
    { key: 'mitur', logo: '/imgs/edt/cert/ministerio-turismo.webp', alt: 'Ministerio de Turismo — República Dominicana', text: COPY.mitur[locale], href: 'https://www.mitur.gob.do/' },
    { key: 'tripadvisor', logo: '/imgs/edt/cert/tripadvisor.webp', alt: 'Tripadvisor', text: COPY.trip[locale], href: tripadvisor },
  ];

  return (
    <section className="home-section relative bg-paper py-20 sm:py-24">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <span className="kicker justify-center">{COPY.kicker[locale]}</span>
          <h2 className="display-md mt-4">{COPY.title[locale]}</h2>
          <p className="lede mt-4">{COPY.text[locale]}</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {items.map((item, index) => (
            <motion.a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="recognition-card group gold-frame no-underline"
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="flex h-24 items-center justify-center">
                <img src={item.logo} alt={item.alt} loading="lazy" decoding="async" className="max-h-14 w-auto max-w-[80%] object-contain" />
              </div>
              <p className="mt-4 text-center text-[0.98rem] leading-relaxed text-ink-soft">{item.text}</p>
              {item.key === 'tripadvisor' && item.href && (
                <span className="mt-4 inline-flex items-center justify-center gap-1 self-center font-condensed text-sm font-bold uppercase tracking-[0.16em] text-ink group-hover:text-mango-dark">
                  {COPY.read[locale]} <HiArrowUpRight className="h-4 w-4" />
                </span>
              )}
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecognitionSection;
