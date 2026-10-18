import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { clearDeparture } from '../../lib/whatsappReturn';
import { PendingAttempt, readPendingAttempt } from '../../lib/paymentAttempt';

const PaymentConfirmPrompt = lazy(() => import('./PaymentConfirmPrompt'));

/** Back sooner than this, the guest cannot have paid yet. */
const MIN_AWAY_MS = 8000;
const SNOOZE_KEY = 'pay_attempt_snoozed';

const snoozed = (id: string) => {
  try {
    return sessionStorage.getItem(SNOOZE_KEY) === id;
  } catch {
    return false;
  }
};

/**
 * Always mounted, always tiny: when a guest who set off to pay comes back to
 * the site — to this tab from PayPal's, or on a later visit — loads and opens
 * the "did it go through?" prompt. Takes precedence over the WhatsApp return
 * prompt, which would otherwise ask about the WhatsApp message the payment
 * buttons send alongside.
 */
const PaymentConfirmGate: React.FC = () => {
  const { pathname, search } = useLocation();
  const [attempt, setAttempt] = useState<PendingAttempt | null>(null);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      const pending = readPendingAttempt();
      // Answered: the open prompt stays to say thank you, and closes itself.
      if (!pending) return;
      if (Date.now() - pending.at < MIN_AWAY_MS || snoozed(pending.id)) return;
      clearDeparture();
      setAttempt((open) => (open && open.id === pending.id ? open : pending));
    };
    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    window.addEventListener('pay-attempt:change', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
      window.removeEventListener('pay-attempt:change', check);
    };
  }, []);

  const params = new URLSearchParams(search);
  // A gateway's own answer is on its way (PaymentReturn), or this is the admin.
  const busyElsewhere = pathname.startsWith('/admin') || params.has('payment_ref') || params.has('paid') || params.has('session_id');
  if (!attempt || busyElsewhere) return null;

  return (
    <Suspense fallback={null}>
      <PaymentConfirmPrompt
        attempt={attempt}
        onSnooze={() => {
          try {
            sessionStorage.setItem(SNOOZE_KEY, attempt.id);
          } catch {
            /* asked again on the next return, which is fine */
          }
          setAttempt(null);
        }}
        onClose={() => setAttempt(null)}
      />
    </Suspense>
  );
};

export default PaymentConfirmGate;
