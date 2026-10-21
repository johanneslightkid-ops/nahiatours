import React, { useState, useEffect } from 'react';
import { FaRobot, FaKey, FaSave, FaCheck } from 'react-icons/fa';
import {
  AIProvider,
  AIProviderSettings,
  AISettings,
  getAISettings,
  saveAISettings,
  fetchModels,
  hasUsableKey,
  AIModel
} from '../../services/aiSettingsService';
import { probeProvider } from '../../services/aiGeneratorService';

/**
 * Each provider's card. Styled in the nine colour families every site's
 * tailwind.config.cjs defines, since this panel is shared between them.
 */
const CARDS: Array<{
  provider: AIProvider;
  title: string;
  tone: { panel: string; ring: string; text: string };
  getKey: { href: string; label: string };
  keyPlaceholder: string;
  keyLabel: string;
  note?: string;
}> = [
  {
    provider: 'openai',
    title: 'ChatGPT (OpenAI)',
    tone: { panel: 'bg-jungle-light/15', ring: 'border-jungle', text: 'text-jungle-dark' },
    getKey: { href: 'https://platform.openai.com/api-keys', label: 'Obtener clave' },
    keyPlaceholder: 'sk-proj-…',
    keyLabel: 'Clave de API',
    note:
      'La clave se crea en platform.openai.com (no en chatgpt.com) y se paga por uso: la suscripción ChatGPT Plus no incluye la API. ' +
      'Carga saldo en Billing antes de probarla; sin saldo, OpenAI responde "insufficient_quota".',
  },
  {
    provider: 'gemini',
    title: 'Google Gemini',
    tone: { panel: 'bg-sky-light/20', ring: 'border-sky', text: 'text-sky-dark' },
    getKey: { href: 'https://aistudio.google.com/app/apikey', label: 'Obtener clave gratis' },
    keyPlaceholder: 'AIza…',
    keyLabel: 'Clave de API',
  },
  {
    provider: 'cloudflare',
    title: 'Cloudflare AI',
    tone: { panel: 'bg-sunset-light/15', ring: 'border-sunset', text: 'text-sunset-dark' },
    getKey: { href: 'https://dash.cloudflare.com/', label: 'Obtener tokens' },
    keyPlaceholder: 'Token de Workers AI',
    keyLabel: 'Token de API',
    note: 'Funciona sin nada configurado en este sitio: usa la IA propia del Worker. Cuenta y token solo hacen falta para usar otra cuenta.',
  },
  {
    provider: 'openrouter',
    title: 'OpenRouter',
    tone: { panel: 'bg-grape-light/15', ring: 'border-grape', text: 'text-grape-dark' },
    getKey: { href: 'https://openrouter.ai/keys', label: 'Obtener clave gratis' },
    keyPlaceholder: 'sk-or-v1-…',
    keyLabel: 'Clave de API',
  },
];

const AIAssistantAdmin: React.FC = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [models, setModels] = useState<Partial<Record<AIProvider, AIModel[]>>>({});
  const [loading, setLoading] = useState<Partial<Record<AIProvider, boolean>>>({});

  /** Result of the last "test this provider" round trip. */
  const [probe, setProbe] = useState<{
    provider: string;
    state: 'running' | 'ok' | 'fail';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Load a provider's model list through the Worker, which holds the keys.
   * `current` goes along so a key that has been typed but not yet saved can
   * still list its models.
   */
  const loadModels = async (provider: AIProvider, current?: AISettings) => {
    setLoading((state) => ({ ...state, [provider]: true }));
    const list = await fetchModels(provider, current ?? settings ?? undefined);
    setModels((state) => ({ ...state, [provider]: list }));
    setLoading((state) => ({ ...state, [provider]: false }));
  };

  const loadAllModels = (data: AISettings) => {
    // Cloudflare always lists: with the Workers AI binding it needs no key.
    loadModels('cloudflare', data);
    for (const provider of ['gemini', 'openrouter', 'openai'] as const) {
      if (hasUsableKey(data[provider])) loadModels(provider, data);
    }
  };

  const loadSettings = async () => {
    const data = await getAISettings();
    setSettings(data);
    loadAllModels(data);
  };

  /** Prove a provider answers, and show exactly why when it does not. */
  const testProvider = async (provider: AIProvider) => {
    if (!settings) return;
    setProbe({ provider, state: 'running', message: 'Probando…' });
    try {
      const result = await probeProvider(settings, provider);
      setProbe({
        provider,
        state: 'ok',
        message: `Responde correctamente — modelo ${result.model || 'predeterminado'}`,
      });
    } catch (error) {
      setProbe({
        provider,
        state: 'fail',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const stored = await saveAISettings(settings);
      setSettings(stored);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Refresh models after save, in case the keys changed.
      loadAllModels(stored);
    } catch (error) {
      console.error('No se pudo guardar', error);
      setSaveError('No se pudo guardar. Comprueba que sigues conectado al panel e inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return <div className="p-8 text-center text-ink-light">Cargando la configuración de IA...</div>;
  }

  const update = (provider: AIProvider, patch: Partial<AIProviderSettings>) =>
    setSettings({ ...settings, [provider]: { ...settings[provider], ...patch } });

  return (
    <div className="w-full space-y-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-3xl font-bold text-ink">
          <FaRobot className="text-lagoon" /> Integraciones de IA
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-lagoon-dark px-6 py-3 font-bold text-white transition-all hover:bg-ink disabled:opacity-50"
        >
          {isSaving ? 'Guardando…' : saveSuccess ? <><FaCheck /> Guardado</> : <><FaSave /> Guardar configuración</>}
        </button>
      </div>

      {saveError && (
        <p className="rounded-2xl border border-hibiscus/40 bg-hibiscus/10 px-5 py-3 text-sm font-semibold text-hibiscus-dark">{saveError}</p>
      )}

      {probe && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-semibold ${
            probe.state === 'ok'
              ? 'border-jungle/40 bg-jungle/10 text-jungle-dark'
              : probe.state === 'fail'
              ? 'border-hibiscus/40 bg-hibiscus/10 text-hibiscus-dark'
              : 'border-ink/15 bg-paper-warm text-ink-soft'
          }`}
        >
          <span className="text-[0.7rem] uppercase tracking-[0.14em]">{probe.provider}</span>
          {/* The provider's own words, including the model it tried. */}
          <p className="mt-1 whitespace-pre-wrap font-medium">{probe.message}</p>
        </div>
      )}

      <p className="rounded-2xl bg-paper-warm px-5 py-3 text-sm text-ink-soft">
        Las claves se guardan en el servidor y no vuelven a mostrarse: aquí solo verás que hay una guardada y sus últimos
        cuatro caracteres. Para cambiarla, escribe la nueva; deja el campo vacío para conservar la que hay.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Provider Selection */}
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-ink/10 bg-white p-6 shadow-md md:flex-row lg:col-span-2">
          <div>
            <h3 className="text-xl font-bold text-ink">Proveedor de IA activo</h3>
            <p className="text-sm text-ink-light">Elige qué proveedor usar para generar el blog y otras tareas de IA.</p>
          </div>
          <div className="flex flex-1 flex-wrap gap-4">
            {CARDS.map(({ provider, title }) => (
              <label
                key={provider}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 p-4 transition-all ${
                  settings.activeProvider === provider
                    ? 'border-lagoon bg-lagoon/10 font-bold text-lagoon-dark'
                    : 'border-ink/15 bg-white text-ink-soft hover:border-ink/30'
                }`}
              >
                <input
                  type="radio"
                  name="activeProvider"
                  value={provider}
                  checked={settings.activeProvider === provider}
                  onChange={() => setSettings({ ...settings, activeProvider: provider })}
                  className="hidden"
                />
                <span>{title}</span>
                {settings.activeProvider === provider && <FaCheck className="text-lagoon" />}
              </label>
            ))}
          </div>
        </div>

        {CARDS.map(({ provider, title, tone, getKey, keyPlaceholder, keyLabel, note }) => {
          const config = settings[provider];
          const list = models[provider] ?? [];
          return (
            <div
              key={provider}
              className={`rounded-2xl border-2 p-6 transition-all ${tone.panel} ${
                settings.activeProvider === provider ? `${tone.ring} shadow-lg` : 'border-transparent'
              }`}
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <h3 className={`text-xl font-bold ${tone.text}`}>{title}</h3>
                <a
                  href={getKey.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm hover:underline ${tone.text}`}
                >
                  {getKey.label}
                </a>
                <button
                  type="button"
                  onClick={() => testProvider(provider)}
                  className="rounded-full border border-ink/25 px-3 py-1 text-xs font-bold text-ink-soft transition hover:border-lagoon hover:text-ink"
                >
                  Probar
                </button>
              </div>
              <div className="space-y-4">
                {note && <p className="text-xs text-ink-soft">{note}</p>}
                {provider === 'cloudflare' && (
                  <div>
                    <label className={`mb-2 block text-sm font-semibold ${tone.text}`}>ID de cuenta</label>
                    <input
                      type="text"
                      value={config.accountId || ''}
                      onChange={(e) => update(provider, { accountId: e.target.value })}
                      placeholder="ID de cuenta de Cloudflare"
                      className="w-full rounded-lg border-none px-4 py-2 shadow-sm focus:ring-2 focus:ring-lagoon"
                    />
                  </div>
                )}
                <div>
                  <label className={`mb-2 block text-sm font-semibold ${tone.text}`}>{keyLabel}</label>
                  <div className="relative">
                    <FaKey className="absolute left-3 top-3 text-ink-light" />
                    <input
                      type="password"
                      autoComplete="off"
                      value={config.apiKey}
                      onChange={(e) => update(provider, { apiKey: e.target.value, clearKey: false })}
                      placeholder={config.hasKey && !config.clearKey ? `Guardada (${config.keyHint}) — escribe otra para cambiarla` : keyPlaceholder}
                      className="w-full rounded-lg border-none py-2 pl-10 pr-4 shadow-sm focus:ring-2 focus:ring-lagoon"
                    />
                  </div>
                  {config.hasKey && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                      <input
                        type="checkbox"
                        checked={Boolean(config.clearKey)}
                        onChange={(e) => update(provider, { clearKey: e.target.checked, apiKey: '' })}
                      />
                      Borrar la clave guardada al guardar
                    </label>
                  )}
                </div>
                <div>
                  <label className={`mb-2 block text-sm font-semibold ${tone.text}`}>
                    Modelo seleccionado{provider === 'openrouter' ? ' (los gratuitos primero)' : ''}
                    {loading[provider] && <span className="ml-2 animate-pulse text-xs font-normal">Buscando...</span>}
                  </label>
                  <select
                    value={config.selectedModel}
                    onChange={(e) => update(provider, { selectedModel: e.target.value })}
                    onFocus={() => {
                      if (!list.length && (provider === 'cloudflare' || hasUsableKey(config))) loadModels(provider);
                    }}
                    className="w-full rounded-lg border-none px-4 py-2 shadow-sm focus:ring-2 focus:ring-lagoon"
                  >
                    {!list.some((m) => m.id === config.selectedModel) && <option value={config.selectedModel}>{config.selectedModel}</option>}
                    {list.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AIAssistantAdmin;
