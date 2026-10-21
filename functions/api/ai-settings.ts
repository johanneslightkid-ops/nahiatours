import { adminKv, verifyAdminRequest } from '../../shared/adminAuth';

/**
 * The AI providers' settings, for the admin only.
 *
 *   GET            (admin) → the settings with every key blanked, plus, per
 *                            provider, whether a key is on file and its last
 *                            four characters
 *   PUT { … }      (admin) → stores them. A provider sent with an empty key
 *                            keeps the key on file; `clearKey: true` removes it.
 *
 * These used to live behind the public data endpoint (`/api/data?resource=
 * ai-settings`), which serves anyone and is cached publicly — so the Gemini and
 * OpenRouter keys saved in the admin could be read by any visitor. That
 * resource is refused now (shared/paymentConfig.ts PROTECTED_RESOURCES), and
 * the keys go from the browser to KV and never back: functions/api/ai.ts reads
 * them server-side, as it always did.
 */
export const AI_SETTINGS_KEY = 'ai-settings';

const PROVIDERS = ['gemini', 'cloudflare', 'openrouter', 'openai'] as const;
type Provider = (typeof PROVIDERS)[number];

interface ProviderSettings {
  apiKey?: string;
  accountId?: string;
  selectedModel?: string;
  clearKey?: boolean;
}

type Settings = Partial<Record<Provider, ProviderSettings>> & { activeProvider?: Provider };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const readAiSettings = async (kv: { get: (key: string) => Promise<string | null> } | null): Promise<Settings> => {
  if (!kv) return {};
  try {
    const raw = await kv.get(AI_SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed?.record ?? parsed) as Settings;
  } catch {
    return {};
  }
};

/** What the browser may see: everything but the keys. */
const masked = (settings: Settings) => {
  const out: Record<string, unknown> = { activeProvider: settings.activeProvider };
  for (const provider of PROVIDERS) {
    const config = settings[provider] ?? {};
    const key = String(config.apiKey ?? '').trim();
    out[provider] = {
      ...config,
      apiKey: '',
      hasKey: Boolean(key),
      keyHint: key ? `…${key.slice(-4)}` : '',
    };
  }
  return out;
};

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;
  const auth = await verifyAdminRequest(env as never, request);
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const kv = adminKv(env as never);
  if (!kv) return json({ error: 'No KV namespace is bound to this deployment.' }, 503);

  const stored = await readAiSettings(kv);

  if (request.method === 'GET') return json(masked(stored));

  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);

  const body = (await request.json().catch(() => null)) as Settings | null;
  if (!body || typeof body !== 'object') return json({ error: 'Expected a JSON body' }, 400);

  const next: Settings = {
    activeProvider: PROVIDERS.includes(body.activeProvider as Provider) ? body.activeProvider : stored.activeProvider,
  };
  for (const provider of PROVIDERS) {
    const incoming = body[provider] ?? {};
    const before = stored[provider] ?? {};
    const typed = String(incoming.apiKey ?? '').trim();
    const apiKey = incoming.clearKey ? '' : typed || String(before.apiKey ?? '');
    next[provider] = {
      apiKey,
      ...(provider === 'cloudflare'
        ? { accountId: String(incoming.accountId ?? before.accountId ?? '').trim() }
        : {}),
      selectedModel: String(incoming.selectedModel ?? before.selectedModel ?? '').trim(),
    };
  }
  await kv.put(AI_SETTINGS_KEY, JSON.stringify(next));
  return json({ ok: true, settings: masked(next) });
}
