import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HiChevronLeft, HiChevronRight, HiX } from 'react-icons/hi';
import AutoScrollGallery from '../AutoScrollGallery';
import { useI18n, type Locale } from '../../../contexts/I18nContext';
import { smallImage } from '../../../edt/useTours';

type L = Record<Locale, string>;

interface Moment {
  src: string;
  /** Wide (3:2) or square. */
  shape: 'wide' | 'square' | 'tall';
  caption: L;
}

const tour = (slug: string, n = 1) => `/imgs/edt/tours/${slug}/${n}.webp`;

/** Real days out, from the company's own camera roll. */
const ROW_A: Moment[] = [
  { src: '/imgs/edt/gallery/moment-2.webp', shape: 'square', caption: { en: 'Into the jungle', es: 'Hacia la selva', fr: 'Cap sur la jungle', de: 'Ab in den Dschungel' } },
  { src: '/imgs/edt/gallery/aerial-beach.webp', shape: 'wide', caption: { en: 'Saona from above', es: 'Saona desde el aire', fr: 'Saona vue du ciel', de: 'Saona von oben' } },
  { src: '/imgs/edt/gallery/moment-4.webp', shape: 'tall', caption: { en: 'Zipline over the canopy', es: 'Tirolesa sobre la copa de los árboles', fr: 'Tyrolienne au-dessus de la canopée', de: 'Zipline über den Baumkronen' } },
  { src: tour('caribbean-pirates'), shape: 'wide', caption: { en: 'Caribbean Pirates', es: 'Piratas del Caribe', fr: 'Pirates des Caraïbes', de: 'Karibische Piraten' } },
  { src: '/imgs/edt/gallery/moment-9.webp', shape: 'square', caption: { en: 'Parasailing over Bávaro', es: 'Parasailing sobre Bávaro', fr: 'Parachute ascensionnel à Bávaro', de: 'Parasailing über Bávaro' } },
  { src: tour('polaris-vip-punta-cana', 2), shape: 'wide', caption: { en: 'Polaris VIP', es: 'Polaris VIP', fr: 'Polaris VIP', de: 'Polaris VIP' } },
  { src: '/imgs/edt/gallery/moment-8.webp', shape: 'tall', caption: { en: 'Swim with dolphins', es: 'Nada con delfines', fr: 'Nager avec les dauphins', de: 'Mit Delfinen schwimmen' } },
  { src: '/imgs/edt/gallery/scuba-doo-2.webp', shape: 'wide', caption: { en: 'Under the reef', es: 'Bajo el arrecife', fr: 'Sous le récif', de: 'Unter dem Riff' } },
  { src: tour('whale-watching-in-samana-tour'), shape: 'wide', caption: { en: 'Humpbacks in Samaná', es: 'Ballenas jorobadas en Samaná', fr: 'Baleines à bosse à Samaná', de: 'Buckelwale in Samaná' } },
];

const ROW_B: Moment[] = [
  { src: '/imgs/edt/gallery/moment-10.webp', shape: 'tall', caption: { en: 'Coconuts on board', es: 'Cocos a bordo', fr: 'Noix de coco à bord', de: 'Kokosnüsse an Bord' } },
  { src: '/imgs/edt/gallery/beach-walk.webp', shape: 'wide', caption: { en: 'Barefoot on the sand', es: 'Descalzos en la arena', fr: 'Pieds nus dans le sable', de: 'Barfuß im Sand' } },
  { src: '/imgs/edt/gallery/moment-3.webp', shape: 'square', caption: { en: 'The natural pool', es: 'La piscina natural', fr: 'La piscine naturelle', de: 'Der Naturpool' } },
  { src: tour('santo-domingo-tour', 5), shape: 'wide', caption: { en: 'Merengue in the Colonial Zone', es: 'Merengue en la Zona Colonial', fr: 'Merengue dans la Zone coloniale', de: 'Merengue in der Kolonialzone' } },
  { src: '/imgs/edt/gallery/moment-5.webp', shape: 'square', caption: { en: 'Water-park thrills', es: 'Adrenalina acuática', fr: 'Sensations au parc aquatique', de: 'Wasserpark-Nervenkitzel' } },
  { src: '/imgs/edt/gallery/flag-pier.webp', shape: 'wide', caption: { en: 'Island pier', es: 'Muelle de la isla', fr: 'Ponton de l’île', de: 'Insel-Steg' } },
  { src: tour('monkeyland-punta-cana', 2), shape: 'wide', caption: { en: 'Monkeyland', es: 'Monkeyland', fr: 'Monkeyland', de: 'Monkeyland' } },
  { src: '/imgs/edt/gallery/moment-6.webp', shape: 'square', caption: { en: 'Boogies, full throttle', es: 'Boogies a toda máquina', fr: 'Buggies à plein régime', de: 'Buggys mit Vollgas' } },
  { src: tour('horseback-ride'), shape: 'wide', caption: { en: 'Horseback on the beach', es: 'A caballo por la playa', fr: 'À cheval sur la plage', de: 'Reiten am Strand' } },
];

const ALL = [...ROW_A, ...ROW_B];

const SIZE: Record<Moment['shape'], string> = {
  wide: 'w-[19rem] sm:w-[26rem]',
  square: 'w-[13rem] sm:w-[17.5rem]',
  tall: 'w-[11rem] sm:w-[14.5rem]',
};

const COPY = {
  kicker: { en: 'Real days out', es: 'Días reales', fr: 'De vraies journées', de: 'Echte Tage' },
  title1: { en: 'Moments', es: 'Momentos', fr: 'Des moments', de: 'Momente' },
  title2: { en: 'from the island', es: 'de la isla', fr: 'de l’île', de: 'von der Insel' },
  text: {
    en: 'No stock photos, no filters on reality: this is what a day with us looks like. Hover to stop the reel and steer it yourself; tap a photo to see it big.',
    es: 'Sin fotos de banco ni filtros: así se ve un día con nosotros. Pasa el ratón para detener la cinta y guiarla tú; toca una foto para verla en grande.',
    fr: 'Pas de photos de banque d’images : voici à quoi ressemble une journée avec nous. Survolez pour arrêter le défilement et le piloter ; touchez une photo pour l’agrandir.',
    de: 'Keine Stockfotos, keine Filter: So sieht ein Tag mit uns aus. Mit der Maus anhalten und selbst steuern; ein Foto antippen, um es groß zu sehen.',
  },
  label: { en: 'Photo gallery', es: 'Galería de fotos', fr: 'Galerie photo', de: 'Fotogalerie' },
};

const Lightbox: React.FC<{ index: number; onClose: () => void; onMove: (delta: number) => void; locale: Locale }> = ({ index, onClose, onMove, locale }) => {
  const moment = ALL[index];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onMove(1);
      if (event.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, onMove]);
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/95 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <motion.figure
        key={moment.src}
        className="relative max-h-full max-w-5xl"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={(event) => event.stopPropagation()}
      >
        <img src={moment.src} alt={moment.caption[locale]} className="max-h-[80vh] w-auto rounded-[6px] object-contain" />
        <figcaption className="mt-4 flex items-center justify-between gap-4 text-white">
          <span className="font-display text-2xl uppercase">{moment.caption[locale]}</span>
          <span className="font-condensed text-sm font-bold tracking-[0.2em] text-gold-light">{String(index + 1).padStart(2, '0')} / {ALL.length}</span>
        </figcaption>
      </motion.figure>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white hover:text-ink" aria-label="Close">
        <HiX className="h-6 w-6" />
      </button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onMove(-1); }} className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white hover:text-ink" aria-label="Previous">
        <HiChevronLeft className="h-6 w-6" />
      </button>
      <button type="button" onClick={(event) => { event.stopPropagation(); onMove(1); }} className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white hover:text-ink" aria-label="Next">
        <HiChevronRight className="h-6 w-6" />
      </button>
    </motion.div>
  );
};

/**
 * Between the hero and the welcome: two reels of photographs running in
 * opposite directions. Each card lifts and shows its caption under the
 * pointer; the reel stops and can be steered while the pointer is over the
 * section; a click opens the photograph full screen.
 */
const MomentsGallery: React.FC = () => {
  const { locale } = useI18n();
  const region = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const move = useCallback((delta: number) => setOpen((value) => (value === null ? value : (value + delta + ALL.length) % ALL.length)), []);

  const card = (offset: number) => (moment: Moment, index: number) => (
    <button
      type="button"
      onClick={() => setOpen(offset + index)}
      className={`moment-card group ${SIZE[moment.shape]}`}
      aria-label={moment.caption[locale]}
    >
      <img src={smallImage(moment.src)} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]" />
      <span className="moment-caption">
        <span className="font-condensed text-[0.7rem] font-bold tracking-[0.2em] text-mango-light">{String(offset + index + 1).padStart(2, '0')}</span>
        <span className="font-display text-xl uppercase leading-none text-white">{moment.caption[locale]}</span>
      </span>
    </button>
  );

  return (
    <section ref={region} className="home-section relative overflow-hidden bg-paper pb-20 pt-20 sm:pb-28 sm:pt-28" aria-label={COPY.label[locale]}>
      <div className="section-shell mb-10 grid gap-6 md:grid-cols-[1fr,1fr] md:items-end">
        <div>
          <span className="kicker">{COPY.kicker[locale]}</span>
          <h2 className="display-lg mt-4">
            {COPY.title1[locale]} <span className="hl-outline-ink">{COPY.title2[locale]}</span>
          </h2>
        </div>
        <p className="lede max-w-lg md:justify-self-end">{COPY.text[locale]}</p>
      </div>

      <div className="space-y-5">
        <AutoScrollGallery
          items={ROW_A}
          itemKey={(item) => item.src}
          renderItem={card(0)}
          regionRef={region}
          speed={34}
          direction={1}
          label={COPY.label[locale]}
          className="moment-row"
        />
        <AutoScrollGallery
          items={ROW_B}
          itemKey={(item) => item.src}
          renderItem={card(ROW_A.length)}
          regionRef={region}
          speed={34}
          direction={-1}
          label={COPY.label[locale]}
          className="moment-row"
        />
      </div>

      <AnimatePresence>{open !== null && <Lightbox index={open} onClose={() => setOpen(null)} onMove={move} locale={locale} />}</AnimatePresence>
    </section>
  );
};

export default MomentsGallery;
