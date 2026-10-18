import React from 'react';
import { FaEnvelope, FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';
import { localeText } from '../../lib/localeText';
import { readGuest } from '../../lib/guestMemory';
import { ContactPrefs } from '../../lib/paymentAttempt';

/**
 * Asked right before a guest leaves to pay: how they would like the booking
 * confirmed, the details that needs, and the two things worth doing on the
 * payment page (keep the receipt, take a screenshot). Shown inside the
 * payment menu's dialog, on the cart page and in the contact-page widget.
 */

export interface PrePayState {
  contact: ContactPrefs;
  name: string;
  phone: string;
  email: string;
}

export const initialPrePay = (): PrePayState => {
  const guest = readGuest();
  return {
    contact: { whatsapp: true, email: false, call: false },
    name: guest.name ?? '',
    phone: guest.phone ?? '',
    email: guest.email ?? '',
  };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A message for the guest when something they chose needs a detail, else ''. */
export const prePayProblem = (state: PrePayState, locale: string): string => {
  if (state.contact.email && !EMAIL.test(state.email.trim())) {
    return localeText(locale, {
      en: 'Please add your email address — or untick email.',
      es: 'Escribe tu correo electrónico — o quita la opción de email.',
      de: 'Bitte E-Mail-Adresse eintragen — oder E-Mail abwählen.',
      fr: 'Indiquez votre adresse e-mail — ou décochez l’e-mail.',
    });
  }
  if (state.contact.call && state.phone.replace(/\D/g, '').length < 6) {
    return localeText(locale, {
      en: 'Please add the number we should call.',
      es: 'Escribe el número al que te llamamos.',
      de: 'Bitte die Nummer eintragen, unter der wir anrufen sollen.',
      fr: 'Indiquez le numéro auquel vous appeler.',
    });
  }
  return '';
};

type Method = 'paypal' | 'card' | 'card-link' | string;

interface Props {
  value: PrePayState;
  onChange: (next: PrePayState) => void;
  locale: string;
  /** Email is only offered when the site can actually send one. */
  emailAvailable: boolean;
  method: Method;
  tone?: 'dark' | 'light';
  /** Leave out the tips (the caller shows its own). */
  hideTips?: boolean;
}

const PrePayDetails: React.FC<Props> = ({ value, onChange, locale, emailAvailable, method, tone = 'dark', hideTips = false }) => {
  const dark = tone === 'dark';
  const set = (patch: Partial<PrePayState>) => onChange({ ...value, ...patch });
  const toggle = (key: keyof ContactPrefs) => set({ contact: { ...value.contact, [key]: !value.contact[key] } });

  const t = {
    how: localeText(locale, {
      en: 'How should we confirm your booking?',
      es: '¿Cómo te confirmamos la reserva?',
      de: 'Wie sollen wir Ihre Buchung bestätigen?',
      fr: 'Comment confirmer votre réservation ?',
    }),
    whatsapp: 'WhatsApp',
    email: 'Email',
    call: localeText(locale, { en: 'Call me', es: 'Llámame', de: 'Anruf', fr: 'Appel' }),
    name: localeText(locale, { en: 'Your name', es: 'Tu nombre', de: 'Ihr Name', fr: 'Votre nom' }),
    phone: localeText(locale, { en: 'WhatsApp / phone', es: 'WhatsApp / teléfono', de: 'WhatsApp / Telefon', fr: 'WhatsApp / téléphone' }),
    phoneHint: localeText(locale, { en: 'with country code, e.g. +1 809…', es: 'con código de país, p. ej. +1 809…', de: 'mit Ländervorwahl, z. B. +49…', fr: 'avec l’indicatif, p. ex. +33…' }),
    mail: localeText(locale, { en: 'Email address', es: 'Correo electrónico', de: 'E-Mail-Adresse', fr: 'Adresse e-mail' }),
    receipt:
      method === 'paypal'
        ? localeText(locale, {
            en: 'Keep the PayPal receipt — PayPal emails it to you.',
            es: 'Guarda el recibo de PayPal — PayPal te lo envía por correo.',
            de: 'Bewahren Sie die PayPal-Quittung auf — PayPal schickt sie per E-Mail.',
            fr: 'Gardez le reçu PayPal — PayPal vous l’envoie par e-mail.',
          })
        : localeText(locale, {
            en: 'Keep the payment receipt your bank or the payment page gives you.',
            es: 'Guarda el comprobante que te da tu banco o la página de pago.',
            de: 'Bewahren Sie den Beleg Ihrer Bank bzw. der Zahlungsseite auf.',
            fr: 'Gardez le reçu donné par votre banque ou la page de paiement.',
          }),
    screenshot: localeText(locale, {
      en: 'Take a screenshot of the confirmation page, for your records.',
      es: 'Haz una captura de pantalla de la confirmación, para tus registros.',
      de: 'Machen Sie einen Screenshot der Bestätigungsseite für Ihre Unterlagen.',
      fr: 'Faites une capture d’écran de la page de confirmation, pour vos archives.',
    }),
    back: localeText(locale, {
      en: 'Then come back to this tab — one tap tells us it worked.',
      es: 'Luego vuelve a esta pestaña — con un toque nos dices si funcionó.',
      de: 'Kommen Sie danach zu diesem Tab zurück — ein Tipp sagt uns, ob es geklappt hat.',
      fr: 'Puis revenez sur cet onglet — un geste suffit pour nous dire que c’est bon.',
    }),
  };

  const chip = (key: keyof ContactPrefs, icon: React.ReactNode, label: string) => {
    const on = value.contact[key];
    return (
      <button
        type="button"
        key={key}
        aria-pressed={on}
        onClick={() => toggle(key)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
          on
            ? dark
              ? 'border-jungle-light bg-jungle text-paper'
              : 'border-jungle bg-jungle text-paper'
            : dark
            ? 'border-paper/30 text-paper/80 hover:border-paper/60'
            : 'border-ink/20 text-ink-soft hover:border-ink/50'
        }`}
      >
        {icon}
        {label}
        <span aria-hidden="true">{on ? '✓' : '+'}</span>
      </button>
    );
  };

  const field = dark
    ? 'w-full rounded-xl border border-paper/25 bg-paper/10 px-3 py-2 text-sm text-paper placeholder:text-paper/40 outline-none focus:border-sky-light'
    : 'w-full rounded-xl border border-ink/20 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-lagoon';
  const label = dark ? 'mb-1 block text-[0.65rem] font-bold uppercase tracking-wider text-paper/60' : 'mb-1 block text-xs font-semibold text-ink-soft';
  const showPhone = value.contact.whatsapp || value.contact.call;

  return (
    <div className="space-y-3 text-left">
      <div>
        <div className={dark ? 'mb-2 text-xs font-bold text-paper' : 'mb-2 text-sm font-bold text-ink'}>{t.how}</div>
        <div className="flex flex-wrap gap-2">
          {chip('whatsapp', <FaWhatsapp />, t.whatsapp)}
          {emailAvailable && chip('email', <FaEnvelope />, t.email)}
          {chip('call', <FaPhoneAlt />, t.call)}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className={label}>{t.name}</span>
          <input type="text" value={value.name} maxLength={80} autoComplete="name" onChange={(e) => set({ name: e.target.value })} className={field} />
        </label>
        {showPhone && (
          <label className="block">
            <span className={label}>{t.phone}</span>
            <input
              type="tel"
              value={value.phone}
              maxLength={40}
              autoComplete="tel"
              placeholder={t.phoneHint}
              onChange={(e) => set({ phone: e.target.value })}
              className={field}
            />
          </label>
        )}
        {value.contact.email && emailAvailable && (
          <label className="block sm:col-span-2">
            <span className={label}>{t.mail}</span>
            <input type="email" value={value.email} maxLength={120} autoComplete="email" onChange={(e) => set({ email: e.target.value })} className={field} />
          </label>
        )}
      </div>
      {!hideTips && (
        <ul
          className={`space-y-1.5 rounded-2xl p-3 text-xs leading-snug ${
            dark ? 'border border-mango-light/30 bg-mango/10 text-paper/85' : 'border border-mango/40 bg-mango-light/40 text-ink'
          }`}
        >
          <li>🧾 {t.receipt}</li>
          <li>📸 {t.screenshot}</li>
          <li>↩️ {t.back}</li>
        </ul>
      )}
    </div>
  );
};

export default PrePayDetails;
