import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { HiArrowRight, HiUserGroup } from 'react-icons/hi';
import AutoScrollGallery from '../AutoScrollGallery';
import { useI18n, type Locale } from '../../../contexts/I18nContext';
import { useBrand } from '../../../contexts/BrandContext';
import { getServiceSlug, Tour } from '../../../services/toursService';
import { generateWhatsAppMessage } from '../../../utils/whatsapp';
import { smallImage, useTransport } from '../../../edt/useTours';
import { playClickFx } from '../../../lib/soundEngine';

type L = Record<Locale, string>;

const COPY = {
  kicker: { en: 'Transfers', es: 'Traslados', fr: 'Transferts', de: 'Transfers' },
  title1: { en: 'Don’t just get there.', es: 'No solo llegues.', fr: 'Ne vous contentez pas d’arriver.', de: 'Nicht einfach ankommen.' },
  title2: { en: 'Get there in style.', es: 'Llega con estilo.', fr: 'Arrivez avec style.', de: 'Stilvoll ankommen.' },
  text: {
    en: 'Airport, hotel, villa or excursion: private minivans, a black Suburban or a full coach — 24 hours a day, at a fixed price.',
    es: 'Aeropuerto, hotel, villa o excursión: minivans privadas, una Suburban negra o un autobús completo, 24 horas al día y a precio fijo.',
    fr: 'Aéroport, hôtel, villa ou excursion : minivans privés, un Suburban noir ou un autocar — 24 h/24, à prix fixe.',
    de: 'Flughafen, Hotel, Villa oder Ausflug: private Minivans, ein schwarzer Suburban oder ein ganzer Reisebus — rund um die Uhr, zum Festpreis.',
  },
  quote: { en: 'Get a price', es: 'Calcular precio', fr: 'Obtenir un prix', de: 'Preis berechnen' },
  details: { en: 'Details', es: 'Detalles', fr: 'Détails', de: 'Details' },
  ask: { en: 'Hello! I need a transfer:', es: '¡Hola! Necesito un traslado:', fr: 'Bonjour ! J’ai besoin d’un transfert :', de: 'Hallo! Ich brauche einen Transfer:' },
  label: { en: 'Transfers', es: 'Traslados', fr: 'Transferts', de: 'Transfers' },
  promise1: { en: 'Meet & greet at PUJ', es: 'Recibimiento en PUJ', fr: 'Accueil à l’aéroport PUJ', de: 'Empfang am Flughafen PUJ' },
  promise2: { en: 'Flight tracking', es: 'Seguimiento de vuelo', fr: 'Suivi du vol', de: 'Flugverfolgung' },
  promise3: { en: 'Fixed price, no surprises', es: 'Precio fijo, sin sorpresas', fr: 'Prix fixe, sans surprise', de: 'Festpreis, keine Überraschungen' },
};

const paxOf = (text: string) => /(\d+)\s*(?:to|a|à|bis|-|–)\s*(\d+)/.exec(text);

const TransferCard: React.FC<{ service: Tour; locale: Locale; phone: string }> = ({ service, locale, phone }) => {
  const path = `/details/transport/${getServiceSlug(service)}`;
  const pax = paxOf(service.description);
  return (
    <article className="transfer-card group w-[19rem] sm:w-[24rem]">
      <div className="relative aspect-[3/2] overflow-hidden bg-white">
        <img src={smallImage(service.image)} alt={service.title} loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {pax && (
          <span className="absolute left-3 top-3 badge badge-ink">
            <HiUserGroup className="h-3.5 w-3.5 text-mango-light" /> {pax[1]}–{pax[2]}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[1.6rem] uppercase leading-none text-ink">{service.title}</h3>
        <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-ink-soft">{service.description}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <span className="font-display text-3xl leading-none text-ink">{service.price}</span>
          <div className="flex gap-2">
            <Link to={path} onClick={() => playClickFx()} className="grid h-11 w-11 place-items-center rounded-[3px] ring-1 ring-ink/15 transition hover:bg-ink hover:text-paper" aria-label={COPY.details[locale]} draggable={false}>
              <HiArrowRight className="h-5 w-5" />
            </Link>
            <a href={generateWhatsAppMessage(phone, `${COPY.ask[locale]} ${service.title}`)} target="_blank" rel="noopener noreferrer" className="btn-wa btn-sm" draggable={false} aria-label="WhatsApp">
              <FaWhatsapp className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};

/** Above the recognition: the fleet, as a reel. With three services it shows the chauffeur photograph between them. */
const TopTransfersGallery: React.FC = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const services = useTransport(locale) ?? [];
  const region = useRef<HTMLElement>(null);
  type Item = { kind: 'service'; service: Tour } | { kind: 'photo'; src: string };
  const items: Item[] = services.flatMap((service, index) =>
    index === 0 ? [{ kind: 'photo' as const, src: '/imgs/edt/banners/transfers.webp' }, { kind: 'service' as const, service }] : [{ kind: 'service' as const, service }]
  );

  return (
    <section ref={region} className="home-section relative overflow-hidden bg-white py-20 sm:py-28" aria-label={COPY.label[locale]}>
      <div className="section-shell mb-10 grid gap-8 lg:grid-cols-[1.2fr,1fr] lg:items-end">
        <div>
          <span className="kicker">{COPY.kicker[locale]}</span>
          <h2 className="display-lg mt-4">
            {COPY.title1[locale]}
            <br />
            <span className="hl-outline-ink">{COPY.title2[locale]}</span>
          </h2>
        </div>
        <div>
          <p className="lede">{COPY.text[locale]}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {[COPY.promise1, COPY.promise2, COPY.promise3].map((promise) => (
              <li key={promise.en} className="badge badge-gold">◆ {promise[locale]}</li>
            ))}
          </ul>
        </div>
      </div>
      <AutoScrollGallery
        items={items}
        itemKey={(item, index) => (item.kind === 'photo' ? `photo-${index}` : String(item.service.id))}
        renderItem={(item) =>
          item.kind === 'photo' ? (
            <div className="transfer-photo w-[22rem] sm:w-[34rem]">
              <img src={smallImage(item.src)} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
              <span className="absolute bottom-5 left-5 font-accent text-3xl text-white">VIP</span>
            </div>
          ) : (
            <TransferCard service={item.service} locale={locale} phone={brandSettings.phoneNumber} />
          )
        }
        regionRef={region}
        speed={28}
        direction={-1}
        label={COPY.label[locale]}
      />
      <div className="section-shell mt-10">
        <Link to="/transport" onClick={() => playClickFx()} className="btn-ink">
          {COPY.quote[locale]} <HiArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
};

export default TopTransfersGallery;
