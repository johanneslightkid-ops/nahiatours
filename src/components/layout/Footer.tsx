import React from 'react';
import { Link } from 'react-router-dom';
import { MdAdminPanelSettings } from 'react-icons/md';
import { FaApplePay, FaCcMastercard, FaCcPaypal, FaCcVisa, FaGooglePay, FaWhatsapp } from 'react-icons/fa';
import { HiArrowUpRight } from 'react-icons/hi2';
import { HiOutlineLocationMarker, HiOutlineMail } from 'react-icons/hi';
import { useBrand } from '../../contexts/BrandContext';
import { useI18n, type Locale } from '../../contexts/I18nContext';
import { useSitePages } from '../../edt/sitePages';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { BrandLogo, CONTACT, PARTNERS, SOCIAL_ICONS, SOCIAL_NAMES, useSocialAccounts } from '../edt/brand';

type L = Record<Locale, string>;
const t = (locale: Locale, text: L) => text[locale] ?? text.en;

const COPY = {
  partnersKicker: { en: 'Partner sites', es: 'Sitios aliados', fr: 'Sites partenaires', de: 'Partnerseiten' },
  partnersTitle: { en: 'Plan the whole trip with us', es: 'Planifica todo el viaje con nosotros', fr: 'Organisez tout le voyage avec nous', de: 'Plane die ganze Reise mit uns' },
  hotels: { en: 'Hotels', es: 'Hoteles', fr: 'Hôtels', de: 'Hotels' },
  hotelsText: { en: 'All-inclusive resorts and boutique stays at the best price.', es: 'Resorts todo incluido y hoteles boutique al mejor precio.', fr: 'Resorts tout compris et hôtels de charme au meilleur prix.', de: 'All-inclusive-Resorts und Boutique-Hotels zum besten Preis.' },
  flights: { en: 'Flights', es: 'Vuelos', fr: 'Vols', de: 'Flüge' },
  flightsText: { en: 'Domestic and international fares, last-minute or early-bird.', es: 'Tarifas nacionales e internacionales, de último minuto o anticipadas.', fr: 'Tarifs nationaux et internationaux, dernière minute ou anticipés.', de: 'Inlands- und Auslandsflüge, last minute oder frühzeitig.' },
  cruises: { en: 'Cruises', es: 'Cruceros', fr: 'Croisières', de: 'Kreuzfahrten' },
  cruisesText: { en: 'Caribbean and Mediterranean voyages — ask us for your dates.', es: 'Travesías por el Caribe y el Mediterráneo: pídenos tus fechas.', fr: 'Croisières Caraïbes et Méditerranée — demandez-nous vos dates.', de: 'Karibik- und Mittelmeerreisen — frag uns nach deinen Terminen.' },
  cruisesAsk: { en: 'Hello! I would like information about cruises.', es: '¡Hola! Me gustaría información sobre cruceros.', fr: 'Bonjour ! Je voudrais des informations sur les croisières.', de: 'Hallo! Ich hätte gern Informationen zu Kreuzfahrten.' },
  visit: { en: 'Visit site', es: 'Visitar', fr: 'Visiter', de: 'Besuchen' },
  ask: { en: 'Ask us', es: 'Consultar', fr: 'Nous demander', de: 'Anfragen' },
  tagline: { en: 'Don’t just get there, get there in style.', es: 'No solo llegues: llega con estilo.', fr: 'Ne vous contentez pas d’arriver : arrivez avec style.', de: 'Nicht einfach ankommen — stilvoll ankommen.' },
  services: { en: 'Our services', es: 'Servicios', fr: 'Nos services', de: 'Leistungen' },
  company: { en: 'Company', es: 'Empresa', fr: 'Entreprise', de: 'Unternehmen' },
  legal: { en: 'Legal', es: 'Legal', fr: 'Mentions', de: 'Rechtliches' },
  follow: { en: 'Follow us', es: 'Síguenos', fr: 'Suivez-nous', de: 'Folge uns' },
  tours: { en: 'Excursions', es: 'Excursiones', fr: 'Excursions', de: 'Ausflüge' },
  transfers: { en: 'Transfers', es: 'Traslados', fr: 'Transferts', de: 'Transfers' },
  plan: { en: 'Plan my day', es: 'Planea mi día', fr: 'Planifier ma journée', de: 'Meinen Tag planen' },
  about: { en: 'About us', es: 'Nosotros', fr: 'À propos', de: 'Über uns' },
  faq: { en: 'FAQ', es: 'Preguntas frecuentes', fr: 'FAQ', de: 'FAQ' },
  blog: { en: 'Blog', es: 'Blog', fr: 'Blog', de: 'Blog' },
  contact: { en: 'Contact', es: 'Contacto', fr: 'Contact', de: 'Kontakt' },
  payments: { en: 'We accept', es: 'Aceptamos', fr: 'Nous acceptons', de: 'Wir akzeptieren' },
  rights: { en: 'All rights reserved.', es: 'Todos los derechos reservados.', fr: 'Tous droits réservés.', de: 'Alle Rechte vorbehalten.' },
};

const POLICY_FALLBACK = [
  { slug: 'privacy', title: { en: 'Privacy policy', es: 'Política de privacidad', fr: 'Politique de confidentialité', de: 'Datenschutz' } },
  { slug: 'terms', title: { en: 'Terms & conditions', es: 'Términos y condiciones', fr: 'Conditions générales', de: 'AGB' } },
  { slug: 'cancellation', title: { en: 'Cancellation & refunds', es: 'Cancelación y reembolsos', fr: 'Annulation et remboursement', de: 'Stornierung & Erstattung' } },
  { slug: 'cookies', title: { en: 'Cookie policy', es: 'Política de cookies', fr: 'Politique de cookies', de: 'Cookie-Richtlinie' } },
];

/**
 * The page ends in charcoal and gold. First, set apart by a rule of its own,
 * the partner sites — hotels, flights, cruises — then the company: contact,
 * links, the legal pages, the channels it posts on and how guests can pay.
 */
const Footer = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const pages = useSitePages(locale);
  const accounts = useSocialAccounts();
  const year = new Date().getFullYear();

  const policies = POLICY_FALLBACK.map((item) => ({
    slug: item.slug,
    title: pages?.policies.find((policy) => policy.slug === item.slug)?.title || t(locale, item.title),
  }));

  const partners = [
    { key: 'hotels', title: t(locale, COPY.hotels), text: t(locale, COPY.hotelsText), image: '/imgs/edt/banners/hotels-sm.webp', href: PARTNERS.hotels, cta: t(locale, COPY.visit), external: true },
    { key: 'flights', title: t(locale, COPY.flights), text: t(locale, COPY.flightsText), image: '/imgs/edt/banners/flights-sm.webp', href: PARTNERS.flights, cta: t(locale, COPY.visit), external: true },
    {
      key: 'cruises',
      title: t(locale, COPY.cruises),
      text: t(locale, COPY.cruisesText),
      image: '/imgs/edt/banners/cruises-sm.webp',
      href: generateWhatsAppMessage(brandSettings.phoneNumber, t(locale, COPY.cruisesAsk)),
      cta: t(locale, COPY.ask),
      external: true,
    },
  ];

  const linkClass = 'text-[0.95rem] font-medium text-paper/75 no-underline transition-colors hover:text-mango-light';
  const headClass = 'mb-4 font-condensed text-[0.78rem] font-bold uppercase tracking-[0.24em] text-gold';

  return (
    <footer className="relative mt-auto">
      {/* Partner sites: their own band, under a rule, before the company footer. */}
      <section className="bg-paper-warm py-14 sm:py-16" aria-labelledby="partners-title">
        <div className="section-shell">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="kicker">{t(locale, COPY.partnersKicker)}</span>
              <h2 id="partners-title" className="mt-3 font-display text-3xl uppercase sm:text-4xl">{t(locale, COPY.partnersTitle)}</h2>
            </div>
            <div className="hidden h-px flex-1 bg-gradient-to-r from-transparent via-gold/60 to-transparent sm:mx-10 sm:mb-3 sm:block" />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {partners.map((partner) => (
              <a
                key={partner.key}
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-[8px] bg-ink text-white no-underline shadow-ink"
              >
                <img src={partner.image} alt="" loading="lazy" decoding="async" className="h-44 w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h3 className="font-display text-2xl uppercase text-white">{partner.title}</h3>
                      <p className="mt-1 max-w-xs text-sm text-white/80">{partner.text}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-[3px] bg-white/10 px-3 py-2 font-condensed text-xs font-bold uppercase tracking-[0.16em] text-white ring-1 ring-white/30 transition group-hover:bg-mango group-hover:text-ink">
                      {partner.cta} <HiArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div className="relative overflow-hidden bg-ink pb-10 pt-16 text-paper">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
        <div className="section-shell relative z-10">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr,1fr,1fr,1fr]">
            <div>
              <BrandLogo tone="white" size="lg" />
              <p className="mt-6 max-w-sm font-accent text-2xl text-gold-light">{t(locale, COPY.tagline)}</p>
              <ul className="mt-6 space-y-2.5 text-[0.95rem] text-paper/80">
                <li className="flex items-center gap-2"><HiOutlineLocationMarker className="h-4 w-4 text-gold" /> {pages?.contact.address || CONTACT.address}</li>
                {brandSettings.phoneNumber && (
                  <li className="flex items-center gap-2">
                    <FaWhatsapp className="h-4 w-4 text-whatsapp" />
                    <a className={linkClass} href={generateWhatsAppMessage(brandSettings.phoneNumber, '')} target="_blank" rel="noopener noreferrer">{brandSettings.phoneNumber}</a>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <HiOutlineMail className="h-4 w-4 text-gold" />
                  <a className={linkClass} href={`mailto:${pages?.contact.email || CONTACT.email}`}>{pages?.contact.email || CONTACT.email}</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className={headClass}>{t(locale, COPY.services)}</h4>
              <ul className="space-y-2.5">
                <li><Link to="/tours" className={linkClass}>{t(locale, COPY.tours)}</Link></li>
                <li><Link to="/transport" className={linkClass}>{t(locale, COPY.transfers)}</Link></li>
                <li><Link to="/plan" className={linkClass}>{t(locale, COPY.plan)}</Link></li>
                <li><a href={PARTNERS.hotels} target="_blank" rel="noopener noreferrer" className={linkClass}>{t(locale, COPY.hotels)} ↗</a></li>
                <li><a href={PARTNERS.flights} target="_blank" rel="noopener noreferrer" className={linkClass}>{t(locale, COPY.flights)} ↗</a></li>
              </ul>
            </div>

            <div>
              <h4 className={headClass}>{t(locale, COPY.company)}</h4>
              <ul className="space-y-2.5">
                <li><Link to="/about" className={linkClass}>{t(locale, COPY.about)}</Link></li>
                <li><Link to="/about#faq" className={linkClass}>{t(locale, COPY.faq)}</Link></li>
                <li><Link to="/blog" className={linkClass}>{t(locale, COPY.blog)}</Link></li>
                <li><Link to="/contact" className={linkClass}>{t(locale, COPY.contact)}</Link></li>
              </ul>
              <h4 className={`${headClass} mt-8`}>{t(locale, COPY.legal)}</h4>
              <ul className="space-y-2.5">
                {policies.map((policy) => (
                  <li key={policy.slug}><Link to={`/policies/${policy.slug}`} className={linkClass}>{policy.title}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className={headClass}>{t(locale, COPY.follow)}</h4>
              <ul className="space-y-3">
                {accounts.map((account) => {
                  const Icon = SOCIAL_ICONS[account.platform];
                  return (
                    <li key={account.platform + account.url}>
                      <a href={account.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-3 ${linkClass}`}>
                        <span className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-gold/50">{Icon && <Icon className="h-4 w-4" />}</span>
                        {SOCIAL_NAMES[account.platform] ?? account.platform}
                      </a>
                    </li>
                  );
                })}
              </ul>
              <h4 className={`${headClass} mt-8`}>{t(locale, COPY.payments)}</h4>
              <div className="flex flex-wrap items-center gap-3 text-paper/80" aria-label={t(locale, COPY.payments)}>
                <FaCcVisa className="h-7 w-7" title="Visa" />
                <FaCcMastercard className="h-7 w-7" title="Mastercard" />
                <FaCcPaypal className="h-7 w-7" title="PayPal" />
                <FaApplePay className="h-9 w-9" title="Apple Pay" />
                <FaGooglePay className="h-9 w-9" title="Google Pay" />
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-paper/55 sm:flex-row sm:items-center sm:justify-between">
            <span>© {year} {brandSettings.brandName}. {t(locale, COPY.rights)}</span>
            <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-paper/45 no-underline hover:text-mango-light">
              <MdAdminPanelSettings /> Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
