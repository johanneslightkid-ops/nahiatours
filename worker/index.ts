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
import { onRequest as handleAi } from '../functions/api/ai';
import { onRequest as handleHealth } from '../functions/api/health';
import { onRequest as handleTestimonials } from '../functions/api/testimonials';
import { onRequest as handleAdminPassword } from '../functions/api/admin-password';
import { onRequest as handleStripeCheckout } from '../functions/api/stripe-checkout';
import { onRequest as handleStripeSession } from '../functions/api/stripe-session';
import { onRequest as handleStripeReady } from '../functions/api/stripe-ready';
import { onRequest as handlePaymentConfig } from '../functions/api/payment-config';
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
  // Which branch built what is being served, and which bindings arrived with
  // it. Public, and carries no value that is worth keeping.
  '/api/health': handleHealth,
  // A visitor leaving a review. The generic writer is admin-only and must
  // stay that way, so this does one thing and appends unapproved.
  '/api/testimonials': handleTestimonials,
  '/api/admin-auth': handleAdminAuth,
  // One endpoint for Gemini, OpenRouter and Workers AI. `/api/cf-ai` stays
  // routed below so an older client build keeps working after a deploy.
  '/api/ai': handleAi,
  '/api/admin-password': handleAdminPassword,
  '/api/stripe-checkout': handleStripeCheckout,
  '/api/stripe-session': handleStripeSession,
  '/api/stripe-ready': handleStripeReady,
  '/api/payment-config': handlePaymentConfig,
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
