import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaCreditCard,
  FaEnvelope,
  FaMapMarkerAlt,
  FaMinus,
  FaMoneyBillWave,
  FaPaypal,
  FaPhoneAlt,
  FaPlus,
  FaPrint,
  FaRegClock,
  FaShoppingCart,
  FaTrashAlt,
  FaUsers,
  FaWhatsapp,
} from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { addToCart, CartItem, cartTotal, lineTotal, removeFromCart, updateCartItem, useCart } from '../../lib/cart';
import { buildCartText, formatCartDate, shareToWhatsApp, usd } from '../../lib/cartSummary';
import { localeText } from '../../lib/localeText';
import { readGuest, rememberGuest } from '../../lib/guestMemory';
import { track } from '../../lib/activity';
import { emailCartSummary, getNotifyFlags } from '../../services/notifyService';
import { getPaymentsReady, PaymentsReady } from '../../services/paymentService';
import { submitContactRequest } from '../../services/contactRequestService';
import { getPaymentMethodStates } from '../../utils/paymentMethods';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import PaymentDropdown from '../ui/PaymentDropdown';
import PrePayDetails, { initialPrePay, PrePayState, prePayProblem } from '../payment/PrePayDetails';

/**
 * The cart: everything a guest set aside, as a trip they can read at a
 * glance — what, when, where, how many, what it costs, what to remember —
 * and every way to turn it into a booking: reserve on WhatsApp, have the team
 * get in touch, pay it all now, or pay a deposit. The summary goes to the
 * guest's own WhatsApp or inbox, or onto paper.
 *
 * Shared by every site; each site's pages/Cart.tsx only dresses the top.
 */

const today = () => new Date().toISOString().slice(0, 10);

const Panel: React.FC<{ title?: React.ReactNode; icon?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ title, icon, className = '', children }) => (
  <section className={`rounded-[26px] border border-ink/10 bg-paper/95 p-5 shadow-ink-sm md:p-6 ${className}`}>
    {title && (
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold text-ink md:text-xl">
        {icon && <span className="text-lagoon-dark">{icon}</span>}
        {title}
      </h2>
    )}
    {children}
  </section>
);

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="rounded-2xl bg-ink/5 p-3">
    <div className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-ink-soft">
      {icon}
      {label}
    </div>
    <div className="mt-1 font-display text-lg font-extrabold leading-tight text-ink">{value}</div>
  </div>
);

const CartView: React.FC<{ locale: string }> = ({ locale }) => {
  const items = useCart();
  const { brandSettings } = useBrand();
  const [ready, setReady] = useState<PaymentsReady | null>(null);
  const [guestEmail, setGuestEmail] = useState(false);
  const [details, setDetails] = useState<PrePayState>(initialPrePay);
  const [removed, setRemoved] = useState<CartItem | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<'' | 'email' | 'request'>('');
  const [summaryEmail, setSummaryEmail] = useState(() => readGuest().email ?? '');

  useEffect(() => {
    getPaymentsReady().then(setReady);
    getNotifyFlags().then((flags) => setGuestEmail(flags.guestEmail));
    track('cart_view', { items: items.length, locale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rememberGuest({ name: details.name, phone: details.phone, email: details.email });
  }, [details.name, details.phone, details.email]);

  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(() => setRemoved(null), 6000);
    return () => window.clearTimeout(timer);
  }, [removed]);

  const L = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);
  const brand = brandSettings.brandName || L({ en: 'our team', es: 'nuestro equipo', de: 'unser Team', fr: 'notre équipe' });
  const total = cartTotal(items);
  const people = items.reduce((max, item) => Math.max(max, item.persons), 0);
  const seats = items.reduce((sum, item) => sum + item.persons, 0);
  const priced = items.every((item) => lineTotal(item) !== null);
  const dated = [...items].filter((item) => item.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const undated = items.filter((item) => !item.date);
  const places = [...new Set(items.map((item) => item.place).filter(Boolean) as string[])];
  const range =
    dated.length === 0
      ? '—'
      : dated.length === 1 || dated[0].date === dated[dated.length - 1].date
      ? formatCartDate(dated[0].date, locale)
      : `${formatCartDate(dated[0].date, locale)} – ${formatCartDate(dated[dated.length - 1].date, locale)}`;

  const methods = getPaymentMethodStates(brandSettings, Boolean(ready?.card));
  const canPayOnline = methods.card.visible || methods.paypal.visible;
  const phone = brandSettings.phoneNumber || '';
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '';

  const remember = useMemo(() => {
    const notes = new Set<string>();
    items.forEach((item) => item.goodToKnow?.forEach((note) => notes.add(note)));
    const water = items.some((item) => /boat|catamaran|island|isla|snorkel|beach|playa|saona|catalina|swim|insel|île|plage/i.test(`${item.title} ${item.description ?? ''}`));
    const generic = [
      L({
        en: 'We confirm every pick-up time personally, usually the day before.',
        es: 'Confirmamos personalmente cada hora de recogida, normalmente el día anterior.',
        de: 'Jede Abholzeit bestätigen wir persönlich, meist am Vortag.',
        fr: 'Nous confirmons personnellement chaque heure de prise en charge, en général la veille.',
      }),
      L({
        en: 'Have an ID or a photo of your passport with you.',
        es: 'Lleva un documento de identidad o una foto del pasaporte.',
        de: 'Haben Sie einen Ausweis oder ein Foto Ihres Reisepasses dabei.',
        fr: 'Ayez une pièce d’identité ou une photo de votre passeport.',
      }),
      water &&
        L({
          en: 'Sunscreen, swimwear and a towel for the days on the water.',
          es: 'Protector solar, traje de baño y toalla para los días en el agua.',
          de: 'Sonnencreme, Badesachen und ein Handtuch für die Tage auf dem Wasser.',
          fr: 'Crème solaire, maillot et serviette pour les journées en mer.',
        }),
      L({
        en: 'A little cash (US$ or RD$) for tips and extras.',
        es: 'Algo de efectivo (US$ o RD$) para propinas y extras.',
        de: 'Etwas Bargeld (US$ oder RD$) für Trinkgeld und Extras.',
        fr: 'Un peu d’espèces (US$ ou RD$) pour les pourboires et extras.',
      }),
    ].filter(Boolean) as string[];
    return [...notes].slice(0, 5).concat(generic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, locale]);

  const cartText = (intro: string) =>
    buildCartText(items, locale, { intro, brandName: brandSettings.brandName, phone, guestName: details.name.trim() });

  const reserveUrl = generateWhatsAppMessage(
    phone,
    cartText(
      L({
        en: 'Hello! I would like to book these:',
        es: '¡Hola! Me gustaría reservar esto:',
        de: 'Hallo! Ich möchte Folgendes buchen:',
        fr: 'Bonjour ! J’aimerais réserver ceci :',
      }) + '\n'
    )
  );

  const lineItems = items.map((item) => ({
    title: item.title,
    date: formatCartDate(item.date, locale) + (item.time ? ` ${item.time}` : ''),
    persons: item.persons,
    total: lineTotal(item),
    category: item.category,
    serviceId: item.serviceId,
    quantities: item.quantities,
  }));
  const payTitle =
    items.length === 1
      ? items[0].title
      : `${L({ en: 'Cart', es: 'Carrito', de: 'Warenkorb', fr: 'Panier' })}: ${items.length} × ${items.map((item) => item.title).join(', ')}`.slice(0, 118);

  const remove = (item: CartItem) => {
    removeFromCart(item.key);
    setRemoved(item);
  };

  const askForContact = async () => {
    const problem = prePayProblem(details, locale);
    const reachable = details.phone.replace(/\D/g, '').length >= 6 || /@/.test(details.email);
    if (problem || !reachable) {
      setNotice({
        tone: 'error',
        text:
          problem ||
          L({
            en: 'Leave a WhatsApp number or an email so we can reach you.',
            es: 'Deja un número de WhatsApp o un correo para poder contactarte.',
            de: 'Hinterlassen Sie eine WhatsApp-Nummer oder E-Mail, damit wir Sie erreichen.',
            fr: 'Laissez un numéro WhatsApp ou un e-mail pour que nous puissions vous joindre.',
          }),
      });
      return;
    }
    setBusy('request');
    setNotice(null);
    try {
      const ways = [details.contact.whatsapp && 'WhatsApp', details.contact.email && 'email', details.contact.call && 'call'].filter(Boolean).join(' + ');
      await submitContactRequest({
        kind: details.contact.call ? 'callback' : 'message',
        name: details.name,
        phone: details.phone,
        email: details.email,
        message: buildCartText(items, locale, { detail: false }).replace(/\*/g, ''),
        context: `🛒 ${items.length} · ${usd(total) || '—'} · ${ways || 'WhatsApp'}`,
        amount: total || null,
        locale,
      });
      track('contact', { source: 'cart', ways, total, items: items.length, locale });
      setNotice({
        tone: 'ok',
        text: L({
          en: `Thank you! ${brand} will get back to you personally very soon.`,
          es: `¡Gracias! ${brand} te contactará personalmente muy pronto.`,
          de: `Danke! ${brand} meldet sich sehr bald persönlich bei Ihnen.`,
          fr: `Merci ! ${brand} vous recontacte personnellement très vite.`,
        }),
      });
    } catch (failure: any) {
      setNotice({ tone: 'error', text: failure?.message || 'Error' });
    } finally {
      setBusy('');
    }
  };

  const emailSummary = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(summaryEmail.trim())) {
      setNotice({ tone: 'error', text: L({ en: 'Please check the email address.', es: 'Revisa el correo electrónico.', de: 'Bitte die E-Mail-Adresse prüfen.', fr: 'Vérifiez l’adresse e-mail.' }) });
      return;
    }
    setBusy('email');
    setNotice(null);
    try {
      rememberGuest({ email: summaryEmail.trim() });
      await emailCartSummary({ email: summaryEmail.trim(), name: details.name, locale, items: lineItems.map((line) => ({ ...line, persons: line.persons })) });
      track('summary_email', { items: items.length, total, locale });
      setNotice({ tone: 'ok', text: L({ en: 'Sent — check your inbox.', es: 'Enviado — revisa tu correo.', de: 'Gesendet — schauen Sie in Ihr Postfach.', fr: 'Envoyé — consultez votre boîte mail.' }) });
    } catch (failure: any) {
      setNotice({ tone: 'error', text: failure?.message || 'Error' });
    } finally {
      setBusy('');
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        {removed && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-paper">
            <span className="truncate">{L({ en: 'Removed', es: 'Quitado', de: 'Entfernt', fr: 'Retiré' })}: {removed.title}</span>
            <button type="button" className="font-bold text-mango-light underline" onClick={() => { addToCart(removed); setRemoved(null); }}>
              {L({ en: 'Undo', es: 'Deshacer', de: 'Rückgängig', fr: 'Annuler' })}
            </button>
          </div>
        )}
        <Panel>
          <div className="py-6 text-center">
            <FaShoppingCart className="mx-auto h-12 w-12 text-lagoon" />
            <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">
              {L({ en: 'Your cart is empty', es: 'Tu carrito está vacío', de: 'Ihr Warenkorb ist leer', fr: 'Votre panier est vide' })}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
              {L({
                en: 'Pick a tour or a transfer and tap “Add to cart” — collect your whole trip here and book it in one go.',
                es: 'Elige un tour o un traslado y toca «Añadir al carrito» — reúne aquí todo tu viaje y resérvalo de una vez.',
                de: 'Wählen Sie eine Tour oder einen Transfer und tippen Sie auf „In den Warenkorb“ — sammeln Sie hier Ihre ganze Reise und buchen Sie alles auf einmal.',
                fr: 'Choisissez une excursion ou un transfert et touchez « Ajouter au panier » — rassemblez ici tout votre voyage et réservez en une fois.',
              })}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/tours" className="rounded-full bg-lagoon px-5 py-2.5 font-extrabold text-paper shadow-ink-sm">
                {L({ en: 'See the tours', es: 'Ver los tours', de: 'Touren ansehen', fr: 'Voir les excursions' })}
              </Link>
              <Link to="/transport" className="rounded-full border border-ink/20 px-5 py-2.5 font-bold text-ink">
                {L({ en: 'Transfers', es: 'Traslados', de: 'Transfers', fr: 'Transferts' })}
              </Link>
              <Link to="/plan" className="rounded-full border border-ink/20 px-5 py-2.5 font-bold text-ink">
                {L({ en: 'Plan my day', es: 'Planear mi día', de: 'Meinen Tag planen', fr: 'Planifier ma journée' })}
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        {/* At a glance */}
        <Panel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<FaShoppingCart />} label={L({ en: 'Bookings', es: 'Reservas', de: 'Buchungen', fr: 'Réservations' })} value={items.length} />
            <Stat icon={<FaUsers />} label={L({ en: 'People', es: 'Personas', de: 'Personen', fr: 'Personnes' })} value={people} />
            <Stat icon={<FaCalendarAlt />} label={L({ en: 'Dates', es: 'Fechas', de: 'Daten', fr: 'Dates' })} value={<span className="text-sm">{range}</span>} />
            <Stat icon={<FaMoneyBillWave />} label="Total" value={usd(total) || '—'} />
          </div>
          {undated.length > 0 && (
            <p className="mt-3 rounded-xl border border-sunset/40 bg-sunset-light/30 px-3 py-2 text-xs font-semibold text-ink">
              📅 {L({
                en: `Pick a date for ${undated.length === 1 ? 'one item' : `${undated.length} items`} — or leave it and we will suggest one.`,
                es: `Elige fecha para ${undated.length === 1 ? 'un elemento' : `${undated.length} elementos`} — o déjalo y te proponemos una.`,
                de: `Wählen Sie ein Datum für ${undated.length === 1 ? 'einen Eintrag' : `${undated.length} Einträge`} — oder wir schlagen eines vor.`,
                fr: `Choisissez une date pour ${undated.length === 1 ? 'un élément' : `${undated.length} éléments`} — ou laissez-nous en proposer une.`,
              })}
            </p>
          )}
        </Panel>

        {/* The items */}
        <ul className="space-y-4" aria-label={L({ en: 'Items in your cart', es: 'Elementos del carrito', de: 'Artikel im Warenkorb', fr: 'Articles du panier' })}>
          {items.map((item) => {
            const line = lineTotal(item);
            return (
              <li key={item.key} data-cart-item={item.key} className="overflow-hidden rounded-[26px] border border-ink/10 bg-paper/95 shadow-ink-sm">
                <div className="flex gap-4 p-4 md:p-5">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-lagoon-light/40 sm:h-28 sm:w-32">
                    {item.image ? (
                      <img src={item.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">{item.category === 'transport' ? '🚐' : '🌴'}</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="mb-1 inline-block rounded-full bg-lagoon-light/50 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wider text-lagoon-dark">
                          {item.category === 'transport'
                            ? L({ en: 'Transfer', es: 'Traslado', de: 'Transfer', fr: 'Transfert' })
                            : L({ en: 'Tour', es: 'Tour', de: 'Tour', fr: 'Excursion' })}
                          {item.tier ? ` · ${item.tier}` : ''}
                        </span>
                        <h3 className="font-display text-lg font-extrabold leading-snug text-ink">
                          {item.detailsPath ? (
                            <Link to={item.detailsPath} className="hover:underline">
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="shrink-0 rounded-full p-2 text-ink-light transition hover:bg-hibiscus-light/30 hover:text-hibiscus-dark"
                        aria-label={`${L({ en: 'Remove', es: 'Quitar', de: 'Entfernen', fr: 'Retirer' })}: ${item.title}`}
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                    {item.description && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{item.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                      {item.place && (
                        <span className="inline-flex items-center gap-1">
                          <FaMapMarkerAlt className="text-hibiscus" /> {item.place}
                        </span>
                      )}
                      {item.duration && (
                        <span className="inline-flex items-center gap-1">
                          <FaRegClock className="text-lagoon-dark" /> {item.duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-ink/10 bg-ink/[0.03] p-4 sm:grid-cols-3 md:px-5">
                  <label className="block">
                    <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wider text-ink-soft">
                      {L({ en: 'Date', es: 'Fecha', de: 'Datum', fr: 'Date' })}
                    </span>
                    {item.category === 'transport' && item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ? (
                      <span className="block py-2 text-sm font-bold text-ink">{item.date}</span>
                    ) : (
                      <input
                        type="date"
                        min={today()}
                        value={/^\d{4}-\d{2}-\d{2}$/.test(item.date ?? '') ? item.date : ''}
                        onChange={(event) => updateCartItem(item.key, { date: event.target.value })}
                        className={`w-full rounded-xl border bg-paper px-3 py-2 text-sm font-bold text-ink ${item.date ? 'border-ink/20' : 'border-sunset'}`}
                      />
                    )}
                    {item.time && <span className="text-xs text-ink-soft">{item.time}</span>}
                  </label>
                  <div>
                    <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wider text-ink-soft">
                      {L({ en: 'People', es: 'Personas', de: 'Personen', fr: 'Personnes' })}
                    </span>
                    {item.fixedTotal || item.quantities ? (
                      <span className="block py-2 text-sm font-bold text-ink">{item.persons}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="−"
                          onClick={() => updateCartItem(item.key, { persons: item.persons - 1 })}
                          disabled={item.persons <= 1}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 text-ink disabled:opacity-40"
                        >
                          <FaMinus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-lg font-extrabold text-ink" data-persons>
                          {item.persons}
                        </span>
                        <button
                          type="button"
                          aria-label="+"
                          onClick={() => updateCartItem(item.key, { persons: item.persons + 1 })}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 text-ink"
                        >
                          <FaPlus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-wider text-ink-soft">
                      {L({ en: 'Price', es: 'Precio', de: 'Preis', fr: 'Prix' })}
                    </span>
                    <div className="font-display text-xl font-extrabold text-ink" data-line-total>
                      {line ? usd(line) : L({ en: 'On request', es: 'A consultar', de: 'Auf Anfrage', fr: 'Sur demande' })}
                    </div>
                    {line && item.unitPrice && !item.fixedTotal && (
                      <div className="text-xs text-ink-soft">
                        {item.persons} × {usd(item.unitPrice)}
                      </div>
                    )}
                  </div>
                </div>

                {((item.included?.length ?? 0) > 0 || (item.goodToKnow?.length ?? 0) > 0) && (
                  <details className="group border-t border-ink/10 px-4 py-3 text-sm md:px-5">
                    <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wider text-lagoon-dark">
                      <span className="group-open:hidden">▸ </span>
                      <span className="hidden group-open:inline">▾ </span>
                      {L({ en: 'Included & good to know', es: 'Incluye y bueno saber', de: 'Inklusive & gut zu wissen', fr: 'Inclus & bon à savoir' })}
                    </summary>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {item.included && item.included.length > 0 && (
                        <ul className="space-y-1 text-ink-soft">
                          {item.included.map((entry) => (
                            <li key={entry} className="flex gap-2">
                              <span className="text-jungle">✓</span>
                              {entry}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.goodToKnow && item.goodToKnow.length > 0 && (
                        <ul className="space-y-1 text-ink-soft">
                          {item.goodToKnow.map((entry) => (
                            <li key={entry} className="flex gap-2">
                              <span className="text-sunset-dark">!</span>
                              {entry}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>

        {removed && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-paper" role="status">
            <span className="truncate">
              {L({ en: 'Removed', es: 'Quitado', de: 'Entfernt', fr: 'Retiré' })}: {removed.title}
            </span>
            <button
              type="button"
              className="shrink-0 font-bold text-mango-light underline"
              onClick={() => {
                addToCart(removed);
                setRemoved(null);
              }}
            >
              {L({ en: 'Undo', es: 'Deshacer', de: 'Rückgängig', fr: 'Annuler' })}
            </button>
          </div>
        )}

        {/* Fact sheet */}
        <Panel title={L({ en: 'Your trip at a glance', es: 'Tu viaje de un vistazo', de: 'Ihre Reise auf einen Blick', fr: 'Votre voyage en un coup d’œil' })} icon={<FaCalendarAlt />}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                {L({ en: 'Day by day', es: 'Día a día', de: 'Tag für Tag', fr: 'Jour après jour' })}
              </h3>
              <ol className="space-y-2 border-l-2 border-lagoon/40 pl-4">
                {dated.map((item) => (
                  <li key={item.key} className="relative text-sm">
                    <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-lagoon" />
                    <span className="font-bold text-ink">{formatCartDate(item.date, locale, 'full')}</span>
                    {item.time ? ` · ${item.time}` : ''}
                    <div className="text-ink-soft">
                      {item.title} · {item.persons} {L({ en: 'pax', es: 'pers.', de: 'Pers.', fr: 'pers.' })}
                    </div>
                  </li>
                ))}
                {undated.map((item) => (
                  <li key={item.key} className="relative text-sm">
                    <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-sunset bg-paper" />
                    <span className="font-bold text-sunset-dark">{L({ en: 'Date to choose', es: 'Fecha por elegir', de: 'Datum offen', fr: 'Date à choisir' })}</span>
                    <div className="text-ink-soft">{item.title}</div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-4">
              <ul className="space-y-1.5 text-sm text-ink">
                <li>
                  • <strong>{items.length}</strong> {L({ en: items.length === 1 ? 'booking' : 'bookings', es: items.length === 1 ? 'reserva' : 'reservas', de: items.length === 1 ? 'Buchung' : 'Buchungen', fr: items.length === 1 ? 'réservation' : 'réservations' })},{' '}
                  <strong>{seats}</strong> {L({ en: 'seats in all', es: 'plazas en total', de: 'Plätze insgesamt', fr: 'places au total' })}
                </li>
                <li>
                  • {L({ en: 'Total', es: 'Total', de: 'Gesamt', fr: 'Total' })}: <strong>{usd(total) || '—'}</strong>
                  {!priced && ` (+ ${L({ en: 'items on request', es: 'elementos a consultar', de: 'Posten auf Anfrage', fr: 'éléments sur demande' })})`}
                </li>
                {places.length > 0 && (
                  <li>
                    • {L({ en: 'Places', es: 'Lugares', de: 'Orte', fr: 'Lieux' })}: {places.join(' · ')}
                  </li>
                )}
                <li>• {L({ en: 'Nothing is charged until you pay; nothing is final until we confirm it with you.', es: 'No se cobra nada hasta que pagues; nada es definitivo hasta que lo confirmemos contigo.', de: 'Nichts wird belastet, bevor Sie zahlen; nichts ist fix, bevor wir es mit Ihnen bestätigen.', fr: 'Rien n’est débité avant votre paiement ; rien n’est définitif avant notre confirmation.' })}</li>
              </ul>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                  {L({ en: 'Remember', es: 'Recuerda', de: 'Denken Sie daran', fr: 'À retenir' })}
                </h3>
                <ul className="space-y-1.5 text-sm text-ink-soft">
                  {remember.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span>📌</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Checkout column */}
      <div className="space-y-5 lg:sticky lg:top-28 lg:self-start print:hidden">
        <Panel className="border-lagoon/30">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-soft">Total</div>
              <div className="font-display text-3xl font-extrabold text-ink" data-cart-total>
                {usd(total) || '—'}
              </div>
            </div>
            <div className="text-right text-xs text-ink-soft">
              {items.length} × · {seats} {L({ en: 'seats', es: 'plazas', de: 'Plätze', fr: 'places' })}
            </div>
          </div>

          <div className="mt-5 border-t border-ink/10 pt-4">
            <PrePayDetails value={details} onChange={setDetails} locale={locale} emailAvailable={guestEmail} method="cart" tone="light" hideTips />
          </div>

          <div className="mt-5 space-y-2.5">
            {reserveUrl && (
              <a
                href={reserveUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => track('reserve', { source: 'cart', method: 'whatsapp', items: items.length, total, locale })}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-jungle px-5 py-3 font-extrabold text-paper shadow-ink-sm transition hover:-translate-y-0.5"
              >
                <FaWhatsapp className="h-5 w-5" /> {L({ en: 'Reserve on WhatsApp', es: 'Reservar por WhatsApp', de: 'Per WhatsApp reservieren', fr: 'Réserver sur WhatsApp' })}
              </a>
            )}
            {canPayOnline && total > 0 && priced && (
              <PaymentDropdown
                excursionTitle={payTitle}
                amount={total}
                selectedPrice={usd(total)}
                persons={Math.max(1, seats)}
                bookingDate={dated.map((item) => formatCartDate(item.date, locale)).join(', ')}
                category="cart"
                locale={locale}
                items={lineItems}
                source="cart"
                clearsCart
                prePayDefaults={details}
                methods={['card', 'paypal']}
                hideWhenEmpty
                buttonLabel={L({ en: `Pay all now · ${usd(total)}`, es: `Pagar todo ahora · ${usd(total)}`, de: `Alles jetzt bezahlen · ${usd(total)}`, fr: `Tout payer maintenant · ${usd(total)}` })}
                className="w-full"
                buttonClassName="flex w-full items-center justify-between gap-2.5 rounded-full bg-lagoon px-5 py-3 font-extrabold text-paper shadow-ink-sm transition hover:-translate-y-0.5"
              />
            )}
            <button
              type="button"
              onClick={askForContact}
              disabled={busy === 'request'}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-bold text-ink transition hover:border-ink/50 disabled:opacity-60"
            >
              <FaPhoneAlt /> {busy === 'request' ? '…' : L({ en: 'Have us contact you first', es: 'Que nos pongamos en contacto primero', de: 'Erst Rückmeldung von uns', fr: 'Être recontacté d’abord' })}
            </button>
            {canPayOnline && total > 0 && (
              <Link
                to={`/contact?pay=${Math.max(1, Math.round(total * 0.3))}&ref=${encodeURIComponent(`Depósito / Deposit: ${items.map((item) => item.title).join(', ')}`.slice(0, 100))}#pay`}
                className="block text-center text-xs font-semibold text-lagoon-dark underline underline-offset-4"
              >
                {L({ en: 'Or pay a deposit instead', es: 'O paga solo un depósito', de: 'Oder nur eine Anzahlung leisten', fr: 'Ou payer seulement un acompte' })}
              </Link>
            )}
          </div>

          {notice && (
            <p className={`mt-4 rounded-xl px-3 py-2 text-sm font-semibold ${notice.tone === 'ok' ? 'bg-jungle-light/30 text-jungle-dark' : 'bg-hibiscus-light/30 text-hibiscus-dark'}`} role="status">
              {notice.text}
            </p>
          )}
        </Panel>

        <Panel title={L({ en: 'Keep a copy', es: 'Guarda una copia', de: 'Eine Kopie behalten', fr: 'Garder une copie' })} icon={<FaEnvelope />}>
          <div className="space-y-2.5">
            <a
              href={shareToWhatsApp(cartText(`${brandSettings.brandName || ''} — ${L({ en: 'my trip', es: 'mi viaje', de: 'meine Reise', fr: 'mon voyage' })}\n`))}
              target="_blank"
              rel="noreferrer"
              data-no-return-prompt
              onClick={() => track('summary_whatsapp', { items: items.length, total, locale })}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-jungle/40 px-5 py-2.5 text-sm font-bold text-jungle-dark"
            >
              <FaWhatsapp /> {L({ en: 'Send the summary to my WhatsApp', es: 'Enviar el resumen a mi WhatsApp', de: 'Übersicht an mein WhatsApp senden', fr: 'Envoyer le résumé sur mon WhatsApp' })}
            </a>
            {guestEmail && (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={summaryEmail}
                  onChange={(event) => setSummaryEmail(event.target.value)}
                  placeholder="you@email.com"
                  className="min-w-0 flex-1 rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm"
                  aria-label="Email"
                />
                <button type="button" onClick={emailSummary} disabled={busy === 'email'} className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-60">
                  {busy === 'email' ? '…' : L({ en: 'Email it', es: 'Enviar', de: 'Senden', fr: 'Envoyer' })}
                </button>
              </div>
            )}
            <button type="button" onClick={() => window.print()} className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-ink-soft hover:text-ink">
              <FaPrint /> {L({ en: 'Print or save as PDF', es: 'Imprimir o guardar como PDF', de: 'Drucken oder als PDF speichern', fr: 'Imprimer ou enregistrer en PDF' })}
            </button>
          </div>
        </Panel>

        <Panel title={L({ en: 'Ways to pay', es: 'Formas de pago', de: 'Zahlungsarten', fr: 'Moyens de paiement' })} icon={<FaCreditCard />}>
          <ul className="space-y-2 text-sm text-ink">
            {methods.card.visible && (
              <li className="flex items-center gap-2">
                <FaCreditCard className="text-sky-dark" /> {L({ en: 'Card, on a secure payment page', es: 'Tarjeta, en una página de pago segura', de: 'Karte, auf einer sicheren Zahlungsseite', fr: 'Carte, sur une page de paiement sécurisée' })}
              </li>
            )}
            {methods.paypal.visible && (
              <li className="flex items-center gap-2">
                <FaPaypal className="text-sky-dark" /> PayPal
              </li>
            )}
            <li className="flex items-center gap-2">
              <FaMoneyBillWave className="text-jungle" /> {L({ en: 'Cash on the day, once reserved', es: 'Efectivo el día del tour, tras reservar', de: 'Bar am Tag, nach Reservierung', fr: 'Espèces le jour même, après réservation' })}
            </li>
            <li className="flex items-center gap-2">
              <FaWhatsapp className="text-jungle" /> {L({ en: 'A payment link on WhatsApp', es: 'Un enlace de pago por WhatsApp', de: 'Ein Zahlungslink per WhatsApp', fr: 'Un lien de paiement sur WhatsApp' })}
            </li>
          </ul>
        </Panel>

        <Panel title={L({ en: 'Your hosts', es: 'Tus anfitriones', de: 'Ihre Gastgeber', fr: 'Vos hôtes' })} icon={<FaUsers />}>
          <div className="text-sm text-ink">
            <div className="font-display text-lg font-extrabold">{brandSettings.brandName}</div>
            {brandSettings.contactName && <div className="text-ink-soft">{brandSettings.contactName}</div>}
            {phone && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={generateWhatsAppMessage(phone, L({ en: 'Hello! A question about my cart:', es: '¡Hola! Una pregunta sobre mi carrito:', de: 'Hallo! Eine Frage zu meinem Warenkorb:', fr: 'Bonjour ! Une question sur mon panier :' }))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-jungle px-3 py-1.5 text-xs font-bold text-paper">
                  <FaWhatsapp /> WhatsApp
                </a>
                <a href={telHref} className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 px-3 py-1.5 text-xs font-bold text-ink">
                  <FaPhoneAlt /> {phone}
                </a>
              </div>
            )}
            <Link to="/contact" className="mt-3 inline-block text-xs font-semibold text-lagoon-dark underline underline-offset-4">
              {L({ en: 'All contact details', es: 'Todos los datos de contacto', de: 'Alle Kontaktdaten', fr: 'Toutes les coordonnées' })}
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default CartView;
