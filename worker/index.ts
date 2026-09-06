/**
 * Worker entry point.
 *
 * The Cloudflare project for this site runs `npx wrangler deploy`, which is the
 * Workers deploy command: it needs a script entry point and an assets
 * directory, neither of which a Pages config provides. This module is that
 * entry point.
 *
 * It deliberately does not reimplement anything. The route table below points
 * at the very same `functions/*` modules the Pages deployment uses, so there is
 * one implementation of each endpoint no matter which way the site ships. All
 * of them are plain `onRequest({ request, env })` handlers over web APIs, so
 * they need no adaptation — only dispatching.
 *
 * Anything that is not an API route falls through to the static assets, with
 * `not_found_handling = "single-page-application"` in wrangler.toml serving
 * index.html for client-side routes like /tours and /plan.
 */

import { onRequest as handleData } from '../functions/api/data';
import { onRequest as handleCfAi } from '../functions/api/cf-ai';
import { onRequest as handleUpload } from '../functions/api/upload';
import { onRequest as handleSocialPublish } from '../functions/api/social-publish';
import { onRequest as handleInitData } from '../functions/init-data';
import { onRequest as handleBlog } from '../functions/blog';
import { onRequest as handleAdminAuth } from '../functions/api/admin-auth';
import { canonicalRedirect, withPreviewHeaders } from '../shared/canonical';

export interface Env {
  /** Static assets binding, declared in wrangler.toml. */
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  [key: string]: unknown;
}

type RouteHandler = (context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}) => Promise<Response>;

const ROUTES: Record<string, RouteHandler> = {
  '/api/data': handleData,
  '/api/admin-auth': handleAdminAuth,
  '/api/cf-ai': handleCfAi,
  '/api/upload': handleUpload,
  '/api/social-publish': handleSocialPublish,
  // Pages routed this at /init-data (from the filename) while the docs and the
  // trigger script both call /api/init-data. Accept both.
  '/init-data': handleInitData,
  '/api/init-data': handleInitData,
};

const resolveHandler = (url: URL): RouteHandler | undefined => {
  const route = ROUTES[url.pathname];
  if (route) {
    return route;
  }
  // /blog is both a page and a legacy JSON endpoint. Only the documented
  // `?locale=` form is the endpoint; a plain visit gets the blog page.
  if (url.pathname === '/blog' && url.searchParams.has('locale')) {
    return handleBlog;
  }
  return undefined;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const redirect = canonicalRedirect(url, env);
    if (redirect) {
      return redirect;
    }

    const serveAsset = () => env.ASSETS.fetch(request);
    const handler = resolveHandler(url);
    const response = handler
      ? await handler({ request, env, next: serveAsset })
      : await serveAsset();

    return withPreviewHeaders(response, url.hostname);
  },
};
