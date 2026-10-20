import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { HiMinus, HiPlus, HiArrowRight } from 'react-icons/hi';
import PageHeader from '../components/layout/PageHeader';
import MarkdownRenderer from '../components/ui/MarkdownRenderer';
import { useI18n, type Locale } from '../contexts/I18nContext';
import { useBrand } from '../contexts/BrandContext';
import { useSitePages } from '../edt/sitePages';
import { generateWhatsAppMessage } from '../utils/whatsapp';

type L = Record<Locale, string>;

const COPY = {
  kicker: { en: 'About us', es: 'Sobre nosotros', fr: 'À propos', de: 'Über uns' },
  vision: { en: 'Our vision', es: 'Nuestra visión', fr: 'Notre vision', de: 'Unsere Vision' },
  mission: { en: 'Our mission', es: 'Nuestra misión', fr: 'Notre mission', de: 'Unsere Mission' },
  why: { en: 'Why travel with us', es: 'Por qué viajar con nosotros', fr: 'Pourquoi voyager avec nous', de: 'Warum mit uns reisen' },
  faqKicker: { en: 'FAQ', es: 'Preguntas frecuentes', fr: 'FAQ', de: 'FAQ' },
  faqTitle: { en: 'Everything to know before the adventure', es: 'Todo lo que debes saber antes de la aventura', fr: 'Tout savoir avant l’aventure', de: 'Alles, was du vor dem Abenteuer wissen musst' },
  still: { en: 'Still have questions?', es: '¿Aún tienes preguntas?', fr: 'Encore des questions ?', de: 'Noch Fragen?' },
  chat: { en: 'Chat with our team', es: 'Habla con nuestro equipo', fr: 'Parlez à notre équipe', de: 'Schreib unserem Team' },
  tours: { en: 'See the excursions', es: 'Ver las excursiones', fr: 'Voir les excursions', de: 'Ausflüge ansehen' },
  since: { en: 'Since', es: 'Desde', fr: 'Depuis', de: 'Seit' },
};

/** Who the company is, what it promises, and the questions guests ask before they book. */
const About: React.FC = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const pages = useSitePages(locale);
  const [open, setOpen] = useState<number | null>(0);
  const about = pages?.about;

  return (
    <div className="pb-24">
      <PageHeader tone="paper" image="/imgs/edt/gallery/flag-pier.webp" kicker={COPY.kicker[locale]} title={about?.title ?? COPY.kicker[locale]} subtitle={about?.intro} />

      {about && (
        <section className="section-shell grid gap-12 py-16 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <div className="lede">
              <MarkdownRenderer content={about.body} />
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {[
                { title: COPY.vision[locale], text: about.vision },
                { title: COPY.mission[locale], text: about.mission },
              ].map((item) => (
                <div key={item.title} className="vm-card flex-col gap-3">
                  <h2 className="font-display text-2xl uppercase">{item.title}</h2>
                  <p className="leading-relaxed text-ink-soft">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative lg:col-span-5">
            <div className="chapter-photo photo-graded aspect-[4/5]">
              <img src="/imgs/edt/gallery/moment-10.webp" alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="welcome-seal !left-auto !right-6 !top-auto -bottom-10">
              <span className="font-condensed text-[0.7rem] font-bold uppercase tracking-[0.24em] text-gold-dark">{COPY.since[locale]}</span>
              <span className="font-display text-4xl leading-none text-ink">{about.founded}</span>
            </div>
          </div>
        </section>
      )}

      {about && about.promises.length > 0 && (
        <section className="bg-ink py-16 text-paper sm:py-20">
          <div className="section-shell">
            <span className="kicker kicker-light">{COPY.why[locale]}</span>
            <div className="mt-8 grid gap-px overflow-hidden rounded-[8px] bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {about.promises.map((promise, index) => (
                <div key={promise.title} className="promise-card">
                  <span className="font-condensed text-sm font-bold tracking-[0.2em] text-gold">{String(index + 1).padStart(2, '0')}</span>
                  <h3 className="mt-6 font-display text-2xl uppercase text-white">{promise.title}</h3>
                  <p className="mt-3 leading-relaxed text-paper/75">{promise.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {pages && pages.faq.length > 0 && (
        <section id="faq" className="section-shell scroll-mt-28 py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <span className="kicker">{COPY.faqKicker[locale]}</span>
              <h2 className="display-md mt-4">{COPY.faqTitle[locale]}</h2>
              <p className="lede mt-6">{COPY.still[locale]}</p>
              <a href={generateWhatsAppMessage(brandSettings.phoneNumber, '')} target="_blank" rel="noopener noreferrer" className="btn-wa mt-5">
                <FaWhatsapp className="h-5 w-5" /> {COPY.chat[locale]}
              </a>
            </div>
            <div className="divide-y divide-ink/10 rounded-[8px] bg-white shadow-ink-sm ring-1 ring-ink/10 lg:col-span-8">
              {pages.faq.map((item, index) => (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(open === index ? null : index)}
                    aria-expanded={open === index}
                    className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                  >
                    <span className="text-lg font-semibold text-ink">{item.q}</span>
                    {open === index ? <HiMinus className="h-5 w-5 shrink-0 text-mango-dark" /> : <HiPlus className="h-5 w-5 shrink-0 text-ink-light" />}
                  </button>
                  {open === index && <p className="px-6 pb-6 leading-relaxed text-ink-soft">{item.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="section-shell flex justify-center">
        <Link to="/tours" className="btn-ink">
          {COPY.tours[locale]} <HiArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default About;
