/**
 * The activity log, rolled up for the admin's charts.
 *
 * Raw activity is one KV key per batch (`act:<newest-first time>:<random>`,
 * functions/api/activity.ts) and expires after 60 days. For charts across
 * months, seasons and years, each finished day is folded once into a SESSION
 * ROW per visit — country, device, language, what was looked at, added, paid,
 * what the planner was told — and the rows are kept per month under
 * `actm:<YYYY-MM>` for three years.
 *
 * The fold happens when the admin opens the charts, not when a guest does
 * something, so a visitor still costs one write per batch and nothing more.
 * Folding costs one read per raw batch, once, plus one write per month
 * touched; a single request reads at most READ_BUDGET keys and says when it
 * stopped early, so the free plan's per-request and per-day limits hold.
 *
 * No personal data: a row knows a random visit id, a random visitor id kept
 * in the guest's own browser, a country from Cloudflare, and the choices made
 * on the site. Not who anybody is.
 */

export interface ActivityEvent {
  type: string;
  at: number;
  data: Record<string, string | number | boolean>;
}

export interface ActivityBatch {
  at: number;
  session: string;
  visitor?: string;
  locale: string;
  page: string;
  country: string;
  device: string;
  events: ActivityEvent[];
}

/** One tour's counts within one visit. */
export interface TourCounts {
  /** Detail page opened. */
  v?: number;
  /** Added to the cart. */
  a?: number;
  /** Reserved on WhatsApp. */
  r?: number;
  /** Left for a payment page. */
  s?: number;
  /** Paid, as the processor reported. */
  p?: number;
  /** Dollars paid. */
  usd?: number;
}

export interface SessionRow {
  /** Day, Dominican time, YYYY-MM-DD. */
  d: string;
  /** Hour of the first event, Dominican time. */
  h: number;
  /** Visit id (per tab session), shortened. */
  s: string;
  /** Visitor id (per browser), shortened; '' for an older client. */
  u: string;
  /** ISO 3166 alpha-2, from Cloudflare. */
  c: string;
  dv: 'mobile' | 'desktop';
  l: string;
  /** First page the visit was recorded on. */
  pg: string;
  /** Count per event type. */
  n: Record<string, number>;
  /** Per tour title. */
  t: Record<string, TourCounts>;
  /** What the planner was told, last answer of the visit. */
  pf?: Record<string, string | number>;
  pay?: {
    start: number;
    paid: number;
    declined: number;
    cancelled: number;
    error: number;
    /** The guest said it worked (PayPal.Me, a payment link): not verified. */
    said: number;
    usd: number;
    reasons: Record<string, number>;
    methods: Record<string, number>;
  };
}

interface KVLike {
  get(key: string, options?: { type: 'json' }): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  list(options: { prefix: string; limit?: number; cursor?: string }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor?: string;
  }>;
}

const MONTH_PREFIX = 'actm:';
const MONTH_TTL = 3 * 366 * 24 * 3600;
const READ_BUDGET = 700;
const MAX_LIST_PAGES = 20;
/** America/Santo_Domingo: UTC-4 all year, no daylight saving. */
const DR_OFFSET_MS = 4 * 3600_000;

export const drDay = (at: number) => new Date(at - DR_OFFSET_MS).toISOString().slice(0, 10);
const drHour = (at: number) => new Date(at - DR_OFFSET_MS).getUTCHours();
const timeOfKey = (name: string) => 9_999_999_999_999 - Number(name.split(':')[1]);

const str = (value: unknown, max = 80) => String(value ?? '').slice(0, max);
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0);

/** Fold one day's batches into one row per visit. */
export const foldBatches = (batches: ActivityBatch[]): SessionRow[] => {
  const rows = new Map<string, SessionRow>();
  const sorted = [...batches].sort((a, b) => a.at - b.at);
  for (const batch of sorted) {
    const first = batch.events.reduce((min, event) => Math.min(min, event.at || batch.at), batch.at);
    const key = `${batch.session || 'anon'}|${drDay(first)}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        d: drDay(first),
        h: drHour(first),
        s: str(batch.session, 12),
        u: str(batch.visitor, 12),
        c: str(batch.country, 4).toUpperCase(),
        dv: batch.device === 'mobile' ? 'mobile' : 'desktop',
        l: str(batch.locale, 5),
        pg: str(batch.page, 80),
        n: {},
        t: {},
      };
      rows.set(key, row);
    }
    if (!row.c && batch.country) row.c = str(batch.country, 4).toUpperCase();
    if (!row.u && batch.visitor) row.u = str(batch.visitor, 12);

    for (const event of batch.events) {
      row.n[event.type] = (row.n[event.type] ?? 0) + 1;
      const data = event.data ?? {};
      const title = str(data.title, 80);
      const tour = (): TourCounts => (row!.t[title] ??= {});
      const pay = () =>
        (row!.pay ??= { start: 0, paid: 0, declined: 0, cancelled: 0, error: 0, said: 0, usd: 0, reasons: {}, methods: {} });

      switch (event.type) {
        case 'tour_view':
          if (title) tour().v = (tour().v ?? 0) + 1;
          break;
        case 'cart_add':
          if (title) tour().a = (tour().a ?? 0) + 1;
          break;
        case 'reserve':
          if (title) tour().r = (tour().r ?? 0) + 1;
          break;
        case 'pay_start': {
          const p = pay();
          p.start += 1;
          const method = str(data.method, 16) || 'card';
          p.methods[method] = (p.methods[method] ?? 0) + 1;
          if (title) tour().s = (tour().s ?? 0) + 1;
          break;
        }
        case 'pay_result': {
          const p = pay();
          const status = str(data.status, 16);
          if (status === 'paid' || status === 'unverified') {
            p.paid += 1;
            p.usd += num(data.total);
            if (title) {
              tour().p = (tour().p ?? 0) + 1;
              tour().usd = (tour().usd ?? 0) + num(data.total);
            }
          } else if (status === 'declined') p.declined += 1;
          else if (status === 'cancelled') p.cancelled += 1;
          else p.error += 1;
          const reason = str(data.reason, 24);
          if (reason && reason !== 'approved') p.reasons[reason] = (p.reasons[reason] ?? 0) + 1;
          break;
        }
        case 'pay_answer':
          if (data.outcome === 'paid') pay().said += 1;
          else if (data.outcome === 'problem') pay().error += 1;
          break;
        case 'plan_profile': {
          const profile: Record<string, string | number> = {};
          for (const [name, value] of Object.entries(data)) {
            if (typeof value === 'number' || typeof value === 'string') profile[name] = typeof value === 'string' ? value.slice(0, 80) : value;
          }
          row.pf = profile;
          break;
        }
        default:
          break;
      }
    }
  }
  return [...rows.values()];
};

interface MonthDoc {
  days: Record<string, SessionRow[]>;
}

const monthOf = (day: string) => day.slice(0, 7);

/**
 * Rows from `since` (YYYY-MM-DD) to now: finished days from the monthly
 * roll-ups (folding any that are not yet), today live from the raw log.
 */
export const readActivityRows = async (
  kv: KVLike,
  since: string
): Promise<{ rows: SessionRow[]; partial: boolean; folded: number }> => {
  const today = drDay(Date.now());
  let budget = READ_BUDGET;

  // Raw keys, grouped by day. The time is in the key, so nothing is read yet.
  const rawByDay = new Map<string, string[]>();
  let cursor: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const listing = await kv.list({ prefix: 'act:', limit: 1000, cursor });
    for (const { name } of listing.keys ?? []) {
      const at = timeOfKey(name);
      if (!Number.isFinite(at)) continue;
      const day = drDay(at);
      if (day < since) continue;
      (rawByDay.get(day) ?? rawByDay.set(day, []).get(day)!).push(name);
    }
    if (listing.list_complete || !listing.cursor) break;
    cursor = listing.cursor;
  }

  // The months in range.
  const months: string[] = [];
  for (let d = new Date(`${monthOf(since)}-01T00:00:00Z`); monthOf(d.toISOString()) <= monthOf(today); d.setUTCMonth(d.getUTCMonth() + 1)) {
    months.push(monthOf(d.toISOString()));
  }
  const docs = new Map<string, MonthDoc>();
  await Promise.all(
    months.map(async (month) => {
      budget -= 1;
      const stored = await kv.get(`${MONTH_PREFIX}${month}`, { type: 'json' }).catch(() => null);
      docs.set(month, stored && typeof stored.days === 'object' ? (stored as MonthDoc) : { days: {} });
    })
  );

  const readBatches = async (names: string[]) =>
    (await Promise.all(names.map((name) => kv.get(name, { type: 'json' }).catch(() => null)))).filter(Boolean) as ActivityBatch[];

  // Fold finished days not yet folded, oldest first, while the budget lasts.
  let partial = false;
  let folded = 0;
  const changed = new Set<string>();
  const pending = [...rawByDay.keys()].filter((day) => day < today && !docs.get(monthOf(day))?.days[day]).sort();
  for (const day of pending) {
    const names = rawByDay.get(day)!;
    if (names.length > budget) {
      partial = true;
      break;
    }
    budget -= names.length;
    docs.get(monthOf(day))!.days[day] = foldBatches(await readBatches(names));
    changed.add(monthOf(day));
    folded += 1;
  }
  await Promise.all(
    [...changed].map((month) =>
      kv.put(`${MONTH_PREFIX}${month}`, JSON.stringify(docs.get(month)), { expirationTtl: MONTH_TTL })
    )
  );

  const rows: SessionRow[] = [];
  for (const doc of docs.values()) {
    for (const [day, list] of Object.entries(doc.days)) if (day >= since) rows.push(...list);
  }
  // Today, live, newest batches first if the budget runs short.
  const todayNames = rawByDay.get(today) ?? [];
  if (todayNames.length > budget) partial = true;
  rows.push(...foldBatches(await readBatches(todayNames.slice(0, Math.max(0, budget)))));

  return { rows, partial, folded };
};
