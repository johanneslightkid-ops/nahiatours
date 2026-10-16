/**
 * populate-cloudflare-kv.mjs
 *
 * Populates Cloudflare KV with data from local JSON files by sending
 * PUT requests to the production API endpoint.
 *
 * Usage:
 *   node scripts/populate-cloudflare-kv.mjs
 *
 * The script reads VITE_API_BASE_URL from .env if available, or uses
 * the production URL.
 */

const API_BASE = process.env.VITE_API_BASE_URL || process.env.SITE_URL || 'http://localhost:8788';
const API_PATH = '/api/data';

const RESOURCES_WITH_LOCALE = [
  'intro-story',
  'story-elements',
  'translations',
  'blog',
  'tours',
  'example-tours',
  'transport-services',
];

const RESOURCES_SINGLE = [
  'testimonials',
  'social-media',
  'brand',
  'transfer-config',
];

async function main() {
  // Populate single (non-localized) resources
  for (const resource of RESOURCES_SINGLE) {
    try {
      const data = await import(`../functions/data/${resource}.json`, { assert: { type: 'json' } });
      const url = `${API_BASE}${API_PATH}?resource=${resource}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.default),
      });
      const text = await res.text();
      console.log(`[${resource}] ${res.status} ${res.ok ? 'OK' : text.slice(0, 100)}`);
    } catch (err) {
      console.error(`[${resource}] FAILED:`, err.message);
    }
  }

  // Populate localized resources (en, es)
  for (const resource of RESOURCES_WITH_LOCALE) {
    for (const locale of ['en', 'es']) {
      try {
        const data = await import(`../functions/data/${resource}-${locale}.json`, { assert: { type: 'json' } });
        const url = `${API_BASE}${API_PATH}?resource=${resource}&locale=${locale}`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.default),
        });
        const text = await res.text();
        console.log(`[${resource}-${locale}] ${res.status} ${res.ok ? 'OK' : text.slice(0, 100)}`);
      } catch (err) {
        console.error(`[${resource}-${locale}] FAILED:`, err.message);
      }
    }
  }
}

main().catch(console.error);