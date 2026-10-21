import React, { useEffect, useState } from 'react';
import { FaCreditCard, FaCheck, FaLock, FaUniversity, FaFlask, FaLink, FaPaypal, FaUndo } from 'react-icons/fa';
import { BrandSettings, saveBrandSettings } from '../../services/brandService';
import WalletSettingsPanel from './WalletSettingsPanel';
import PaymentHelpTour, { HelpButton } from './PaymentHelpTour';
import { PAYMENT_HELP, HelpTopicId } from './paymentHelpTopics';
import {
  getPaymentConfigStatus,
  savePaymentConfig,
  PaymentConfigStatus,
  PaymentConfigPatch,
  GatewayMode,
  LocalCurrency,
  CardProcessor,
  CardProcessorChoice,
} from '../../services/paymentService';
import {
  getPaymentMethodStates,
  WALLETS_BY_PROCESSOR,
  withPaymentMethodEnabled,
  PaymentMethodId,
  PAYMENT_METHOD_IDS,
} from '../../utils/paymentMethods';

interface PaymentSettingsPanelProps {
  brandSettings: BrandSettings;
  setBrandSettings: (next: BrandSettings) => void;
}

const METHOD_LABELS: Record<PaymentMethodId, { name: string; requirement: string }> = {
  card: {
    name: 'Tarjeta de crédito / débito',
    requirement: 'Necesita "Aceptar tarjetas" y un procesador configurado (o un enlace de pago)',
  },
  applepay: {
    name: 'Apple Pay',
    requirement: 'Necesita tarjetas activas con Stripe o Verifone (su página de pago lo ofrece en iPhone, iPad y Mac)',
  },
  googlepay: {
    name: 'Google Pay',
    requirement: 'Necesita tarjetas activas con Stripe o Verifone (su página de pago lo ofrece en Android y Chrome)',
  },
  paypal: {
    name: 'PayPal',
    requirement: 'Necesita la app de PayPal (abajo) o un enlace de PayPal.Me',
  },
  mio: {
    name: 'MIO',
    requirement: 'Necesita las credenciales de API Checkout de MIO (abajo) o un link de pago Milin',
  },
  cash: {
    name: 'Concierge / efectivo por WhatsApp',
    requirement: 'Necesita un número de teléfono',
  },
};

const PROCESSOR_NAMES: Record<CardProcessor, string> = {
  stripe: 'Stripe',
  azul: 'AZUL · Banco Popular',
  cardnet: 'CardNET',
  verifone: 'Verifone · 2Checkout',
  mio: 'MIO · API Checkout',
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

type Notice = { kind: 'ok' | 'error'; text: string } | null;

/**
 * Payment settings.
 *
 * A guest pays BY CARD and never learns who processes it. Which processor that
 * is — Stripe, AZUL (Banco Popular) or CardNET — is decided here, and only
 * here: "Procesador de tarjetas" picks it, and each processor's credentials
 * sit underneath. "Automático" uses the first one that is fully configured.
 * With no processor configured, a payment link pasted from a processor's
 * portal still lets guests pay; put {amount} in it if the link accepts one.
 *
 * The secret keys are WRITE-ONLY here. This panel is told whether a key is on
 * file and whether it is live or test; it is never sent the key, and there is
 * no endpoint that would send it.
 *
 * Visibility is two switches deep on purpose. A method is only offered to
 * guests when it is configured AND left switched on, so turning something off
 * for a week does not mean deleting the credentials for it.
 */
const PaymentSettingsPanel: React.FC<PaymentSettingsPanelProps> = ({ brandSettings, setBrandSettings }) => {
  const [status, setStatus] = useState<PaymentConfigStatus | null>(null);
  const [secretDraft, setSecretDraft] = useState('');
  const [currencyDraft, setCurrencyDraft] = useState('');
  const [bank, setBank] = useState<BankDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [processorMessage, setProcessorMessage] = useState<Notice>(null);
  const [message, setMessage] = useState<Notice>(null);
  const [rateMessage, setRateMessage] = useState<Notice>(null);
  const [azulMessage, setAzulMessage] = useState<Notice>(null);
  const [cardnetMessage, setCardnetMessage] = useState<Notice>(null);
  const [brandMessage, setBrandMessage] = useState<Notice>(null);
  const [help, setHelp] = useState<HelpTopicId | null>(null);

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

  const processorReady: Record<CardProcessor, boolean> = {
    stripe: status?.stripeSecretConfigured ?? false,
    azul: status?.azul?.ready ?? false,
    cardnet: status?.cardnet?.ready ?? false,
    verifone: status?.verifone?.ready ?? false,
    mio: status?.mio?.ready ?? false,
  };
  const methods = getPaymentMethodStates(
    brandSettings,
    Boolean(status?.activeCardProcessor),
    WALLETS_BY_PROCESSOR[String(status?.activeCardProcessor ?? '')] ?? [],
    Boolean(status?.paypal?.ready),
    Boolean(status?.mio?.ready)
  );

  const run = async (setNotice: (notice: Notice) => void, work: () => Promise<string>) => {
    setSaving(true);
    setNotice(null);
    try {
      setNotice({ kind: 'ok', text: await work() });
    } catch (error: any) {
      setNotice({ kind: 'error', text: error?.message || 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const chooseProcessor = (choice: CardProcessorChoice) =>
    run(setProcessorMessage, async () => {
      const next = await savePaymentConfig({ cardProcessor: choice });
      setStatus(next);
      return next.activeCardProcessor
        ? `Las tarjetas se cobran con ${PROCESSOR_NAMES[next.activeCardProcessor]}.`
        : 'Guardado. Configura el procesador para empezar a cobrar.';
    });

  const handleSaveStripe = () =>
    run(setMessage, async () => {
      const patch: PaymentConfigPatch = {};
      // Omitted rather than sent empty, so saving a currency does not wipe a
      // key the operator was never shown.
      if (secretDraft.trim()) patch.stripeSecretKey = secretDraft.trim();
      if (currencyDraft.trim()) patch.stripeCurrency = currencyDraft.trim();
      const next = await savePaymentConfig(patch);
      setStatus(next);
      setSecretDraft('');
      return 'Configuración de Stripe guardada.';
    });

  const handleClearStripe = () =>
    run(setMessage, async () => {
      const next = await savePaymentConfig({ stripeSecretKey: '' });
      setStatus(next);
      setSecretDraft('');
      return 'Clave de Stripe eliminada.';
    });

  const updateBank = (patch: Partial<BankDraft>) =>
    setBank((current) => (current ? { ...current, ...patch } : current));

  // AZUL, CardNET and the rate share one draft, so each section's button
  // saves all of it and reports in its own section.
  const handleSaveBanks = (setNotice: (notice: Notice) => void, extra: PaymentConfigPatch = {}) =>
    run(setNotice, async () => {
      if (!bank) return '';
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
      if (bank.azulAuthKey.trim() && extra.azulAuthKey === undefined) patch.azulAuthKey = bank.azulAuthKey.trim();
      const next = await savePaymentConfig(patch);
      setStatus(next);
      setBank(draftFrom(next));
      return 'Guardado.';
    });

  // ── Verifone (2Checkout) ──────────────────────────────────────────────
  const [verifoneCode, setVerifoneCode] = useState('');
  const [verifoneSecret, setVerifoneSecret] = useState('');
  const [verifoneMode, setVerifoneMode] = useState<GatewayMode>('test');
  const [verifoneCurrency, setVerifoneCurrency] = useState<LocalCurrency>('USD');
  const [verifoneMessage, setVerifoneMessage] = useState<Notice>(null);
  useEffect(() => {
    if (!status?.verifone) return;
    setVerifoneCode(status.verifone.merchantCode);
    setVerifoneMode(status.verifone.mode);
    setVerifoneCurrency(status.verifone.currency);
  }, [status?.verifone?.merchantCode, status?.verifone?.mode, status?.verifone?.currency]);

  const handleSaveVerifone = (clearSecret = false) =>
    run(setVerifoneMessage, async () => {
      const patch: PaymentConfigPatch = {
        verifoneMerchantCode: verifoneCode.trim(),
        verifoneMode,
        verifoneCurrency,
      };
      // Write-only, like the Stripe key: only sent when something was typed.
      if (clearSecret) patch.verifoneSecretWord = '';
      else if (verifoneSecret.trim()) patch.verifoneSecretWord = verifoneSecret.trim();
      const next = await savePaymentConfig(patch);
      setStatus(next);
      setVerifoneSecret('');
      return clearSecret ? 'Palabra secreta de Verifone eliminada.' : 'Datos de Verifone guardados.';
    });

  // ── PayPal (Orders API) ───────────────────────────────────────────────
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalSecret, setPaypalSecret] = useState('');
  const [paypalMode, setPaypalMode] = useState<GatewayMode>('test');
  const [paypalMessage, setPaypalMessage] = useState<Notice>(null);
  useEffect(() => {
    if (!status?.paypal) return;
    setPaypalClientId(status.paypal.clientId);
    setPaypalMode(status.paypal.mode);
  }, [status?.paypal?.clientId, status?.paypal?.mode]);

  const handleSavePayPal = (clearSecret = false) =>
    run(setPaypalMessage, async () => {
      const patch: PaymentConfigPatch = { paypalClientId: paypalClientId.trim(), paypalMode };
      // Write-only, like the Stripe key: only sent when something was typed.
      if (clearSecret) patch.paypalSecret = '';
      else if (paypalSecret.trim()) patch.paypalSecret = paypalSecret.trim();
      const next = await savePaymentConfig(patch);
      setStatus(next);
      setPaypalSecret('');
      return clearSecret ? 'Secret de PayPal eliminado.' : 'Datos de PayPal guardados.';
    });

  // ── MIO (API Checkout) ────────────────────────────────────────────────
  const [mioClientId, setMioClientId] = useState('');
  const [mioClientSecret, setMioClientSecret] = useState('');
  const [mioMerchantId, setMioMerchantId] = useState('');
  const [mioAuthUrl, setMioAuthUrl] = useState('');
  const [mioApiBase, setMioApiBase] = useState('');
  const [mioCurrency, setMioCurrency] = useState<LocalCurrency>('DOP');
  const [mioMode, setMioMode] = useState<GatewayMode>('test');
  const [mioMessage, setMioMessage] = useState<Notice>(null);
  useEffect(() => {
    if (!status?.mio) return;
    setMioClientId(status.mio.clientId);
    setMioMerchantId(status.mio.merchantId);
    setMioAuthUrl(status.mio.authUrl);
    setMioApiBase(status.mio.apiBase);
    setMioCurrency(status.mio.currency);
    setMioMode(status.mio.mode);
  }, [status?.mio?.clientId, status?.mio?.merchantId, status?.mio?.authUrl, status?.mio?.apiBase, status?.mio?.currency, status?.mio?.mode]);

  const handleSaveMio = (clearSecret = false) =>
    run(setMioMessage, async () => {
      if (mioAuthUrl.trim() && !/^https:\/\//.test(mioAuthUrl.trim())) throw new Error('La dirección del token debe empezar por https://');
      if (mioApiBase.trim() && !/^https:\/\//.test(mioApiBase.trim())) throw new Error('La dirección de la API debe empezar por https://');
      const patch: PaymentConfigPatch = {
        mioClientId: mioClientId.trim(),
        mioMerchantId: mioMerchantId.trim(),
        mioAuthUrl: mioAuthUrl.trim(),
        mioApiBase: mioApiBase.trim(),
        mioCurrency,
        mioMode,
      };
      // Write-only: only sent when something was typed.
      if (clearSecret) patch.mioClientSecret = '';
      else if (mioClientSecret.trim()) patch.mioClientSecret = mioClientSecret.trim();
      const next = await savePaymentConfig(patch);
      setStatus(next);
      setMioClientSecret('');
      return clearSecret ? 'Client secret de MIO eliminado.' : 'Datos de MIO guardados.';
    });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleSaveBrand = () =>
    run(setBrandMessage, async () => {
      if (!(await saveBrandSettings(brandSettings))) {
        throw new Error('No se pudo guardar. ¿Sigue abierta tu sesión de administrador?');
      }
      return 'Guardado.';
    });

  const field =
    'w-full rounded-2xl border border-ink/15 bg-paper px-4 py-3 text-ink outline-none transition focus:border-lagoon-dark';
  const label = 'space-y-2';
  const labelText = 'text-sm font-semibold text-ink-soft';

  const NoticeLine = ({ value }: { value: Notice }) =>
    value ? (
      <span className={`text-sm ${value.kind === 'ok' ? 'text-lagoon-dark' : 'text-sunset-dark'}`}>{value.text}</span>
    ) : null;

  const ReadyChip = ({ ready, mode }: { ready: boolean; mode?: GatewayMode | 'live' | 'test' | null }) =>
    ready ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lagoon-dark/10 px-3 py-1 text-xs font-semibold text-lagoon-dark">
        <FaCheck /> lista
        {mode && <em className="not-italic opacity-70">({mode === 'live' ? 'modo real' : 'modo de prueba'})</em>}
      </span>
    ) : (
      <span className="rounded-full bg-sunset-dark/10 px-3 py-1 text-xs font-semibold text-sunset-dark">sin configurar</span>
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

  const choice = status?.cardProcessor ?? 'auto';

  return (
    <div className="mt-6 rounded-3xl border border-ink/10 p-5">
      {help && <PaymentHelpTour key={help} topic={PAYMENT_HELP[help]} onClose={() => setHelp(null)} />}
      <div className="mb-1 flex items-center gap-2">
        <FaCreditCard className="text-lagoon-dark" />
        <h3 className="text-lg font-semibold text-ink">Pagos</h3>
      </div>
      <p className="mb-5 max-w-2xl text-sm text-ink-soft">
        El visitante ve «Tarjeta», PayPal o el concierge — nunca qué procesador cobra la tarjeta.
        Eso se decide aquí. Una forma de pago solo aparece cuando está configurada <em>y</em> encendida.
      </p>

      {/* ── Card processor ─────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-ink">Procesador de tarjetas</h4>
            <p className="text-xs text-ink-soft">
              Quién cobra cuando un visitante paga con tarjeta. La tarjeta se pone siempre en la página
              segura del procesador, nunca en este sitio.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-5 w-5 accent-lagoon-dark"
              checked={brandSettings.stripeEnabled ?? false}
              onChange={(event) => setBrandSettings({ ...brandSettings, stripeEnabled: event.target.checked })}
            />
            <span className="text-sm font-semibold text-ink">Aceptar tarjetas</span>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Procesador de tarjetas">
          {(['auto', 'stripe', 'azul', 'cardnet', 'verifone', 'mio'] as CardProcessorChoice[]).map((option) => {
            const active = choice === option;
            const ready = option === 'auto' ? Boolean(status?.activeCardProcessor) : processorReady[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={saving || !status}
                onClick={() => chooseProcessor(option)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  active ? 'border-lagoon-dark bg-lagoon/10' : 'border-ink/15 bg-paper hover:border-lagoon'
                }`}
              >
                <div className="text-sm font-semibold text-ink">
                  {option === 'auto' ? 'Automático' : PROCESSOR_NAMES[option]}
                </div>
                <div className="mt-1 text-xs text-ink-light">
                  {option === 'auto'
                    ? status?.activeCardProcessor
                      ? `ahora: ${PROCESSOR_NAMES[status.activeCardProcessor]}`
                      : 'el primero que esté configurado'
                    : ready
                    ? 'configurado'
                    : 'sin configurar'}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-light">
          {status?.activeCardProcessor ? (
            <>
              Ahora mismo las tarjetas se cobran con <strong>{PROCESSOR_NAMES[status.activeCardProcessor]}</strong>.
              {choice !== 'auto' && status.activeCardProcessor !== choice &&
                ` ${PROCESSOR_NAMES[choice as CardProcessor]} aún no está configurado, así que se usa el siguiente disponible.`}
            </>
          ) : (
            'Ningún procesador está configurado todavía. Rellena uno abajo, o pega un enlace de pago.'
          )}
        </p>
        <div className="mt-2"><NoticeLine value={processorMessage} /></div>
      </div>

      {/* ── Stripe ─────────────────────────────────────────────────────── */}
      <div className="mt-5 rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-semibold text-ink">Stripe</h4>
          <div className="flex flex-wrap items-center gap-2">
            <HelpButton onClick={() => setHelp('stripe')} />
            <ReadyChip ready={processorReady.stripe} mode={status?.stripeMode} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <label data-help="stripe.secret" className={label}>
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
          <label data-help="stripe.currency" className={label}>
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
            La clave se guarda solo en el servidor y nunca se envía al navegador — ni siquiera a este
            panel. Por eso no puedes verla aquí después de guardarla, solo reemplazarla.
          </span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button data-help="stripe.save"
            onClick={handleSaveStripe}
            disabled={saving || (!secretDraft.trim() && !currencyDraft.trim())}
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {status?.stripeSecretConfigured && (
            <button
              onClick={() => window.confirm('¿Borrar esta clave? El método de pago dejará de funcionar hasta que guardes otra.') && handleClearStripe()}
              disabled={saving}
              className="rounded-full border border-sunset-dark/40 px-5 py-2 text-sm font-semibold text-sunset-dark disabled:opacity-50"
            >
              Borrar la clave
            </button>
          )}
          <NoticeLine value={message} />
        </div>

        {status && !status.storageAvailable && (
          <p className="mt-3 rounded-2xl bg-sunset-dark/10 p-3 text-xs text-sunset-dark">
            Esta instalación no tiene KV conectado, así que no se puede guardar nada aquí.
          </p>
        )}
      </div>

      {/* ── Exchange rate and ITBIS: AZUL, CardNET and MIO in pesos ──────── */}
      {bank && status && (
        <div className="mt-5 rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
          <h4 className="font-semibold text-ink">Tasa de cambio e ITBIS</h4>
          <p className="mb-4 max-w-2xl text-xs text-ink-soft">
            Común a AZUL, CardNET y MIO. Con los datos de afiliado, cada reserva viaja con su importe
            exacto a la página de pago del banco — también los traslados, cuyo precio sale del mapa — y el
            resultado se comprueba con el banco antes de avisarte por WhatsApp.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <label data-help="banks.rate" className={label}>
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
                Los precios del catálogo están en dólares. Un banco que cobra en pesos los convierte con
                esta tasa; sin tasa, ese banco no cobra.
              </span>
            </label>
            <label data-help="banks.itbis" className={label}>
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button data-help="banks.save"
              onClick={() => handleSaveBanks(setRateMessage)}
              disabled={saving}
              className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar tasa e ITBIS'}
            </button>
            <NoticeLine value={rateMessage} />
          </div>
        </div>
      )}

      {/* ── AZUL ─────────────────────────────────────────────────────────── */}
      {bank && status && (
        <div className="mt-5 rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 font-semibold text-ink">
              <FaUniversity className="text-lagoon-dark" /> AZUL · Página de Pagos
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <HelpButton onClick={() => setHelp('azul')} />
              <ReadyChip ready={status.azul.ready} mode={status.azul.mode} />
              <ModeSwitch value={bank.azulMode} onChange={(azulMode) => updateBank({ azulMode })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label data-help="azul.merchantId" className={label}>
              <span className={labelText}>Merchant ID</span>
              <input className={field} value={bank.azulMerchantId} onChange={(e) => updateBank({ azulMerchantId: e.target.value })} placeholder="39038540035" />
            </label>
            <label data-help="azul.merchantName" className={label}>
              <span className={labelText}>Nombre del comercio</span>
              <input className={field} value={bank.azulMerchantName} onChange={(e) => updateBank({ azulMerchantName: e.target.value })} placeholder="Como lo registró AZUL" />
            </label>
            <label data-help="azul.merchantType" className={label}>
              <span className={labelText}>Tipo de comercio</span>
              <input className={field} value={bank.azulMerchantType} onChange={(e) => updateBank({ azulMerchantType: e.target.value })} placeholder="ECommerce" />
            </label>
            <label data-help="azul.currencyCode" className={label}>
              <span className={labelText}>Código de moneda de AZUL</span>
              <input className={field} value={bank.azulCurrencyCode} onChange={(e) => updateBank({ azulCurrencyCode: e.target.value })} placeholder="$" />
            </label>
            <label data-help="azul.currency" className={label}>
              <span className={labelText}>Cobra en</span>
              <CurrencySwitch value={bank.azulCurrency} onChange={(azulCurrency) => updateBank({ azulCurrency })} />
            </label>
            <label data-help="azul.authKey" className={label}>
              <span className={labelText}>
                AuthKey{' '}
                {status.azul.authKeyConfigured && (
                  <span className="text-lagoon-dark">(guardada — escribe solo para reemplazarla)</span>
                )}
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
              distintos para pruebas y para producción. La AuthKey firma cada pago y se queda en el
              servidor.
            </span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button data-help="azul.save"
              onClick={() => handleSaveBanks(setAzulMessage)}
              disabled={saving}
              className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar AZUL'}
            </button>
            {status.azul.authKeyConfigured && (
              <button
                onClick={() => window.confirm('¿Borrar esta clave? El método de pago dejará de funcionar hasta que guardes otra.') && handleSaveBanks(setAzulMessage, { azulAuthKey: '' })}
                disabled={saving}
                className="rounded-full border border-sunset-dark/40 px-5 py-2 text-sm font-semibold text-sunset-dark disabled:opacity-50"
              >
                Borrar la AuthKey de AZUL
              </button>
            )}
            <NoticeLine value={azulMessage} />
          </div>
        </div>
      )}

      {/* ── CardNET ──────────────────────────────────────────────────────── */}
      {bank && status && (
        <div className="mt-5 rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 font-semibold text-ink">
              <FaUniversity className="text-lagoon-dark" /> CardNET · Botón de Pago
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <HelpButton onClick={() => setHelp('cardnet')} />
              <ReadyChip ready={status.cardnet.ready} mode={status.cardnet.mode} />
              <ModeSwitch value={bank.cardnetMode} onChange={(cardnetMode) => updateBank({ cardnetMode })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label data-help="cardnet.merchantNumber" className={label}>
              <span className={labelText}>Número de afiliado</span>
              <input className={field} value={bank.cardnetMerchantNumber} onChange={(e) => updateBank({ cardnetMerchantNumber: e.target.value })} placeholder="349…" />
            </label>
            <label data-help="cardnet.terminal" className={label}>
              <span className={labelText}>Terminal</span>
              <input className={field} value={bank.cardnetTerminal} onChange={(e) => updateBank({ cardnetTerminal: e.target.value })} placeholder="8 dígitos" />
            </label>
            <label data-help="cardnet.mcc" className={label}>
              <span className={labelText}>Categoría (MCC)</span>
              <input className={field} value={bank.cardnetMerchantType} maxLength={4} onChange={(e) => updateBank({ cardnetMerchantType: e.target.value.replace(/\D/g, '') })} placeholder="4722" />
            </label>
            <label data-help="cardnet.currency" className={label}>
              <span className={labelText}>Cobra en</span>
              <CurrencySwitch value={bank.cardnetCurrency} onChange={(cardnetCurrency) => updateBank({ cardnetCurrency })} />
            </label>
            <label data-help="cardnet.merchantName" className={`${label} sm:col-span-2`}>
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button data-help="cardnet.save"
              onClick={() => handleSaveBanks(setCardnetMessage)}
              disabled={saving}
              className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar CardNET'}
            </button>
            <NoticeLine value={cardnetMessage} />
          </div>
        </div>
      )}

      {/* ── Verifone (2Checkout) ───────────────────────────────────────── */}
      <div className="mt-5 rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-ink">
              <FaCreditCard className="text-sky-dark" /> Verifone · 2Checkout
            </h4>
            <p className="max-w-2xl text-xs text-ink-soft">
              El cobro en línea de Verifone es 2Checkout. Cada reserva genera aquí mismo un enlace de pago
              dinámico, firmado con tu palabra secreta, con el importe exacto: sin llamadas a ningún
              servidor y sin que el visitante tenga que iniciar sesión. El dinero llega a tu cuenta de 2Checkout.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <HelpButton onClick={() => setHelp('verifone')} />
            <ReadyChip ready={processorReady.verifone} mode={status?.verifone?.mode} />
            <ModeSwitch value={verifoneMode} onChange={setVerifoneMode} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label data-help="verifone.code" className={label}>
            <span className={labelText}>Código de comerciante (Merchant Code)</span>
            <input
              className={field}
              value={verifoneCode}
              onChange={(e) => setVerifoneCode(e.target.value)}
              placeholder="250123456789"
              autoComplete="off"
            />
          </label>
          <label data-help="verifone.secret" className={label}>
            <span className={labelText}>
              Buy-Link Secret Word {status?.verifone?.secretWordConfigured && '(guardada)'}
            </span>
            <input
              type="password"
              className={field}
              value={verifoneSecret}
              onChange={(e) => setVerifoneSecret(e.target.value)}
              placeholder={status?.verifone?.secretWordConfigured ? 'Dejar vacío para conservar' : 'Palabra secreta'}
              autoComplete="off"
            />
          </label>
          <label data-help="verifone.currency" className={label}>
            <span className={labelText}>Moneda del cobro</span>
            <CurrencySwitch value={verifoneCurrency} onChange={setVerifoneCurrency} />
          </label>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs text-ink-light">
          <FaLock className="mt-0.5 shrink-0" />
          <span>
            Ambos datos están en el panel de 2Checkout, en <em>Integrations → Webhooks &amp; API</em>. La palabra
            secreta se guarda solo en el servidor y nunca vuelve al navegador. En modo de pruebas los pedidos se
            marcan como prueba (<code>test=1</code>). Activa en 2Checkout los productos dinámicos (“dynamic
            products”) si tu cuenta no los tiene ya.
          </span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button data-help="verifone.save"
            onClick={() => handleSaveVerifone()}
            disabled={saving}
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar Verifone'}
          </button>
          {status?.verifone?.secretWordConfigured && (
            <button
              onClick={() => window.confirm('¿Borrar esta clave? El método de pago dejará de funcionar hasta que guardes otra.') && handleSaveVerifone(true)}
              disabled={saving}
              className="rounded-full border border-sunset-dark/40 px-5 py-2 text-sm font-semibold text-sunset-dark disabled:opacity-50"
            >
              Borrar la palabra secreta
            </button>
          )}
          <NoticeLine value={verifoneMessage} />
        </div>
      </div>

      {/* ── PayPal (Orders API) ────────────────────────────────────────── */}
      <div className="mt-5 rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-ink">
              <FaPaypal className="text-sky-dark" /> PayPal · cobro con respuesta
            </h4>
            <p className="max-w-2xl text-xs text-ink-soft">
              Con una app de PayPal, cada reserva abre un pedido de PayPal por el importe exacto; PayPal devuelve
              al visitante a este sitio y el cobro se confirma aquí mismo — pagado, rechazado o cancelado — sin
              tener que preguntarle si funcionó. Sin la app se sigue usando el enlace de PayPal.Me, que no
              devuelve ninguna respuesta. PayPal cobra siempre en dólares.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <HelpButton onClick={() => setHelp('paypal')} />
            <ReadyChip ready={Boolean(status?.paypal?.ready)} mode={status?.paypal?.mode} />
            <ModeSwitch value={paypalMode} onChange={setPaypalMode} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label data-help="paypal.clientId" className={label}>
            <span className={labelText}>Client ID</span>
            <input className={field} value={paypalClientId} onChange={(e) => setPaypalClientId(e.target.value)} placeholder="AX…" autoComplete="off" />
          </label>
          <label data-help="paypal.secret" className={label}>
            <span className={labelText}>Secret {status?.paypal?.secretConfigured && '(guardado)'}</span>
            <input
              type="password"
              className={field}
              value={paypalSecret}
              onChange={(e) => setPaypalSecret(e.target.value)}
              placeholder={status?.paypal?.secretConfigured ? 'Dejar vacío para conservar' : 'Secret de la app'}
              autoComplete="off"
            />
          </label>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs text-ink-light">
          <FaLock className="mt-0.5 shrink-0" />
          <span>
            En <em>developer.paypal.com → Apps &amp; Credentials</em> crea una app (en <em>Sandbox</em> para pruebas,
            en <em>Live</em> para cobrar) y copia su Client ID y su Secret. El Secret se queda en el servidor. La
            cuenta de PayPal debe ser de empresa (Business).
          </span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button data-help="paypal.save"
            onClick={() => handleSavePayPal()}
            disabled={saving}
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar PayPal'}
          </button>
          {status?.paypal?.secretConfigured && (
            <button
              onClick={() => window.confirm('¿Borrar el Secret? PayPal volverá al enlace de PayPal.Me hasta que guardes otro.') && handleSavePayPal(true)}
              disabled={saving}
              className="rounded-full border border-sunset-dark/40 px-5 py-2 text-sm font-semibold text-sunset-dark disabled:opacity-50"
            >
              Borrar el Secret
            </button>
          )}
          <NoticeLine value={paypalMessage} />
        </div>
      </div>

      {/* ── MIO (API Checkout) ─────────────────────────────────────────── */}
      <div className="mt-5 rounded-3xl border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 font-semibold text-ink">
              <span className="rounded bg-hibiscus px-1.5 py-0.5 text-[0.65rem] font-black text-white">MIO</span> MIO · cobro con respuesta
            </h4>
            <p className="max-w-2xl text-xs text-ink-soft">
              Con la «API Checkout» de MIO, cada reserva crea un link de pago MIO de un solo uso por el importe
              exacto; el visitante paga en la página de MIO (Visa, Mastercard o su cuenta MIO), vuelve a este
              sitio y el cobro se confirma aquí preguntándole a MIO. Sin estas credenciales se usa el link de pago
              Milin de más abajo, que no devuelve respuesta. En pesos, necesita la tasa de cambio de arriba.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <HelpButton onClick={() => setHelp('mio')} />
            <ReadyChip ready={Boolean(status?.mio?.ready)} mode={status?.mio?.mode} />
            <ModeSwitch value={mioMode} onChange={setMioMode} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label data-help="mio.clientId" className={label}>
            <span className={labelText}>Client ID</span>
            <input className={field} value={mioClientId} onChange={(e) => setMioClientId(e.target.value)} autoComplete="off" />
          </label>
          <label data-help="mio.secret" className={label}>
            <span className={labelText}>Client secret {status?.mio?.secretConfigured && '(guardado)'}</span>
            <input
              type="password"
              className={field}
              value={mioClientSecret}
              onChange={(e) => setMioClientSecret(e.target.value)}
              placeholder={status?.mio?.secretConfigured ? 'Dejar vacío para conservar' : 'Client secret'}
              autoComplete="off"
            />
          </label>
          <label data-help="mio.merchantId" className={label}>
            <span className={labelText}>Número de comercio (merchant ID)</span>
            <input className={field} value={mioMerchantId} onChange={(e) => setMioMerchantId(e.target.value)} inputMode="numeric" placeholder="77000001" />
          </label>
          <label data-help="mio.currency" className={label}>
            <span className={labelText}>Moneda del cobro</span>
            <select className={field} value={mioCurrency} onChange={(e) => setMioCurrency(e.target.value as LocalCurrency)}>
              <option value="DOP">Pesos dominicanos (DOP)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </label>
          <label data-help="mio.authUrl" className={`${label} md:col-span-2`}>
            <span className={labelText}>Dirección del token (te la da MIO)</span>
            <input className={field} value={mioAuthUrl} onChange={(e) => setMioAuthUrl(e.target.value)} placeholder="https://…/oauth/token" autoComplete="off" />
          </label>
          <label data-help="mio.apiBase" className={`${label} md:col-span-2`}>
            <span className={labelText}>Dirección de la API (opcional)</span>
            <input
              className={field}
              value={mioApiBase}
              onChange={(e) => setMioApiBase(e.target.value)}
              placeholder={mioMode === 'live' ? 'https://api.geopagos.io' : 'https://api-stable.stg.geopagos.io'}
              autoComplete="off"
            />
          </label>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs text-ink-light">
          <FaLock className="mt-0.5 shrink-0" />
          <span>
            MIO funciona sobre la plataforma Geopagos. Las credenciales (client ID, client secret, número de comercio
            y dirección del token) te las entrega tu asesor de negocios de MIO al activar «API Checkout». Deja la
            dirección de la API vacía salvo que MIO te indique otra. El client secret se queda en el servidor.
          </span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button data-help="mio.save"
            onClick={() => handleSaveMio()}
            disabled={saving}
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar MIO'}
          </button>
          {status?.mio?.secretConfigured && (
            <button
              onClick={() => window.confirm('¿Borrar el client secret? MIO volverá al link Milin hasta que guardes otro.') && handleSaveMio(true)}
              disabled={saving}
              className="rounded-full border border-sunset-dark/40 px-5 py-2 text-sm font-semibold text-sunset-dark disabled:opacity-50"
            >
              Borrar el client secret
            </button>
          )}
          <NoticeLine value={mioMessage} />
        </div>
      </div>

      {/* ── Where each processor sends the guest back ───────────────────── */}
      <div className="mt-5 rounded-3xl border border-ink/10 p-5">
        <h4 className="flex items-center gap-2 font-semibold text-ink">
          <FaUndo className="text-lagoon-dark" /> Regreso al sitio después de pagar
        </h4>
        <p className="mt-1 max-w-2xl text-xs text-ink-soft">
          Cada procesador devuelve al visitante a una de estas direcciones; el sitio comprueba allí el resultado
          con el procesador y le muestra un mensaje según el código — pagado, rechazado (fondos, límite, tarjeta
          vencida, datos, verificación del banco), cancelado o error — con qué hacer después: reintentar, otra
          forma de pago, WhatsApp o el carrito. Se envían solas con cada pago; si un banco te pide registrarlas,
          son estas (<code>{'{pedido}'}</code> es el número de cada pago):
        </p>
        <ul className="mt-3 space-y-1 break-all font-mono text-[0.7rem] text-ink-soft">
          <li>AZUL: {origin}/api/pay-return/azul/{'{pedido}'}/approved · /declined · /cancelled</li>
          <li>CardNET: {origin}/api/pay-return/cardnet/{'{pedido}'}/approved · /cancelled</li>
          <li>Verifone: {origin}/api/pay-return/verifone/{'{pedido}'}/approved</li>
          <li>Stripe: {origin}/api/pay-return/stripe/{'{pedido}'}/approved · /cancelled</li>
          <li>PayPal: {origin}/api/pay-return/paypal/{'{pedido}'}/approved · /cancelled</li>
          <li>MIO: {origin}/api/pay-return/mio/{'{pedido}'}/approved · /declined · aviso: {origin}/api/mio-webhook</li>
        </ul>
      </div>

      {/* ── Payment links, visibility ──────────────────────────────────── */}
      <div className="mt-5 rounded-3xl border border-ink/10 p-5">
        <div className="mb-1 flex items-center gap-2">
          <FaLink className="text-lagoon-dark" />
          <h4 className="font-semibold text-ink">Enlaces de pago (sin credenciales)</h4>
        </div>
        <p className="mb-4 max-w-2xl text-xs text-ink-soft">
          Si aún no tienes un procesador configurado, pega aquí un enlace de pago de su portal. El
          visitante lo verá simplemente como «pagar con tarjeta». Escribe {'{amount}'} donde el enlace
          acepte el importe; si no lo acepta, se le muestra el importe a poner.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={label}>
            <span className={labelText}>Link de Pagos AZUL</span>
            <input className={field} value={brandSettings.azulLink ?? ''} onChange={(e) => setBrandSettings({ ...brandSettings, azulLink: e.target.value })} placeholder="https://…" />
          </label>
          <label className={label}>
            <span className={labelText}>Enlace de Pago CardNET</span>
            <input className={field} value={brandSettings.cardnetLink ?? ''} onChange={(e) => setBrandSettings({ ...brandSettings, cardnetLink: e.target.value })} placeholder="https://…" />
          </label>
          <label className={label}>
            <span className={labelText}>Verifone u otro (2Checkout, Stripe Payment Link…)</span>
            <input className={field} value={brandSettings.verifoneLink ?? ''} onChange={(e) => setBrandSettings({ ...brandSettings, verifoneLink: e.target.value })} placeholder="https://…" />
          </label>
          <label className={label}>
            <span className={labelText}>Link de pago MIO (Milin) — aparece como «MIO»</span>
            <input className={field} value={brandSettings.mioLink ?? ''} onChange={(e) => setBrandSettings({ ...brandSettings, mioLink: e.target.value })} placeholder="https://…" />
          </label>
        </div>

        {/* Apple Pay & Google Pay: what they need beyond the card processor. */}
        <div className="mt-6">
          <WalletSettingsPanel />
        </div>

        <h4 className="mb-4 mt-6 font-semibold text-ink">Qué ve el visitante</h4>
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
                      <>
                        {METHOD_LABELS[method].requirement}
                        {state.enabled && <span className="text-mango-dark"> · se mostrará en cuanto esté configurada</span>}
                      </>
                    )}
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-lagoon-dark"
                    checked={state.enabled}
                    onChange={(event) => setBrandSettings(withPaymentMethodEnabled(brandSettings, method, event.target.checked))}
                  />
                  <span className="text-xs font-semibold text-ink-soft">Mostrar</span>
                </label>
              </div>
            );
          })}
        </div>

        {!Object.values(methods).some((state) => state.visible) && (
          <p className="mt-4 rounded-2xl bg-mango/15 p-3 text-xs text-ink-soft">
            Ahora mismo no hay ninguna forma de pago visible. El botón de reservar y pagar abrirá
            WhatsApp directamente.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSaveBrand}
            disabled={saving}
            className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar enlaces, «Aceptar tarjetas» y visibilidad'}
          </button>
          <NoticeLine value={brandMessage} />
        </div>
      </div>
    </div>
  );
};

export default PaymentSettingsPanel;
