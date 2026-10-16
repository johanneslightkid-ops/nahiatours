import React, { useRef, useState } from 'react';
import {
  BrandSettings,
  defaultHeroMedia,
  HeroMediaItem,
  HeroMediaType,
  uploadHeroMedia,
} from '../../services/brandService';

interface HeroMediaAdminProps {
  brandSettings: BrandSettings;
  setBrandSettings: React.Dispatch<React.SetStateAction<BrandSettings>>;
}

const slotNames = ['Postcard principal', 'Foto pequeña izquierda', 'Foto pequeña derecha'];

const completeMedia = (media?: HeroMediaItem[]): HeroMediaItem[] =>
  defaultHeroMedia.map((fallback, index) => ({ ...fallback, ...(media?.[index] ?? {}) }));

/**
 * The three welcome cards live in brand settings rather than in source code,
 * so the operator can refresh the first thing a guest sees without a deploy.
 */
const HeroMediaAdmin: React.FC<HeroMediaAdminProps> = ({ brandSettings, setBrandSettings }) => {
  const fileInputs = useRef<Array<HTMLInputElement | null>>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const update = (index: number, patch: Partial<HeroMediaItem>) => {
    const next = completeMedia(brandSettings.heroMedia);
    next[index] = { ...next[index], ...patch };
    setBrandSettings((current) => ({ ...current, heroMedia: next }));
  };

  const upload = async (index: number, file: File) => {
    setUploadingIndex(index);
    try {
      const url = await uploadHeroMedia(file);
      if (url) {
        update(index, { url, type: file.type.startsWith('video/') ? 'video' : 'image' });
      }
    } finally {
      setUploadingIndex(null);
    }
  };

  const media = completeMedia(brandSettings.heroMedia);

  return (
    <fieldset className="md:col-span-2 rounded-3xl border border-ink/15 bg-paper-warm/60 p-4 sm:p-5">
      <legend className="px-2 text-base font-bold text-ink">Álbum de fotos y video de portada</legend>
      <p className="mb-4 text-sm leading-relaxed text-ink-soft">
        Los tres marcos aparecen en la portada, también en móvil. Sube una imagen o video, o pega una URL alojada.
        Pulsa “Guardar” al terminar para publicarlos.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {media.map((item, index) => (
          <section key={slotNames[index]} className="rounded-2xl border border-ink/15 bg-paper-card p-3 shadow-sm">
            <div className="mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-paper-deep">
              {item.type === 'video' ? (
                <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <p className="mb-3 text-sm font-bold text-ink">{slotNames[index]}</p>
            <label className="mb-3 block text-xs font-semibold text-ink-soft">
              Tipo de contenido
              <select
                value={item.type}
                onChange={(event) => update(index, { type: event.target.value as HeroMediaType })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink"
              >
                <option value="image">Imagen</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label className="mb-3 block text-xs font-semibold text-ink-soft">
              URL
              <input
                type="url"
                value={item.url}
                onChange={(event) => update(index, { url: event.target.value })}
                placeholder="https://…"
                className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="mb-3 block text-xs font-semibold text-ink-soft">
              Descripción breve
              <input
                type="text"
                value={item.alt ?? ''}
                onChange={(event) => update(index, { alt: event.target.value })}
                placeholder="Qué muestra este recuerdo"
                className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2 text-sm text-ink"
              />
            </label>
            <input
              ref={(element) => { fileInputs.current[index] = element; }}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(index, file);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputs.current[index]?.click()}
              disabled={uploadingIndex === index}
              className="w-full rounded-xl border border-lagoon-dark px-3 py-2 text-sm font-bold text-lagoon-dark transition hover:bg-lagoon-dark hover:text-white disabled:opacity-60"
            >
              {uploadingIndex === index ? 'Subiendo…' : 'Subir imagen o video'}
            </button>
          </section>
        ))}
      </div>
    </fieldset>
  );
};

export default HeroMediaAdmin;
