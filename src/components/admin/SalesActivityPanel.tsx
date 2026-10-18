import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityBatch,
  AttemptStatus,
  listActivity,
  listPayAttempts,
  PayAttemptRecord,
  setPayAttemptStatus,
} from '../../services/notifyService';
import { generateWhatsAppMessage } from '../../utils/whatsapp';

/**
 * What guests did: every payment button pressed and what came of it, and the
 * cart and booking activity behind it (functions/api/pay-attempt.ts and
 * functions/api/activity.ts).
 */

const STATUS: Record<AttemptStatus, { label: string; className: string }> = {
  pending: { label: '⏳ Esperando respuesta', className: 'bg-sky-light/50 text-ink' },
  paid: { label: '✅ Dice que pagó', className: 'bg-jungle text-paper' },
  verified: { label: '✅ Pago verificado', className: 'bg-jungle-dark text-paper' },
  problem: { label: '⚠️ Problema', className: 'bg-sunset text-paper' },
  later: { label: '🕓 Pagará después', className: 'bg-mango-light text-ink' },
  unconfirmed: { label: '❓ Sin confirmar', className: 'bg-hibiscus text-paper' },
  cancelled: { label: '↩️ Cancelado', className: 'bg-ink/10 text-ink-soft' },
};

const EVENT: Record<string, string> = {
  cart_add: '🛒 Añadió al carrito',
  cart_remove: '🗑️ Quitó del carrito',
  cart_update: '✏️ Cambió en el carrito',
  cart_clear: '🧹 Vació el carrito',
  cart_view: '👀 Vio el carrito',
  checkout: '🧾 Checkout',
  reserve: '📅 Reservó',
  whatsapp: '💬 Abrió WhatsApp',
  pay_click: '💳 Eligió pagar',
  pay_start: '➡️ Fue a pagar',
  pay_answer: '🙋 Respondió',
  summary_whatsapp: '📲 Resumen a su WhatsApp',
  summary_email: '✉️ Resumen por email',
  contact: '📞 Pidió contacto',
};

const when = (value: string | number) => {
  try {
    return new Intl.DateTimeFormat('es-DO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return String(value);
  }
};

const money = (value: unknown) => (typeof value === 'number' && value > 0 ? `US$ ${value.toFixed(2)}` : '');

const describe = (data: Record<string, string | number | boolean>) => {
  const parts: string[] = [];
  if (data.title) parts.push(String(data.title));
  if (data.method) parts.push(String(data.method));
  if (data.outcome) parts.push(String(data.outcome));
  if (data.date) parts.push(`📅 ${data.date}`);
  if (data.persons) parts.push(`👥 ${data.persons}`);
  if (data.items) parts.push(`${data.items} ítems`);
  if (money(data.total)) parts.push(money(data.total));
  if (data.text) parts.push(`“${data.text}”`);
  if (data.source && data.source !== 'direct') parts.push(`(${data.source})`);
  return parts.join(' · ');
};

const SalesActivityPanel: React.FC = () => {
  const [attempts, setAttempts] = useState<PayAttemptRecord[]>([]);
  const [batches, setBatches] = useState<ActivityBatch[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showViews, setShowViews] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pay, activity] = await Promise.all([listPayAttempts(), listActivity()]);
      setAttempts(pay.attempts);
      setBatches(activity.batches);
      setCursor(activity.cursor);
    } catch (failure: any) {
      setError(failure?.message || 'No se pudo cargar la actividad.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const more = async () => {
    if (!cursor) return;
    try {
      const next = await listActivity(cursor);
      setBatches((current) => [...current, ...next.batches]);
      setCursor(next.cursor);
    } catch (failure: any) {
      setError(failure?.message || 'No se pudo cargar más.');
    }
  };

  const mark = async (attempt: PayAttemptRecord, status: AttemptStatus) => {
    setAttempts((list) => list.map((item) => (item.id === attempt.id ? { ...item, status } : item)));
    try {
      await setPayAttemptStatus(attempt.id, status);
    } catch (failure: any) {
      setError(failure?.message || 'No se pudo actualizar.');
      load();
    }
  };

  const stats = useMemo(() => {
    const week = Date.now() - 7 * 24 * 3600_000;
    const recent = attempts.filter((item) => Date.parse(item.at) > week);
    const events = batches.filter((batch) => batch.at > week).flatMap((batch) => batch.events);
    const sum = (list: PayAttemptRecord[]) => list.reduce((total, item) => total + (item.total ?? 0), 0);
    const confirmed = recent.filter((item) => item.status === 'paid' || item.status === 'verified');
    return {
      attempts: recent.length,
      confirmed: confirmed.length,
      confirmedSum: sum(confirmed),
      open: recent.filter((item) => item.status === 'pending' || item.status === 'unconfirmed' || item.status === 'problem').length,
      adds: events.filter((event) => event.type === 'cart_add').length,
      reservations: events.filter((event) => event.type === 'reserve').length,
      whatsapp: events.filter((event) => event.type === 'whatsapp').length,
    };
  }, [attempts, batches]);

  const stat = (label: string, value: React.ReactNode) => (
    <div className="rounded-2xl bg-ink/5 p-3">
      <div className="text-xs font-semibold text-ink-soft">{label}</div>
      <div className="text-xl font-bold text-ink">{value}</div>
    </div>
  );

  return (
    <div className="mb-8 space-y-6">
      <div className="rounded-3xl border border-ink/15 bg-paper p-6 shadow-ink-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="flex-1 text-2xl font-bold text-ink">Pagos y carrito</h2>
          <button type="button" onClick={load} className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-semibold text-ink">
            Actualizar
          </button>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {stat('Intentos de pago (7 días)', stats.attempts)}
          {stat('Confirmados', stats.confirmed)}
          {stat('Importe confirmado', money(stats.confirmedSum) || 'US$ 0')}
          {stat('Por revisar', stats.open)}
          {stat('Añadidos al carrito', stats.adds)}
          {stat('Reservas WhatsApp', stats.reservations)}
          {stat('Chats WhatsApp', stats.whatsapp)}
        </div>

        {loading ? (
          <p className="text-sm text-ink-soft">Cargando…</p>
        ) : error ? (
          <p className="text-sm font-semibold text-hibiscus-dark">{error}</p>
        ) : attempts.length === 0 ? (
          <p className="text-sm text-ink-soft">Todavía nadie pulsó un botón de pago.</p>
        ) : (
          <ul className="space-y-3">
            {attempts.map((attempt) => {
              const s = STATUS[attempt.status] ?? STATUS.pending;
              const wa = attempt.phone ? generateWhatsAppMessage(attempt.phone, `Hola ${attempt.name || ''}`.trim()) : '';
              return (
                <li key={attempt.id} className="rounded-2xl border border-ink/15 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.className}`}>{s.label}</span>
                    <span className="font-bold text-ink">{money(attempt.total) || '—'}</span>
                    {attempt.serverTotal !== null && attempt.total !== null && Math.abs(attempt.serverTotal - attempt.total) > 0.5 && (
                      <span className="rounded-full bg-sunset-light/60 px-2 py-0.5 text-xs font-semibold text-ink">catálogo: {money(attempt.serverTotal)}</span>
                    )}
                    <span className="text-ink-soft">
                      · {attempt.method} · {attempt.source} · {when(attempt.at)}
                    </span>
                    {attempt.late && <span className="text-xs text-ink-soft">(respondió tarde)</span>}
                    <span className="ml-auto text-xs uppercase text-ink-light">{attempt.locale}</span>
                  </div>
                  <ul className="mt-2 text-sm text-ink">
                    {attempt.items.map((item, index) => (
                      <li key={index}>
                        • {item.title}
                        {item.date ? ` — ${item.date}` : ''}
                        {item.persons ? ` — ${item.persons} pax` : ''}
                        {item.total ? ` — ${money(item.total)}` : ''}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 grid gap-1 text-sm text-ink-soft">
                    {(attempt.name || attempt.phone || attempt.email) && (
                      <div>
                        {attempt.name && <strong className="text-ink">{attempt.name} </strong>}
                        {attempt.phone && (
                          <>
                            · 📱 <a className="underline" href={`tel:${attempt.phone.replace(/[^\d+]/g, '')}`}>{attempt.phone}</a>
                            {wa && <> · <a className="underline" href={wa} target="_blank" rel="noreferrer">WhatsApp</a></>}
                          </>
                        )}
                        {attempt.email && <> · ✉️ <a className="underline" href={`mailto:${attempt.email}`}>{attempt.email}</a></>}
                      </div>
                    )}
                    <div>
                      Quiere contacto por:{' '}
                      {[attempt.contact.whatsapp && 'WhatsApp', attempt.contact.email && 'email', attempt.contact.call && 'llamada'].filter(Boolean).join(', ') || '—'}
                      {attempt.receiptSent ? ' · recibo enviado por email' : ''}
                    </div>
                    {attempt.note && <div className="rounded-xl bg-ink/5 p-2">“{attempt.note}”</div>}
                    {attempt.reference && <div className="text-xs">Ref. pasarela: {attempt.reference}</div>}
                    <div className="text-xs text-ink-light">Ref: {attempt.id}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(['verified', 'problem', 'cancelled'] as AttemptStatus[])
                      .filter((status) => status !== attempt.status)
                      .map((status) => (
                        <button key={status} type="button" onClick={() => mark(attempt, status)} className="rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold text-ink">
                          Marcar: {STATUS[status].label}
                        </button>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-3xl border border-ink/15 bg-paper p-6 shadow-ink-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="flex-1 text-2xl font-bold text-ink">Actividad de clientes</h2>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={showViews} onChange={(e) => setShowViews(e.target.checked)} /> Mostrar visitas al carrito
          </label>
        </div>
        <p className="mb-4 text-sm text-ink-soft">
          Lo que hicieron los visitantes con el carrito y los botones de reserva, agrupado por visita. Se guarda 60 días.
        </p>
        {batches.length === 0 ? (
          <p className="text-sm text-ink-soft">{loading ? 'Cargando…' : 'Sin actividad todavía.'}</p>
        ) : (
          <ul className="space-y-3">
            {batches.map((batch, index) => {
              const events = batch.events.filter((event) => showViews || event.type !== 'cart_view');
              if (events.length === 0) return null;
              return (
                <li key={`${batch.at}-${index}`} className="rounded-2xl border border-ink/10 p-3 text-sm">
                  <div className="mb-1 flex flex-wrap gap-2 text-xs text-ink-soft">
                    <span className="font-semibold text-ink">{when(batch.at)}</span>
                    <span>· {batch.device}</span>
                    {batch.country && <span>· {batch.country}</span>}
                    {batch.locale && <span>· {batch.locale.toUpperCase()}</span>}
                    <span>· {batch.page}</span>
                    <span className="ml-auto text-ink-light">visita {batch.session.slice(-6)}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {events.map((event, position) => (
                      <li key={position} className="text-ink">
                        <span className="text-xs text-ink-light">{new Date(event.at).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}</span>{' '}
                        <strong>{EVENT[event.type] ?? event.type}</strong> <span className="text-ink-soft">{describe(event.data)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
        {cursor && (
          <button type="button" onClick={more} className="mt-4 rounded-full border border-ink/20 px-4 py-1.5 text-sm font-semibold text-ink">
            Cargar más
          </button>
        )}
      </div>
    </div>
  );
};

export default SalesActivityPanel;
