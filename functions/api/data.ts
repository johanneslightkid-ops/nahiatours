import { verifyAdminRequest } from '../../shared/adminAuth';
import { isProtectedResource } from '../../shared/paymentConfig';

const RESOURCE_WITH_LOCALE = new Set([
  'blog',
  'i18n',
  'tour',
  'tours',
  'transport',
  'transport-services',
  'example-tours',
  'story-elements',
  'intro-story',
  'story-nodes',
  'translations',
  // About, FAQ, contact and the legal pages, for sites that keep them as data.
  'site-pages',
]);

/**
 * Read the copy of a resource that ships in the build, at /data/{key}.json.
 *
 * This asks the ASSETS binding rather than the network, and that is the whole
 * fix for a pair of 404s that looked like missing data and were not:
 *
 *   GET /api/data?resource=tours&locale=en          404
 *   GET /api/data?resource=social-api-settings      404
 *
 * Both files are in public/data and both are deployed. What failed was the
 * fallback: it called global `fetch` on the site's own origin, so the Worker
 * issued a request straight back at itself. With `run_worker_first = true`
 * that request re-enters this same Worker, and Cloudflare will not let a
 * Worker recurse into itself — the subrequest fails, the catch returns null,
 * and the endpoint reports the resource missing while the file sits in the
 * bundle it just served.
 *
 * `env.ASSETS.fetch` reads the uploaded asset directly. No subrequest, no
 * loop, no network. The origin-relative URL is still built because the assets
 * runtime matches on the path.
 */
const readLocalJson = async (
  key: string,
  env: Record<string, any>,
  requestUrl?: string
): Promise<unknown | null> => {
  const origin = requestUrl ? new URL(requestUrl).origin : 'https://assets.local';
  const url = `${origin}/data/${key}.json`;

  const read = async (response: Response | null): Promise<unknown | null> => {
    if (!response || !response.ok) return null;
    const body = await response.text();
    // A single-page-application 404 handler answers with index.html, which
    // parses as neither JSON nor a missing file. Catch it by its first
    // character rather than by its status.
    if (!body || body.trimStart().startsWith('<')) return null;
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  };

  const assets = env?.ASSETS;
  if (assets && typeof assets.fetch === 'function') {
    try {
      return await read(await assets.fetch(new Request(url)));
    } catch (err) {
      console.warn('[Cloudflare Function] ASSETS read failed for', key, err);
      return null;
    }
  }

  // No ASSETS binding: a Pages deployment, or `wrangler dev` without assets.
  // There the origin fetch is a genuine request to a different server, so it
  // cannot loop.
  try {
    return await read(await fetch(url));
  } catch (err) {
    console.warn('[Cloudflare Function] Failed to read local JSON for', key, err);
    return null;
  }
};

const buildResourceKey = (resource: string, locale?: string) => {
  const normalized = resource.trim().toLowerCase();

  // Some KV keys hold credentials — the payment secrets, the admin password,
  // the pending bank payments with their CardNET session keys.
  // This endpoint is unauthenticated on GET and cached publicly, so it must
  // never be able to name one, however it is asked. Returning null here makes
  // the request a 400 alongside any other unknown resource, which also avoids
  // confirming that the key exists.
  if (isProtectedResource(normalized)) {
    return null;
  }

  if (RESOURCE_WITH_LOCALE.has(normalized)) {
    const lang = locale?.trim().toLowerCase();
    if (!lang) {
      return null;
    }
    return `${normalized}-${lang}`;
  }
  return normalized;
};

/**
 * Resources that are configuration rather than content.
 *
 * Nothing is wrong with a site that has never opened the social accounts panel
 * or saved an AI key, so "nothing stored yet" is an empty configuration, not a
 * missing page. Answering 404 for these put a red line in the console of every
 * admin session and taught operators to ignore the console, which is where the
 * real failures are printed.
 */
const EMPTY_WHEN_UNSET = new Set(['social-api-settings', 'ai-settings', 'payment-config-public']);

/** Content that is better read in English than not at all. */
const FALLBACK_TO_ENGLISH = new Set([
  'tours',
  'transport-services',
  'example-tours',
  'blog',
  'story-elements',
  'intro-story',
  'story-nodes',
  'site-pages',
]);

const createErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const JSONBIN_RESOURCE_MAP: Record<string, string | { en: string; es: string; fr?: string; de?: string }> = {
  'brand': 'VITE_JSONBIN_BRAND_BIN_ID',
  'transfer-config': 'VITE_JSONBIN_TRANSFER_BIN_ID',
  'social-media': 'VITE_JSONBIN_SOCIAL_BIN_ID',
  'social-api-settings': 'VITE_JSONBIN_SOCIAL_API_SETTINGS_BIN_ID',
  'testimonials': 'VITE_JSONBIN_TESTIMONIALS_BIN_ID',
  'blog': { en: 'VITE_JSONBIN_BLOG_EN', es: 'VITE_JSONBIN_BLOG_ES', fr: 'VITE_JSONBIN_BLOG_FR', de: 'VITE_JSONBIN_BLOG_DE' },
  'tours': { en: 'VITE_JSONBIN_TOURS_EN', es: 'VITE_JSONBIN_TOURS_ES', fr: 'VITE_JSONBIN_TOURS_FR', de: 'VITE_JSONBIN_TOURS_DE' },
  'transport-services': { en: 'VITE_JSONBIN_TRANSPORT_EN', es: 'VITE_JSONBIN_TRANSPORT_ES', fr: 'VITE_JSONBIN_TRANSPORT_FR', de: 'VITE_JSONBIN_TRANSPORT_DE' },
  'example-tours': { en: 'VITE_JSONBIN_EXAMPLETESTOURS_EN_BIN_ID', es: 'VITE_JSONBIN_EXAMPLETESTOURS_ES_BIN_ID', fr: 'VITE_JSONBIN_EXAMPLETESTOURS_FR_BIN_ID', de: 'VITE_JSONBIN_EXAMPLETESTOURS_DE_BIN_ID' },
  'story-elements': { en: 'VITE_JSONBIN_STORY_ELEMENTS_EN', es: 'VITE_JSONBIN_STORY_ELEMENTS_ES', fr: 'VITE_JSONBIN_STORY_ELEMENTS_FR', de: 'VITE_JSONBIN_STORY_ELEMENTS_DE' },
  'intro-story': { en: 'VITE_JSONBIN_JOURNEY_EN', es: 'VITE_JSONBIN_JOURNEY_ES', fr: 'VITE_JSONBIN_JOURNEY_FR', de: 'VITE_JSONBIN_JOURNEY_DE' },
  'story-nodes': { en: 'VITE_JSONBIN_STORY_NODES_EN', es: 'VITE_JSONBIN_STORY_NODES_ES', fr: 'VITE_JSONBIN_STORY_NODES_FR', de: 'VITE_JSONBIN_STORY_NODES_DE' },
  'story-quiz-rules': 'VITE_JSONBIN_STORY_RULES',
  'translations': { en: 'VITE_JSONBIN_EN_BIN_ID', es: 'VITE_JSONBIN_ES_BIN_ID', fr: 'VITE_JSONBIN_FR_BIN_ID', de: 'VITE_JSONBIN_DE_BIN_ID' },
};

const parseResourceKey = (key: string) => {
  const match = /^(.*)-(en|es|fr|de)$/.exec(key);
  if (match) {
    return { resource: match[1], locale: match[2] };
  }
  return { resource: key };
};

const normalizeJsonBinUrl = (binDefinition: string | undefined, method: 'GET' | 'PUT' = 'GET'): string | null => {
  if (!binDefinition || !binDefinition.trim()) return null;
  const trimmed = binDefinition.trim();
  // For full URLs, strip /latest for PUT; ensure /latest for GET
  const base = /^https?:\/\//i.test(trimmed)
    ? trimmed.replace(/\/latest\/?$/i, '')
    : `https://api.jsonbin.io/v3/b/${trimmed}`;
  return method === 'GET' ? `${base}/latest` : base;
};

const getJsonBinUrl = (resource: string, locale: string | undefined, env: Record<string, any>, method: 'GET' | 'PUT' = 'GET'): string | null => {
  const entry = JSONBIN_RESOURCE_MAP[resource];
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    return normalizeJsonBinUrl(env[entry], method);
  }

  if (!locale) {
    return null;
  }

  const localeKey = locale as 'en' | 'es' | 'fr' | 'de';
  const envKey = entry[localeKey] ?? entry.en ?? entry.es;
  return normalizeJsonBinUrl(env[envKey], method);
};

const jsonBinFetch = async (url: string, masterKey?: string): Promise<unknown | null> => {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (masterKey) {
      headers['X-Master-Key'] = masterKey;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-cache',
    });

    if (!response.ok) {
      console.warn('[Cloudflare Function] JSONBin fetch failed for', url, response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('[Cloudflare Function] JSONBin fetch error for', url, error);
    return null;
  }
};

const loadStoredData = async (key: string, env: Record<string, any>, requestUrl?: string) => {
  // Prefer a site-specific binding `DATA_KV_F` if present, otherwise fall back to `DATA_KV`.
  const dataKV = env.DATA_KV_F ?? env.DATA_KV;
  if (dataKV && typeof dataKV.get === 'function') {
    try {
      const stored = await dataKV.get(key, { type: 'json' });
      if (stored !== null) {
        return stored;
      }
    } catch (err) {
      console.warn('[Cloudflare Function] KV read failed for', key, err);
    }
  }

  const localData = await readLocalJson(key, env, requestUrl);
  if (localData !== null) {
    return localData;
  }

  const { resource, locale } = parseResourceKey(key);
  const jsonBinUrl = getJsonBinUrl(resource, locale, env, 'GET');
  if (!jsonBinUrl) {
    return null;
  }

  const payload = await jsonBinFetch(jsonBinUrl, env.VITE_JSONBIN_MASTER_KEY);
  if (payload === null) {
    return null;
  }

  try {
    await saveStoredData(key, payload, env);
  } catch (err) {
    console.warn('[Cloudflare Function] Failed to persist JSONBin fallback for', key, err);
  }

  return payload;
};

const saveStoredData = async (key: string, payload: unknown, env: Record<string, any>) => {
  // Prefer a site-specific binding `DATA_KV_F` if present, otherwise fall back to `DATA_KV`.
  const dataKV = env.DATA_KV_F ?? env.DATA_KV;
  if (dataKV && typeof dataKV.put === 'function') {
    try {
      await dataKV.put(key, JSON.stringify(payload));
      return;
    } catch (err) {
      console.warn('[Cloudflare Function] KV write failed for', key, err);
      // Fall through to JSONBin fallback below
    }
  }

  // Fallback to JSONBin if KV is not configured
  const { resource, locale } = parseResourceKey(key);
  const jsonBinUrl = getJsonBinUrl(resource, locale, env, 'PUT');

  if (!jsonBinUrl) {
    console.warn('[Cloudflare Function] No storage backend available for', key, '- skipping persistence');
    return;
  }

  const masterKey = env.VITE_JSONBIN_MASTER_KEY;
  if (!masterKey) {
    console.warn('[Cloudflare Function] JSONBin URL found but VITE_JSONBIN_MASTER_KEY is missing - skipping persistence');
    return;
  }

  const response = await fetch(jsonBinUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': masterKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.warn('[Cloudflare Function] JSONBin PUT fallback failed for', key, 'with status', response.status);
  }
};

export async function onRequest(context: { request: Request; env: Record<string, any> }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource');
  const locale = url.searchParams.get('locale');

  if (!resource) {
    return createErrorResponse('Missing resource query parameter.', 400);
  }

  const key = buildResourceKey(resource, locale || undefined);
  if (!key) {
    return createErrorResponse('Missing or invalid locale for resource.', 400);
  }

  try {
    if (request.method === 'GET') {
      let data = await loadStoredData(key, env, request.url);
      let source = 'stored';
      // A content record a site has not been given in German or French yet is
      // served in English, so those readers see the catalogue rather than an
      // empty page. Admin reads that write back ask for the exact record
      // (?exact=1), so the translation tools still see what is missing. Site
      // texts are left out on purpose: English overrides would cover the
      // bundled German and French interface text.
      if (
        (data === null || data === undefined) &&
        (locale === 'fr' || locale === 'de') &&
        FALLBACK_TO_ENGLISH.has(resource.trim().toLowerCase()) &&
        url.searchParams.get('exact') !== '1'
      ) {
        const englishKey = buildResourceKey(resource, 'en');
        data = englishKey ? await loadStoredData(englishKey, env, request.url) : null;
        source = 'english-fallback';
      }
      if (data === null || data === undefined) {
        if (EMPTY_WHEN_UNSET.has(key)) {
          return new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Data-Source': 'unset' },
          });
        }
        return createErrorResponse(`Data for resource '${resource}' not found.`, 404);
      }
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'X-Data-Source': source },
      });
    }

    if (request.method === 'PUT') {
      // Authenticate admin writes against the deployment's configured password.
      const auth = await verifyAdminRequest(env, request);
      if (!auth.ok) {
        return createErrorResponse(auth.error, auth.status);
      }

      const body = await request.json().catch(() => null);
      if (body === null) {
        return createErrorResponse('Request body must be valid JSON.', 400);
      }
      await saveStoredData(key, body, env);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return createErrorResponse('Unsupported HTTP method.', 405);
  } catch (error: any) {
    return createErrorResponse(error?.message ?? 'Internal error', 500);
  }
}