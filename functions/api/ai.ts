import { verifyAdminRequest } from '../../shared/adminAuth';

/**
 * One endpoint for every AI provider.
 *
 * Generation used to happen in the browser: the admin panel called Google and
 * OpenRouter directly with the key in the page, and only Cloudflare went
 * through the Worker. Three things were wrong with that, and together they are
 * why "generate" produced nothing at all:
 *
 *   1. NOBODY EVER SAW THE ERROR. The client threw `new Error('Gemini error: '
 *      + res.statusText)`. `statusText` is an empty string in every modern
 *      browser's fetch, and the response body — the part that says
 *      "models/gemini-1.5-pro is not found for API version v1beta" — was never
 *      read. The panel then showed one generic sentence. Every failure looked
 *      identical and none of them said why.
 *   2. THE DEFAULT MODELS WERE RETIRED. `gemini-1.5-pro` on the v1beta
 *      endpoint and `google/gemini-pro-1.5` on OpenRouter both 404 for a key
 *      issued today, so a fresh install failed on its first click no matter
 *      how good the key was. Models are resolved with a fallback chain now,
 *      and the endpoint reports which one answered.
 *   3. THE KEY WAS IN THE PAGE. Anyone with the admin open could read it out
 *      of the network tab, and OpenRouter rejects browser origins that do not
 *      send `HTTP-Referer`.
 *
 * So all three run here. Keys are read from KV server-side and never reach the
 * browser, every failure comes back with the provider's own message, and a
 * model that has been retired is stepped over rather than fatal.
 */

type Provider = 'gemini' | 'cloudflare' | 'openrouter';

interface ProviderSettings {
  apiKey?: string;
  accountId?: string;
  selectedModel?: string;
}

interface AISettings {
  gemini?: ProviderSettings;
  cloudflare?: ProviderSettings;
  openrouter?: ProviderSettings;
  activeProvider?: Provider;
}

/**
 * Candidates tried in order, after whatever the admin selected.
 *
 * These are the current generally-available names, not the newest ones: the
 * point of the chain is that it still works a year from now when the top entry
 * has been retired too.
 */
const FALLBACK_MODELS: Record<Provider, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'],
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-2-9b-it:free',
    'mistralai/mistral-7b-instruct:free',
  ],
  cloudflare: ['@cf/meta/llama-3.1-8b-instruct-fp8', '@cf/meta/llama-3-8b-instruct'],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Read the saved provider settings out of KV, so keys stay on the server. */
const loadSettings = async (env: Record<string, any>): Promise<AISettings> => {
  const kv = env.DATA_KV_F ?? env.DATA_KV;
  if (!kv) return {};
  try {
    const raw = await kv.get('ai-settings');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed?.record ?? parsed) as AISettings;
  } catch {
    return {};
  }
};

/** Configured model first, then the fallbacks, without duplicates. */
const modelChain = (provider: Provider, configured?: string): string[] => {
  const chain = [configured?.trim(), ...FALLBACK_MODELS[provider]].filter(Boolean) as string[];
  return [...new Set(chain)];
};

/**
 * Worth trying the next model in the chain?
 *
 * Only for "this model is gone / you may not have it" — a 401 on the key or a
 * 429 on the quota will fail identically for every model, and hammering the
 * provider four more times to prove it just makes the admin wait.
 */
const modelMightBeTheProblem = (status: number, detail: string) =>
  status === 404 ||
  status === 400 ||
  status === 403 ||
  /model|not found|does not exist|unsupported|deprecat|decommission/i.test(detail);

const textOf = async (res: Response) => {
  const body = await res.text();
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || parsed?.errors?.[0]?.message || body;
  } catch {
    return body;
  }
};

interface Attempt {
  provider: Provider;
  model: string;
  status: number;
  detail: string;
}

interface RunResult {
  text: string;
  model: string;
}

const runGemini = async (
  config: ProviderSettings,
  prompt: string,
  system: string | undefined,
  maxTokens: number,
  temperature: number,
  imageBase64: string | undefined,
  attempts: Attempt[]
): Promise<RunResult> => {
  const key = config.apiKey?.trim();
  if (!key) throw new Error('No Gemini API key saved. Add one under AI settings.');

  const parts: any[] = [{ text: system ? `${system}\n\n${prompt}` : prompt }];
  if (imageBase64) {
    const data = imageBase64.split(',')[1] || imageBase64;
    const mime = /^data:([^;]+);/.exec(imageBase64)?.[1] || 'image/jpeg';
    parts.push({ inlineData: { mimeType: mime, data } });
  }

  for (const model of modelChain('gemini', config.selectedModel)) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      }
    );

    if (res.ok) {
      const data: any = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p.text || '')
        .join('')
        .trim();
      if (text) return { text, model };
      attempts.push({
        provider: 'gemini',
        model,
        status: 200,
        detail:
          data.candidates?.[0]?.finishReason === 'SAFETY'
            ? 'Gemini stopped on its safety filter and returned nothing.'
            : 'Gemini answered with an empty response.',
      });
      continue;
    }

    const detail = await textOf(res);
    attempts.push({ provider: 'gemini', model, status: res.status, detail });
    if (!modelMightBeTheProblem(res.status, detail)) break;
  }

  throw new Error('Gemini could not produce text.');
};

const runOpenRouter = async (
  config: ProviderSettings,
  prompt: string,
  system: string | undefined,
  maxTokens: number,
  temperature: number,
  imageBase64: string | undefined,
  origin: string,
  attempts: Attempt[]
): Promise<RunResult> => {
  const key = config.apiKey?.trim();
  if (!key) throw new Error('No OpenRouter API key saved. Add one under AI settings.');

  const userContent: any = imageBase64
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageBase64 } },
      ]
    : prompt;

  const messages: any[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userContent });

  for (const model of modelChain('openrouter', config.selectedModel)) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // OpenRouter attributes usage by these two and rejects some callers
        // without them. The browser could not set Referer at all.
        'HTTP-Referer': origin,
        'X-Title': 'Tour operator blog generator',
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
    });

    if (res.ok) {
      const data: any = await res.json();
      const text = (data.choices?.[0]?.message?.content || '').trim();
      if (text) return { text, model };
      attempts.push({
        provider: 'openrouter',
        model,
        status: 200,
        detail: data?.error?.message || 'OpenRouter answered with an empty response.',
      });
      continue;
    }

    const detail = await textOf(res);
    attempts.push({ provider: 'openrouter', model, status: res.status, detail });
    if (!modelMightBeTheProblem(res.status, detail)) break;
  }

  throw new Error('OpenRouter could not produce text.');
};

const runCloudflare = async (
  env: Record<string, any>,
  config: ProviderSettings,
  prompt: string,
  system: string | undefined,
  maxTokens: number,
  temperature: number,
  attempts: Attempt[]
): Promise<RunResult> => {
  const messages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    { role: 'user', content: prompt },
  ];
  const payload = { messages, max_tokens: maxTokens, temperature };

  const accountId = config.accountId?.trim();
  const token = config.apiKey?.trim();
  const useRest = Boolean(accountId && token);

  for (const model of modelChain('cloudflare', config.selectedModel)) {
    // ── The binding. No key, no account id, nothing to paste: wrangler.toml
    //    grants this Worker the account's own Workers AI, so a deployment can
    //    write an article the minute it is up.
    if (!useRest) {
      if (!env.AI) {
        throw new Error(
          'This deployment has no Workers AI binding and no Cloudflare credentials ' +
            'were saved. Redeploy with [ai] in wrangler.toml, or paste an account id ' +
            'and token under AI settings.'
        );
      }
      try {
        const result: any = await env.AI.run(model, payload);
        const text = (result?.response || '').trim();
        if (text) return { text, model };
        attempts.push({
          provider: 'cloudflare',
          model,
          status: 200,
          detail: 'Workers AI answered with an empty response.',
        });
      } catch (error: any) {
        const detail = String(error?.message || error);
        attempts.push({ provider: 'cloudflare', model, status: 500, detail });
        if (!modelMightBeTheProblem(500, detail)) break;
      }
      continue;
    }

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      const data: any = await res.json();
      const text = (data?.result?.response || '').trim();
      if (text) return { text, model };
      attempts.push({
        provider: 'cloudflare',
        model,
        status: 200,
        detail: 'Workers AI answered with an empty response.',
      });
      continue;
    }

    const detail = await textOf(res);
    attempts.push({ provider: 'cloudflare', model, status: res.status, detail });
    if (!modelMightBeTheProblem(res.status, detail)) break;
  }

  throw new Error('Cloudflare Workers AI could not produce text.');
};

/** Model lists, fetched here so the token never goes to the browser. */
const listModels = async (provider: Provider, config: ProviderSettings) => {
  if (provider === 'gemini') {
    if (!config.apiKey) return [];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(config.apiKey.trim())}&pageSize=200`
    );
    if (!res.ok) throw new Error(await textOf(res));
    const data: any = await res.json();
    return (data.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m: any) => ({
        id: String(m.name).replace('models/', ''),
        name: m.displayName || String(m.name).replace('models/', ''),
      }));
  }

  if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey.trim()}` } : {},
    });
    if (!res.ok) throw new Error(await textOf(res));
    const data: any = await res.json();
    const all = (data.data || []).map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
      free: m.pricing?.prompt === '0' && m.pricing?.completion === '0',
    }));
    // Free first, but never hide the paid ones: the old code filtered them out
    // entirely, so the saved default could not even be selected back.
    return [...all.filter((m: any) => m.free), ...all.filter((m: any) => !m.free)].map(
      ({ id, name, free }: any) => ({ id, name: free ? `${name} · free` : name })
    );
  }

  const accountId = config.accountId?.trim();
  const token = config.apiKey?.trim();
  if (!accountId || !token) {
    // With the binding there is no list endpoint, so offer what it can run.
    return FALLBACK_MODELS.cloudflare.map((id) => ({ id, name: `${id} · via Workers AI binding` }));
  }
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?per_page=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await textOf(res));
  const data: any = await res.json();
  return (data.result || [])
    .filter((m: any) => m.task?.name === 'Text Generation')
    .map((m: any) => ({ id: m.name, name: m.name }));
};

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  // Generation spends the account's money, so it is admin-only.
  const auth = await verifyAdminRequest(env, request);
  if (!auth.ok) {
    return json({ ok: false, error: auth.error }, auth.status);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Expected a JSON body' }, 400);
  }

  const saved = await loadSettings(env);
  // An override is accepted so the admin panel can test a key that has been
  // typed but not yet saved.
  const settings: AISettings = { ...saved, ...(body.settings || {}) };
  const provider: Provider = (body.provider || settings.activeProvider || 'cloudflare') as Provider;
  const config: ProviderSettings = (settings as any)[provider] || {};

  if (body.action === 'models') {
    try {
      return json({ ok: true, provider, models: await listModels(provider, config) });
    } catch (error: any) {
      return json({ ok: false, provider, error: String(error?.message || error) }, 502);
    }
  }

  const prompt = String(body.prompt || '').trim();
  if (!prompt) return json({ ok: false, error: 'Missing prompt' }, 400);

  const system = body.system ? String(body.system) : undefined;
  const maxTokens = Number.isFinite(body.maxTokens) ? Math.min(Number(body.maxTokens), 8000) : 4000;
  const temperature = Number.isFinite(body.temperature) ? Number(body.temperature) : 0.85;
  const image = body.imageBase64 ? String(body.imageBase64) : undefined;
  const origin = new URL(request.url).origin;

  const attempts: Attempt[] = [];

  try {
    let result: RunResult;
    if (provider === 'gemini') {
      result = await runGemini(config, prompt, system, maxTokens, temperature, image, attempts);
    } else if (provider === 'openrouter') {
      result = await runOpenRouter(config, prompt, system, maxTokens, temperature, image, origin, attempts);
    } else {
      result = await runCloudflare(env, config, prompt, system, maxTokens, temperature, attempts);
    }
    return json({ ok: true, provider, model: result.model, text: result.text, attempts });
  } catch (error: any) {
    // The provider's own words, plus every model that was tried. This is the
    // difference between "Failed to generate" and knowing the key is fine and
    // the model name is dead.
    const last = attempts[attempts.length - 1];
    return json(
      {
        ok: false,
        provider,
        error: String(error?.message || error),
        detail: last?.detail,
        status: last?.status,
        attempts,
      },
      502
    );
  }
}
