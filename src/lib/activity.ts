/**
 * What guests do with the cart and the booking buttons, for the admin's
 * activity log (functions/api/activity.ts).
 *
 * Events wait in memory and leave in one batch: a few seconds after the last
 * one, at once for the ones that matter (a payment press, a reservation), and
 * with sendBeacon when the page is hidden, which is the moment a guest
 * switches to WhatsApp or PayPal. One batch is one stored record, so a
 * visitor who browses and leaves costs nothing, and one who books costs a
 * write or two.
 */

export type ActivityType =
  | 'cart_add'
  | 'cart_remove'
  | 'cart_update'
  | 'cart_clear'
  | 'cart_view'
  | 'checkout'
  | 'reserve'
  | 'whatsapp'
  | 'pay_click'
  | 'pay_start'
  | 'pay_answer'
  /** What the processor said when the guest came back: paid, declined (and why), cancelled. */
  | 'pay_result'
  | 'summary_whatsapp'
  | 'summary_email'
  | 'contact';

type Data = Record<string, string | number | boolean | undefined>;

interface QueuedEvent {
  type: ActivityType;
  at: number;
  data: Data;
}

const URGENT = new Set<ActivityType>(['pay_click', 'pay_start', 'pay_answer', 'pay_result', 'reserve', 'checkout']);
/** Worth sending only alongside something else. */
const PASSIVE = new Set<ActivityType>(['cart_view']);
const DELAY_MS = 6000;
/** Urgent still waits a moment, so a press and what follows it share a batch. */
const URGENT_DELAY_MS = 400;
const SESSION_KEY = 'activity_session_v1';

let queue: QueuedEvent[] = [];
let timer: number | undefined;
let installed = false;

const sessionId = () => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
};

let currentLocale = '';
const locale = () => (currentLocale || document.documentElement.lang || navigator.language || 'en').slice(0, 2);

const payload = (events: QueuedEvent[]) =>
  JSON.stringify({ session: sessionId(), locale: locale(), page: window.location.pathname, events });

/** Send what is queued. `beacon` for a page that is going away. */
export const flushActivity = (beacon = false) => {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
  if (queue.length === 0) return;
  if (queue.every((event) => PASSIVE.has(event.type))) {
    if (beacon) queue = [];
    return;
  }
  const events = queue;
  queue = [];
  const body = payload(events);
  try {
    if (beacon && navigator.sendBeacon && navigator.sendBeacon('/api/activity', body)) return;
    void fetch('/api/activity', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);
  } catch {
    /* the log is a convenience; losing a batch loses nothing else */
  }
};

const install = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushActivity(true);
  });
  window.addEventListener('pagehide', () => flushActivity(true));
};

export const track = (type: ActivityType, data: Data = {}) => {
  if (typeof window === 'undefined') return;
  // Never the operator's own clicks in the admin.
  if (window.location.pathname.startsWith('/admin')) return;
  install();
  if (typeof data.locale === 'string' && data.locale) currentLocale = data.locale;
  const clean: Data = {};
  for (const [key, value] of Object.entries(data)) if (value !== undefined && value !== '') clean[key] = value;
  queue.push({ type, at: Date.now(), data: clean });
  if (queue.length >= 30) {
    flushActivity();
    return;
  }
  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(() => flushActivity(), URGENT.has(type) || queue.some((event) => URGENT.has(event.type)) ? URGENT_DELAY_MS : DELAY_MS);
};
