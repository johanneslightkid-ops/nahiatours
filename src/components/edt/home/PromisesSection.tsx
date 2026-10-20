import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HiOutlineCalendar, HiOutlineCollection, HiOutlineHome, HiOutlineShieldCheck } from 'react-icons/hi';
import { useI18n, type Locale } from '../../../contexts/I18nContext';
import { useSitePages } from '../../../edt/sitePages';

type L = Record<Locale, string>;

const COPY = {
  kicker: { en: 'Why us', es: 'Por qué nosotros', fr: 'Pourquoi nous', de: 'Warum wir' },
  title1: { en: 'Serious about', es: 'En serio con', fr: 'Sérieux sur', de: 'Ernst beim' },
  title2: { en: 'the fun part', es: 'la diversión', fr: 'le plaisir', de: 'Spaß' },
  text: {
    en: 'Certified guides, licensed vehicles, hotel pickup on time and one team on WhatsApp from the first question to the last photo.',
    es: 'Guías certificados, vehículos con licencia, recogida puntual en el hotel y un solo equipo en WhatsApp desde la primera pregunta hasta la última foto.',
    fr: 'Guides certifiés, véhicules agréés, prise en charge à l’heure à l’hôtel et une seule équipe sur WhatsApp, de la première question à la dernière photo.',
    de: 'Zertifizierte Guides, lizenzierte Fahrzeuge, pünktliche Abholung am Hotel und ein Team auf WhatsApp — von der ersten Frage bis zum letzten Foto.',
  },
};

const ICONS = [HiOutlineCollection, HiOutlineCalendar, HiOutlineHome, HiOutlineShieldCheck];

/** "Serious about the fun part": the four promises from the About page, numbered, over one big photograph. */
const PromisesSection: React.FC = () => {
  const { locale } = useI18n();
  const pages = useSitePages(locale);
  const reduced = useReducedMotion();
  const promises = pages?.about.promises ?? [];

  return (
    <section className="home-section relative overflow-hidden bg-ink text-paper">
      <div className="absolute inset-0" aria-hidden="true">
        <img src="/imgs/edt/tours/polaris-vip-punta-cana/1.webp" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgb(20_22_26/0.96)_0%,rgb(20_22_26/0.78)_50%,rgb(20_22_26/0.5)_100%)]" />
        <div className="hero-grain absolute inset-0" />
      </div>
      <div className="section-shell relative py-24 sm:py-32">
        <div className="max-w-3xl">
          <span className="kicker kicker-light">{COPY.kicker[locale]}</span>
          <h2 className="display-lg mt-4 text-white">
            {COPY.title1[locale]} <span className="text-mango">{COPY.title2[locale]}</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/80">{COPY.text[locale]}</p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[8px] bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((promise, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <motion.div
                key={promise.title}
                className="promise-card"
                initial={reduced ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-8 w-8 text-mango" />
                  <span className="font-condensed text-sm font-bold tracking-[0.2em] text-gold">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="mt-8 font-display text-2xl uppercase text-white">{promise.title}</h3>
                <p className="mt-3 text-[0.98rem] leading-relaxed text-paper/75">{promise.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PromisesSection;
