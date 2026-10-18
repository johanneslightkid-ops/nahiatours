import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheckCircle, FaExclamationTriangle, FaHourglassHalf, FaTimes, FaWhatsapp } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { localeText } from '../../lib/localeText';
import { rememberGuest } from '../../lib/guestMemory';
import { answerAttempt, AttemptOutcome, PendingAttempt } from '../../lib/paymentAttempt';
import { clearCart } from '../../lib/cart';
import { shareToWhatsApp, usd } from '../../lib/cartSummary';
import { getNotifyFlags } from '../../services/notifyService';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import PrePayDetails, { PrePayState, prePayProblem } from './PrePayDetails';

/**
 * "Welcome back — did the payment go through?"
 *
 * Shown when a guest returns from PayPal or a payment link. A payment that
 * worked gets a thank-you, a reminder to keep the receipt, and the operator
 * is told; one that did not gets reassurance first ("nothing is lost"), a way
 * to try again and a way to reach a person. Either way the guest picks how to
 * hear back. Not answering is an answer too: the server tells the operator
 * after the configured timeout that this payment may not have gone through.
 */

interface Props {
  attempt: PendingAttempt;
  /** The guest closed it without answering: ask again on the next visit, not now. */
  onSnooze: () => void;
  onClose: () => void;
}

type Step = 'ask' | AttemptOutcome | 'sent';

const PaymentConfirmPrompt: React.FC<Props> = ({ attempt, onSnooze, onClose }) => {
  const { brandSettings } = useBrand();
  const locale = attempt.locale || 'en';
  const brand = brandSettings.brandName || localeText(locale, { en: 'the team', es: 'el equipo', de: 'das Team', fr: 'l’équipe' });
  const [step, setStep] = useState<Step>('ask');
  const [answered, setAnswered] = useState<AttemptOutcome | null>(null);
  const [details, setDetails] = useState<PrePayState>({
    contact: attempt.contact,
    name: attempt.name ?? '',
    phone: attempt.phone ?? '',
    email: attempt.email ?? '',
  });
  const [note, setNote] = useState('');
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [sendReceipt, setSendReceipt] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receiptSent, setReceiptSent] = useState(false);

  useEffect(() => {
    getNotifyFlags().then((flags) => setEmailAvailable(flags.guestEmail));
  }, []);

  const what = useMemo(() => {
    const first = attempt.items[0]?.title ?? '';
    return attempt.items.length > 1
      ? `${first} + ${attempt.items.length - 1}`
      : first;
  }, [attempt.items]);

  const t = {
    welcome: localeText(locale, { en: 'Welcome back 👋', es: '¡Bienvenido de vuelta! 👋', de: 'Willkommen zurück 👋', fr: 'Bon retour 👋' }),
    ask: attempt.total
      ? localeText(locale, {
          en: `Did your payment of ${usd(attempt.total)} go through?`,
          es: `¿Se completó tu pago de ${usd(attempt.total)}?`,
          de: `Hat Ihre Zahlung über ${usd(attempt.total)} geklappt?`,
          fr: `Votre paiement de ${usd(attempt.total)} est-il passé ?`,
        })
      : localeText(locale, {
          en: 'Did your payment go through?',
          es: '¿Se completó tu pago?',
          de: 'Hat Ihre Zahlung geklappt?',
          fr: 'Votre paiement est-il passé ?',
        }),
    calm: localeText(locale, {
      en: 'Whatever happened, nothing is lost — one tap and we take it from here.',
      es: 'Pase lo que pase, nada se pierde — un toque y nosotros nos encargamos.',
      de: 'Was auch passiert ist: nichts geht verloren — ein Tipp, und wir kümmern uns.',
      fr: 'Quoi qu’il arrive, rien n’est perdu — un geste et nous prenons le relais.',
    }),
    yes: localeText(locale, { en: 'Yes, I paid', es: 'Sí, ya pagué', de: 'Ja, bezahlt', fr: 'Oui, j’ai payé' }),
    problem: localeText(locale, { en: 'Something went wrong', es: 'Algo salió mal', de: 'Etwas ging schief', fr: 'Un problème est survenu' }),
    later: localeText(locale, { en: 'Not yet — I’ll pay later', es: 'Todavía no — pago después', de: 'Noch nicht — später', fr: 'Pas encore — plus tard' }),
    thanks: localeText(locale, { en: 'Wonderful — thank you! 🎉', es: '¡Genial, muchas gracias! 🎉', de: 'Wunderbar — danke! 🎉', fr: 'Merveilleux — merci ! 🎉' }),
    thanksText: localeText(locale, {
      en: `${brand} will check the payment and confirm your booking personally.`,
      es: `${brand} revisa el pago y te confirma la reserva personalmente.`,
      de: `${brand} prüft die Zahlung und bestätigt Ihre Buchung persönlich.`,
      fr: `${brand} vérifie le paiement et confirme votre réservation personnellement.`,
    }),
    keep: localeText(locale, {
      en: 'Keep your receipt — and if you have not yet, take a screenshot of it now.',
      es: 'Guarda tu recibo — y si aún no lo hiciste, haz ahora una captura de pantalla.',
      de: 'Bewahren Sie Ihren Beleg auf — und machen Sie jetzt einen Screenshot, falls noch nicht geschehen.',
      fr: 'Gardez votre reçu — et si ce n’est pas encore fait, faites-en une capture d’écran.',
    }),
    sorry: localeText(locale, { en: 'No worries — we’ll sort it out', es: 'Tranquilo — lo resolvemos', de: 'Keine Sorge — wir klären das', fr: 'Pas d’inquiétude — on s’en occupe' }),
    sorryText: localeText(locale, {
      en: 'If money left your account, it is not lost: keep the receipt and we will match it. If nothing was charged, you can try again or pay another way.',
      es: 'Si se descontó dinero, no se pierde: guarda el comprobante y lo ubicamos. Si no se cobró nada, puedes intentarlo de nuevo o pagar de otra forma.',
      de: 'Wurde Geld abgebucht, ist es nicht verloren: Beleg aufbewahren, wir ordnen ihn zu. Wurde nichts belastet, können Sie es erneut versuchen oder anders zahlen.',
      fr: 'Si de l’argent a été débité, il n’est pas perdu : gardez le reçu, nous le retrouverons. Sinon, réessayez ou payez autrement.',
    }),
    what: localeText(locale, { en: 'What happened? (optional)', es: '¿Qué pasó? (opcional)', de: 'Was ist passiert? (optional)', fr: 'Que s’est-il passé ? (facultatif)' }),
    retry: localeText(locale, { en: 'Try again', es: 'Intentar de nuevo', de: 'Erneut versuchen', fr: 'Réessayer' }),
    send: localeText(locale, { en: 'Send', es: 'Enviar', de: 'Senden', fr: 'Envoyer' }),
    emailMe: localeText(locale, { en: 'Email me the summary', es: 'Envíame el resumen por email', de: 'Zusammenfassung per E-Mail', fr: 'M’envoyer le résumé par e-mail' }),
    laterTitle: localeText(locale, { en: 'No problem', es: 'Sin problema', de: 'Kein Problem', fr: 'Pas de souci' }),
    laterText: localeText(locale, {
      en: 'Your selection stays in your cart. Pay whenever you are ready — or ask us anything first.',
      es: 'Tu selección queda en el carrito. Paga cuando quieras — o pregúntanos lo que necesites.',
      de: 'Ihre Auswahl bleibt im Warenkorb. Zahlen Sie, wann Sie möchten — oder fragen Sie uns vorher.',
      fr: 'Votre sélection reste dans le panier. Payez quand vous voulez — ou posez-nous vos questions.',
    }),
    cart: localeText(locale, { en: 'Open my cart', es: 'Abrir mi carrito', de: 'Warenkorb öffnen', fr: 'Ouvrir mon panier' }),
    sentTitle: localeText(locale, { en: 'Thank you — we’ve got it', es: 'Gracias — recibido', de: 'Danke — angekommen', fr: 'Merci — bien reçu' }),
    sentText: (how: string) =>
      localeText(locale, {
        en: `${brand} has been told and will get back to you${how ? ` by ${how}` : ''} soon.`,
        es: `Avisamos a ${brand} y te contactará${how ? ` por ${how}` : ''} muy pronto.`,
        de: `${brand} ist informiert und meldet sich${how ? ` per ${how}` : ''} in Kürze.`,
        fr: `${brand} est prévenu et vous recontacte${how ? ` par ${how}` : ''} très vite.`,
      }),
    receiptOk: localeText(locale, { en: 'The summary is on its way to your inbox.', es: 'El resumen va camino a tu correo.', de: 'Die Zusammenfassung ist unterwegs in Ihr Postfach.', fr: 'Le résumé arrive dans votre boîte mail.' }),
    toSelf: localeText(locale, { en: 'Send myself the summary on WhatsApp', es: 'Enviarme el resumen por WhatsApp', de: 'Mir die Übersicht per WhatsApp schicken', fr: 'M’envoyer le résumé sur WhatsApp' }),
    chat: localeText(locale, { en: `Message ${brand} now`, es: `Escribir a ${brand} ahora`, de: `${brand} jetzt schreiben`, fr: `Écrire à ${brand} maintenant` }),
    close: localeText(locale, { en: 'Close', es: 'Cerrar', de: 'Schließen', fr: 'Fermer' }),
    askLater: localeText(locale, { en: 'Ask me later', es: 'Pregúntame después', de: 'Später fragen', fr: 'Me demander plus tard' }),
    failed: localeText(locale, {
      en: 'That did not go through — please message us on WhatsApp instead.',
      es: 'No se pudo enviar — escríbenos por WhatsApp, por favor.',
      de: 'Das hat nicht geklappt — bitte schreiben Sie uns auf WhatsApp.',
      fr: 'L’envoi a échoué — écrivez-nous sur WhatsApp, s’il vous plaît.',
    }),
  };

  const summary = [
    ...attempt.items.map((item) => `• ${item.title}${item.date ? ` — ${item.date}` : ''}${item.persons ? ` — ${item.persons} pax` : ''}`),
    attempt.total ? `Total: ${usd(attempt.total)}` : '',
    `Ref: ${attempt.id}`,
  ]
    .filter(Boolean)
    .join('\n');

  const operatorText = (outcome: AttemptOutcome) =>
    `${
      outcome === 'paid'
        ? localeText(locale, { en: 'Hello! I just paid', es: '¡Hola! Acabo de pagar', de: 'Hallo! Ich habe gerade bezahlt', fr: 'Bonjour ! Je viens de payer' })
        : localeText(locale, { en: 'Hello! I had a problem paying', es: '¡Hola! Tuve un problema al pagar', de: 'Hallo! Beim Bezahlen gab es ein Problem', fr: 'Bonjour ! J’ai eu un problème pour payer' })
    } (${attempt.method === 'paypal' ? 'PayPal' : localeText(locale, { en: 'card', es: 'tarjeta', de: 'Karte', fr: 'carte' })}):\n${summary}${details.name ? `\n${details.name}` : ''}`;
  const chatUrl = generateWhatsAppMessage(brandSettings.phoneNumber, operatorText(answered === 'problem' ? 'problem' : 'paid'));

  const how = [
    details.contact.whatsapp && 'WhatsApp',
    details.contact.email && 'email',
    details.contact.call && localeText(locale, { en: 'phone', es: 'teléfono', de: 'Telefon', fr: 'téléphone' }),
  ]
    .filter(Boolean)
    .join(' / ');

  const submit = async (outcome: AttemptOutcome) => {
    const problem = outcome === 'later' ? '' : prePayProblem(details, locale);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setBusy(true);
    rememberGuest({ name: details.name, phone: details.phone, email: details.email });
    const result = await answerAttempt(attempt, outcome, {
      contact: details.contact,
      name: details.name,
      phone: details.phone,
      email: details.email,
      note: note.trim() || undefined,
      sendReceipt: emailAvailable && sendReceipt && Boolean(details.email),
    });
    setBusy(false);
    if (outcome === 'paid' && attempt.clearsCart) clearCart('paid');
    setAnswered(outcome);
    setReceiptSent(Boolean(result.receipt));
    if (!result.ok && outcome !== 'later') setError(t.failed);
    setStep(outcome === 'later' ? 'later' : 'sent');
  };

  const choose = (outcome: AttemptOutcome) => {
    if (outcome === 'later') {
      void submit('later');
      return;
    }
    setStep(outcome);
  };

  const card = 'rounded-2xl border border-ink/10 bg-ink/5 p-3 text-xs text-ink-soft';

  return (
    <div className="fixed inset-0 z-[999998] flex items-end justify-center bg-ink/60 p-3 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="pay-confirm-title">
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-ink/15 bg-paper p-6 text-ink shadow-ink-lg">
        <button
          type="button"
          onClick={step === 'ask' ? onSnooze : onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-light hover:text-ink"
          aria-label={step === 'ask' ? t.askLater : t.close}
        >
          <FaTimes />
        </button>

        {step === 'ask' && (
          <>
            <p className="text-sm font-bold text-lagoon-dark">{t.welcome}</p>
            <h2 id="pay-confirm-title" className="mt-1 pr-8 font-display text-2xl font-extrabold leading-tight">
              {t.ask}
            </h2>
            <div className={`${card} mt-3`}>
              <div className="font-bold text-ink">{what}</div>
              <div>
                {attempt.method === 'paypal' ? 'PayPal' : localeText(locale, { en: 'Card', es: 'Tarjeta', de: 'Karte', fr: 'Carte' })}
                {attempt.total ? ` · ${usd(attempt.total)}` : ''}
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-soft">{t.calm}</p>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={() => choose('paid')} className="flex items-center gap-3 rounded-2xl bg-jungle px-4 py-3 text-left font-bold text-paper shadow-ink-sm transition hover:-translate-y-0.5">
                <FaCheckCircle className="h-5 w-5" /> {t.yes}
              </button>
              <button type="button" onClick={() => choose('problem')} className="flex items-center gap-3 rounded-2xl border border-sunset/50 bg-sunset-light/40 px-4 py-3 text-left font-bold text-ink transition hover:-translate-y-0.5">
                <FaExclamationTriangle className="h-5 w-5 text-sunset-dark" /> {t.problem}
              </button>
              <button type="button" onClick={() => choose('later')} disabled={busy} className="flex items-center gap-3 rounded-2xl border border-ink/15 px-4 py-3 text-left font-semibold text-ink-soft transition hover:-translate-y-0.5">
                <FaHourglassHalf className="h-5 w-5" /> {t.later}
              </button>
            </div>
            <button type="button" onClick={onSnooze} className="mt-3 w-full text-center text-xs font-semibold text-ink-light underline underline-offset-4">
              {t.askLater}
            </button>
          </>
        )}

        {(step === 'paid' || step === 'problem') && (
          <>
            <h2 id="pay-confirm-title" className="pr-8 font-display text-2xl font-extrabold leading-tight">
              {step === 'paid' ? t.thanks : t.sorry}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">{step === 'paid' ? t.thanksText : t.sorryText}</p>
            {step === 'paid' && <p className="mt-3 rounded-2xl border border-mango/40 bg-mango-light/40 p-3 text-sm text-ink">🧾📸 {t.keep}</p>}
            {step === 'problem' && (
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">{t.what}</span>
                <textarea value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-ink/20 bg-paper p-2 text-sm" />
              </label>
            )}
            <div className="mt-4">
              <PrePayDetails value={details} onChange={setDetails} locale={locale} emailAvailable={emailAvailable} method={attempt.method} tone="light" hideTips />
            </div>
            {emailAvailable && details.contact.email && (
              <label className="mt-3 flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={sendReceipt} onChange={(e) => setSendReceipt(e.target.checked)} /> {t.emailMe}
              </label>
            )}
            {error && <p className="mt-3 text-sm font-semibold text-hibiscus-dark">{error}</p>}
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" disabled={busy} onClick={() => submit(step)} className="rounded-full bg-lagoon px-5 py-3 font-extrabold text-paper shadow-ink-sm transition hover:-translate-y-0.5 disabled:opacity-60">
                {busy ? '…' : t.send}
              </button>
              {step === 'problem' && attempt.retryUrl && (
                <a href={attempt.retryUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-ink/20 px-5 py-2.5 text-center text-sm font-bold text-ink">
                  ↻ {t.retry}
                </a>
              )}
              <button type="button" onClick={() => setStep('ask')} className="text-xs font-semibold text-ink-light underline underline-offset-4">
                ←
              </button>
            </div>
          </>
        )}

        {step === 'later' && (
          <>
            <h2 id="pay-confirm-title" className="pr-8 font-display text-2xl font-extrabold">{t.laterTitle}</h2>
            <p className="mt-2 text-sm text-ink-soft">{t.laterText}</p>
            <div className="mt-4 flex flex-col gap-2" data-no-return-prompt>
              {attempt.source === 'cart' && (
                <Link to="/cart" onClick={onClose} className="rounded-full bg-lagoon px-5 py-3 text-center font-extrabold text-paper">
                  🛒 {t.cart}
                </Link>
              )}
              {chatUrl && (
                <a href={chatUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-jungle/40 px-5 py-2.5 text-sm font-bold text-jungle-dark">
                  <FaWhatsapp /> WhatsApp
                </a>
              )}
              <button type="button" onClick={onClose} className="text-xs font-semibold text-ink-light underline underline-offset-4">
                {t.close}
              </button>
            </div>
          </>
        )}

        {step === 'sent' && (
          <>
            <div className="flex items-center gap-3">
              <FaCheckCircle className="h-9 w-9 shrink-0 text-jungle" />
              <h2 id="pay-confirm-title" className="pr-8 font-display text-2xl font-extrabold leading-tight">{t.sentTitle}</h2>
            </div>
            <p className="mt-3 text-sm text-ink-soft">{t.sentText(how)}</p>
            {receiptSent && <p className="mt-2 text-sm font-semibold text-jungle-dark">✉️ {t.receiptOk}</p>}
            {answered === 'paid' && <p className="mt-3 rounded-2xl border border-mango/40 bg-mango-light/40 p-3 text-sm text-ink">🧾📸 {t.keep}</p>}
            {error && <p className="mt-3 text-sm font-semibold text-hibiscus-dark">{error}</p>}
            <div className="mt-4 flex flex-col gap-2" data-no-return-prompt>
              <a href={shareToWhatsApp(`${brand}\n${summary}`)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-bold text-ink">
                <FaWhatsapp /> {t.toSelf}
              </a>
              {chatUrl && (
                <a href={chatUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-jungle px-5 py-2.5 text-sm font-bold text-paper">
                  <FaWhatsapp /> {t.chat}
                </a>
              )}
              <button type="button" onClick={onClose} className="mt-1 text-xs font-semibold text-ink-light underline underline-offset-4">
                {t.close}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentConfirmPrompt;
