import { apiGet, apiPut } from './apiClient';

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
 * `cloudflare` is the default provider because it is the only one that works
 * with nothing configured: wrangler.toml binds the account's own Workers AI as
 * `AI`, and /api/cf-ai runs the model through that binding whenever no account
 * id and token have been entered. Gemini and OpenRouter both need a key pasted
 * in before they produce a sentence, so defaulting to either meant a fresh
 * deployment shipped a blog generator that could only fail.
 */
const defaultAISettings: AISettings = {
  gemini: { apiKey: '', selectedModel: 'gemini-1.5-pro' },
  cloudflare: { apiKey: '', accountId: '', selectedModel: '@cf/meta/llama-3.1-8b-instruct-fp8' },
  openrouter: { apiKey: '', selectedModel: 'google/gemini-pro-1.5' },
  activeProvider: 'cloudflare',
};

const normalizeAISettings = (input: unknown): AISettings => {
  const data = (input as Record<string, unknown>)?.record ?? input;
  if (!data || typeof data !== 'object') return defaultAISettings;
  
  const normalizedCloudflare = { ...defaultAISettings.cloudflare, ...(data as any).cloudflare };
  
  // Auto-migrate deprecated models (410 Gone) to the new 3.1 equivalent
  if (normalizedCloudflare.selectedModel === '@cf/meta/llama-3-8b-instruct') {
    normalizedCloudflare.selectedModel = '@cf/meta/llama-3.1-8b-instruct-fp8';
  }
  
  return {
    ...defaultAISettings,
    ...(data as Partial<AISettings>),
    gemini: { ...defaultAISettings.gemini, ...(data as any).gemini },
    cloudflare: normalizedCloudflare,
    openrouter: { ...defaultAISettings.openrouter, ...(data as any).openrouter },
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

// Model fetching services
export interface AIModel {
  id: string;
  name: string;
}

export const fetchGeminiModels = async (apiKey: string): Promise<AIModel[]> => {
  if (!apiKey) return [];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) throw new Error('Failed to fetch models');
    const data = await res.json();
    return data.models
      .filter((m: any) => m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent'))
      .map((m: any) => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', '')
      }));
  } catch (error) {
    console.error('Gemini model fetch error:', error);
    return [{ id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Default)' }];
  }
};

export const fetchOpenRouterModels = async (apiKey: string): Promise<AIModel[]> => {
  if (!apiKey) return [];
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error('Failed to fetch models');
    const data = await res.json();
    return data.data
      .filter((m: any) => m.pricing?.prompt === "0" && m.pricing?.completion === "0") // filter for free models
      .map((m: any) => ({
        id: m.id,
        name: m.name
      }));
  } catch (error) {
    console.error('OpenRouter model fetch error:', error);
    return [
      { id: 'google/gemini-pro-1.5', name: 'Google: Gemini Pro 1.5 (Free Default)' },
      { id: 'meta-llama/llama-3-8b-instruct', name: 'Meta: Llama 3 8B (Free)' }
    ];
  }
};

export const fetchCloudflareModels = async (accountId: string, apiToken: string): Promise<AIModel[]> => {
  if (!accountId || !apiToken) return [];
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    if (!res.ok) throw new Error('Failed to fetch models');
    const data = await res.json();
    return data.result
      .filter((m: any) => m.task.name === 'Text Generation')
      .map((m: any) => ({
        id: m.name,
        name: m.name
      }));
  } catch (error) {
    console.error('Cloudflare model fetch error:', error);
    return [{ id: '@cf/meta/llama-3.1-8b-instruct-fp8', name: 'Llama 3.1 8B Instruct (Default)' }];
  }
};
