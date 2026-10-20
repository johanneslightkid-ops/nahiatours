import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import AutoScrollGallery from '../AutoScrollGallery';
import CoverflowLightbox from '../CoverflowLightbox';
import { useI18n, type Locale } from '../../../contexts/I18nContext';
import { smallImage } from '../../../edt/useTours';

type L = Record<Locale, string>;

interface Moment {
  src: string;
  /** Pano is 2:1, wide 3:2, square, tall 3:4. */
  shape: 'pano' | 'wide' | 'square' | 'tall';
  caption: L;
}

const tour = (slug: string, n = 1) => `/imgs/edt/tours/${slug}/${n}.webp`;
const gallery = (name: string) => `/imgs/edt/gallery/${name}.webp`;
const dest = (name: string) => `/imgs/edt/dest/${name}.webp`;
const m = (src: string, shape: Moment['shape'], en: string, es: string, fr: string, de: string): Moment => ({ src, shape, caption: { en, es, fr, de } });

/**
 * Real days out, from the company's own camera roll, in three reels.
 *
 * Top: adventure — engines, cables, parachutes, the open sea at speed.
 * Middle: the slow side — beaches, islands, the reef, the spa boat.
 * Bottom: culture, the inland and the animals — towns, markets, farms,
 * waterfalls, dolphins, whales and monkeys.
 */
const ADVENTURE: Moment[] = [
  m(gallery('moment-2'), 'square', 'Into the jungle', 'Hacia la selva', 'Cap sur la jungle', 'Ab in den Dschungel'),
  m(tour('adventure-boogies', 4), 'pano', 'Mud, full throttle', 'Barro a toda máquina', 'Boue à plein régime', 'Schlamm mit Vollgas'),
  m(gallery('moment-4'), 'tall', 'Zipline over the canopy', 'Tirolesa sobre la copa de los árboles', 'Tyrolienne au-dessus de la canopée', 'Zipline über den Baumkronen'),
  m(tour('parasailing', 3), 'pano', 'Two up, high above Bávaro', 'A dúo, sobre Bávaro', 'À deux, au-dessus de Bávaro', 'Zu zweit hoch über Bávaro'),
  m(tour('polaris-vip-punta-cana', 2), 'wide', 'Polaris VIP', 'Polaris VIP', 'Polaris VIP', 'Polaris VIP'),
  m(gallery('moment-9'), 'square', 'Parasailing over Bávaro', 'Parasailing sobre Bávaro', 'Parachute ascensionnel à Bávaro', 'Parasailing über Bávaro'),
  m(tour('speed-boat-snorkel', 1), 'pano', 'Your own speedboat', 'Tu propia lancha', 'Votre propre hors-bord', 'Dein eigenes Speedboot'),
  m(tour('bavaro-adventure-park', 6), 'wide', 'Flying, side by side', 'Volando, uno al lado del otro', 'Voler côte à côte', 'Seite an Seite fliegen'),
  m(gallery('buggies-crew'), 'wide', 'The buggy crew', 'La tripulación de buggies', 'L’équipe des buggies', 'Die Buggy-Crew'),
  m(tour('scape-park-full-admission', 1), 'wide', 'Zipline into the cenote', 'Tirolesa hacia el cenote', 'Tyrolienne vers le cénote', 'Mit der Zipline in die Cenote'),
  m(gallery('moment-6'), 'square', 'Buggies, full throttle', 'Buggies a toda máquina', 'Buggies à plein régime', 'Buggys mit Vollgas'),
  m(tour('the-fieston-catalina-island', 3), 'pano', 'Banana boat', 'Banana boat', 'Banana boat', 'Bananenboot'),
  m(tour('caribbean-pirates', 1), 'pano', 'Caribbean Pirates', 'Piratas del Caribe', 'Pirates des Caraïbes', 'Karibische Piraten'),
  m(tour('zipline-punta-cana', 4), 'wide', 'Over the green', 'Sobre el verde', 'Au-dessus du vert', 'Über dem Grün'),
  m(gallery('moment-5'), 'square', 'Water-park thrills', 'Adrenalina acuática', 'Sensations au parc aquatique', 'Wasserpark-Nervenkitzel'),
  m(tour('fun-park-multiple-activities', 3), 'pano', 'Off road, through the river', 'Fuera de pista, por el río', 'Hors piste, dans la rivière', 'Offroad durch den Fluss'),
  m(gallery('scuba-doo-4'), 'wide', 'Scuba Doo under the sea', 'Scuba Doo bajo el mar', 'Scuba Doo sous la mer', 'Scuba Doo unter Wasser'),
  m(tour('deep-sea-fishing', 4), 'pano', 'Blue marlin on board', 'Marlín azul a bordo', 'Marlin bleu à bord', 'Blauer Marlin an Bord'),
  m(tour('bavaro-adventure-park', 3), 'pano', 'Rolling downhill', 'Rodando cuesta abajo', 'Dévaler la pente', 'Bergab rollen'),
];

const BEACH: Moment[] = [
  m(gallery('aerial-beach'), 'wide', 'Saona from above', 'Saona desde el aire', 'Saona vue du ciel', 'Saona von oben'),
  m(gallery('moment-10'), 'tall', 'Coconuts on board', 'Cocos a bordo', 'Noix de coco à bord', 'Kokosnüsse an Bord'),
  m(tour('saona-island-tour-palmilla-beach', 4), 'pano', 'The leaning palm', 'La palma inclinada', 'Le palmier penché', 'Die schräge Palme'),
  m(gallery('beach-walk'), 'wide', 'Barefoot on the sand', 'Descalzos en la arena', 'Pieds nus dans le sable', 'Barfuß im Sand'),
  m(tour('ocean-spa-doctor-fish', 2), 'pano', 'Floating on the lagoon', 'Flotando en la laguna', 'Flotter sur le lagon', 'Auf der Lagune treiben'),
  m(gallery('moment-3'), 'square', 'The natural pool', 'La piscina natural', 'La piscine naturelle', 'Der Naturpool'),
  m(tour('samanacayo-levantadoel-limon', 8), 'pano', 'Cayo Levantado', 'Cayo Levantado', 'Cayo Levantado', 'Cayo Levantado'),
  m(tour('ocean-spa-doctor-fish', 1), 'pano', 'Yoga on deck', 'Yoga en cubierta', 'Yoga sur le pont', 'Yoga an Deck'),
  m(gallery('flag-pier'), 'wide', 'Island pier', 'Muelle de la isla', 'Ponton de l’île', 'Insel-Steg'),
  m(tour('catalina-island-snorkeling-paradise', 4), 'pano', 'A turtle on the reef', 'Una tortuga en el arrecife', 'Une tortue sur le récif', 'Eine Schildkröte am Riff'),
  m(tour('samanacayo-levantadoel-limon', 1), 'pano', 'Boats at rest, Samaná', 'Barcas en calma, Samaná', 'Barques au repos, Samaná', 'Boote in Ruhe, Samaná'),
  m(tour('ocean-spa-doctor-fish', 3), 'pano', 'A massage at sea', 'Un masaje en el mar', 'Un massage en mer', 'Massage auf dem Meer'),
  m(dest('bayahibe-2'), 'wide', 'Bayahíbe', 'Bayahíbe', 'Bayahibe', 'Bayahíbe'),
  m(tour('bebe-catamaran-tour', 5), 'pano', 'A swim off the catamaran', 'Un baño desde el catamarán', 'Une baignade depuis le catamaran', 'Baden vom Katamaran'),
  m(tour('catalina-island-langostino', 5), 'pano', 'Catalina’s white sand', 'La arena blanca de Catalina', 'Le sable blanc de Catalina', 'Catalinas weißer Sand'),
  m(gallery('scuba-doo-1'), 'wide', 'Under the reef', 'Bajo el arrecife', 'Sous le récif', 'Unter dem Riff'),
  m(tour('saona-island-vip-in-bus-privado', 7), 'pano', 'Jumping for joy on Saona', 'Saltando de alegría en Saona', 'Sauter de joie à Saona', 'Freudensprung auf Saona'),
  m(dest('punta-cana-views'), 'wide', 'Punta Cana mornings', 'Mañanas en Punta Cana', 'Matins à Punta Cana', 'Morgen in Punta Cana'),
  m(tour('saona-island-tour-langosta', 1), 'pano', 'Saona’s shallows', 'Los bajíos de Saona', 'Les hauts-fonds de Saona', 'Die Flachwasser von Saona'),
];

const CULTURE: Moment[] = [
  m(tour('santo-domingo-tour', 5), 'pano', 'Merengue in the Colonial Zone', 'Merengue en la Zona Colonial', 'Merengue dans la Zone coloniale', 'Merengue in der Kolonialzone'),
  m(gallery('moment-8'), 'square', 'Swim with dolphins', 'Nada con delfines', 'Nager avec les dauphins', 'Mit Delfinen schwimmen'),
  m(tour('higuey-city-tour', 3), 'pano', 'The market in Higüey', 'El mercado de Higüey', 'Le marché de Higüey', 'Der Markt von Higüey'),
  m(tour('whale-watching-in-samana-tour', 1), 'pano', 'Humpbacks in Samaná', 'Ballenas jorobadas en Samaná', 'Baleines à bosse à Samaná', 'Buckelwale in Samaná'),
  m(tour('safari-tour', 2), 'pano', 'Hand-rolled cigars', 'Cigarros hechos a mano', 'Cigares roulés à la main', 'Handgerollte Zigarren'),
  m(tour('monkeyland-punta-cana', 2), 'pano', 'Monkeyland', 'Monkeyland', 'Monkeyland', 'Monkeyland'),
  m(dest('santo-domingo-2'), 'wide', 'Santo Domingo by night', 'Santo Domingo de noche', 'Saint-Domingue la nuit', 'Santo Domingo bei Nacht'),
  m(tour('samanacayo-levantadoel-limon', 3), 'pano', 'El Limón waterfall', 'Salto El Limón', 'Cascade El Limón', 'Wasserfall El Limón'),
  m(tour('horseback-ride', 1), 'pano', 'Horseback on the beach', 'A caballo por la playa', 'À cheval sur la plage', 'Reiten am Strand'),
  m(tour('higuey-city-tour', 2), 'pano', 'The basilica of Higüey', 'La basílica de Higüey', 'La basilique de Higüey', 'Die Basilika von Higüey'),
  m(tour('fun-park-multiple-activities', 4), 'pano', 'Milking time on the farm', 'Hora de ordeñar en la finca', 'L’heure de la traite à la ferme', 'Melkzeit auf dem Hof'),
  m(tour('dolphin-encounter', 5), 'pano', 'Dolphins in the air', 'Delfines en el aire', 'Dauphins dans les airs', 'Delfine in der Luft'),
  m(tour('santo-domingo-tour-private', 6), 'pano', 'Puerta del Conde', 'Puerta del Conde', 'Puerta del Conde', 'Puerta del Conde'),
  m(tour('safari-tour', 3), 'pano', 'Cacao, from the pod', 'Cacao, desde la mazorca', 'Le cacao, de la cabosse', 'Kakao, frisch aus der Schote'),
  m(dest('samana'), 'wide', 'The bridges of Samaná', 'Los puentes de Samaná', 'Les ponts de Samaná', 'Die Brücken von Samaná'),
  m(tour('fun-park-multiple-activities', 2), 'pano', 'Riding through the river', 'Cabalgando por el río', 'À cheval dans la rivière', 'Reiten durch den Fluss'),
  m(tour('monkeyland-punta-cana', 1), 'pano', 'A new friend', 'Un nuevo amigo', 'Un nouvel ami', 'Ein neuer Freund'),
  m(tour('higuey-city-tour', 5), 'pano', 'A country house, painted bright', 'Una casa de campo, bien pintada', 'Une maison de campagne colorée', 'Ein buntes Landhaus'),
  m(tour('santo-domingo-tour', 1), 'pano', 'Alcázar de Colón', 'Alcázar de Colón', 'Alcázar de Colomb', 'Alcázar de Colón'),
  m(tour('scape-park-full-admission', 4), 'pano', 'Swimming in a cenote', 'Nadando en un cenote', 'Baignade dans un cénote', 'Baden in einer Cenote'),
  m(dest('puerto-plata'), 'wide', 'The fort of Puerto Plata', 'La fortaleza de Puerto Plata', 'Le fort de Puerto Plata', 'Die Festung von Puerto Plata'),
  m(tour('safari-tour', 4), 'pano', 'Down a village road', 'Por un camino del pueblo', 'Sur une route de village', 'Auf einer Dorfstraße'),
];

const ROWS = [ADVENTURE, BEACH, CULTURE];
const ALL = ROWS.flat();
const STARTS = ROWS.map((_, row) => ROWS.slice(0, row).reduce((sum, items) => sum + items.length, 0));

/** The top reel's pace; the middle runs at 0.7 of it, the bottom at 0.9 of the middle. */
const TOP_SPEED = 34;
const SPEEDS = [TOP_SPEED, TOP_SPEED * 0.7, TOP_SPEED * 0.7 * 0.9];

const SIZE: Record<Moment['shape'], string> = {
  pano: 'w-[22rem] sm:w-[30rem]',
  wide: 'w-[18rem] sm:w-[23.5rem]',
  square: 'w-[12.5rem] sm:w-[15.5rem]',
  tall: 'w-[9.5rem] sm:w-[11.75rem]',
};

const COPY = {
  kicker: { en: 'Real days out', es: 'Días reales', fr: 'De vraies journées', de: 'Echte Tage' },
  title1: { en: 'Moments', es: 'Momentos', fr: 'Des moments', de: 'Momente' },
  title2: { en: 'from the island', es: 'de la isla', fr: 'de l’île', de: 'von der Insel' },
  text: {
    en: 'No stock photos, no filters on reality: this is what a day with us looks like. Hover to slow the reels down and steer them; tap a photo to see it big.',
    es: 'Sin fotos de banco ni filtros: así se ve un día con nosotros. Pasa el ratón para frenar las cintas y guiarlas; toca una foto para verla en grande.',
    fr: 'Pas de photos de banque d’images : voici à quoi ressemble une journée avec nous. Survolez pour ralentir le défilement et le piloter ; touchez une photo pour l’agrandir.',
    de: 'Keine Stockfotos, keine Filter: So sieht ein Tag mit uns aus. Mit der Maus verlangsamen und lenken; ein Foto antippen, um es groß zu sehen.',
  },
  label: { en: 'Photo gallery', es: 'Galería de fotos', fr: 'Galerie photo', de: 'Fotogalerie' },
  rows: [
    { en: 'Adventure', es: 'Aventura', fr: 'Aventure', de: 'Abenteuer' },
    { en: 'Beach & calm', es: 'Playa y calma', fr: 'Plage et détente', de: 'Strand & Ruhe' },
    { en: 'Culture, inland & wildlife', es: 'Cultura, interior y fauna', fr: 'Culture, intérieur et faune', de: 'Kultur, Hinterland & Tiere' },
  ] as L[],
  close: { en: 'Close', es: 'Cerrar', fr: 'Fermer', de: 'Schließen' },
  previous: { en: 'Previous photo', es: 'Foto anterior', fr: 'Photo précédente', de: 'Vorheriges Foto' },
  next: { en: 'Next photo', es: 'Foto siguiente', fr: 'Photo suivante', de: 'Nächstes Foto' },
};

/**
 * Between the hero and the best sellers: three reels of photographs, sorted by
 * the kind of day they show, all running right to left at three paces. Each
 * card lifts and shows its caption under the pointer; with the pointer
 * anywhere over the reels they all slow to half speed (the share is set in the
 * admin); a click opens the photograph on the full-screen stage.
 */
const MomentsGallery: React.FC = () => {
  const { locale } = useI18n();
  const reels = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const lightboxItems = useMemo(() => ALL.map((moment) => ({ src: moment.src, thumb: smallImage(moment.src), caption: moment.caption[locale] })), [locale]);

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
    <section className="home-section relative overflow-hidden bg-paper pb-20 pt-20 sm:pb-28 sm:pt-28" aria-label={COPY.label[locale]}>
      <div className="section-shell mb-10 grid gap-6 md:grid-cols-[1fr,1fr] md:items-end">
        <div>
          <span className="kicker">{COPY.kicker[locale]}</span>
          <h2 className="display-lg mt-4">
            {COPY.title1[locale]} <span className="hl-outline-ink">{COPY.title2[locale]}</span>
          </h2>
        </div>
        <p className="lede max-w-lg md:justify-self-end">{COPY.text[locale]}</p>
      </div>

      {/* The smallest box around the three reels: the pointer anywhere in it slows all three. */}
      <div ref={reels} className="space-y-4">
        {ROWS.map((items, row) => (
          <div key={row}>
            <div className="section-shell mb-2">
              <span className="moment-row-label">{COPY.rows[row][locale]}</span>
            </div>
            <AutoScrollGallery
              items={items}
              itemKey={(item) => item.src}
              renderItem={card(STARTS[row])}
              regionRef={reels}
              speed={SPEEDS[row]}
              arrows={false}
              label={`${COPY.label[locale]} — ${COPY.rows[row][locale]}`}
              className="moment-row"
            />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {open !== null && (
          <CoverflowLightbox
            items={lightboxItems}
            startAt={open}
            onClose={() => setOpen(null)}
            label={COPY.label[locale]}
            closeLabel={COPY.close[locale]}
            previousLabel={COPY.previous[locale]}
            nextLabel={COPY.next[locale]}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

export default MomentsGallery;
