/**
 * Notice when a guest leaves for WhatsApp, so the site can ask how it went
 * when they come back.
 *
 * Booking here is a conversation: a button opens WhatsApp with a message
 * already written, and from then on the site no longer knows whether the
 * guest reached anyone, booked, or wants to pay. Every WhatsApp link the site
 * opens — an <a href>, or window.open from a booking button — is noted with
 * the message it carried; the return prompt reads that note.
 */

import { track } from './activity';

export interface WhatsAppDeparture {
  at: number;
  /** The message the guest set off with, decoded. */
  text: string;
  /** Where on the site they left from. */
  path: string;
}

const KEY = 'wa_departure_v1';
const WHATSAPP = /^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|chat\.whatsapp\.com)\/|whatsapp:\/\/)/i;

export const isWhatsAppUrl = (url: string) => WHATSAPP.test(String(url ?? '').trim());

const messageOf = (url: string): string => {
  try {
    return new URL(url.replace(/^whatsapp:\/\//i, 'https://wa.me/')).searchParams.get('text') ?? '';
  } catch {
    return '';
  }
};

export const noteDeparture = (url: string) => {
  try {
    const departure: WhatsAppDeparture = { at: Date.now(), text: messageOf(url).slice(0, 1500), path: window.location.pathname };
    // Every conversation started from the site, for the admin's activity log.
    track('whatsapp', { from: departure.path, text: departure.text.replace(/\s+/g, ' ').slice(0, 140) });
    sessionStorage.setItem(KEY, JSON.stringify(departure));
  } catch {
    /* storage blocked: no prompt, nothing else lost */
  }
};

export const readDeparture = (): WhatsAppDeparture | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value.at === 'number' ? value : null;
  } catch {
    return null;
  }
};

export const clearDeparture = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
};

let installed = false;

/** Watch every way the site opens WhatsApp. Safe to call more than once. */
export const installWhatsAppWatch = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // Links: one listener for the whole document, in the capture phase so a
  // component that stops propagation does not hide the click.
  document.addEventListener(
    'click',
    (event) => {
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      // A link that only reports something already done ("I just paid")
      // opts out: there is nothing to ask about when the guest returns.
      if (anchor && isWhatsAppUrl(anchor.href) && !anchor.closest('[data-no-return-prompt]')) noteDeparture(anchor.href);
    },
    true
  );

  // Buttons that call window.open with a wa.me URL (the booking menus do).
  const open = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    if (url && isWhatsAppUrl(String(url))) noteDeparture(String(url));
    return open(url as any, target, features);
  }) as typeof window.open;
};

/**
 * What a departure's message was about, for prefilling the next step: the
 * first line that names something, and the first dollar amount in it.
 */
export const summariseDeparture = (departure: WhatsAppDeparture | null): { topic: string; amount: number | null } => {
  const text = departure?.text ?? '';
  const amountMatch = /(?:US\$|\$|USD\s?)\s?(\d{1,6}(?:[.,]\d{1,2})?)/i.exec(text) ?? /(\d{1,6}(?:[.,]\d{1,2})?)\s?(?:USD|US\$|\$)/i.exec(text);
  const amount = amountMatch ? Number(amountMatch[1].replace(',', '.')) : null;
  // The booking buttons write "… (Tour name (Option: $60)) …"; the planner
  // writes a "*The plan*" block. The first parenthesised or starred phrase is
  // usually the clearest topic; otherwise the first line.
  const topic =
    /\(([^()]{4,80})/.exec(text)?.[1] ??
    /\*([^*]{4,80})\*/.exec(text)?.[1] ??
    text.split('\n').map((line) => line.trim()).find((line) => line.length > 3) ??
    '';
  return { topic: topic.trim().slice(0, 100), amount: amount && amount > 0 ? amount : null };
};
