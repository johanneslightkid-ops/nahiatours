/**
 * Give a freshly seeded site its own identity.
 *
 * A new site is seeded from another site's KV (scripts/clone-kv.mjs), which
 * brings that site's brand along: its name, its owner, its WhatsApp number,
 * its PayPal and card links, its social accounts. Those belong to the other
 * business. This replaces them with the values below — and leaves every
 * other field of the brand (hero media, settings) as it was copied.
 *
 *   BRAND_PATCH        JSON object merged over the stored `brand`
 *   SOCIAL_RESET=true  store an empty `social-media` (no accounts, no videos)
 *   ONLY_IF_BRAND_NAME apply the patch only while the stored brand is still
 *                      called exactly this — a one-time rename that leaves a
 *                      name the operator has since chosen alone. With it set,
 *                      nothing is written unless the stored brand was read.
 *   ONLY_IF_HERO_URLS  comma-separated: apply the patch only while the stored
 *                      heroMedia still begins with exactly these URLs — a
 *                      one-time swap of seeded media that leaves anything
 *                      chosen since in the admin alone. Same rule: nothing is
 *                      written unless the stored brand was read.
 *   DEST_KV_TITLE / KV_NAMESPACE_TITLE, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
 *
 * Run only on a site's first deploy (the workflow checks); afterwards the
 * brand is the operator's to edit in the admin.
 */
const API = 'https://api.cloudflare.com/client/v4';
const token = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
const account = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const title = process.env.DEST_KV_TITLE || process.env.KV_NAMESPACE_TITLE;
const log = (message) => console.log(`[stub-brand] ${message}`);

const cf = async (path, init = {}) => {
  const response = await fetch(`${API}/accounts/${account}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  return response;
};

const main = async () => {
  if (!token || !account || !title) throw new Error('CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and KV_NAMESPACE_TITLE are required');
  const patch = JSON.parse(process.env.BRAND_PATCH || '{}');

  let namespace = null;
  for (let page = 1; !namespace; page += 1) {
    const body = await (await cf(`/storage/kv/namespaces?per_page=100&page=${page}`)).json();
    if (!body.success) throw new Error(JSON.stringify(body.errors));
    namespace = body.result.find((ns) => ns.title === title) ?? null;
    if (body.result.length < 100) break;
  }
  if (!namespace) throw new Error(`no namespace titled ${title}`);

  const put = async (key, value) => {
    const form = new FormData();
    form.append('value', JSON.stringify(value));
    form.append('metadata', '{}');
    const body = await (await cf(`/storage/kv/namespaces/${namespace.id}/values/${encodeURIComponent(key)}`, { method: 'PUT', body: form })).json();
    if (!body.success) throw new Error(`writing ${key}: ${JSON.stringify(body.errors)}`);
  };

  const current = await cf(`/storage/kv/namespaces/${namespace.id}/values/brand`);
  const brand = current.ok ? await current.json().catch(() => ({})) : {};
  const onlyIf = (process.env.ONLY_IF_BRAND_NAME || '').trim();
  if (onlyIf && (!current.ok || String(brand?.brandName ?? '').trim() !== onlyIf)) {
    log(`brand is "${brand?.brandName ?? '(unreadable)'}", not "${onlyIf}" — left as it is`);
    return;
  }
  const heroUrls = (process.env.ONLY_IF_HERO_URLS || '').split(',').map((url) => url.trim()).filter(Boolean);
  if (heroUrls.length) {
    const stored = current.ok && Array.isArray(brand?.heroMedia) ? brand.heroMedia.map((item) => String(item?.url ?? '').trim()) : null;
    if (!stored || heroUrls.some((url, index) => stored[index] !== url)) {
      log(`hero media is ${stored ? stored.join(', ') : '(unreadable)'}, not ${heroUrls.join(', ')} — left as it is`);
      return;
    }
  }
  await put('brand', { ...brand, ...patch });
  log(`brand: ${Object.keys(patch).join(', ')} set`);

  if (process.env.SOCIAL_RESET === 'true') {
    await put('social-media', { accounts: [], videos: [] });
    log('social-media: emptied');
  }
};

main().catch((error) => {
  console.error(`[stub-brand] ${error.message}`);
  process.exit(1);
});
