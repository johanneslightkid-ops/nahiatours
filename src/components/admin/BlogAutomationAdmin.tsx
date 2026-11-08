import React, { useEffect, useState } from 'react';
import {
  DEFAULT_BLOG_AUTOMATION_CONFIG,
  type BlogAutomationConfig,
  type BlogAutomationInterval,
} from '../../../shared/blogAutomation';
import { loadBlogAutomation, saveBlogAutomation } from '../../services/blogAutomationService';

const formatDate = (value: string | null): string => {
  if (!value) return 'Todavía no se ha ejecutado';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santo_Domingo' }).format(date);
};

const STATUS_LABEL: Record<BlogAutomationConfig['lastStatus'], string> = {
  never: 'Sin ejecuciones',
  running: 'En curso',
  success: 'Completado',
  failed: 'Falló',
};

const nextRunAt = (config: BlogAutomationConfig): string | null => {
  if (!config.enabled || !config.lastRunStartedAt) return null;
  const started = Date.parse(config.lastRunStartedAt);
  return Number.isFinite(started)
    ? new Date(started + config.intervalHours * 60 * 60 * 1000).toISOString()
    : null;
};

const BlogAutomationAdmin: React.FC = () => {
  const [config, setConfig] = useState<BlogAutomationConfig>(DEFAULT_BLOG_AUTOMATION_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    loadBlogAutomation()
      .then(setConfig)
      .catch((error: unknown) => setProblem(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setProblem('');
    setNotice('');
    try {
      setConfig(await saveBlogAutomation({
        enabled: config.enabled,
        intervalHours: config.intervalHours,
      }));
      setNotice('Preferencias de automatización guardadas.');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20';

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span aria-hidden="true" className="rounded-2xl bg-lagoon/10 px-3 py-2 text-sm font-black text-lagoon-dark">IA</span>
        <div>
          <h2 className="text-2xl font-bold text-ink">Generación automática de artículos</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-light">
            El Worker se activa cada seis horas (UTC). Al habilitarlo, el primer artículo puede tardar hasta seis horas; después genera según el ritmo elegido. Cada ejecución crea un artículo en inglés, español, francés y alemán, elige fotos compatibles del catálogo y guarda las cuatro versiones como borradores ocultos.
          </p>
        </div>
      </header>

      <section className="grid gap-5 rounded-2xl border border-ink/10 bg-white p-5 md:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={config.enabled}
            disabled={loading || saving}
            onChange={(event) => setConfig((current) => ({ ...current, enabled: event.target.checked }))}
            className="mt-1 h-4 w-4 accent-lagoon-dark"
          />
          <span>
            <strong className="block text-ink">Activar el generador automático</strong>
            <span className="mt-1 block text-xs text-ink-light">Desactivado por defecto. Los borradores nunca se publican sin revisión.</span>
          </span>
        </label>

        <label className="space-y-1 text-sm font-semibold text-ink">
          <span className="block">Generar cada</span>
          <select
            value={config.intervalHours}
            disabled={loading || saving}
            onChange={(event) => setConfig((current) => ({
              ...current,
              intervalHours: Number(event.target.value) as BlogAutomationInterval,
            }))}
            className={inputClass}
          >
            <option value={6}>6 horas</option>
            <option value={12}>12 horas</option>
            <option value={24}>24 horas</option>
          </select>
          <span className="block text-xs font-normal text-ink-light">El cron de seis horas usa UTC; los intervalos largos omiten los turnos intermedios.</span>
        </label>

        <div className="space-y-2 border-t border-ink/10 pt-4 md:col-span-2">
          <h3 className="font-bold text-ink">Última ejecución</h3>
          <p className="text-sm text-ink-soft">
            Estado: <strong>{STATUS_LABEL[config.lastStatus]}</strong>
            {' · '}Intento: {formatDate(config.lastRunStartedAt)}
            {config.lastRunAt ? ` · Último éxito: ${formatDate(config.lastRunAt)}` : ''}
          </p>
          <p className="text-sm text-ink-soft">
            Próxima ejecución: {config.enabled
              ? formatDate(nextRunAt(config)) || 'en el próximo turno de seis horas'
              : 'pausada'}
          </p>
          {config.lastArticleTitle && (
            <p className="text-sm text-ink-soft">
              Artículo: <strong>{config.lastArticleTitle}</strong> · Excursión: {config.lastTourTitle}
            </p>
          )}
          {config.lastProvider && (
            <p className="text-xs text-ink-light">Proveedor/modelo usado: {config.lastProvider} · {config.lastModel}</p>
          )}
          {config.lastError && (
            <p className="whitespace-pre-wrap rounded-xl bg-hibiscus/10 p-3 text-sm font-semibold text-hibiscus-dark">
              {config.lastError}
            </p>
          )}
          <p className="text-xs text-ink-light">Ejecuciones correctas: {config.runCount}. Las imágenes se seleccionan por etiquetas, excursión y perfil editorial; si no hay coincidencias, el artículo se genera sin fotos.</p>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void save()}
        disabled={loading || saving}
        className="inline-flex items-center gap-2 rounded-full bg-lagoon-dark px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {loading ? 'Cargando…' : saving ? 'Guardando…' : 'Guardar preferencias'}
      </button>
      {notice && <p role="status" className="rounded-xl bg-jungle/10 p-3 text-sm font-semibold text-jungle-dark">{notice}</p>}
      {problem && <p role="alert" className="whitespace-pre-wrap rounded-xl bg-hibiscus/10 p-3 text-sm font-semibold text-hibiscus-dark">{problem}</p>}
    </div>
  );
};

export default BlogAutomationAdmin;
