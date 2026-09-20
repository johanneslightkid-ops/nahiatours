import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaWhatsapp, FaTimes } from 'react-icons/fa';
import { useBrand } from '../contexts/BrandContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { getCheckoutResult, CheckoutResult } from '../services/paymentService';

/**
 * Where the guest lands after paying.
 *
 * Stripe sends them back to `?paid=1&session_id=cs_…`. That query string is a
 * claim anyone could type, so nothing is announced until the server has asked
 * Stripe what really happened; the amount in the message below is the amount
 * Stripe charged, not the amount this page was holding when it left.
 *
 * THE WHATSAPP MESSAGE IS A NAVIGATION, NOT A POPUP. Coming back from Stripe
 * is not a user gesture, so `window.open` here is blocked by every browser
 * worth naming. Changing `location.href` is not. The panel therefore shows the
 * receipt, counts down, and then navigates the tab to wa.me — with a button to
 * go immediately and a link to skip, because a countdown nobody can stop is a
 * hijack.
 *
 * Fired once per session id: the id is marked in sessionStorage before the
 * navigation, so a back button or a refresh re-shows the receipt without
 * telling the operator twice.
 */

const NOTIFIED_PREFIX = 'amigo:paid-notified:';
const COUNTDOWN_SECONDS = 5;

const wasNotified = (sessionId: string): boolean => {
  try {
    return sessionStorage.getItem(NOTIFIED_PREFIX + sessionId) === '1';
  } catch {
    return false;
  }
};

const markNotified = (sessionId: string) => {
  try {
    sessionStorage.setItem(NOTIFIED_PREFIX + sessionId, '1');
  } catch {
    /* private mode — worst case the operator gets told twice */
  }
};

const money = (amount: number | null, currency: string | null) =>
  amount === null ? '' : `${currency ?? 'USD'} $${amount.toFixed(2)}`;

const PaymentReturn: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { brandSettings } = useBrand();

  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [state, setState] = useState<'idle' | 'checking' | 'done' | 'failed' | 'cancelled'>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState('');

  const params = new URLSearchParams(location.search);
  const paidFlag = params.get('paid');
  const incomingSession = params.get('session_id') ?? '';

  /** Strip the payment params so a refresh does not replay any of this. */
  const clearQuery = useCallback(() => {
    const next = new URLSearchParams(location.search);
    next.delete('paid');
    next.delete('session_id');
    const search = next.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (paidFlag === '0') {
      setState('cancelled');
      return;
    }
    if (paidFlag !== '1' || !incomingSession) return;

    let current = true;
    setState('checking');
    setSessionId(incomingSession);

    getCheckoutResult(incomingSession)
      .then((payment) => {
        if (!current) return;
        setResult(payment);
        setState(payment.paid ? 'done' : 'failed');
        if (payment.paid && !wasNotified(incomingSession)) {
          setCountdown(COUNTDOWN_SECONDS);
        }
      })
      .catch(() => {
        if (current) setState('failed');
      });

    return () => {
      current = false;
    };
  }, [paidFlag, incomingSession]);

  const operatorMessage = useCallback(() => {
    if (!result) return '';
    const total = money(result.amountTotal, result.currency);
    const people = result.persons
      ? `${result.persons} ${result.persons === 1 ? 'persona / person' : 'personas / persons'}`
      : '';
    const when = result.date ? `Fecha / Date: ${result.date}\n` : '';
    // The operator is told plainly when the price did not come from the
    // catalogue, because that is the one they should eyeball.
    const note =
      result.priceSource === 'client'
        ? '\n\n(Precio calculado en la página, no del catálogo — por favor verifica. / Price was calculated on the page rather than taken from the catalogue — please verify.)'
        : '';

    // Built line by line and joined, so an absent date leaves no gap rather
    // than a stray blank line in the middle of the operator's message.
    return [
      '✅ PAGO RECIBIDO / PAYMENT RECEIVED',
      '',
      `${total} pagado con tarjeta vía Stripe.`,
      `${total} paid by card via Stripe.`,
      '',
      `Tour: ${result.tour || '—'}`,
      people ? `Personas / People: ${people}` : '',
      when.trim(),
      '',
      `Ref: ${sessionId}${note}`,
    ]
      .filter((line, index, all) => line !== '' || all[index - 1] !== '')
      .join('\n');
  }, [result, sessionId]);

  const notifyOperator = useCallback(() => {
    const url = generateWhatsAppMessage(brandSettings.phoneNumber, operatorMessage());
    markNotified(sessionId);
    setCountdown(null);
    if (url) {
      // Same tab: survives popup blockers, which a timer-driven open does not.
      window.location.href = url;
    } else {
      clearQuery();
    }
  }, [brandSettings.phoneNumber, operatorMessage, sessionId, clearQuery]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      notifyOperator();
      return;
    }
    const timer = window.setTimeout(() => setCountdown((n) => (n === null ? null : n - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, notifyOperator]);

  if (state === 'idle') return null;

  const dismiss = () => {
    setCountdown(null);
    if (sessionId) markNotified(sessionId);
    setState('idle');
    clearQuery();
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-ink/80 p-4">
      <div className="relative w-full max-w-md rounded-[30px_22px_28px_24px] border border-[rgba(150,112,31,0.45)] bg-canvas-lift p-8 text-ink shadow-oil-lg">
        <button
          onClick={dismiss}
          className="absolute right-5 top-5 text-ink-light transition hover:text-ink"
          aria-label="Close"
        >
          <FaTimes />
        </button>

        {state === 'checking' && (
          <>
            <h2 className="font-display text-2xl font-bold">Confirmando el pago…</h2>
            <p className="mt-3 text-ink-soft">Checking your payment with Stripe. One moment.</p>
          </>
        )}

        {state === 'done' && result && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <FaCheckCircle className="h-9 w-9 text-palm" />
              <div>
                <h2 className="font-display text-2xl font-bold leading-tight">¡Pago recibido!</h2>
                <p className="text-sm text-ink-light">Payment received</p>
              </div>
            </div>

            <div className="rounded-[20px_14px_18px_16px] border border-[rgba(150,112,31,0.35)] bg-canvas-deep/60 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-ink-soft">Total</span>
                <span className="font-display text-lg font-bold">
                  {money(result.amountTotal, result.currency)}
                </span>
              </div>
              {result.tour && (
                <div className="flex justify-between gap-4 py-1">
                  <span className="text-ink-soft">Tour</span>
                  <span className="text-right font-semibold">{result.tour}</span>
                </div>
              )}
              {result.persons && (
                <div className="flex justify-between py-1">
                  <span className="text-ink-soft">Personas / People</span>
                  <span className="font-semibold">{result.persons}</span>
                </div>
              )}
              {result.date && (
                <div className="flex justify-between py-1">
                  <span className="text-ink-soft">Fecha / Date</span>
                  <span className="font-semibold">{result.date}</span>
                </div>
              )}
            </div>

            <p className="mt-5 text-sm text-ink-soft">
              Ahora avisamos a {brandSettings.brandName} por WhatsApp con los detalles de tu pago.
              <br />
              <span className="text-ink-light">
                We are letting {brandSettings.brandName} know on WhatsApp.
              </span>
            </p>

            <button onClick={notifyOperator} className="tropical-button mt-5 w-full justify-center">
              <FaWhatsapp className="h-4 w-4" />
              {countdown !== null
                ? `Avisar ahora / Notify now (${countdown})`
                : 'Avisar por WhatsApp / Notify on WhatsApp'}
            </button>

            <button
              onClick={dismiss}
              className="mt-3 w-full text-xs font-semibold text-ink-light underline underline-offset-4 transition hover:text-ink"
            >
              Ahora no / Not now
            </button>
          </>
        )}

        {state === 'failed' && (
          <>
            <h2 className="font-display text-2xl font-bold">No pudimos confirmar el pago</h2>
            <p className="mt-3 text-ink-soft">
              We could not confirm that payment. If your card was charged, contact us on WhatsApp
              and we will sort it out straight away.
            </p>
            <button onClick={dismiss} className="tropical-button-outline mt-5 w-full justify-center">
              Cerrar / Close
            </button>
          </>
        )}

        {state === 'cancelled' && (
          <>
            <h2 className="font-display text-2xl font-bold">Pago cancelado</h2>
            <p className="mt-3 text-ink-soft">
              No se cobró nada. Payment cancelled — nothing was charged. Your booking is still here
              whenever you are ready.
            </p>
            <button onClick={dismiss} className="tropical-button mt-5 w-full justify-center">
              Volver / Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentReturn;
