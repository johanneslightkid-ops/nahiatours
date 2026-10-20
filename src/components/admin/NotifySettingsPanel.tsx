import React, { useEffect, useState } from 'react';
import { FaEnvelope, FaWhatsapp } from 'react-icons/fa';
import {
  getNotifyAdmin,
  NotifyAdminView,
  NotifyConfig,
  saveNotifyAdmin,
  testNotify,
} from '../../services/notifyService';

/**
 * Who hears about sales, and how — see shared/notify.ts.
 *
 * Both channels are free and both are optional. WhatsApp to the operator goes
 * through CallMeBot; email (to the operator, and receipts to guests) through
 * Brevo or Resend. The storefront only offers email to guests once a provider
 * is set up here, and the keys are write-only: this says whether one is set.
 */

const Toggle: React.FC<{ checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/10 p-3">
    <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>
      <span className="block text-sm font-bold text-ink">{label}</span>
      {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
    </span>
  </label>
);

const Field: React.FC<{ label: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-ink">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
  </label>
);

const input = 'w-full rounded-xl border border-ink/20 bg-paper px-3 py-2 text-sm text-ink';

const NotifySettingsPanel: React.FC = () => {
  const [view, setView] = useState<NotifyAdminView | null>(null);
  const [config, setConfig] = useState<NotifyConfig | null>(null);
  const [emailKey, setEmailKey] = useState('');
  const [botKey, setBotKey] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getNotifyAdmin()
      .then((next) => {
        setView(next);
        setConfig(next.config);
      })
      .catch((failure) => setMessage({ ok: false, text: failure?.message || 'No se pudo cargar.' }));
  }, []);

  if (!config || !view) {
    return (
      <div className="mb-8 rounded-3xl border border-ink/15 bg-paper p-6 shadow-ink-sm">
        <h2 className="text-2xl font-bold text-ink">Avisos de ventas</h2>
        <p className="mt-2 text-sm text-ink-soft">{message?.text ?? 'Cargando…'}</p>
      </div>
    );
  }

  const set = (patch: Partial<NotifyConfig>) => setConfig({ ...config, ...patch });

  const save = async (extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await saveNotifyAdmin({
        config,
        ...(emailKey.trim() ? { emailApiKey: emailKey.trim() } : {}),
        ...(botKey.trim() ? { callmebotApiKey: botKey.trim() } : {}),
        ...extra,
      });
      setView(next);
      setConfig(next.config);
      setEmailKey('');
      setBotKey('');
      setMessage({ ok: true, text: 'Guardado.' });
    } catch (failure: any) {
      setMessage({ ok: false, text: failure?.message || 'No se pudo guardar.' });
    } finally {
      setBusy(false);
    }
  };

  const test = async (channel: 'email' | 'whatsapp') => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await testNotify(channel);
      setMessage(
        result.ok
          ? { ok: true, text: channel === 'email' ? `Correo de prueba enviado a ${config.operatorEmail}.` : 'WhatsApp de prueba enviado.' }
          : { ok: false, text: result.error || 'La prueba falló.' }
      );
    } catch (failure: any) {
      setMessage({ ok: false, text: failure?.message || 'La prueba falló.' });
    } finally {
      setBusy(false);
    }
  };

  const status = (ready: boolean, label: string) => (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ready ? 'bg-jungle text-paper' : 'bg-ink/10 text-ink-soft'}`}>
      {ready ? `${label}: activo` : `${label}: sin configurar`}
    </span>
  );

  return (
    <div className="mb-8 rounded-3xl border border-ink/15 bg-paper p-6 shadow-ink-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-2xl font-bold text-ink">Avisos de ventas</h2>
        {status(view.whatsAppReady, 'WhatsApp')}
        {status(view.emailReady, 'Email')}
      </div>
      <p className="mb-5 text-sm text-ink-soft">
        Cuando un cliente pulsa un botón de pago, cuando confirma (o no) que pagó, y cuando pide que lo contacten. Todo gratis:
        WhatsApp por CallMeBot, correos por Brevo o Resend. Sin configurar, nada cambia para el cliente — y el envío de
        resúmenes por email no aparece en la tienda.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <FaWhatsapp className="text-jungle" /> WhatsApp al operador
          </h3>
          <Field
            label="Tu número de WhatsApp"
            hint="Con código de país, p. ej. +1 809 555 0123. Solo recibe avisos este número."
          >
            <input className={input} value={config.operatorWhatsApp} onChange={(e) => set({ operatorWhatsApp: e.target.value })} placeholder="+1 809 …" />
          </Field>
          <Field
            label={`Clave de CallMeBot ${view.callmebotKeySet ? '(ya guardada — escribe otra para cambiarla)' : ''}`}
            hint={
              <>
                Una vez: guarda <strong>+34 644 66 32 62</strong> como contacto y mándale por WhatsApp «I allow callmebot to send
                me messages». Te responde con tu clave (apikey). Ver{' '}
                <a className="underline" href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer">
                  callmebot.com
                </a>
                .
              </>
            }
          >
            <input className={input} value={botKey} onChange={(e) => setBotKey(e.target.value)} placeholder={view.callmebotKeySet ? '••••••' : '123456'} autoComplete="off" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || !view.whatsAppReady} onClick={() => test('whatsapp')} className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-50">
              Probar WhatsApp
            </button>
            {view.callmebotKeySet && (
              <button type="button" disabled={busy} onClick={() => window.confirm('¿Borrar esta clave? Los avisos por este canal se detendrán.') && save({ clearCallmebotApiKey: true })} className="rounded-full px-4 py-1.5 text-sm font-semibold text-hibiscus-dark">
                Borrar clave
              </button>
            )}
          </div>

          <h3 className="flex items-center gap-2 pt-2 text-lg font-bold text-ink">
            <FaEnvelope className="text-lagoon-dark" /> Correo
          </h3>
          <Field label="Correo del operador" hint="Adonde llegan los avisos.">
            <input className={input} type="email" value={config.operatorEmail} onChange={(e) => set({ operatorEmail: e.target.value })} placeholder="tu@correo.com" />
          </Field>
          <Field
            label="Servicio de envío"
            hint={
              <>
                <strong>Brevo</strong>: 300 correos/día gratis, basta con verificar tu dirección de remitente (brevo.com → SMTP &amp; API →
                API keys). <strong>Resend</strong>: 100/día gratis, pide verificar un dominio (resend.com → API Keys).
              </>
            }
          >
            <select className={input} value={config.emailProvider} onChange={(e) => set({ emailProvider: e.target.value as NotifyConfig['emailProvider'] })}>
              <option value="none">Ninguno (sin correos)</option>
              <option value="brevo">Brevo</option>
              <option value="resend">Resend</option>
            </select>
          </Field>
          {config.emailProvider !== 'none' && (
            <>
              <Field label={`Clave API ${view.emailKeySet ? '(ya guardada — escribe otra para cambiarla)' : ''}`}>
                <input className={input} value={emailKey} onChange={(e) => setEmailKey(e.target.value)} placeholder={view.emailKeySet ? '••••••' : 'xkeysib-… / re_…'} autoComplete="off" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Remitente (verificado)">
                  <input className={input} type="email" value={config.emailFrom} onChange={(e) => set({ emailFrom: e.target.value })} placeholder="reservas@…" />
                </Field>
                <Field label="Nombre del remitente">
                  <input className={input} value={config.emailFromName} onChange={(e) => set({ emailFromName: e.target.value })} placeholder="Mi Tours" />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy || !view.emailReady} onClick={() => test('email')} className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-50">
                  Probar correo
                </button>
                {view.emailKeySet && (
                  <button type="button" disabled={busy} onClick={() => window.confirm('¿Borrar esta clave? Los avisos por este canal se detendrán.') && save({ clearEmailApiKey: true })} className="rounded-full px-4 py-1.5 text-sm font-semibold text-hibiscus-dark">
                    Borrar clave
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-bold text-ink">Cuándo avisar</h3>
          <Toggle
            checked={config.notifyOnPayClick}
            onChange={(value) => set({ notifyOnPayClick: value })}
            label="Al pulsar un botón de pago"
            hint="«Un cliente está pagando ahora mismo US$ … por …», con sus datos de contacto."
          />
          <Toggle
            checked={config.notifyOnConfirm}
            onChange={(value) => set({ notifyOnConfirm: value })}
            label="Cuando el cliente responde si pagó"
            hint="Al volver a la web le preguntamos si funcionó; su respuesta te llega enseguida."
          />
          <Toggle
            checked={config.notifyOnTimeout}
            onChange={(value) => set({ notifyOnTimeout: value })}
            label="Si no responde a tiempo"
            hint="Un segundo aviso: el pago quizá no se completó."
          />
          <Field label="Tiempo de espera (minutos)" hint="Entre 5 y 1440. Por defecto 30.">
            <input
              className={input}
              type="number"
              min={5}
              max={1440}
              value={config.confirmTimeoutMin}
              onChange={(e) => set({ confirmTimeoutMin: Number(e.target.value) || 30 })}
            />
          </Field>
          <Toggle
            checked={config.notifyOnRequest}
            onChange={(value) => set({ notifyOnRequest: value })}
            label="Solicitudes de contacto"
            hint="Pedidos de llamada, mensajes del formulario y «contáctenme» del carrito."
          />
          <Toggle
            checked={config.guestEmails}
            onChange={(value) => set({ guestEmails: value })}
            label="Permitir correos a clientes"
            hint="Resumen del carrito y recibo por email (solo si hay servicio de correo configurado)."
          />
          <p className="rounded-2xl bg-ink/5 p-3 text-xs text-ink-soft">
            Sin WhatsApp configurado aquí, los botones de PayPal y tarjeta siguen abriendo WhatsApp para que el cliente te avise,
            como antes. A los clientes nunca les escribe el servidor por WhatsApp (no hay forma gratuita): reciben botones que
            abren su propio WhatsApp con el resumen.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={() => save()} className="rounded-full bg-jungle px-6 py-2.5 font-bold text-paper disabled:opacity-60">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        {message && <span className={`text-sm font-semibold ${message.ok ? 'text-jungle-dark' : 'text-hibiscus-dark'}`}>{message.text}</span>}
      </div>
    </div>
  );
};

export default NotifySettingsPanel;
