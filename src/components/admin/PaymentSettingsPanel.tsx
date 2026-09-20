import React, { useEffect, useState } from 'react';
import { FaCreditCard, FaCheck, FaLock } from 'react-icons/fa';
import { BrandSettings, PaymentVisibility } from '../../services/brandService';
import {
  getPaymentConfigStatus,
  savePaymentConfig,
  PaymentConfigStatus,
} from '../../services/paymentService';
import {
  getPaymentMethodStates,
  PaymentMethodId,
  PAYMENT_METHOD_IDS,
} from '../../utils/paymentMethods';

interface PaymentSettingsPanelProps {
  brandSettings: BrandSettings;
  setBrandSettings: (next: BrandSettings) => void;
}

const METHOD_LABELS: Record<PaymentMethodId, { name: string; requirement: string }> = {
  stripe: {
    name: 'Tarjeta de crédito / débito (Stripe)',
    requirement: 'Necesita "Aceptar tarjetas" más una clave secreta de Stripe o un enlace de pago',
  },
  paypal: {
    name: 'PayPal',
    requirement: 'Necesita un enlace de PayPal.Me',
  },
  cash: {
    name: 'Concierge / efectivo por WhatsApp',
    requirement: 'Necesita un número de teléfono',
  },
};

/**
 * Payment settings.
 *
 * The secret key is WRITE-ONLY here. This panel is told whether a key is on
 * file and whether it is live or test; it is never sent the key, and there is
 * no endpoint that would send it. That is the difference from the fork this
 * was ported from, where the key lived in the brand record and went out to
 * every visitor with it.
 *
 * Visibility is two switches deep on purpose. A method is only offered to
 * guests when it is configured AND left switched on, so turning something off
 * for a week does not mean deleting the credentials for it.
 */
const PaymentSettingsPanel: React.FC<PaymentSettingsPanelProps> = ({
  brandSettings,
  setBrandSettings,
}) => {
  const [status, setStatus] = useState<PaymentConfigStatus | null>(null);
  const [secretDraft, setSecretDraft] = useState('');
  const [currencyDraft, setCurrencyDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getPaymentConfigStatus()
      .then((next) => {
        setStatus(next);
        setCurrencyDraft(next.stripeCurrency.toUpperCase());
      })
      .catch((error) =>
        setMessage({ kind: 'error', text: error?.message || 'No se pudo leer la configuración.' })
      );
  }, []);

  const methods = getPaymentMethodStates(brandSettings, status?.stripeSecretConfigured ?? false);

  const toggleVisibility = (method: PaymentMethodId, visible: boolean) => {
    const next: PaymentVisibility = { ...brandSettings.paymentVisibility, [method]: visible };
    setBrandSettings({ ...brandSettings, paymentVisibility: next });
  };

  const handleSaveStripe = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const patch: { stripeSecretKey?: string; stripeCurrency?: string } = {};
      // Omitted rather than sent empty, so saving a currency does not wipe a
      // key the operator was never shown.
      if (secretDraft.trim()) patch.stripeSecretKey = secretDraft.trim();
      if (currencyDraft.trim()) patch.stripeCurrency = currencyDraft.trim();

      const next = await savePaymentConfig(patch);
      setStatus(next);
      setSecretDraft('');
      setMessage({ kind: 'ok', text: 'Configuración de pagos guardada.' });
    } catch (error: any) {
      setMessage({ kind: 'error', text: error?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearStripe = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const next = await savePaymentConfig({ stripeSecretKey: '' });
      setStatus(next);
      setSecretDraft('');
      setMessage({ kind: 'ok', text: 'Clave de Stripe eliminada.' });
    } catch (error: any) {
      setMessage({ kind: 'error', text: error?.message || 'No se pudo borrar la clave.' });
    } finally {
      setSaving(false);
    }
  };

  const field =
    'w-full rounded-2xl border border-ink/15 bg-paper-card px-4 py-3 text-ink outline-none ' +
    'transition focus:border-sea-deep';

  return (
    <div className="mt-6 rounded-3xl border border-ink/10 p-5">
      <div className="mb-1 flex items-center gap-2">
        <FaCreditCard className="text-sea-deep" />
        <h3 className="text-lg font-semibold text-ink">Pagos</h3>
      </div>
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        Qué formas de pago ve un visitante. Una forma de pago solo aparece cuando está
        configurada <em>y</em> encendida.
      </p>

      {/* ── Stripe ─────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-ink">Stripe · cobro con tarjeta</h4>
            <p className="text-xs text-ink-soft">
              El visitante paga en Stripe y vuelve aquí. No necesita cuenta de Stripe.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-5 w-5 accent-sea-deep"
              checked={brandSettings.stripeEnabled ?? false}
              onChange={(event) =>
                setBrandSettings({ ...brandSettings, stripeEnabled: event.target.checked })
              }
            />
            <span className="text-sm font-semibold text-ink">Aceptar tarjetas</span>
          </label>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-ink-soft">Clave secreta:</span>
          {status?.stripeSecretConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sea-deep/10 px-3 py-1 font-semibold text-sea-deep">
              <FaCheck /> guardada
              {status.stripeMode && (
                <em className="not-italic opacity-70">
                  ({status.stripeMode === 'live' ? 'modo real' : 'modo de prueba'})
                </em>
              )}
            </span>
          ) : (
            <span className="rounded-full bg-coral-deep/10 px-3 py-1 font-semibold text-coral-deep">
              sin configurar
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-soft">
              {status?.stripeSecretConfigured ? 'Reemplazar la clave secreta' : 'Clave secreta de Stripe'}
            </span>
            <input
              type="password"
              autoComplete="off"
              value={secretDraft}
              onChange={(event) => setSecretDraft(event.target.value)}
              placeholder="sk_live_… o sk_test_…"
              className={field}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-ink-soft">Moneda</span>
            <input
              type="text"
              maxLength={3}
              value={currencyDraft}
              onChange={(event) => setCurrencyDraft(event.target.value.toUpperCase())}
              placeholder="USD"
              className={field}
            />
          </label>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs text-ink-light">
          <FaLock className="mt-0.5 shrink-0" />
          <span>
            La clave se guarda solo en el servidor y nunca se envía al navegador — ni siquiera a
            este panel. Por eso no puedes verla aquí después de guardarla, solo reemplazarla.
          </span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSaveStripe}
            disabled={saving || (!secretDraft.trim() && !currencyDraft.trim())}
            className="rounded-full bg-sea-deep px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {status?.stripeSecretConfigured && (
            <button
              onClick={handleClearStripe}
              disabled={saving}
              className="rounded-full border border-coral-deep/40 px-5 py-2 text-sm font-semibold text-coral-deep disabled:opacity-50"
            >
              Borrar la clave
            </button>
          )}
          {message && (
            <span
              className={`text-sm ${message.kind === 'ok' ? 'text-sea-deep' : 'text-coral-deep'}`}
            >
              {message.text}
            </span>
          )}
        </div>

        {status && !status.storageAvailable && (
          <p className="mt-3 rounded-2xl bg-coral-deep/10 p-3 text-xs text-coral-deep">
            Esta instalación no tiene KV conectado, así que no se puede guardar nada aquí.
          </p>
        )}

        <p className="mt-4 border-t border-ink/10 pt-4 text-xs text-ink-light">
          ¿Sin clave? También puedes pegar un enlace de pago propio (Stripe Payment Link,
          Verifone, etc.) en el campo de más arriba — funciona como alternativa, pero el importe
          será el que tenga ese enlace, no el del carrito.
        </p>
      </div>

      {/* ── Visibility ─────────────────────────────────────────────────── */}
      <div className="mt-5 rounded-3xl border border-ink/10 p-5">
        <h4 className="mb-4 font-semibold text-ink">Qué ve el visitante</h4>
        <div className="space-y-3">
          {PAYMENT_METHOD_IDS.map((method) => {
            const state = methods[method];
            return (
              <div
                key={method}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-ink">{METHOD_LABELS[method].name}</div>
                  <div className="text-xs text-ink-light">
                    {state.configured ? (
                      state.visible ? (
                        <span className="text-sea-deep">visible para los visitantes</span>
                      ) : (
                        <span>configurada, pero apagada</span>
                      )
                    ) : (
                      METHOD_LABELS[method].requirement
                    )}
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-sea-deep"
                    checked={state.enabled}
                    disabled={!state.configured}
                    onChange={(event) => toggleVisibility(method, event.target.checked)}
                  />
                  <span className="text-xs font-semibold text-ink-soft">Mostrar</span>
                </label>
              </div>
            );
          })}
        </div>

        {!Object.values(methods).some((state) => state.visible) && (
          <p className="mt-4 rounded-2xl bg-mango/15 p-3 text-xs text-ink-soft">
            Ahora mismo no hay ninguna forma de pago visible. El botón «Book &amp; Pay Now» abrirá
            WhatsApp directamente.
          </p>
        )}
      </div>
    </div>
  );
};

export default PaymentSettingsPanel;
