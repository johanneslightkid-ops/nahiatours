import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getActivitySummary } from '../../services/notifyService';
import {
  applyFilters,
  breakdown,
  continentOf,
  countryName,
  converted,
  Filters,
  funnel,
  Grouping,
  insights,
  Insight,
  Metric,
  METRIC_LABEL,
  NO_FILTERS,
  optionsOf,
  seasonOf,
  SEASONS,
  SEASON_LABEL,
  series,
  SessionRow,
  total,
  tourMatrix,
  tourStats,
  wantScore,
} from '../../lib/activityInsights';

/**
 * Charts over the activity log: what guests look at, want and pay for, by
 * day, week, month, year or season, by country and continent, device and
 * language, and by what they told the planner — with "worth a look" and
 * "something's wrong" on top, because those are what an operator acts on.
 *
 * Styled only in the nine shared colour families. One series per chart, one
 * axis; a lagoon single-hue ramp for magnitude; status in jungle / mango /
 * hibiscus, always with an icon and a word. Every chart has a table view.
 */

const DAY = 24 * 3600_000;
const drToday = () => new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10);
const back = (days: number) => new Date(Date.now() - 4 * 3600_000 - days * DAY).toISOString().slice(0, 10);

const RANGES: Array<{ id: string; label: string; days: number }> = [
  { id: '7', label: '7 días', days: 7 },
  { id: '30', label: '30 días', days: 30 },
  { id: '90', label: '90 días', days: 90 },
  { id: '365', label: '12 meses', days: 365 },
  { id: 'all', label: 'Todo', days: 3 * 365 },
];

const GROUPINGS: Array<{ id: Grouping; label: string }> = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
  { id: 'season', label: 'Temporada' },
  { id: 'weekday', label: 'Día de la semana' },
  { id: 'hour', label: 'Hora' },
];

const METRICS: Metric[] = ['visits', 'visitors', 'views', 'adds', 'starts', 'paid', 'reserves', 'conversions', 'revenue'];

const PARTY: Record<string, string> = { solo: 'Solo', couple: 'Pareja', family: 'Familia', friends: 'Amigos', multigen: 'Varias generaciones' };
const BUDGET: Record<string, string> = { value: 'Económico', balanced: 'Equilibrado', premium: 'Premium', open: 'Sin límite' };
const OCCASION: Record<string, string> = { none: 'Ninguna', honeymoon: 'Luna de miel', anniversary: 'Aniversario', birthday: 'Cumpleaños', bachelor: 'Despedida', reunion: 'Reencuentro' };
const INTEREST: Record<string, string> = {
  beach_island: 'Playa e islas',
  snorkel_reef: 'Snorkel',
  wildlife: 'Naturaleza',
  adrenaline: 'Adrenalina',
  offroad: 'Buggies / off-road',
  culture: 'Cultura',
  nightlife: 'Noche',
  food_drink: 'Comida y bebida',
  views_photo: 'Vistas y fotos',
  relax: 'Relax',
};
const KIDS: Record<string, string> = { toddler: '0–3', child: '4–8', tween: '9–12', teen: '13–17' };

const fmt = (value: number, metric?: Metric) =>
  metric === 'revenue' ? `US$ ${Math.round(value).toLocaleString('es-DO')}` : Math.round(value).toLocaleString('es-DO');
const pct = (value: number) => `${Math.round(value * 100)} %`;

/** Round tick steps: 1, 2, 5 × 10ⁿ. */
const niceMax = (value: number) => {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
};

// ── Column chart: one series over time, hover tooltip, table view ─────────
const ColumnChart: React.FC<{ data: Array<{ key: string; label: string; value: number }>; metric: Metric }> = ({ data, metric }) => {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const width = 760;
  const height = 220;
  const pad = { top: 16, right: 8, bottom: 26, left: 44 };
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const band = (width - pad.left - pad.right) / Math.max(1, data.length);
  const barWidth = Math.max(2, Math.min(24, band - 2));
  const y = (value: number) => pad.top + (height - pad.top - pad.bottom) * (1 - value / max);
  const labelEvery = Math.ceil(data.length / 12);
  const peak = data.reduce((best, d, index) => (d.value > (data[best]?.value ?? -1) ? index : best), 0);

  return (
    <div>
      <div className="mb-1 flex justify-end">
        <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs font-semibold text-ink-soft underline underline-offset-2">
          {asTable ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-ink/10">
          <table className="w-full text-sm">
            <thead className="bg-paper-warm text-left text-xs text-ink-soft">
              <tr><th className="p-2">Periodo</th><th className="p-2 text-right">{METRIC_LABEL[metric]}</th></tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key} className="border-t border-ink/5"><td className="p-2">{d.label}</td><td className="p-2 text-right tabular-nums">{fmt(d.value, metric)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={METRIC_LABEL[metric]} onMouseLeave={() => setHover(null)}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={pad.left} x2={width - pad.right} y1={y(max * f)} y2={y(max * f)} className="stroke-ink/10" strokeWidth={1} />
                <text x={pad.left - 6} y={y(max * f) + 4} textAnchor="end" className="fill-ink-light text-[11px]">{fmt(max * f, metric === 'revenue' ? undefined : metric)}</text>
              </g>
            ))}
            {data.map((d, index) => {
              const x = pad.left + index * band + (band - barWidth) / 2;
              const top = y(d.value);
              const h = height - pad.bottom - top;
              const r = Math.min(4, barWidth / 2, h);
              return (
                <g key={d.key} onMouseEnter={() => setHover(index)} onFocus={() => setHover(index)} tabIndex={0}>
                  <rect x={pad.left + index * band} y={pad.top} width={band} height={height - pad.top - pad.bottom} fill="transparent" />
                  {d.value > 0 && (
                    <path
                      d={`M${x},${height - pad.bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + barWidth - r} Q${x + barWidth},${top} ${x + barWidth},${top + r} V${height - pad.bottom} Z`}
                      className={hover === index ? 'fill-lagoon-dark' : 'fill-lagoon'}
                    />
                  )}
                  {index % labelEvery === 0 && (
                    <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className="fill-ink-light text-[10px]">{d.label}</text>
                  )}
                  {index === peak && d.value > 0 && hover === null && (
                    <text x={x + barWidth / 2} y={top - 4} textAnchor="middle" className="fill-ink-soft text-[10px] font-semibold">{fmt(d.value, metric)}</text>
                  )}
                </g>
              );
            })}
            <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} className="stroke-ink/20" strokeWidth={1} />
          </svg>
          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute top-0 rounded-lg border border-ink/10 bg-paper px-2 py-1 text-xs text-ink shadow-ink-sm"
              style={{ left: `${Math.min(80, Math.max(2, ((pad.left + (hover + 0.5) * band) / width) * 100 - 6))}%` }}
            >
              <div className="font-semibold">{data[hover].label}</div>
              <div className="tabular-nums">{fmt(data[hover].value, metric)} · {METRIC_LABEL[metric]}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Horizontal bars: a ranked breakdown, value at the tip ─────────────────
const Bars: React.FC<{
  title: string;
  entries: Array<{ key: string; value: number; visits: number; conversion: number }>;
  metric: Metric;
  label?: (key: string) => string;
  onPick?: (key: string) => void;
  picked?: string;
}> = ({ title, entries, metric, label = (key) => key, onPick, picked }) => {
  const max = Math.max(1, ...entries.map((e) => e.value));
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-4">
      <h4 className="mb-3 text-sm font-bold text-ink">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-xs text-ink-light">Sin datos con estos filtros.</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry) => (
            <li key={entry.key}>
              <button
                type="button"
                onClick={() => onPick?.(picked === entry.key ? '' : entry.key)}
                title={`${label(entry.key)}: ${fmt(entry.value, metric)} · ${entry.visits} visitas · conversión ${pct(entry.conversion)}`}
                className={`grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 rounded-lg px-1 py-0.5 text-left text-xs ${picked === entry.key ? 'bg-lagoon-light/40' : 'hover:bg-ink/5'}`}
              >
                <span className="truncate text-ink-soft">{label(entry.key)}</span>
                <span className="h-3 rounded-r bg-lagoon" style={{ width: `${Math.max(2, (entry.value / max) * 100)}%`, transform: 'translateZ(0)' }} />
                <span className="tabular-nums text-ink">{fmt(entry.value, metric)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Heat table: tours × seasons / countries, one hue light→dark ───────────
const Heat: React.FC<{ title: string; matrix: { tours: string[]; columns: string[]; cells: number[][] }; columnLabel: (key: string) => string }> = ({
  title,
  matrix,
  columnLabel,
}) => {
  const max = Math.max(1, ...matrix.cells.flat());
  const step = (value: number) => (value <= 0 ? 0 : Math.min(5, 1 + Math.floor((value / max) * 4.999)));
  const SHADE = ['bg-paper', 'bg-lagoon-light/50', 'bg-lagoon-light', 'bg-lagoon/60', 'bg-lagoon', 'bg-lagoon-dark'];
  const INK = ['text-ink-light', 'text-ink', 'text-ink', 'text-paper', 'text-paper', 'text-paper'];
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-4">
      <h4 className="mb-1 text-sm font-bold text-ink">{title}</h4>
      <p className="mb-3 text-xs text-ink-light">Puntos de interés: vista 1 · carrito 3 · reserva o pago iniciado 5 · pagado 8.</p>
      {matrix.tours.length === 0 ? (
        <p className="text-xs text-ink-light">Sin datos con estos filtros.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-[2px] text-xs">
            <thead>
              <tr>
                <th className="p-1 text-left font-semibold text-ink-soft">Tour</th>
                {matrix.columns.map((column) => (
                  <th key={column} className="p-1 text-center font-semibold text-ink-soft">{columnLabel(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.tours.map((tour, row) => (
                <tr key={tour}>
                  <td className="max-w-[14rem] truncate p-1 text-ink" title={tour}>{tour}</td>
                  {matrix.cells[row].map((value, column) => (
                    <td key={column} title={`${tour} · ${columnLabel(matrix.columns[column])}: ${value}`} className={`rounded p-1 text-center tabular-nums ${SHADE[step(value)]} ${INK[step(value)]}`}>
                      {value || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const LEVEL: Record<Insight['level'], { icon: string; word: string; className: string }> = {
  good: { icon: '▲', word: 'Bien', className: 'border-jungle/40 bg-jungle-light/30' },
  info: { icon: 'ℹ', word: 'Dato', className: 'border-lagoon/30 bg-lagoon-light/30' },
  warning: { icon: '⚠', word: 'Atención', className: 'border-mango/50 bg-mango-light/40' },
  critical: { icon: '✖', word: 'Urgente', className: 'border-hibiscus/50 bg-hibiscus-light/40' },
};

const InsightList: React.FC<{ title: string; items: Insight[]; empty: string }> = ({ title, items, empty }) => (
  <div className="rounded-2xl border border-ink/10 bg-paper p-4">
    <h4 className="mb-3 text-base font-bold text-ink">{title}</h4>
    {items.length === 0 ? (
      <p className="text-sm text-ink-light">{empty}</p>
    ) : (
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className={`rounded-xl border p-3 ${LEVEL[item.level].className}`}>
            <div className="text-sm font-bold text-ink">
              <span aria-hidden>{LEVEL[item.level].icon}</span> <span className="sr-only">{LEVEL[item.level].word}: </span>
              {item.title}
            </div>
            <p className="mt-1 text-xs text-ink-soft">{item.detail}</p>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const ActivityInsights: React.FC = () => {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partial, setPartial] = useState(false);
  const [range, setRange] = useState('90');
  const [grouping, setGrouping] = useState<Grouping>('day');
  const [metric, setMetric] = useState<Metric>('visits');
  const [filters, setFilters] = useState(NO_FILTERS);
  const days = RANGES.find((r) => r.id === range)?.days ?? 90;
  const from = back(days - 1);
  const to = drToday();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Folding old days is done in slices; a partial answer is asked again.
      let result = await getActivitySummary(from);
      for (let round = 0; result.partial && round < 4; round++) result = await getActivitySummary(from);
      setRows(result.rows);
      setPartial(result.partial);
    } catch (failure: any) {
      setError(failure?.message || 'No se pudieron cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  }, [from]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // A long range reads better by month; a week by day.
    setGrouping((current) => (days > 120 && current === 'day' ? 'month' : days <= 31 && current === 'month' ? 'day' : current));
  }, [days]);

  const all: Filters = { ...filters, from, to };
  const filtered = useMemo(() => applyFilters(rows, all), [rows, JSON.stringify(all)]);
  const set = (key: keyof typeof NO_FILTERS) => (value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const insightRows = useMemo(() => applyFilters(rows, { ...all, from: back(40) }), [rows, JSON.stringify(filters), to]);
  const found = useMemo(() => insights(insightRows, to), [insightRows, to]);

  const options = useMemo(
    () => ({
      country: optionsOf(rows, (row) => row.c),
      continent: optionsOf(rows, (row) => continentOf(row.c)),
      locale: optionsOf(rows, (row) => row.l),
      party: optionsOf(rows, (row) => String(row.pf?.party ?? '')),
      budget: optionsOf(rows, (row) => String(row.pf?.budget ?? '')),
      occasion: optionsOf(rows, (row) => String(row.pf?.occasion ?? '')),
      interest: optionsOf(rows, (row) => String(row.pf?.interests ?? '').split(',')),
      tour: optionsOf(rows, (row) => Object.keys(row.t)).slice(0, 80),
    }),
    [rows]
  );

  const tours = useMemo(() => tourStats(filtered).sort((a, b) => wantScore(b) - wantScore(a)).slice(0, 15), [filtered]);
  const topCountries = useMemo(() => breakdown(filtered, 'visits', (row) => row.c, 6).map((entry) => entry.key), [filtered]);
  const planned = filtered.filter((row) => row.pf?.party);
  const steps = funnel(filtered);
  const conversions = filtered.filter(converted).length;
  const returning = useMemo(() => {
    const seen = new Map<string, Set<string>>();
    for (const row of filtered) if (row.u) (seen.get(row.u) ?? seen.set(row.u, new Set()).get(row.u)!).add(row.d);
    return [...seen.values()].filter((daysSeen) => daysSeen.size > 1).length;
  }, [filtered]);

  const select = (label: string, value: string, onChange: (v: string) => void, values: string[], name: (v: string) => string = (v) => v) => (
    <label className="flex flex-col gap-0.5 text-[11px] font-semibold text-ink-soft">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="max-w-[11rem] rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-xs text-ink">
        <option value="">Todos</option>
        {values.map((v) => (
          <option key={v} value={v}>{name(v)}</option>
        ))}
      </select>
    </label>
  );

  const tile = (label: string, value: string, hint?: string) => (
    <div className="rounded-2xl bg-ink/5 p-3">
      <div className="text-xs font-semibold text-ink-soft">{label}</div>
      <div className="text-2xl font-bold tabular-nums text-ink">{value}</div>
      {hint && <div className="text-[11px] text-ink-light">{hint}</div>}
    </div>
  );

  const anyFilter = Object.values(filters).some(Boolean);

  return (
    <div className="rounded-3xl border border-ink/15 bg-paper p-6 shadow-ink-sm">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-2xl font-bold text-ink">Estadísticas</h2>
        <div className="inline-flex rounded-full border border-ink/15 p-1 text-xs font-semibold">
          {RANGES.map((r) => (
            <button key={r.id} type="button" onClick={() => setRange(r.id)} className={`rounded-full px-3 py-1 ${range === r.id ? 'bg-ink text-paper' : 'text-ink-soft'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={load} className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-semibold text-ink">Actualizar</button>
      </div>
      <p className="mb-4 max-w-3xl text-xs text-ink-soft">
        Una fila por visita: país (de Cloudflare), dispositivo, idioma, tours vistos y deseados, pagos y lo que se contestó al
        planificador. Sin nombres ni contactos. Los días cerrados se resumen y se guardan tres años; el detalle crudo, 60 días.
        Hora y fechas en hora dominicana.
      </p>

      {/* Filters: one row above everything. */}
      <div className="mb-5 flex flex-wrap items-end gap-2">
        {select('Continente', filters.continent, set('continent'), options.continent)}
        {select('País', filters.country, set('country'), options.country, countryName)}
        {select('Temporada', filters.season, set('season'), SEASONS, (v) => SEASON_LABEL[v as keyof typeof SEASON_LABEL])}
        {select('Dispositivo', filters.device, set('device'), ['mobile', 'desktop'], (v) => (v === 'mobile' ? 'Móvil' : 'Ordenador'))}
        {select('Idioma', filters.locale, set('locale'), options.locale, (v) => v.toUpperCase())}
        {select('Grupo', filters.party, set('party'), options.party, (v) => PARTY[v] ?? v)}
        {select('Presupuesto', filters.budget, set('budget'), options.budget, (v) => BUDGET[v] ?? v)}
        {select('Ocasión', filters.occasion, set('occasion'), options.occasion, (v) => OCCASION[v] ?? v)}
        {select('Interés', filters.interest, set('interest'), options.interest, (v) => INTEREST[v] ?? v)}
        {select('Tour', filters.tour, set('tour'), options.tour)}
        {anyFilter && (
          <button type="button" onClick={() => setFilters(NO_FILTERS)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink-soft underline">
            Quitar filtros
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-soft">Cargando estadísticas…</p>
      ) : error ? (
        <p className="text-sm font-semibold text-hibiscus-dark">{error}</p>
      ) : (
        <div className="space-y-5">
          {partial && (
            <p className="rounded-xl bg-mango-light/40 p-2 text-xs text-ink">Aún se están resumiendo días antiguos; pulsa «Actualizar» para completar.</p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightList title="Vale la pena mirar" items={found.good} empty="Nada destacado en los últimos 7 días con estos filtros." />
            <InsightList title="Algo no va bien" items={found.wrong} empty="Nada preocupante en los últimos 7 días. ✓" />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {tile('Visitas', fmt(filtered.length))}
            {tile('Visitantes', fmt(total(filtered, 'visitors')), `${returning} volvieron otro día`)}
            {tile('Tours vistos', fmt(total(filtered, 'views')))}
            {tile('Al carrito', fmt(total(filtered, 'adds')))}
            {tile('Fueron a pagar', fmt(total(filtered, 'starts')))}
            {tile('Pagados', fmt(total(filtered, 'paid')), `+ ${fmt(filtered.reduce((s, r) => s + (r.pay?.said ?? 0), 0))} según el cliente`)}
            {tile('Conversión', filtered.length ? pct(conversions / filtered.length) : '—', 'pago o reserva por visita')}
            {tile('Ingresos', fmt(total(filtered, 'revenue'), 'revenue'), 'pagos verificados')}
          </div>

          <div className="rounded-2xl border border-ink/10 bg-paper p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)} className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-sm font-semibold text-ink">
                {METRICS.map((m) => (
                  <option key={m} value={m}>{METRIC_LABEL[m]}</option>
                ))}
              </select>
              <span className="text-sm text-ink-soft">por</span>
              <div className="flex flex-wrap gap-1">
                {GROUPINGS.map((g) => (
                  <button key={g.id} type="button" onClick={() => setGrouping(g.id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${grouping === g.id ? 'bg-lagoon-dark text-paper' : 'bg-ink/5 text-ink-soft'}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <ColumnChart data={series(filtered, metric, grouping, from, to)} metric={metric} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Bars title={`Por país · ${METRIC_LABEL[metric]}`} entries={breakdown(filtered, metric, (row) => row.c || 'XX')} metric={metric} label={countryName} onPick={set('country')} picked={filters.country} />
            <Bars title="Por continente" entries={breakdown(filtered, metric, (row) => continentOf(row.c))} metric={metric} onPick={set('continent')} picked={filters.continent} />
            <Bars title="Por dispositivo" entries={breakdown(filtered, metric, (row) => row.dv)} metric={metric} label={(v) => (v === 'mobile' ? 'Móvil' : 'Ordenador')} onPick={set('device')} picked={filters.device} />
            <Bars title="Por idioma" entries={breakdown(filtered, metric, (row) => row.l)} metric={metric} label={(v) => v.toUpperCase()} onPick={set('locale')} picked={filters.locale} />
          </div>

          <div className="rounded-2xl border border-ink/10 bg-paper p-4">
            <h4 className="mb-3 text-sm font-bold text-ink">Tours más deseados</h4>
            {tours.length === 0 ? (
              <p className="text-xs text-ink-light">Sin datos con estos filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-ink-soft">
                    <tr>
                      <th className="p-2">Tour</th>
                      <th className="p-2 text-right">Vistas</th>
                      <th className="p-2 text-right">Carrito</th>
                      <th className="p-2 text-right">Reservas</th>
                      <th className="p-2 text-right">A pagar</th>
                      <th className="p-2 text-right">Pagados</th>
                      <th className="p-2 text-right">Intención</th>
                      <th className="p-2 text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tours.map((tour) => (
                      <tr key={tour.title} className="cursor-pointer border-t border-ink/5 hover:bg-ink/5" onClick={() => set('tour')(filters.tour === tour.title ? '' : tour.title)}>
                        <td className="max-w-[18rem] truncate p-2 font-semibold text-ink" title={tour.title}>{tour.title}</td>
                        <td className="p-2 text-right tabular-nums">{tour.views}</td>
                        <td className="p-2 text-right tabular-nums">{tour.adds}</td>
                        <td className="p-2 text-right tabular-nums">{tour.reserves}</td>
                        <td className="p-2 text-right tabular-nums">{tour.starts}</td>
                        <td className="p-2 text-right tabular-nums">{tour.paid}</td>
                        <td className="p-2 text-right tabular-nums">{pct(tour.intent)}</td>
                        <td className="p-2 text-right tabular-nums">{tour.usd ? fmt(tour.usd, 'revenue') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Heat title="Tours más deseados por temporada" matrix={tourMatrix(filtered, (row) => seasonOf(row.d), [...SEASONS])} columnLabel={(v) => SEASON_LABEL[v as keyof typeof SEASON_LABEL].split(' ')[0]} />
            <Heat title="Tours más deseados por país" matrix={tourMatrix(filtered, (row) => row.c, topCountries)} columnLabel={(v) => v || '—'} />
          </div>

          <div className="rounded-2xl border border-ink/10 bg-paper p-4">
            <h4 className="mb-1 text-sm font-bold text-ink">Embudo de reserva</h4>
            <p className="mb-3 text-xs text-ink-light">De cada paso al siguiente; la pérdida más grande es donde mirar primero.</p>
            <ol className="space-y-1.5">
              {steps.map((step, index) => {
                const max = Math.max(1, steps[0].count);
                const prev = index > 0 ? steps[index - 1].count : 0;
                return (
                  <li key={step.label} className="grid grid-cols-[minmax(0,13rem)_1fr_auto] items-center gap-2 text-xs">
                    <span className="truncate text-ink-soft">{step.label}</span>
                    <span className="h-3 rounded-r bg-lagoon" style={{ width: `${Math.max(1, (step.count / max) * 100)}%` }} />
                    <span className="tabular-nums text-ink">
                      {fmt(step.count)}
                      {index > 0 && prev > 0 && <span className="text-ink-light"> · {pct(step.count / prev)}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <h3 className="mb-1 text-lg font-bold text-ink">Lo que cuentan en el planificador</h3>
            <p className="mb-3 text-xs text-ink-soft">
              {planned.length} visitas usaron el planificador. Barras: visitas; al pasar el ratón, la conversión de ese grupo. Pulsa una barra para filtrar todo por ella.
            </p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Bars title="Tipo de grupo" entries={breakdown(planned, 'visits', (row) => String(row.pf?.party ?? ''))} metric="visits" label={(v) => PARTY[v] ?? v} onPick={set('party')} picked={filters.party} />
              <Bars title="Presupuesto" entries={breakdown(planned, 'visits', (row) => String(row.pf?.budget ?? ''))} metric="visits" label={(v) => BUDGET[v] ?? v} onPick={set('budget')} picked={filters.budget} />
              <Bars title="Ocasión" entries={breakdown(planned, 'visits', (row) => String(row.pf?.occasion ?? ''))} metric="visits" label={(v) => OCCASION[v] ?? v} onPick={set('occasion')} picked={filters.occasion} />
              <Bars title="Intereses" entries={breakdown(planned, 'visits', (row) => String(row.pf?.interests ?? '').split(','))} metric="visits" label={(v) => INTEREST[v] ?? v} onPick={set('interest')} picked={filters.interest} />
              <Bars title="Edades de los niños" entries={breakdown(planned, 'visits', (row) => String(row.pf?.kids ?? '').split(','))} metric="visits" label={(v) => KIDS[v] ?? v} />
              <Bars
                title="Antelación (días hasta el viaje)"
                entries={breakdown(planned, 'visits', (row) => {
                  const lead = Number(row.pf?.leadDays);
                  if (!Number.isFinite(lead) || row.pf?.leadDays === undefined) return '';
                  return lead <= 2 ? '0–2' : lead <= 7 ? '3–7' : lead <= 30 ? '8–30' : lead <= 90 ? '31–90' : '90+';
                })}
                metric="visits"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityInsights;
