import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  clearDeparture,
  installWhatsAppWatch,
  markPromptAnswered,
  readDeparture,
  followsAnswer,
  WhatsAppDeparture,
} from '../lib/whatsappReturn';
import { readPendingAttempt } from '../lib/paymentAttempt';

const WhatsAppReturnPrompt = lazy(() => import('./WhatsAppReturnPrompt'));

/** Away for less than this was a mis-tap, not a conversation. */
const MIN_AWAY_MS = 4000;
/** Back after this long, the question has gone stale. */
const MAX_AWAY_MS = 6 * 60 * 60 * 1000;

/**
 * Always mounted, always tiny: notes every trip to WhatsApp and, when the
 * guest comes back to this tab, loads and opens the return prompt. Nothing
 * else is fetched unless there is something to ask.
 */
const WhatsAppReturnGate: React.FC = () => {
  const { pathname, search } = useLocation();
  const [departure, setDeparture] = useState<WhatsAppDeparture | null>(null);

  useEffect(() => {
    installWhatsAppWatch();

    const check = () => {
      if (document.visibilityState !== 'visible') return;
      const trip = readDeparture();
      if (!trip) return;
      // Back from paying: the payment prompt asks the one question that matters.
      // Started right after an answer: the follow-up that answer led to.
      if (readPendingAttempt() || followsAnswer(trip)) {
        clearDeparture();
        return;
      }
      const away = Date.now() - trip.at;
      if (away < MIN_AWAY_MS) return;
      clearDeparture();
      if (away <= MAX_AWAY_MS) setDeparture(trip);
    };

    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
    };
  }, []);

  // Never over the admin, and never on top of a payment receipt.
  const params = new URLSearchParams(search);
  const busyElsewhere = pathname.startsWith('/admin') || params.has('payment_ref') || params.has('paid') || params.has('session_id');
  if (!departure || busyElsewhere) return null;

  return (
    <Suspense fallback={null}>
      <WhatsAppReturnPrompt
        departure={departure}
        onClose={() => {
          markPromptAnswered();
          setDeparture(null);
        }}
      />
    </Suspense>
  );
};

export default WhatsAppReturnGate;
