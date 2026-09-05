/**
 * Canonical-host policy, shared by both deployment shapes.
 *
 * The site used to bounce every non-canonical hostname to ferreras.tours with
 * a 301. That is right for a stray custom domain, but it also meant a preview
 * deployment redirected away from itself the moment you opened it — you could
 * never look at what you had just deployed.
 *
 * So preview hosts are served normally and marked noindex instead, which keeps
 * the SEO intent (one indexable copy of the site) without making previews
 * useless.
 */

export const CANONICAL_HOST = 'ferreras.tours';

const PREVIEW_HOST_SUFFIXES = ['.workers.dev', '.pages.dev'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export const isPreviewHost = (hostname: string): boolean =>
  LOCAL_HOSTS.has(hostname) ||
  PREVIEW_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

/**
 * A 301 to the canonical host, or null when the request should be served where
 * it is (the canonical host itself, or any preview host).
 */
export const canonicalRedirect = (url: URL): Response | null => {
  if (url.hostname === CANONICAL_HOST || isPreviewHost(url.hostname)) {
    return null;
  }
  return Response.redirect(`https://${CANONICAL_HOST}${url.pathname}${url.search}`, 301);
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
