import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaPaypal, FaCreditCard, FaWhatsapp, FaChevronDown, FaShieldAlt, FaCopy } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';
import { getPaymentMethodStates, getCardPaymentLink, PaymentMethodId } from '../../utils/paymentMethods';
import {
  getPaymentsReady,
  startCardCheckout,
  postToGateway,
  fillPaymentLink,
  PaymentsReady,
} from '../../services/paymentService';

/**
 * How a guest pays: by card, by PayPal, or in person through the concierge.
 *
 * CARD is one option, whoever processes it. The operator chooses Stripe, AZUL
 * (Banco Popular) or CardNET in the admin; this asks /api/card-checkout, which
 * prices the booking on the server and answers with where to go — a hosted
 * page to open, or a form to post to one — and the guest enters the card
 * there, never here. Nothing on this side names the processor.
 *
 * With no processor configured but a payment link pasted from a processor's
 * portal, the link is opened instead: with the amount filled in when the link
 * has an {amount} slot, and with the amount shown to enter when it has not.
 *
 * WHICH BUTTONS APPEAR is decided by paymentMethods.ts: a method shows only
 * when it is both configured and switched on. If the operator has configured
 * nothing, the dropdown collapses to a single WhatsApp button, because options
 * that all dead-end are worse than one that works.
 */

interface PaymentDropdownProps {
  excursionTitle?: string;
  selectedPrice?: string;
  selectedTier?: string;
  className?: string;
  /** Which catalogue the server should price this from. */
  category?: string;
  /** Positional catalogue id — the server matches on title first, this second. */
  serviceId?: number | string;
  /** How many people are being paid for. */
  persons?: number;
  /** Human-readable preferred date, carried onto the payment for the operator. */
  bookingDate?: string;
  locale?: string;
  /**
   * The total in dollars, when the caller already has it as a number (a
   * transfer quote). Otherwise it is read out of `selectedPrice`.
   */
  amount?: number;
  /** Replaces "Book & Pay Now" on the trigger button. */
  buttonLabel?: string;
  /** Classes for the trigger button, for pages that dress it differently. */
  buttonClassName?: string;
  /**
   * Offer only these methods — a page with its own WhatsApp button leaves out
   * 'cash'. Defaults to every method.
   */
  methods?: PaymentMethodId[];
  /** Render nothing, rather than a WhatsApp fallback, when no method is offered. */
  hideWhenEmpty?: boolean;
}

type Lang = 'en' | 'es' | 'de' | 'fr';

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    trigger: 'Book & Pay Now',
    choose: 'Choose payment method',
    card: 'Credit / Debit Card',
    cardHint: 'Secure online payment — no account needed',
    paypal: 'PayPal',
    paypalHint: 'Fast & buyer-protected checkout',
    cash: 'VIP Concierge / Cash',
    cashHint: 'Reserve now, pay on arrival',
    cardTitle: 'Pay by card',
    option: 'Selected option',
    standard: 'Standard excursion',
    people: 'People',
    date: 'Date',
    total: 'Total price',
    inquire: 'Inquire',
    charged: 'charged in pesos',
    rate: 'rate',
    safe: 'Card details are entered on a secure payment page, never on this site',
    opening: 'Opening secure payment…',
    payWith: 'Pay {amount} by card',
    continue: 'Continue to secure payment',
    note: 'You will be taken to the secure payment page and returned here when the payment is done.',
    linkNote: 'The secure payment page opens in a new tab, and we let the team know on WhatsApp.',
    enterAmount: 'Amount to enter on the payment page',
    copy: 'Copy',
    copied: 'Copied',
    close: 'Close',
    failed: 'Could not open the secure payment page.',
  },
  es: {
    trigger: 'Reservar y pagar',
    choose: 'Elige cómo pagar',
    card: 'Tarjeta de crédito / débito',
    cardHint: 'Pago en línea seguro — sin crear cuenta',
    paypal: 'PayPal',
    paypalHint: 'Rápido y con protección al comprador',
    cash: 'Concierge VIP / efectivo',
    cashHint: 'Reserva ahora, paga al llegar',
    cardTitle: 'Pagar con tarjeta',
    option: 'Opción elegida',
    standard: 'Excursión estándar',
    people: 'Personas',
    date: 'Fecha',
    total: 'Precio total',
    inquire: 'Consultar',
    charged: 'cobrado en pesos',
    rate: 'tasa',
    safe: 'Los datos de la tarjeta se ponen en una página de pago segura, nunca en este sitio',
    opening: 'Abriendo el pago seguro…',
    payWith: 'Pagar {amount} con tarjeta',
    continue: 'Continuar al pago seguro',
    note: 'Irás a la página de pago segura y volverás aquí cuando termine el pago.',
    linkNote: 'La página de pago segura se abre en otra pestaña y avisamos al equipo por WhatsApp.',
    enterAmount: 'Importe a poner en la página de pago',
    copy: 'Copiar',
    copied: 'Copiado',
    close: 'Cerrar',
    failed: 'No se pudo abrir la página de pago segura.',
  },
  de: {
    trigger: 'Buchen & bezahlen',
    choose: 'Zahlungsart wählen',
    card: 'Kredit- / Debitkarte',
    cardHint: 'Sichere Online-Zahlung — ohne Konto',
    paypal: 'PayPal',
    paypalHint: 'Schnell & mit Käuferschutz',
    cash: 'VIP-Concierge / bar',
    cashHint: 'Jetzt reservieren, vor Ort zahlen',
    cardTitle: 'Mit Karte bezahlen',
    option: 'Gewählte Option',
    standard: 'Standardausflug',
    people: 'Personen',
    date: 'Datum',
    total: 'Gesamtpreis',
    inquire: 'Auf Anfrage',
    charged: 'belastet in Pesos',
    rate: 'Kurs',
    safe: 'Kartendaten werden auf einer sicheren Zahlungsseite eingegeben, nie auf dieser Seite',
    opening: 'Sichere Zahlung wird geöffnet…',
    payWith: '{amount} mit Karte bezahlen',
    continue: 'Weiter zur sicheren Zahlung',
    note: 'Sie werden zur sicheren Zahlungsseite weitergeleitet und danach hierher zurückgebracht.',
    linkNote: 'Die sichere Zahlungsseite öffnet sich in einem neuen Tab, und wir informieren das Team per WhatsApp.',
    enterAmount: 'Auf der Zahlungsseite einzugebender Betrag',
    copy: 'Kopieren',
    copied: 'Kopiert',
    close: 'Schließen',
    failed: 'Die sichere Zahlungsseite konnte nicht geöffnet werden.',
  },
  fr: {
    trigger: 'Réserver et payer',
    choose: 'Choisir le moyen de paiement',
    card: 'Carte de crédit / débit',
    cardHint: 'Paiement en ligne sécurisé — sans compte',
    paypal: 'PayPal',
    paypalHint: 'Rapide et avec protection acheteur',
    cash: 'Concierge VIP / espèces',
    cashHint: 'Réservez maintenant, payez sur place',
    cardTitle: 'Payer par carte',
    option: 'Option choisie',
    standard: 'Excursion standard',
    people: 'Personnes',
    date: 'Date',
    total: 'Prix total',
    inquire: 'Sur demande',
    charged: 'débité en pesos',
    rate: 'taux',
    safe: 'Les données de carte sont saisies sur une page de paiement sécurisée, jamais sur ce site',
    opening: 'Ouverture du paiement sécurisé…',
    payWith: 'Payer {amount} par carte',
    continue: 'Continuer vers le paiement sécurisé',
    note: 'Vous serez redirigé vers la page de paiement sécurisée puis ramené ici une fois le paiement terminé.',
    linkNote: 'La page de paiement sécurisée s’ouvre dans un nouvel onglet, et nous prévenons l’équipe sur WhatsApp.',
    enterAmount: 'Montant à saisir sur la page de paiement',
    copy: 'Copier',
    copied: 'Copié',
    close: 'Fermer',
    failed: 'Impossible d’ouvrir la page de paiement sécurisée.',
  },
};

const extractAmountNumber = (priceStr?: string): number | null => {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
};

const buildDynamicPayPalUrl = (baseUrl: string, amount: number | null): string => {
  const targetBase = (baseUrl && baseUrl.trim()) ? baseUrl.trim() : '';
  if (!targetBase) return '';
  if (!amount || amount <= 0) return targetBase;

  const cleanBase = targetBase.replace(/\/+$/, '').replace(/\/\d+(?:\.\d+)?(?:USD)?$/i, '');
  return `${cleanBase}/${amount}USD`;
};

const formatMoney = (value: number, currency: string, lang: Lang) => {
  const symbol = currency === 'DOP' ? 'RD$' : currency === 'USD' ? 'US$' : currency;
  const tag = { en: 'en-US', es: 'es-DO', de: 'de-DE', fr: 'fr-FR' }[lang];
  const number = new Intl.NumberFormat(tag, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return `${symbol} ${number}`;
};

export const PaymentDropdown: React.FC<PaymentDropdownProps> = ({
  excursionTitle = 'Excursion',
  selectedPrice,
  selectedTier,
  className = '',
  category = 'tours',
  serviceId,
  persons = 1,
  bookingDate,
  locale = 'en',
  amount,
  buttonLabel,
  buttonClassName,
  methods: allowedMethods,
  hideWhenEmpty = false,
}) => {
  const lang: Lang = (['es', 'de', 'fr'].includes(locale) ? locale : 'en') as Lang;
  const t = COPY[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cardError, setCardError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState<PaymentsReady | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const { brandSettings } = useBrand();

  // Asked once per mount rather than per click: the answer is a boolean and a
  // currency, and the endpoint lets the browser cache it briefly.
  useEffect(() => {
    let current = true;
    getPaymentsReady().then((next) => {
      if (current) setReady(next);
    });
    return () => {
      current = false;
    };
  }, []);

  const cardReady = ready?.card ?? false;
  const methods = getPaymentMethodStates(brandSettings, cardReady);
  if (allowedMethods) {
    for (const id of Object.keys(methods) as PaymentMethodId[]) {
      if (!allowedMethods.includes(id)) methods[id] = { ...methods[id], visible: false };
    }
  }
  const visibleCount = Object.values(methods).filter((state) => state.visible).length;
  const anyVisible = visibleCount > 0;
  const cardLink = getCardPaymentLink(brandSettings);
  const totalUsd = typeof amount === 'number' && amount > 0 ? amount : extractAmountNumber(selectedPrice);
  const displayPrice = selectedPrice || (totalUsd ? formatMoney(totalUsd, 'USD', lang) : t.inquire);

  /** What the card is charged, when it is charged in pesos and the rate is known. */
  const chargedInPesos =
    totalUsd && cardReady && ready?.currency === 'DOP' && ready.dopPerUsd
      ? Math.round(totalUsd * ready.dopPerUsd * 100) / 100
      : null;

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 288;
      let left = rect.right - width;
      if (left < 16) left = 16;
      if (left + width > window.innerWidth - 16) left = window.innerWidth - width - 16;
      // Open upwards when the menu would run off the bottom of the screen —
      // a button low in a sticky sidebar otherwise opens a menu nobody can reach.
      const height = 48 + visibleCount * 60;
      const below = rect.bottom + 8;
      const top =
        below + height > window.innerHeight - 8 && rect.top - height - 8 > 8 ? rect.top - height - 8 : below;
      setDropdownCoords({ top, left });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen, visibleCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(targetNode) &&
        buttonRef.current &&
        !buttonRef.current.contains(targetNode)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openWhatsAppConfirmation = (paymentMethod: string) => {
    const details = selectedPrice || totalUsd
      ? ` (${selectedTier || 'Option'}: ${displayPrice}${persons > 1 ? `, ${persons} pax` : ''})`
      : '';
    const phone = brandSettings.phoneNumber || '';
    const message = `Hola! Estoy comprando esto ahora mismo (${excursionTitle}${details}) vía ${paymentMethod}. Por favor confirma personalmente también.\n\nHello! I am buying this right now (${excursionTitle}${details}) via ${paymentMethod}. Please confirm personally as well.`;

    const waUrl = generateWhatsAppMessage(phone, message);
    if (waUrl) {
      setTimeout(() => window.open(waUrl, '_blank'), 350);
    }
  };

  const handlePayPal = () => {
    playClickFx();
    setIsOpen(false);
    const targetUrl = buildDynamicPayPalUrl(brandSettings.paypalMeLink, totalUsd);
    if (targetUrl) window.open(targetUrl, '_blank');
    openWhatsAppConfirmation('PayPal');
  };

  const handleWhatsApp = () => {
    playClickFx();
    setIsOpen(false);
    openWhatsAppConfirmation('VIP Concierge / Cash');
  };

  const handleCard = () => {
    playClickFx();
    setIsOpen(false);
    setCardError('');
    setCopied(false);
    setCardModalOpen(true);
  };

  /** The pasted payment link with the amount filled in, when there is no processor to ask. */
  const link = !cardReady && cardLink
    ? fillPaymentLink(cardLink, { amount: totalUsd ?? 0, currency: 'USD', reference: excursionTitle })
    : null;
  const mustEnterAmount = Boolean(link && !link.carriesAmount && totalUsd);

  /**
   * Leave for the secure payment page.
   *
   * Same tab, not a popup: this runs after an await, so a `window.open` here
   * would be outside the click gesture and blocked. Going in the same tab is
   * also what makes the return trip work — the payment page sends the guest
   * back here, and PaymentReturn picks them up.
   */
  const handleCardProceed = async () => {
    playClickFx();

    if (!cardReady) {
      // A pasted link: no await before the open, so it stays inside the click.
      if (link?.url) {
        window.open(link.url, '_blank', 'noopener');
        openWhatsAppConfirmation('Tarjeta / Card (link)');
        setCardModalOpen(false);
      }
      return;
    }

    setStarting(true);
    setCardError('');
    try {
      const start = await startCardCheckout({
        category,
        serviceId,
        title: excursionTitle,
        persons,
        date: bookingDate,
        amount: totalUsd ?? undefined,
        locale: lang,
      });
      if (start.kind === 'redirect') window.location.href = start.url;
      else postToGateway(start.action, start.fields);
    } catch (error: any) {
      setStarting(false);
      setCardError(error?.message || t.failed);
    }
  };

  const copyAmount = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      /* clipboard refused — the number is on screen anyway */
    }
  };

  const methodButton = (
    key: string,
    onClick: () => void,
    icon: React.ReactNode,
    iconClass: string,
    title: string,
    hint: string
  ) => (
    <button
      key={key}
      onMouseEnter={() => playHoverFx()}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-3 text-left group transition hover:bg-paper/10"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg group-hover:scale-110 transition-transform ${iconClass}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold">{title}</div>
        <div className="text-[0.65rem] text-paper/70">{hint}</div>
      </div>
    </button>
  );

  if (hideWhenEmpty && !anyVisible) return null;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        onMouseEnter={() => playHoverFx()}
        onClick={() => {
          playClickFx();
          // With one option left there is nothing to choose between.
          if (!anyVisible) {
            handleWhatsApp();
            return;
          }
          setIsOpen(!isOpen);
        }}
        className={
          buttonClassName ??
          'inline-flex items-center justify-between gap-2.5 rounded-full border border-[rgba(150,112,31,0.4)] bg-lagoon px-6 py-3 font-extrabold text-white shadow-ink-sm transition hover:-translate-y-0.5 hover:bg-lagoon-light hover:text-ink active:translate-y-0'
        }
      >
        <span className="flex items-center gap-2">
          <span>💳</span>
          <span>{buttonLabel ?? t.trigger}</span>
        </span>
        {anyVisible && (
          <FaChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {isOpen && dropdownCoords && createPortal(
        <div
          ref={dropdownRef}
          style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
          className="fixed z-[99999] w-72 rounded-2xl border border-[rgba(150,112,31,0.4)] bg-[#17313F] p-2 text-paper shadow-ink animate-in fade-in slide-in-from-top-2"
        >
          <div className="px-3 py-2 mb-1 border-b-2 border-paper/20 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-mango-light">
            {t.choose}
          </div>

          {methods.card.visible &&
            methodButton('card', handleCard, <FaCreditCard className="h-4 w-4" />, 'bg-sky/25 text-sky-light', t.card, t.cardHint)}
          {methods.paypal.visible &&
            methodButton('paypal', handlePayPal, <FaPaypal className="h-4 w-4" />, 'bg-sky-dark/30 text-sky-light', t.paypal, t.paypalHint)}
          {methods.cash.visible &&
            methodButton('cash', handleWhatsApp, <FaWhatsapp className="h-4 w-4" />, 'bg-jungle/25 text-jungle-light', t.cash, t.cashHint)}
        </div>,
        document.body
      )}

      {cardModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-md rounded-[28px] border border-[rgba(150,112,31,0.4)] bg-[#17313F] p-7 text-paper shadow-ink-lg animate-in zoom-in-95">
            <button
              onClick={() => {
                playClickFx();
                setCardModalOpen(false);
              }}
              className="absolute right-4 top-4 text-paper/70 hover:text-paper"
              aria-label={t.close}
            >
              ✕
            </button>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky/25 text-sky-light font-bold">
                💳
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t.cardTitle}</h3>
                <p className="text-xs text-paper/70">{excursionTitle}</p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border-2 border-paper/20 bg-paper/5 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-paper/70">{t.option}:</span>
                <span className="font-bold text-white">{selectedTier || t.standard}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-paper/70">{t.people}:</span>
                <span className="font-bold text-white">{persons}</span>
              </div>
              {bookingDate && (
                <div className="flex justify-between gap-4">
                  <span className="text-paper/70">{t.date}:</span>
                  <span className="text-right font-bold text-white">{bookingDate}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-paper/70">{t.total}:</span>
                <span className="text-sm font-bold text-mango-light">{displayPrice}</span>
              </div>
              {chargedInPesos !== null && (
                <div className="flex justify-between gap-4 border-t border-paper/15 pt-2">
                  <span className="text-paper/70">≈ {t.charged}:</span>
                  <span className="text-right font-bold text-white">
                    {formatMoney(chargedInPesos, 'DOP', lang)}
                    <span className="block text-[0.6rem] font-normal text-paper/60">
                      {t.rate} {ready?.dopPerUsd}
                    </span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 border-t-2 border-paper/20 pt-2 text-paper/70">
                <FaShieldAlt className="text-jungle-light" />
                <span>{t.safe}</span>
              </div>
            </div>

            {mustEnterAmount && totalUsd && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-mango-light/40 bg-mango/15 p-3 text-xs">
                <div>
                  <div className="text-paper/70">{t.enterAmount}</div>
                  <div className="text-base font-bold text-mango-light">{formatMoney(totalUsd, 'USD', lang)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyAmount(totalUsd.toFixed(2))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-paper/30 px-3 py-1.5 font-bold text-paper"
                >
                  <FaCopy /> {copied ? t.copied : t.copy}
                </button>
              </div>
            )}

            {cardError && (
              <div className="mt-4 rounded-xl border-2 border-mango-light/50 bg-mango/20 p-3 text-xs text-mango-light">
                {cardError}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                onClick={handleCardProceed}
                disabled={starting || (!cardReady && !link?.url)}
                className="w-full rounded-full border border-[rgba(150,112,31,0.4)] bg-lagoon-light py-3 text-xs font-extrabold uppercase tracking-wider text-ink shadow-ink-sm transition hover:bg-mango-light disabled:opacity-60"
              >
                {starting
                  ? t.opening
                  : cardReady
                  ? t.payWith.replace('{amount}', chargedInPesos !== null ? formatMoney(chargedInPesos, 'DOP', lang) : displayPrice)
                  : t.continue}
              </button>
              <p className="text-center text-[0.65rem] text-paper/60">{cardReady ? t.note : t.linkNote}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PaymentDropdown;
