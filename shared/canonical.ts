/**
 * Canonical-host policy, shared by both deployment shapes.
 *
 * The host is configuration, not a constant: set CANONICAL_HOST on the Worker
 * to the domain the site should be indexed under, and every other hostname
 * 301s to it. Leave it unset — the default — and no redirect happens at all,
 * which is what an independent deployment wants.
 *
 * Preview hosts are never redirected. They are served in place and marked
 * noindex, so a preview deployment can actually be looked at while still
 * leaving one indexable copy of the site.
 */

export interface CanonicalEnv {
  /** Domain to canonicalise to, e.g. "example.com". Unset means no redirect. */
  CANONICAL_HOST?: string;
  [key: string]: unknown;
}

/** Strips scheme, path and trailing slash, so either form works in config. */
const normalizeHost = (value: string): string =>
  value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\/$/, '');

const PREVIEW_HOST_SUFFIXES = ['.workers.dev', '.pages.dev'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export const isPreviewHost = (hostname: string): boolean =>
  LOCAL_HOSTS.has(hostname) ||
  PREVIEW_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

/**
 * A 301 to the canonical host, or null when the request should be served where
 * it is (the canonical host itself, or any preview host).
 */
export const canonicalRedirect = (url: URL, env: CanonicalEnv = {}): Response | null => {
  const configured = typeof env.CANONICAL_HOST === 'string' ? normalizeHost(env.CANONICAL_HOST) : '';
  if (!configured || url.hostname === configured || isPreviewHost(url.hostname)) {
    return null;
  }
  return Response.redirect(`https://${configured}${url.pathname}${url.search}`, 301);
};

/** Keep preview deployments out of search results. */
export const withPreviewHeaders = (response: Response, hostname: string): Response => {
  if (!isPreviewHost(hostname)) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
