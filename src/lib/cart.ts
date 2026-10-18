import { useSyncExternalStore } from 'react';
import { track } from './activity';

/**
 * The shopping cart: tours and transfers a guest has set aside to book
 * together, kept on their own device.
 *
 * Nothing about a cart needs a server until the guest acts on it — reserves,
 * pays, asks for the summary — so it lives in localStorage, survives a closed
 * tab and a week away, and is shared by every tab of the site (the `storage`
 * event keeps them in step). Adding and removing are reported to the admin's
 * activity log, nothing more.
 */

export interface CartItem {
  /** Same tour on the same day is the same line; adding it again updates it. */
  key: string;
  category: 'tours' | 'transport' | string;
  serviceId?: number | string;
  title: string;
  image?: string;
  /** Plain text, already shortened. */
  description?: string;
  detailsPath?: string;
  /** yyyy-mm-dd when the guest picked a day; free text for a transfer. */
  date?: string;
  time?: string;
  persons: number;
  quantities?: Record<string, number>;
  /** Per person, when the item is priced per person. */
  unitPrice?: number | null;
  /** For items with one price for the whole party (a transfer). */
  fixedTotal?: number | null;
  tier?: string;
  /** Where: the meeting point, or "Punta Cana → Santo Domingo". */
  place?: string;
  duration?: string;
  included?: string[];
  goodToKnow?: string[];
  addedAt: number;
}

const KEY = 'cart_v1';
const EVENT = 'cart:change';
/** A cart forgotten for a month is not a plan any more. */
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
export const MAX_ITEMS = 12;

let cache: CartItem[] | null = null;

const load = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    return Array.isArray(value)
      ? value.filter((item) => item && typeof item.key === 'string' && now - Number(item.addedAt || 0) < MAX_AGE_MS)
      : [];
  } catch {
    return [];
  }
};

const save = (items: CartItem[]) => {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode: the cart lasts as long as the tab */
  }
  window.dispatchEvent(new Event(EVENT));
};

export const readCart = (): CartItem[] => {
  if (cache === null) cache = typeof window === 'undefined' ? [] : load();
  return cache;
};

const subscribe = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cache = load();
      listener();
    }
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
};

const EMPTY: CartItem[] = [];
export const useCart = (): CartItem[] => useSyncExternalStore(subscribe, readCart, () => EMPTY);

/** The price of one line, or null when it is "on request". */
export const lineTotal = (item: CartItem): number | null => {
  if (typeof item.fixedTotal === 'number' && item.fixedTotal > 0) return item.fixedTotal;
  if (typeof item.unitPrice === 'number' && item.unitPrice > 0) return Math.round(item.unitPrice * Math.max(1, item.persons) * 100) / 100;
  return null;
};

export const cartTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + (lineTotal(item) ?? 0), 0);

export const cartKey = (category: string, idOrTitle: string | number, date?: string) =>
  `${category}:${String(idOrTitle).toLowerCase().replace(/\s+/g, '-').slice(0, 80)}:${date || 'any'}`;

export type NewCartItem = Omit<CartItem, 'key' | 'addedAt'> & { key?: string };

export const addToCart = (item: NewCartItem): CartItem => {
  const key = item.key ?? cartKey(item.category, item.serviceId ?? item.title, item.date);
  const line: CartItem = { ...item, key, persons: Math.max(1, Math.round(item.persons || 1)), addedAt: Date.now() };
  const items = readCart();
  const existing = items.find((other) => other.key === key);
  const next = existing
    ? items.map((other) => (other.key === key ? { ...other, ...line, addedAt: other.addedAt } : other))
    : [...items, line].slice(-MAX_ITEMS);
  save(next);
  track('cart_add', { title: line.title, category: line.category, date: line.date ?? '', persons: line.persons, total: lineTotal(line) ?? 0, again: Boolean(existing) });
  return line;
};

export const updateCartItem = (key: string, patch: Partial<Pick<CartItem, 'date' | 'time' | 'persons' | 'quantities'>>) => {
  const items = readCart();
  const target = items.find((item) => item.key === key);
  if (!target) return;
  const persons = patch.persons !== undefined ? Math.max(1, Math.min(60, Math.round(patch.persons))) : target.persons;
  save(items.map((item) => (item.key === key ? { ...item, ...patch, persons } : item)));
  track('cart_update', { title: target.title, ...(patch.date !== undefined ? { date: patch.date } : {}), persons });
};

export const removeFromCart = (key: string) => {
  const items = readCart();
  const target = items.find((item) => item.key === key);
  if (!target) return;
  save(items.filter((item) => item.key !== key));
  track('cart_remove', { title: target.title, category: target.category, total: lineTotal(target) ?? 0 });
};

export const clearCart = (reason = 'cleared') => {
  if (readCart().length === 0) return;
  track('cart_clear', { reason, items: readCart().length });
  save([]);
};

export const isInCart = (items: CartItem[], key: string) => items.some((item) => item.key === key);

/**
 * The parts of a tour description worth remembering in a cart: a short
 * introduction, how long it takes, what is included, and the practical
 * notes ("bring a towel"). Descriptions are markdown written by the operator
 * in four languages, so this looks for the shapes they use rather than for
 * exact words: "**Duration:** 10 hours", "**Included:**" followed by bullets.
 */
export const summariseDescription = (markdown: string) => {
  const text = String(markdown ?? '').replace(/\r/g, '');
  const lines = text.split('\n').map((line) => line.trim());
  const plain = (line: string) =>
    line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`#>]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const bullet = /^([•\-*–]|\d+[.)])\s+/;

  const durationLine = lines.find((line) => /^\**\s*(duration|duración|dauer|durée)\b/i.test(plain(line)) || /(duration|duración|dauer|durée)\s*:/i.test(line));
  const duration = durationLine ? plain(durationLine).replace(/^[^:]*:\s*/, '').slice(0, 60) : '';

  const included: string[] = [];
  const goodToKnow: string[] = [];
  let section: 'included' | 'notes' | 'other' = 'other';
  for (const line of lines) {
    const clean = plain(line);
    if (!clean) continue;
    if (/^(included|incluye|incluido|inklusive|enthalten|inclus|comprend)/i.test(clean) && clean.length < 60) {
      section = 'included';
      continue;
    }
    if (/^(bring|what to bring|qué llevar|que llevar|mitbringen|à apporter|a apporter|important|importante|wichtig|note|nota|hinweis|good to know|bueno saber|gut zu wissen|bon à savoir)/i.test(clean) && clean.length < 60) {
      section = 'notes';
      continue;
    }
    if (bullet.test(line)) {
      const item = plain(line.replace(bullet, '')).slice(0, 120);
      if (!item) continue;
      if (section === 'notes' || /\b(bring|wear|llevar|traer|mitbringen|apporter|not included|no incluye|nicht inklusive|non inclus|passport|pasaporte|reisepass|passeport|cash|efectivo|bargeld|espèces)\b/i.test(item)) goodToKnow.push(item);
      else included.push(item);
    } else if (!/^\**\s*[^:]{2,30}:\**/.test(line)) {
      section = section === 'notes' ? 'notes' : 'other';
    }
  }

  const intro =
    lines
      .filter((line) => line && !bullet.test(line) && !/^#/.test(line) && !/^\**[^:]{2,30}:\**\s*$/.test(line) && line !== durationLine)
      .map(plain)
      .find((line) => line.length > 30) ?? '';
  const short = intro.length > 170 ? `${intro.slice(0, 167).replace(/\s+\S*$/, '')}…` : intro;

  return { intro: short, duration, included: included.slice(0, 6), goodToKnow: goodToKnow.slice(0, 4) };
};
