import React, { useEffect, useMemo, useState } from 'react';
import TranslateBar from './TranslateBar';
import { Link } from 'react-router-dom';
import { uploadImage, Tour, PricingOption } from '../../services/toursService';
import MarkdownEditor from '../ui/MarkdownEditor';

type Category = 'tours' | 'transport';

interface ServiceAdminPanelProps {
  /**
   * Which language the list on screen is in, and where to put a translation
   * of it. Both optional: without them the translate strip is simply absent,
   * which is what a panel that is not bilingual wants.
   */
  locale?: 'en' | 'es';
  saveTranslation?: (services: Tour[], to: 'en' | 'es') => Promise<void>;
  title: string;
  category: Category;
  services: Tour[];
  setServices: React.Dispatch<React.SetStateAction<Tour[]>>;
  loadServices: () => Promise<void>;
  saveServices: (services: Tour[]) => Promise<void>;
  siblingAdminPath: string;
  siblingAdminLabel: string;
}

/**
 * Label stored with every price.
 *
 * Services used to carry a list of tiers the operator typed themselves
 * ("Adultos", "Children", "VIP"). There is now one rate that everybody pays, so
 * the tier is no longer an editable field — it is this, and the reader sees it
 * translated (see perPersonTier in toursService).
 */
const PER_PERSON_TIER = 'Persons';

const createEmptyPricingOption = (): PricingOption => ({
  tier: PER_PERSON_TIER,
  price: '',
  amount: null,
});

const createEmptyRoute = () => ({
  id: String(Date.now()),
  origin: '',
  destination: '',
  price: '',
  amount: null,
  distanceKm: null,
  durationMinutes: null,
});

const createEmptyService = (): Tour => ({
  id: Date.now(),
  title: '',
  description: '',
  image: '',
  price: '',
  pricingOptions: [createEmptyPricingOption()],
  transferRoutes: [createEmptyRoute()],
  details: { description: '', images: [''] },
});

const normalizeImageEntry = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('/') || /^https?:\/\//.test(trimmed) ? trimmed : `/${trimmed}`;
};

const buildPricingOption = (option: PricingOption): PricingOption => {
  const numeric = Number(String(option.price ?? '').replace(/[^\d.]/g, ''));
  return {
    tier: PER_PERSON_TIER,
    price: String(option.price ?? '').trim(),
    amount: Number.isFinite(numeric) && numeric > 0 ? numeric : null,
  };
};

const ServiceAdminPanel: React.FC<ServiceAdminPanelProps> = ({
  title,
  category,
  locale,
  saveTranslation,
  services,
  setServices,
  loadServices,
  saveServices,
  siblingAdminPath,
  siblingAdminLabel,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Tour>(createEmptyService());
  const isEditing = editingId !== null;

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const sortedServices = useMemo(() => [...services].sort((a, b) => a.id - b.id), [services]);

  const resetDraft = () => {
    setEditingId(null);
    setDraft(createEmptyService());
  };

  const startEditing = (service: Tour) => {
    setEditingId(service.id);
    setDraft({
      ...service,
      pricingOptions: [service.pricingOptions[0] ?? createEmptyPricingOption()],
      transferRoutes: (service as any).transferRoutes?.length ? (service as any).transferRoutes : [createEmptyRoute()],
      details: {
        description: service.details.description || service.description,
        images: service.details.images.length ? service.details.images : [service.image],
      },
    });
  };

  const updatePrice = (value: string) => {
    setDraft((current) => ({
      ...current,
      pricingOptions: [{ ...(current.pricingOptions[0] ?? createEmptyPricingOption()), price: value }],
    }));
  };

  const updateRoute = (index: number, field: string, value: string) => {
    setDraft((current: any) => ({
      ...current,
      transferRoutes: (current.transferRoutes ?? []).map((route: any, routeIndex: number) =>
        routeIndex === index ? { ...route, [field]: value } : route
      ),
    }));
  };

  const updateImage = (index: number, value: string) => {
    setDraft((current) => ({
      ...current,
      details: {
        ...current.details,
        images: current.details.images.map((image, imageIndex) =>
          imageIndex === index ? value : image
        ),
      },
    }));
  };
  const buildDraft = (): Tour => {
    const pricingOptions = [buildPricingOption(draft.pricingOptions[0] ?? createEmptyPricingOption())]
      .filter((option) => option.price);
    const routes = (draft.transferRoutes ?? [])
      .map((route: any, index: number) => ({
        id: route.id || `${index}-${route.origin}-${route.destination}`,
        origin: String(route.origin ?? '').trim(),
        destination: String(route.destination ?? '').trim(),
        price: String(route.price ?? '').trim(),
        amount: Number.isFinite(Number(String(route.price ?? '').replace(/[^0-9.]/g, '')))
          ? Number(String(route.price ?? '').replace(/[^0-9.]/g, ''))
          : null,
        distanceKm: Number.isFinite(Number(route.distanceKm)) ? Number(route.distanceKm) : null,
        durationMinutes: Number.isFinite(Number(route.durationMinutes)) ? Number(route.durationMinutes) : null,
      }))
      .filter((route: any) => route.origin && route.destination && route.price);
    const images = draft.details.images.map(normalizeImageEntry).filter(Boolean);

    return {
      ...draft,
      price: pricingOptions[0]?.price || draft.price,
      image: images[0] || draft.image,
      pricingOptions,
      transferRoutes: routes?.length ? routes : undefined,
      details: {
        description: draft.details.description.trim(),
        images,
      },
      description: draft.details.description.trim(),
    };
  };

  const handleSave = async () => {
    const nextDraft = buildDraft();
    const nextServices = isEditing
      ? services.map((service) => (service.id === editingId ? nextDraft : service))
      : [...services, { ...nextDraft, id: Math.max(0, ...services.map((service) => service.id)) + 1 }];

    setServices(nextServices);
    await saveServices(nextServices);
    resetDraft();
  };

  const handleDelete = async (id: number) => {
    const nextServices = services.filter((service) => service.id !== id);
    setServices(nextServices);
    await saveServices(nextServices);
  };

  const handleImageUpload = async (index: number, file: File) => {
    const uploaded = await uploadImage(file);
    updateImage(index, uploaded);
  };

  const other = locale === 'en' ? 'es' : 'en';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink">{title}</h1>
        <Link to={siblingAdminPath} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          {siblingAdminLabel}
        </Link>
      </div>

      {/* Only when this panel was told which language it is showing AND given
          somewhere to put the other one. The strip hides itself again if no AI
          provider on this deployment can answer. */}
      {locale && saveTranslation && (
        <TranslateBar
          value={sortedServices}
          from={locale}
          what={category === 'transport' ? 'los servicios de transporte' : 'las excursiones'}
          note={
            category === 'transport'
              ? `Traduce los servicios que ves aquí y los guarda en la ficha de ${
                  other === 'en' ? 'inglés' : 'español'
                }. Cambia el idioma arriba para revisarlos. Lo que ya haya ahí se reemplaza.`
              : `Traduce las excursiones que ves aquí y las guarda en la ficha de ${
                  other === 'en' ? 'inglés' : 'español'
                }. Cambia el idioma arriba para revisarlas. Lo que ya haya ahí se reemplaza.`
          }
          disabled={sortedServices.length === 0}
          onTranslated={async (translated) => {
            await saveTranslation(translated as Tour[], other);
            return `Guardado en ${other === 'en' ? 'inglés' : 'español'}. Cambia el idioma para revisarlo.`;
          }}
        />
      )}

      <div className="rounded-3xl bg-paper-card p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-ink">
          {isEditing
            ? category === 'transport'
              ? 'Editar servicio de transporte'
              : 'Editar excursión'
            : category === 'transport'
            ? 'Agregar servicio de transporte'
            : 'Agregar excursión'}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <input
            type="text"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="Título"
            className="rounded-2xl border border-ink/15 px-4 py-3"
          />
          <input
            type="text"
            value={draft.image}
            onChange={(event) => setDraft({ ...draft, image: normalizeImageEntry(event.target.value) })}
            placeholder="Ruta de la imagen de portada"
            className="rounded-2xl border border-ink/15 px-4 py-3"
          />
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-ink-soft">
              Descripción detallada (acepta formato Markdown)
            </label>
            <MarkdownEditor
              value={draft.details.description}
              onChange={(val) => setDraft({
                ...draft,
                description: val,
                details: { ...draft.details, description: val },
              })}
              height={250}
            />
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-ink/15 p-5">
          <h3 className="mb-1 text-lg font-semibold text-ink">Precio</h3>
          <p className="mb-4 text-sm text-ink-soft">
            Una sola tarifa por persona: la misma para adultos y niños.
          </p>
          <input
            type="text"
            value={draft.pricingOptions[0]?.price ?? ''}
            onChange={(event) => updatePrice(event.target.value)}
            placeholder={category === 'transport' ? 'From USD 15' : '$55'}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3 md:max-w-xs"
          />
        </div>

        {category === 'transport' && (
          <div className="mt-6 rounded-3xl border border-ink/15 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">Rutas de traslado</h3>
              <button
                onClick={() => setDraft((current) => ({
                  ...current,
                  transferRoutes: [...(current.transferRoutes ?? []), createEmptyRoute()],
                }))}
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Agregar ruta
              </button>
            </div>
            <div className="space-y-4">
              {(draft.transferRoutes ?? []).map((route, index) => (
                <div key={route.id || index} className="space-y-4 rounded-3xl border border-ink/15 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr,1fr,1fr,auto]">
                    <input
                      type="text"
                      value={(route as any).origin}
                      onChange={(event) => updateRoute(index, 'origin', event.target.value)}
                      placeholder="Procedencia"
                      className="rounded-2xl border border-ink/15 px-4 py-3"
                    />
                    <input
                      type="text"
                      value={(route as any).destination}
                      onChange={(event) => updateRoute(index, 'destination', event.target.value)}
                      placeholder="Destino"
                      className="rounded-2xl border border-ink/15 px-4 py-3"
                    />
                    <input
                      type="text"
                      value={(route as any).price}
                      onChange={(event) => updateRoute(index, 'price', event.target.value)}
                      placeholder="Precio"
                      className="rounded-2xl border border-ink/15 px-4 py-3"
                    />
                    <button
                      onClick={() => setDraft((current) => ({
                        ...current,
                        transferRoutes: (current.transferRoutes ?? []).length && (current.transferRoutes ?? []).length > 1
                          ? (current.transferRoutes ?? []).filter((_: any, routeIndex: number) => routeIndex !== index)
                          : [createEmptyRoute()],
                      }))}
                      className="rounded-full bg-sunset-dark px-4 py-2 text-sm font-semibold text-white"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr,1fr]">
                    <input
                      type="number"
                      value={(route as any).distanceKm ?? ''}
                      onChange={(event) => updateRoute(index, 'distanceKm', event.target.value)}
                      placeholder="Distancia km"
                      className="rounded-2xl border border-ink/15 px-4 py-3"
                      min={0}
                      step={0.1}
                    />
                    <input
                      type="number"
                      value={(route as any).durationMinutes ?? ''}
                      onChange={(event) => updateRoute(index, 'durationMinutes', event.target.value)}
                      placeholder="Duración min"
                      className="rounded-2xl border border-ink/15 px-4 py-3"
                      min={0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-ink/15 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ink">Imágenes de detalle</h3>
            <button
              onClick={() => setDraft((current) => ({
                ...current,
                details: { ...current.details, images: [...current.details.images, ''] },
              }))}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Agregar imagen
            </button>
          </div>
          <div className="space-y-4">
            {draft.details.images.map((image, index) => (
              <div key={`${image}-${index}`} className="rounded-2xl border border-ink/15 p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr,auto,auto]">
                  <input
                    type="text"
                    value={image}
                    onChange={(event) => updateImage(index, event.target.value)}
                    placeholder="imgs/tours/example_detail_1.jpg"
                    className="rounded-2xl border border-ink/15 px-4 py-3"
                  />
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-ink/25 px-4 py-3 text-sm font-semibold text-ink-soft transition hover:border-lagoon hover:text-ink">
                    Subir imagen
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          await handleImageUpload(index, file);
                        }
                        event.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    onClick={() => setDraft((current) => ({
                      ...current,
                      details: {
                        ...current.details,
                        images: current.details.images.length > 1
                          ? current.details.images.filter((_, imageIndex) => imageIndex !== index)
                          : [''],
                      },
                    }))}
                    className="rounded-full bg-sunset-dark px-4 py-2 text-sm font-semibold text-white"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={handleSave} className="rounded-full bg-lagoon-dark px-5 py-2 font-semibold text-white">
            Guardar
          </button>
          <button onClick={resetDraft} className="rounded-full bg-paper-deep px-5 py-2 font-semibold text-ink">
            Cancelar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sortedServices.map((service) => (
          <article key={service.id} className="rounded-3xl bg-paper-card p-5 shadow-lg">
            <img src={service.image} alt={service.title} className="mb-4 h-44 w-full rounded-2xl object-cover" />
            <h3 className="text-xl font-semibold text-ink">{service.title}</h3>
            <p className="mt-2 text-sm text-ink-soft">{service.description.slice(0, 180)}{service.description.length > 180 ? '…' : ''}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-paper-warm px-3 py-1 text-xs font-semibold text-ink-soft">
                {service.pricingOptions[0]?.price || service.price || 'Sin precio'} por persona
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-ink-light">
              {service.details.images.length}{' '}
              {service.details.images.length === 1 ? 'imagen de detalle' : 'imágenes de detalle'}
            </p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => startEditing(service)} className="rounded-full bg-lagoon-dark px-4 py-2 text-sm font-semibold text-white">
                Editar
              </button>
              <button onClick={() => handleDelete(service.id)} className="rounded-full bg-sunset-dark px-4 py-2 text-sm font-semibold text-white">
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ServiceAdminPanel;
