import { CartItem, cartTotal, lineTotal } from './cart';
import { localeTag, localeText } from './localeText';

/**
 * The cart as plain text, for a WhatsApp message to the operator, to the
 * guest themselves, or a payment's reminder. WhatsApp renders *bold*, so the
 * titles use it; everywhere else the asterisks read fine.
 */

export const formatCartDate = (date: string | undefined, locale: string, style: 'full' | 'medium' = 'medium') => {
  if (!date) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  try {
    return new Intl.DateTimeFormat(localeTag(locale), { dateStyle: style }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
};

export const usd = (value: number | null | undefined) => (typeof value === 'number' && value > 0 ? `US$ ${value.toFixed(2)}` : '');

export const cartLines = (items: CartItem[], locale: string, detail = true) => {
  const people = localeText(locale, { en: 'people', es: 'personas', de: 'Personen', fr: 'personnes' });
  const onRequest = localeText(locale, { en: 'price on request', es: 'precio a consultar', de: 'Preis auf Anfrage', fr: 'prix sur demande' });
  return items.flatMap((item, index) => {
    const when = [formatCartDate(item.date, locale), item.time].filter(Boolean).join(' ');
    const head = `${index + 1}. *${item.title}*`;
    const facts = [
      when && `📅 ${when}`,
      `👥 ${item.persons} ${people}`,
      `💵 ${usd(lineTotal(item)) || onRequest}`,
      detail && item.place && `📍 ${item.place}`,
      detail && item.duration && `⏱️ ${item.duration}`,
    ].filter(Boolean) as string[];
    return [head, ...facts.map((fact) => `   ${fact}`)];
  });
};

export const buildCartText = (
  items: CartItem[],
  locale: string,
  options: { intro?: string; brandName?: string; phone?: string; guestName?: string; detail?: boolean } = {}
) => {
  const total = cartTotal(items);
  const lines = [
    options.intro ?? '',
    ...cartLines(items, locale, options.detail ?? true),
    '',
    total > 0 ? `*${localeText(locale, { en: 'Total', es: 'Total', de: 'Gesamt', fr: 'Total' })}: ${usd(total)}*` : '',
    options.guestName ? `${localeText(locale, { en: 'Name', es: 'Nombre', de: 'Name', fr: 'Nom' })}: ${options.guestName}` : '',
    options.brandName || options.phone ? `\n${[options.brandName, options.phone].filter(Boolean).join(' · ')}` : '',
  ];
  return lines
    .filter((line, index, all) => line !== '' || (index > 0 && all[index - 1] !== ''))
    .join('\n')
    .trim();
};

/** wa.me with no number: WhatsApp asks the guest whom to send it to — themselves, a friend. */
export const shareToWhatsApp = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
