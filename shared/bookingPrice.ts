/**
 * What a booking costs, decided on the server.
 *
 * An amount posted by a browser is a number the customer can edit. For a
 * catalogue item the server looks the rate up itself and charges that, so the
 * page can ask for $240 and the till still says what the tour costs. The
 * amount is only taken from the request when the server cannot find the item
 * — a transfer quote, say, which is computed from a route and a dozen
 * modifiers — and that case is reported as `priceSource: 'client'` so the
 * operator can see which is which.
 *
 * Every gateway — Stripe, Azul, CardNET — prices through here, so the three of
 * them can never disagree about what the same booking costs.
 */

/** A booking nobody meant to make. Guards a fat-fingered or hostile amount. */
export const MIN_TOTAL = 1;
export const MAX_TOTAL = 50_000;

export interface BookingRequest {
  category?: string;
  serviceId?: number | string;
  title?: string;
  persons?: number;
  date?: string;
  /** Only consulted when the catalogue lookup fails. */
  amount?: number;
  locale?: string;
  /** Where to send the guest back to, e.g. "/tours". Path only. */
  returnPath?: string;
}

export interface PricedBooking {
  title: string;
  persons: number;
  date: string;
  category: string;
  locale: string;
  returnPath: string;
  /** Per person, in catalogue dollars. */
  unitPrice: number;
  /** unitPrice × persons, in catalogue dollars. */
  total: number;
  priceSource: 'catalogue' | 'client';
}

interface CatalogueEnv {
  DATA_KV_F?: unknown;
  DATA_KV?: unknown;
  [key: string]: unknown;
}

/**
 * Reads the catalogue the same way functions/api/data.ts does — KV first, the
 * bundled /data/*.json second — but reaches for both directly rather than
 * calling our own /api/data over HTTP. A Worker fetching its own hostname
 * re-enters itself, which costs a subrequest and is the kind of thing that
 * works in dev and trips a loop guard in production.
 */
const loadCatalogue = async (env: CatalogueEnv, resource: string): Promise<any[] | null> => {
  const kv = (env.DATA_KV_F ?? env.DATA_KV) as any;
  if (kv && typeof kv.get === 'function') {
    try {
      const stored = await kv.get(resource, { type: 'json' });
      if (Array.isArray(stored)) return stored;
      if (Array.isArray(stored?.record)) return stored.record;
    } catch (error) {
      console.warn('[bookingPrice] KV read failed for', resource, error);
    }
  }

  // The seed JSON shipped with the build. `env.ASSETS` is the static-assets
  // binding from wrangler.toml, so this never leaves the isolate.
  const assets = (env as any).ASSETS;
  if (assets && typeof assets.fetch === 'function') {
    try {
      const response = await assets.fetch(new Request(`https://assets.local/data/${resource}.json`));
      if (response.ok) {
        const payload = await response.json();
        if (Array.isArray(payload)) return payload;
        if (Array.isArray((payload as any)?.record)) return (payload as any).record;
      }
    } catch (error) {
      console.warn('[bookingPrice] asset read failed for', resource, error);
    }
  }

  return null;
};

/** The per-person rate this deployment actually sells the item at. */
export const lookupUnitPrice = async (
  env: CatalogueEnv,
  { category, serviceId, title, locale }: BookingRequest
): Promise<number | null> => {
  const resource = category === 'transport' ? 'transport-services' : 'tours';
  // Prices are the same in every language; the title the guest saw is not, so
  // the guest's own language is tried first and English second.
  const lang = ['es', 'de', 'fr'].includes(String(locale)) ? String(locale) : 'en';
  const wanted = String(title ?? '').trim().toLowerCase();
  const index = Number(serviceId);

  let record: any = null;
  for (const candidate of lang === 'en' ? ['en'] : [lang, 'en']) {
    const list = await loadCatalogue(env, `${resource}-${candidate}`);
    if (!list) continue;
    // Ids are positional (assigned index+1 when the catalogue is normalised),
    // so the title is the more trustworthy match and is tried first.
    record =
      (wanted
        ? list.find((item: any) => String(item?.title ?? '').trim().toLowerCase() === wanted)
        : null) ??
      (Number.isFinite(index) && index >= 1 ? list[index - 1] : null);
    if (record) break;
  }
  if (!record) return null;

  const priceText =
    (Array.isArray(record.pricing)
      ? record.pricing.map((tier: any) => tier?.price).find((value: any) => value)
      : null) ?? record.price;

  const amount = Number(String(priceText ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

/** Only ever a path on this site, so nobody can turn our return page into a redirect elsewhere. */
export const safeReturnPath = (raw: unknown): string => {
  const value = String(raw ?? '/');
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/';
};

/**
 * Validate and price a booking request. Returns a guest-readable error rather
 * than throwing, because every caller turns it straight into a 400.
 */
export const priceBooking = async (
  env: CatalogueEnv,
  body: BookingRequest
): Promise<{ ok: true; booking: PricedBooking } | { ok: false; error: string }> => {
  const persons = Math.max(1, Math.min(60, Math.floor(Number(body.persons) || 1)));
  const title = String(body.title ?? '').trim().slice(0, 120) || 'Excursion';

  const serverUnit = await lookupUnitPrice(env, body);
  const clientTotal = Number(body.amount);
  const unitPrice =
    serverUnit ?? (Number.isFinite(clientTotal) && clientTotal > 0 ? clientTotal / persons : null);

  if (!unitPrice || unitPrice <= 0) {
    return { ok: false, error: 'No price could be determined for this booking.' };
  }

  const total = Math.round(unitPrice * persons * 100) / 100;
  if (total < MIN_TOTAL || total > MAX_TOTAL) {
    return { ok: false, error: 'That total is outside the range this site can charge.' };
  }

  return {
    ok: true,
    booking: {
      title,
      persons,
      date: String(body.date ?? '').trim().slice(0, 40),
      category: String(body.category ?? 'tours').slice(0, 40),
      locale: ['es', 'de', 'fr'].includes(String(body.locale)) ? String(body.locale) : 'en',
      returnPath: safeReturnPath(body.returnPath),
      unitPrice,
      total,
      priceSource: serverUnit ? 'catalogue' : 'client',
    },
  };
};
