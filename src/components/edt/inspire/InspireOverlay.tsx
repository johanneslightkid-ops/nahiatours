import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { FaWhatsapp, FaYoutube } from 'react-icons/fa';
import { HiCheck, HiChevronLeft, HiChevronRight, HiClock, HiLocationMarker, HiPlay } from 'react-icons/hi';
import { useI18n, type Locale } from '../../../contexts/I18nContext';
import { useBrand } from '../../../contexts/BrandContext';
import type { Tour } from '../../../services/toursService';
import { DEFAULT_INSPIRE, getInspireConfig, InspireConfig } from '../../../edt/inspireConfig';
import { descriptionField, excerpt, includedItems, loadTours, smallImage } from '../../../edt/useTours';
import { useSocialAccounts } from '../brand';
import InspireEffects from './InspireEffects';
import InspireMusic from './InspireMusic';
import { InspireToggle } from './InspireContext';

type L = Record<Locale, string>;
type View = 'carousel' | 'tour' | 'videos' | 'video';

interface Video {
  id: string;
  title: string;
  channel: string;
  views: number;
  short: boolean;
  thumb: string;
  from: 'channel' | 'shorts' | 'popular';
}

const COPY = {
  showcase: { en: 'Showcase', es: 'Escaparate', fr: 'Vitrine', de: 'Schaufenster' },
  videos: { en: 'Videos', es: 'Videos', fr: 'Vidéos', de: 'Videos' },
  watch: { en: 'Watch videos', es: 'Ver videos', fr: 'Voir les vidéos', de: 'Videos ansehen' },
  explore: { en: 'Tap to explore', es: 'Toca para descubrir', fr: 'Touchez pour découvrir', de: 'Antippen zum Entdecken' },
  from: { en: 'from', es: 'desde', fr: 'dès', de: 'ab' },
  person: { en: 'per person', es: 'por persona', fr: 'par personne', de: 'pro Person' },
  included: { en: 'Included', es: 'Incluye', fr: 'Inclus', de: 'Inklusive' },
  ask: { en: 'Book it at the desk or on WhatsApp', es: 'Resérvalo en el mostrador o por WhatsApp', fr: 'Réservez au comptoir ou sur WhatsApp', de: 'Buche am Schalter oder per WhatsApp' },
  loading: { en: 'Finding the best videos…', es: 'Buscando los mejores videos…', fr: 'Recherche des meilleures vidéos…', de: 'Die besten Videos werden gesucht…' },
  none: { en: 'No videos found for this tour yet.', es: 'Aún no hay videos para este tour.', fr: 'Pas encore de vidéos pour cette excursion.', de: 'Für diese Tour gibt es noch keine Videos.' },
  hover: { en: 'Point at a video to preview it with sound', es: 'Pasa el cursor sobre un video para verlo con sonido', fr: 'Survolez une vidéo pour l’aperçu avec le son', de: 'Zeige auf ein Video für die Vorschau mit Ton' },
  channel: { en: 'Our channel', es: 'Nuestro canal', fr: 'Notre chaîne', de: 'Unser Kanal' },
  shorts: { en: 'Short', es: 'Short', fr: 'Short', de: 'Short' },
  popular: { en: 'Popular', es: 'Popular', fr: 'Populaire', de: 'Beliebt' },
  views: { en: 'views', es: 'vistas', fr: 'vues', de: 'Aufrufe' },
};

const IDLE_MS = 75_000;

const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

/** A YouTube player with sound, as the shop's TV shows it. */
const embed = (id: string, preview: boolean) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3${
    preview ? `&controls=0&loop=1&playlist=${id}` : '&controls=1'
  }`;

/** ── The carousel: a slow ring of tours, the one in front large. ───────── */
const Carousel: React.FC<{
  tours: Tour[];
  index: number;
  setIndex: (index: number) => void;
  onOpen: (index: number) => void;
  seconds: number;
  headline: string;
  locale: Locale;
}> = ({ tours, index, setIndex, onOpen, seconds, headline, locale }) => {
  const reduced = useReducedMotion();
  const count = tours.length;
  return (
    <div className="relative flex h-full flex-col">
      <motion.h2
        className="inspire-headline px-[6vw] pt-[11vh] text-center"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {headline}
      </motion.h2>
      <div className="relative flex-1" style={{ perspective: '1800px' }}>
        {tours.map((tour, i) => {
          let offset = i - index;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          const distance = Math.abs(offset);
          if (distance > 3) return null;
          const front = offset === 0;
          const duration = tour.duration || descriptionField(tour.description, 'duration');
          return (
            <motion.button
              key={tour.id}
              type="button"
              onClick={() => (front ? onOpen(i) : setIndex(i))}
              className="inspire-card"
              style={{ zIndex: 10 - distance }}
              animate={{
                x: `calc(-50% + ${offset * 27}vw)`,
                y: '-50%',
                rotateY: offset * -24,
                scale: front ? 1 : 1 - distance * 0.13,
                opacity: distance > 2 ? 0 : 1,
              }}
              transition={{ type: 'spring', stiffness: 70, damping: 18, mass: 0.9 }}
              aria-label={tour.title}
            >
              <motion.img
                layoutId={`inspire-image-${tour.id}`}
                src={smallImage(tour.image)}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover ${front && !reduced ? 'inspire-card-zoom' : ''}`}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
              {/* Cards further back are darker, not see-through. */}
              <motion.span className="pointer-events-none absolute inset-0 z-10 bg-ink" animate={{ opacity: distance * 0.32 }} transition={{ duration: 0.6 }} />
              <span className="absolute left-5 top-5 font-display text-[3.4vw] leading-none text-transparent [-webkit-text-stroke:1.5px_#fff]">
                #{String(i + 1).padStart(2, '0')}
              </span>
              <span className="absolute inset-x-0 bottom-0 p-[1.6vw] text-left">
                <span className="block font-condensed text-[1.05vw] font-bold uppercase tracking-[0.2em] text-mango-light">
                  {[duration, tour.destination].filter(Boolean).join(' · ')}
                </span>
                <span className="mt-2 block font-display text-[2.7vw] uppercase leading-[0.95] text-white">{tour.title}</span>
                <span className="mt-3 flex items-end justify-between">
                  <span>
                    <span className="block font-condensed text-[0.9vw] font-bold uppercase tracking-[0.2em] text-gold-light">{COPY.from[locale]}</span>
                    <span className="font-display text-[3.2vw] leading-none text-white">{tour.price}</span>
                  </span>
                  {front && <span className="inspire-explore">{COPY.explore[locale]}</span>}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-6 pb-[10vh]">
        <button type="button" className="inspire-round" onClick={() => setIndex((index - 1 + count) % count)} aria-label="Previous"><HiChevronLeft className="h-7 w-7" /></button>
        <div className="h-1 w-[22vw] overflow-hidden rounded-full bg-white/20">
          <span key={index} className="inspire-progress block h-full origin-left bg-mango" style={{ animationDuration: `${seconds}s` }} />
        </div>
        <button type="button" className="inspire-round" onClick={() => setIndex((index + 1) % count)} aria-label="Next"><HiChevronRight className="h-7 w-7" /></button>
      </div>
    </div>
  );
};

/** ── One tour, for reading from across the shop. ────────────────────────── */
const TourStage: React.FC<{ tour: Tour; locale: Locale; phone: string; onVideos: () => void }> = ({ tour, locale, phone, onVideos }) => {
  const images = tour.details.images.length ? tour.details.images : [tour.image];
  const [image, setImage] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => setImage(0), [tour.id]);
  useEffect(() => {
    if (reduced || images.length < 2) return undefined;
    const timer = window.setInterval(() => setImage((value) => (value + 1) % images.length), 6500);
    return () => window.clearInterval(timer);
  }, [images.length, reduced, image]);

  const duration = tour.duration || descriptionField(tour.description, 'duration');
  const departs = tour.destination || descriptionField(tour.description, 'departs');
  const included = includedItems(tour.description).slice(0, 5);

  return (
    <div className="grid h-full grid-cols-[55%,45%] items-center gap-[3vw] px-[4vw] pb-[10vh] pt-[12vh]">
      <div className="relative h-full max-h-[78vh] overflow-hidden rounded-[10px] shadow-ink-xl">
        <motion.img
          layoutId={`inspire-image-${tour.id}`}
          src={images[0] === tour.image ? smallImage(tour.image) : images[0]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: image === 0 ? 1 : 0 }}
        />
        <AnimatePresence>
          {image > 0 && (
            <motion.img
              key={images[image]}
              src={images[image]}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
            />
          )}
        </AnimatePresence>
        {images.length > 1 && (
          <>
            <button type="button" className="inspire-round absolute left-4 top-1/2 -translate-y-1/2" onClick={() => setImage((image - 1 + images.length) % images.length)} aria-label="Previous photo">
              <HiChevronLeft className="h-8 w-8" />
            </button>
            <button type="button" className="inspire-round absolute right-4 top-1/2 -translate-y-1/2" onClick={() => setImage((image + 1) % images.length)} aria-label="Next photo">
              <HiChevronRight className="h-8 w-8" />
            </button>
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
              {images.map((src, i) => (
                <button key={src} type="button" onClick={() => setImage(i)} className={`h-1.5 rounded-full transition-all ${i === image ? 'w-10 bg-mango' : 'w-4 bg-white/50'}`} aria-label={`Photo ${i + 1}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
        <div className="flex flex-wrap gap-3 font-condensed text-[1.5vw] font-bold uppercase tracking-[0.16em] text-mango-light">
          {duration && <span className="inline-flex items-center gap-2"><HiClock /> {duration}</span>}
          {departs && <span className="inline-flex items-center gap-2"><HiLocationMarker /> {departs}</span>}
        </div>
        <h2 className="mt-3 font-display text-[5vw] uppercase leading-[0.92] text-white">{tour.title}</h2>
        <p className="mt-4 max-w-[40vw] text-[1.45vw] leading-snug text-white/85">{excerpt(tour.description, 160)}</p>
        {included.length > 0 && (
          <ul className="mt-6 space-y-2.5">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[1.55vw] leading-tight text-white">
                <HiCheck className="mt-1 h-[1.6vw] w-[1.6vw] shrink-0 text-whatsapp" /> {item}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex flex-wrap items-end gap-8">
          <div>
            <span className="block font-condensed text-[1.1vw] font-bold uppercase tracking-[0.2em] text-gold-light">{COPY.from[locale]}</span>
            <span className="font-display text-[5.2vw] leading-none text-white">{tour.price}</span>
            <span className="ml-2 text-[1.1vw] text-white/70">{COPY.person[locale]}</span>
          </div>
          <button type="button" onClick={onVideos} className="inspire-cta">
            <FaYoutube className="h-[1.8vw] w-[1.8vw]" /> {COPY.watch[locale]}
          </button>
        </div>
        <p className="mt-6 flex items-center gap-3 text-[1.25vw] text-white/80">
          <FaWhatsapp className="h-[1.6vw] w-[1.6vw] text-whatsapp" /> {COPY.ask[locale]} · <span className="font-semibold text-white">{phone}</span>
        </p>
      </motion.div>
    </div>
  );
};

/** ── Videos about the tour; pointing at one plays it, with sound. ───────── */
const VideoWall: React.FC<{ videos: Video[] | null; locale: Locale; onPlay: (video: Video) => void }> = ({ videos, locale, onPlay }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const hover = useRef(0);
  if (videos === null) return <div className="grid h-full place-items-center font-condensed text-[1.6vw] uppercase tracking-[0.2em] text-white/80">{COPY.loading[locale]}</div>;
  if (!videos.length) return <div className="grid h-full place-items-center text-[1.6vw] text-white/80">{COPY.none[locale]}</div>;
  const label = (from: Video['from']) => (from === 'channel' ? COPY.channel[locale] : from === 'shorts' ? COPY.shorts[locale] : COPY.popular[locale]);
  return (
    <div className="flex h-full flex-col px-[4vw] pb-[6vh] pt-[12vh]">
      <p className="mb-4 font-condensed text-[1.1vw] font-bold uppercase tracking-[0.2em] text-gold-light">{COPY.hover[locale]}</p>
      <div className="grid flex-1 auto-rows-fr grid-cols-4 gap-[1.2vw] overflow-hidden">
        {videos.slice(0, 12).map((video, i) => (
          <motion.button
            key={video.id}
            type="button"
            className="inspire-video group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onPointerEnter={() => {
              window.clearTimeout(hover.current);
              hover.current = window.setTimeout(() => setPreview(video.id), 350);
            }}
            onPointerLeave={() => {
              window.clearTimeout(hover.current);
              setPreview((current) => (current === video.id ? null : current));
            }}
            onClick={() => onPlay(video)}
          >
            {preview === video.id ? (
              <iframe
                src={embed(video.id, true)}
                title={video.title}
                className="pointer-events-none absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            ) : (
              <img src={video.thumb} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            )}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-transparent" />
            <span className="pointer-events-none absolute left-3 top-3 badge badge-light">{label(video.from)}</span>
            {preview !== video.id && <HiPlay className="pointer-events-none absolute left-1/2 top-1/2 h-[3vw] w-[3vw] -translate-x-1/2 -translate-y-1/2 text-white/90" />}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-left">
              <span className="line-clamp-2 text-[1vw] font-semibold leading-snug text-white">{video.title}</span>
              {video.views > 0 && <span className="mt-1 block text-[0.8vw] text-white/70">{compact(video.views)} {COPY.views[locale]}{video.channel ? ` · ${video.channel}` : ''}</span>}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

/**
 * The full-screen show for the shop's TV.
 *
 * Over the animated background and its WebGL light: a ring of tours that
 * turns by itself; one tour, in letters big enough to read across the shop;
 * the videos about it, which preview with sound when you point at them; and
 * one video, big. The breadcrumbs at the top always lead back. The music
 * plays throughout, at a fifth of its volume on the video wall, and stops —
 * with its controls — while a video plays.
 */
const InspireOverlay: React.FC = () => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  const youtubeAccount = useSocialAccounts().find((account) => account.platform === 'youtube')?.url ?? '';
  const [config, setConfig] = useState<InspireConfig>(DEFAULT_INSPIRE);
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [view, setView] = useState<View>('carousel');
  const [index, setIndex] = useState(0);
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const lastInput = useRef(Date.now());
  const videoCache = useRef(new Map<number, Video[]>());

  useEffect(() => {
    getInspireConfig().then(setConfig);
    loadTours(locale).then(setAllTours);
  }, [locale]);

  const tours = useMemo(() => {
    if (!config.tourIds.length) return allTours;
    const byId = new Map(allTours.map((tour) => [tour.id, tour]));
    const picked = config.tourIds.map((id) => byId.get(id)).filter(Boolean) as Tour[];
    return picked.length ? picked : allTours;
  }, [allTours, config.tourIds]);
  const tour = tours[index % Math.max(1, tours.length)];

  // The ring turns by itself while nobody is looking at a tour.
  useEffect(() => {
    if (view !== 'carousel' || tours.length < 2) return undefined;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % tours.length), config.slideSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [view, index, tours.length, config.slideSeconds]);

  // Anyone touching the screen keeps the current view; nobody for a while sends it home.
  useEffect(() => {
    const touch = () => {
      lastInput.current = Date.now();
    };
    window.addEventListener('pointermove', touch);
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    const timer = window.setInterval(() => {
      if ((view === 'tour' || view === 'videos') && Date.now() - lastInput.current > IDLE_MS) setView('carousel');
    }, 5000);
    return () => {
      window.removeEventListener('pointermove', touch);
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
      window.clearInterval(timer);
    };
  }, [view]);

  const openVideos = useCallback(() => {
    if (!tour) return;
    setView('videos');
    const cached = videoCache.current.get(tour.id);
    if (cached) {
      setVideos(cached);
      return;
    }
    setVideos(null);
    const params = new URLSearchParams({
      q: `${tour.title} ${config.youtube.searchSuffix}`.trim(),
      channel: config.youtube.channel || youtubeAccount,
      shorts: config.youtube.preferShorts ? '1' : '0',
      max: String(config.youtube.maxResults),
    });
    fetch(`/api/youtube?${params}`)
      .then((response) => response.json())
      .then((data) => {
        const list: Video[] = Array.isArray(data.videos) ? data.videos : [];
        videoCache.current.set(tour.id, list);
        setVideos(list);
      })
      .catch(() => setVideos([]));
  }, [tour, config.youtube, youtubeAccount]);

  // Keys: arrows move, Escape goes one step back.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' && view === 'carousel') setIndex((value) => (value + 1) % Math.max(1, tours.length));
      if (event.key === 'ArrowLeft' && view === 'carousel') setIndex((value) => (value - 1 + tours.length) % Math.max(1, tours.length));
      if (event.key === 'Enter' && view === 'carousel') setView('tour');
      if (event.key === 'Backspace' || (event.key === 'Escape' && document.fullscreenElement)) {
        if (view === 'video') setView('videos');
        else if (view === 'videos') setView('tour');
        else if (view === 'tour') setView('carousel');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, tours.length]);

  const headline = config.headline[locale] || config.headline.en || '';
  const crumbs: Array<{ label: string; view: View }> = [{ label: COPY.showcase[locale], view: 'carousel' }];
  if (view !== 'carousel' && tour) crumbs.push({ label: tour.title, view: 'tour' });
  if ((view === 'videos' || view === 'video') && tour) crumbs.push({ label: COPY.videos[locale], view: 'videos' });
  if (view === 'video' && video) crumbs.push({ label: video.title, view: 'video' });

  return (
    <motion.div
      className="fixed inset-0 z-[200] select-none overflow-hidden bg-ink text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      role="dialog"
      aria-modal="true"
      aria-label="Inspire me"
    >
      {/* The animated background, its poster underneath until it arrives. */}
      <div className="absolute inset-0" aria-hidden="true">
        <img src={config.backgroundPoster} alt="" className="inspire-bg absolute inset-0 h-full w-full object-cover" />
        {config.background && (
          <img
            src={config.background}
            alt=""
            onLoad={() => setBackgroundReady(true)}
            className={`inspire-bg absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ${backgroundReady ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>
      <InspireEffects effect={config.effect} intensity={config.effectIntensity} />
      <div
        className={`pointer-events-none absolute inset-0 transition-colors duration-700 ${view === 'carousel' ? 'bg-ink/35' : 'bg-ink/70'}`}
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 40%, transparent 35%, rgb(20 22 26 / 0.75) 100%)' }}
      />

      {/* Breadcrumbs, always; and the switch that closes the show. */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-[3vw] py-[2.4vh]">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 font-condensed text-[1.15vw] font-bold uppercase tracking-[0.16em]">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <React.Fragment key={crumb.view}>
                {i > 0 && <HiChevronRight className="h-[1.2vw] w-[1.2vw] shrink-0 text-gold" />}
                <button
                  type="button"
                  onClick={() => {
                    if (crumb.view === 'videos') openVideos();
                    else setView(crumb.view);
                  }}
                  disabled={last}
                  className={`truncate rounded-[3px] px-2 py-1 transition ${last ? 'max-w-[34vw] text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
        <InspireToggle />
      </div>

      <LayoutGroup>
        <div className="relative z-10 h-full">
          {tours.length > 0 && view === 'carousel' && (
            <Carousel
              tours={tours}
              index={index % tours.length}
              setIndex={setIndex}
              onOpen={(i) => {
                setIndex(i);
                setView('tour');
              }}
              seconds={config.slideSeconds}
              headline={headline}
              locale={locale}
            />
          )}
          {tour && view === 'tour' && <TourStage tour={tour} locale={locale} phone={brandSettings.phoneNumber} onVideos={openVideos} />}
          {view === 'videos' && (
            <VideoWall
              videos={videos}
              locale={locale}
              onPlay={(picked) => {
                setVideo(picked);
                setView('video');
              }}
            />
          )}
          {view === 'video' && video && (
            <div className="flex h-full items-center justify-center px-[4vw] pb-[5vh] pt-[11vh]">
              <div className={`overflow-hidden rounded-[10px] bg-black shadow-ink-xl ${video.short ? 'aspect-[9/16] h-full' : 'aspect-video w-full max-w-[86vw] max-h-full'}`}>
                <iframe src={embed(video.id, false)} title={video.title} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              </div>
            </div>
          )}
        </div>
      </LayoutGroup>

      <div className="absolute bottom-[2.4vh] left-[3vw] z-30">
        <InspireMusic tracks={config.tracks} volume={config.volume} duck={view === 'videos' ? config.duckLevel : 1} suspended={view === 'video'} />
      </div>
    </motion.div>
  );
};

export default InspireOverlay;
