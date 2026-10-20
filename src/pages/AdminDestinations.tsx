import React, { useEffect, useState } from 'react';
import { HiArrowDown, HiArrowUp, HiPlus, HiTrash, HiUpload } from 'react-icons/hi';
import { useI18n, type Locale } from '../contexts/I18nContext';
import { adminLang } from '../lib/adminNav';
import { DEFAULT_DESTINATIONS, DestinationItem, DestinationsConfig, getDestinations, saveDestinations } from '../edt/destinations';
import { adminText, uploadAdminFile } from '../edt/adminUpload';
import { smallImage } from '../edt/useTours';

const LANGS: Locale[] = ['en', 'es', 'fr', 'de'];

const blank = (index: number): DestinationItem => ({
  id: `destination-${Date.now().toString(36)}-${index}`,
  name: '',
  image: '',
  tag: '',
  caption: {},
  enabled: true,
});

/**
 * Admin → Destinations: the "top destinations" reel at the head of the tours
 * page. Every card: a name, a photograph, what it filters the catalogue by,
 * a caption in each language, on or off, and its place in the reel.
 */
const AdminDestinations: React.FC = () => {
  const { locale } = useI18n();
  const lang = adminLang(locale);
  const say = (text: { en: string; es: string }) => adminText(lang, text);
  const [config, setConfig] = useState<DestinationsConfig | null>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    getDestinations(true)
      .then(setConfig)
      .catch((error) => {
        setConfig(DEFAULT_DESTINATIONS);
        setStatus({ tone: 'bad', text: `${say({ en: 'Could not load the saved list', es: 'No se pudo cargar la lista guardada' })}: ${error.message}` });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!config) return <div className="min-h-screen bg-paper-warm p-10 text-ink-soft">…</div>;

  const update = (index: number, patch: Partial<DestinationItem>) =>
    setConfig({ ...config, items: config.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const move = (index: number, delta: number) => {
    const items = [...config.items];
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    setConfig({ ...config, items });
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const cleaned = { ...config, items: config.items.filter((item) => item.name.trim() || item.image.trim()) };
      await saveDestinations(cleaned);
      setConfig(cleaned);
      setStatus({ tone: 'ok', text: say({ en: 'Saved. The tours page shows it now.', es: 'Guardado. La página de tours ya lo muestra.' }) });
    } catch (error) {
      setStatus({ tone: 'bad', text: `${say({ en: 'Not saved', es: 'No se guardó' })}: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (index: number, file: File) => {
    const id = config.items[index].id;
    setUploading(id);
    try {
      update(index, { image: await uploadAdminFile(file, 'destinations') });
    } catch (error) {
      setStatus({ tone: 'bad', text: `${say({ en: 'Upload failed', es: 'Falló la subida' })}: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setUploading(null);
    }
  };

  const field = 'w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm';

  return (
    <div className="min-h-screen bg-paper-warm py-6">
      <div className="container mx-auto max-w-5xl space-y-6 px-4">
        <div className="rounded-xl bg-white p-6 shadow-ink-sm ring-1 ring-ink/10">
          <h1 className="font-display text-3xl uppercase">{say({ en: 'Top destinations', es: 'Destinos top' })}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {say({
              en: 'The auto-scrolling reel at the top of the tours page. A click on a card filters the tours by its “filter” word — a departure point such as Bayahíbe, or any word in the tours.',
              es: 'La galería que se desplaza sola arriba en la página de tours. Al hacer clic en una tarjeta se filtran los tours por su palabra de “filtro”: un punto de salida como Bayahíbe o cualquier palabra de los tours.',
            })}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={config.enabled} onChange={(event) => setConfig({ ...config, enabled: event.target.checked })} />
              {say({ en: 'Show the reel', es: 'Mostrar la galería' })}
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              {say({ en: 'Speed', es: 'Velocidad' })}
              <input type="range" min={0} max={120} step={2} value={config.speed} onChange={(event) => setConfig({ ...config, speed: Number(event.target.value) })} />
              <span className="w-14 text-ink-soft">{config.speed} px/s</span>
            </label>
          </div>
        </div>

        {config.items.map((item, index) => (
          <div key={item.id} className="grid gap-5 rounded-xl bg-white p-5 shadow-ink-sm ring-1 ring-ink/10 md:grid-cols-[12rem,1fr]">
            <div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-paper-deep">
                {item.image && <img src={smallImage(item.image)} alt="" className="h-full w-full object-cover" />}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-3 font-display text-xl uppercase text-white">{item.name}</span>
              </div>
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-xs font-semibold text-paper">
                <HiUpload /> {uploading === item.id ? '…' : say({ en: 'Upload photo', es: 'Subir foto' })}
                <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && upload(index, event.target.files[0])} />
              </label>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-ink-soft">
                  {say({ en: 'Name', es: 'Nombre' })}
                  <input className={field} value={item.name} onChange={(event) => update(index, { name: event.target.value })} />
                </label>
                <label className="text-xs font-semibold text-ink-soft">
                  {say({ en: 'Filter (place or word)', es: 'Filtro (lugar o palabra)' })}
                  <input className={field} value={item.tag} onChange={(event) => update(index, { tag: event.target.value })} placeholder={item.name} />
                </label>
              </div>
              <label className="block text-xs font-semibold text-ink-soft">
                {say({ en: 'Photo URL', es: 'URL de la foto' })}
                <input className={field} value={item.image} onChange={(event) => update(index, { image: event.target.value })} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {LANGS.map((code) => (
                  <label key={code} className="text-xs font-semibold text-ink-soft">
                    {say({ en: 'Caption', es: 'Texto' })} · {code.toUpperCase()}
                    <input className={field} value={item.caption[code] ?? ''} onChange={(event) => update(index, { caption: { ...item.caption, [code]: event.target.value } })} />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <label className="mr-auto flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={item.enabled} onChange={(event) => update(index, { enabled: event.target.checked })} />
                  {say({ en: 'Visible', es: 'Visible' })}
                </label>
                <button type="button" onClick={() => move(index, -1)} className="rounded-md p-2 ring-1 ring-ink/15" aria-label="Up"><HiArrowUp /></button>
                <button type="button" onClick={() => move(index, 1)} className="rounded-md p-2 ring-1 ring-ink/15" aria-label="Down"><HiArrowDown /></button>
                <button type="button" onClick={() => setConfig({ ...config, items: config.items.filter((_, i) => i !== index) })} className="rounded-md p-2 text-hibiscus-dark ring-1 ring-hibiscus/40" aria-label="Delete"><HiTrash /></button>
              </div>
            </div>
          </div>
        ))}

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 shadow-ink-lg ring-1 ring-ink/10">
          <button type="button" onClick={() => setConfig({ ...config, items: [...config.items, blank(config.items.length)] })} className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold ring-1 ring-ink/15">
            <HiPlus /> {say({ en: 'Add destination', es: 'Añadir destino' })}
          </button>
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">
            {saving ? '…' : say({ en: 'Save', es: 'Guardar' })}
          </button>
          {status && <span className={`text-sm font-semibold ${status.tone === 'ok' ? 'text-jungle-dark' : 'text-hibiscus-dark'}`}>{status.text}</span>}
        </div>
      </div>
    </div>
  );
};

export default AdminDestinations;
