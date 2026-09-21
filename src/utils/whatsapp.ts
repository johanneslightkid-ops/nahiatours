import { normalizeDRPhoneNumber } from './normalizePhoneNumber';

/**
 * A WhatsApp link, or nothing.
 *
 * It used to return `https://wa.me/?text=…` when no number was configured — a
 * link that opens WhatsApp with no recipient. Every caller already guards with
 * `if (url)`, so returning an empty string is what makes those guards mean
 * something: no number, no button.
 */
export const generateWhatsAppMessage = (
  rawPhoneNumber: string,
  message: string
): string => {
  const phone = normalizeDRPhoneNumber(rawPhoneNumber);
  if (!phone || !/\d/.test(phone)) {
    return '';
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export const generateContactWhatsAppMessage = (name: string, email: string, phone: string, message: string) => {
    const contactMessage = `Hello, my name is ${name}. Email: ${email}. Phone: ${phone}. Message: ${message}`;
    const encodedMessage = encodeURIComponent(contactMessage);
    return `https://wa.me/${normalizeDRPhoneNumber(phone)}?text=${encodedMessage}`;
};
