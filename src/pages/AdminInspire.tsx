import React, { useEffect, useState } from 'react';
import { HiArrowDown, HiArrowUp, HiMusicNote, HiPlus, HiTrash, HiUpload } from 'react-icons/hi';
import { useI18n, type Locale } from '../contexts/I18nContext';
import { adminLang } from '../lib/adminNav';
import { DEFAULT_INSPIRE, getInspireConfig, InspireConfig, InspireEffect, saveInspireConfig } from '../edt/inspireConfig';
import { adminText, uploadAdminFile } from '../edt/adminUpload';
import { getTours, Tour } from '../services/toursService';
import { getAdminPassword } from '../services/authStore';
import { useInspire } from '../components/edt/inspire/InspireContext';

const LANGS: Locale[] = ['en', 'es', 'fr', 'de'];
const EFFECTS: InspireEffect[] = ['caustics', 'sunglow', 'bokeh', 'none'];

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
                <button type="button" onClick={() => set({ tracks: config.tracks.filter((_, i) => i !== index) })} className="rounded-md p-2 text-hibiscus-dark ring-1 ring-hibiscus/40" aria-label="Delete"><HiTrash /></button>
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
