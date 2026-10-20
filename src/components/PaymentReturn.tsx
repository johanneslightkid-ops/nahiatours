import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle, FaRedo, FaShoppingCart, FaTimes, FaWhatsapp, FaWallet } from 'react-icons/fa';
import { useBrand } from '../contexts/BrandContext';
import { useI18n } from '../contexts/I18nContext';
import { localeText, LocaleTexts } from '../lib/localeText';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import {
  getCheckoutResult,
  getBankPaymentResult,
  retryPayment,
  followCheckout,
  CheckoutResult,
  BankPaymentResult,
  PaymentReason,
} from '../services/paymentService';
import { answerAttempt, readPendingAttempt } from '../lib/paymentAttempt';
import { clearCart, readCart } from '../lib/cart';
import { track } from '../lib/activity';

/**
 * Where the guest lands after paying — or after not paying.
 *
 * Every processor sends the guest back through /api/pay-return, which asks
 * the processor what happened and then forwards to the page they booked from
 * with `?payment_ref=<order>`. This asks /api/payment-result for the verdict:
 * paid, or declined and why, or cancelled, or an error on the processor's
 * side. Each gets its own message and the next steps that fit it — try again
 * (the same booking, in a fresh payment), another way to pay, WhatsApp, the
 * cart. A payment from before that change comes back as
 * `?paid=1&session_id=cs_…` (Stripe) and is still understood.
 *
 * Nothing is announced until the server has asked the processor: the query
 * string is a claim anyone could type, and the amount shown is the amount
 * charged, not the amount the page was holding when it left.
 *
 * THE WHATSAPP MESSAGE IS A NAVIGATION, NOT A POPUP. Coming back from a
 * payment page is not a user gesture, so `window.open` here is blocked by
 * every browser worth naming. Changing `location.href` is not. The paid panel
 * therefore shows the receipt, counts down, and then navigates the tab to
 * wa.me — with a button to go immediately and a link to skip, because a
 * countdown nobody can stop is a hijack. Fired once per payment: the id is
 * marked in sessionStorage first, so a back button or a refresh re-shows the
 * receipt without telling the operator twice.
 *
 * Nothing here names the processor: the guest paid by card or by PayPal, and
 * which company processed the card is the operator's business.
 */

type Outcome = 'paid' | 'declined' | 'cancelled' | 'error';

type Receipt = {
  outcome: Outcome;
  /** Paid, but the processor's word could not be checked: the operator must look. */
  unverified: boolean;
  reason: PaymentReason;
  method: 'card' | 'paypal';
  amountTotal: number | null;
  currency: string | null;
  tour: string;
  persons: number | null;
  date: string;
  priceSource: string;
  reference: string;
  returnPath: string;
};

const fromStripe = (payment: CheckoutResult, sessionId: string): Receipt => ({
  outcome: payment.paid ? 'paid' : 'error',
  unverified: false,
  reason: payment.paid ? 'approved' : 'error',
  method: 'card',
  amountTotal: payment.amountTotal,
  currency: payment.currency,
  tour: payment.tour,
  persons: payment.persons,
  date: payment.date,
  priceSource: payment.priceSource,
  reference: sessionId,
  returnPath: '',
});

const fromOrder = (payment: BankPaymentResult, ref: string): Receipt => ({
  outcome:
    payment.status === 'paid' || payment.status === 'unverified'
      ? 'paid'
      : payment.status === 'cancelled'
      ? 'cancelled'
      : payment.status === 'declined'
      ? 'declined'
      : 'error',
  unverified: payment.status === 'unverified',
  reason: payment.reason || (payment.status === 'declined' ? 'declined' : ''),
  method: payment.method === 'paypal' ? 'paypal' : 'card',
  amountTotal: payment.amountTotal,
  currency: payment.currency,
  tour: payment.tour,
  persons: payment.persons,
  date: payment.date,
  priceSource: payment.priceSource,
  reference: [ref, payment.authorizationCode && `Auth ${payment.authorizationCode}`, payment.reference && `Ref ${payment.reference}`]
    .filter(Boolean)
    .join(' · '),
  returnPath: payment.returnPath || '',
});

/**
 * The payment this tab set off to make, settled by the processor's own
 * verdict — so the "did it go through?" prompt is not asked on top of a
 * receipt, and the operator hears the processor's answer rather than the
 * guest's.
 */
const settleAttempt = (receipt: Receipt | null, outcome: 'verified' | 'paid' | 'problem' | 'cancelled', reference: string) => {
  const attempt = readPendingAttempt();
  if (!attempt) return;
  const sameKind = receipt?.method === 'paypal' ? attempt.method === 'paypal' : attempt.method.startsWith('card');
  if (!sameKind) return;
  void answerAttempt(attempt, outcome, { reference, sendReceipt: outcome === 'verified' && attempt.contact.email });
  if ((outcome === 'verified' || outcome === 'paid') && attempt.clearsCart) clearCart('paid');
};

const NOTIFIED_PREFIX = 'amigo:paid-notified:';
const COUNTDOWN_SECONDS = 5;

const wasNotified = (id: string): boolean => {
  try {
    return sessionStorage.getItem(NOTIFIED_PREFIX + id) === '1';
  } catch {
    return false;
  }
};

const markNotified = (id: string) => {
  try {
    sessionStorage.setItem(NOTIFIED_PREFIX + id, '1');
  } catch {
    /* private mode — worst case the operator gets told twice */
  }
};

const money = (amount: number | null, currency: string | null) =>
  amount === null ? '' : currency === 'DOP' ? `RD$ ${amount.toFixed(2)}` : `${currency ?? 'USD'} $${amount.toFixed(2)}`;

/** What went wrong, and what to do about it — one pair per reason. */
const WHY: Record<string, { title: LocaleTexts; text: LocaleTexts }> = {
  insufficient_funds: {
    title: { en: 'Not enough funds on this card', es: 'Fondos insuficientes en esta tarjeta', de: 'Nicht genug Guthaben auf dieser Karte', fr: 'Fonds insuffisants sur cette carte' },
    text: {
      en: 'Your bank turned the payment down for insufficient funds. Nothing was charged. Try another card, or pay another way.',
      es: 'Tu banco rechazó el pago por fondos insuficientes. No se cobró nada. Prueba con otra tarjeta o paga de otra forma.',
      de: 'Ihre Bank hat die Zahlung mangels Deckung abgelehnt. Es wurde nichts belastet. Versuchen Sie eine andere Karte oder eine andere Zahlungsart.',
      fr: 'Votre banque a refusé le paiement pour fonds insuffisants. Rien n’a été débité. Essayez une autre carte ou un autre moyen de paiement.',
    },
  },
  limit: {
    title: { en: 'Your card’s limit stopped this payment', es: 'El límite de tu tarjeta detuvo el pago', de: 'Das Kartenlimit hat die Zahlung gestoppt', fr: 'Le plafond de votre carte a bloqué le paiement' },
    text: {
      en: 'A spending limit was reached, or the card is not enabled for online or foreign payments. Nothing was charged. Your bank’s app or a quick call usually unblocks it — or try another card.',
      es: 'Se alcanzó un límite de gasto, o la tarjeta no está habilitada para compras en línea o en el extranjero. No se cobró nada. La app de tu banco o una llamada rápida suele resolverlo — o prueba con otra tarjeta.',
      de: 'Ein Ausgabelimit ist erreicht, oder die Karte ist für Online- bzw. Auslandszahlungen nicht freigeschaltet. Es wurde nichts belastet. Die Banking-App oder ein kurzer Anruf hilft meist — oder nehmen Sie eine andere Karte.',
      fr: 'Un plafond a été atteint, ou la carte n’est pas activée pour les paiements en ligne ou à l’étranger. Rien n’a été débité. L’appli de votre banque ou un appel règle souvent cela — ou essayez une autre carte.',
    },
  },
  expired_card: {
    title: { en: 'This card has expired', es: 'Esta tarjeta está vencida', de: 'Diese Karte ist abgelaufen', fr: 'Cette carte a expiré' },
    text: {
      en: 'Nothing was charged. Please try again with another card.',
      es: 'No se cobró nada. Inténtalo de nuevo con otra tarjeta.',
      de: 'Es wurde nichts belastet. Bitte versuchen Sie es mit einer anderen Karte.',
      fr: 'Rien n’a été débité. Réessayez avec une autre carte.',
    },
  },
  check_details: {
    title: { en: 'The card details did not match', es: 'Los datos de la tarjeta no coincidieron', de: 'Die Kartendaten stimmten nicht', fr: 'Les données de la carte ne correspondent pas' },
    text: {
      en: 'The number, expiry date or security code did not check out. Nothing was charged — try again and check them carefully.',
      es: 'El número, la fecha de vencimiento o el código de seguridad no coincidieron. No se cobró nada — inténtalo de nuevo revisándolos con calma.',
      de: 'Nummer, Ablaufdatum oder Sicherheitscode stimmten nicht. Es wurde nichts belastet — bitte erneut versuchen und genau prüfen.',
      fr: 'Le numéro, la date d’expiration ou le code de sécurité ne correspondent pas. Rien n’a été débité — réessayez en les vérifiant.',
    },
  },
  authentication: {
    title: { en: 'Your bank’s confirmation did not finish', es: 'La confirmación de tu banco no se completó', de: 'Die Bestätigung Ihrer Bank wurde nicht abgeschlossen', fr: 'La confirmation de votre banque n’a pas abouti' },
    text: {
      en: 'The security step — a code by text message or approval in your bank’s app — was not completed. Nothing was charged. Try again and approve it when your bank asks.',
      es: 'El paso de seguridad — un código por SMS o la aprobación en la app de tu banco — no se completó. No se cobró nada. Inténtalo de nuevo y apruébalo cuando tu banco lo pida.',
      de: 'Der Sicherheitsschritt — ein SMS-Code oder die Freigabe in Ihrer Banking-App — wurde nicht abgeschlossen. Es wurde nichts belastet. Versuchen Sie es erneut und bestätigen Sie, wenn Ihre Bank fragt.',
      fr: 'L’étape de sécurité — un code par SMS ou la validation dans l’appli de votre banque — n’a pas été terminée. Rien n’a été débité. Réessayez et validez quand votre banque le demande.',
    },
  },
  try_again: {
    title: { en: 'The bank did not answer in time', es: 'El banco no respondió a tiempo', de: 'Die Bank hat nicht rechtzeitig geantwortet', fr: 'La banque n’a pas répondu à temps' },
    text: {
      en: 'This happens now and then. Nothing was charged — the same card usually works if you try again in a minute.',
      es: 'Pasa de vez en cuando. No se cobró nada — la misma tarjeta suele funcionar si lo intentas de nuevo en un minuto.',
      de: 'Das kommt vor. Es wurde nichts belastet — mit derselben Karte klappt es meist, wenn Sie es in einer Minute erneut versuchen.',
      fr: 'Cela arrive parfois. Rien n’a été débité — la même carte passe généralement si vous réessayez dans une minute.',
    },
  },
  declined: {
    title: { en: 'Your bank declined the payment', es: 'Tu banco rechazó el pago', de: 'Ihre Bank hat die Zahlung abgelehnt', fr: 'Votre banque a refusé le paiement' },
    text: {
      en: 'Nothing was charged. Banks often block a first payment abroad or online — try another card, allow it in your bank’s app, or pay another way.',
      es: 'No se cobró nada. Los bancos suelen bloquear un primer pago en el extranjero o en línea — prueba con otra tarjeta, autorízalo en la app de tu banco o paga de otra forma.',
      de: 'Es wurde nichts belastet. Banken sperren oft eine erste Zahlung im Ausland oder online — nehmen Sie eine andere Karte, geben Sie sie in der Banking-App frei oder zahlen Sie anders.',
      fr: 'Rien n’a été débité. Les banques bloquent souvent un premier paiement à l’étranger ou en ligne — essayez une autre carte, autorisez-le dans l’appli de votre banque ou payez autrement.',
    },
  },
  error: {
    title: { en: 'The payment could not be completed', es: 'No se pudo completar el pago', de: 'Die Zahlung konnte nicht abgeschlossen werden', fr: 'Le paiement n’a pas pu aboutir' },
    text: {
      en: 'Something went wrong on the payment side, not with your card. Nothing was charged. Try again, or message us on WhatsApp and we will send you a payment link.',
      es: 'Algo falló del lado del pago, no con tu tarjeta. No se cobró nada. Inténtalo de nuevo, o escríbenos por WhatsApp y te enviamos un enlace de pago.',
      de: 'Auf der Zahlungsseite ist etwas schiefgegangen, nicht mit Ihrer Karte. Es wurde nichts belastet. Versuchen Sie es erneut oder schreiben Sie uns auf WhatsApp — wir schicken Ihnen einen Zahlungslink.',
      fr: 'Un souci côté paiement, pas avec votre carte. Rien n’a été débité. Réessayez, ou écrivez-nous sur WhatsApp et nous vous enverrons un lien de paiement.',
    },
  },
  cancelled: {
    title: { en: 'Payment cancelled', es: 'Pago cancelado', de: 'Zahlung abgebrochen', fr: 'Paiement annulé' },
    text: {
      en: 'Nothing was charged. Your booking is still here whenever you are ready.',
      es: 'No se cobró nada. Tu reserva sigue aquí para cuando quieras.',
      de: 'Es wurde nichts belastet. Ihre Buchung wartet hier, wann immer Sie bereit sind.',
      fr: 'Rien n’a été débité. Votre réservation vous attend ici quand vous voulez.',
    },
  },
};

const PaymentReturn: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const L = (texts: LocaleTexts) => localeText(locale, texts);

  const [result, setResult] = useState<Receipt | null>(null);
  const [state, setState] = useState<'idle' | 'checking' | 'done' | 'failed'>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [paymentId, setPaymentId] = useState('');
  /** The order to "try again" from; empty for a payment from before orders. */
  const [orderRef, setOrderRef] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  const params = new URLSearchParams(location.search);
  const paidFlag = params.get('paid');
  const incomingSession = params.get('session_id') ?? '';
  const incomingRef = params.get('payment_ref') ?? '';

  /** Strip the payment params so a refresh does not replay any of this. */
  const clearQuery = useCallback(() => {
    const next = new URLSearchParams(location.search);
    next.delete('paid');
    next.delete('session_id');
    next.delete('payment_ref');
    const search = next.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (paidFlag === '0' && !incomingRef) {
      const cancelled: Receipt = { ...fromStripe({ paid: false } as CheckoutResult, incomingSession), outcome: 'cancelled', reason: 'cancelled' };
      setResult(cancelled);
      setState('done');
      settleAttempt(cancelled, 'cancelled', incomingSession);
      return;
    }

    const byOrder = Boolean(incomingRef);
    const id = byOrder ? incomingRef : incomingSession;
    if (!byOrder && (paidFlag !== '1' || !incomingSession)) return;

    let current = true;
    setState('checking');
    setPaymentId(id);
    setOrderRef(byOrder ? id : '');

    const lookup: Promise<Receipt> = byOrder
      ? getBankPaymentResult(id).then((payment) => fromOrder(payment, id))
      : getCheckoutResult(id).then((payment) => fromStripe(payment, id));

    lookup
      .then((payment) => {
        if (!current) return;
        setResult(payment);
        setState('done');
        track('pay_result', {
          status: payment.unverified ? 'unverified' : payment.outcome,
          reason: payment.reason || undefined,
          method: payment.method,
          total: payment.amountTotal ?? 0,
          title: payment.tour,
          locale,
        });
        settleAttempt(
          payment,
          payment.outcome === 'paid'
            ? payment.unverified
              ? 'paid'
              : 'verified'
            : payment.outcome === 'cancelled'
            ? 'cancelled'
            : 'problem',
          id
        );
        if (payment.outcome === 'paid' && !wasNotified(id)) {
          setCountdown(COUNTDOWN_SECONDS);
        }
      })
      .catch(() => {
        if (current) setState('failed');
      });

    return () => {
      current = false;
    };
  }, [paidFlag, incomingSession, incomingRef]);

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
    const check = result.unverified
      ? '\n\n⚠️ El pago no se pudo verificar automáticamente — revísalo en tu portal de pagos antes de confirmar. / ' +
        'The payment could not be verified automatically — check it in your payment portal before confirming.'
      : '';
    const how = result.method === 'paypal' ? 'PayPal' : 'tarjeta en línea / online by card';

    // Built line by line and joined, so an absent date leaves no gap rather
    // than a stray blank line in the middle of the operator's message.
    return [
      result.unverified ? '🟡 PAGO POR VERIFICAR / PAYMENT TO VERIFY' : '✅ PAGO RECIBIDO / PAYMENT RECEIVED',
      '',
      `${total} — ${how}`,
      '',
      `Tour: ${result.tour || '—'}`,
      people ? `Personas / People: ${people}` : '',
      when.trim(),
      '',
      `Ref: ${result.reference || paymentId}${note}${check}`,
    ]
      .filter((line, index, all) => line !== '' || all[index - 1] !== '')
      .join('\n');
  }, [result, paymentId]);

  const notifyOperator = useCallback(() => {
    const url = generateWhatsAppMessage(brandSettings.phoneNumber, operatorMessage());
    markNotified(paymentId);
    setCountdown(null);
    if (url) {
      // Same tab: survives popup blockers, which a timer-driven open does not.
      window.location.href = url;
    } else {
      clearQuery();
    }
  }, [brandSettings.phoneNumber, operatorMessage, paymentId, clearQuery]);

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
    if (paymentId) markNotified(paymentId);
    setState('idle');
    clearQuery();
  };

  /** The same booking again, in a fresh payment. */
  const retry = async () => {
    if (!orderRef) return;
    setRetrying(true);
    setRetryError('');
    track('pay_start', { method: result?.method === 'paypal' ? 'paypal' : 'card', source: 'retry', total: result?.amountTotal ?? 0, title: result?.tour, locale });
    try {
      followCheckout(await retryPayment(orderRef));
    } catch (error: any) {
      setRetrying(false);
      setRetryError(error?.message || L({ en: 'The payment page could not be opened.', es: 'No se pudo abrir la página de pago.', de: 'Die Zahlungsseite konnte nicht geöffnet werden.', fr: 'Impossible d’ouvrir la page de paiement.' }));
    }
  };

  /** Back to where the payment buttons are: the cart for a cart, else this page. */
  const anotherWay = () => {
    const back = result?.returnPath && result.returnPath !== location.pathname ? result.returnPath : '';
    dismiss();
    if (back) navigate(back);
  };

  const cartHasItems = readCart().length > 0 && location.pathname !== '/cart';
  const why = result ? WHY[result.outcome === 'cancelled' ? 'cancelled' : result.outcome === 'error' ? 'error' : result.reason] ?? WHY.declined : WHY.error;
  const helpUrl = generateWhatsAppMessage(
    brandSettings.phoneNumber,
    [
      L({ en: 'Hello! My payment did not go through.', es: '¡Hola! Mi pago no se completó.', de: 'Hallo! Meine Zahlung ist nicht durchgegangen.', fr: 'Bonjour ! Mon paiement n’est pas passé.' }),
      result?.tour ? `Tour: ${result.tour}` : '',
      result?.amountTotal ? `Total: ${money(result.amountTotal, result.currency)}` : '',
      result ? `(${L(why.title)})` : '',
      `Ref: ${result?.reference || paymentId || '—'}`,
    ]
      .filter(Boolean)
      .join('\n')
  );

  const paid = state === 'done' && result?.outcome === 'paid';
  const notPaid = state === 'done' && result && result.outcome !== 'paid';
  const canRetry = Boolean(orderRef);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-ink/80 p-4" role="dialog" aria-modal="true" aria-labelledby="pay-return-title">
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[30px_22px_28px_24px] border border-[rgba(150,112,31,0.45)] bg-paper-warm p-8 text-ink shadow-ink-lg">
        <button
          onClick={dismiss}
          className="absolute right-5 top-5 text-ink-light transition hover:text-ink"
          aria-label={L({ en: 'Close', es: 'Cerrar', de: 'Schließen', fr: 'Fermer' })}
        >
          <FaTimes />
        </button>

        {state === 'checking' && (
          <>
            <h2 id="pay-return-title" className="font-display text-2xl font-bold">
              {L({ en: 'Checking your payment…', es: 'Confirmando el pago…', de: 'Zahlung wird geprüft…', fr: 'Vérification du paiement…' })}
            </h2>
            <p className="mt-3 text-ink-soft">{L({ en: 'One moment, please.', es: 'Un momento, por favor.', de: 'Einen Moment, bitte.', fr: 'Un instant, s’il vous plaît.' })}</p>
          </>
        )}

        {paid && result && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <FaCheckCircle className="h-9 w-9 shrink-0 text-jungle" />
              <div>
                <h2 id="pay-return-title" className="font-display text-2xl font-bold leading-tight">
                  {result.unverified
                    ? L({ en: 'Payment being checked', es: 'Pago en revisión', de: 'Zahlung wird geprüft', fr: 'Paiement en cours de vérification' })
                    : L({ en: 'Payment received!', es: '¡Pago recibido!', de: 'Zahlung erhalten!', fr: 'Paiement reçu !' })}
                </h2>
                {result.unverified && (
                  <p className="text-sm text-ink-light">
                    {L({
                      en: 'We have it and will confirm it personally.',
                      es: 'Lo tenemos y te lo confirmamos personalmente.',
                      de: 'Wir haben sie und bestätigen persönlich.',
                      fr: 'Nous l’avons et vous le confirmons personnellement.',
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[20px_14px_18px_16px] border border-[rgba(150,112,31,0.35)] bg-paper-deep/60 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-ink-soft">Total</span>
                <span className="font-display text-lg font-bold">{money(result.amountTotal, result.currency)}</span>
              </div>
              {result.tour && (
                <div className="flex justify-between gap-4 py-1">
                  <span className="text-ink-soft">Tour</span>
                  <span className="text-right font-semibold">{result.tour}</span>
                </div>
              )}
              {result.persons && (
                <div className="flex justify-between py-1">
                  <span className="text-ink-soft">{L({ en: 'People', es: 'Personas', de: 'Personen', fr: 'Personnes' })}</span>
                  <span className="font-semibold">{result.persons}</span>
                </div>
              )}
              {result.date && (
                <div className="flex justify-between py-1">
                  <span className="text-ink-soft">{L({ en: 'Date', es: 'Fecha', de: 'Datum', fr: 'Date' })}</span>
                  <span className="font-semibold">{result.date}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 py-1 text-xs">
                <span className="text-ink-soft">Ref</span>
                <span className="break-all text-right text-ink-light">{result.reference || paymentId}</span>
              </div>
            </div>

            <p className="mt-5 text-sm text-ink-soft">
              {L({
                en: `We are now letting ${brandSettings.brandName} know on WhatsApp with your payment details.`,
                es: `Ahora avisamos a ${brandSettings.brandName} por WhatsApp con los detalles de tu pago.`,
                de: `Wir informieren jetzt ${brandSettings.brandName} per WhatsApp über Ihre Zahlung.`,
                fr: `Nous prévenons maintenant ${brandSettings.brandName} sur WhatsApp avec les détails de votre paiement.`,
              })}
            </p>

            <button onClick={notifyOperator} className="tropical-button mt-5 w-full justify-center">
              <FaWhatsapp className="h-4 w-4" />
              {countdown !== null
                ? `${L({ en: 'Notify now', es: 'Avisar ahora', de: 'Jetzt benachrichtigen', fr: 'Prévenir maintenant' })} (${countdown})`
                : L({ en: 'Notify on WhatsApp', es: 'Avisar por WhatsApp', de: 'Per WhatsApp benachrichtigen', fr: 'Prévenir sur WhatsApp' })}
            </button>

            <button
              onClick={dismiss}
              className="mt-3 w-full text-xs font-semibold text-ink-light underline underline-offset-4 transition hover:text-ink"
            >
              {L({ en: 'Not now', es: 'Ahora no', de: 'Nicht jetzt', fr: 'Pas maintenant' })}
            </button>
          </>
        )}

        {(notPaid || state === 'failed') && (
          <>
            <div className="mb-3 flex items-center gap-3">
              <FaExclamationTriangle className={`h-8 w-8 shrink-0 ${result?.outcome === 'cancelled' ? 'text-ink-light' : 'text-sunset-dark'}`} />
              <h2 id="pay-return-title" className="pr-6 font-display text-2xl font-bold leading-tight">
                {state === 'failed'
                  ? L({ en: 'We could not confirm that payment', es: 'No pudimos confirmar el pago', de: 'Wir konnten die Zahlung nicht bestätigen', fr: 'Nous n’avons pas pu confirmer le paiement' })
                  : L(why.title)}
              </h2>
            </div>
            <p className="text-sm text-ink-soft">
              {state === 'failed'
                ? L({
                    en: 'If your card was charged, message us on WhatsApp with the reference below and we will sort it out straight away.',
                    es: 'Si se cobró tu tarjeta, escríbenos por WhatsApp con la referencia de abajo y lo resolvemos enseguida.',
                    de: 'Falls Ihre Karte belastet wurde, schreiben Sie uns auf WhatsApp mit der Referenz unten — wir klären das sofort.',
                    fr: 'Si votre carte a été débitée, écrivez-nous sur WhatsApp avec la référence ci-dessous et nous réglons cela tout de suite.',
                  })
                : L(why.text)}
            </p>
            {(result?.tour || paymentId) && (
              <div className="mt-4 rounded-[20px_14px_18px_16px] border border-[rgba(150,112,31,0.35)] bg-paper-deep/60 p-3 text-xs text-ink-soft">
                {result?.tour && <div className="font-semibold text-ink">{result.tour}</div>}
                {result?.amountTotal ? <div>{money(result.amountTotal, result.currency)}</div> : null}
                <div className="break-all">Ref: {result?.reference || paymentId}</div>
              </div>
            )}

            {retryError && <p className="mt-3 text-sm font-semibold text-hibiscus-dark">{retryError}</p>}

            <div className="mt-5 grid gap-2">
              {canRetry && state !== 'failed' && (
                <button type="button" onClick={retry} disabled={retrying} className="tropical-button w-full justify-center disabled:opacity-60">
                  <FaRedo className="h-3.5 w-3.5" />
                  {retrying ? '…' : L({ en: 'Try again', es: 'Intentar de nuevo', de: 'Erneut versuchen', fr: 'Réessayer' })}
                </button>
              )}
              {state !== 'failed' && (
                <button type="button" onClick={anotherWay} className="tropical-button-outline w-full justify-center">
                  <FaWallet className="h-3.5 w-3.5" />
                  {L({ en: 'Choose another way to pay', es: 'Elegir otra forma de pago', de: 'Andere Zahlungsart wählen', fr: 'Choisir un autre moyen de paiement' })}
                </button>
              )}
              {helpUrl && (
                <a href={helpUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-jungle/40 px-5 py-2.5 text-sm font-bold text-jungle-dark">
                  <FaWhatsapp /> {L({ en: 'Ask us on WhatsApp', es: 'Escríbenos por WhatsApp', de: 'Fragen Sie uns auf WhatsApp', fr: 'Écrivez-nous sur WhatsApp' })}
                </a>
              )}
              {cartHasItems && (
                <Link to="/cart" onClick={dismiss} className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-ink-soft underline underline-offset-4">
                  <FaShoppingCart /> {L({ en: 'View my cart', es: 'Ver mi carrito', de: 'Warenkorb ansehen', fr: 'Voir mon panier' })}
                </Link>
              )}
              <button type="button" onClick={dismiss} className="mt-1 text-xs font-semibold text-ink-light underline underline-offset-4 transition hover:text-ink">
                {L({ en: 'Close', es: 'Cerrar', de: 'Schließen', fr: 'Fermer' })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentReturn;
