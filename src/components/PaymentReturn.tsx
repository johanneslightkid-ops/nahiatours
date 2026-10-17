import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaWhatsapp, FaTimes } from 'react-icons/fa';
import { useBrand } from '../contexts/BrandContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { getCheckoutResult, getOrderResult } from '../services/paymentService';

/**
 * Where the guest lands after paying.
 *
 * Stripe sends them back to `?paid=1&session_id=cs_…`; AZUL and CardNet (via
 * /api/dr-return) to `?paid=1&order=…`. Either query string is a claim anyone
 * could type, so nothing is announced until the server has confirmed what
 * really happened — with Stripe, or from the order it verified against AZUL's
 * signature or CardNet's own record. The amount in the message below is the
 * amount the gateway charged, not the amount this page was holding when it
 * left.
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

/** One receipt, whichever gateway took the money. */
interface Receipt {
  paid: boolean;
  /** Still being decided by the gateway — CardNet can lag its own redirect. */
  pending: boolean;
  amountTotal: number | null;
  currency: string | null;
  tour: string;
  persons: number | null;
  date: string;
  priceSource: string;
  gateway: string;
  /** Authorisation / reference numbers the operator can look up at the bank. */
  reference: string;
  test: boolean;
}

const GATEWAY_NAMES: Record<string, string> = {
  stripe: 'Stripe',
  azul: 'AZUL (Banco Popular)',
  cardnet: 'CardNet',
};

const PENDING_RETRIES = 4;

const PaymentReturn: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { brandSettings } = useBrand();

  const [result, setResult] = useState<Receipt | null>(null);
  const [state, setState] = useState<'idle' | 'checking' | 'done' | 'failed' | 'declined' | 'cancelled'>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState('');

  const params = new URLSearchParams(location.search);
  const paidFlag = params.get('paid');
  const incomingSession = params.get('session_id') ?? '';
  const incomingOrder = params.get('order') ?? '';
  const incomingRef = incomingSession || incomingOrder;

  /** Strip the payment params so a refresh does not replay any of this. */
  const clearQuery = useCallback(() => {
    const next = new URLSearchParams(location.search);
    next.delete('paid');
    next.delete('session_id');
    next.delete('order');
    const search = next.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (paidFlag === '0') {
      setState('cancelled');
      return;
    }
    if (paidFlag !== '1' || !incomingRef) return;

    let current = true;
    setState('checking');
    setSessionId(incomingRef);

    const lookup = async (attempt: number): Promise<Receipt> => {
      if (incomingSession) {
        const payment = await getCheckoutResult(incomingSession);
        return { ...payment, pending: false, gateway: 'stripe', reference: incomingSession, test: false };
      }
      const order = await getOrderResult(incomingOrder);
      if (order.status === 'pending' && attempt < PENDING_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return lookup(attempt + 1);
      }
      return {
        paid: order.paid,
        pending: order.status === 'pending',
        amountTotal: order.amountTotal,
        currency: order.currency,
        tour: order.tour,
        persons: order.persons,
        date: order.date,
        priceSource: order.priceSource,
        gateway: order.gateway,
        reference: [order.authorizationCode && `Auth ${order.authorizationCode}`, order.reference && `Ref ${order.reference}`, `Orden ${order.id}`]
          .filter(Boolean)
          .join(' · '),
        test: order.environment === 'test',
      };
    };

    lookup(0)
      .then((payment) => {
        if (!current) return;
        setResult(payment);
        setState(payment.paid ? 'done' : payment.pending ? 'failed' : incomingOrder ? 'declined' : 'failed');
        if (payment.paid && !wasNotified(incomingRef)) {
          setCountdown(COUNTDOWN_SECONDS);
        }
      })
      .catch(() => {
        if (current) setState('failed');
      });

    return () => {
      current = false;
    };
  }, [paidFlag, incomingRef, incomingSession, incomingOrder]);

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
      result.test ? '🧪 PRUEBA — sin cobro real / TEST — no real charge' : '',
      '✅ PAGO RECIBIDO / PAYMENT RECEIVED',
      '',
      `${total} pagado con tarjeta vía ${GATEWAY_NAMES[result.gateway] ?? result.gateway}.`,
      `${total} paid by card via ${GATEWAY_NAMES[result.gateway] ?? result.gateway}.`,
      '',
      `Tour: ${result.tour || '—'}`,
      people ? `Personas / People: ${people}` : '',
      when.trim(),
      '',
      `Ref: ${result.reference || sessionId}${note}`,
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
      <div className="relative w-full max-w-md rounded-[30px_22px_28px_24px] border border-[rgba(150,112,31,0.45)] bg-paper-warm p-8 text-ink shadow-ink-lg">
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
            <p className="mt-3 text-ink-soft">
              Checking your payment with {incomingSession ? 'Stripe' : 'the bank'}. One moment.
            </p>
          </>
        )}

        {state === 'done' && result && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <FaCheckCircle className="h-9 w-9 text-jungle" />
              <div>
                <h2 className="font-display text-2xl font-bold leading-tight">¡Pago recibido!</h2>
                <p className="text-sm text-ink-light">Payment received</p>
              </div>
            </div>

            {result.test && (
              <p className="mb-3 rounded-xl bg-mango/20 px-3 py-2 text-xs font-bold text-mango-dark">
                Modo de prueba — no se cobró dinero real. / Test mode — no real money moved.
              </p>
            )}

            <div className="rounded-[20px_14px_18px_16px] border border-[rgba(150,112,31,0.35)] bg-paper-deep/60 p-4 text-sm">
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
              {result.gateway !== 'stripe' && result.reference && (
                <div className="flex justify-between gap-4 py-1">
                  <span className="text-ink-soft">{GATEWAY_NAMES[result.gateway]}</span>
                  <span className="text-right text-xs font-semibold">{result.reference}</span>
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

        {state === 'declined' && (
          <>
            <h2 className="font-display text-2xl font-bold">Pago no aprobado</h2>
            <p className="mt-3 text-ink-soft">
              El banco no aprobó el pago y no se cobró nada. Puedes intentarlo con otra tarjeta o
              escribirnos por WhatsApp. / The bank did not approve the payment and nothing was
              charged. Try another card, or message us on WhatsApp.
            </p>
            <button onClick={dismiss} className="tropical-button mt-5 w-full justify-center">
              Volver / Back
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
