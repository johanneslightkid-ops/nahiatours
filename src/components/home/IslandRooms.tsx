import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { localeText } from '../../lib/localeText';
import { playClickFx } from '../../lib/soundEngine';

/**
 * "The island beyond the beach" — one room of the gallery that is not about
 * a tour.
 *
 * Most guests know the Dominican Republic as a coastline. This gives six
 * small, true things that the country itself is proud of — its music, its
 * first people, its cacao, its own blue stone, its old city, its painters —
 * without making a show of any of them. Each is a fact, a sentence of
 * context and an invitation to ask, so the guide can take it further.
 */

type Lang = { en: string; es: string; de: string; fr: string };

interface Room {
  emoji: string;
  /** The wall colour of the little painting. */
  wall: string;
  title: Lang;
  text: Lang;
}

const ROOMS: Room[] = [
  {
    emoji: '🪗',
    wall: '#FFDD6E',
    title: { en: 'Merengue & bachata', es: 'Merengue y bachata', de: 'Merengue & Bachata', fr: 'Merengue et bachata' },
    text: {
      en: 'Both born here, both on UNESCO’s list of the world’s living heritage. You will hear them from every colmado — ask us where people dance on a Sunday.',
      es: 'Ambos nacieron aquí y ambos son patrimonio cultural inmaterial de la UNESCO. Suenan en cada colmado — pregúntanos dónde se baila el domingo.',
      de: 'Beide sind hier entstanden, beide stehen auf der UNESCO-Liste des immateriellen Kulturerbes. Man hört sie aus jedem Colmado — frag uns, wo sonntags getanzt wird.',
      fr: 'Nés ici, tous deux inscrits au patrimoine culturel immatériel de l’UNESCO. On les entend depuis chaque colmado — demandez-nous où l’on danse le dimanche.',
    },
  },
  {
    emoji: '🪶',
    wall: '#B4D98A',
    title: { en: 'The Taíno, still here', es: 'Lo taíno, todavía aquí', de: 'Die Taíno, noch immer hier', fr: 'Les Taïnos, toujours là' },
    text: {
      en: 'Hamaca, canoa, barbacoa, huracán — words the island’s first people gave the world. Their drawings still line the Cueva de las Maravillas, an hour from Bávaro.',
      es: 'Hamaca, canoa, barbacoa, huracán: palabras que los primeros pobladores dieron al mundo. Sus dibujos siguen en la Cueva de las Maravillas, a una hora de Bávaro.',
      de: 'Hängematte, Kanu, Barbecue, Hurrikan — Wörter, die die ersten Bewohner der Insel der Welt geschenkt haben. Ihre Zeichnungen sind noch in der Cueva de las Maravillas zu sehen, eine Stunde von Bávaro.',
      fr: 'Hamac, canoë, barbecue, ouragan — des mots offerts au monde par les premiers habitants de l’île. Leurs dessins ornent encore la Cueva de las Maravillas, à une heure de Bávaro.',
    },
  },
  {
    emoji: '🍫',
    wall: '#FFC09A',
    title: { en: 'Cacao & café', es: 'Cacao y café', de: 'Kakao & Kaffee', fr: 'Cacao et café' },
    text: {
      en: 'The country is one of the world’s great growers of organic cacao, and its mountain coffee rarely leaves the island. A farm visit tastes of both.',
      es: 'El país es uno de los grandes productores de cacao orgánico del mundo, y su café de montaña casi no sale de la isla. Una visita a la finca sabe a ambos.',
      de: 'Das Land gehört zu den großen Anbauern von Bio-Kakao weltweit, und sein Bergkaffee verlässt die Insel kaum. Ein Besuch auf der Finca schmeckt nach beidem.',
      fr: 'Le pays est l’un des grands producteurs mondiaux de cacao bio, et son café de montagne quitte rarement l’île. Une visite de plantation a le goût des deux.',
    },
  },
  {
    emoji: '💎',
    wall: '#A9E4EE',
    title: { en: 'Larimar', es: 'Larimar', de: 'Larimar', fr: 'Larimar' },
    text: {
      en: 'A sea-blue stone found in one place on earth: the mountains of Barahona, in the south-west. The blue of this site is borrowed from it.',
      es: 'Una piedra azul mar que solo existe en un lugar del mundo: las montañas de Barahona, en el suroeste. El azul de esta página viene de ella.',
      de: 'Ein meerblauer Stein, den es nur an einem Ort der Welt gibt: in den Bergen von Barahona im Südwesten. Das Blau dieser Seite ist von ihm geliehen.',
      fr: 'Une pierre bleu océan qu’on ne trouve qu’en un seul endroit au monde : les montagnes de Barahona, au sud-ouest. Le bleu de ce site lui est emprunté.',
    },
  },
  {
    emoji: '⛪',
    wall: '#F2AEDB',
    title: { en: 'The first city', es: 'La primera ciudad', de: 'Die erste Stadt', fr: 'La première ville' },
    text: {
      en: 'Santo Domingo’s Zona Colonial holds the oldest cathedral in the Americas and streets of painted shutters — the windows at the top of this page.',
      es: 'La Zona Colonial de Santo Domingo guarda la catedral más antigua de América y calles de persianas pintadas: las ventanas de arriba en esta página.',
      de: 'Die Zona Colonial von Santo Domingo birgt die älteste Kathedrale Amerikas und Gassen mit bemalten Fensterläden — die Fenster oben auf dieser Seite.',
      fr: 'La Zona Colonial de Saint-Domingue abrite la plus ancienne cathédrale des Amériques et des rues aux persiennes peintes — les fenêtres en haut de cette page.',
    },
  },
  {
    emoji: '🎨',
    wall: '#A9BAF5',
    title: { en: 'The painters', es: 'Los pintores', de: 'Die Maler', fr: 'Les peintres' },
    text: {
      en: 'Cándido Bidó’s blue skies and yellow suns, Ada Balcácer’s colour, Jaime Colson’s modern lines. See them at the Museo de Arte Moderno, or the artists’ village of Altos de Chavón.',
      es: 'Los cielos azules y soles amarillos de Cándido Bidó, el color de Ada Balcácer, las líneas modernas de Jaime Colson. Están en el Museo de Arte Moderno o en el pueblo de artistas de Altos de Chavón.',
      de: 'Cándido Bidós blaue Himmel und gelbe Sonnen, Ada Balcácers Farben, Jaime Colsons moderne Linien. Zu sehen im Museo de Arte Moderno oder im Künstlerdorf Altos de Chavón.',
      fr: 'Les ciels bleus et soleils jaunes de Cándido Bidó, la couleur d’Ada Balcácer, les lignes modernes de Jaime Colson. À voir au Museo de Arte Moderno ou au village d’artistes d’Altos de Chavón.',
    },
  },
];

const IslandRooms: React.FC = () => {
  const { locale } = useI18n();
  const say = (texts: Lang) => localeText(locale, texts);
  return (
    <section className="home-section bay-section wavy-band relative overflow-hidden px-4 py-24 sm:py-28 md:px-8" aria-labelledby="island-rooms-title">
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="hand-note">{say({ en: 'more than a beach', es: 'más que playa', de: 'mehr als Strand', fr: 'plus qu’une plage' })}</span>
          <h2 id="island-rooms-title" className="scribble-title-bg mt-2 font-display text-4xl text-ink sm:text-5xl">
            {say({ en: 'The island beyond the shore', es: 'La isla más allá de la orilla', de: 'Die Insel hinter dem Strand', fr: 'L’île au-delà du rivage' })}
          </h2>
          <p className="mt-5 text-lg font-medium leading-8 text-ink-soft">
            {say({
              en: 'Six small things the Dominican Republic is proud of. Ask your guide about any of them — the best conversations on the way to the beach start here.',
              es: 'Seis cosas pequeñas de las que la República Dominicana está orgullosa. Pregúntale a tu guía por cualquiera: las mejores conversaciones camino a la playa empiezan aquí.',
              de: 'Sechs kleine Dinge, auf die die Dominikanische Republik stolz ist. Frag deinen Guide nach jedem davon — die besten Gespräche auf dem Weg zum Strand beginnen hier.',
              fr: 'Six petites choses dont la République dominicaine est fière. Interrogez votre guide sur chacune — les meilleures conversations sur la route de la plage commencent ici.',
            })}
          </p>
        </div>
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {ROOMS.map((room, index) => (
            <motion.article
              key={room.emoji}
              initial={{ opacity: 0, y: 28, rotate: index % 2 ? 2 : -2 }}
              whileInView={{ opacity: 1, y: 0, rotate: index % 2 ? 0.6 : -0.6 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card relative overflow-hidden"
            >
              <div className="flex h-28 items-center justify-center border-b-[3px] border-ink text-5xl" style={{ background: room.wall }} aria-hidden="true">
                <span className="grid h-20 w-20 place-items-center rounded-full border-[3px] border-ink bg-paper-card shadow-ink-sm">{room.emoji}</span>
              </div>
              <div className="p-6">
                <h3 className="font-display text-2xl text-ink">{say(room.title)}</h3>
                <p className="mt-2 text-[0.98rem] font-medium leading-7 text-ink-soft">{say(room.text)}</p>
              </div>
            </motion.article>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/contact#top" onClick={() => playClickFx()} className="tropical-button-outline">
            {say({ en: 'Ask us about a day of culture', es: 'Pregúntanos por un día de cultura', de: 'Frag uns nach einem Kulturtag', fr: 'Demandez-nous une journée culturelle' })}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default IslandRooms;
