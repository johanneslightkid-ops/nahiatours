import { getAdminPassword } from './authStore';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';
const API_BASE_URL = rawBaseUrl.replace(/\/+$|^\s+|\s+$/g, '');
const DEFAULT_API_PATH = '/api/data';
const API_DATA_PATH = import.meta.env.VITE_DATA_API_ENDPOINT?.trim() || `${API_BASE_URL}${DEFAULT_API_PATH}`;

const buildQueryString = (params?: Record<string, string | number | boolean>) => {
  if (!params) return '';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

const buildApiUrl = (resource: string, params?: Record<string, string | number | boolean>) => {
  const normalizedPath = API_DATA_PATH.replace(/\/+$/, '');
  const query = { resource, ...params };
  return `${normalizedPath}${buildQueryString(query)}`;
};

/**
 * An API error that still carries what the server said.
 *
 * Every failure used to be thrown as `API POST failed for x with status 502`,
 * with the response body — the part naming the provider, the model and the
 * actual reason — read and discarded. Callers had nothing to show the
 * operator but a status code.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: any;

  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const readBody = async (response: Response): Promise<any> => {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const body = await response.text();
  if (!body) {
    return {} as T;
  }
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error}`);
  }
};

const apiFetch = async <T>(resource: string, params?: Record<string, string | number | boolean>, options?: RequestInit): Promise<T> => {
  const url = buildApiUrl(resource, params);
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': options?.body ? 'application/json' : undefined,
      ...(options?.headers ?? {}),
    },
    cache: options?.cache ?? 'no-cache',
  });

  if (!response.ok) {
    const body = await readBody(response);
    const detail = typeof body === 'string' ? body : body?.error || body?.message;
    throw new ApiError(
      `API request failed for ${resource} with status ${response.status}${detail ? `: ${detail}` : ''}`,
      response.status,
      body
    );
  }

  return parseJson<T>(response);
};

/**
 * Resources the API serves per language. Mirrors RESOURCE_WITH_LOCALE in
 * functions/api/data.ts, which decides the same thing on the server.
 */
const LOCALIZED_RESOURCES = new Set([
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
]);

const bundledPath = (resource: string, locale?: string | number | boolean) => {
  const key = resource.trim().toLowerCase();
  return LOCALIZED_RESOURCES.has(key) && locale
    ? `/data/${key}-${String(locale).toLowerCase()}.json`
    : `/data/${key}.json`;
};

/**
 * Every read has a bundled copy in /data. Falling back to it keeps the site
 * fully populated when the API is unreachable — `vite dev` has no Functions
 * runtime and answers /api/* with index.html, and production KV can hiccup.
 */
const fetchBundled = async <T>(
  resource: string,
  params?: Record<string, string | number | boolean>
): Promise<T | null> => {
  try {
    const response = await fetch(bundledPath(resource, params?.locale), { cache: 'no-cache' });
    if (!response.ok) return null;
    const body = await response.text();
    if (!body || body.trimStart().startsWith('<')) return null;
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
};

export const apiGet = async <T>(resource: string, params?: Record<string, string | number | boolean>): Promise<T> => {
  try {
    return await apiFetch<T>(resource, params, { method: 'GET' });
  } catch (error) {
    const bundled = await fetchBundled<T>(resource, params);
    if (bundled !== null) {
      // Only chatty on a dev machine; in production a silent, complete page
      // beats a console full of noise.
      if (typeof location !== 'undefined' && /^(localhost|127\.|\[::1\])/.test(location.hostname)) {
        console.info(`[api] ${resource}: no API here, using bundled ${bundledPath(resource, params?.locale)}`);
      }
      return bundled;
    }
    throw error;
  }
};

export const apiPut = async <T>(resource: string, body: unknown, params?: Record<string, string | number | boolean>): Promise<T> => {
  const password = getAdminPassword();
  return apiFetch<T>(resource, params, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: password ? { 'X-Admin-Password': password } : undefined,
  });
};

export const apiPost = async <T>(resource: string, body: unknown, params?: Record<string, string | number | boolean>): Promise<T> => {
  const password = getAdminPassword();
  // Using the rawBaseUrl + /api/resource for endpoints like /api/social-publish that are not /api/data
  const url = import.meta.env.VITE_API_BASE_URL?.trim() 
    ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')}/api/${resource}${buildQueryString(params)}`
    : `/api/${resource}${buildQueryString(params)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(password ? { 'X-Admin-Password': password } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-cache',
  });

  if (!response.ok) {
    const body = await readBody(response);
    const detail = typeof body === 'string' ? body : body?.error || body?.message;
    throw new ApiError(
      `API POST failed for ${resource} with status ${response.status}${detail ? `: ${detail}` : ''}`,
      response.status,
      body
    );
  }

  const responseText = await response.text();
  return (responseText ? JSON.parse(responseText) : {}) as T;
};