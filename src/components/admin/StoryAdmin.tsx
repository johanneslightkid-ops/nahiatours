import React, { useState, useEffect, useCallback, useRef } from 'react';
import TranslateBar from './TranslateBar';
import {
  FaPlus,
  FaTrash,
  FaArrowUp,
  FaArrowDown,
  FaImage,
  FaVideo,
  FaHeading,
  FaParagraph,
  FaBullhorn,
  FaCheck,
  FaPen,
  FaTimes,
  FaUpload,
} from 'react-icons/fa';
import {
  StoryElement,
  StoryElementType,
  StoryElementsData,
  VideoOrientation,
  VideoSource,
  CTAButton,
  getStoryElements,
  saveStoryElements,
  uploadImage,
} from '../../services/storyElementsService';
import { JourneyLocale } from '../../services/introStoryService';
import MarkdownField from '../ui/MarkdownField';
import MarkdownRenderer from '../ui/MarkdownRenderer';

/**
 * The welcome-page editor.
 *
 * The version this replaces showed each block as a row of bare icon buttons
 * with a one-word label, and nothing else — so a page of six pictures was six
 * identical grey rows and the only way to find out which one you were about to
 * delete was to open it. Every button was an icon with no word next to it, and
 * the text fields were single-line inputs inside a cramped column.
 *
 * Three rules here:
 *   1. EVERY BLOCK SHOWS ITSELF. The image, the video still, the first lines
 *      of the text, the actual CTA buttons. You operate on what you can see.
 *   2. EVERY BUTTON SAYS WHAT IT DOES, in words as well as an icon.
 *   3. TYPING IS FULL WIDTH. Markdown gets a real field with a toolbar and a
 *      toggled preview, not a split pane on a 390px screen.
 */

const TYPE_META: Record<
  StoryElementType,
  { label: string; blurb: string; icon: React.ReactNode }
> = {
  title: {
    label: 'Título',
    blurb: 'Un encabezado con un texto de apoyo debajo.',
    icon: <FaHeading />,
  },
  paragraph: {
    label: 'Texto',
    blurb: 'Un bloque de texto con formato Markdown.',
    icon: <FaParagraph />,
  },
  picture: {
    label: 'Imagen',
    blurb: 'Una foto, subida o por enlace.',
    icon: <FaImage />,
  },
  video: {
    label: 'Video',
    blurb: 'Vimeo, TikTok, YouTube o un enlace propio.',
    icon: <FaVideo />,
  },
  cta: {
    label: 'Llamado a la acción',
    blurb: 'Un titular con botones que llevan a otra página.',
    icon: <FaBullhorn />,
  },
};

const ORDER: StoryElementType[] = ['title', 'paragraph', 'picture', 'video', 'cta'];

/** Never index the table directly: stored data has carried other spellings. */
const metaFor = (type: StoryElementType) => TYPE_META[type] ?? TYPE_META.paragraph;

/** A still for the block preview, where the platform offers one. */
const videoThumb = (url: string): string | null => {
  const yt = /(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([\w-]{6,})/.exec(url);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
  return null;
};

/** `element-${Date.now()}` collides when two blocks are added in one tick. */
const newId = () => `element-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const StoryAdmin: React.FC = () => {
  const [locale, setLocale] = useState<JourneyLocale>('en');
  const [storyData, setStoryData] = useState<StoryElementsData>({
    storyTitle: '',
    storyTagline: '',
    elements: [],
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const [addingAfter, setAddingAfter] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /**
   * A translation waiting to be shown, held across the language switch.
   *
   * Switching language reloads from storage, which is right every other time
   * and exactly wrong here: the whole point is to put the untranslated-yet
   * version of the other language ON SCREEN for review. So the translation is
   * parked here, the language flips, and this load hands it over instead of
   * fetching — once. Nothing is saved until the operator presses save.
   */
  const pendingTranslation = useRef<StoryElementsData | null>(null);

  const loadStory = useCallback(async () => {
    if (pendingTranslation.current) {
      setStoryData(pendingTranslation.current);
      pendingTranslation.current = null;
      setEditing(null);
      return;
    }
    const data = await getStoryElements(locale);
    setStoryData(data ?? { storyTitle: '', storyTagline: '', elements: [] });
    setEditing(null);
  }, [locale]);

  useEffect(() => {
    loadStory();
  }, [loadStory]);

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const saveStory = async () => {
    if (!storyData.storyTitle.trim()) {
      flash('error', 'Hace falta el título de la historia');
      return;
    }
    setIsSaving(true);
    try {
      const ok = await saveStoryElements(storyData, locale);
      flash(ok ? 'success' : 'error', ok ? '¡Historia guardada!' : 'No se pudo guardar la historia');
    } catch {
      flash('error', 'Error al guardar la historia');
    } finally {
      setIsSaving(false);
    }
  };

  const updateElement = (id: string, field: string, value: any) =>
    setStoryData((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, content: { ...el.content, [field]: value } } : el
      ),
    }));

  const addElement = (type: StoryElementType, afterId?: string) => {
    const at = afterId
      ? storyData.elements.findIndex((el) => el.id === afterId) + 1
      : storyData.elements.length;
    const element: StoryElement = { id: newId(), type, order: at, content: {} };
    const elements = [
      ...storyData.elements.slice(0, at),
      element,
      ...storyData.elements.slice(at),
    ].map((el, idx) => ({ ...el, order: idx }));

    setStoryData((prev) => ({ ...prev, elements }));
    setEditing(element.id);
    setAddingAfter(null);
  };

  const deleteElement = (id: string) => {
    const element = storyData.elements.find((el) => el.id === id);
    const name = element ? metaFor(element.type).label : 'bloque';
    if (!window.confirm(`¿Eliminar este bloque de ${name.toLowerCase()}? No se puede deshacer.`)) {
      return;
    }
    setStoryData((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id).map((el, idx) => ({ ...el, order: idx })),
    }));
    setEditing(null);
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    const index = storyData.elements.findIndex((el) => el.id === id);
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= storyData.elements.length) return;

    const elements = [...storyData.elements];
    [elements[index], elements[swap]] = [elements[swap], elements[index]];
    setStoryData((prev) => ({
      ...prev,
      elements: elements.map((el, idx) => ({ ...el, order: idx })),
    }));
  };

  const handleImageUpload = async (elementId: string, file: File) => {
    setUploading((prev) => ({ ...prev, [elementId]: 0 }));
    try {
      const url = await uploadImage(file, (percent) =>
        setUploading((prev) => ({ ...prev, [elementId]: percent }))
      );
      updateElement(elementId, 'imageUrl', url);
      flash('success', '¡Imagen subida!');
    } catch {
      flash('error', 'No se pudo subir la imagen. Revisa la configuración de Cloudinary.');
    } finally {
      setUploading((prev) => {
        const next = { ...prev };
        delete next[elementId];
        return next;
      });
    }
  };

  const updateButton = (elementId: string, buttonId: string, field: keyof CTAButton, value: string) => {
    const element = storyData.elements.find((el) => el.id === elementId);
    const buttons = (element?.content.buttons ?? []).map((b) =>
      b.id === buttonId ? { ...b, [field]: value } : b
    );
    updateElement(elementId, 'buttons', buttons);
  };

  // ── Shared classes ───────────────────────────────────────────────────────
  const action =
    'inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white px-3.5 py-2 text-xs font-bold text-ink-soft transition hover:border-lagoon hover:text-ink disabled:opacity-40';
  const field =
    'w-full rounded-2xl border border-ink/15 bg-white p-4 text-base leading-relaxed';
  const fieldLabel = 'mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light';

  /** What the block looks like, without opening it. */
  const preview = (element: StoryElement) => {
    const { content, type } = element;

    if (type === 'picture') {
      return content.imageUrl ? (
        <img
          src={content.imageUrl}
          alt=""
          loading="lazy"
          className="h-24 w-32 rounded-xl border border-ink/12 object-cover"
        />
      ) : (
        <div className="grid h-24 w-32 place-items-center rounded-xl border-2 border-dashed border-ink/20 text-center text-[0.65rem] font-bold text-ink-light">
          Sin imagen
        </div>
      );
    }

    if (type === 'video') {
      const thumb = content.videoUrl ? videoThumb(content.videoUrl) : null;
      return thumb ? (
        <img src={thumb} alt="" loading="lazy" className="h-24 w-32 rounded-xl border border-ink/12 object-cover" />
      ) : (
        <div className="grid h-24 w-32 place-items-center gap-1 rounded-xl border border-ink/12 bg-paper-warm text-ink-light">
          <FaVideo />
          <span className="text-[0.6rem] font-bold uppercase">
            {content.videoSource || 'video'}
          </span>
        </div>
      );
    }

    return (
      <div className="grid h-24 w-32 shrink-0 place-items-center rounded-xl bg-paper-warm text-2xl text-ink-light">
        {metaFor(type).icon}
      </div>
    );
  };

  const summary = (element: StoryElement) => {
    const { content, type } = element;
    if (type === 'title') {
      return (
        <>
          <p className="font-display text-lg font-bold text-ink">
            {content.title || <span className="text-ink-light">Sin título</span>}
          </p>
          {content.description && (
            <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{content.description}</p>
          )}
        </>
      );
    }
    if (type === 'paragraph') {
      return content.text ? (
        <div className="line-clamp-3 text-sm text-ink-soft">
          <MarkdownRenderer content={content.text.slice(0, 280)} />
        </div>
      ) : (
        <p className="text-sm text-ink-light">Sin texto</p>
      );
    }
    if (type === 'picture') {
      return (
        <p className="break-all text-xs text-ink-light">
          {content.imageUrl || 'Añade una imagen para verla aquí.'}
        </p>
      );
    }
    if (type === 'video') {
      return (
        <>
          <p className="text-sm font-bold text-ink">{content.title || 'Video sin título'}</p>
          <p className="mt-1 break-all text-xs text-ink-light">{content.videoUrl || 'Sin enlace'}</p>
        </>
      );
    }
    return (
      <>
        <p className="font-display text-lg font-bold text-ink">
          {content.title || <span className="text-ink-light">Sin titular</span>}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(content.buttons ?? []).map((b) => (
            <span
              key={b.id}
              className="rounded-full border border-ink/20 bg-mango px-3 py-1 text-xs font-bold text-ink"
            >
              {b.text || 'Botón sin texto'}
            </span>
          ))}
          {(content.buttons ?? []).length === 0 && (
            <span className="text-sm text-ink-light">Sin botones</span>
          )}
        </div>
      </>
    );
  };

  /** The "add a block" row — labelled, not a row of mystery icons. */
  const addBar = (afterId?: string) => (
    <div className="flex flex-wrap gap-2">
      {ORDER.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => addElement(type, afterId)}
          className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white px-4 py-2.5 text-sm font-bold text-ink-soft transition hover:border-lagoon hover:text-ink"
          title={TYPE_META[type].blurb}
        >
          <FaPlus className="h-3 w-3" />
          {TYPE_META[type].icon}
          {TYPE_META[type].label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Translate what is open into the other language and SHOW it there,
          unsaved, so it can be read before it goes anywhere near the site. */}
      <TranslateBar
        value={storyData}
        from={locale === 'en' ? 'en' : 'es'}
        what="la página de inicio"
        note="Traduce lo que tienes abierto y lo abre en el otro idioma para que lo revises. No se guarda hasta que pulses Guardar."
        disabled={storyData.elements.length === 0 && !storyData.storyTitle}
        onTranslated={(translated, to) => {
          pendingTranslation.current = translated as StoryElementsData;
          setLocale(to as JourneyLocale);
          return `Abierto en ${to === 'en' ? 'inglés' : 'español'}. Revísalo y pulsa Guardar.`;
        }}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-3xl border border-ink/12 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Página de bienvenida</h2>
          <p className="mt-1 text-sm text-ink-light">
            Los bloques se muestran en la portada, en este orden.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-paper-warm p-1">
            {(['en', 'es'] as JourneyLocale[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  locale === code ? 'bg-white text-ink shadow-sm' : 'text-ink-light'
                }`}
              >
                {code === 'en' ? 'Inglés' : 'Español'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={saveStory}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-jungle-dark px-6 py-3 text-sm font-bold uppercase tracking-[0.1em] text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {isSaving ? 'Guardando…' : <><FaCheck /> Guardar historia</>}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            message.type === 'success'
              ? 'border-jungle/40 bg-jungle/10 text-jungle-dark'
              : 'border-hibiscus/40 bg-hibiscus/10 text-hibiscus-dark'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Story header ────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-ink/12 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="mb-4 text-lg font-bold text-ink">Cabecera de la historia</h3>
        <div className="grid gap-4">
          <div>
            <label className={fieldLabel}>Título de la historia</label>
            <input
              type="text"
              value={storyData.storyTitle}
              onChange={(event) => setStoryData((p) => ({ ...p, storyTitle: event.target.value }))}
              placeholder="Escribe el título principal"
              className={field}
            />
          </div>
          <div>
            <label className={fieldLabel}>Frase de la historia</label>
            <input
              type="text"
              value={storyData.storyTagline}
              onChange={(event) => setStoryData((p) => ({ ...p, storyTagline: event.target.value }))}
              placeholder="Una línea que resuma el día"
              className={field}
            />
          </div>
        </div>
      </section>

      {/* ── Blocks ──────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-ink/12 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-ink">Bloques de la página</h3>
          <p className="text-sm text-ink-light">
            Elige qué añadir. Cada bloque se puede mover, editar o eliminar.
          </p>
        </div>

        {addBar()}

        <div className="mt-6 space-y-4">
          {storyData.elements.length === 0 && (
            <p className="rounded-2xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink-light">
              Todavía no hay bloques. Usa los botones de arriba para añadir el primero.
            </p>
          )}

          {storyData.elements.map((element, index) => {
            const isEditing = editing === element.id;
            const meta = metaFor(element.type);
            const progress = uploading[element.id];

            return (
              <div key={element.id}>
                <div
                  className={`rounded-2xl border bg-white p-4 transition ${
                    isEditing ? 'border-lagoon shadow-md' : 'border-ink/12'
                  }`}
                >
                  {/* Summary row: what it is, what it looks like, what you can do. */}
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {preview(element)}

                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-warm px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-ink-light">
                        {index + 1} · {meta.icon} {meta.label}
                      </span>
                      <div className="mt-2">{summary(element)}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-col">
                      <button
                        type="button"
                        onClick={() => setEditing(isEditing ? null : element.id)}
                        className={action}
                      >
                        {isEditing ? <><FaTimes /> Cerrar</> : <><FaPen /> Editar</>}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveElement(element.id, 'up')}
                        disabled={index === 0}
                        className={action}
                      >
                        <FaArrowUp /> Subir
                      </button>
                      <button
                        type="button"
                        onClick={() => moveElement(element.id, 'down')}
                        disabled={index === storyData.elements.length - 1}
                        className={action}
                      >
                        <FaArrowDown /> Bajar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteElement(element.id)}
                        className={`${action} !text-hibiscus-dark hover:!border-hibiscus`}
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Editor */}
                  {isEditing && (
                    <div className="mt-5 space-y-4 border-t border-ink/10 pt-5">
                      {element.type === 'title' && (
                        <>
                          <div>
                            <label className={fieldLabel}>Título</label>
                            <input
                              type="text"
                              value={element.content.title || ''}
                              onChange={(e) => updateElement(element.id, 'title', e.target.value)}
                              placeholder="Escribe el título"
                              className={field}
                            />
                          </div>
                          <div>
                            <label className={fieldLabel}>Texto de apoyo</label>
                            <textarea
                              value={element.content.description || ''}
                              onChange={(e) => updateElement(element.id, 'description', e.target.value)}
                              rows={3}
                              placeholder="Una o dos frases debajo del título"
                              className={field}
                            />
                          </div>
                        </>
                      )}

                      {element.type === 'paragraph' && (
                        <MarkdownField
                          label="Texto"
                          hint="Negrita, subtítulos, listas y enlaces. Toca “Vista previa” para verlo como quedará."
                          value={element.content.text || ''}
                          onChange={(value) => updateElement(element.id, 'text', value)}
                          placeholder="Escribe el párrafo…"
                          minRem={14}
                        />
                      )}

                      {element.type === 'picture' && (
                        <>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[element.id]?.click()}
                              disabled={progress !== undefined}
                              className="inline-flex items-center gap-2 rounded-full bg-lagoon-dark px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                            >
                              <FaUpload />
                              {progress !== undefined ? `Subiendo ${Math.round(progress)}%` : 'Subir imagen'}
                            </button>
                            <input
                              ref={(ref) => {
                                fileInputRefs.current[element.id] = ref;
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(element.id, file);
                                e.target.value = '';
                              }}
                            />
                            {element.content.imageUrl && (
                              <button
                                type="button"
                                onClick={() => updateElement(element.id, 'imageUrl', '')}
                                className={action}
                              >
                                <FaTrash /> Quitar imagen
                              </button>
                            )}
                          </div>
                          <div>
                            <label className={fieldLabel}>…o pega un enlace</label>
                            <input
                              type="text"
                              value={element.content.imageUrl || ''}
                              onChange={(e) => updateElement(element.id, 'imageUrl', e.target.value)}
                              placeholder="https://…"
                              className={field}
                            />
                          </div>
                          {element.content.imageUrl && (
                            <img
                              src={element.content.imageUrl}
                              alt=""
                              className="max-h-72 w-full rounded-2xl border border-ink/12 object-cover"
                            />
                          )}
                        </>
                      )}

                      {element.type === 'video' && (
                        <>
                          <div>
                            <label className={fieldLabel}>Título del video</label>
                            <input
                              type="text"
                              value={element.content.title || ''}
                              onChange={(e) => updateElement(element.id, 'title', e.target.value)}
                              className={field}
                            />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className={fieldLabel}>Fuente</label>
                              <select
                                value={element.content.videoSource || 'vimeo'}
                                onChange={(e) =>
                                  updateElement(element.id, 'videoSource', e.target.value as VideoSource)
                                }
                                className={field}
                              >
                                <option value="vimeo">Vimeo</option>
                                <option value="tiktok">TikTok</option>
                                <option value="youtube">YouTube</option>
                                <option value="custom">Enlace propio</option>
                              </select>
                            </div>
                            <div>
                              <label className={fieldLabel}>Orientación</label>
                              <select
                                value={element.content.videoOrientation || 'horizontal'}
                                onChange={(e) =>
                                  updateElement(
                                    element.id,
                                    'videoOrientation',
                                    e.target.value as VideoOrientation
                                  )
                                }
                                className={field}
                              >
                                <option value="horizontal">Horizontal</option>
                                <option value="vertical">Vertical</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className={fieldLabel}>Enlace del video</label>
                            <input
                              type="text"
                              value={element.content.videoUrl || ''}
                              onChange={(e) => updateElement(element.id, 'videoUrl', e.target.value)}
                              placeholder="https://…"
                              className={field}
                            />
                          </div>
                        </>
                      )}

                      {element.type === 'cta' && (
                        <>
                          <div>
                            <label className={fieldLabel}>Titular</label>
                            <input
                              type="text"
                              value={element.content.title || ''}
                              onChange={(e) => updateElement(element.id, 'title', e.target.value)}
                              placeholder="ej.: ¿Listo para tu aventura?"
                              className={field}
                            />
                          </div>
                          <div>
                            <label className={fieldLabel}>Texto</label>
                            <textarea
                              value={element.content.description || ''}
                              onChange={(e) => updateElement(element.id, 'description', e.target.value)}
                              rows={3}
                              className={field}
                            />
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <span className={fieldLabel}>Botones</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateElement(element.id, 'buttons', [
                                    ...(element.content.buttons ?? []),
                                    { id: newId(), text: '', link: '/tours', variant: 'primary' },
                                  ])
                                }
                                className={action}
                              >
                                <FaPlus /> Añadir botón
                              </button>
                            </div>

                            <div className="space-y-3">
                              {(element.content.buttons ?? []).map((button) => (
                                <div
                                  key={button.id}
                                  className="grid gap-3 rounded-2xl border border-ink/12 p-3 sm:grid-cols-[1fr,1fr,auto]"
                                >
                                  <input
                                    type="text"
                                    value={button.text}
                                    onChange={(e) =>
                                      updateButton(element.id, button.id, 'text', e.target.value)
                                    }
                                    placeholder="Texto del botón"
                                    className={field}
                                  />
                                  <input
                                    type="text"
                                    value={button.link}
                                    onChange={(e) =>
                                      updateButton(element.id, button.id, 'link', e.target.value)
                                    }
                                    placeholder="/tours o https://…"
                                    className={field}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateElement(
                                        element.id,
                                        'buttons',
                                        (element.content.buttons ?? []).filter((b) => b.id !== button.id)
                                      )
                                    }
                                    className={`${action} !text-hibiscus-dark`}
                                  >
                                    <FaTrash /> Quitar
                                  </button>
                                </div>
                              ))}
                              {(element.content.buttons ?? []).length === 0 && (
                                <p className="text-sm text-ink-light">
                                  Sin botones todavía. Usa “Añadir botón”.
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Insert a block right here, rather than only at the end. */}
                <div className="mt-2 flex justify-center">
                  {addingAfter === element.id ? (
                    <div className="w-full rounded-2xl border border-dashed border-lagoon/60 p-3">
                      {addBar(element.id)}
                      <button
                        type="button"
                        onClick={() => setAddingAfter(null)}
                        className="mt-2 text-xs font-bold text-ink-light hover:text-ink"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingAfter(element.id)}
                      className="rounded-full border border-dashed border-ink/25 px-4 py-1.5 text-xs font-bold text-ink-light transition hover:border-lagoon hover:text-ink"
                    >
                      + Insertar un bloque aquí
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default StoryAdmin;
