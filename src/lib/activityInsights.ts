/**
 * Reading the activity roll-up (shared/activityRollup.ts) for the admin's
 * charts: filters, time buckets, Caribbean seasons, continents, the booking
 * funnel, and the two lists an operator actually acts on — what is going well
 * and worth a look, and what looks broken.
 *
 * The signals are the ones a tour operator can do something about: which
 * tours and which source markets are gaining, which tours convert, what the
 * planner hears (party, budget, occasion, interests, how far ahead), and where
 * money is lost — payments started and never finished, declines, processor
 * errors, carts that never reach a payment, a device that converts far worse.
 * Thresholds are deliberately conservative: a small site has small numbers,
 * and a flag on three events is noise.
 */

export interface TourCounts {
  v?: number;
  a?: number;
  r?: number;
  s?: number;
  p?: number;
  usd?: number;
}

export interface SessionRow {
  d: string;
  h: number;
  s: string;
  u: string;
  c: string;
  dv: 'mobile' | 'desktop';
  l: string;
  pg: string;
  n: Record<string, number>;
  t: Record<string, TourCounts>;
  pf?: Record<string, string | number>;
  pay?: {
    start: number;
    paid: number;
    declined: number;
    cancelled: number;
    error: number;
    said: number;
    usd: number;
    reasons: Record<string, number>;
    methods: Record<string, number>;
  };
}

// ── Seasons ──────────────────────────────────────────────────────────────
// The Dominican Republic's tourist year, as operators plan it: the winter
// high season, a quiet late spring, the summer holidays (Europe and North
// American families), and the hurricane-season low.
export type Season = 'high' | 'spring' | 'summer' | 'low';
export const SEASONS: Season[] = ['high', 'spring', 'summer', 'low'];
export const SEASON_LABEL: Record<Season, string> = {
  high: 'Alta (dic–abr)',
  spring: 'Primavera (may–jun)',
  summer: 'Verano (jul–ago)',
  low: 'Baja (sep–nov)',
};
export const seasonOf = (day: string): Season => {
  const month = Number(day.slice(5, 7));
  if (month === 12 || month <= 4) return 'high';
  if (month <= 6) return 'spring';
  if (month <= 8) return 'summer';
  return 'low';
};

// ── Continents ───────────────────────────────────────────────────────────
const CONTINENT_CODES: Record<string, string> = {
  Africa:
    'DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW SH ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW',
  Asia:
    'AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE',
  Europa:
    'AL AD AT BY BE BA BG HR CZ DK EE FO FI FR DE GI GR GG HU IS IE IM IT JE XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA AX SJ',
  Norteamérica:
    'AI AG AW BS BB BZ BM BQ VG CA KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MX MS NI PA PR BL KN LC MF PM VC SX TT TC US VI UM',
  Sudamérica: 'AR BO BR CL CO EC FK GF GY PY PE SR UY VE',
  Oceanía: 'AS AU CK FJ PF GU KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV VU WF',
};
const CONTINENT_OF = new Map<string, string>();
for (const [continent, codes] of Object.entries(CONTINENT_CODES)) {
  for (const code of codes.split(' ')) CONTINENT_OF.set(code, continent);
}
export const continentOf = (country: string) => CONTINENT_OF.get(country) ?? (country ? 'Otro' : 'Desconocido');

let regionNames: Intl.DisplayNames | null = null;
export const countryName = (code: string) => {
  if (!code || code === 'XX' || code === 'T1') return code === 'T1' ? 'Tor' : 'Desconocido';
  try {
    regionNames ??= new Intl.DisplayNames(['es'], { type: 'region' });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

// ── Metrics ──────────────────────────────────────────────────────────────
export type Metric = 'visits' | 'visitors' | 'views' | 'adds' | 'starts' | 'paid' | 'reserves' | 'conversions' | 'revenue';
export const METRIC_LABEL: Record<Metric, string> = {
  visits: 'Visitas con actividad',
  visitors: 'Visitantes únicos',
  views: 'Tours vistos',
  adds: 'Añadidos al carrito',
  starts: 'Fueron a pagar',
  paid: 'Pagos confirmados',
  reserves: 'Reservas por WhatsApp',
  conversions: 'Conversiones',
  revenue: 'Ingresos (US$)',
};

const sumTours = (row: SessionRow, key: keyof TourCounts) =>
  Object.values(row.t).reduce((total, counts) => total + (counts[key] ?? 0), 0);

/** A visit converted when it paid (verified or by the guest's word) or sent a reservation. */
export const converted = (row: SessionRow) =>
  (row.pay?.paid ?? 0) + (row.pay?.said ?? 0) + (row.n.reserve ?? 0) > 0;

export const rowValue = (row: SessionRow, metric: Metric): number => {
  switch (metric) {
    case 'visits':
      return 1;
    case 'visitors':
      return 1; // de-duplicated by the caller
    case 'views':
      return row.n.tour_view ?? sumTours(row, 'v');
    case 'adds':
      return row.n.cart_add ?? 0;
    case 'starts':
      return row.pay?.start ?? 0;
    case 'paid':
      return row.pay?.paid ?? 0;
    case 'reserves':
      return row.n.reserve ?? 0;
    case 'conversions':
      return converted(row) ? 1 : 0;
    case 'revenue':
      return row.pay?.usd ?? 0;
  }
};

export const total = (rows: SessionRow[], metric: Metric) =>
  metric === 'visitors'
    ? new Set(rows.map((row) => row.u || row.s)).size
    : rows.reduce((sum, row) => sum + rowValue(row, metric), 0);

// ── Filters ──────────────────────────────────────────────────────────────
export interface Filters {
  from: string;
  to: string;
  country: string;
  continent: string;
  device: string;
  locale: string;
  season: string;
  party: string;
  budget: string;
  occasion: string;
  interest: string;
  tour: string;
}

export const NO_FILTERS: Omit<Filters, 'from' | 'to'> = {
  country: '',
  continent: '',
  device: '',
  locale: '',
  season: '',
  party: '',
  budget: '',
  occasion: '',
  interest: '',
  tour: '',
};

export const applyFilters = (rows: SessionRow[], f: Filters) =>
  rows.filter(
    (row) =>
      row.d >= f.from &&
      row.d <= f.to &&
      (!f.country || row.c === f.country) &&
      (!f.continent || continentOf(row.c) === f.continent) &&
      (!f.device || row.dv === f.device) &&
      (!f.locale || row.l === f.locale) &&
      (!f.season || seasonOf(row.d) === f.season) &&
      (!f.party || row.pf?.party === f.party) &&
      (!f.budget || row.pf?.budget === f.budget) &&
      (!f.occasion || row.pf?.occasion === f.occasion) &&
      (!f.interest || String(row.pf?.interests ?? '').split(',').includes(f.interest)) &&
      (!f.tour || Boolean(row.t[f.tour]))
  );

/** The values a filter can take, most frequent first. */
export const optionsOf = (rows: SessionRow[], pick: (row: SessionRow) => string | string[] | undefined) => {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = pick(row);
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item) counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
};

// ── Buckets ──────────────────────────────────────────────────────────────
export type Grouping = 'day' | 'week' | 'month' | 'year' | 'season' | 'hour' | 'weekday';

const isoWeekStart = (day: string) => {
  const date = new Date(`${day}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
};

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export const bucketOf = (row: SessionRow, grouping: Grouping): string => {
  switch (grouping) {
    case 'day':
      return row.d;
    case 'week':
      return isoWeekStart(row.d);
    case 'month':
      return row.d.slice(0, 7);
    case 'year':
      return row.d.slice(0, 4);
    case 'season':
      return seasonOf(row.d);
    case 'hour':
      return String(row.h).padStart(2, '0');
    case 'weekday':
      return String((new Date(`${row.d}T12:00:00Z`).getUTCDay() + 6) % 7);
  }
};

export const bucketLabel = (key: string, grouping: Grouping) => {
  if (grouping === 'season') return SEASON_LABEL[key as Season] ?? key;
  if (grouping === 'weekday') return WEEKDAYS[Number(key)] ?? key;
  if (grouping === 'hour') return `${key}h`;
  if (grouping === 'day' || grouping === 'week') return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
  if (grouping === 'month') return `${key.slice(5, 7)}/${key.slice(2, 4)}`;
  return key;
};

/** Every bucket in range, empty ones included, so a quiet day reads as zero and not as a gap. */
const allBuckets = (from: string, to: string, grouping: Grouping): string[] => {
  if (grouping === 'season') return [...SEASONS];
  if (grouping === 'hour') return Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
  if (grouping === 'weekday') return Array.from({ length: 7 }, (_, day) => String(day));
  const keys: string[] = [];
  const seen = new Set<string>();
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  let guard = 0;
  while (cursor <= end && guard++ < 4000) {
    const day = cursor.toISOString().slice(0, 10);
    const key = bucketOf({ d: day, h: 0 } as SessionRow, grouping);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
};

export const series = (rows: SessionRow[], metric: Metric, grouping: Grouping, from: string, to: string) => {
  const groups = new Map<string, SessionRow[]>();
  for (const row of rows) {
    const key = bucketOf(row, grouping);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
  }
  return allBuckets(from, to, grouping).map((key) => ({
    key,
    label: bucketLabel(key, grouping),
    value: total(groups.get(key) ?? [], metric),
  }));
};

export const breakdown = (rows: SessionRow[], metric: Metric, keyOf: (row: SessionRow) => string | string[], limit = 12) => {
  const groups = new Map<string, SessionRow[]>();
  for (const row of rows) {
    const keys = keyOf(row);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      if (!key) continue;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
    }
  }
  return [...groups.entries()]
    .map(([key, list]) => ({
      key,
      value: total(list, metric),
      visits: list.length,
      conversion: list.length ? list.filter(converted).length / list.length : 0,
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

// ── Tours ────────────────────────────────────────────────────────────────
export interface TourStats {
  title: string;
  views: number;
  adds: number;
  reserves: number;
  starts: number;
  paid: number;
  usd: number;
  visits: number;
  /** Visits that went further than looking (added, reserved, went to pay), per visit that looked. */
  intent: number;
}

export const tourStats = (rows: SessionRow[]): TourStats[] => {
  const map = new Map<string, TourStats>();
  for (const row of rows) {
    for (const [title, counts] of Object.entries(row.t)) {
      const entry =
        map.get(title) ??
        map.set(title, { title, views: 0, adds: 0, reserves: 0, starts: 0, paid: 0, usd: 0, visits: 0, intent: 0 }).get(title)!;
      entry.views += counts.v ?? 0;
      entry.adds += counts.a ?? 0;
      entry.reserves += counts.r ?? 0;
      entry.starts += counts.s ?? 0;
      entry.paid += counts.p ?? 0;
      entry.usd += counts.usd ?? 0;
      entry.visits += 1;
      if ((counts.a ?? 0) + (counts.r ?? 0) + (counts.s ?? 0) > 0) entry.intent += 1;
    }
  }
  return [...map.values()].map((entry) => ({ ...entry, intent: entry.visits ? entry.intent / entry.visits : 0 }));
};

/** How much a tour was wanted: looking counts a little, wanting to buy a lot. */
export const wantScore = (tour: Pick<TourStats, 'views' | 'adds' | 'reserves' | 'starts' | 'paid'>) =>
  tour.views + 3 * tour.adds + 5 * (tour.reserves + tour.starts) + 8 * tour.paid;

/** Rows: tours; columns: the values of `columnOf`; cells: the want score. */
export const tourMatrix = (rows: SessionRow[], columnOf: (row: SessionRow) => string, columns: string[], limit = 10) => {
  const top = tourStats(rows)
    .sort((a, b) => wantScore(b) - wantScore(a))
    .slice(0, limit)
    .map((tour) => tour.title);
  const cells = top.map((title) =>
    columns.map((column) =>
      rows
        .filter((row) => columnOf(row) === column && row.t[title])
        .reduce(
          (sum, row) =>
            sum +
            wantScore({
              views: row.t[title].v ?? 0,
              adds: row.t[title].a ?? 0,
              reserves: row.t[title].r ?? 0,
              starts: row.t[title].s ?? 0,
              paid: row.t[title].p ?? 0,
            }),
          0
        )
    )
  );
  return { tours: top, columns, cells };
};

// ── Funnel ───────────────────────────────────────────────────────────────
export const funnel = (rows: SessionRow[]) => {
  const steps = [
    { label: 'Visitas con actividad', count: rows.length },
    { label: 'Vieron un tour', count: rows.filter((row) => (row.n.tour_view ?? 0) > 0 || sumTours(row, 'v') > 0).length },
    { label: 'Añadieron al carrito o reservaron', count: rows.filter((row) => (row.n.cart_add ?? 0) + (row.n.reserve ?? 0) > 0).length },
    { label: 'Fueron a pagar', count: rows.filter((row) => (row.pay?.start ?? 0) > 0).length },
    { label: 'Pagaron', count: rows.filter((row) => (row.pay?.paid ?? 0) + (row.pay?.said ?? 0) > 0).length },
  ];
  return steps;
};

// ── Insights ─────────────────────────────────────────────────────────────
export interface Insight {
  level: 'good' | 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
}

const daysAgo = (today: string, days: number) => {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};

const pct = (value: number) => `${Math.round(value * 100)} %`;

/**
 * Compares the last 7 days with the 28 before them. Works on the rows the
 * filters leave, so "rising in Germany" is one filter away.
 */
export const insights = (rows: SessionRow[], today: string): { good: Insight[]; wrong: Insight[] } => {
  const good: Insight[] = [];
  const wrong: Insight[] = [];
  const weekStart = daysAgo(today, 6);
  const baseStart = daysAgo(today, 34);
  const week = rows.filter((row) => row.d >= weekStart);
  const base = rows.filter((row) => row.d >= baseStart && row.d < weekStart);
  const baseWeeks = 4;
  // How much busier the whole site is this week. A tour or a country is only
  // "rising" when it grew clearly faster than that — otherwise a busy week
  // flags everything at once.
  const growth = Math.max(1, week.length / Math.max(1, base.length / baseWeeks));

  // Tours gaining interest.
  const now = new Map(tourStats(week).map((tour) => [tour.title, tour]));
  const before = new Map(tourStats(base).map((tour) => [tour.title, tour]));
  const rising = [...now.values()]
    .map((tour) => {
      const was = before.get(tour.title);
      const average = was ? wantScore(was) / baseWeeks : 0;
      return { tour, score: wantScore(tour), average };
    })
    .filter(({ score, average }) => score >= 12 && score >= Math.max(2 * average * growth, average + 10))
    .sort((a, b) => b.score - b.average - (a.score - a.average))
    .slice(0, 3);
  for (const { tour, score, average } of rising) {
    good.push({
      level: 'good',
      title: `«${tour.title}» está atrayendo más interés`,
      detail:
        average > 0
          ? `Esta semana ${score} puntos de interés frente a ${Math.round(average)} de media semanal (vistas, carrito, pagos). Buen momento para destacarlo en portada o redes.`
          : `Sin actividad el mes anterior y ${score} puntos de interés esta semana. Revisa que su precio y fotos estén al día.`,
    });
  }

  // Source markets gaining.
  const countryNow = breakdown(week, 'visits', (row) => row.c, 30);
  const countryBefore = new Map(breakdown(base, 'visits', (row) => row.c, 60).map((entry) => [entry.key, entry.value]));
  const risingCountries = countryNow
    .map((entry) => ({ entry, average: (countryBefore.get(entry.key) ?? 0) / baseWeeks }))
    .filter(({ entry, average }) => entry.value >= 5 && entry.value >= 1.6 * growth * Math.max(average, 1.5))
    .sort((a, b) => b.entry.value / Math.max(b.average, 1) - a.entry.value / Math.max(a.average, 1))
    .slice(0, 2);
  for (const { entry, average } of risingCountries) {
    {
      good.push({
        level: 'good',
        title: `Más visitantes desde ${countryName(entry.key)}`,
        detail: `${entry.value} visitas con actividad esta semana frente a ${average.toFixed(1)} de media. ¿Una oferta o un anuncio en ${countryName(entry.key)}?`,
      });
    }
  }

  // Tours that convert.
  const allTours = tourStats(rows);
  const looked = allTours.filter((tour) => tour.visits >= 10);
  const averageIntent = looked.length ? looked.reduce((sum, tour) => sum + tour.intent, 0) / looked.length : 0;
  const best = looked.filter((tour) => tour.intent >= 1.5 * averageIntent && tour.intent >= 0.15).sort((a, b) => b.intent - a.intent)[0];
  if (best) {
    good.push({
      level: 'good',
      title: `«${best.title}» convence a quien lo mira`,
      detail: `${pct(best.intent)} de las visitas que lo ven pasan a carrito, reserva o pago (media: ${pct(averageIntent)}). Merece más visibilidad.`,
    });
  }

  // Tours booked together.
  const pairs = new Map<string, number>();
  for (const row of rows) {
    const wanted = Object.entries(row.t)
      .filter(([, counts]) => (counts.a ?? 0) + (counts.r ?? 0) + (counts.s ?? 0) > 0)
      .map(([title]) => title)
      .sort();
    for (let i = 0; i < wanted.length; i++) for (let j = i + 1; j < wanted.length; j++) {
      const key = `${wanted[i]} + ${wanted[j]}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
  }
  const pair = [...pairs.entries()].sort((a, b) => b[1] - a[1])[0];
  if (pair && pair[1] >= 3) {
    good.push({
      level: 'info',
      title: 'Se piden juntos',
      detail: `${pair[0]} — en ${pair[1]} visitas. Un paquete de los dos podría venderse solo.`,
    });
  }

  // What the planner hears.
  const planned = rows.filter((row) => row.pf?.party);
  if (planned.length >= 5) {
    const combos = breakdown(planned, 'visits', (row) => `${row.pf?.party ?? ''}${row.pf?.budget ? ` · ${row.pf.budget}` : ''}`, 1)[0];
    const leads = planned.map((row) => Number(row.pf?.leadDays)).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    const median = leads.length ? leads[Math.floor(leads.length / 2)] : null;
    good.push({
      level: 'info',
      title: 'Lo que más cuenta el planificador',
      detail: `${combos ? `Perfil más frecuente: ${combos.key} (${combos.visits} de ${planned.length}).` : ''}${
        median !== null ? ` Planifican con una mediana de ${median} días de antelación${median <= 7 ? ' — reservan en destino: WhatsApp rápido y recogida en el hotel cuentan mucho.' : '.'}` : ''
      }`,
    });
  }

  // ── Something's wrong ──
  const payWeek = week.reduce(
    (acc, row) => {
      acc.start += row.pay?.start ?? 0;
      acc.paid += (row.pay?.paid ?? 0) + (row.pay?.said ?? 0);
      acc.declined += row.pay?.declined ?? 0;
      acc.cancelled += row.pay?.cancelled ?? 0;
      acc.error += row.pay?.error ?? 0;
      for (const [reason, count] of Object.entries(row.pay?.reasons ?? {})) acc.reasons[reason] = (acc.reasons[reason] ?? 0) + count;
      return acc;
    },
    { start: 0, paid: 0, declined: 0, cancelled: 0, error: 0, reasons: {} as Record<string, number> }
  );

  if (payWeek.error > 0) {
    wrong.push({
      level: 'critical',
      title: `${payWeek.error} pago${payWeek.error === 1 ? '' : 's'} con error esta semana`,
      detail:
        'El procesador falló o el cliente dijo que algo salió mal — no la tarjeta. Revisa Admin → Pagos (claves, modo de prueba/real) y la lista de intentos de pago de abajo.',
    });
  }
  const abandoned = rows.filter((row) => row.d >= weekStart && (row.pay?.start ?? 0) > 0 && (row.pay?.paid ?? 0) + (row.pay?.said ?? 0) + (row.pay?.declined ?? 0) + (row.pay?.cancelled ?? 0) + (row.pay?.error ?? 0) === 0);
  const startedVisits = week.filter((row) => (row.pay?.start ?? 0) > 0).length;
  if (startedVisits >= 3 && abandoned.length / startedVisits >= 0.6) {
    wrong.push({
      level: 'warning',
      title: `${pct(abandoned.length / startedVisits)} de quienes fueron a pagar no volvieron`,
      detail: `${abandoned.length} de ${startedVisits} visitas salieron a la página de pago y no regresaron con un resultado. Prueba tú mismo un pago, y mira si la página del procesador pide algo inesperado (moneda, país, verificación).`,
    });
  }
  const results = payWeek.paid + payWeek.declined;
  if (payWeek.declined >= 3 && results > 0 && payWeek.declined / results >= 0.4) {
    const top = Object.entries(payWeek.reasons).sort((a, b) => b[1] - a[1])[0];
    wrong.push({
      level: 'warning',
      title: `Muchos rechazos: ${payWeek.declined} de ${results} pagos`,
      detail: `${top ? `Motivo más frecuente: ${top[0]}. ` : ''}Los bancos extranjeros suelen bloquear un primer cargo en el Caribe; ofrecer PayPal o un segundo procesador ayuda.`,
    });
  }

  // Carts that never reach a payment.
  const twoWeeks = rows.filter((row) => row.d >= daysAgo(today, 13));
  const stuck = tourStats(twoWeeks).filter((tour) => tour.adds >= 5 && tour.starts + tour.reserves + tour.paid === 0);
  for (const tour of stuck.slice(0, 2)) {
    wrong.push({
      level: 'warning',
      title: `«${tour.title}» se añade pero no se paga`,
      detail: `${tour.adds} veces al carrito en dos semanas y ninguna reserva ni pago. ¿Precio, fecha o disponibilidad confusos en el carrito?`,
    });
  }

  // A device that converts far worse.
  const mobile = rows.filter((row) => row.dv === 'mobile');
  const desktop = rows.filter((row) => row.dv === 'desktop');
  if (mobile.length >= 20 && desktop.length >= 20) {
    const m = mobile.filter(converted).length / mobile.length;
    const d = desktop.filter(converted).length / desktop.length;
    if (d > 0 && m < d / 2) {
      wrong.push({
        level: 'warning',
        title: 'En el móvil se reserva mucho menos',
        detail: `Conversión en móvil ${pct(m)} frente a ${pct(d)} en ordenador. Prueba el recorrido completo en un teléfono: carrito, fecha, pago.`,
      });
    } else if (m > 0 && d < m / 2) {
      wrong.push({
        level: 'warning',
        title: 'En el ordenador se reserva mucho menos',
        detail: `Conversión en ordenador ${pct(d)} frente a ${pct(m)} en móvil.`,
      });
    }
  }

  // Activity falling off a cliff: tracking or the site itself.
  const lastThree = rows.filter((row) => row.d >= daysAgo(today, 2)).length / 3;
  const before21 = rows.filter((row) => row.d >= daysAgo(today, 23) && row.d < daysAgo(today, 2)).length / 21;
  if (before21 >= 3 && lastThree < 0.4 * before21) {
    wrong.push({
      level: 'critical',
      title: 'La actividad cayó de golpe',
      detail: `${lastThree.toFixed(1)} visitas al día en los últimos 3 días frente a ${before21.toFixed(1)} antes. Comprueba que el sitio carga, que el último despliegue tiene KV (/api/health) y que los anuncios siguen activos.`,
    });
  }

  // The funnel's worst leak.
  const steps = funnel(rows);
  let worst: { from: string; to: string; loss: number } | null = null;
  for (let i = 2; i < steps.length; i++) {
    const prev = steps[i - 1].count;
    if (prev < 10) continue;
    const loss = 1 - steps[i].count / prev;
    if (!worst || loss > worst.loss) worst = { from: steps[i - 1].label, to: steps[i].label, loss };
  }
  if (worst && worst.loss >= 0.8) {
    wrong.push({
      level: 'info',
      title: `La mayor fuga: de «${worst.from}» a «${worst.to}»`,
      detail: `Se pierde el ${pct(worst.loss)} en ese paso. Es el primer sitio donde mirar.`,
    });
  }

  return { good, wrong };
};
