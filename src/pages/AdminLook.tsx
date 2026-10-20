import React, { useEffect, useRef, useState } from 'react';
import { HiArrowDown, HiArrowUp, HiPlus, HiTrash, HiUpload } from 'react-icons/hi';
import { useI18n } from '../contexts/I18nContext';
import { adminLang } from '../lib/adminNav';
import { adminText, uploadAdminFile } from '../edt/adminUpload';
import { apiGet, apiPut } from '../services/apiClient';
import { defaultHeroMedia, HeroMediaItem, MAX_HERO_MEDIA } from '../services/brandService';
import {
  DEFAULT_GALLERY_MOTION,
  GalleryMotion,
  getGalleryMotion,
  previewGalleryMotion,
  saveGalleryMotion,
} from '../edt/galleryConfig';

const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url) || /\/video\/upload\//.test(url);

/**
 * Admin → Look: what the home page opens with and how the galleries move.
 *
 * The hero's background is a list of photographs and videos shown one after
 * another (one entry: it simply stays). It is kept in the brand record, which
 * this page reads exactly as stored and writes back with only `heroMedia`
 * changed — and refuses to write at all when it could not read it, so a
 * failed load can never save the defaults over the real brand.
 */
const AdminLook: React.FC = () => {
  const { locale } = useI18n();
  const lang = adminLang(locale);
  const say = (text: { en: string; es: string }) => adminText(lang, text);

  const [brand, setBrand] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState('');
  const [slides, setSlides] = useState<HeroMediaItem[]>([]);
  const [motion, setMotion] = useState<GalleryMotion>(DEFAULT_GALLERY_MOTION);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const files = useRef<HTMLInputElement>(null);
  const replaceAt = useRef<number | null>(null);
  const savedMotion = useRef<GalleryMotion>(DEFAULT_GALLERY_MOTION);

  useEffect(() => {
    apiGet<Record<string, unknown>>('brand')
      .then((data) => {
        const record = ((data as { record?: Record<string, unknown> }).record ?? data) as Record<string, unknown>;
        setBrand(record);
        const stored = Array.isArray(record.heroMedia) ? (record.heroMedia as HeroMediaItem[]).filter((item) => item?.url) : [];
        setSlides(stored.length ? stored : defaultHeroMedia);
      })
      .catch((error) => setLoadError(error instanceof Error ? error.message : String(error)));
    getGalleryMotion(true)
      .then((value) => {
        setMotion(value);
        savedMotion.current = value;
      })
      .catch(() => undefined);
    // Leaving the page without saving drops the preview.
    return () => previewGalleryMotion(savedMotion.current);
  }, []);

  const fail = (error: unknown) => setStatus({ tone: 'bad', text: error instanceof Error ? error.message : String(error) });
  const field = 'w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm';
  const card = 'rounded-xl bg-white p-6 shadow-ink-sm ring-1 ring-ink/10';

  const setSlide = (index: number, patch: Partial<HeroMediaItem>) =>
    setSlides((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const moveSlide = (index: number, delta: number) =>
    setSlides((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const upload = async (picked: FileList | null) => {
    if (!picked?.length) return;
    setBusy('upload');
    setStatus(null);
    try {
      const at = replaceAt.current;
      const uploaded: HeroMediaItem[] = [];
      for (const file of Array.from(picked)) {
        const url = await uploadAdminFile(file, 'hero-media');
        uploaded.push({ url, type: file.type.startsWith('video/') ? 'video' : 'image', alt: '' });
      }
      setSlides((list) => {
        if (at !== null) return list.map((item, i) => (i === at ? { ...item, ...uploaded[0] } : item));
        return [...list, ...uploaded].slice(0, MAX_HERO_MEDIA);
      });
    } catch (error) {
      fail(error);
    } finally {
      replaceAt.current = null;
      setBusy(null);
    }
  };

  const saveHero = async () => {
    if (!brand) return;
    setBusy('hero');
    setStatus(null);
    try {
      const heroMedia = slides.filter((item) => item.url.trim()).map((item) => ({ ...item, url: item.url.trim() }));
      if (!heroMedia.length) throw new Error(say({ en: 'Keep at least one photograph or video.', es: 'Deja al menos una foto o un video.' }));
      const next = { ...brand, heroMedia };
      await apiPut('brand', next);
      setBrand(next);
      setStatus({ tone: 'ok', text: say({ en: 'Hero background saved. Reload the home page to see it.', es: 'Fondo de portada guardado. Recarga la portada para verlo.' }) });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  const changeMotion = (patch: Partial<GalleryMotion>) => {
    const next = { ...motion, ...patch };
    setMotion(next);
    previewGalleryMotion(next);
  };

  const saveMotion = async () => {
    setBusy('motion');
    setStatus(null);
    try {
      await saveGalleryMotion(motion);
      savedMotion.current = motion;
      setStatus({ tone: 'ok', text: say({ en: 'Gallery motion saved.', es: 'Movimiento de galerías guardado.' }) });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper-warm py-6">
      <div className="container mx-auto max-w-5xl space-y-6 px-4">
        <header className={card}>
          <h1 className="font-display text-3xl uppercase text-ink">{say({ en: 'Look', es: 'Aspecto' })}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            {say({
              en: 'The background of the home page’s first screen, and how every photo reel and carousel on the site moves.',
              es: 'El fondo de la primera pantalla de la portada y cómo se mueven todas las cintas de fotos y carruseles del sitio.',
            })}
          </p>
        </header>

        {status && (
          <p className={`rounded-lg px-4 py-3 text-sm font-semibold ${status.tone === 'ok' ? 'bg-jungle-light/40 text-jungle-dark' : 'bg-hibiscus-light/30 text-hibiscus-dark'}`} role="status">
            {status.text}
          </p>
        )}

        {/* ── Hero background ── */}
        <section className={card}>
          <h2 className="text-xl font-bold text-ink">{say({ en: 'Home page background', es: 'Fondo de la portada' })}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {say({
              en: `Photographs and videos behind the big headline, shown one after another every 7 seconds (up to ${MAX_HERO_MEDIA}). One entry simply stays. Videos play muted and are only loaded on fast connections; landscape, at least 1600 px wide, works best.`,
              es: `Fotos y videos detrás del gran titular, uno tras otro cada 7 segundos (hasta ${MAX_HERO_MEDIA}). Con uno solo, se queda fijo. Los videos se reproducen sin sonido y solo se cargan con buena conexión; mejor en horizontal y de al menos 1600 px de ancho.`,
            })}
          </p>

          {loadError ? (
            <p className="mt-4 rounded-lg bg-hibiscus-light/30 px-4 py-3 text-sm text-hibiscus-dark">
              {say({ en: 'Could not read the brand record, so nothing can be saved here right now: ', es: 'No se pudo leer el registro de marca, así que aquí no se puede guardar ahora: ' })}
              {loadError}
            </p>
          ) : !brand ? (
            <p className="mt-4 text-sm text-ink-soft">…</p>
          ) : (
            <>
              <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {slides.map((item, index) => (
                  <li key={`${index}-${item.url}`} className="overflow-hidden rounded-lg ring-1 ring-ink/10">
                    <div className="relative aspect-video bg-ink">
                      {item.type === 'video' || isVideo(item.url) ? (
                        <video src={item.url} muted playsInline loop autoPlay preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      )}
                      <span className="absolute left-2 top-2 rounded bg-ink/80 px-2 py-0.5 text-xs font-bold text-white">
                        {index + 1} · {item.type === 'video' ? 'Video' : say({ en: 'Photo', es: 'Foto' })}
                      </span>
                    </div>
                    <div className="space-y-2 p-3">
                      <input className={field} value={item.url} onChange={(event) => setSlide(index, { url: event.target.value, type: isVideo(event.target.value) ? 'video' : item.type })} placeholder="https://…" />
                      <input className={field} value={item.alt ?? ''} onChange={(event) => setSlide(index, { alt: event.target.value })} placeholder={say({ en: 'What it shows (for screen readers)', es: 'Qué muestra (para lectores de pantalla)' })} />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select className="rounded-md border border-ink/15 bg-white px-2 py-1.5 text-sm" value={item.type} onChange={(event) => setSlide(index, { type: event.target.value as HeroMediaItem['type'] })}>
                          <option value="image">{say({ en: 'Photo', es: 'Foto' })}</option>
                          <option value="video">Video</option>
                        </select>
                        <button type="button" className="rounded-md p-2 ring-1 ring-ink/15 hover:bg-paper-warm" onClick={() => moveSlide(index, -1)} aria-label={say({ en: 'Earlier', es: 'Antes' })}><HiArrowUp /></button>
                        <button type="button" className="rounded-md p-2 ring-1 ring-ink/15 hover:bg-paper-warm" onClick={() => moveSlide(index, 1)} aria-label={say({ en: 'Later', es: 'Después' })}><HiArrowDown /></button>
                        <button
                          type="button"
                          className="rounded-md p-2 ring-1 ring-ink/15 hover:bg-paper-warm"
                          onClick={() => {
                            replaceAt.current = index;
                            files.current?.click();
                          }}
                          aria-label={say({ en: 'Replace with a file', es: 'Reemplazar con un archivo' })}
                        >
                          <HiUpload />
                        </button>
                        <button type="button" className="ml-auto rounded-md p-2 text-hibiscus-dark ring-1 ring-hibiscus-light hover:bg-hibiscus-light/30" onClick={() => setSlides((list) => list.filter((_, i) => i !== index))} aria-label={say({ en: 'Remove', es: 'Quitar' })}><HiTrash /></button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              <input ref={files} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(event) => { void upload(event.target.files); event.target.value = ''; }} />
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy === 'upload' || slides.length >= MAX_HERO_MEDIA}
                  onClick={() => {
                    replaceAt.current = null;
                    files.current?.click();
                  }}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-lagoon-dark ring-1 ring-lagoon-dark hover:bg-lagoon-dark hover:text-white disabled:opacity-50"
                >
                  <HiUpload /> {busy === 'upload' ? say({ en: 'Uploading…', es: 'Subiendo…' }) : say({ en: 'Upload photos or videos', es: 'Subir fotos o videos' })}
                </button>
                <button
                  type="button"
                  disabled={slides.length >= MAX_HERO_MEDIA}
                  onClick={() => setSlides((list) => [...list, { url: '', type: 'image', alt: '' }])}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-ink ring-1 ring-ink/20 hover:bg-paper-warm disabled:opacity-50"
                >
                  <HiPlus /> {say({ en: 'Add by URL', es: 'Añadir por URL' })}
                </button>
                <button type="button" onClick={() => setSlides(defaultHeroMedia)} className="rounded-full px-4 py-2 text-sm font-bold text-ink-soft ring-1 ring-ink/15 hover:bg-paper-warm">
                  {say({ en: 'Back to the defaults', es: 'Volver a los predeterminados' })}
                </button>
                <button type="button" disabled={busy === 'hero'} onClick={saveHero} className="ml-auto rounded-full bg-ink px-6 py-2 text-sm font-bold text-white hover:bg-ink-soft disabled:opacity-50">
                  {busy === 'hero' ? '…' : say({ en: 'Save background', es: 'Guardar fondo' })}
                </button>
              </div>
            </>
          )}
        </section>

        {/* ── Gallery motion ── */}
        <section className={card}>
          <h2 className="text-xl font-bold text-ink">{say({ en: 'How the galleries move', es: 'Cómo se mueven las galerías' })}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {say({
              en: 'For every photo reel (home page, tours, reviews, transfers) and every tour’s photo carousel. Changes show on the site straight away in this tab; save to publish them.',
              es: 'Para todas las cintas de fotos (portada, tours, reseñas, traslados) y el carrusel de fotos de cada tour. Los cambios se ven al instante en esta pestaña; guarda para publicarlos.',
            })}
          </p>

          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-bold text-ink">{say({ en: 'Direction', es: 'Dirección' })}</legend>
              <div className="mt-2 flex gap-2">
                {(['rtl', 'ltr'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeMotion({ direction: value })}
                    className={`rounded-full px-4 py-2 text-sm font-bold ring-1 ${motion.direction === value ? 'bg-ink text-white ring-ink' : 'text-ink ring-ink/20 hover:bg-paper-warm'}`}
                  >
                    {value === 'rtl' ? say({ en: '← Right to left', es: '← De derecha a izquierda' }) : say({ en: 'Left to right →', es: 'De izquierda a derecha →' })}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-bold text-ink">
              {say({ en: 'Speed', es: 'Velocidad' })}: {Math.round(motion.speed * 100)} %
              <input type="range" min={0.25} max={3} step={0.05} value={motion.speed} onChange={(event) => changeMotion({ speed: Number(event.target.value) })} className="mt-2 w-full accent-mango-dark" />
              <span className="block text-xs font-normal text-ink-soft">{say({ en: '100 % is the designed pace.', es: '100 % es el ritmo previsto.' })}</span>
            </label>

            <label className="block text-sm font-bold text-ink">
              {say({ en: 'Speed under the mouse', es: 'Velocidad bajo el ratón' })}: {Math.round(motion.hoverSlowdown * 100)} %
              <input type="range" min={0} max={1} step={0.05} value={motion.hoverSlowdown} onChange={(event) => changeMotion({ hoverSlowdown: Number(event.target.value) })} className="mt-2 w-full accent-mango-dark" />
              <span className="block text-xs font-normal text-ink-soft">
                {say({ en: '50 % halves the speed while the mouse is over a gallery; 0 % stops it.', es: '50 % reduce la velocidad a la mitad con el ratón encima; 0 % la detiene.' })}
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-ink">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={motion.followPointer} onChange={(event) => changeMotion({ followPointer: event.target.checked })} />
              <span>
                <strong>{say({ en: 'The mouse steers', es: 'El ratón dirige' })}</strong>
                <span className="block text-xs text-ink-soft">
                  {say({
                    en: 'With the mouse over a gallery, the half it is on sets the direction and lights up that side’s arrow; near the edge it runs faster.',
                    es: 'Con el ratón sobre una galería, la mitad en la que está marca la dirección e ilumina la flecha de ese lado; cerca del borde va más rápido.',
                  })}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-ink">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={motion.detailAutoplay} onChange={(event) => changeMotion({ detailAutoplay: event.target.checked })} />
              <span>
                <strong>{say({ en: 'Tour photos advance on their own', es: 'Las fotos de cada tour avanzan solas' })}</strong>
                <span className="block text-xs text-ink-soft">{say({ en: 'On a tour’s or a vehicle’s page.', es: 'En la página de un tour o un vehículo.' })}</span>
              </span>
            </label>

            <label className="block text-sm font-bold text-ink">
              {say({ en: 'Seconds per tour photo', es: 'Segundos por foto del tour' })}: {motion.detailSeconds}
              <input type="range" min={2} max={15} step={0.5} value={motion.detailSeconds} disabled={!motion.detailAutoplay} onChange={(event) => changeMotion({ detailSeconds: Number(event.target.value) })} className="mt-2 w-full accent-mango-dark disabled:opacity-40" />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => changeMotion(DEFAULT_GALLERY_MOTION)} className="rounded-full px-4 py-2 text-sm font-bold text-ink-soft ring-1 ring-ink/15 hover:bg-paper-warm">
              {say({ en: 'Back to the defaults', es: 'Volver a los predeterminados' })}
            </button>
            <button type="button" disabled={busy === 'motion'} onClick={saveMotion} className="ml-auto rounded-full bg-ink px-6 py-2 text-sm font-bold text-white hover:bg-ink-soft disabled:opacity-50">
              {busy === 'motion' ? '…' : say({ en: 'Save motion', es: 'Guardar movimiento' })}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminLook;
