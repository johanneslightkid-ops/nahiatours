import { ApiError, apiGet, apiPost, apiPut } from './apiClient';

export interface AIProviderSettings {
  apiKey: string;
  accountId?: string; // used for Cloudflare
  selectedModel: string;
}

export interface AISettings {
  gemini: AIProviderSettings;
  cloudflare: AIProviderSettings;
  openrouter: AIProviderSettings;
  activeProvider: 'gemini' | 'cloudflare' | 'openrouter';
}

/**
 * Cloudflare is the default provider, and the defaults below are models that
 * exist.
 *
 * Both of those are corrections. The old defaults were `gemini-1.5-pro` and
 * `google/gemini-pro-1.5`, which a key issued today cannot reach — so a fresh
 * install failed on its first click and the panel said only "Failed to
 * generate blog posts". And the old default provider was Gemini, which cannot
 * write a word until somebody pastes a key; Cloudflare runs through the
 * Worker's own `AI` binding with nothing configured at all.
 *
 * The server keeps a fallback chain behind these (functions/api/ai.ts), so a
 * name that retires next year is stepped over rather than fatal.
 */
const defaultAISettings: AISettings = {
  gemini: { apiKey: '', selectedModel: 'gemini-2.5-flash' },
  cloudflare: { apiKey: '', accountId: '', selectedModel: '@cf/meta/llama-3.1-8b-instruct-fp8' },
  openrouter: { apiKey: '', selectedModel: 'meta-llama/llama-3.3-70b-instruct:free' },
  activeProvider: 'cloudflare',
};

/** Model names that no longer resolve, mapped to their live equivalents. */
const RETIRED_MODELS: Record<string, string> = {
  'gemini-1.5-pro': 'gemini-2.5-flash',
  'gemini-1.5-pro-latest': 'gemini-2.5-flash',
  'gemini-pro': 'gemini-2.5-flash',
  'google/gemini-pro-1.5': 'meta-llama/llama-3.3-70b-instruct:free',
  '@cf/meta/llama-3-8b-instruct': '@cf/meta/llama-3.1-8b-instruct-fp8',
};

const normalizeAISettings = (input: unknown): AISettings => {
  const data = (input as Record<string, unknown>)?.record ?? input;
  if (!data || typeof data !== 'object') return defaultAISettings;
  
  // A retired model saved months ago is silently upgraded rather than left to
  // 404 on the next click.
  const migrate = (provider: AIProviderSettings): AIProviderSettings => ({
    ...provider,
    selectedModel: RETIRED_MODELS[provider.selectedModel] || provider.selectedModel,
  });

  return {
    ...defaultAISettings,
    ...(data as Partial<AISettings>),
    gemini: migrate({ ...defaultAISettings.gemini, ...(data as any).gemini }),
    cloudflare: migrate({ ...defaultAISettings.cloudflare, ...(data as any).cloudflare }),
    openrouter: migrate({ ...defaultAISettings.openrouter, ...(data as any).openrouter }),
  };
};

export const getAISettings = async (): Promise<AISettings> => {
  try {
    const data = await apiGet<unknown>('ai-settings');
    return normalizeAISettings(data);
  } catch (error) {
    console.warn('Failed to fetch AI settings, returning defaults:', error);
    return defaultAISettings;
  }
};

export const saveAISettings = async (settings: AISettings): Promise<AISettings> => {
  try {
    await apiPut<unknown>('ai-settings', settings);
    return settings;
  } catch (error) {
    console.error('Error saving AI settings:', error);
    throw error;
  }
};

// Model fetching
export interface AIModel {
  id: string;
  name: string;
}

/**
 * Ask the Worker for the model list.
 *
 * These three calls used to run in the browser with the API token attached,
 * which put the token in the network tab of anyone with the admin open, and
 * which api.cloudflare.com will not answer cross-origin anyway. The same
 * endpoint that generates text lists the models, so the credentials stay on
 * the server.
 *
 * `settings` is passed so the panel can list models for a key that has been
 * typed but not yet saved.
 */
export const fetchModels = async (
  provider: 'gemini' | 'cloudflare' | 'openrouter',
  settings?: AISettings
): Promise<AIModel[]> => {
  try {
    const data = await apiPost<{ ok: boolean; models?: AIModel[]; error?: string }>('ai', {
      action: 'models',
      provider,
      settings,
    });
    return data.models ?? [];
  } catch (error) {
    const body = error instanceof ApiError ? (error.body as { error?: string } | null) : null;
    console.warn(`[ai] could not list ${provider} models:`, body?.error || error);
    return [];
  }
};
