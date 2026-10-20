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
 *
 * Browsing — a tour page opened, a plan made (LAZY) — sets no timer of its
 * own: it rides along with the next real event, or leaves once, with the
 * beacon, when the page is hidden. So a visitor who only browses costs one
 * write, and the admin still learns which tours are looked at, from where.
 *
 * A visit is the tab's session; a VISITOR is a random id kept in this
 * browser's localStorage, so returning visitors can be counted. Neither says
 * who anybody is.
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
  /** A tour's detail page was opened. */
  | 'tour_view'
  /** The planner made a plan: the guest's answers, no personal data. */
  | 'plan_profile'
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
/** Sent with the next real event or when the page is hidden; never on a timer of their own. */
const LAZY = new Set<ActivityType>(['tour_view', 'plan_profile']);
const DELAY_MS = 6000;
/** Urgent still waits a moment, so a press and what follows it share a batch. */
const URGENT_DELAY_MS = 400;
const SESSION_KEY = 'activity_session_v1';
const VISITOR_KEY = 'activity_visitor_v1';

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

const visitorId = () => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
};

let currentLocale = '';
const locale = () => (currentLocale || document.documentElement.lang || navigator.language || 'en').slice(0, 2);

const payload = (events: QueuedEvent[]) =>
  JSON.stringify({ session: sessionId(), visitor: visitorId(), locale: locale(), page: window.location.pathname, events });

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
  // Browsing waits for the page to be left, or for something real to go with.
  if (!beacon && queue.length < 30 && queue.every((event) => PASSIVE.has(event.type) || LAZY.has(event.type))) return;
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
  if (LAZY.has(type) || PASSIVE.has(type)) return;
  if (timer !== undefined) window.clearTimeout(timer);
  timer = window.setTimeout(() => flushActivity(), URGENT.has(type) || queue.some((event) => URGENT.has(event.type)) ? URGENT_DELAY_MS : DELAY_MS);
};
