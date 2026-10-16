import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCheck,
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaSave,
  FaStar,
  FaTrash,
  FaUndo,
} from 'react-icons/fa';
import {
  getTestimonials,
  saveTestimonials,
  TestimonialRecord,
} from '../../services/testimonialService';

/**
 * Reseñas — the panel that did not exist.
 *
 * Reviews could be left and could be read, and there was nowhere at all to
 * correct a typo, remove one, or publish one somebody had sent. They arrive
 * unapproved now, so this is also the only place they become visible.
 */

const blank = (): TestimonialRecord => ({
  id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  email: '',
  review: '',
  rating: 5,
  createdAt: new Date().toISOString().slice(0, 10),
  approved: true,
});

const Stars: React.FC<{ value: number; onChange?: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange?.(n)}
        disabled={!onChange}
        aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
        className={`text-lg transition ${n <= value ? 'text-sunset' : 'text-ink/20'} ${
          onChange ? 'hover:scale-110' : 'cursor-default'
        }`}
      >
        <FaStar />
      </button>
    ))}
  </div>
);

const TestimonialsAdmin: React.FC = () => {
  const [items, setItems] = useState<TestimonialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState(false);
  /** The list as it was last loaded, so "descartar cambios" has something to go back to. */
  const [original, setOriginal] = useState<TestimonialRecord[]>([]);

  useEffect(() => {
    (async () => {
      const loaded = await getTestimonials();
      setItems(loaded);
      setOriginal(loaded);
      setLoading(false);
    })();
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(items) !== JSON.stringify(original),
    [items, original]
  );

  const pending = items.filter((t) => t.approved === false).length;

  const update = (id: string, patch: Partial<TestimonialRecord>) =>
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const remove = (id: string) => setItems((prev) => prev.filter((t) => t.id !== id));

  const save = async () => {
    setSaving(true);
    setProblem('');
    try {
      // Empty rows are the cost of an "add" button; they are dropped rather
      // than written, so a half-finished entry cannot reach the site.
      const cleaned = items.filter((t) => t.name.trim() && t.review.trim());
      await saveTestimonials(cleaned);
      setItems(cleaned);
      setOriginal(cleaned);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (error) {
      // The save used to swallow its own failure and report success. Never
      // again: if this did not reach KV, it says so.
      setProblem(
        `No se pudo guardar: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setSaving(false);
    }
  };

  const field =
    'w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-base text-ink outline-none transition focus:border-lagoon';
  const card = 'rounded-3xl border border-ink/12 bg-white p-5 shadow-sm';

  if (loading) {
    return <p className="p-8 text-center text-sm text-ink-light">Cargando reseñas…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-ink/12 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Reseñas</h2>
          <p className="mt-1 text-sm text-ink-light">
            {items.length} en total
            {pending > 0 && (
              <>
                {' · '}
                <strong className="text-sunset-dark">
                  {pending} esperando aprobación
                </strong>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setItems((prev) => [blank(), ...prev])}
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-bold text-ink-soft transition hover:border-lagoon hover:text-ink"
          >
            <FaPlus /> Añadir reseña
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => setItems(original)}
              className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-bold text-ink-soft transition hover:border-hibiscus"
            >
              <FaUndo /> Descartar cambios
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-full bg-jungle-dark px-6 py-2.5 text-sm font-bold uppercase tracking-[0.1em] text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {saved ? <><FaCheck /> Guardado</> : <><FaSave /> {saving ? 'Guardando…' : 'Guardar'}</>}
          </button>
        </div>
      </div>

      {problem && (
        <p className="rounded-2xl border border-hibiscus/40 bg-hibiscus/10 p-5 text-sm text-hibiscus-dark">
          {problem}
        </p>
      )}

      {items.length === 0 && (
        <p className="rounded-3xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink-light">
          Todavía no hay reseñas. Añade una, o espera a que un visitante deje la suya.
        </p>
      )}

      {items.map((t) => {
        const hidden = t.approved === false;
        return (
          <section
            key={t.id}
            className={`${card} ${hidden ? 'border-sunset/50 bg-sunset/5' : ''}`}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Stars value={t.rating} onChange={(v) => update(t.id, { rating: v })} />
                <span className="text-xs text-ink-light">{t.createdAt}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => update(t.id, { approved: hidden })}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    hidden
                      ? 'border-jungle bg-jungle/10 text-jungle-dark hover:brightness-95'
                      : 'border-ink/20 text-ink-soft hover:border-sunset'
                  }`}
                >
                  {hidden ? <><FaEye /> Publicar</> : <><FaEyeSlash /> Ocultar</>}
                </button>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-xs font-bold text-hibiscus-dark transition hover:border-hibiscus"
                >
                  <FaTrash /> Eliminar
                </button>
              </div>
            </div>

            {hidden && (
              <p className="mb-4 rounded-xl bg-sunset/15 px-4 py-2.5 text-xs font-semibold text-ink-soft">
                Esta reseña todavía no se ve en el sitio. La dejó un visitante y
                espera tu aprobación.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-light">
                  Nombre
                </span>
                <input
                  className={field}
                  value={t.name}
                  onChange={(e) => update(t.id, { name: e.target.value })}
                  placeholder="Quién la escribió"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-light">
                  Correo <span className="font-normal normal-case">(no se publica)</span>
                </span>
                <input
                  className={field}
                  value={t.email}
                  onChange={(e) => update(t.id, { email: e.target.value })}
                  placeholder="opcional"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-light">
                Reseña
              </span>
              <textarea
                className={`${field} min-h-[8rem] leading-relaxed`}
                value={t.review}
                onChange={(e) => update(t.id, { review: e.target.value })}
                placeholder="Lo que contaron sobre el día"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-ink-light">
                Foto (URL)
              </span>
              <div className="flex items-center gap-3">
                {t.profileImage && (
                  <img
                    src={t.profileImage}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                )}
                <input
                  className={field}
                  value={t.profileImage || ''}
                  onChange={(e) => update(t.id, { profileImage: e.target.value })}
                  placeholder="https://…"
                />
              </div>
            </label>
          </section>
        );
      })}
    </div>
  );
};

export default TestimonialsAdmin;
