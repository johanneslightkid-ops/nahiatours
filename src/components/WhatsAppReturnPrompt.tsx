import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { useI18n } from '../contexts/I18nContext';
import { localeText } from '../lib/localeText';
import { readGuest, rememberGuest } from '../lib/guestMemory';
import { summariseDeparture, WhatsAppDeparture } from '../lib/whatsappReturn';
import { submitContactRequest } from '../services/contactRequestService';

type Step = 'ask' | 'pay' | 'callback' | 'other' | 'fine' | 'called';

/**
 * "How did it go on WhatsApp?" — asked when a guest comes back to the tab
 * after the site sent them to WhatsApp.
 *
 * Each answer leads straight to the useful next thing: paying the agreed
 * amount (the payment widget on the contact page, amount filled in), a call
 * back when nobody answered (kept on the server for the operator, the guest's
 * details remembered for next time), or a message (the contact form, written
 * for them). It is asked once per trip to WhatsApp and is never in the way:
 * one tap closes it.
 */
const WhatsAppReturnPrompt: React.FC<{ departure: WhatsAppDeparture; onClose: () => void }> = ({ departure, onClose }) => {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const summary = useMemo(() => summariseDeparture(departure), [departure]);
  const guest = useMemo(readGuest, []);

  const [step, setStep] = useState<Step>('ask');
  const [amount, setAmount] = useState(summary.amount ? String(summary.amount) : '');
  const [reference, setReference] = useState(summary.topic);
  const [name, setName] = useState(guest.name ?? '');
  const [phone, setPhone] = useState(guest.phone ?? '');
  const [when, setWhen] = useState('asap');
  const [channel, setChannel] = useState<'call' | 'whatsapp'>('call');
  const [message, setMessage] = useState(summary.topic ? `${summary.topic}\n\n` : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const L = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);
  const t = {
    title: L({ en: 'Welcome back! How did it go on WhatsApp?', es: '¡Bienvenido de vuelta! ¿Cómo te fue por WhatsApp?', de: 'Willkommen zurück! Wie lief es auf WhatsApp?', fr: 'Bon retour ! Comment ça s’est passé sur WhatsApp ?' }),
    about: L({ en: 'About', es: 'Sobre', de: 'Zu', fr: 'Au sujet de' }),
    pay: L({ en: 'I booked — I’d like to pay now', es: 'Reservé — quiero pagar ahora', de: 'Gebucht — ich möchte jetzt bezahlen', fr: 'J’ai réservé — je veux payer maintenant' }),
    payHint: L({ en: 'A deposit or the amount we agreed', es: 'Un depósito o el monto acordado', de: 'Anzahlung oder vereinbarter Betrag', fr: 'Un acompte ou le montant convenu' }),
    callback: L({ en: 'Nobody answered — please call me back', es: 'Nadie respondió — llámenme por favor', de: 'Niemand hat geantwortet — bitte ruft mich zurück', fr: 'Personne n’a répondu — rappelez-moi' }),
    callbackHint: L({ en: 'Leave your number, we get back to you', es: 'Deja tu número y te contactamos', de: 'Hinterlass deine Nummer, wir melden uns', fr: 'Laissez votre numéro, on vous recontacte' }),
    fine: L({ en: 'All good — we’re chatting', es: 'Todo bien — estamos hablando', de: 'Alles gut — wir schreiben schon', fr: 'Tout va bien — on discute' }),
    fineHint: L({ en: 'Nothing else needed right now', es: 'No necesito nada más por ahora', de: 'Gerade brauche ich nichts weiter', fr: 'Rien d’autre pour l’instant' }),
    other: L({ en: 'Something else — leave a message', es: 'Otra cosa — dejar un mensaje', de: 'Etwas anderes — Nachricht hinterlassen', fr: 'Autre chose — laisser un message' }),
    otherHint: L({ en: 'We answer by email or phone', es: 'Respondemos por email o teléfono', de: 'Wir antworten per E-Mail oder Telefon', fr: 'Réponse par e-mail ou téléphone' }),
    amount: L({ en: 'Amount (US$)', es: 'Monto (US$)', de: 'Betrag (US$)', fr: 'Montant (US$)' }),
    forWhat: L({ en: 'What is it for?', es: '¿Para qué es?', de: 'Wofür?', fr: 'Pour quoi ?' }),
    toPay: L({ en: 'Continue to payment', es: 'Continuar al pago', de: 'Weiter zur Zahlung', fr: 'Continuer vers le paiement' }),
    name: L({ en: 'Name', es: 'Nombre', de: 'Name', fr: 'Nom' }),
    phone: L({ en: 'Phone (with country code)', es: 'Teléfono (con código de país)', de: 'Telefon (mit Ländervorwahl)', fr: 'Téléphone (avec indicatif)' }),
    whenLabel: L({ en: 'When suits you?', es: '¿Cuándo te viene bien?', de: 'Wann passt es dir?', fr: 'Quand vous arrange ?' }),
    asap: L({ en: 'As soon as possible', es: 'Lo antes posible', de: 'So bald wie möglich', fr: 'Dès que possible' }),
    morning: L({ en: 'Morning', es: 'Mañana', de: 'Vormittag', fr: 'Matin' }),
    afternoon: L({ en: 'Afternoon', es: 'Tarde', de: 'Nachmittag', fr: 'Après-midi' }),
    evening: L({ en: 'Evening', es: 'Noche', de: 'Abend', fr: 'Soir' }),
    how: L({ en: 'How?', es: '¿Cómo?', de: 'Wie?', fr: 'Comment ?' }),
    call: L({ en: 'Phone call', es: 'Llamada', de: 'Anruf', fr: 'Appel' }),
    send: L({ en: 'Please call me back', es: 'Llámenme', de: 'Bitte zurückrufen', fr: 'Rappelez-moi' }),
    called: L({ en: 'Got it — we’ll get back to you on that number. Your details are saved on this device for next time.', es: 'Listo — te contactamos a ese número. Tus datos quedan guardados en este dispositivo para la próxima vez.', de: 'Alles klar — wir melden uns unter dieser Nummer. Deine Angaben bleiben für das nächste Mal auf diesem Gerät gespeichert.', fr: 'C’est noté — nous vous recontactons à ce numéro. Vos coordonnées restent sur cet appareil pour la prochaine fois.' }),
    fineDone: L({ en: 'Great — enjoy the chat! When it’s time to pay a deposit, the contact page takes any amount.', es: '¡Genial — disfruta la charla! Cuando toque pagar un depósito, la página de contacto acepta cualquier monto.', de: 'Super — viel Spaß beim Planen! Für eine Anzahlung nimmt die Kontaktseite jeden Betrag.', fr: 'Parfait — bonne discussion ! Pour un acompte, la page contact accepte n’importe quel montant.' }),
    message: L({ en: 'Your message', es: 'Tu mensaje', de: 'Deine Nachricht', fr: 'Votre message' }),
    toForm: L({ en: 'Open the contact form', es: 'Abrir el formulario de contacto', de: 'Kontaktformular öffnen', fr: 'Ouvrir le formulaire de contact' }),
    back: L({ en: 'Back', es: 'Atrás', de: 'Zurück', fr: 'Retour' }),
    close: L({ en: 'Close', es: 'Cerrar', de: 'Schließen', fr: 'Fermer' }),
    needPhone: L({ en: 'Please enter a phone number.', es: 'Escribe un número de teléfono.', de: 'Bitte gib eine Telefonnummer ein.', fr: 'Indiquez un numéro de téléphone.' }),
    badAmount: L({ en: 'Enter the amount in US$.', es: 'Escribe el monto en US$.', de: 'Gib den Betrag in US$ ein.', fr: 'Indiquez le montant en US$.' }),
  };

  const goPay = () => {
    const value = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(value) || value < 1) return setError(t.badAmount);
    onClose();
    navigate(`/contact?pay=${value}&ref=${encodeURIComponent(reference.trim())}#pay`);
  };

  const sendCallback = async () => {
    if (phone.replace(/\D/g, '').length < 6) return setError(t.needPhone);
    setBusy(true);
    setError('');
    try {
      rememberGuest({ name, phone });
      await submitContactRequest({
        kind: 'callback',
        name,
        phone,
        when: `${{ asap: t.asap, morning: t.morning, afternoon: t.afternoon, evening: t.evening }[when] ?? when} · ${channel === 'call' ? t.call : 'WhatsApp'}`,
        context: summary.topic,
        message: departure.text.slice(0, 600),
        locale,
      });
      setStep('called');
    } catch (failure: any) {
      setError(failure?.message || 'Could not send.');
    } finally {
      setBusy(false);
    }
  };

  const goForm = () => {
    onClose();
    navigate(`/contact?msg=${encodeURIComponent(message.trim())}#contact-form`);
  };

  const choice = (emoji: string, label: string, hint: string, next: Step) => (
    <button
      type="button"
      onClick={() => {
        setError('');
        setStep(next);
      }}
      className="flex w-full items-center gap-3 rounded-2xl border border-ink/15 bg-paper p-3.5 text-left transition-colors hover:border-ink/40 active:scale-[0.99]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mango-light text-xl">{emoji}</span>
      <span className="min-w-0">
        <span className="block font-bold leading-snug text-ink">{label}</span>
        <span className="block text-sm text-ink-soft">{hint}</span>
      </span>
    </button>
  );

  const field = 'w-full rounded-xl border border-ink/20 bg-paper p-3 text-ink';
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-bold ${on ? 'border-ink bg-mango-light text-ink' : 'border-ink/20 text-ink-soft'}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={t.title} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-paper p-5 shadow-ink-sm sm:rounded-[28px] sm:p-7"
      >
        <div className="mb-4 flex items-start gap-3">
          <h2 className="flex-1 font-display text-xl font-extrabold leading-snug text-ink sm:text-2xl">{t.title}</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-ink/10">
            <MdClose className="h-5 w-5" />
          </button>
        </div>
        {summary.topic && step === 'ask' && (
          <p className="-mt-2 mb-4 truncate text-sm text-ink-soft">
            {t.about}: <span className="font-semibold text-ink">{summary.topic}</span>
          </p>
        )}

        {step === 'ask' && (
          <div className="space-y-2.5">
            {choice('💳', t.pay, t.payHint, 'pay')}
            {choice('📞', t.callback, t.callbackHint, 'callback')}
            {choice('👍', t.fine, t.fineHint, 'fine')}
            {choice('✍️', t.other, t.otherHint, 'other')}
          </div>
        )}

        {step === 'pay' && (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-soft">{t.amount}</span>
              <input type="number" inputMode="decimal" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} text-xl font-bold`} autoFocus />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-soft">{t.forWhat}</span>
              <input type="text" value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} className={field} />
            </label>
            <button type="button" onClick={goPay} className="tropical-button w-full">{t.toPay}</button>
          </div>
        )}

        {step === 'callback' && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-soft">{t.name}</span>
                <input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={field} autoComplete="name" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-soft">{t.phone}</span>
                <input type="tel" value={phone} maxLength={40} onChange={(e) => setPhone(e.target.value)} className={field} autoComplete="tel" placeholder="+1 555 123 4567" />
              </label>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink-soft">{t.whenLabel}</span>
              <div className="flex flex-wrap gap-2">
                {(['asap', 'morning', 'afternoon', 'evening'] as const).map((slot) => (
                  <button key={slot} type="button" onClick={() => setWhen(slot)} className={chip(when === slot)}>
                    {t[slot]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink-soft">{t.how}</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setChannel('call')} className={chip(channel === 'call')}>📞 {t.call}</button>
                <button type="button" onClick={() => setChannel('whatsapp')} className={chip(channel === 'whatsapp')}>💬 WhatsApp</button>
              </div>
            </div>
            <button type="button" onClick={sendCallback} disabled={busy} className="tropical-button w-full disabled:opacity-60">{t.send}</button>
          </div>
        )}

        {step === 'other' && (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-soft">{t.message}</span>
              <textarea rows={5} value={message} maxLength={1500} onChange={(e) => setMessage(e.target.value)} className={field} autoFocus />
            </label>
            <button type="button" onClick={goForm} className="tropical-button w-full">{t.toForm}</button>
          </div>
        )}

        {(step === 'fine' || step === 'called') && (
          <div className="space-y-4">
            <p className="text-base leading-relaxed text-ink">{step === 'fine' ? t.fineDone : t.called}</p>
            <button type="button" onClick={onClose} className="tropical-button w-full">{t.close}</button>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-hibiscus-dark">{error}</p>}
        {step !== 'ask' && step !== 'fine' && step !== 'called' && (
          <button type="button" onClick={() => setStep('ask')} className="mt-3 text-sm font-semibold text-ink-soft underline">
            {t.back}
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default WhatsAppReturnPrompt;
