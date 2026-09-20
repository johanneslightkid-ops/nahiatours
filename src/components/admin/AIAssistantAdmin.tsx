import React, { useState, useEffect } from 'react';
import { FaRobot, FaKey, FaSave, FaCheck, FaExclamationCircle } from 'react-icons/fa';
import {
  AISettings,
  getAISettings,
  saveAISettings,
  fetchGeminiModels,
  fetchCloudflareModels,
  fetchOpenRouterModels,
  AIModel
} from '../../services/aiSettingsService';

const AIAssistantAdmin: React.FC = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Model lists
  const [geminiModels, setGeminiModels] = useState<AIModel[]>([]);
  const [cloudflareModels, setCloudflareModels] = useState<AIModel[]>([]);
  const [openRouterModels, setOpenRouterModels] = useState<AIModel[]>([]);

  // Loading states for models
  const [loadingGemini, setLoadingGemini] = useState(false);
  const [loadingCloudflare, setLoadingCloudflare] = useState(false);
  const [loadingOpenRouter, setLoadingOpenRouter] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await getAISettings();
    setSettings(data);
    if (data.gemini.apiKey) fetchModels('gemini', data.gemini.apiKey);
    if (data.cloudflare.accountId && data.cloudflare.apiKey) fetchModels('cloudflare', data.cloudflare.apiKey, data.cloudflare.accountId);
    if (data.openrouter.apiKey) fetchModels('openrouter', data.openrouter.apiKey);
  };

  const fetchModels = async (provider: 'gemini' | 'cloudflare' | 'openrouter', key: string, accountId?: string) => {
    if (provider === 'gemini') {
      setLoadingGemini(true);
      const models = await fetchGeminiModels(key);
      setGeminiModels(models);
      setLoadingGemini(false);
    } else if (provider === 'cloudflare') {
      if (!accountId) return;
      setLoadingCloudflare(true);
      const models = await fetchCloudflareModels(accountId, key);
      setCloudflareModels(models);
      setLoadingCloudflare(false);
    } else if (provider === 'openrouter') {
      setLoadingOpenRouter(true);
      const models = await fetchOpenRouterModels(key);
      setOpenRouterModels(models);
      setLoadingOpenRouter(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await saveAISettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Refresh models after save just in case keys changed
      if (settings.gemini.apiKey) fetchModels('gemini', settings.gemini.apiKey);
      if (settings.cloudflare.accountId && settings.cloudflare.apiKey) fetchModels('cloudflare', settings.cloudflare.apiKey, settings.cloudflare.accountId);
      if (settings.openrouter.apiKey) fetchModels('openrouter', settings.openrouter.apiKey);
    } catch (error) {
      console.error('No se pudo guardar', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return <div className="p-8 text-center text-ink-light">Cargando la configuración de IA...</div>;
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-ink flex items-center gap-3">
          <FaRobot className="text-teal-600" /> Integraciones de IA
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-sea-deep text-white font-bold rounded-lg hover:bg-[#0f4f59] transition-all disabled:opacity-50"
        >
          {isSaving ? 'Guardando…' : saveSuccess ? <><FaCheck /> Guardado</> : <><FaSave /> Guardar configuración</>}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Provider Selection */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col md:flex-row items-center gap-6">
          <div>
            <h3 className="text-xl font-bold text-ink">Proveedor de IA activo</h3>
            <p className="text-sm text-ink-light">Elige qué proveedor usar para generar el blog y otras tareas de IA.</p>
          </div>
          <div className="flex-1 flex flex-wrap gap-4">
            {(['gemini', 'cloudflare', 'openrouter'] as const).map(provider => (
              <label
                key={provider}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.activeProvider === provider
                    ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold'
                    : 'border-ink/15 bg-white hover:border-slate-300 text-ink-soft'
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
                <span className="capitalize">{provider}</span>
                {settings.activeProvider === provider && <FaCheck className="text-teal-500" />}
              </label>
            ))}
          </div>
        </div>

        {/* Gemini Settings */}
        <div className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 transition-all ${settings.activeProvider === 'gemini' ? 'border-blue-500 shadow-lg' : 'border-transparent'}`}>
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-blue-900">Google Gemini</h3>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline bg-white px-3 py-1 rounded-full shadow-sm">
              Obtener clave gratis
            </a>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-2">Clave de API</label>
              <div className="relative">
                <FaKey className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={settings.gemini.apiKey}
                  onChange={e => setSettings({ ...settings, gemini: { ...settings.gemini, apiKey: e.target.value } })}
                  placeholder="AIza..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-900 mb-2">
                Modelo seleccionado
                {loadingGemini && <span className="ml-2 text-xs font-normal text-blue-600 animate-pulse">Buscando...</span>}
              </label>
              <select
                value={settings.gemini.selectedModel}
                onChange={e => setSettings({ ...settings, gemini: { ...settings.gemini, selectedModel: e.target.value } })}
                className="w-full px-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                {geminiModels.length === 0 && <option value={settings.gemini.selectedModel}>{settings.gemini.selectedModel}</option>}
                {geminiModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Cloudflare Settings */}
        <div className={`bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border-2 transition-all ${settings.activeProvider === 'cloudflare' ? 'border-orange-500 shadow-lg' : 'border-transparent'}`}>
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-orange-900">Cloudflare AI</h3>
            <a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer" className="text-xs font-bold text-orange-600 hover:underline bg-white px-3 py-1 rounded-full shadow-sm">
              Obtener tokens
            </a>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-orange-900 mb-2">ID de cuenta</label>
              <input
                type="text"
                value={settings.cloudflare.accountId || ''}
                onChange={e => setSettings({ ...settings, cloudflare: { ...settings.cloudflare, accountId: e.target.value } })}
                placeholder="ID de cuenta de Cloudflare"
                className="w-full px-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-orange-500 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-orange-900 mb-2">Token de API</label>
              <div className="relative">
                <FaKey className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={settings.cloudflare.apiKey}
                  onChange={e => setSettings({ ...settings, cloudflare: { ...settings.cloudflare, apiKey: e.target.value } })}
                  placeholder="Token de Workers AI"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-orange-900 mb-2">
                Modelo seleccionado
                {loadingCloudflare && <span className="ml-2 text-xs font-normal text-orange-600 animate-pulse">Buscando...</span>}
              </label>
              <select
                value={settings.cloudflare.selectedModel}
                onChange={e => setSettings({ ...settings, cloudflare: { ...settings.cloudflare, selectedModel: e.target.value } })}
                className="w-full px-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-orange-500 shadow-sm"
              >
                {cloudflareModels.length === 0 && <option value={settings.cloudflare.selectedModel}>{settings.cloudflare.selectedModel}</option>}
                {cloudflareModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* OpenRouter Settings */}
        <div className={`bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 transition-all ${settings.activeProvider === 'openrouter' ? 'border-purple-500 shadow-lg' : 'border-transparent'}`}>
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-purple-900">OpenRouter</h3>
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-xs font-bold text-purple-600 hover:underline bg-white px-3 py-1 rounded-full shadow-sm">
              Obtener clave gratis
            </a>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-purple-900 mb-2">Clave de API</label>
              <div className="relative">
                <FaKey className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  value={settings.openrouter.apiKey}
                  onChange={e => setSettings({ ...settings, openrouter: { ...settings.openrouter, apiKey: e.target.value } })}
                  placeholder="sk-or-v1-..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-purple-900 mb-2">
                Modelo seleccionado (solo gratuitos)
                {loadingOpenRouter && <span className="ml-2 text-xs font-normal text-purple-600 animate-pulse">Buscando...</span>}
              </label>
              <select
                value={settings.openrouter.selectedModel}
                onChange={e => setSettings({ ...settings, openrouter: { ...settings.openrouter, selectedModel: e.target.value } })}
                className="w-full px-4 py-2 rounded-lg border-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              >
                {openRouterModels.length === 0 && <option value={settings.openrouter.selectedModel}>{settings.openrouter.selectedModel}</option>}
                {openRouterModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantAdmin;
