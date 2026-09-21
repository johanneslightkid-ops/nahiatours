import React, { useEffect, useState } from 'react';
import { getTransferConfig, updateMunicipioPriceMultipliers } from '../../services/transferConfigService';
import { getAllMunicipios } from '../../data/municipioPriceMultipliers';
import type { TransferConfig } from '../../types/transport';

const MunicipioPriceAdminPanel: React.FC = () => {
  const [config, setConfig] = useState<TransferConfig | null>(null);
  const [draftMultipliers, setDraftMultipliers] = useState<Record<string, number> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const load = async () => {
      const transferConfig = await getTransferConfig();
      setConfig(transferConfig);
      setDraftMultipliers({ ...transferConfig.modifiers?.municipioMultipliers ?? {} });
    };

    load();
  }, []);

  const updateField = (municipio: string, value: string) => {
    if (!draftMultipliers) return;
    setDraftMultipliers({
      ...draftMultipliers,
      [municipio]: Math.max(0, Number(value) || 0),
    });
  };

  const handleSave = async () => {
    if (!config || !draftMultipliers) return;
    setSaving(true);
    setMessage('');
    try {
      const updatedConfig = await updateMunicipioPriceMultipliers(config, draftMultipliers);
      setConfig(updatedConfig);
      setDraftMultipliers({ ...updatedConfig.modifiers?.municipioMultipliers ?? {} });
      setMessage('Multiplicadores por municipio guardados.');
    } catch (error) {
      console.error(error);
      setMessage('No se pudieron guardar los multiplicadores.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    if (confirm('¿Devolver todos los multiplicadores a sus valores originales?')) {
      const defaults = getAllMunicipios().reduce((acc, municipio) => {
        acc[municipio] = config?.modifiers?.municipioMultipliers?.[municipio] ?? 1.0;
        return acc;
      }, {} as Record<string, number>);
      setDraftMultipliers(defaults);
    }
  };

  if (!draftMultipliers) {
    return (
      <div className="rounded-3xl bg-paper-card p-6 shadow-lg">
        <p className="text-ink-soft">Cargando los multiplicadores por municipio…</p>
      </div>
    );
  }

  const allMunicipios = getAllMunicipios();
  const filteredMunicipios = searchTerm
    ? allMunicipios.filter((m) => m.toLowerCase().includes(searchTerm.toLowerCase()))
    : allMunicipios;

  return (
    <div className="rounded-3xl bg-paper-card p-6 shadow-lg">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Multiplicadores por municipio</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Ajusta el multiplicador de precio de cada municipio. El precio por km se multiplica por el promedio del multiplicador de origen y el de destino.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResetAll}
            disabled={saving}
            className="rounded-full bg-slate-400 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Restablecer todo
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar multiplicadores'}
          </button>
        </div>
      </div>

      {message && (
        <p className={`mb-4 text-sm font-semibold ${message.includes('Error') ? 'text-red-600' : 'text-teal-600'}`}>
          {message}
        </p>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar municipio…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl border border-ink/15 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        />
      </div>

      <div className="max-h-96 overflow-y-auto">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {filteredMunicipios.map((municipio) => (
            <label key={municipio} className="space-y-1">
              <span className="text-xs font-semibold text-ink-soft">{municipio}</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={draftMultipliers[municipio] ?? 1.0}
                onChange={(e) => updateField(municipio, e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-light">
        Total municipios: {filteredMunicipios.length} {searchTerm ? `(filtered from ${allMunicipios.length})` : `of ${allMunicipios.length}`}
      </p>
    </div>
  );
};

export default MunicipioPriceAdminPanel;
