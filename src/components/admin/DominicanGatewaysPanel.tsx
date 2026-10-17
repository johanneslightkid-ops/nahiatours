import React, { useEffect, useState } from 'react';
import { FaCheck, FaLock, FaUniversity } from 'react-icons/fa';
import {
  savePaymentConfig,
  PaymentConfigStatus,
  AzulPatch,
  CardnetPatch,
  GatewayEnvironment,
} from '../../services/paymentService';

/**
 * Settings for the two Dominican card gateways.
 *
 *   AZUL     — Banco Popular Dominicano. Affiliation gives a MerchantId, the
 *              exact merchant name, a CurrencyCode and an AuthKey.
 *   CardNet  — BHD, Banreservas and most other banks. Affiliation gives a
 *              MerchantNumber (afiliado) and a MerchantTerminal.
 *
 * Both start in TEST mode against the bank's sandbox; switch to production
 * only with the production credentials, which are different numbers.
 *
 * Merchant numbers are shown only by their last four digits and AZUL's
 * AuthKey not at all: like the Stripe key, they can be replaced but never
 * read back. Leaving a credential field empty keeps what is stored.
 */

interface Props {
  status: PaymentConfigStatus | null;
  onSaved: (next: PaymentConfigStatus) => void;
}

const field =
  'w-full rounded-2xl border border-ink/15 bg-paper-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-lagoon-dark';
const label = 'text-xs font-semibold text-ink-soft';

const Badge: React.FC<{ ok: boolean; env?: GatewayEnvironment }> = ({ ok, env }) =>
  ok ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-lagoon-dark/10 px-3 py-1 text-xs font-semibold text-lagoon-dark">
      <FaCheck /> configurado
      <em className="not-italic opacity-70">({env === 'production' ? 'producción' : 'pruebas'})</em>
    </span>
  ) : (
    <span className="rounded-full bg-sunset-dark/10 px-3 py-1 text-xs font-semibold text-sunset-dark">sin configurar</span>
  );

const EnvironmentSwitch: React.FC<{ value: GatewayEnvironment; onChange: (v: GatewayEnvironment) => void }> = ({
  value,
  onChange,
}) => (
  <div className="inline-flex rounded-full border border-ink/15 bg-paper-card p-1 text-xs font-semibold">
    {(['test', 'production'] as GatewayEnvironment[]).map((env) => (
      <button
        key={env}
        type="button"
        onClick={() => onChange(env)}
        className={`rounded-full px-3 py-1.5 transition ${
          value === env ? (env === 'production' ? 'bg-jungle-dark text-white' : 'bg-mango text-ink') : 'text-ink-soft'
        }`}
      >
        {env === 'test' ? 'Pruebas' : 'Producción'}
      </button>
    ))}
  </div>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="flex items-start gap-2 text-xs text-ink-light">
    <FaLock className="mt-0.5 shrink-0" />
    <span>{children}</span>
  </p>
);

const DominicanGatewaysPanel: React.FC<Props> = ({ status, onSaved }) => {
  const [azul, setAzul] = useState<AzulPatch & { itbisPercent?: string; rateText?: string }>({});
  const [cardnet, setCardnet] = useState<CardnetPatch & { itbisPercent?: string; rateText?: string }>({});
  const [saving, setSaving] = useState<'' | 'azul' | 'cardnet'>('');
  const [message, setMessage] = useState<{ gateway: 'azul' | 'cardnet'; kind: 'ok' | 'error'; text: string } | null>(null);

  // Seed the non-secret fields from what the server reports.
  useEffect(() => {
    if (!status) return;
    setAzul({
      environment: status.azul.environment,
      merchantName: status.azul.merchantName,
      merchantType: status.azul.merchantType,
      currencyCode: status.azul.currencyCode,
      paymentPageUrl: status.azul.endpointOverride,
      rateText: String(status.azul.exchangeRate),
      itbisPercent: String(Math.round(status.azul.itbisRate * 100)),
    });
    setCardnet({
      environment: status.cardnet.environment,
      merchantName: status.cardnet.merchantName,
      merchantType: status.cardnet.merchantType,
      acquiringInstitutionCode: status.cardnet.acquiringInstitutionCode,
      currencyCode: status.cardnet.currencyCode,
      apiBase: status.cardnet.endpointOverride,
      rateText: String(status.cardnet.exchangeRate),
      itbisPercent: String(Math.round(status.cardnet.itbisRate * 100)),
    });
  }, [status]);

  const numbers = (draft: { rateText?: string; itbisPercent?: string }) => {
    const rate = Number(String(draft.rateText ?? '').replace(',', '.'));
    const itbis = Number(String(draft.itbisPercent ?? '').replace(',', '.'));
    return {
      exchangeRate: Number.isFinite(rate) && rate > 0 ? rate : undefined,
      itbisRate: Number.isFinite(itbis) && itbis >= 0 && itbis <= 50 ? itbis / 100 : undefined,
    };
  };

  const save = async (gateway: 'azul' | 'cardnet', clear = false) => {
    setSaving(gateway);
    setMessage(null);
    try {
      let next: PaymentConfigStatus;
      if (gateway === 'azul') {
        const { itbisPercent, rateText, ...rest } = azul;
        const patch: AzulPatch = clear
          ? { merchantId: '', authKey: '', merchantName: '' }
          : { ...rest, ...numbers({ itbisPercent, rateText }) };
        // Empty credential fields mean "keep what is stored".
        if (!clear) {
          if (!patch.merchantId) delete patch.merchantId;
          if (!patch.authKey) delete patch.authKey;
        }
        next = await savePaymentConfig({ azul: patch });
        setAzul((draft) => ({ ...draft, merchantId: '', authKey: '' }));
      } else {
        const { itbisPercent, rateText, ...rest } = cardnet;
        const patch: CardnetPatch = clear
          ? { merchantNumber: '', merchantTerminal: '', merchantName: '' }
          : { ...rest, ...numbers({ itbisPercent, rateText }) };
        if (!clear) {
          if (!patch.merchantNumber) delete patch.merchantNumber;
          if (!patch.merchantTerminal) delete patch.merchantTerminal;
        }
        next = await savePaymentConfig({ cardnet: patch });
        setCardnet((draft) => ({ ...draft, merchantNumber: '', merchantTerminal: '' }));
      }
      onSaved(next);
      setMessage({ gateway, kind: 'ok', text: clear ? 'Credenciales borradas.' : 'Guardado.' });
    } catch (error: any) {
      setMessage({ gateway, kind: 'error', text: error?.message || 'No se pudo guardar.' });
    } finally {
      setSaving('');
    }
  };

  const feedback = (gateway: 'azul' | 'cardnet') =>
    message?.gateway === gateway ? (
      <span className={`text-sm ${message.kind === 'ok' ? 'text-lagoon-dark' : 'text-sunset-dark'}`}>{message.text}</span>
    ) : null;

  const azulStatus = status?.azul;
  const cardnetStatus = status?.cardnet;

  return (
    <div className="mt-5 space-y-5">
      {/* ── AZUL ─────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-ink">
              <FaUniversity className="text-sky-dark" /> AZUL · Banco Popular
            </h4>
            <p className="text-xs text-ink-soft">
              Página de Pagos AZUL. El visitante paga en la página segura de AZUL (con 3-D Secure) y vuelve aquí.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge ok={Boolean(azulStatus?.configured)} env={azulStatus?.environment} />
            <EnvironmentSwitch
              value={(azul.environment as GatewayEnvironment) || 'test'}
              onChange={(environment) => setAzul({ ...azul, environment })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className={label}>MerchantId {azulStatus?.merchantHint && `(guardado ${azulStatus.merchantHint})`}</span>
            <input
              className={field}
              value={azul.merchantId ?? ''}
              onChange={(e) => setAzul({ ...azul, merchantId: e.target.value })}
              placeholder={azulStatus?.merchantHint ? 'Dejar vacío para conservar' : '39038540035'}
              autoComplete="off"
            />
          </label>
          <label className="space-y-1.5">
            <span className={label}>MerchantName (exacto, como lo dio AZUL)</span>
            <input className={field} value={azul.merchantName ?? ''} onChange={(e) => setAzul({ ...azul, merchantName: e.target.value })} />
          </label>
          <label className="space-y-1.5">
            <span className={label}>AuthKey {azulStatus?.authKeyConfigured && '(guardada)'}</span>
            <input
              type="password"
              className={field}
              value={azul.authKey ?? ''}
              onChange={(e) => setAzul({ ...azul, authKey: e.target.value })}
              placeholder={azulStatus?.authKeyConfigured ? 'Dejar vacío para conservar' : 'Clave de autenticación'}
              autoComplete="off"
            />
          </label>
          <label className="space-y-1.5">
            <span className={label}>MerchantType</span>
            <input className={field} value={azul.merchantType ?? ''} onChange={(e) => setAzul({ ...azul, merchantType: e.target.value })} placeholder="ECommerce" />
          </label>
          <label className="space-y-1.5">
            <span className={label}>CurrencyCode (lo indica AZUL con las credenciales)</span>
            <select className={field} value={azul.currencyCode ?? '$'} onChange={(e) => setAzul({ ...azul, currencyCode: e.target.value })}>
              <option value="$">$ — pesos dominicanos (RD$)</option>
              <option value="US$">US$ — dólares</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className={label}>Tasa: 1 US$ del catálogo = … en la moneda del comercio</span>
            <input className={field} inputMode="decimal" value={azul.rateText ?? ''} onChange={(e) => setAzul({ ...azul, rateText: e.target.value })} placeholder="60.50" />
          </label>
          <label className="space-y-1.5">
            <span className={label}>ITBIS incluido en el precio (%)</span>
            <input className={field} inputMode="decimal" value={azul.itbisPercent ?? ''} onChange={(e) => setAzul({ ...azul, itbisPercent: e.target.value })} placeholder="0 (exento) o 18" />
          </label>
          <label className="space-y-1.5">
            <span className={label}>URL de la página de pagos (opcional)</span>
            <input className={field} value={azul.paymentPageUrl ?? ''} onChange={(e) => setAzul({ ...azul, paymentPageUrl: e.target.value })} placeholder="Automática según el ambiente" />
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <Note>La AuthKey se guarda solo en el servidor y nunca vuelve al navegador — solo se puede reemplazar.</Note>
          <Note>
            Con un MerchantId en pesos ($), los precios del catálogo (en dólares) se convierten con la tasa de arriba.
            Con un MerchantId en dólares (US$), deja la tasa en 1.
          </Note>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => save('azul')}
            disabled={saving !== ''}
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving === 'azul' ? 'Guardando…' : 'Guardar AZUL'}
          </button>
          {azulStatus?.configured && (
            <button
              onClick={() => save('azul', true)}
              disabled={saving !== ''}
              className="rounded-full border border-sunset-dark/40 px-5 py-2 text-sm font-semibold text-sunset-dark disabled:opacity-50"
            >
              Desconectar AZUL
            </button>
          )}
          {feedback('azul')}
        </div>
      </div>

      {/* ── CardNet ──────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-ink">
              <FaUniversity className="text-lagoon-dark" /> CardNet · BHD y otros bancos
            </h4>
            <p className="text-xs text-ink-soft">
              Botón de Pago CardNet. El visitante paga en la pantalla segura de CardNet y el servidor confirma el resultado con CardNet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge ok={Boolean(cardnetStatus?.configured)} env={cardnetStatus?.environment} />
            <EnvironmentSwitch
              value={(cardnet.environment as GatewayEnvironment) || 'test'}
              onChange={(environment) => setCardnet({ ...cardnet, environment })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className={label}>MerchantNumber (afiliado) {cardnetStatus?.merchantHint && `(guardado ${cardnetStatus.merchantHint})`}</span>
            <input
              className={field}
              inputMode="numeric"
              value={cardnet.merchantNumber ?? ''}
              onChange={(e) => setCardnet({ ...cardnet, merchantNumber: e.target.value })}
              placeholder={cardnetStatus?.merchantHint ? 'Dejar vacío para conservar' : '349000000 (laboratorio)'}
              autoComplete="off"
            />
          </label>
          <label className="space-y-1.5">
            <span className={label}>MerchantTerminal {cardnetStatus?.terminalHint && `(guardado ${cardnetStatus.terminalHint})`}</span>
            <input
              className={field}
              inputMode="numeric"
              value={cardnet.merchantTerminal ?? ''}
              onChange={(e) => setCardnet({ ...cardnet, merchantTerminal: e.target.value })}
              placeholder={cardnetStatus?.terminalHint ? 'Dejar vacío para conservar' : '58585858 (laboratorio)'}
              autoComplete="off"
            />
          </label>
          <label className="space-y-1.5">
            <span className={label}>MerchantName</span>
            <input className={field} value={cardnet.merchantName ?? ''} onChange={(e) => setCardnet({ ...cardnet, merchantName: e.target.value })} />
          </label>
          <label className="space-y-1.5">
            <span className={label}>MerchantType (MCC)</span>
            <input className={field} inputMode="numeric" value={cardnet.merchantType ?? ''} onChange={(e) => setCardnet({ ...cardnet, merchantType: e.target.value })} placeholder="7997" />
          </label>
          <label className="space-y-1.5">
            <span className={label}>Moneda</span>
            <select className={field} value={cardnet.currencyCode ?? '214'} onChange={(e) => setCardnet({ ...cardnet, currencyCode: e.target.value })}>
              <option value="214">214 — pesos dominicanos (RD$)</option>
              <option value="840">840 — dólares (US$)</option>
            </select>
          </label>
          <label className="space-y-1.5">
            <span className={label}>AcquiringInstitutionCode</span>
            <input className={field} inputMode="numeric" value={cardnet.acquiringInstitutionCode ?? ''} onChange={(e) => setCardnet({ ...cardnet, acquiringInstitutionCode: e.target.value })} placeholder="349" />
          </label>
          <label className="space-y-1.5">
            <span className={label}>Tasa: 1 US$ del catálogo = … en la moneda del comercio</span>
            <input className={field} inputMode="decimal" value={cardnet.rateText ?? ''} onChange={(e) => setCardnet({ ...cardnet, rateText: e.target.value })} placeholder="60.50" />
          </label>
          <label className="space-y-1.5">
            <span className={label}>ITBIS incluido en el precio (%)</span>
            <input className={field} inputMode="decimal" value={cardnet.itbisPercent ?? ''} onChange={(e) => setCardnet({ ...cardnet, itbisPercent: e.target.value })} placeholder="0 (exento) o 18" />
          </label>
          <label className="space-y-1.5 md:col-span-2">
            <span className={label}>Servidor de CardNet (opcional)</span>
            <input className={field} value={cardnet.apiBase ?? ''} onChange={(e) => setCardnet({ ...cardnet, apiBase: e.target.value })} placeholder="Automático: labservicios.cardnet.com.do (pruebas) · ecommerce.cardnet.com.do (producción)" />
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <Note>
            Para probar, usa el comercio de laboratorio de CardNet (MerchantNumber 349000000, terminal 58585858) con las
            tarjetas de prueba que entrega CardNet.
          </Note>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => save('cardnet')}
            disabled={saving !== ''}
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving === 'cardnet' ? 'Guardando…' : 'Guardar CardNet'}
          </button>
          {cardnetStatus?.configured && (
            <button
              onClick={() => save('cardnet', true)}
              disabled={saving !== ''}
              className="rounded-full border border-sunset-dark/40 px-5 py-2 text-sm font-semibold text-sunset-dark disabled:opacity-50"
            >
              Desconectar CardNet
            </button>
          )}
          {feedback('cardnet')}
        </div>
      </div>
    </div>
  );
};

export default DominicanGatewaysPanel;
