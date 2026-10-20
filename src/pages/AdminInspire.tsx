import React, { useEffect, useState } from 'react';
import { HiArrowDown, HiArrowUp, HiMusicNote, HiPlus, HiTrash, HiUpload } from 'react-icons/hi';
import { useI18n, type Locale } from '../contexts/I18nContext';
import { adminLang } from '../lib/adminNav';
import {
  DEFAULT_INSPIRE,
  getInspireConfig,
  INSPIRE_TRANSITIONS,
  InspireConfig,
  InspireEffect,
  InspireQuality,
  InspireTransition,
  saveInspireConfig,
  VisualizerPosition,
  VisualizerStyle,
} from '../edt/inspireConfig';
import InspireSlideshow from '../components/edt/inspire/InspireSlideshow';
import { adminText, uploadAdminFile } from '../edt/adminUpload';
import { getTours, Tour } from '../services/toursService';
import { getAdminPassword } from '../services/authStore';
import { useInspire } from '../components/edt/inspire/InspireContext';

const LANGS: Locale[] = ['en', 'es', 'fr', 'de'];
const EFFECTS: InspireEffect[] = ['caustics', 'sunglow', 'bokeh', 'none'];

const TRANSITION_NAMES: Record<InspireTransition, { en: string; es: string }> = {
  kenburns: { en: 'Ken Burns (dissolve and slow drift)', es: 'Ken Burns (fundido y deriva lenta)' },
  dissolve: { en: 'Cross-dissolve', es: 'Fundido encadenado' },
  push: { en: 'Push', es: 'Empujar' },
  cover: { en: 'Slide over', es: 'Deslizar encima' },
  zoom: { en: 'Zoom', es: 'Zoom' },
  wipe: { en: 'Wipe', es: 'Barrido' },
  iris: { en: 'Iris (circle)', es: 'Iris (círculo)' },
  cube: { en: 'Cube', es: 'Cubo' },
  flip: { en: 'Flip', es: 'Voltear' },
  random: { en: 'A different one each time', es: 'Una distinta cada vez' },
};

/** A small live preview of the chosen transition, on the show's own stills. */
const TransitionPreview: React.FC<{ config: InspireConfig }> = ({ config }) => {
  const slides = config.backgroundSlides.length ? config.backgroundSlides.slice(0, 4) : DEFAULT_INSPIRE.backgroundSlides.slice(0, 4);
  const [index, setIndex] = useState(0);
  const hold = 1.4;
  useEffect(() => {
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % slides.length), (hold + config.transitionSeconds) * 1000);
    return () => window.clearTimeout(timer);
  }, [index, slides.length, config.transitionSeconds]);
  return (
    <div className="relative aspect-video overflow-hidden rounded-md bg-ink">
      <InspireSlideshow
        slides={slides}
        index={index}
        transition={config.transition}
        transitionSeconds={config.transitionSeconds}
        holdSeconds={hold}
        drift
      />
    </div>
  );
};

/**
 * Admin → Inspire: everything about the full-screen show for the shop's TV.
 * The background and its light effect, how long each tour holds the stage
 * and which tours are in it, the music queue and its volume, and where the
 * videos come from.
 */
const AdminInspire: React.FC = () => {
  const { locale } = useI18n();
  const lang = adminLang(locale);
  const say = (text: { en: string; es: string }) => adminText(lang, text);
  const { toggle } = useInspire();
  const [config, setConfig] = useState<InspireConfig | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    getInspireConfig(true)
      .then(setConfig)
      .catch(() => setConfig(DEFAULT_INSPIRE));
    getTours('en').then(setTours).catch(() => setTours([]));
    fetch('/api/youtube?status=1')
      .then((response) => response.json())
      .then((data) => setHasKey(Boolean(data.hasKey)))
      .catch(() => setHasKey(null));
  }, []);

  if (!config) return <div className="min-h-screen bg-paper-warm p-10 text-ink-soft">…</div>;

  const set = (patch: Partial<InspireConfig>) => setConfig({ ...config, ...patch });
  const field = 'w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm';
  const card = 'rounded-xl bg-white p-6 shadow-ink-sm ring-1 ring-ink/10';
  const fail = (error: unknown) => setStatus({ tone: 'bad', text: error instanceof Error ? error.message : String(error) });

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await saveInspireConfig(config);
      setStatus({ tone: 'ok', text: say({ en: 'Saved. The next show opens with it.', es: 'Guardado. El próximo show lo usa.' }) });
    } catch (error) {
      fail(error);
    } finally {
      setSaving(false);
    }
  };

  const saveKey = async () => {
    setBusy('key');
    try {
      const response = await fetch('/api/youtube', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': getAdminPassword() ?? '' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || response.statusText);
      setHasKey(Boolean(data.hasKey));
      setApiKey('');
      setStatus({ tone: 'ok', text: say({ en: 'YouTube key saved.', es: 'Clave de YouTube guardada.' }) });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File, folder: string, done: (url: string) => void, tag: string) => {
    setBusy(tag);
    try {
      done(await uploadAdminFile(file, folder));
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const moveTrack = (index: number, delta: number) => {
    const tracks = [...config.tracks];
    const target = index + delta;
    if (target < 0 || target >= tracks.length) return;
    [tracks[index], tracks[target]] = [tracks[target], tracks[index]];
    set({ tracks });
  };

  const toggleTour = (id: number) =>
    set({ tourIds: config.tourIds.includes(id) ? config.tourIds.filter((value) => value !== id) : [...config.tourIds, id] });

  return (
    <div className="min-h-screen bg-paper-warm py-6">
      <div className="container mx-auto max-w-5xl space-y-6 px-4">
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl uppercase">{say({ en: 'Inspire me · the TV show', es: 'Inspírame · el show para la TV' })}</h1>
              <p className="mt-2 max-w-2xl text-sm text-ink-soft">
                {say({
                  en: 'The full-screen presentation behind the “Inspire me” switch on the home page, made for the TV in the shop.',
                  es: 'La presentación a pantalla completa detrás del botón “Inspírame” de la portada, pensada para la TV de la tienda.',
                })}
              </p>
            </div>
            <button type="button" onClick={toggle} className="rounded-md bg-mango px-4 py-2.5 text-sm font-semibold text-ink">
              {say({ en: 'Open the show', es: 'Abrir el show' })}
            </button>
          </div>
          <label className="mt-5 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={config.enabled} onChange={(event) => set({ enabled: event.target.checked })} />
            {say({ en: 'Show the “Inspire me” switch on the site', es: 'Mostrar el botón “Inspírame” en la web' })}
          </label>
        </div>

        {/* Background and light */}
        <div className={card}>
          <h2 className="font-display text-xl uppercase">{say({ en: 'Background & effect', es: 'Fondo y efecto' })}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[14rem,1fr]">
            <div className="aspect-video overflow-hidden rounded-md bg-ink">
              {config.background && <img src={config.background} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-ink-soft">
                {say({ en: 'Animated WebP (or any image) URL', es: 'URL del WebP animado (o cualquier imagen)' })}
                <input className={field} value={config.background} onChange={(event) => set({ background: event.target.value })} />
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-ink px-3 py-2 text-xs font-semibold text-paper">
                <HiUpload /> {busy === 'bg' ? '…' : say({ en: 'Upload background', es: 'Subir fondo' })}
                <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], 'inspire', (url) => set({ background: url }), 'bg')} />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-ink-soft">
                  {say({ en: 'Light effect', es: 'Efecto de luz' })}
                  <select className={field} value={config.effect} onChange={(event) => set({ effect: event.target.value as InspireEffect })}>
                    {EFFECTS.map((effect) => (
                      <option key={effect} value={effect}>{effect}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-soft">
                  {say({ en: 'Intensity', es: 'Intensidad' })} · {Math.round(config.effectIntensity * 100)}%
                  <input type="range" min={0} max={1} step={0.05} value={config.effectIntensity} onChange={(event) => set({ effectIntensity: Number(event.target.value) })} className="mt-2 w-full" />
                </label>
                <label className="text-xs font-semibold text-ink-soft">
                  {say({ en: 'Seconds per tour', es: 'Segundos por tour' })}
                  <input type="number" min={3} max={60} className={field} value={config.slideSeconds} onChange={(event) => set({ slideSeconds: Number(event.target.value) })} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {LANGS.map((code) => (
                  <label key={code} className="text-xs font-semibold text-ink-soft">
                    {say({ en: 'Headline', es: 'Titular' })} · {code.toUpperCase()}
                    <input className={field} value={config.headline[code] ?? ''} onChange={(event) => set({ headline: { ...config.headline, [code]: event.target.value } })} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slideshow and transitions */}
        <div className={card}>
          <h2 className="font-display text-xl uppercase">{say({ en: 'Background slideshow & transitions', es: 'Fondo en diapositivas y transiciones' })}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            {say({
              en: 'The stills behind the show, one after another, and how each picture gives way to the next — the same transition is used for a tour’s photos. With stills here, they replace the animated background above.',
              es: 'Las fotos detrás del show, una tras otra, y cómo cada imagen da paso a la siguiente — la misma transición se usa en las fotos de cada tour. Si hay fotos aquí, sustituyen al fondo animado de arriba.',
            })}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-[18rem,1fr]">
            <TransitionPreview config={config} />
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-ink-soft sm:col-span-3">
                  {say({ en: 'Transition', es: 'Transición' })}
                  <select className={field} value={config.transition} onChange={(event) => set({ transition: event.target.value as InspireTransition })}>
                    {INSPIRE_TRANSITIONS.map((name) => (
                      <option key={name} value={name}>{say(TRANSITION_NAMES[name])}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-soft">
                  {say({ en: 'Seconds per picture', es: 'Segundos por imagen' })}
                  <input type="number" min={3} max={60} className={field} value={config.backgroundSeconds} onChange={(event) => set({ backgroundSeconds: Number(event.target.value) })} />
                </label>
                <label className="text-xs font-semibold text-ink-soft">
                  {say({ en: 'Transition length (s)', es: 'Duración de la transición (s)' })}
                  <input type="number" min={0.3} max={5} step={0.1} className={field} value={config.transitionSeconds} onChange={(event) => set({ transitionSeconds: Number(event.target.value) })} />
                </label>
                <label className="text-xs font-semibold text-ink-soft">
                  {say({ en: 'Quality on this TV', es: 'Calidad en esta TV' })}
                  <select className={field} value={config.quality} onChange={(event) => set({ quality: event.target.value as InspireQuality })}>
                    <option value="auto">{say({ en: 'Automatic (steps down if the TV struggles)', es: 'Automática (baja sola si la TV no puede)' })}</option>
                    <option value="high">{say({ en: 'Full', es: 'Completa' })}</option>
                    <option value="balanced">{say({ en: 'Balanced (softer light effect)', es: 'Equilibrada (efecto de luz más suave)' })}</option>
                    <option value="lite">{say({ en: 'Light (no light effect, no drift)', es: 'Ligera (sin efecto de luz ni deriva)' })}</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-ink-soft">
                {say({ en: 'Stills, one URL per line (empty: use the animated background)', es: 'Fotos, una URL por línea (vacío: usar el fondo animado)' })}
                <textarea
                  rows={4}
                  className={`${field} font-mono text-xs`}
                  value={config.backgroundSlides.join('\n')}
                  onChange={(event) => set({ backgroundSlides: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-ink px-3 py-2 text-xs font-semibold text-paper">
                  <HiUpload /> {busy === 'slide' ? '…' : say({ en: 'Add a still', es: 'Añadir una foto' })}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      event.target.files?.[0] &&
                      upload(event.target.files[0], 'inspire', (url) => set({ backgroundSlides: [...config.backgroundSlides, url] }), 'slide')
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                  <input type="checkbox" checked={config.cloudinaryAiUpscale} onChange={(event) => set({ cloudinaryAiUpscale: event.target.checked })} />
                  {say({
                    en: 'AI upscaling for uploaded photos on the TV (Cloudinary e_upscale, uses credits)',
                    es: 'Escalado con IA para fotos subidas en la TV (Cloudinary e_upscale, consume créditos)',
                  })}
                </label>
              </div>
              <p className="text-xs text-ink-light">
                {say({
                  en: 'On a big screen, the site’s own photos are shown from upscaled, sharpened copies (-uhd), and uploaded ones are scaled and sharpened by Cloudinary.',
                  es: 'En una pantalla grande, las fotos propias del sitio se muestran desde copias ampliadas y enfocadas (-uhd), y las subidas las amplía y enfoca Cloudinary.',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Visualizer */}
        <div className={card}>
          <h2 className="font-display text-xl uppercase">{say({ en: 'Music visualizer', es: 'Visualizador de música' })}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            {say({
              en: 'The music, drawn over the background while it plays. It can be switched on and off from the music player in the show; this is how it starts and how it looks. Songs uploaded here can be drawn; a song linked from another site may not allow it, and plays without.',
              es: 'La música, dibujada sobre el fondo mientras suena. Se enciende y apaga desde el reproductor del show; aquí decides cómo empieza y cómo se ve. Las canciones subidas aquí se pueden dibujar; una enlazada desde otro sitio puede no permitirlo, y suena sin él.',
            })}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-3 lg:col-span-6">
              <input type="checkbox" checked={config.visualizer.enabled} onChange={(event) => set({ visualizer: { ...config.visualizer, enabled: event.target.checked } })} />
              {say({ en: 'On when the show starts', es: 'Encendido al empezar el show' })}
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Style', es: 'Estilo' })}
              <select className={field} value={config.visualizer.style} onChange={(event) => set({ visualizer: { ...config.visualizer, style: event.target.value as VisualizerStyle } })}>
                <option value="bars">{say({ en: 'Spectrum bars', es: 'Barras de espectro' })}</option>
                <option value="mirror">{say({ en: 'Mirrored bars', es: 'Barras en espejo' })}</option>
                <option value="wave">{say({ en: 'Waveform', es: 'Forma de onda' })}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Position', es: 'Posición' })}
              <select className={field} value={config.visualizer.position} onChange={(event) => set({ visualizer: { ...config.visualizer, position: event.target.value as VisualizerPosition } })}>
                <option value="bottom">{say({ en: 'Bottom', es: 'Abajo' })}</option>
                <option value="middle">{say({ en: 'Middle', es: 'Centro' })}</option>
                <option value="top">{say({ en: 'Top', es: 'Arriba' })}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Opacity', es: 'Opacidad' })} · {Math.round(config.visualizer.opacity * 100)}%
              <input type="range" min={0.05} max={1} step={0.05} value={config.visualizer.opacity} onChange={(event) => set({ visualizer: { ...config.visualizer, opacity: Number(event.target.value) } })} className="mt-2 w-full" />
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Height', es: 'Altura' })} · {Math.round(config.visualizer.height * 100)}%
              <input type="range" min={0.08} max={0.5} step={0.02} value={config.visualizer.height} onChange={(event) => set({ visualizer: { ...config.visualizer, height: Number(event.target.value) } })} className="mt-2 w-full" />
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Colour, bottom', es: 'Color, abajo' })}
              <input type="color" className="mt-1 block h-9 w-full cursor-pointer rounded-md" value={config.visualizer.colorFrom} onChange={(event) => set({ visualizer: { ...config.visualizer, colorFrom: event.target.value } })} />
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Colour, top', es: 'Color, arriba' })}
              <input type="color" className="mt-1 block h-9 w-full cursor-pointer rounded-md" value={config.visualizer.colorTo} onChange={(event) => set({ visualizer: { ...config.visualizer, colorTo: event.target.value } })} />
            </label>
          </div>
          <button
            type="button"
            onClick={() => set({ visualizer: DEFAULT_INSPIRE.visualizer })}
            className="mt-3 text-xs font-semibold text-ink-soft underline underline-offset-2"
          >
            {say({ en: 'Back to the brand’s amber and gold', es: 'Volver al ámbar y oro de la marca' })}
          </button>
        </div>

        {/* Tours */}
        <div className={card}>
          <h2 className="font-display text-xl uppercase">{say({ en: 'Tours in the show', es: 'Tours en el show' })}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {say({ en: 'Tick the tours to show, in the order you tick them. None ticked shows them all.', es: 'Marca los tours a mostrar, en el orden en que los marques. Si no marcas ninguno se muestran todos.' })}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => {
              const position = config.tourIds.indexOf(tour.id);
              return (
                <label key={tour.id} className={`flex items-center gap-3 rounded-md p-2 ring-1 ${position >= 0 ? 'bg-mango-light/40 ring-mango' : 'ring-ink/10'}`}>
                  <input type="checkbox" checked={position >= 0} onChange={() => toggleTour(tour.id)} />
                  <img src={tour.image} alt="" className="h-10 w-14 rounded object-cover" />
                  <span className="flex-1 text-sm font-semibold">{tour.title}</span>
                  {position >= 0 && <span className="text-xs font-bold text-mango-dark">#{position + 1}</span>}
                </label>
              );
            })}
          </div>
        </div>

        {/* Music */}
        <div className={card}>
          <h2 className="font-display text-xl uppercase">{say({ en: 'Music', es: 'Música' })}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {say({ en: 'Plays in this order, over and over. Upload MP3 / M4A / OGG files, or paste links.', es: 'Suena en este orden, una y otra vez. Sube archivos MP3 / M4A / OGG o pega enlaces.' })}
          </p>
          <div className="mt-4 space-y-2">
            {config.tracks.map((track, index) => (
              <div key={track.id} className="flex flex-wrap items-center gap-2 rounded-md p-2 ring-1 ring-ink/10">
                <HiMusicNote className="text-gold-dark" />
                <input className={`${field} max-w-[14rem]`} value={track.title} placeholder={say({ en: 'Title', es: 'Título' })} onChange={(event) => set({ tracks: config.tracks.map((t, i) => (i === index ? { ...t, title: event.target.value } : t)) })} />
                <input className={`${field} flex-1`} value={track.url} placeholder="https://…" onChange={(event) => set({ tracks: config.tracks.map((t, i) => (i === index ? { ...t, url: event.target.value } : t)) })} />
                <button type="button" onClick={() => moveTrack(index, -1)} className="rounded-md p-2 ring-1 ring-ink/15" aria-label="Up"><HiArrowUp /></button>
                <button type="button" onClick={() => moveTrack(index, 1)} className="rounded-md p-2 ring-1 ring-ink/15" aria-label="Down"><HiArrowDown /></button>
                <button type="button" onClick={() => window.confirm(say({ en: `Remove “${track.title || track.url}” from the queue?`, es: `¿Quitar «${track.title || track.url}» de la lista?` })) && set({ tracks: config.tracks.filter((_, i) => i !== index) })} className="rounded-md p-2 text-hibiscus-dark ring-1 ring-hibiscus/40" aria-label="Delete"><HiTrash /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-ink px-3 py-2 text-xs font-semibold text-paper">
              <HiUpload /> {busy === 'track' ? '…' : say({ en: 'Upload songs', es: 'Subir canciones' })}
              <input
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={async (event) => {
                  const files = Array.from(event.target.files ?? []);
                  const added: InspireConfig['tracks'] = [];
                  setBusy('track');
                  for (const file of files) {
                    try {
                      const url = await uploadAdminFile(file, 'inspire-music');
                      added.push({ id: `track-${Date.now().toString(36)}-${added.length}`, title: file.name.replace(/\.[^.]+$/, ''), url });
                    } catch (error) {
                      fail(error);
                    }
                  }
                  setBusy(null);
                  setConfig((current) => (current ? { ...current, tracks: [...current.tracks, ...added] } : current));
                }}
              />
            </label>
            <button type="button" onClick={() => set({ tracks: [...config.tracks, { id: `track-${Date.now().toString(36)}`, title: '', url: '' }] })} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ring-1 ring-ink/15">
              <HiPlus /> {say({ en: 'Add a link', es: 'Añadir enlace' })}
            </button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Start volume', es: 'Volumen inicial' })} · {Math.round(config.volume * 100)}%
              <input type="range" min={0} max={1} step={0.1} value={config.volume} onChange={(event) => set({ volume: Number(event.target.value) })} className="mt-2 w-full" />
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Music level on the video screen', es: 'Volumen de la música en la pantalla de videos' })} · {Math.round(config.duckLevel * 100)}%
              <input type="range" min={0} max={1} step={0.05} value={config.duckLevel} onChange={(event) => set({ duckLevel: Number(event.target.value) })} className="mt-2 w-full" />
            </label>
          </div>
        </div>

        {/* YouTube */}
        <div className={card}>
          <h2 className="font-display text-xl uppercase">YouTube</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {say({
              en: 'Each tour shows videos about it: your channel’s most-watched first, then Shorts, then the most popular from anyone. Leave the channel empty to use the YouTube account in Social.',
              es: 'Cada tour muestra videos sobre él: primero los más vistos de tu canal, luego Shorts y después los más populares de cualquiera. Deja el canal vacío para usar la cuenta de YouTube de Redes.',
            })}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Channel (@handle, URL or ID)', es: 'Canal (@usuario, URL o ID)' })}
              <input className={field} value={config.youtube.channel} placeholder="@exclusivedominicantours" onChange={(event) => set({ youtube: { ...config.youtube, channel: event.target.value } })} />
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Words added to every search', es: 'Palabras añadidas a cada búsqueda' })}
              <input className={field} value={config.youtube.searchSuffix} onChange={(event) => set({ youtube: { ...config.youtube, searchSuffix: event.target.value } })} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={config.youtube.preferShorts} onChange={(event) => set({ youtube: { ...config.youtube, preferShorts: event.target.checked } })} />
              {say({ en: 'Prefer Shorts', es: 'Preferir Shorts' })}
            </label>
            <label className="text-xs font-semibold text-ink-soft">
              {say({ en: 'Videos per tour', es: 'Videos por tour' })}
              <input type="number" min={3} max={30} className={field} value={config.youtube.maxResults} onChange={(event) => set({ youtube: { ...config.youtube, maxResults: Number(event.target.value) } })} />
            </label>
          </div>
          <div className="mt-5 rounded-md bg-paper p-4">
            <p className="text-sm font-semibold">
              {say({ en: 'YouTube Data API key (optional)', es: 'Clave de la API de YouTube (opcional)' })}{' '}
              <span className={hasKey ? 'text-jungle-dark' : 'text-ink-light'}>
                {hasKey === null ? '' : hasKey ? say({ en: '· saved', es: '· guardada' }) : say({ en: '· not set — public search pages are used', es: '· sin clave — se usan las páginas públicas' })}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input type="password" autoComplete="off" className={`${field} max-w-md`} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="AIza…" />
              <button type="button" onClick={saveKey} disabled={busy === 'key'} className="rounded-md bg-ink px-4 py-2 text-xs font-semibold text-paper">
                {apiKey ? say({ en: 'Save key', es: 'Guardar clave' }) : say({ en: 'Remove key', es: 'Quitar clave' })}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-light">{say({ en: 'Kept on the server only; never shown again here.', es: 'Se guarda solo en el servidor; no vuelve a mostrarse aquí.' })}</p>
          </div>
        </div>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-ink-lg ring-1 ring-ink/10">
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">
            {saving ? '…' : say({ en: 'Save', es: 'Guardar' })}
          </button>
          {status && <span className={`text-sm font-semibold ${status.tone === 'ok' ? 'text-jungle-dark' : 'text-hibiscus-dark'}`}>{status.text}</span>}
        </div>
      </div>
    </div>
  );
};

export default AdminInspire;
