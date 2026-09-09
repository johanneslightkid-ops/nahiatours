import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { uploadImage, Tour, PricingOption } from '../../services/toursService';
import MarkdownEditor from '../ui/MarkdownEditor';

type Category = 'tours' | 'transport';

interface ServiceAdminPanelProps {
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
 * ("Adults", "Children", "VIP"). There is now one rate that everybody pays, so
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <Link to={siblingAdminPath} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          {siblingAdminLabel}
        </Link>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          {isEditing ? `Edit ${category}` : `Add ${category}`}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <input
            type="text"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="Title"
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
          <input
            type="text"
            value={draft.image}
            onChange={(event) => setDraft({ ...draft, image: normalizeImageEntry(event.target.value) })}
            placeholder="Cover image path"
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Detailed description (supports Markdown formatting)
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

        <div className="mt-6 rounded-3xl border border-slate-200 p-5">
          <h3 className="mb-1 text-lg font-semibold text-slate-900">Price</h3>
          <p className="mb-4 text-sm text-slate-600">
            One rate per person — the same for adults and children.
          </p>
          <input
            type="text"
            value={draft.pricingOptions[0]?.price ?? ''}
            onChange={(event) => updatePrice(event.target.value)}
            placeholder={category === 'transport' ? 'From USD 15' : '$55'}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 md:max-w-xs"
          />
        </div>

        {category === 'transport' && (
          <div className="mt-6 rounded-3xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Transfer routes</h3>
              <button
                onClick={() => setDraft((current) => ({
                  ...current,
                  transferRoutes: [...(current.transferRoutes ?? []), createEmptyRoute()],
                }))}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Add route
              </button>
            </div>
            <div className="space-y-4">
              {(draft.transferRoutes ?? []).map((route, index) => (
                <div key={route.id || index} className="space-y-4 rounded-3xl border border-slate-200 p-4">
                  <div className="grid gap-3 md:grid-cols-[1fr,1fr,1fr,auto]">
                    <input
                      type="text"
                      value={(route as any).origin}
                      onChange={(event) => updateRoute(index, 'origin', event.target.value)}
                      placeholder="Origin"
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                    />
                    <input
                      type="text"
                      value={(route as any).destination}
                      onChange={(event) => updateRoute(index, 'destination', event.target.value)}
                      placeholder="Destination"
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                    />
                    <input
                      type="text"
                      value={(route as any).price}
                      onChange={(event) => updateRoute(index, 'price', event.target.value)}
                      placeholder="Price"
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                    />
                    <button
                      onClick={() => setDraft((current) => ({
                        ...current,
                        transferRoutes: (current.transferRoutes ?? []).length && (current.transferRoutes ?? []).length > 1
                          ? (current.transferRoutes ?? []).filter((_: any, routeIndex: number) => routeIndex !== index)
                          : [createEmptyRoute()],
                      }))}
                      className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr,1fr]">
                    <input
                      type="number"
                      value={(route as any).distanceKm ?? ''}
                      onChange={(event) => updateRoute(index, 'distanceKm', event.target.value)}
                      placeholder="Distance km"
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                      min={0}
                      step={0.1}
                    />
                    <input
                      type="number"
                      value={(route as any).durationMinutes ?? ''}
                      onChange={(event) => updateRoute(index, 'durationMinutes', event.target.value)}
                      placeholder="Duration min"
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                      min={0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-slate-200 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Detail images</h3>
            <button
              onClick={() => setDraft((current) => ({
                ...current,
                details: { ...current.details, images: [...current.details.images, ''] },
              }))}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Add image
            </button>
          </div>
          <div className="space-y-4">
            {draft.details.images.map((image, index) => (
              <div key={`${image}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr,auto,auto]">
                  <input
                    type="text"
                    value={image}
                    onChange={(event) => updateImage(index, event.target.value)}
                    placeholder="imgs/tours/example_detail_1.jpg"
                    className="rounded-2xl border border-slate-200 px-4 py-3"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        await handleImageUpload(index, file);
                      }
                    }}
                    className="rounded-2xl border border-slate-200 px-4 py-3"
                  />
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
                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={handleSave} className="rounded-full bg-teal-600 px-5 py-2 font-semibold text-white">
            Save
          </button>
          <button onClick={resetDraft} className="rounded-full bg-slate-200 px-5 py-2 font-semibold text-slate-800">
            Cancel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sortedServices.map((service) => (
          <article key={service.id} className="rounded-3xl bg-white p-5 shadow-lg">
            <img src={service.image} alt={service.title} className="mb-4 h-44 w-full rounded-2xl object-cover" />
            <h3 className="text-xl font-semibold text-slate-900">{service.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{service.description.slice(0, 180)}{service.description.length > 180 ? '…' : ''}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {service.pricingOptions[0]?.price || service.price || 'No price set'} per person
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">{service.details.images.length} detail images</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => startEditing(service)} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Edit
              </button>
              <button onClick={() => handleDelete(service.id)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ServiceAdminPanel;
