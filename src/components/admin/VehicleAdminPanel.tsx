import React, { useEffect, useRef, useState } from 'react';
import {
  getTransferConfig,
  saveTransferConfig,
  uploadVehicleImage,
  vehicleText,
} from '../../services/transferConfigService';
import { getTransportServices, saveTransportServices, Tour } from '../../services/toursService';
import type { TransferConfig, VehicleType } from '../../types/transport';
import { useI18n, SUPPORTED_LOCALES } from '../../contexts/I18nContext';
import TranslateBar from './TranslateBar';
import { useTranslationSync } from './useTranslationSync';
import { Lang, ListSyncOptions, describeSync, syncList, syncRecord } from '../../lib/autoTranslate';
import MarkdownEditor from '../ui/MarkdownEditor';
import { confirmAndTrash } from '../../lib/trash';

/**
 * The fleet, in one place.
 *
 * A vehicle used to be edited twice: here, for the price calculator on the
 * transfers page (name, passengers, multipliers, one photo), and again in a
 * tours-style "Transporte" list further down, for its public page (title,
 * price, long description, photos). Now one card holds both: the vehicle as
 * the calculator sees it, and — under "Página pública" — the page the home
 * page's reel and /details/transport/… show, linked by `serviceId`.
 *
 * The photos belong to both: the first is the vehicle's picture in the
 * calculator and the page's cover, all of them are the page's carousel.
 * "Añadir fotos" takes several files at once. Uploads happen immediately (an
 * upload has to return a URL before there is anything to put in the draft);
 * everything else is a draft written by one "Guardar".
 *
 * Name and description are kept per language for the calculator, and the
 * public page per language like any catalogue entry. Saving carries changes
 * into the other languages: the calculator copy of the vehicles whose text
 * changed, and the public page through the same list sync the tours use —
 * photos and prices copied, text translated, deletions carried.
 */

type VehicleCopy = { label: string; description: string };

/** A vehicle with its public page, as one editable card. */
interface FleetEntry {
  vehicle: VehicleType;
  page: Tour;
}

const sameCopy = (a: VehicleCopy, b: VehicleCopy) => a.label === b.label && a.description === b.description;

/** The catalogue's languages are paired by position, as the tours are. */
const PAIRING: ListSyncOptions<Tour> = { keyOf: (service) => String(service.id), match: 'position' };

const BLANK_VEHICLE: VehicleType = {
  key: '',
  label: '',
  multiplier: 1,
  pricePerKmMultiplier: 1,
  maxPassengers: 4,
  typicalPassengers: [1, 4],
  description: '',
  image: '',
};

const blankPage = (id: number): Tour => ({
  id,
  image: '',
  title: '',
  description: '',
  price: '',
  pricingOptions: [{ tier: 'People', price: '', amount: null }],
  details: { description: '', images: [] },
});

const toKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const photosOf = (entry: FleetEntry): string[] => {
  const list = entry.page.details.images.filter(Boolean);
  if (list.length) return list;
  return [entry.page.image || entry.vehicle.image || ''].filter(Boolean);
};

const priceAmount = (price: string): number | null => {
  const value = Number(String(price).replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
};

/** Pair each vehicle with its page: by `serviceId`, else by position, else a new page. */
const pairFleet = (vehicles: VehicleType[], services: Tour[]): { entries: FleetEntry[]; unpaired: Tour[] } => {
  const used = new Set<number>();
  let nextId = Math.max(0, ...services.map((service) => service.id)) + 1;
  const entries = vehicles.map((vehicle, index) => {
    let page = vehicle.serviceId !== undefined ? services.find((service) => service.id === vehicle.serviceId) : undefined;
    if (!page && services[index] && !vehicles.some((other) => other.serviceId === services[index].id)) page = services[index];
    if (page && used.has(page.id)) page = undefined;
    if (page) used.add(page.id);
    const resolved = page
      ? { ...page, details: { ...page.details, images: [...page.details.images] } }
      : { ...blankPage(nextId++), title: vehicle.label, description: vehicle.description, image: vehicle.image ?? '', details: { description: '', images: vehicle.image ? [vehicle.image] : [] } };
    return { vehicle: { ...vehicle, serviceId: resolved.id }, page: resolved };
  });
  return { entries, unpaired: services.filter((service) => !used.has(service.id)) };
};

const VehicleAdminPanel: React.FC = () => {
  const { locale } = useI18n();
  const lang = locale as Lang;
  const [config, setConfig] = useState<TransferConfig | null>(null);
  /** The catalogue as stored, in the admin's language — what "before" is for the sync. */
  const [services, setServices] = useState<Tour[]>([]);
  /** Catalogue pages that belong to no vehicle; kept as they are, after the fleet. */
  const [unpaired, setUnpaired] = useState<Tour[]>([]);
  const [draft, setDraft] = useState<FleetEntry[] | null>(null);
  const draftRef = useRef<FleetEntry[] | null>(null);
  draftRef.current = draft;
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const files = useRef<HTMLInputElement>(null);
  const uploadFor = useRef<number | null>(null);
  const sync = useTranslationSync(lang);

  useEffect(() => {
    let current = true;
    setDraft(null);
    // Strict reads: this panel writes both records back, so it must never
    // save the defaults over records it merely failed to read.
    Promise.all([getTransferConfig(true), getTransportServices(lang, true).catch(() => [] as Tour[])])
      .then(([transferConfig, catalogue]) => {
        if (!current) return;
        const paired = pairFleet(transferConfig.vehicleTypes, catalogue);
        setConfig(transferConfig);
        setServices(catalogue);
        setUnpaired(paired.unpaired);
        setDraft(paired.entries);
      })
      .catch((error) => current && setLoadError(error instanceof Error ? error.message : String(error)));
    return () => {
      current = false;
    };
  }, [lang]);

  const updateVehicle = (index: number, patch: Partial<VehicleType>) =>
    setDraft((list) => list && list.map((entry, i) => (i === index ? { ...entry, vehicle: { ...entry.vehicle, ...patch } } : entry)));

  const updatePage = (index: number, patch: Partial<Tour>) =>
    setDraft((list) => list && list.map((entry, i) => (i === index ? { ...entry, page: { ...entry.page, ...patch } } : entry)));

  const setPhotos = (index: number, photos: string[]) =>
    setDraft((list) =>
      list &&
      list.map((entry, i) =>
        i === index
          ? {
              vehicle: { ...entry.vehicle, image: photos[0] ?? '' },
              page: { ...entry.page, image: photos[0] ?? '', details: { ...entry.page.details, images: photos } },
            }
          : entry
      )
    );

  const updateTranslation = (index: number, to: string, patch: Partial<VehicleCopy>) =>
    setDraft(
      (list) =>
        list &&
        list.map((entry, i) =>
          i === index
            ? { ...entry, vehicle: { ...entry.vehicle, translations: { ...entry.vehicle.translations, [to]: { ...entry.vehicle.translations?.[to], ...patch } } } }
            : entry
        )
    );

  const addPhotos = async (index: number, picked: FileList | null) => {
    if (!picked?.length || !draftRef.current) return;
    setUploading(index);
    setMessage(null);
    const uploaded: string[] = [];
    for (const file of Array.from(picked)) {
      const url = await uploadVehicleImage(file);
      if (url) uploaded.push(url);
    }
    setUploading(null);
    if (uploaded.length < picked.length) {
      setMessage({ tone: 'bad', text: `${picked.length - uploaded.length} foto(s) no se pudieron subir. Revisa que sigues con la sesión abierta e inténtalo otra vez.` });
    }
    const entry = draftRef.current[index];
    if (entry && uploaded.length) setPhotos(index, [...photosOf(entry), ...uploaded]);
  };

  const addVehicle = () => {
    const ids = [...services, ...unpaired, ...(draft ?? []).map((entry) => entry.page)].map((service) => service.id);
    const id = Math.max(0, ...ids) + 1;
    const next = [...(draft ?? []), { vehicle: { ...BLANK_VEHICLE, serviceId: id }, page: blankPage(id) }];
    setDraft(next);
    setOpen(next.length - 1);
    window.setTimeout(() => document.getElementById(`vehicle-${next.length - 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  /** Ask, keep a copy (the vehicle and its page in every language), then take it out of the draft. */
  const removeVehicle = async (index: number) => {
    const entry = draft?.[index];
    if (!entry) return;
    const label = entry.vehicle.label || entry.page.title || `Vehículo ${index + 1}`;
    const position = services.findIndex((service) => service.id === entry.page.id);
    const byLocale: Partial<Record<Lang, Tour>> = position >= 0 ? { [lang]: services[position] } : {};
    if (position >= 0) {
      for (const to of SUPPORTED_LOCALES.filter((l) => l !== lang) as Lang[]) {
        const other = await getTransportServices(to, true).catch(() => [] as Tour[]);
        if (other[position]) byLocale[to] = other[position];
      }
    }
    if (!(await confirmAndTrash('vehicles', label, { vehicle: entry.vehicle, page: { position, byLocale, fallback: entry.page } }, lang))) return;
    setDraft((list) => list && list.filter((_, i) => i !== index));
    setMessage({ tone: 'ok', text: `«${label}» quitado del borrador. Pulsa «Guardar» para publicarlo; está en la papelera.` });
  };

  /** Validate, key and split the draft into the two records. */
  const prepare = (entries: FleetEntry[]): { vehicles: VehicleType[]; catalogue: Tour[] } => {
    const missing = entries.findIndex((entry) => !entry.vehicle.label.trim());
    if (missing !== -1) throw new Error(`El vehículo ${missing + 1} necesita un nombre antes de guardarlo.`);
    // A blank key on a new vehicle is derived from its name; an existing key is
    // never rewritten, because saved bookings and the planner refer to it.
    const vehicles = entries.map((entry) => ({ ...entry.vehicle, key: entry.vehicle.key || toKey(entry.vehicle.label) }));
    const duplicate = vehicles.find((vt, i) => vehicles.findIndex((o) => o.key === vt.key) !== i);
    if (duplicate) throw new Error(`Dos vehículos comparten el id "${duplicate.key}" — cambia el nombre de uno.`);
    const catalogue = entries.map((entry) => {
      const photos = photosOf(entry);
      const title = entry.page.title.trim() || entry.vehicle.label.trim();
      const price = entry.page.price.trim();
      return {
        ...entry.page,
        title,
        image: photos[0] ?? '',
        description: entry.page.description.trim() || entry.vehicle.description.trim(),
        price,
        pricingOptions: [{ ...(entry.page.pricingOptions[0] ?? { tier: 'People' }), price, amount: priceAmount(price) }],
        details: { description: entry.page.details.description.trim(), images: photos },
      } as Tour;
    });
    return { vehicles, catalogue: [...catalogue, ...unpaired] };
  };

  const carryVehicles = async (to: Lang, report: (line: string) => void, before: VehicleType[], after: VehicleType[]): Promise<string | null> => {
    const changed = after.filter((vt) => {
      const prev = before.find((b) => b.key === vt.key);
      return !prev || !sameCopy(vehicleText(prev, lang), vehicleText(vt, lang));
    });
    if (changed.length === 0) return null;
    const copies = new Map<string, VehicleCopy>();
    for (const [i, vt] of changed.entries()) {
      report(`${i + 1}/${changed.length}`);
      const prev = before.find((b) => b.key === vt.key);
      const theirs = vt.translations?.[to];
      const existing = theirs?.label || theirs?.description ? vehicleText(vt, to) : undefined;
      const result = await syncRecord(prev ? vehicleText(prev, lang) : undefined, vehicleText(vt, lang), existing, lang, to);
      copies.set(vt.key, { label: result.value.label, description: result.value.description });
    }
    const fresh = await getTransferConfig(true);
    await saveTransferConfig({
      ...fresh,
      vehicleTypes: fresh.vehicleTypes.map((vt) => {
        const copy = copies.get(vt.key);
        return copy ? { ...vt, translations: { ...vt.translations, [to]: copy } } : vt;
      }),
    });
    return `${copies.size} vehículo(s)`;
  };

  const fillMissing = async (to: Lang, report: (line: string) => void): Promise<string | null> => {
    const missing = (draftRef.current ?? []).map((entry) => entry.vehicle).filter((vt) => vt.key && !vt.translations?.[to]?.label?.trim() && vt.label.trim());
    if (missing.length === 0) return null;
    const fresh = await getTransferConfig(true);
    const copies = new Map<string, VehicleCopy>();
    for (const [i, vt] of missing.entries()) {
      report(`${i + 1}/${missing.length}`);
      const result = await syncRecord(undefined, vehicleText(vt, lang), undefined, lang, to);
      copies.set(vt.key, { label: result.value.label, description: result.value.description });
    }
    await saveTransferConfig({
      ...fresh,
      vehicleTypes: fresh.vehicleTypes.map((vt) => (copies.has(vt.key) ? { ...vt, translations: { ...vt.translations, [to]: copies.get(vt.key) } } : vt)),
    });
    return `${copies.size} vehículo(s) traducido(s)`;
  };

  const save = async () => {
    if (!config || !draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const { vehicles, catalogue } = prepare(draft);
      const beforeVehicles = config.vehicleTypes;
      const beforeCatalogue = services;
      await saveTransferConfig({ ...config, vehicleTypes: vehicles });
      await saveTransportServices(catalogue, lang);
      setConfig({ ...config, vehicleTypes: vehicles });
      setServices(catalogue);
      setDraft(pairFleet(vehicles, catalogue).entries);
      setMessage({ tone: 'ok', text: 'Guardado: la calculadora y las páginas de los vehículos.' });
      void sync.afterSave(async (to, report) => {
        const parts: string[] = [];
        const carried = await carryVehicles(to, report, beforeVehicles, vehicles);
        if (carried) parts.push(carried);
        const target = await getTransportServices(to, true).catch(() => [] as Tour[]);
        const result = await syncList(target, beforeCatalogue, catalogue, lang, to, { ...PAIRING, onProgress: report });
        if (result.changed) {
          await saveTransportServices(result.list, to);
          const said = describeSync(result);
          if (said) parts.push(`páginas: ${said}`);
        }
        return parts.length ? parts.join(' · ') : null;
      });
    } catch (error) {
      setMessage({ tone: 'bad', text: `No se pudo guardar: ${(error as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink';
  const tag = 'text-xs font-bold uppercase tracking-wider text-ink-soft';

  if (loadError) {
    return (
      <section className="rounded-3xl bg-paper-card p-6 shadow-lg">
        <p className="text-hibiscus-dark">No se pudo leer la flota, así que no se puede editar ahora: {loadError}</p>
      </section>
    );
  }
  if (!draft) {
    return (
      <section className="rounded-3xl bg-paper-card p-6 shadow-lg">
        <p className="text-ink-soft">Cargando la flota…</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-paper-card p-6 shadow-lg">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">Vehículos</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Cada vehículo, una sola vez: cómo lo ve la calculadora de traslados y su página pública (la de la cinta de la portada y
            /details/transport). La primera foto es la portada; todas forman el carrusel. Editas en{' '}
            <strong>{lang.toUpperCase()}</strong>; al guardar se lleva a los otros idiomas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={addVehicle} className="rounded-full px-4 py-2 text-sm font-bold text-ink ring-1 ring-ink/20 hover:bg-paper-warm">
            + Añadir vehículo
          </button>
          <button onClick={save} disabled={saving} className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar vehículos'}
          </button>
        </div>
      </div>

      {message && (
        <p className={`mb-4 rounded-xl px-4 py-2 text-sm font-semibold ${message.tone === 'ok' ? 'bg-jungle-light/40 text-jungle-dark' : 'bg-hibiscus-light/30 text-hibiscus-dark'}`} role="status">
          {message.text}
        </p>
      )}

      <TranslateBar sync={sync} what="los vehículos y sus páginas" fillMissing={fillMissing} disabled={draft.length === 0} />

      <input
        ref={files}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const index = uploadFor.current;
          if (index !== null) void addPhotos(index, event.target.files);
          event.target.value = '';
        }}
      />

      <div className="space-y-4">
        {draft.map((entry, index) => {
          const { vehicle, page } = entry;
          const photos = photosOf(entry);
          const expanded = open === index;
          return (
            <div key={index} id={`vehicle-${index}`} className="scroll-mt-28 rounded-2xl border border-ink/15 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px,1fr]">
                {/* Photos */}
                <div className="space-y-2">
                  <div className="flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-xl bg-paper-deep">
                    {photos[0] ? (
                      <img src={photos[0]} alt={vehicle.label || 'Vehículo'} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <span className="px-2 text-center text-xs uppercase tracking-[0.18em] text-ink-light">Sin foto</span>
                    )}
                  </div>
                  {photos.length > 0 && (
                    <ul className="grid grid-cols-4 gap-1.5">
                      {photos.map((src, photo) => (
                        <li key={`${src}-${photo}`} className="group relative aspect-square overflow-hidden rounded-md ring-1 ring-ink/10">
                          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                          {photo === 0 && <span className="absolute left-0.5 top-0.5 rounded bg-ink/80 px-1 text-[0.6rem] font-bold text-white">Portada</span>}
                          <span className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink/70 py-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                            {photo > 0 && (
                              <button type="button" title="Hacer portada" className="px-1 text-xs text-white" onClick={() => setPhotos(index, [src, ...photos.filter((_, i) => i !== photo)])}>
                                ★
                              </button>
                            )}
                            <button
                              type="button"
                              title="Quitar foto"
                              className="px-1 text-xs text-white"
                              onClick={() => window.confirm('¿Quitar esta foto del vehículo?') && setPhotos(index, photos.filter((_, i) => i !== photo))}
                            >
                              ✕
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    disabled={uploading === index}
                    onClick={() => {
                      uploadFor.current = index;
                      files.current?.click();
                    }}
                    className="w-full rounded-xl px-3 py-2 text-sm font-bold text-lagoon-dark ring-1 ring-lagoon-dark hover:bg-lagoon-dark hover:text-white disabled:opacity-50"
                  >
                    {uploading === index ? 'Subiendo…' : '+ Añadir fotos'}
                  </button>
                  <input
                    type="url"
                    placeholder="…o pega el enlace de una foto y pulsa Enter"
                    className={`${field} text-xs`}
                    onKeyDown={(event) => {
                      const input = event.currentTarget;
                      if (event.key === 'Enter' && input.value.trim()) {
                        event.preventDefault();
                        setPhotos(index, [...photos, input.value.trim()]);
                        input.value = '';
                      }
                    }}
                  />
                </div>

                {/* The vehicle */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className={tag}>Nombre (calculadora)</span>
                      <input type="text" value={vehicle.label} onChange={(event) => updateVehicle(index, { label: event.target.value })} placeholder="Minivan privada" className={field} />
                    </label>
                    <label className="space-y-1">
                      <span className={tag}>Id {vehicle.key && <span className="normal-case">(fijo una vez guardado)</span>}</span>
                      <input type="text" value={vehicle.key} onChange={(event) => updateVehicle(index, { key: toKey(event.target.value) })} placeholder="sale del nombre" className={`${field} font-mono`} />
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className={tag}>Descripción corta (calculadora)</span>
                    <textarea value={vehicle.description} onChange={(event) => updateVehicle(index, { description: event.target.value })} rows={2} placeholder="Amplia para familias o grupos de hasta 8" className={field} />
                  </label>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <label className="space-y-1">
                      <span className={tag}>Pasajeros máx.</span>
                      <input type="number" min="1" value={vehicle.maxPassengers} onChange={(event) => updateVehicle(index, { maxPassengers: Math.max(1, Number(event.target.value) || 1) })} className={field} />
                    </label>
                    <label className="space-y-1">
                      <span className={tag}>Multiplicador precio</span>
                      <input type="number" step="0.05" min="0" value={vehicle.multiplier} onChange={(event) => updateVehicle(index, { multiplier: Math.max(0, Number(event.target.value) || 0) })} className={field} />
                    </label>
                    <label className="space-y-1">
                      <span className={tag}>Multiplicador por km</span>
                      <input type="number" step="0.05" min="0" value={vehicle.pricePerKmMultiplier ?? 1} onChange={(event) => updateVehicle(index, { pricePerKmMultiplier: Math.max(0, Number(event.target.value) || 0) })} className={field} />
                    </label>
                    <div className="flex items-end">
                      <button onClick={() => void removeVehicle(index)} className="w-full rounded-xl px-3 py-2 text-sm font-bold text-hibiscus-dark ring-1 ring-hibiscus/50 hover:bg-hibiscus-light/20">
                        Eliminar vehículo
                      </button>
                    </div>
                  </div>

                  <details className="rounded-xl border border-ink/10 px-4 py-2">
                    <summary className={`cursor-pointer ${tag}`}>Nombre y descripción corta por idioma ({SUPPORTED_LOCALES.map((l) => l.toUpperCase()).join(' · ')})</summary>
                    <p className="mt-2 text-xs text-ink-soft">Lo que quede vacío muestra el nombre y la descripción de arriba.</p>
                    <div className="mt-3 space-y-3">
                      {SUPPORTED_LOCALES.map((to) => (
                        <div key={to} className="grid grid-cols-1 gap-2 sm:grid-cols-[3rem,1fr,2fr] sm:items-start">
                          <span className="pt-2 text-xs font-bold text-ink-soft">{to.toUpperCase()}</span>
                          <input type="text" value={vehicle.translations?.[to]?.label ?? ''} onChange={(event) => updateTranslation(index, to, { label: event.target.value })} placeholder={vehicle.label || 'Nombre'} aria-label={`Nombre (${to})`} className={field} />
                          <textarea value={vehicle.translations?.[to]?.description ?? ''} onChange={(event) => updateTranslation(index, to, { description: event.target.value })} placeholder={vehicle.description || 'Descripción'} aria-label={`Descripción (${to})`} rows={2} className={field} />
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* The public page */}
                  <div className="rounded-xl bg-paper-warm/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={tag}>Página pública ({lang.toUpperCase()})</span>
                      <button type="button" onClick={() => setOpen(expanded ? null : index)} className="text-xs font-bold text-lagoon-dark underline">
                        {expanded ? 'Ocultar la descripción larga' : 'Editar la descripción larga'}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[2fr,1fr]">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-ink-soft">Título</span>
                        <input type="text" value={page.title} onChange={(event) => updatePage(index, { title: event.target.value })} placeholder={vehicle.label || 'Traslados privados'} className={field} />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-ink-soft">Precio desde</span>
                        <input type="text" value={page.price} onChange={(event) => updatePage(index, { price: event.target.value })} placeholder="Desde USD 38" className={field} />
                      </label>
                    </div>
                    <label className="mt-3 block space-y-1">
                      <span className="text-xs font-semibold text-ink-soft">Resumen (tarjeta de la portada)</span>
                      <textarea value={page.description} onChange={(event) => updatePage(index, { description: event.target.value })} rows={2} placeholder={vehicle.description} className={field} />
                    </label>
                    {expanded && (
                      <div className="mt-3">
                        <span className="text-xs font-semibold text-ink-soft">Descripción larga (Markdown)</span>
                        <MarkdownEditor value={page.details.description} onChange={(value) => updatePage(index, { details: { ...page.details, description: value } })} height={220} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {draft.length === 0 && <p className="rounded-xl bg-paper-warm p-4 text-sm text-ink-soft">No hay vehículos. Añade uno.</p>}
      {unpaired.length > 0 && (
        <p className="mt-4 text-xs text-ink-soft">
          {unpaired.length} página(s) de transporte sin vehículo ({unpaired.map((service) => service.title).join(', ')}) se conservan tal cual.
        </p>
      )}
    </section>
  );
};

export default VehicleAdminPanel;
