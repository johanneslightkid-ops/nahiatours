/**
 * The one place the build resolves "who is this site, and where does it live".
 *
 * Both the sitemap generator and the SEO writer read from here, so the brand
 * name and the site URL can never disagree between them. Nothing is hardcoded
 * to a particular company or domain: the brand comes from the same brand.json
 * the running site reads, and the URL comes from the environment.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_SITE_URL = 'https://beautiful-tours.johannes-neugschwentner.workers.dev';
const DEFAULT_BRAND_NAME = 'Beautiful Tours';

/** Accepts "example.com", "https://example.com" or a trailing slash. */
export const normalizeSiteUrl = (value) => {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/**
 * Where the site is served. Set SITE_URL on the Worker's build variables once
 * a real domain exists; the Cloudflare-provided values are used as a fallback
 * so a preview still produces coherent absolute URLs.
 */
export const resolveSiteUrl = () =>
  normalizeSiteUrl(process.env.SITE_URL) ||
  normalizeSiteUrl(process.env.CF_PAGES_URL) ||
  normalizeSiteUrl(process.env.CLOUDFLARE_PAGES_URL) ||
  normalizeSiteUrl(process.env.CLOUDFLARE_DOMAIN) ||
  DEFAULT_SITE_URL;

/**
 * The configured company name — the same value the menu bar shows.
 * public/data/brand.json is refreshed by populate-local-data before this runs,
 * so a rename in the admin panel reaches the meta tags on the next deploy.
 */
export const resolveBrandName = async () => {
  if (process.env.BRAND_NAME && process.env.BRAND_NAME.trim()) {
    return process.env.BRAND_NAME.trim();
  }
  for (const candidate of ['public/data/brand.json', 'functions/data/brand.json']) {
    try {
      const raw = await readFile(join(ROOT, candidate), 'utf-8');
      const parsed = JSON.parse(raw);
      const name = typeof parsed?.brandName === 'string' ? parsed.brandName.trim() : '';
      if (name) return name;
    } catch {
      // Try the next source.
    }
  }
  return DEFAULT_BRAND_NAME;
};

/** Everything the SEO writer and the sitemap need, resolved once. */
export const resolveSiteConfig = async () => {
  const siteUrl = resolveSiteUrl();
  const brandName = await resolveBrandName();
  return {
    siteUrl,
    brandName,
    locales: ['en', 'es'],
    description:
      `Caribbean tours and excursions in Punta Cana with ${brandName}: island trips, ` +
      'party boats, dune buggies, 4x4 adventures, horseback riding, dolphin swimming and more.',
    shortDescription: `Caribbean tours and excursions in Punta Cana with ${brandName}.`,
  };
};
