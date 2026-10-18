import { track } from './activity';

/**
 * The payment a guest set off to make, remembered until they say how it went.
 *
 * Started inside the click that opens PayPal or the card page (so nothing
 * waits on the network: the id is made here and the request is sent with
 * keepalive), kept in localStorage so the question survives a closed tab, and
 * cleared once answered. functions/api/pay-attempt.ts is the server half.
 */

export type ContactPrefs = { whatsapp: boolean; email: boolean; call: boolean };

export interface AttemptLine {
  title: string;
  date?: string;
  persons?: number;
  total?: number | null;
  category?: string;
  serviceId?: number | string;
  quantities?: Record<string, number>;
}

export interface PendingAttempt {
  id: string;
  at: number;
  /** 'paypal' | 'card' | 'card-link' | … */
  method: string;
  /** 'direct' (a tour card), 'cart', 'contact' (the any-amount widget). */
  source: string;
  total: number | null;
  items: AttemptLine[];
  name?: string;
  phone?: string;
  email?: string;
  contact: ContactPrefs;
  locale: string;
  /** Where to send the guest to try again: the PayPal or payment-link URL. */
  retryUrl?: string;
  /** Whether the cart should be emptied once the guest says it worked. */
  clearsCart?: boolean;
}

export type AttemptOutcome = 'paid' | 'problem' | 'later' | 'verified' | 'cancelled';

const KEY = 'pay_attempt_v1';
/** Back after this long, asking would be odd; the operator was told anyway. */
export const ATTEMPT_MAX_AGE_MS = 48 * 3600 * 1000;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const readPendingAttempt = (): PendingAttempt | null => {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw ? (JSON.parse(raw) as PendingAttempt) : null;
    if (!value || typeof value.at !== 'number') return null;
    if (Date.now() - value.at > ATTEMPT_MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
};

export const clearPendingAttempt = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing kept */
  }
  window.dispatchEvent(new Event('pay-attempt:change'));
};

const post = (body: unknown) => {
  try {
    void fetch('/api/pay-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* the guest's payment does not depend on this */
  }
};

/** Call synchronously in the click, right before leaving for the payment page. */
export const startAttempt = (attempt: Omit<PendingAttempt, 'id' | 'at'>): PendingAttempt => {
  const pending: PendingAttempt = { ...attempt, id: newId(), at: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* no prompt on return, the operator is still told */
  }
  post({ action: 'start', ...pending, page: window.location.pathname });
  track('pay_start', {
    method: pending.method,
    source: pending.source,
    total: pending.total ?? 0,
    items: pending.items.length,
    title: pending.items[0]?.title,
    locale: pending.locale,
  });
  window.dispatchEvent(new Event('pay-attempt:change'));
  return pending;
};

export const answerAttempt = async (
  attempt: PendingAttempt,
  outcome: AttemptOutcome,
  extra: { contact?: ContactPrefs; name?: string; phone?: string; email?: string; note?: string; reference?: string; sendReceipt?: boolean } = {}
): Promise<{ ok: boolean; receipt?: boolean }> => {
  track('pay_answer', { outcome, method: attempt.method, total: attempt.total ?? 0 });
  clearPendingAttempt();
  try {
    const response = await fetch('/api/pay-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', id: attempt.id, outcome, ...extra }),
      keepalive: true,
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok, receipt: Boolean(body?.receipt) };
  } catch {
    return { ok: false };
  }
};
