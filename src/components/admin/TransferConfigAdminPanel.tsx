import React, { useEffect, useState } from 'react';
import { getTransferConfig, updateModifiers } from '../../services/transferConfigService';
import type { TransferConfig } from '../../types/transport';

const formatNumber = (value: number | undefined | null) =>
  value === undefined || value === null ? '' : String(value);

const TransferConfigAdminPanel: React.FC = () => {
  const [config, setConfig] = useState<TransferConfig | null>(null);
  const [draftModifiers, setDraftModifiers] = useState<TransferConfig['modifiers'] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      const transferConfig = await getTransferConfig();
      setConfig(transferConfig);
      setDraftModifiers({ ...transferConfig.modifiers });
    };

    load();
  }, []);

  const updateField = (field: keyof TransferConfig['modifiers'], value: string) => {
    if (!draftModifiers) return;
    setDraftModifiers({
      ...draftModifiers,
      [field]: Number(value),
    });
  };

  const handleSave = async () => {
    if (!config || !draftModifiers) return;
    setSaving(true);
    setMessage('');
    try {
      const updatedConfig = await updateModifiers(config, draftModifiers);
      setConfig(updatedConfig);
      setDraftModifiers({ ...updatedConfig.modifiers });
      setMessage('Tarifas de traslado guardadas.');
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (!draftModifiers) {
    return (
      <div className="rounded-3xl bg-paper-card p-6 shadow-lg">
        <p className="text-ink-soft">Cargando las tarifas de traslado…</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-paper-card p-6 shadow-lg">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Tarifas de traslado</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Controla cómo se calcula el precio por distancia y cómo bajan los descuentos en rutas largas.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-ink-light">
            Los valores por defecto están ajustados para que ~180 km salgan en unos USD 170 y ~400 km en unos USD 380, a USD 1.30/km.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Precio base por km</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={formatNumber(draftModifiers.pricePerKm)}
            onChange={(event) => updateField('pricePerKm', event.target.value)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Precio mínimo por distancia</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={formatNumber(draftModifiers.minimumPrice)}
            onChange={(event) => updateField('minimumPrice', event.target.value)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Descuento máximo por distancia (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={formatNumber(draftModifiers.distanceDiscountMaxPercent)}
            onChange={(event) => updateField('distanceDiscountMaxPercent', event.target.value)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Ritmo del descuento por distancia (km)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={formatNumber(draftModifiers.distanceDiscountSaturationKm)}
            onChange={(event) => updateField('distanceDiscountSaturationKm', event.target.value)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
          <span className="block text-xs leading-relaxed text-ink-soft">
            Cuanto más largo el viaje, más barato sale cada km. El descuento crece rápido al principio y se acerca poco a poco al
            máximo de arriba: con esta distancia ya va por el 63 % del máximo, con el doble por el 86 %, con el triple por el 95 %.
            Un número menor da el descuento antes (viajes cortos más baratos); uno mayor lo reserva para los viajes largos.
          </span>
        </label>
        {(() => {
          // The same formula as the price calculator (services/transferPricingEngine.ts).
          const max = Number(draftModifiers.distanceDiscountMaxPercent) || 0;
          const pace = Math.max(1, Number(draftModifiers.distanceDiscountSaturationKm) || 1);
          const at = (km: number) => max * (1 - Math.exp(-km / pace));
          return (
            <div className="space-y-2 rounded-2xl bg-paper-warm/70 p-4 md:col-span-2">
              <span className="text-sm font-semibold text-ink-soft">Así queda el descuento por km con estos valores</span>
              <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                {[5, 15, 30, 60, 100, 200].map((km) => (
                  <div key={km} className="rounded-xl bg-white px-2 py-2 ring-1 ring-ink/10">
                    <span className="block text-xs text-ink-soft">{km} km</span>
                    <span className="font-bold text-ink">−{at(km).toFixed(1)} %</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Multiplicador de descuento ida y vuelta</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={formatNumber(draftModifiers.roundTripDiscount)}
            onChange={(event) => updateField('roundTripDiscount', event.target.value)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Multiplicador de traslado nocturno</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={formatNumber(draftModifiers.nightFeeMultiplier)}
            onChange={(event) => updateField('nightFeeMultiplier', event.target.value)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Espera por hora</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={formatNumber(draftModifiers.waitingPerHour)}
            onChange={(event) => updateField('waitingPerHour', event.target.value)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Cargo por silla de niño</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={formatNumber(draftModifiers.childSeat)}
            onChange={(event) => updateField('childSeat', event.target.value)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Multiplicador de margen</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={formatNumber(draftModifiers.priceMarkup)}
            onChange={(event) => updateField('priceMarkup', event.target.value)}
            className="w-full rounded-2xl border border-ink/15 px-4 py-3"
          />
        </label>
      </div>

      {message && <p className="mt-4 text-sm text-ink-soft">{message}</p>}
    </div>
  );
};

export default TransferConfigAdminPanel;
