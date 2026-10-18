import React, { useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSearchParams } from 'react-router-dom';
import { MdPerson, MdEmail, MdPhone, MdMessage, MdSend } from 'react-icons/md';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { useBrand } from '../contexts/BrandContext';
import { useI18n } from '../contexts/I18nContext';
import { localeText } from '../lib/localeText';
import { readGuest, rememberGuest } from '../lib/guestMemory';
import { submitContactRequest } from '../services/contactRequestService';
import { openWhatsAppQuietly } from '../lib/whatsappReturn';

/**
 * The contact form keeps the message first and talks second.
 *
 * It used to be only a WhatsApp link — addressed, by mistake, to the phone
 * number the guest typed in, so the message went to the guest themselves.
 * Now the message is stored for the operator (functions/api/contact-request)
 * and WhatsApp opens to the business with the same text, so nothing is lost
 * when WhatsApp does not connect. `?msg=` arrives pre-written from the
 * WhatsApp return prompt; name, email and phone are remembered on the device.
 */
const ContactForm = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const [searchParams] = useSearchParams();
  const guest = useMemo(readGuest, []);

  const [name, setName] = useState(guest.name ?? '');
  const [email, setEmail] = useState(guest.email ?? '');
  const [phone, setPhone] = useState(guest.phone ?? '');
  const [message, setMessage] = useState(() => (searchParams.get('msg') ?? '').slice(0, 1500));
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sent' | 'stored'>('idle');
  const [error, setError] = useState('');

  const stored = localeText(locale, {
    en: 'Thank you — your message is with us and we will reply soon.',
    es: 'Gracias — recibimos tu mensaje y te respondemos pronto.',
    de: 'Danke — deine Nachricht ist angekommen, wir antworten bald.',
    fr: 'Merci — votre message nous est parvenu, nous répondons vite.',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    rememberGuest({ name, email, phone });

    // WhatsApp first, inside the click, so the browser does not block it —
    // quietly: the message is stored, so there is nothing to ask on return.
    const text = `${localeText(locale, { en: 'Hello, my name is', es: 'Hola, mi nombre es', de: 'Hallo, ich heiße', fr: 'Bonjour, je m’appelle' })} ${name}. Email: ${email}. ${localeText(locale, { en: 'Phone', es: 'Teléfono', de: 'Telefon', fr: 'Téléphone' })}: ${phone}.\n\n${message}`;
    const whatsappUrl = generateWhatsAppMessage(brandSettings.phoneNumber, text);
    if (whatsappUrl) openWhatsAppQuietly(whatsappUrl);

    submitContactRequest({ kind: 'message', name, email, phone, message, website, locale })
      .then(() => setState(whatsappUrl ? 'sent' : 'stored'))
      .catch((failure) => {
        if (whatsappUrl) setState('sent');
        else setError(failure?.message || 'Your message could not be sent.');
      });
  };

  return (
    <div id="contact-form" className="glass-card w-full max-w-2xl scroll-mt-28 rounded-3xl p-8 md:p-10">
      <h2 className="mb-8 text-4xl font-bold text-ink">
        <FormattedMessage id="contact.title" />
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-1 inline-flex items-center gap-2 font-medium text-ink-soft"><MdPerson /> <FormattedMessage id="contact.name" /></span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-ink/20 p-3" autoComplete="name" required />
        </label>
        <label className="block">
          <span className="mb-1 inline-flex items-center gap-2 font-medium text-ink-soft"><MdEmail /> <FormattedMessage id="contact.email" /></span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-ink/20 p-3" autoComplete="email" required />
        </label>
        <label className="block">
          <span className="mb-1 inline-flex items-center gap-2 font-medium text-ink-soft"><MdPhone /> <FormattedMessage id="contact.phone" /></span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-ink/20 p-3" autoComplete="tel" required />
        </label>
        <label className="block">
          <span className="mb-1 inline-flex items-center gap-2 font-medium text-ink-soft"><MdMessage /> <FormattedMessage id="contact.message" /></span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-xl border border-ink/20 p-3" rows={5} required />
        </label>
        {/* For bots only: people never see this field. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        <button type="submit" className="tropical-button w-full gap-2">
          <MdSend /> <FormattedMessage id="contact.send" />
        </button>
        {state === 'sent' && <p className="font-medium text-lagoon-dark"><FormattedMessage id="contact.sent" /></p>}
        {state === 'stored' && <p className="font-medium text-lagoon-dark">{stored}</p>}
        {error && <p className="font-medium text-hibiscus-dark">{error}</p>}
      </form>
    </div>
  );
};

export default ContactForm;
