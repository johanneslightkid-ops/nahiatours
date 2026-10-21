import { ApiError, apiPost } from './apiClient';
import { getAdminPassword } from './authStore';

export type AIProvider = 'gemini' | 'cloudflare' | 'openrouter' | 'openai';

export interface AIProviderSettings {
  /**
   * A key being typed in. A saved key is never sent back to the browser
   * (functions/api/ai-settings.ts), so this is empty for one on file; empty on
   * save keeps it.
   */
  apiKey: string;
  accountId?: string; // used for Cloudflare
  selectedModel: string;
  /** A key is on file on the server. */
  hasKey?: boolean;
  /** Its last four characters, so the admin can tell which one it is. */
  keyHint?: string;
  /** Remove the key on file at the next save. */
  clearKey?: boolean;
}

export interface AISettings {
  gemini: AIProviderSettings;
  cloudflare: AIProviderSettings;
  openrouter: AIProviderSettings;
  /** ChatGPT, through OpenAI's own API. */
  openai: AIProviderSettings;
  activeProvider: AIProvider;
}

/** A key the provider can be called with: typed in now, or on file. */
export const hasUsableKey = (provider: AIProviderSettings) => Boolean(provider.apiKey.trim() || (provider.hasKey && !provider.clearKey));

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
  openai: { apiKey: '', selectedModel: 'gpt-5-mini' },
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
  const migrate = (provider: AIProviderSettings, fallback: AIProviderSettings): AIProviderSettings => ({
    ...provider,
    selectedModel: RETIRED_MODELS[provider.selectedModel] || provider.selectedModel || fallback.selectedModel,
  });

  return {
    ...defaultAISettings,
    ...(data as Partial<AISettings>),
    gemini: migrate({ ...defaultAISettings.gemini, ...(data as any).gemini }, defaultAISettings.gemini),
    cloudflare: migrate({ ...defaultAISettings.cloudflare, ...(data as any).cloudflare }, defaultAISettings.cloudflare),
    openrouter: migrate({ ...defaultAISettings.openrouter, ...(data as any).openrouter }, defaultAISettings.openrouter),
    openai: migrate({ ...defaultAISettings.openai, ...(data as any).openai }, defaultAISettings.openai),
  };
};

const settingsRequest = async (method: 'GET' | 'PUT', body?: unknown) => {
  const response = await fetch('/api/ai-settings', {
    method,
    headers: {
      Accept: 'application/json',
      'X-Admin-Password': getAdminPassword() ?? '',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(`AI settings ${method} failed with status ${response.status}`, response.status, data);
  return data;
};

/** The settings, with any saved key blanked: only whether one is on file comes back. */
export const getAISettings = async (): Promise<AISettings> => {
  try {
    return normalizeAISettings(await settingsRequest('GET'));
  } catch (error) {
    console.warn('Failed to fetch AI settings, returning defaults:', error);
    return defaultAISettings;
  }
};

/** Saves, and answers with the settings as stored (keys blanked again). */
export const saveAISettings = async (settings: AISettings): Promise<AISettings> => {
  try {
    const data = await settingsRequest('PUT', settings);
    return normalizeAISettings(data.settings);
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
  provider: AIProvider,
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
