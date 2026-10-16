import React, { useEffect, useState } from 'react';
import { FaCreditCard, FaCheck, FaLock, FaUniversity, FaFlask } from 'react-icons/fa';
import { BrandSettings, PaymentVisibility, saveBrandSettings } from '../../services/brandService';
import {
  getPaymentConfigStatus,
  savePaymentConfig,
  PaymentConfigStatus,
  PaymentConfigPatch,
  GatewayMode,
  LocalCurrency,
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
  azul: {
    name: 'AZUL · Banco Popular',
    requirement: 'Necesita las credenciales de la Página de Pagos AZUL o un Link de Pagos AZUL',
  },
  cardnet: {
    name: 'CardNET',
    requirement: 'Necesita los datos de afiliado de CardNET o un Enlace de Pago de CardNET',
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

/** CardNET publishes these for its certification lab. They only work in test mode. */
const CARDNET_LAB = {
  cardnetMerchantNumber: '349000000',
  cardnetTerminal: '58585858',
  cardnetMerchantType: '7997',
  cardnetMerchantName: 'COMERCIO PARA REALIZAR PRUEBAS DO',
};

interface BankDraft {
  dopPerUsd: string;
  itbisPercent: string;
  azulMode: GatewayMode;
  azulMerchantId: string;
  azulMerchantName: string;
  azulMerchantType: string;
  azulCurrencyCode: string;
  azulCurrency: LocalCurrency;
  azulAuthKey: string;
  cardnetMode: GatewayMode;
  cardnetMerchantNumber: string;
  cardnetTerminal: string;
  cardnetMerchantType: string;
  cardnetMerchantName: string;
  cardnetCurrency: LocalCurrency;
}

const draftFrom = (status: PaymentConfigStatus): BankDraft => ({
  dopPerUsd: status.dopPerUsd ? String(status.dopPerUsd) : '',
  itbisPercent: status.itbisPercent ? String(status.itbisPercent) : '0',
  azulMode: status.azul.mode,
  azulMerchantId: status.azul.merchantId,
  azulMerchantName: status.azul.merchantName,
  azulMerchantType: status.azul.merchantType,
  azulCurrencyCode: status.azul.currencyCode,
  azulCurrency: status.azul.currency,
  azulAuthKey: '',
  cardnetMode: status.cardnet.mode,
  cardnetMerchantNumber: status.cardnet.merchantNumber,
  cardnetTerminal: status.cardnet.terminal,
  cardnetMerchantType: status.cardnet.merchantType,
  cardnetMerchantName: status.cardnet.merchantName,
  cardnetCurrency: status.cardnet.currency,
});

/**
 * Payment settings.
 *
 * The secret keys are WRITE-ONLY here. This panel is told whether a key is on
 * file and whether it is live or test; it is never sent the key, and there is
 * no endpoint that would send it. That is the difference from the fork this
 * was ported from, where the key lived in the brand record and went out to
 * every visitor with it.
 *
 * AZUL and CARDNET work two ways, and either is enough:
 *
 *   - With merchant credentials, the exact amount of each booking travels to
 *     the bank's own payment page — a transfer quote is charged to the cent.
 *   - With only a payment link copied from the bank's portal, the guest is sent
 *     to that link. Put {amount} in it if the bank's link accepts one; if not,
 *     the guest is shown the amount to enter.
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
  const [bank, setBank] = useState<BankDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [bankMessage, setBankMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [brandMessage, setBrandMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getPaymentConfigStatus()
      .then((next) => {
        setStatus(next);
        setCurrencyDraft(next.stripeCurrency.toUpperCase());
        if (next.azul && next.cardnet) setBank(draftFrom(next));
      })
      .catch((error) =>
        setMessage({ kind: 'error', text: error?.message || 'No se pudo leer la configuración.' })
      );
  }, []);

  const methods = getPaymentMethodStates(brandSettings, {
    stripe: status?.stripeSecretConfigured ?? false,
    azul: status?.azul?.ready ?? false,
    cardnet: status?.cardnet?.ready ?? false,
  });

  const toggleVisibility = (method: PaymentMethodId, visible: boolean) => {
    const next: PaymentVisibility = { ...brandSettings.paymentVisibility, [method]: visible };
    setBrandSettings({ ...brandSettings, paymentVisibility: next });
  };

  const handleSaveStripe = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const patch: PaymentConfigPatch = {};
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

  const updateBank = (patch: Partial<BankDraft>) => setBank((current) => (current ? { ...current, ...patch } : current));

  const handleSaveBanks = async (extra: PaymentConfigPatch = {}) => {
    if (!bank) return;
    setSaving(true);
    setBankMessage(null);
    try {
      const patch: PaymentConfigPatch = {
        dopPerUsd: Number(bank.dopPerUsd.replace(',', '.')) || 0,
        itbisPercent: Number(bank.itbisPercent.replace(',', '.')) || 0,
        azulMode: bank.azulMode,
        azulMerchantId: bank.azulMerchantId,
        azulMerchantName: bank.azulMerchantName,
        azulMerchantType: bank.azulMerchantType,
        azulCurrencyCode: bank.azulCurrencyCode,
        azulCurrency: bank.azulCurrency,
        cardnetMode: bank.cardnetMode,
        cardnetMerchantNumber: bank.cardnetMerchantNumber,
        cardnetTerminal: bank.cardnetTerminal,
        cardnetMerchantType: bank.cardnetMerchantType,
        cardnetMerchantName: bank.cardnetMerchantName,
        cardnetCurrency: bank.cardnetCurrency,
        ...extra,
      };
      // Write-only, like the Stripe key: only sent when something was typed.
      if (bank.azulAuthKey.trim()) patch.azulAuthKey = bank.azulAuthKey.trim();

      const next = await savePaymentConfig(patch);
      setStatus(next);
      setBank(draftFrom(next));
      setBankMessage({ kind: 'ok', text: 'Datos de AZUL y CardNET guardados.' });
    } catch (error: any) {
      setBankMessage({ kind: 'error', text: error?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBrand = async () => {
    setSaving(true);
    setBrandMessage(null);
    try {
      const saved = await saveBrandSettings(brandSettings);
      setBrandMessage(
        saved
          ? { kind: 'ok', text: 'Enlaces y visibilidad guardados.' }
          : { kind: 'error', text: 'No se pudo guardar. ¿Sigue abierta tu sesión de administrador?' }
      );
    } catch (error: any) {
      setBrandMessage({ kind: 'error', text: error?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const field =
    'w-full rounded-2xl border border-ink/15 bg-paper px-4 py-3 text-ink outline-none ' +
    'transition focus:border-lagoon-dark';
  const label = 'space-y-2';
  const labelText = 'text-sm font-semibold text-ink-soft';

  const Notice = ({ value }: { value: { kind: 'ok' | 'error'; text: string } | null }) =>
    value ? (
      <span className={`text-sm ${value.kind === 'ok' ? 'text-lagoon-dark' : 'text-sunset-dark'}`}>
        {value.text}
      </span>
    ) : null;

  const ReadyChip = ({ ready, mode }: { ready: boolean; mode?: GatewayMode }) =>
    ready ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lagoon-dark/10 px-3 py-1 text-xs font-semibold text-lagoon-dark">
        <FaCheck /> lista {mode && <em className="not-italic opacity-70">({mode === 'live' ? 'modo real' : 'modo de prueba'})</em>}
      </span>
    ) : (
      <span className="rounded-full bg-sunset-dark/10 px-3 py-1 text-xs font-semibold text-sunset-dark">
        sin configurar
      </span>
    );

  const ModeSwitch = ({ value, onChange }: { value: GatewayMode; onChange: (mode: GatewayMode) => void }) => (
    <div className="inline-flex rounded-full border border-ink/15 bg-paper p-1 text-xs font-semibold">
      {(['test', 'live'] as GatewayMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-full px-3 py-1.5 transition ${
            value === mode ? (mode === 'live' ? 'bg-jungle-dark text-white' : 'bg-mango text-ink') : 'text-ink-soft'
          }`}
        >
          {mode === 'test' ? 'Pruebas' : 'Real'}
        </button>
      ))}
    </div>
  );

  const CurrencySwitch = ({ value, onChange }: { value: LocalCurrency; onChange: (c: LocalCurrency) => void }) => (
    <select value={value} onChange={(event) => onChange(event.target.value as LocalCurrency)} className={field}>
      <option value="DOP">Pesos dominicanos (RD$)</option>
      <option value="USD">Dólares (US$)</option>
    </select>
  );

  return (
    <div className="mt-6 rounded-3xl border border-ink/10 p-5">
      <div className="mb-1 flex items-center gap-2">
        <FaCreditCard className="text-lagoon-dark" />
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
              className="h-5 w-5 accent-lagoon-dark"
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lagoon-dark/10 px-3 py-1 font-semibold text-lagoon-dark">
              <FaCheck /> guardada
              {status.stripeMode && (
                <em className="not-italic opacity-70">
                  ({status.stripeMode === 'live' ? 'modo real' : 'modo de prueba'})
                </em>
              )}
            </span>
          ) : (
            <span className="rounded-full bg-sunset-dark/10 px-3 py-1 font-semibold text-sunset-dark">
              sin configurar
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <label className={label}>
            <span className={labelText}>
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
          <label className={label}>
            <span className={labelText}>Moneda</span>
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
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {status?.stripeSecretConfigured && (
            <button
              onClick={handleClearStripe}
              disabled={saving}
              className="rounded-full border border-sunset-dark/40 px-5 py-2 text-sm font-semibold text-sunset-dark disabled:opacity-50"
            >
              Borrar la clave
            </button>
          )}
          <Notice value={message} />
        </div>

        {status && !status.storageAvailable && (
          <p className="mt-3 rounded-2xl bg-sunset-dark/10 p-3 text-xs text-sunset-dark">
            Esta instalación no tiene KV conectado, así que no se puede guardar nada aquí.
          </p>
        )}

        <p className="mt-4 border-t border-ink/10 pt-4 text-xs text-ink-light">
          ¿Sin clave? También puedes pegar un enlace de pago propio (Stripe Payment Link,
          Verifone, etc.) en el campo de más arriba — funciona como alternativa, pero el importe
          será el que tenga ese enlace, no el del carrito.
        </p>
      </div>

      {/* ── AZUL and CardNET ───────────────────────────────────────────── */}
      {bank && status && (
        <div className="mt-5 rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
          <div className="mb-1 flex items-center gap-2">
            <FaUniversity className="text-lagoon-dark" />
            <h4 className="font-semibold text-ink">Bancos dominicanos · AZUL y CardNET</h4>
          </div>
          <p className="mb-4 max-w-2xl text-xs text-ink-soft">
            Con los datos de afiliado, cada reserva viaja con su importe exacto a la página de pago
            del banco — también los traslados, cuyo precio sale del mapa. El visitante pone la
            tarjeta en la página del banco, nunca aquí, y el resultado se comprueba con el banco
            antes de avisarte por WhatsApp. Sin datos de afiliado, basta un enlace de pago del
            portal del banco (más abajo, en cada banco).
          </p>

          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <label className={label}>
              <span className={labelText}>Tasa: pesos por dólar (RD$ por US$ 1)</span>
              <input
                type="text"
                inputMode="decimal"
                value={bank.dopPerUsd}
                onChange={(event) => updateBank({ dopPerUsd: event.target.value })}
                placeholder="60.50"
                className={field}
              />
              <span className="block text-xs text-ink-light">
                Los precios del catálogo están en dólares. Un banco que cobra en pesos los convierte
                con esta tasa; sin tasa, ese banco no se ofrece.
              </span>
            </label>
            <label className={label}>
              <span className={labelText}>ITBIS incluido en los precios (%)</span>
              <input
                type="text"
                inputMode="decimal"
                value={bank.itbisPercent}
                onChange={(event) => updateBank({ itbisPercent: event.target.value })}
                placeholder="18"
                className={field}
              />
              <span className="block text-xs text-ink-light">
                0 si el negocio está exento. Los bancos piden la parte de impuesto por separado.
              </span>
            </label>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {/* AZUL */}
            <div className="rounded-3xl border border-ink/10 bg-paper/70 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-ink">AZUL · Página de Pagos</div>
                <div className="flex items-center gap-2">
                  <ReadyChip ready={status.azul.ready} mode={status.azul.mode} />
                  <ModeSwitch value={bank.azulMode} onChange={(azulMode) => updateBank({ azulMode })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>
                  <span className={labelText}>Merchant ID</span>
                  <input className={field} value={bank.azulMerchantId} onChange={(e) => updateBank({ azulMerchantId: e.target.value })} placeholder="39038540035" />
                </label>
                <label className={label}>
                  <span className={labelText}>Nombre del comercio</span>
                  <input className={field} value={bank.azulMerchantName} onChange={(e) => updateBank({ azulMerchantName: e.target.value })} placeholder="Como lo registró AZUL" />
                </label>
                <label className={label}>
                  <span className={labelText}>Tipo de comercio</span>
                  <input className={field} value={bank.azulMerchantType} onChange={(e) => updateBank({ azulMerchantType: e.target.value })} placeholder="ECommerce" />
                </label>
                <label className={label}>
                  <span className={labelText}>Código de moneda de AZUL</span>
                  <input className={field} value={bank.azulCurrencyCode} onChange={(e) => updateBank({ azulCurrencyCode: e.target.value })} placeholder="$" />
                </label>
                <label className={label}>
                  <span className={labelText}>Cobra en</span>
                  <CurrencySwitch value={bank.azulCurrency} onChange={(azulCurrency) => updateBank({ azulCurrency })} />
                </label>
                <label className={label}>
                  <span className={labelText}>
                    AuthKey {status.azul.authKeyConfigured && <span className="text-lagoon-dark">(guardada — escribe solo para reemplazarla)</span>}
                  </span>
                  <input
                    className={field}
                    type="password"
                    autoComplete="off"
                    value={bank.azulAuthKey}
                    onChange={(e) => updateBank({ azulAuthKey: e.target.value })}
                    placeholder={status.azul.authKeyConfigured ? '••••••••' : 'Clave de autenticación de AZUL'}
                  />
                </label>
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs text-ink-light">
                <FaLock className="mt-0.5 shrink-0" />
                <span>
                  AZUL entrega Merchant ID, AuthKey y el código de moneda al afiliarte al e-commerce,
                  distintos para pruebas y para producción. La AuthKey firma cada pago y se queda en
                  el servidor.
                </span>
              </p>
              <label className={`${label} mt-4 block border-t border-ink/10 pt-4`}>
                <span className={labelText}>…o un Link de Pagos AZUL</span>
                <input
                  className={field}
                  value={brandSettings.azulLink ?? ''}
                  onChange={(e) => setBrandSettings({ ...brandSettings, azulLink: e.target.value })}
                  placeholder="https://… (opcional: {amount}, {currency}, {ref})"
                />
              </label>
            </div>

            {/* CardNET */}
            <div className="rounded-3xl border border-ink/10 bg-paper/70 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-ink">CardNET · Botón de Pago</div>
                <div className="flex items-center gap-2">
                  <ReadyChip ready={status.cardnet.ready} mode={status.cardnet.mode} />
                  <ModeSwitch value={bank.cardnetMode} onChange={(cardnetMode) => updateBank({ cardnetMode })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>
                  <span className={labelText}>Número de afiliado</span>
                  <input className={field} value={bank.cardnetMerchantNumber} onChange={(e) => updateBank({ cardnetMerchantNumber: e.target.value })} placeholder="349…" />
                </label>
                <label className={label}>
                  <span className={labelText}>Terminal</span>
                  <input className={field} value={bank.cardnetTerminal} onChange={(e) => updateBank({ cardnetTerminal: e.target.value })} placeholder="8 dígitos" />
                </label>
                <label className={label}>
                  <span className={labelText}>Categoría (MCC)</span>
                  <input className={field} value={bank.cardnetMerchantType} maxLength={4} onChange={(e) => updateBank({ cardnetMerchantType: e.target.value.replace(/\D/g, '') })} placeholder="4722" />
                </label>
                <label className={label}>
                  <span className={labelText}>Cobra en</span>
                  <CurrencySwitch value={bank.cardnetCurrency} onChange={(cardnetCurrency) => updateBank({ cardnetCurrency })} />
                </label>
                <label className={`${label} sm:col-span-2`}>
                  <span className={labelText}>Nombre del comercio (como lo registró CardNET, máx. 40)</span>
                  <input className={field} value={bank.cardnetMerchantName} maxLength={40} onChange={(e) => updateBank({ cardnetMerchantName: e.target.value.toUpperCase() })} placeholder="EL CORTECITO TOURS   PUNTA CANA     DO" />
                </label>
              </div>
              {bank.cardnetMode === 'test' && (
                <button
                  type="button"
                  onClick={() => updateBank({ ...CARDNET_LAB })}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-mango-dark/40 px-4 py-1.5 text-xs font-semibold text-mango-dark"
                >
                  <FaFlask /> Usar los datos públicos del laboratorio de CardNET
                </button>
              )}
              <label className={`${label} mt-4 block border-t border-ink/10 pt-4`}>
                <span className={labelText}>…o un Enlace de Pago de CardNET</span>
                <input
                  className={field}
                  value={brandSettings.cardnetLink ?? ''}
                  onChange={(e) => setBrandSettings({ ...brandSettings, cardnetLink: e.target.value })}
                  placeholder="https://… (opcional: {amount}, {currency}, {ref})"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleSaveBanks()}
              disabled={saving}
              className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar datos de los bancos'}
            </button>
            {status.azul.authKeyConfigured && (
              <button
                onClick={() => handleSaveBanks({ azulAuthKey: '' })}
                disabled={saving}
                className="rounded-full border border-sunset-dark/40 px-5 py-2 text-sm font-semibold text-sunset-dark disabled:opacity-50"
              >
                Borrar la AuthKey de AZUL
              </button>
            )}
            <Notice value={bankMessage} />
          </div>
          <p className="mt-3 text-xs text-ink-light">
            Los enlaces de pago se guardan con el botón de abajo, junto con la visibilidad.
          </p>
        </div>
      )}

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
                        <span className="text-lagoon-dark">visible para los visitantes</span>
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
                    className="h-5 w-5 accent-lagoon-dark"
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

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSaveBrand}
            disabled={saving}
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar enlaces y visibilidad'}
          </button>
          <Notice value={brandMessage} />
        </div>
      </div>
    </div>
  );
};

export default PaymentSettingsPanel;
