import React, { useEffect, useRef, useState } from 'react';
import {
  getTransferConfig,
  saveTransferConfig,
  uploadVehicleImage,
  vehicleText,
} from '../../services/transferConfigService';
import type { TransferConfig, VehicleType } from '../../types/transport';
import { useI18n, SUPPORTED_LOCALES } from '../../contexts/I18nContext';
import TranslateBar from './TranslateBar';
import { Lang, LANG_NAME } from '../../lib/autoTranslate';

/**
 * The fleet.
 *
 * Every other piece of this already existed — `VehicleType.image` in the type,
 * `uploadVehicleImage()` in the service, `/api/upload` on the Worker, and the
 * Transport page rendering `selectedVehicle.image` — but nothing ever put a
 * file picker on screen, so the images could not be set from the admin at all.
 * This is that missing half.
 *
 * Edits are held as a draft and written in one `saveTransferConfig` call, the
 * way the other panels here behave: the pricing numbers and the labels want to
 * be changed together and committed once. Uploads are the exception and happen
 * immediately, because an upload has to return a URL before there is anything
 * to put in the draft.
 *
 * Name and description are kept per language: the base fields are the text
 * every language falls back to, and "Traducciones" holds one copy per site
 * language. The translate strip fills those from whatever language the admin
 * is being viewed in, and saves straight away, like the other panels' strips.
 */

type VehicleCopy = { label: string; description: string };

/** Keys are how a saved booking refers to a vehicle, so they have to be URL-safe. */

const BLANK: VehicleType = {
  key: '',
  label: '',
  multiplier: 1,
  pricePerKmMultiplier: 1,
  maxPassengers: 4,
  typicalPassengers: [1, 2],
  description: '',
  image: '',
};

const toKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const VehicleAdminPanel: React.FC = () => {
  const { locale } = useI18n();
  const [config, setConfig] = useState<TransferConfig | null>(null);
  const [draft, setDraft] = useState<VehicleType[] | null>(null);
  /** The latest draft, for the translate strip, which saves once per language in a row. */
  const draftRef = useRef<VehicleType[] | null>(null);
  draftRef.current = draft;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getTransferConfig().then((transferConfig) => {
      setConfig(transferConfig);
      setDraft(transferConfig.vehicleTypes.map((vt) => ({ ...vt })));
    });
  }, []);

  const updateTranslation = (index: number, lang: string, patch: Partial<VehicleCopy>) => {
    setDraft((current) =>
      current
        ? current.map((vt, i) =>
            i === index
              ? { ...vt, translations: { ...vt.translations, [lang]: { ...vt.translations?.[lang], ...patch } } }
              : vt
          )
        : current
    );
  };

  const update = (index: number, patch: Partial<VehicleType>) => {
    setDraft((current) =>
      current ? current.map((vt, i) => (i === index ? { ...vt, ...patch } : vt)) : current
    );
  };

  const handleUpload = async (index: number, file: File) => {
    setUploading(index);
    setMessage('');
    const url = await uploadVehicleImage(file);
    setUploading(null);
    if (!url) {
      // uploadVehicleImage swallows its own errors and returns '', so an empty
      // string is the only signal there is that something went wrong.
      setMessage('No se pudo subir la imagen. Revisa que sigues con la sesión abierta e inténtalo otra vez.');
      return;
    }
    update(index, { image: url });
  };

  const addVehicle = () => {
    setDraft((current) => (current ? [...current, { ...BLANK }] : [{ ...BLANK }]));
  };

  const removeVehicle = (index: number) => {
    setDraft((current) => (current ? current.filter((_, i) => i !== index) : current));
  };

  /** Validate and key a fleet, or say what is wrong with it. */
  const prepare = (vehicles: VehicleType[]): { ok: true; keyed: VehicleType[] } | { ok: false; error: string } => {
    const missingLabel = vehicles.findIndex((vt) => !vt.label.trim());
    if (missingLabel !== -1) {
      return { ok: false, error: `El vehículo ${missingLabel + 1} necesita un nombre antes de guardarlo.` };
    }

    // A blank key on a new vehicle is derived from its name; an existing key is
    // never rewritten, because saved bookings and the planner refer to it.
    const keyed = vehicles.map((vt) => ({ ...vt, key: vt.key || toKey(vt.label) }));

    const duplicate = keyed.find((vt, i) => keyed.findIndex((o) => o.key === vt.key) !== i);
    if (duplicate) {
      return { ok: false, error: `Dos vehículos comparten el id "${duplicate.key}" — cambia el nombre de uno.` };
    }
    return { ok: true, keyed };
  };

  const persist = async (vehicles: VehicleType[]) => {
    if (!config) throw new Error('La configuración aún no ha cargado.');
    const prepared = prepare(vehicles);
    if (!prepared.ok) throw new Error(prepared.error);
    await saveTransferConfig({ ...config, vehicleTypes: prepared.keyed });
    setConfig({ ...config, vehicleTypes: prepared.keyed });
    const next = prepared.keyed.map((vt) => ({ ...vt }));
    draftRef.current = next;
    setDraft(next);
  };

  const save = async () => {
    if (!config || !draft) return;
    setSaving(true);
    setMessage('');
    try {
      await persist(draft);
      setMessage('Guardado.');
    } catch (error) {
      setMessage(`No se pudo guardar: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  /** The translate strip hands back one language at a time; each is saved as it arrives. */
  const saveTranslation = async (copies: VehicleCopy[], to: Lang) => {
    const current = draftRef.current ?? [];
    const next = current.map((vt, i) =>
      copies[i]
        ? { ...vt, translations: { ...vt.translations, [to]: { label: copies[i].label, description: copies[i].description } } }
        : vt
    );
    await persist(next);
    return `${LANG_NAME[to]}: guardado`;
  };

  if (!draft) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-slate-500">Cargando la flota…</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Vehículos</h2>
          <p className="mt-1 text-sm text-slate-500">
            La flota de la página de traslados. La foto es lo que ve el visitante al elegir el
            vehículo; el nombre y la descripción se muestran en su idioma.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span
              className={`text-sm font-semibold ${
                message === 'Guardado.' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {message}
            </span>
          )}
          <button
            onClick={addVehicle}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Agregar vehículo
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar vehículos'}
          </button>
        </div>
      </div>

      <TranslateBar<VehicleCopy[]>
        value={draft.map((vt) => vehicleText(vt, locale))}
        from={locale as Lang}
        what="los nombres y descripciones de los vehículos"
        note="Traduce nombre y descripción de cada vehículo, tal como se ven en el idioma actual del panel, a los demás idiomas del sitio, y los guarda."
        disabled={draft.length === 0}
        onTranslated={(translated, to) => saveTranslation(translated, to)}
      />

      <div className="space-y-4">
        {draft.map((vehicle, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px,1fr]">
              {/* Picture */}
              <div className="space-y-2">
                <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                  {vehicle.image ? (
                    <img
                      src={vehicle.image}
                      alt={vehicle.label || 'Vehicle'}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-2 text-center text-xs uppercase tracking-[0.18em] text-slate-400">
                      Sin foto
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading === index}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) await handleUpload(index, file);
                    // Let the same file be chosen again after a failure.
                    event.target.value = '';
                  }}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                />
                {uploading === index && (
                  <p className="text-xs font-semibold text-slate-500">Subiendo…</p>
                )}
                <input
                  type="text"
                  value={vehicle.image ?? ''}
                  onChange={(event) => update(index, { image: event.target.value })}
                  placeholder="…o pega el enlace de una imagen"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              {/* Everything else */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Nombre
                    </span>
                    <input
                      type="text"
                      value={vehicle.label}
                      onChange={(event) => update(index, { label: event.target.value })}
                      placeholder="SUV / Familiar"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Id {vehicle.key && <span className="normal-case">(fijo una vez guardado)</span>}
                    </span>
                    <input
                      type="text"
                      value={vehicle.key}
                      onChange={(event) => update(index, { key: toKey(event.target.value) })}
                      placeholder="sale del nombre"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 font-mono text-sm"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Descripción
                  </span>
                  <textarea
                    value={vehicle.description}
                    onChange={(event) => update(index, { description: event.target.value })}
                    rows={2}
                    placeholder="Amplia para familias o grupos de hasta 5"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                  />
                </label>

                <details className="rounded-2xl border border-slate-200 px-4 py-2">
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-500">
                    Traducciones ({SUPPORTED_LOCALES.map((l) => l.toUpperCase()).join(' · ')})
                  </summary>
                  <p className="mt-2 text-xs text-slate-500">
                    Lo que quede vacío muestra el nombre y la descripción de arriba.
                  </p>
                  <div className="mt-3 space-y-3">
                    {SUPPORTED_LOCALES.map((lang) => (
                      <div key={lang} className="grid grid-cols-1 gap-2 sm:grid-cols-[3rem,1fr,2fr] sm:items-start">
                        <span className="pt-2 text-xs font-bold text-slate-500">{lang.toUpperCase()}</span>
                        <input
                          type="text"
                          value={vehicle.translations?.[lang]?.label ?? ''}
                          onChange={(event) => updateTranslation(index, lang, { label: event.target.value })}
                          placeholder={vehicle.label || 'Nombre'}
                          aria-label={`Nombre (${lang})`}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        />
                        <textarea
                          value={vehicle.translations?.[lang]?.description ?? ''}
                          onChange={(event) => updateTranslation(index, lang, { description: event.target.value })}
                          placeholder={vehicle.description || 'Descripción'}
                          aria-label={`Descripción (${lang})`}
                          rows={2}
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </details>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Pasajeros máximos
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={vehicle.maxPassengers}
                      onChange={(event) =>
                        update(index, { maxPassengers: Math.max(1, Number(event.target.value) || 1) })
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Multiplicador de precio
                    </span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={vehicle.multiplier}
                      onChange={(event) =>
                        update(index, { multiplier: Math.max(0, Number(event.target.value) || 0) })
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Multiplicador por km
                    </span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={vehicle.pricePerKmMultiplier ?? 1}
                      onChange={(event) =>
                        update(index, {
                          pricePerKmMultiplier: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      onClick={() => removeVehicle(index)}
                      className="w-full rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {draft.length === 0 && (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          No hay vehículos. Agrega uno, o guarda la flota vacía para volver a los valores por defecto.
        </p>
      )}
    </section>
  );
};

export default VehicleAdminPanel;
