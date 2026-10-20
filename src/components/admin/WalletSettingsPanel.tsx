import React, { useCallback, useEffect, useState } from 'react';
import { FaApple, FaGoogle } from 'react-icons/fa';
import { getAdminPassword } from '../../services/authStore';
import { detectDeviceWallets } from '../../lib/wallets';
import type { WalletId } from '../../utils/paymentMethods';

interface WalletStatus {
  host: string;
  processor: string | null;
  wallets: WalletId[];
  stripe: {
    keyOnFile: boolean;
    mode: 'live' | 'test' | null;
    domain: { id: string; domain: string; enabled: boolean; applePay: string; googlePay: string } | null;
    error: string;
  };
  appleAssociation: { onFile: boolean; path: string };
  storageAvailable: boolean;
}

type Notice = { kind: 'ok' | 'error'; text: string } | null;

const PROCESSOR_NAMES: Record<string, string> = { stripe: 'Stripe', verifone: 'Verifone (2Checkout)', azul: 'AZUL', cardnet: 'CardNET' };

const call = async (method: string, body?: unknown) => {
  const response = await fetch('/api/wallet-config', {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Password': getAdminPassword() ?? '' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Error ${response.status}`);
  return data;
};

const Badge: React.FC<{ ok: boolean | null; children: React.ReactNode }> = ({ ok, children }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      ok === null ? 'bg-ink/10 text-ink-soft' : ok ? 'bg-jungle/15 text-jungle-dark' : 'bg-mango/20 text-ink'
    }`}
  >
    {children}
  </span>
);

/**
 * Admin → Pagos → Apple Pay y Google Pay.
 *
 * The two wallets are paid on the card processor's own payment page, so they
 * need no keys here. What this section shows and sets is everything else
 * they depend on: whether the active processor's page offers wallets at all,
 * whether this browser could use one (to test with), the site's domain as a
 * Stripe payment-method domain (registered from here, with one click), the
 * wallets switched on in the processor's dashboard, and Apple's domain
 * verification file for a processor that asks for it to be hosted here.
 * Whether each button shows to guests is the "Mostrar" switch in the list of
 * payment methods below.
 */
const WalletSettingsPanel: React.FC = () => {
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [device, setDevice] = useState<WalletId[]>([]);
  const [association, setAssociation] = useState('');
  const [busy, setBusy] = useState<'' | 'register' | 'file'>('');
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(() => {
    call('GET')
      .then(setStatus)
      .catch((error) => setNotice({ kind: 'error', text: error.message }));
  }, []);

  useEffect(() => {
    load();
    setDevice(detectDeviceWallets());
  }, [load]);

  const register = async () => {
    setBusy('register');
    setNotice(null);
    try {
      await call('POST', { action: 'register' });
      setNotice({ kind: 'ok', text: 'Dominio registrado en Stripe. Stripe lo verifica con Apple y Google en unos minutos.' });
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy('');
    }
  };

  const saveFile = async () => {
    setBusy('file');
    setNotice(null);
    try {
      const result = await call('PUT', { appleAssociation: association });
      setNotice({ kind: 'ok', text: result.appleAssociation ? 'Archivo de verificación de Apple guardado y publicado.' : 'Archivo de verificación quitado.' });
      setAssociation('');
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy('');
    }
  };

  const processor = status?.processor ?? null;
  const offered = (status?.wallets?.length ?? 0) > 0;
  const domain = status?.stripe.domain;
  const active = (value?: string) => value === 'active';

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-ink-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white"><FaApple /></span>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white"><FaGoogle /></span>
        <div>
          <h3 className="text-lg font-bold text-ink">Apple Pay y Google Pay</h3>
          <p className="text-xs text-ink-soft">
            Se pagan en la página de pago del procesador de tarjetas: no necesitan claves propias, pero sí lo que sigue.
          </p>
        </div>
      </div>

      {!status ? (
        <p className="mt-4 text-sm text-ink-soft">{notice?.text ?? 'Cargando…'}</p>
      ) : (
        <div className="mt-5 space-y-4 text-sm">
          {/* 1. A processor whose page offers wallets. */}
          <div className="rounded-2xl border border-ink/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">1 · Procesador de tarjetas activo</span>
              <Badge ok={processor ? offered : null}>
                {processor ? `${PROCESSOR_NAMES[processor] ?? processor} · ${offered ? 'ofrece Apple Pay y Google Pay' : 'solo tarjetas'}` : 'ninguno configurado'}
              </Badge>
            </div>
            {!offered && (
              <p className="mt-2 text-xs text-ink-soft">
                Las páginas de pago de AZUL y CardNET solo aceptan tarjetas. Para ofrecer Apple Pay y Google Pay, configura Stripe o
                Verifone y elígelo arriba en «Procesador de tarjetas» (o déjalo en «Automático»).
              </p>
            )}
          </div>

          {/* 2. Switched on in the processor's dashboard. */}
          <div className="rounded-2xl border border-ink/10 p-4">
            <span className="font-semibold text-ink">2 · Activar los monederos en el panel del procesador</span>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-soft">
              <li>
                Stripe: <a href="https://dashboard.stripe.com/settings/payment_methods" target="_blank" rel="noopener noreferrer" className="text-lagoon-dark underline">Settings → Payment methods</a>{' '}
                → activa <strong>Apple Pay</strong> y <strong>Google Pay</strong> (en modo {status.stripe.mode === 'test' ? 'prueba' : 'live'}).
              </li>
              <li>Verifone (2Checkout): en el panel del comerciante, <em>Setup → Ordering options / Payment methods</em> → activa Apple Pay y Google Pay.</li>
            </ul>
          </div>

          {/* 3. The domain, registered with Stripe. */}
          <div className="rounded-2xl border border-ink/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">3 · Dominio de pago en Stripe · {status.host}</span>
              {status.stripe.keyOnFile ? (
                <span className="flex flex-wrap gap-1.5">
                  <Badge ok={domain ? active(domain.applePay) : false}>Apple Pay: {domain ? domain.applePay : 'sin registrar'}</Badge>
                  <Badge ok={domain ? active(domain.googlePay) : false}>Google Pay: {domain ? domain.googlePay : 'sin registrar'}</Badge>
                </span>
              ) : (
                <Badge ok={null}>sin clave de Stripe</Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Stripe muestra los monederos en su página de pago, y registrar el dominio de la web es lo que deja que Apple y Google
              los acepten también en ella. Hazlo una vez por dominio (y otra si cambias a un dominio propio).
            </p>
            {status.stripe.error && <p className="mt-2 text-xs text-hibiscus-dark">{status.stripe.error}</p>}
            <button
              type="button"
              onClick={register}
              disabled={!status.stripe.keyOnFile || busy === 'register'}
              className="mt-3 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              {busy === 'register' ? 'Registrando…' : domain ? 'Volver a verificar en Stripe' : `Registrar ${status.host} en Stripe`}
            </button>
          </div>

          {/* 4. Apple's verification file, for a processor that asks for it. */}
          <div className="rounded-2xl border border-ink/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink">4 · Archivo de verificación de Apple Pay (opcional)</span>
              <Badge ok={status.appleAssociation.onFile ? true : null}>{status.appleAssociation.onFile ? 'publicado' : 'no hace falta con Stripe'}</Badge>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              Si tu procesador (o Apple) te pide alojar el archivo <code>apple-developer-merchantid-domain-association</code>, pega aquí
              su contenido: la web lo publica en{' '}
              {status.appleAssociation.onFile ? (
                <a href={status.appleAssociation.path} target="_blank" rel="noopener noreferrer" className="text-lagoon-dark underline">{status.appleAssociation.path}</a>
              ) : (
                <code>{status.appleAssociation.path}</code>
              )}
              .
            </p>
            <textarea
              value={association}
              onChange={(event) => setAssociation(event.target.value)}
              rows={3}
              placeholder={status.appleAssociation.onFile ? 'Pega un archivo nuevo para reemplazarlo, o deja vacío y guarda para quitarlo' : 'Contenido del archivo'}
              className="mt-3 w-full rounded-2xl border border-ink/15 px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              onClick={saveFile}
              disabled={busy === 'file' || !status.storageAvailable || (!association.trim() && !status.appleAssociation.onFile)}
              className="mt-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              {busy === 'file' ? 'Guardando…' : association.trim() ? 'Guardar archivo' : 'Quitar archivo'}
            </button>
          </div>

          {/* 5. This browser, for testing. */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper p-4">
            <span className="font-semibold text-ink">Este navegador puede pagar con</span>
            <span className="flex gap-1.5">
              <Badge ok={device.includes('apple_pay')}>Apple Pay {device.includes('apple_pay') ? 'sí' : 'no'}</Badge>
              <Badge ok={device.includes('google_pay')}>Google Pay {device.includes('google_pay') ? 'sí' : 'no'}</Badge>
            </span>
            <p className="w-full text-xs text-ink-light">
              A cada visitante solo se le ofrece el monedero que su dispositivo puede usar: Apple Pay en iPhone, iPad y Mac con Safari;
              Google Pay en Android y Chrome. Los botones se encienden o apagan con «Mostrar» en la lista de formas de pago.
            </p>
          </div>

          {notice && (
            <p className={`text-xs font-semibold ${notice.kind === 'ok' ? 'text-jungle-dark' : 'text-hibiscus-dark'}`}>{notice.text}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletSettingsPanel;
