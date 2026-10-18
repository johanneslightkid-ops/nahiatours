import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaCreditCard, FaPaypal, FaWhatsapp } from 'react-icons/fa';
import { MdLockOutline } from 'react-icons/md';
import { useBrand } from '../../contexts/BrandContext';
import { useI18n } from '../../contexts/I18nContext';
import { localeText } from '../../lib/localeText';
import { readGuest, rememberGuest } from '../../lib/guestMemory';
import { getCardPaymentLink, getPaymentMethodStates } from '../../utils/paymentMethods';
import {
  fillPaymentLink,
  getPaymentsReady,
  postToGateway,
  startCardCheckout,
  PaymentsReady,
} from '../../services/paymentService';
import { submitContactRequest } from '../../services/contactRequestService';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { startAttempt } from '../../lib/paymentAttempt';
import { getNotifyFlags } from '../../services/notifyService';

/**
 * Pay an amount, any amount.
 *
 * Booking here is often a WhatsApp conversation that ends with "send us a
 * deposit of $80". This is where that happens: the guest types the amount and
 * what it is for, and pays by card through whichever processor the operator
 * set up, or by PayPal, with the amount already filled in. A link such as
 * /contact?pay=80&ref=Saona%2012%20Oct#pay opens it ready to go — the
 * WhatsApp return prompt sends guests here that way.
 *
 * The amount is the guest's own (there is no catalogue item behind it), so the
 * server bounds it and records it as client-priced; see shared/bookingPrice.ts.
 */
const MIN = 1;
const MAX = 50_000;
const QUICK = [50, 100, 200, 500];

const payPalUrl = (base: string, amount: number) => {
  const clean = base.trim().replace(/\/+$/, '').replace(/\/\d+(?:\.\d+)?(?:USD)?$/i, '');
  return clean ? `${clean}/${amount}USD` : '';
};

const QuickPay: React.FC<{ id?: string }> = ({ id = 'pay' }) => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const [searchParams] = useSearchParams();
  const guest = useMemo(readGuest, []);

  const [amount, setAmount] = useState(() => {
    const value = Number(searchParams.get('pay'));
    return Number.isFinite(value) && value >= MIN && value <= MAX ? String(value) : '';
  });
  const [reference, setReference] = useState(() => (searchParams.get('ref') ?? '').slice(0, 100));
  const [name, setName] = useState(guest.name ?? '');
  const [email, setEmail] = useState(guest.email ?? '');
  const [ready, setReady] = useState<PaymentsReady | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [left, setLeft] = useState<'' | 'card' | 'paypal'>('');

  const [guestEmail, setGuestEmail] = useState(false);

  useEffect(() => {
    getPaymentsReady().then(setReady);
    getNotifyFlags().then((flags) => setGuestEmail(flags.guestEmail));
  }, []);

  // Arriving with an amount in the link: bring the widget into view.
  useEffect(() => {
    if (searchParams.get('pay') || window.location.hash === `#${id}`) {
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = {
    kicker: localeText(locale, { en: 'Pay online', es: 'Pagar en línea', de: 'Online bezahlen', fr: 'Payer en ligne' }),
    title: localeText(locale, { en: 'Pay a deposit or an agreed amount', es: 'Paga un depósito o el monto acordado', de: 'Anzahlung oder vereinbarten Betrag zahlen', fr: 'Payer un acompte ou le montant convenu' }),
    blurb: localeText(locale, {
      en: 'Booked with us on WhatsApp? Enter the amount we agreed and what it is for — we match it to your booking.',
      es: '¿Reservaste con nosotros por WhatsApp? Escribe el monto acordado y para qué es — lo asociamos a tu reserva.',
      de: 'Per WhatsApp gebucht? Gib den vereinbarten Betrag ein und wofür er ist — wir ordnen ihn deiner Buchung zu.',
      fr: 'Réservé avec nous sur WhatsApp ? Indiquez le montant convenu et son objet — nous le rattachons à votre réservation.',
    }),
    amount: localeText(locale, { en: 'Amount (US$)', es: 'Monto (US$)', de: 'Betrag (US$)', fr: 'Montant (US$)' }),
    reference: localeText(locale, { en: 'What is it for?', es: '¿Para qué es?', de: 'Wofür ist es?', fr: 'Pour quoi ?' }),
    referenceHint: localeText(locale, { en: 'e.g. Saona, 12 Oct, 2 adults', es: 'p. ej. Saona, 12 oct, 2 adultos', de: 'z. B. Saona, 12. Okt., 2 Erwachsene', fr: 'p. ex. Saona, 12 oct., 2 adultes' }),
    name: localeText(locale, { en: 'Your name', es: 'Tu nombre', de: 'Dein Name', fr: 'Votre nom' }),
    email: localeText(locale, { en: 'Email (for the receipt)', es: 'Email (para el recibo)', de: 'E-Mail (für die Quittung)', fr: 'E-mail (pour le reçu)' }),
    card: localeText(locale, { en: 'Pay by card', es: 'Pagar con tarjeta', de: 'Mit Karte zahlen', fr: 'Payer par carte' }),
    paypal: localeText(locale, { en: 'Pay with PayPal', es: 'Pagar con PayPal', de: 'Mit PayPal zahlen', fr: 'Payer avec PayPal' }),
    secure: localeText(locale, { en: 'You pay on the secure page of the card processor; we never see your card.', es: 'Pagas en la página segura del procesador; nunca vemos tu tarjeta.', de: 'Du zahlst auf der sicheren Seite des Zahlungsanbieters; deine Karte sehen wir nie.', fr: 'Vous payez sur la page sécurisée du prestataire ; nous ne voyons jamais votre carte.' }),
    badAmount: localeText(locale, { en: `Enter an amount between ${MIN} and ${MAX.toLocaleString()} US$.`, es: `Escribe un monto entre ${MIN} y ${MAX.toLocaleString('es')} US$.`, de: `Gib einen Betrag zwischen ${MIN} und ${MAX.toLocaleString('de')} US$ ein.`, fr: `Indiquez un montant entre ${MIN} et ${MAX.toLocaleString('fr')} US$.` }),
    none: localeText(locale, { en: 'Online payment is not switched on yet — message us on WhatsApp and we will send you a payment link.', es: 'El pago en línea aún no está activo — escríbenos por WhatsApp y te enviamos un enlace de pago.', de: 'Online-Zahlung ist noch nicht aktiv — schreib uns auf WhatsApp, wir schicken dir einen Zahlungslink.', fr: 'Le paiement en ligne n’est pas encore activé — écrivez-nous sur WhatsApp et nous vous enverrons un lien de paiement.' }),
    tell: localeText(locale, { en: 'Paid? Tell us on WhatsApp', es: '¿Pagaste? Avísanos por WhatsApp', de: 'Bezahlt? Sag uns auf WhatsApp Bescheid', fr: 'Payé ? Dites-le-nous sur WhatsApp' }),
    opened: localeText(locale, { en: 'The payment page opened in a new tab. When you are done, let us know so we can confirm right away.', es: 'La página de pago se abrió en otra pestaña. Cuando termines, avísanos y confirmamos enseguida.', de: 'Die Zahlungsseite ist in einem neuen Tab offen. Sag uns danach Bescheid, dann bestätigen wir sofort.', fr: 'La page de paiement s’est ouverte dans un nouvel onglet. Une fois terminé, prévenez-nous pour une confirmation immédiate.' }),
    approx: (value: string) => localeText(locale, { en: `Charged as about ${value}`, es: `Se cobra aprox. ${value}`, de: `Belastet als ca. ${value}`, fr: `Débité environ ${value}` }),
    payFor: localeText(locale, { en: 'Payment', es: 'Pago', de: 'Zahlung', fr: 'Paiement' }),
    tips: localeText(locale, {
      en: '🧾 Keep the receipt · 📸 take a screenshot of it · ↩️ then come back to this tab and tell us it worked.',
      es: '🧾 Guarda el recibo · 📸 hazle una captura de pantalla · ↩️ luego vuelve a esta pestaña y dinos si funcionó.',
      de: '🧾 Beleg aufbewahren · 📸 Screenshot machen · ↩️ dann zu diesem Tab zurückkommen und Bescheid geben.',
      fr: '🧾 Gardez le reçu · 📸 faites-en une capture · ↩️ puis revenez sur cet onglet nous dire si c’est bon.',
    }),
  };

  const cardReady = Boolean(ready?.card);
  const methods = getPaymentMethodStates(brandSettings, cardReady);
  const cardLink = getCardPaymentLink(brandSettings);
  const value = Number(String(amount).replace(',', '.'));
  const valid = Number.isFinite(value) && value >= MIN && value <= MAX;
  const label = `${t.payFor}: ${reference.trim() || brandSettings.brandName}`.slice(0, 120);

  const pesos =
    valid && ready?.currency === 'DOP' && ready.dopPerUsd
      ? `RD$ ${Math.round(value * ready.dopPerUsd).toLocaleString('es-DO')}`
      : '';

  // Kept for the operator, whether or not the guest finishes paying.
  const record = (method: string) => {
    rememberGuest({ name, email });
    submitContactRequest({
      kind: 'payment',
      name,
      email,
      phone: guest.phone ?? '',
      amount: value,
      context: `${reference.trim()} · ${method}`.slice(0, 280),
      message: '',
      locale,
    }).catch(() => undefined);
  };

  /** The payment the guest is leaving to make, so the site can ask how it went. */
  const attempt = (method: string, retryUrl?: string) =>
    startAttempt({
      method,
      source: 'contact',
      total: value,
      items: [{ title: reference.trim() || t.payFor, persons: 1, total: value, category: 'custom' }],
      name: name.trim(),
      email: email.trim(),
      phone: guest.phone ?? '',
      contact: { whatsapp: true, email: guestEmail && /@/.test(email), call: false },
      locale,
      retryUrl,
    });

  const payByCard = async () => {
    if (!valid) return setError(t.badAmount);
    setError('');
    record('card');
    if (!cardReady) {
      // A payment link pasted in the admin: opened inside the click, before
      // any await, so the browser does not block it.
      if (cardLink) {
        const url = fillPaymentLink(cardLink, { amount: value, currency: 'USD', reference: label }).url;
        attempt('card-link', url);
        window.open(url, '_blank', 'noopener');
        setLeft('card');
      }
      return;
    }
    setBusy(true);
    try {
      const start = await startCardCheckout({
        category: 'custom',
        title: label,
        persons: 1,
        amount: value,
        locale,
        returnPath: '/contact',
      });
      attempt('card');
      if (start.kind === 'redirect') window.location.href = start.url;
      else postToGateway(start.action, start.fields);
    } catch (failure: any) {
      setBusy(false);
      setError(failure?.message || 'The secure payment page could not be opened.');
    }
  };

  const payByPayPal = () => {
    if (!valid) return setError(t.badAmount);
    setError('');
    record('PayPal');
    const url = payPalUrl(brandSettings.paypalMeLink ?? '', value);
    if (url) {
      attempt('paypal', url);
      window.open(url, '_blank', 'noopener');
      setLeft('paypal');
    }
  };

  const tellUrl = generateWhatsAppMessage(
    brandSettings.phoneNumber,
    `${localeText(locale, { en: 'Hello! I just paid', es: '¡Hola! Acabo de pagar', de: 'Hallo! Ich habe gerade', fr: 'Bonjour ! Je viens de payer' })} US$ ${valid ? value.toFixed(2) : amount}${locale === 'de' ? ' bezahlt' : ''} (${left === 'paypal' ? 'PayPal' : localeText(locale, { en: 'card', es: 'tarjeta', de: 'Karte', fr: 'carte' })}) — ${reference.trim() || '—'}${name ? ` · ${name}` : ''}`
  );

  const anyMethod = methods.card.visible || methods.paypal.visible;

  return (
    <section id={id} className="scroll-mt-28 rounded-[28px] border border-ink/15 bg-paper p-6 shadow-ink-sm md:p-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lagoon-dark">{t.kicker}</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold text-ink md:text-3xl">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.blurb}</p>

      {!anyMethod ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-ink/5 p-4 text-sm text-ink-soft">
          <span className="flex-1">{t.none}</span>
          {generateWhatsAppMessage(brandSettings.phoneNumber, '') && (
            <a href={generateWhatsAppMessage(brandSettings.phoneNumber, `${t.title}: ${reference}`)} target="_blank" rel="noreferrer" className="tropical-button gap-2">
              <FaWhatsapp /> WhatsApp
            </a>
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-soft">{t.amount}</span>
              <div className="flex items-center rounded-xl border border-ink/20 bg-paper focus-within:border-lagoon">
                <span className="pl-3 font-bold text-ink-soft">US$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={MIN}
                  max={MAX}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full bg-transparent p-3 text-xl font-bold text-ink outline-none"
                  style={{ border: 0, boxShadow: 'none', background: 'transparent' }}
                  placeholder="0.00"
                />
              </div>
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(String(quick))}
                  className={`rounded-full border px-3 py-1 text-sm font-bold ${
                    value === quick ? 'border-ink bg-mango-light text-ink' : 'border-ink/20 text-ink-soft hover:border-ink/50'
                  }`}
                >
                  ${quick}
                </button>
              ))}
            </div>
            {pesos && <p className="text-xs text-ink-soft">{t.approx(pesos)}</p>}
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink-soft">{t.reference}</span>
              <input
                type="text"
                value={reference}
                maxLength={100}
                placeholder={t.referenceHint}
                onChange={(event) => setReference(event.target.value)}
                className="w-full rounded-xl border border-ink/20 p-3"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-soft">{t.name}</span>
                <input type="text" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-ink/20 p-3" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-soft">{t.email}</span>
                <input type="email" value={email} maxLength={120} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-ink/20 p-3" />
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row">
              {methods.card.visible && (
                <button type="button" onClick={payByCard} disabled={busy} className="tropical-button w-full gap-2 disabled:opacity-60 sm:w-auto">
                  <FaCreditCard /> {t.card}{valid ? ` · US$ ${value.toFixed(2)}` : ''}
                </button>
              )}
              {methods.paypal.visible && (
                <button type="button" onClick={payByPayPal} className="tropical-button-outline w-full gap-2 sm:w-auto">
                  <FaPaypal /> {t.paypal}
                </button>
              )}
            </div>
            {error && <p className="mt-3 text-sm font-semibold text-hibiscus-dark">{error}</p>}
            <p className="mt-3 rounded-2xl border border-mango/40 bg-mango-light/40 px-3 py-2 text-xs text-ink">{t.tips}</p>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-soft">
              <MdLockOutline className="mt-0.5 h-4 w-4 shrink-0" /> {t.secure}
            </p>
            {left && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-lagoon-light/40 p-4 text-sm text-ink">
                <span className="flex-1">{t.opened}</span>
                {tellUrl && (
                  <a href={tellUrl} target="_blank" rel="noreferrer" data-no-return-prompt className="tropical-button-outline gap-2">
                    <FaWhatsapp /> {t.tell}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default QuickPay;
