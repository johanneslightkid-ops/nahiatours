/**
 * populate-local-data.mjs
 *
 * Build-time script that fetches ALL data from JSONBin and writes it into
 * functions/data/*.json files. These local files serve as the runtime fallback
 * inside Cloudflare Pages Functions (read by functions/api/data.ts).
 *
 * This script runs BEFORE `vite build` so the JSON files are bundled with the deploy.
 *
 * Usage:
 *   node scripts/populate-local-data.mjs
 *
 * Environment variables required:
 *   All VITE_JSONBIN_*_BIN_ID / VITE_JSONBIN_* env vars (same as your .env / Cloudflare dashboard)
 *   VITE_JSONBIN_MASTER_KEY
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'functions', 'data');

// ── Resource map ──────────────────────────────────────────────────────────────
// Matches the same mapping in functions/api/data.ts and functions/init-data.ts
const RESOURCE_MAP = [
  // Monolingual resources (single file per resource)
  { filename: 'brand.json',              envKey: 'VITE_JSONBIN_BRAND_BIN_ID' },
  { filename: 'transfer-config.json',     envKey: 'VITE_JSONBIN_TRANSFER_BIN_ID' },
  { filename: 'social-media.json',        envKey: 'VITE_JSONBIN_SOCIAL_BIN_ID' },
  { filename: 'testimonials.json',        envKey: 'VITE_JSONBIN_TESTIMONIALS_BIN_ID' },

  // Bilingual resources (one file per locale)
  { filename: 'blog-en.json',             envKey: 'VITE_JSONBIN_BLOG_EN' },
  { filename: 'blog-es.json',             envKey: 'VITE_JSONBIN_BLOG_ES' },
  { filename: 'tours-en.json',            envKey: 'VITE_JSONBIN_TOURS_EN' },
  { filename: 'tours-es.json',            envKey: 'VITE_JSONBIN_TOURS_ES' },
  { filename: 'transport-services-en.json', envKey: 'VITE_JSONBIN_TRANSPORT_EN' },
  { filename: 'transport-services-es.json', envKey: 'VITE_JSONBIN_TRANSPORT_ES' },
  { filename: 'example-tours-en.json',    envKey: 'VITE_JSONBIN_EXAMPLETESTOURS_EN_BIN_ID' },
  { filename: 'example-tours-es.json',    envKey: 'VITE_JSONBIN_EXAMPLETESTOURS_ES_BIN_ID' },
  { filename: 'story-elements-en.json',   envKey: 'VITE_JSONBIN_STORY_ELEMENTS_EN' },
  { filename: 'story-elements-es.json',   envKey: 'VITE_JSONBIN_STORY_ELEMENTS_ES' },
  { filename: 'intro-story-en.json',      envKey: 'VITE_JSONBIN_JOURNEY_EN' },
  { filename: 'intro-story-es.json',      envKey: 'VITE_JSONBIN_JOURNEY_ES' },
  { filename: 'translations-en.json',     envKey: 'VITE_JSONBIN_EN_BIN_ID' },
  { filename: 'translations-es.json',     envKey: 'VITE_JSONBIN_ES_BIN_ID' },
];

const log = (msg) => console.log(`[populate-local-data] ${msg}`);

/**
 * Accept a bin ID or a full JSONBin URL.
 * Returns the full API URL for fetching the latest version.
 */
const normalizeJsonBinUrl = (binDefinition) => {
  if (!binDefinition || !binDefinition.trim()) return null;
  const trimmed = binDefinition.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/latest\/?$/i, '/latest');
  }
  return `https://api.jsonbin.io/v3/b/${trimmed}/latest`;
};

/**
 * Fetch data from JSONBin. Retries up to 3 times on failure.
 */
const fetchWithRetry = async (url, masterKey, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const headers = { Accept: 'application/json' };
      if (masterKey) headers['X-Master-Key'] = masterKey;

      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      if (attempt === retries) throw err;
      log(`Retry ${attempt}/${retries} for ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
};

const run = async () => {
  log('Starting data population from JSONBin…');

  // Ensure DATA_DIR exists
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const masterKey = process.env.VITE_JSONBIN_MASTER_KEY;
  if (!masterKey) {
    log('WARNING: VITE_JSONBIN_MASTER_KEY is not set. Private bins may fail.');
  }

  let fetched = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of RESOURCE_MAP) {
    const binIdOrUrl = process.env[entry.envKey];
    if (!binIdOrUrl) {
      log(`SKIP  ${entry.filename}  ←  ${entry.envKey} not configured`);
      skipped++;
      continue;
    }

    const url = normalizeJsonBinUrl(binIdOrUrl);
    if (!url) {
      log(`SKIP  ${entry.filename}  ←  Invalid value for ${entry.envKey}`);
      skipped++;
      continue;
    }

    try {
      const raw = await fetchWithRetry(url, masterKey);
      // JSONBin v3 wraps data in { record: ..., metadata: ... }
      // Extract the actual payload, or use raw if it's not a JSONBin response.
      const payload = raw && typeof raw === 'object' && 'record' in raw ? raw.record : raw;

      const filePath = path.join(DATA_DIR, entry.filename);
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      log(`OK    ${entry.filename}  (${JSON.stringify(payload).length} bytes)`);
      fetched++;
    } catch (err) {
      log(`ERROR ${entry.filename}  —  ${err.message}`);
      errors++;
    }
  }

  log('');
  log(`Done.  Fetched: ${fetched}  |  Skipped: ${skipped}  |  Errors: ${errors}`);

  if (errors > 0) {
    log('WARNING: Some resources failed. The site will use existing local fallbacks.');
  }
};

run().catch((err) => {
  console.error('[populate-local-data] Fatal error:', err);
  process.exit(1);
});