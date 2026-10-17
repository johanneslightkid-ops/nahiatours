import React, { useCallback, useEffect, useState } from 'react';
import {
  ContactRequest,
  listContactRequests,
  markContactRequest,
} from '../../services/contactRequestService';
import { generateWhatsAppMessage } from '../../utils/whatsapp';

const KIND: Record<ContactRequest['kind'], { label: string; emoji: string }> = {
  callback: { label: 'Llamar de vuelta', emoji: '📞' },
  message: { label: 'Mensaje', emoji: '✉️' },
  payment: { label: 'Intención de pago', emoji: '💳' },
};

const when = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('es-DO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
};

/**
 * What guests asked for outside WhatsApp: call-back requests from the
 * WhatsApp return prompt, contact-form messages, and the amounts guests set
 * out to pay with the payment widget. Pending ones first; one tap marks a
 * request handled.
 */
const ContactRequestsPanel: React.FC = () => {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRequests(await listContactRequests());
    } catch (failure: any) {
      setError(failure?.message || 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (request: ContactRequest) => {
    const done = !request.done;
    setRequests((list) => list.map((item) => (item.id === request.id ? { ...item, done } : item)));
    try {
      await markContactRequest(request.id, done);
    } catch (failure: any) {
      setError(failure?.message || 'No se pudo actualizar.');
      load();
    }
  };

  const pending = requests.filter((item) => !item.done);
  const shown = showDone ? requests : pending;

  return (
    <div className="mb-8 rounded-3xl border border-ink/15 bg-paper p-6 shadow-ink-sm">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-2xl font-bold text-ink">
          Solicitudes de clientes{' '}
          {pending.length > 0 && (
            <span className="ml-1 rounded-full bg-hibiscus px-2.5 py-0.5 align-middle text-sm font-bold text-paper">{pending.length}</span>
          )}
        </h2>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Mostrar atendidas
        </label>
        <button type="button" onClick={load} className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-semibold text-ink">
          Actualizar
        </button>
      </div>
      <p className="mb-4 text-sm text-ink-soft">
        Llamadas pedidas al volver de WhatsApp, mensajes del formulario de contacto y pagos que un cliente empezó desde la página de contacto.
      </p>

      {loading ? (
        <p className="text-sm text-ink-soft">Cargando…</p>
      ) : error ? (
        <p className="text-sm font-semibold text-hibiscus-dark">{error}</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-ink-soft">{showDone ? 'Todavía no hay solicitudes.' : 'Nada pendiente. 🎉'}</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((request) => {
            const wa = request.phone ? generateWhatsAppMessage(request.phone, `Hola ${request.name || ''}`.trim()) : '';
            return (
              <li key={request.id} className={`rounded-2xl border p-4 ${request.done ? 'border-ink/10 opacity-60' : 'border-ink/20'}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-bold text-ink">
                    {KIND[request.kind]?.emoji} {KIND[request.kind]?.label ?? request.kind}
                  </span>
                  <span className="text-ink-soft">· {when(request.at)}</span>
                  {request.amount ? <span className="rounded-full bg-mango-light px-2 py-0.5 font-bold text-ink">US$ {request.amount.toFixed(2)}</span> : null}
                  <span className="ml-auto text-xs uppercase text-ink-light">{request.locale}</span>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-ink">
                  {request.name && <div><strong>{request.name}</strong></div>}
                  {request.phone && (
                    <div>
                      📱 <a className="underline" href={`tel:${request.phone.replace(/[^\d+]/g, '')}`}>{request.phone}</a>
                      {wa && <> · <a className="underline" href={wa} target="_blank" rel="noreferrer">WhatsApp</a></>}
                    </div>
                  )}
                  {request.email && <div>✉️ <a className="underline" href={`mailto:${request.email}`}>{request.email}</a></div>}
                  {request.when && <div>🕑 {request.when}</div>}
                  {request.context && <div className="text-ink-soft">Sobre: {request.context}</div>}
                  {request.message && <div className="whitespace-pre-line rounded-xl bg-ink/5 p-3 text-ink-soft">{request.message}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(request)}
                  className={`mt-3 rounded-full px-4 py-1.5 text-sm font-bold ${request.done ? 'border border-ink/20 text-ink' : 'bg-jungle text-paper'}`}
                >
                  {request.done ? 'Marcar pendiente' : 'Marcar atendida'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ContactRequestsPanel;
