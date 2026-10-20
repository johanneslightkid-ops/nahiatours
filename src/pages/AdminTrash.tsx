import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { HiRefresh, HiReply, HiTrash } from 'react-icons/hi';
import { listTrash, purgeTrash, TrashItem, TrashSection } from '../lib/trash';
import { getTours, getTransportServices, saveTours, saveTransportServices, Tour } from '../services/toursService';
import { BlogArticle, saveBlogArticle } from '../services/blogService';
import { getTestimonials, saveTestimonials, TestimonialRecord } from '../services/testimonialService';
import { getDestinations, saveDestinations, DestinationItem } from '../edt/destinations';
import { getTransferConfig, saveTransferConfig } from '../services/transferConfigService';
import type { VehicleType } from '../types/transport';
import type { Locale } from '../contexts/I18nContext';

/** A deleted tour or transfer: the service in every language, and where it stood. */
interface ServiceCopy {
  position: number;
  byLocale: Partial<Record<Locale, Tour>>;
  fallback: Tour;
}

const SECTIONS: { key: TrashSection; title: string; hint: string }[] = [
  { key: 'tours', title: 'Excursiones', hint: 'Vuelve en todos los idiomas, en el mismo lugar de la lista.' },
  { key: 'transport', title: 'Servicios de transporte', hint: 'Vuelve en los idiomas guardados, en el mismo lugar.' },
  { key: 'vehicles', title: 'Vehículos (calculadora de traslados)', hint: 'Vuelve con su precio, fotos y textos.' },
  { key: 'blog', title: 'Entradas del blog', hint: 'Vuelve en el idioma del que se borró.' },
  { key: 'testimonials', title: 'Reseñas', hint: 'Vuelve con su estado de aprobación.' },
  { key: 'destinations', title: 'Destinos', hint: 'Vuelve al final de la lista de destinos.' },
];

/** Put a service back into one language's list, at its old place, with a free id if its own was taken. */
const insertService = (list: Tour[], service: Tour, position: number, id: number): Tour[] => {
  if (list.some((item) => item.id === service.id && item.title === service.title)) return list;
  const next = [...list];
  next.splice(Math.min(Math.max(position, 0), next.length), 0, { ...service, id });
  return next;
};

/** Put a service back in every language it was kept in; resolves to the id it got. */
const restoreServices = async (item: TrashItem, kind: 'tours' | 'transport'): Promise<number> => {
  const copy = item.data as ServiceCopy;
  const byLocale = Object.keys(copy.byLocale ?? {}).length ? copy.byLocale : { [(item.locale as Locale) || 'es']: copy.fallback };
  const get = kind === 'tours' ? getTours : getTransportServices;
  const save = kind === 'tours' ? saveTours : saveTransportServices;
  const lists = new Map<Locale, Tour[]>();
  for (const lang of Object.keys(byLocale) as Locale[]) lists.set(lang, await get(lang, true));
  // One id for every language: its own, unless another service has taken it meanwhile.
  const original = copy.fallback?.id ?? Object.values(byLocale)[0]?.id ?? 0;
  const taken = [...lists.values()].some((list) => list.some((tour) => tour.id === original && tour.title !== byLocale[(Object.keys(byLocale)[0] as Locale)]?.title));
  const id = taken ? Math.max(0, ...[...lists.values()].flat().map((tour) => tour.id)) + 1 : original;
  for (const [lang, list] of lists) {
    const service = byLocale[lang];
    if (service) await save(insertService(list, service, copy.position, id), lang);
  }
  return id;
};

const RESTORE: Record<TrashSection, (item: TrashItem) => Promise<void>> = {
  tours: async (item) => void (await restoreServices(item, 'tours')),
  transport: async (item) => void (await restoreServices(item, 'transport')),
  blog: async (item) => {
    if (!(await saveBlogArticle(item.data as BlogArticle, ((item.locale as Locale) || 'es')))) throw new Error('No se pudo guardar la entrada.');
  },
  testimonials: async (item) => {
    const review = item.data as TestimonialRecord;
    const list = await getTestimonials(item.locale || undefined);
    if (!list.some((t) => t.id === review.id)) await saveTestimonials([...list, review], item.locale || undefined);
  },
  destinations: async (item) => {
    const config = await getDestinations(true);
    const destination = item.data as DestinationItem;
    if (!config.items.some((d) => d.name === destination.name && d.image === destination.image)) {
      await saveDestinations({ ...config, items: [...config.items, destination] });
    }
  },
  // A vehicle comes back with its public page (if it had one), in every language.
  vehicles: async (item) => {
    const { vehicle, page } = item.data as { vehicle: VehicleType; page?: ServiceCopy };
    const config = await getTransferConfig(true);
    const key = config.vehicleTypes.some((v) => v.key === vehicle.key) ? `${vehicle.key}_${Date.now().toString(36).slice(-4)}` : vehicle.key;
    let serviceId = vehicle.serviceId;
    if (page && Object.keys(page.byLocale ?? {}).length) {
      serviceId = await restoreServices({ ...item, data: page }, 'transport');
    }
    await saveTransferConfig({ ...config, vehicleTypes: [...config.vehicleTypes, { ...vehicle, key, serviceId }] });
  },
};

const when = (at: number) =>
  new Date(at).toLocaleString('es-DO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const thumbOf = (item: TrashItem): string => {
  const data = item.data as any;
  const service = data?.page?.fallback ?? data?.fallback ?? data?.vehicle ?? data;
  return service?.image || service?.images?.[0] || data?.imageUrl || data?.photo || '';
};

/**
 * Admin › Papelera. Everything the admin pages deleted, by section: put it
 * back where it was, or delete it for good — one item, one section, or all.
 */
const AdminTrash: React.FC = () => {
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listTrash());
    } catch (error) {
      setItems([]);
      setStatus({ tone: 'bad', text: `No se pudo leer la papelera: ${error instanceof Error ? error.message : String(error)}` });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<TrashSection, TrashItem[]>();
    for (const item of items ?? []) map.set(item.section, [...(map.get(item.section) ?? []), item]);
    return map;
  }, [items]);

  const run = async (key: string, action: () => Promise<void>, done: string) => {
    setBusy(key);
    setStatus(null);
    try {
      await action();
      setStatus({ tone: 'ok', text: done });
      await load();
    } catch (error) {
      setStatus({ tone: 'bad', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(null);
    }
  };

  const restore = (item: TrashItem) =>
    run(item.id, async () => {
      await RESTORE[item.section](item);
      await purgeTrash({ id: item.id });
    }, `«${item.label}» ha vuelto a su sitio.`);

  const purge = (item: TrashItem) =>
    window.confirm(`¿Borrar «${item.label}» para siempre? No se podrá recuperar.`) &&
    run(item.id, async () => void (await purgeTrash({ id: item.id })), `«${item.label}» se borró para siempre.`);

  const purgeSection = (section: TrashSection, title: string, count: number) =>
    window.confirm(`¿Borrar para siempre los ${count} elementos de «${title}»? No se podrán recuperar.`) &&
    run(section, async () => void (await purgeTrash({ section })), `«${title}» está vacía.`);

  const purgeAll = () =>
    window.confirm(`¿Vaciar la papelera entera (${items?.length ?? 0} elementos)? No se podrá recuperar nada.`) &&
    run('all', async () => void (await purgeTrash({ all: true })), 'La papelera está vacía.');

  const card = 'rounded-xl bg-white p-6 shadow-ink-sm ring-1 ring-ink/10';

  return (
    <div className="min-h-screen bg-paper-warm py-6">
      <div className="container mx-auto max-w-5xl space-y-6 px-4">
        <header className={`${card} flex flex-wrap items-start justify-between gap-4`}>
          <div>
            <h1 className="font-display text-3xl uppercase text-ink">Papelera</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-soft">
              Lo que se elimina en el admin llega aquí primero. «Recuperar» lo devuelve a su sitio; «Borrar para siempre» lo quita
              definitivamente. Los elementos se guardan un año.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-ink ring-1 ring-ink/20 hover:bg-paper-warm">
              <HiRefresh /> Actualizar
            </button>
            <button
              type="button"
              disabled={!items?.length || busy === 'all'}
              onClick={purgeAll}
              className="inline-flex items-center gap-2 rounded-full bg-hibiscus-dark px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              <HiTrash /> Vaciar todo
            </button>
          </div>
        </header>

        {status && (
          <p className={`rounded-lg px-4 py-3 text-sm font-semibold ${status.tone === 'ok' ? 'bg-jungle-light/40 text-jungle-dark' : 'bg-hibiscus-light/30 text-hibiscus-dark'}`} role="status">
            {status.text}
          </p>
        )}

        {items === null ? (
          <p className="text-sm text-ink-soft">Cargando…</p>
        ) : items.length === 0 ? (
          <p className={`${card} text-center text-ink-soft`}>La papelera está vacía.</p>
        ) : (
          SECTIONS.filter((section) => grouped.get(section.key)?.length).map((section) => {
            const list = grouped.get(section.key) ?? [];
            return (
              <section key={section.key} className={card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-ink">
                      {section.title} <span className="text-ink-light">({list.length})</span>
                    </h2>
                    <p className="text-xs text-ink-soft">{section.hint}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy === section.key}
                    onClick={() => purgeSection(section.key, section.title, list.length)}
                    className="rounded-full px-4 py-2 text-sm font-bold text-hibiscus-dark ring-1 ring-hibiscus/40 hover:bg-hibiscus-light/20 disabled:opacity-40"
                  >
                    Vaciar esta sección
                  </button>
                </div>
                <ul className="mt-4 divide-y divide-ink/10">
                  {list.map((item) => {
                    const thumb = thumbOf(item);
                    return (
                      <li key={item.id} className="flex flex-wrap items-center gap-4 py-3">
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-paper-deep">
                          {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink">{item.label || '—'}</p>
                          <p className="text-xs text-ink-soft">
                            Eliminado el {when(item.at)}
                            {item.locale ? ` · ${item.locale.toUpperCase()}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy === item.id}
                            onClick={() => restore(item)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ink-soft disabled:opacity-40"
                          >
                            <HiReply /> Recuperar
                          </button>
                          <button
                            type="button"
                            disabled={busy === item.id}
                            onClick={() => purge(item)}
                            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-hibiscus-dark ring-1 ring-hibiscus/40 hover:bg-hibiscus-light/20 disabled:opacity-40"
                          >
                            <HiTrash /> Borrar para siempre
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminTrash;
