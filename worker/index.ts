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
import { onRequest as handleTranscribe } from '../functions/api/transcribe';
import { onRequest as handleHealth } from '../functions/api/health';
import { onRequest as handleTestimonials } from '../functions/api/testimonials';
import { onRequest as handleAdminPassword } from '../functions/api/admin-password';
import { onRequest as handleStripeCheckout } from '../functions/api/stripe-checkout';
import { onRequest as handleStripeSession } from '../functions/api/stripe-session';
import { onRequest as handleStripeReady } from '../functions/api/stripe-ready';
import { onRequest as handlePaymentConfig } from '../functions/api/payment-config';
import { onRequest as handlePaymentsReady } from '../functions/api/payments-ready';
import { onRequest as handleCardCheckout } from '../functions/api/card-checkout';
import { onRequest as handleAzulCheckout } from '../functions/api/azul-checkout';
import { onRequest as handleVerifoneCheckout } from '../functions/api/verifone-checkout';
import { onRequest as handleCardnetCheckout } from '../functions/api/cardnet-checkout';
import { onRequest as handlePayReturn } from '../functions/api/pay-return';
import { onRequest as handlePaymentResult } from '../functions/api/payment-result';
import { onRequest as handleContactRequest } from '../functions/api/contact-request';
import { onRequest as handleNotifyConfig } from '../functions/api/notify-config';
import { onRequest as handlePayAttempt, sweepOverdue } from '../functions/api/pay-attempt';
import { onRequest as handleActivity } from '../functions/api/activity';
import { onRequest as handleSendSummary } from '../functions/api/send-summary';
import { onRequest as handleYoutube } from '../functions/api/youtube';
import { canonicalRedirect, withPreviewHeaders } from '../shared/canonical';
import { robotsResponse, sitemapResponse, withPageSeo } from '../shared/seo';

export interface Env {
  /** Static assets binding, declared in wrangler.toml. */
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  [key: string]: unknown;
}

interface ExecutionContext {
  waitUntil: (promise: Promise<unknown>) => void;
}

type RouteHandler = (context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
  /** Work that may outlive the response (a notification); absent in tests. */
  waitUntil?: (promise: Promise<unknown>) => void;
}) => Promise<Response>;

const ROUTES: Record<string, RouteHandler> = {
  '/api/data': handleData,
  '/api/youtube': handleYoutube,
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
  // Dictation from a phone: recorded audio to Whisper on Workers AI.
  '/api/transcribe': handleTranscribe,
  '/api/admin-password': handleAdminPassword,
  '/api/stripe-checkout': handleStripeCheckout,
  '/api/stripe-session': handleStripeSession,
  '/api/stripe-ready': handleStripeReady,
  '/api/payment-config': handlePaymentConfig,
  // One card endpoint for the storefront; the processor (Stripe, Azul or
  // CardNET) is the operator's choice. See shared/cardCheckout.ts.
  '/api/payments-ready': handlePaymentsReady,
  '/api/card-checkout': handleCardCheckout,
  '/api/azul-checkout': handleAzulCheckout,
  '/api/verifone-checkout': handleVerifoneCheckout,
  '/api/cardnet-checkout': handleCardnetCheckout,
  '/api/payment-result': handlePaymentResult,
  '/api/contact-request': handleContactRequest,
  // The shopping cart's side of things: who to tell (and how), payment
  // presses and their answers, what guests did, a summary by email.
  '/api/notify-config': handleNotifyConfig,
  '/api/pay-attempt': handlePayAttempt,
  '/api/activity': handleActivity,
  '/api/send-summary': handleSendSummary,
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
  // The banks send the guest back to /api/pay-return/<bank>/<order>/<outcome>:
  // a path rather than a query string, because both append their own.
  if (url.pathname.startsWith('/api/pay-return/')) {
    return handlePayReturn;
  }
  // /blog is both a page and a legacy JSON endpoint. Only the documented
  // `?locale=` form is the endpoint; a plain visit gets the blog page.
  if (url.pathname === '/blog' && url.searchParams.has('locale')) {
    return handleBlog;
  }
  return undefined;
};

/**
 * When this isolate last looked for payments nobody confirmed. There is no
 * cron on the free plan for six sites, so the look happens in the background
 * of ordinary API traffic, at most every few minutes per isolate. Being late
 * by a few minutes is fine for a 30-minute timeout; a site nobody visits has
 * nobody paying either.
 */
let lastSweep = 0;
const SWEEP_EVERY_MS = 3 * 60 * 1000;

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const redirect = canonicalRedirect(url, env);
    if (redirect) {
      return redirect;
    }

    // Built from live data, so a tour added in the admin is in the sitemap
    // at once, and both always name the site's own address (SITE_URL).
    if (url.pathname === '/sitemap.xml') return withPreviewHeaders(await sitemapResponse(env, url), url.hostname, env);
    if (url.pathname === '/robots.txt') return robotsResponse(env, url);

    const serveAsset = () => env.ASSETS.fetch(request);
    const waitUntil = ctx ? (promise: Promise<unknown>) => ctx.waitUntil(promise) : undefined;
    const handler = resolveHandler(url);
    // Pages get their own title, description, canonical and structured data
    // (shared/seo.ts); API responses and files pass through untouched.
    const response = handler
      ? await handler({ request, env, next: serveAsset, waitUntil })
      : await withPageSeo(request, await serveAsset(), env);

    if (ctx && handler && Date.now() - lastSweep > SWEEP_EVERY_MS) {
      lastSweep = Date.now();
      ctx.waitUntil(sweepOverdue(env).catch((error) => console.warn('[sweep]', error)));
    }

    return withPreviewHeaders(response, url.hostname, env);
  },

  /** For a `[triggers] crons` entry, should one ever be added to wrangler.toml. */
  async scheduled(_event: unknown, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(sweepOverdue(env));
  },
};
