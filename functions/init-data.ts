const normalizeJsonBinUrl = (binDefinition: string | undefined): string | null => {
  if (!binDefinition || !binDefinition.trim()) return null;
  const trimmed = binDefinition.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/latest\/?$/i, '/latest');
  }

  return `https://api.jsonbin.io/v3/b/${trimmed}/latest`;
};

const createErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const jsonBinFetch = async (url: string, masterKey?: string) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (masterKey) {
    headers['X-Master-Key'] = masterKey;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`JSONBin fetch failed for ${url} with status ${response.status}`);
  }

  return await response.json();
};

const buildResourceEntries = (env: Record<string, string | undefined>) => {
  return [
    { resource: 'brand', envKey: 'VITE_JSONBIN_BRAND_BIN_ID' },
    { resource: 'transfer-config', envKey: 'VITE_JSONBIN_TRANSFER_BIN_ID' },
    { resource: 'social-media', envKey: 'VITE_JSONBIN_SOCIAL_BIN_ID' },
    { resource: 'testimonials', envKey: 'VITE_JSONBIN_TESTIMONIALS_BIN_ID' },
    { resource: 'blog', envKey: { en: 'VITE_JSONBIN_BLOG_EN', es: 'VITE_JSONBIN_BLOG_ES' } },
    { resource: 'tours', envKey: { en: 'VITE_JSONBIN_TOURS_EN', es: 'VITE_JSONBIN_TOURS_ES' } },
    { resource: 'transport-services', envKey: { en: 'VITE_JSONBIN_TRANSPORT_EN', es: 'VITE_JSONBIN_TRANSPORT_ES' } },
    { resource: 'example-tours', envKey: { en: 'VITE_JSONBIN_EXAMPLETESTOURS_EN_BIN_ID', es: 'VITE_JSONBIN_EXAMPLETESTOURS_ES_BIN_ID' } },
    { resource: 'story-elements', envKey: { en: 'VITE_JSONBIN_STORY_ELEMENTS_EN', es: 'VITE_JSONBIN_STORY_ELEMENTS_ES' } },
    { resource: 'intro-story', envKey: { en: 'VITE_JSONBIN_JOURNEY_EN', es: 'VITE_JSONBIN_JOURNEY_ES' } },
    { resource: 'translations', envKey: { en: 'VITE_JSONBIN_EN_BIN_ID', es: 'VITE_JSONBIN_ES_BIN_ID' } },
  ];
};

const saveToKV = async (env: Record<string, any>, key: string, payload: unknown) => {
  const dataKV = env.DATA_KV_F ?? env.DATA_KV;
  if (!dataKV || typeof dataKV.put !== 'function') {
    throw new Error('DATA_KV_F or DATA_KV namespace binding is not configured. Please bind a Cloudflare KV namespace to DATA_KV_F or DATA_KV.');
  }

  await dataKV.put(key, JSON.stringify(payload));
};

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;
  const secretHeader = request.headers.get('x-init-secret') || '';
  const expectedSecret = env.INIT_DATA_SECRET;

  if (request.method !== 'POST') {
    return createErrorResponse('Only POST requests are allowed.', 405);
  }

  if (!expectedSecret) {
    return createErrorResponse('INIT_DATA_SECRET is not configured in Cloudflare environment.', 500);
  }

  if (secretHeader !== expectedSecret) {
    return createErrorResponse('Invalid initialization secret.', 401);
  }

  const dataKV = env.DATA_KV_F ?? env.DATA_KV;
  if (!dataKV || typeof dataKV.put !== 'function') {
    return createErrorResponse('DATA_KV_F or DATA_KV namespace binding is not configured. This initializer requires a Cloudflare KV namespace bound to DATA_KV_F or DATA_KV.', 500);
  }

  const masterKey = env.VITE_JSONBIN_MASTER_KEY;
  const entries = buildResourceEntries(env);
  const results: Array<{ key: string; status: string; message?: string }> = [];

  for (const entry of entries) {
    try {
      if (typeof entry.envKey === 'string') {
        const binUrl = normalizeJsonBinUrl(env[entry.envKey]);
        if (!binUrl) {
          results.push({ key: entry.resource, status: 'skipped', message: `${entry.envKey} not configured` });
          continue;
        }

        const payload = await jsonBinFetch(binUrl, masterKey);
        await saveToKV(env, entry.resource, payload);
        results.push({ key: entry.resource, status: 'stored' });
        continue;
      }

      for (const locale of ['en', 'es'] as const) {
        const envKey = entry.envKey[locale];
        const binUrl = normalizeJsonBinUrl(env[envKey]);
        const resourceKey = `${entry.resource}-${locale}`;

        if (!binUrl) {
          results.push({ key: resourceKey, status: 'skipped', message: `${envKey} not configured` });
          continue;
        }

        const payload = await jsonBinFetch(binUrl, masterKey);
        await saveToKV(env, resourceKey, payload);
        results.push({ key: resourceKey, status: 'stored' });
      }
    } catch (error: any) {
      results.push({ key: typeof entry.envKey === 'string' ? entry.resource : `${entry.resource}-*`, status: 'error', message: String(error?.message || error) });
    }
  }

  return new Response(JSON.stringify({ success: true, results }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
