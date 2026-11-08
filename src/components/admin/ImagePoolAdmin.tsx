import React, { useEffect, useMemo, useState } from 'react';
import { FaImage, FaSave, FaSearch, FaTrash, FaUpload } from 'react-icons/fa';
import { getAdminPassword } from '../../services/authStore';
import {
  getImageCatalog,
  BLOG_IMAGE_TAGS,
  IMAGE_POOL_PACKS,
  PoolImage,
  saveImageCatalog,
} from '../../services/imageCatalogService';

const commaList = (value: string) =>
  [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];

const fromFile = (file: File, url: string, packIds: string[], hashtags: string[]): PoolImage => {
  const packs = IMAGE_POOL_PACKS.filter((pack) => packIds.includes(pack.id));
  const unique = (values: string[]) => [...new Set(values)];
  return {
    id: `pool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
    title: file.name.replace(/\.[^.]+$/, ''),
    alt: '',
    categories: unique(packs.flatMap((pack) => pack.categories)),
    excursions: unique(packs.flatMap((pack) => pack.excursions)),
    audiences: unique(packs.flatMap((pack) => pack.audiences)),
    ageGroups: unique(packs.flatMap((pack) => pack.ageGroups)),
    travelStyles: unique(packs.flatMap((pack) => pack.travelStyles)),
    hashtags,
    createdAt: new Date().toISOString(),
  };
};

const ImagePoolAdmin: React.FC = () => {
  const [images, setImages] = useState<PoolImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPacks, setSelectedPacks] = useState<string[]>(['saona-family']);
  const [selectedUploadHashtags, setSelectedUploadHashtags] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    getImageCatalog()
      .then((catalog) => setImages(catalog.images))
      .catch((error: unknown) => setProblem(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false));
  }, []);

  const visibleImages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return images;
    return images.filter((image) =>
      [
        image.title,
        image.alt,
        ...image.categories,
        ...image.excursions,
        ...image.audiences,
        ...image.hashtags,
      ].join(' ').toLowerCase().includes(query)
    );
  }, [images, search]);

  const togglePack = (id: string) =>
    setSelectedPacks((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);

  const toggleUploadHashtag = (tag: string) =>
    setSelectedUploadHashtags((current) => current.includes(tag)
      ? current.filter((value) => value !== tag)
      : [...current, tag]);

  const updateImage = (id: string, key: keyof PoolImage, value: string) => {
    setImages((current) => current.map((image) =>
      image.id === id
        ? { ...image, [key]: ['categories', 'excursions', 'audiences', 'ageGroups', 'travelStyles', 'hashtags'].includes(key) ? commaList(value) : value }
        : image
    ));
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, 20);
    if (!selected.length) {
      setProblem('Selecciona archivos de imagen.');
      return;
    }
    if (files.length > 20) setNotice('Se han limitado las cargas a 20 imágenes por tanda.');
    setUploading(true);
    setProblem('');
    const uploaded: PoolImage[] = [];
    const failures: string[] = [];
    for (const file of selected) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', 'nahiatours/image-pool');
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'X-Admin-Password': getAdminPassword() ?? '' },
          body: form,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.secure_url !== 'string') {
          throw new Error(result.error || `No se pudo subir ${file.name}.`);
        }
        uploaded.push(fromFile(file, result.secure_url, selectedPacks, selectedUploadHashtags));
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
    if (uploaded.length) {
      const next = [...uploaded, ...images];
      setImages(next);
      try {
        await saveImageCatalog({ images: next });
        setNotice(`${uploaded.length} imagen(es) añadida(s) al catálogo.`);
      } catch (error) {
        setProblem(`Las imágenes se subieron a Cloudinary, pero no se pudo guardar el catálogo: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (failures.length) setProblem((current) => [current, ...failures].filter(Boolean).join('\n'));
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    setProblem('');
    setNotice('');
    try {
      await saveImageCatalog({ images });
      setNotice('Catálogo guardado en el almacenamiento de este sitio.');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
    if (!window.confirm('Quitar esta imagen del catálogo? El archivo original seguirá en Cloudinary.')) return;
    setImages((current) => current.filter((image) => image.id !== id));
  };

  const inputClass = 'w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">Catálogo de imágenes</h2>
          <p className="mt-1 text-sm text-ink-light">
            Sube fotos de excursiones a Cloudinary, organiza su contexto y reutilízalas al generar artículos.
          </p>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-full bg-lagoon-dark px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          <FaSave /> {saving ? 'Guardando…' : 'Guardar catálogo'}
        </button>
      </header>

      <section className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
        <h3 className="font-bold text-ink">Carga múltiple y paquetes de clasificación</h3>
        <p className="mt-1 text-sm text-ink-light">
          Elige uno o varios paquetes; sus categorías, excursiones y públicos se aplican a todas las imágenes de esta carga. Puedes afinarlos individualmente después.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {IMAGE_POOL_PACKS.map((pack) => (
            <label key={pack.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-ink/10 p-3 text-sm hover:border-lagoon">
              <input type="checkbox" checked={selectedPacks.includes(pack.id)} onChange={() => togglePack(pack.id)} className="mt-1 accent-lagoon-dark" />
              <span><strong className="block text-ink">{pack.label}</strong><span className="text-xs text-ink-light">{pack.description}</span></span>
            </label>
          ))}
        </div>
        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-ink">Etiquetas visuales para estas imágenes (opcional)</legend>
          <p className="mt-1 text-xs text-ink-light">Ayudan a encontrar fotos compatibles para artículos automáticos. Marca solo lo que aparece realmente; no se selecciona ninguna por defecto.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BLOG_IMAGE_TAGS.map(({ tag, label }) => (
              <button
                type="button"
                key={tag}
                aria-pressed={selectedUploadHashtags.includes(tag)}
                onClick={() => toggleUploadHashtag(tag)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedUploadHashtags.includes(tag)
                    ? 'border-lagoon-dark bg-lagoon-dark text-white'
                    : 'border-ink/15 bg-white text-ink-soft hover:border-lagoon'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-lagoon-dark px-5 py-3 text-sm font-bold text-white">
          <FaUpload /> {uploading ? 'Subiendo imágenes…' : 'Seleccionar varias imágenes'}
          <input type="file" accept="image/*" multiple disabled={uploading} className="hidden" onChange={(event) => { void uploadFiles(event.target.files); event.target.value = ''; }} />
        </label>
        <p className="mt-2 text-xs text-ink-light">Hasta 20 archivos de imagen por carga. Los datos del catálogo se guardan en la KV de este sitio.</p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative block min-w-64 flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, excursión o público…" className={`${inputClass} pl-9`} />
        </label>
        <span className="text-sm text-ink-light">{visibleImages.length} / {images.length} imágenes</span>
      </div>

      {loading ? <p className="py-8 text-center text-ink-light">Cargando catálogo…</p> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleImages.map((image) => (
            <article key={image.id} className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
              <img src={image.url} alt={image.alt} className="h-48 w-full bg-paper-warm object-cover" loading="lazy" />
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex-1 text-xs font-bold text-ink-soft">Título
                    <input value={image.title} onChange={(event) => updateImage(image.id, 'title', event.target.value)} className={`${inputClass} mt-1`} />
                  </label>
                  <button type="button" onClick={() => remove(image.id)} aria-label="Quitar del catálogo" className="mt-5 rounded-full p-2 text-hibiscus hover:bg-hibiscus/10"><FaTrash /></button>
                </div>
                <label className="block text-xs font-bold text-ink-soft">Texto alternativo
                  <input value={image.alt} onChange={(event) => updateImage(image.id, 'alt', event.target.value)} placeholder="Describe lo que realmente aparece" className={`${inputClass} mt-1`} />
                </label>
                {([
                  ['categories', 'Categorías'],
                  ['excursions', 'Excursiones'],
                  ['audiences', 'Públicos (perfiles editoriales)'],
                  ['ageGroups', 'Edades'],
                  ['travelStyles', 'Estilos'],
                  ['hashtags', 'Etiquetas visuales (hashtags)'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block text-xs font-bold text-ink-soft">{label}
                    <input value={image[key].join(', ')} onChange={(event) => updateImage(image.id, key, event.target.value)} className={`${inputClass} mt-1`} />
                  </label>
                ))}
                <div>
                  <p className="text-xs font-bold text-ink-soft">Añadir etiquetas sugeridas</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {BLOG_IMAGE_TAGS.map(({ tag, label, description }) => (
                      <button
                        type="button"
                        key={tag}
                        title={description}
                        aria-pressed={image.hashtags.includes(tag)}
                        onClick={() => updateImage(
                          image.id,
                          'hashtags',
                          [...new Set(image.hashtags.includes(tag)
                            ? image.hashtags.filter((value) => value !== tag)
                            : [...image.hashtags, tag])].join(', ')
                        )}
                        className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold ${
                          image.hashtags.includes(tag)
                            ? 'border-lagoon-dark bg-lagoon-dark text-white'
                            : 'border-ink/15 text-ink-soft hover:border-lagoon'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="mt-2 block text-xs font-bold text-ink-soft">Etiquetas personalizadas (separadas por comas)
                    <input value={image.hashtags.join(', ')} onChange={(event) => updateImage(image.id, 'hashtags', event.target.value)} placeholder="Ej.: paseo al amanecer, paseo en familia" className={`${inputClass} mt-1`} />
                  </label>
                </div>
                <p className="break-all text-[0.65rem] text-ink-light"><FaImage className="mr-1 inline" />Cloudinary · {image.url}</p>
              </div>
            </article>
          ))}
          {!visibleImages.length && <p className="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-ink-light">Todavía no hay imágenes que coincidan. Sube algunas y asígnales un paquete para empezar.</p>}
        </div>
      )}

      <p className="text-xs leading-relaxed text-ink-light">
        Organiza por mercado de origen, idioma, tipo de viaje, edad aproximada y excursión; no clasificamos personas por raza. Las etiquetas describen a quién podría servir una imagen, no quién aparece en ella.
      </p>
      {notice && <p className="rounded-xl bg-jungle/10 p-3 text-sm font-semibold text-jungle-dark">{notice}</p>}
      {problem && <p className="whitespace-pre-wrap rounded-xl bg-hibiscus/10 p-3 text-sm font-semibold text-hibiscus-dark">{problem}</p>}
    </div>
  );
};

export default ImagePoolAdmin;
