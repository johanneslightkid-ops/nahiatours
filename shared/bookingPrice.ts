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
  /**
   * Head count per rate, for a service sold at several ("Adults": 2,
   * "Children": 1). Each rate is priced from the catalogue; without it, the
   * first rate is charged for every person.
   */
  quantities?: Record<string, number>;
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
  /** unitPrice × persons, in catalogue dollars — or the sum over the rates. */
  total: number;
  priceSource: 'catalogue' | 'client';
  /** "Adults × 2 · Children × 1", when it was priced per rate. */
  breakdown?: string;
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

/** The catalogue record being paid for, in the guest's language if it is there. */
const findServiceRecord = async (
  env: CatalogueEnv,
  { category, serviceId, title, locale }: BookingRequest
): Promise<any | null> => {
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
  return record;
};

const priceOf = (text: unknown): number | null => {
  const amount = Number(String(text ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

/** The per-person rate this deployment actually sells the item at. */
export const lookupUnitPrice = async (env: CatalogueEnv, request: BookingRequest): Promise<number | null> => {
  const record = await findServiceRecord(env, request);
  if (!record) return null;

  const priceText =
    (Array.isArray(record.pricing)
      ? record.pricing.map((tier: any) => tier?.price).find((value: any) => value)
      : null) ?? record.price;

  return priceOf(priceText);
};

/**
 * Price a booking rate by rate, from the catalogue's own rates. Null when the
 * request has no per-rate count or the item has a single rate; an error when a
 * rate asked for is not one the item has, rather than guessing its price.
 */
const priceByRate = (
  record: any,
  quantities: BookingRequest['quantities']
): { persons: number; total: number; breakdown: string } | { error: string } | null => {
  const tiers: any[] = Array.isArray(record?.pricing) ? record.pricing : [];
  const asked = Object.entries(quantities ?? {})
    .map(([tier, count]) => [String(tier).trim(), Math.floor(Number(count) || 0)] as const)
    .filter(([, count]) => count > 0);
  if (tiers.length < 2 || asked.length === 0) return null;

  let persons = 0;
  let total = 0;
  const parts: string[] = [];
  for (const [tier, count] of asked) {
    // By name; failing that, "Option 2" / "Opción 2" is the second rate, which
    // is what the storefront calls a rate that was saved without a name.
    const byName = tiers.find((t) => String(t?.tier ?? '').trim().toLowerCase() === tier.toLowerCase());
    const position = /(\d+)$/.exec(tier);
    const rate = byName ?? (position ? tiers[Number(position[1]) - 1] : undefined);
    const price = priceOf(rate?.price);
    if (!price) return { error: `"${tier.slice(0, 40)}" is not a rate this item is sold at.` };
    persons += count;
    total += price * count;
    parts.push(`${tier.slice(0, 30)} × ${count}`);
  }
  return { persons, total: Math.round(total * 100) / 100, breakdown: parts.join(' · ') };
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
  let persons = Math.max(1, Math.min(60, Math.floor(Number(body.persons) || 1)));
  const title = String(body.title ?? '').trim().slice(0, 120) || 'Excursion';

  // A payment of an amount agreed with the operator — a deposit, the rest of
  // a booking made on WhatsApp. There is no catalogue item to look up: the
  // amount is the guest's own, bounded below, and recorded as client-priced.
  const record = body.category === 'custom' ? null : await findServiceRecord(env, body);
  const byRate = record ? priceByRate(record, body.quantities) : null;
  if (byRate && 'error' in byRate) return { ok: false, error: byRate.error };
  if (byRate && byRate.persons > 60) return { ok: false, error: 'That is more people than one booking can take.' };

  const recordUnit = record ? priceOf(
    (Array.isArray(record.pricing) ? record.pricing.map((tier: any) => tier?.price).find((value: any) => value) : null) ??
      record.price
  ) : null;
  const clientTotal = Number(body.amount);
  let unitPrice =
    recordUnit ?? (Number.isFinite(clientTotal) && clientTotal > 0 ? clientTotal / persons : null);
  let total = unitPrice ? Math.round(unitPrice * persons * 100) / 100 : 0;
  if (byRate) {
    persons = byRate.persons;
    total = byRate.total;
    unitPrice = total / persons;
  }

  if (!unitPrice || unitPrice <= 0) {
    return { ok: false, error: 'No price could be determined for this booking.' };
  }
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
      priceSource: recordUnit || byRate ? 'catalogue' : 'client',
      ...(byRate ? { breakdown: byRate.breakdown } : {}),
    },
  };
};
