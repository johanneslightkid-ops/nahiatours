import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaPaypal, FaCreditCard, FaWhatsapp, FaChevronDown, FaShieldAlt, FaUniversity, FaCopy } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';
import { getPaymentMethodStates, getCardCheckoutLink, getBankPaymentLink } from '../../utils/paymentMethods';
import {
  createStripeCheckout,
  getPaymentsReady,
  startBankCheckout,
  postToGateway,
  fillPaymentLink,
  PaymentsReady,
  BankProvider,
} from '../../services/paymentService';

/**
 * How a guest pays.
 *
 * Card goes to Stripe for real. There is no Payment Link with the amount in
 * the query string — Stripe links are fixed-price — so the server mints a
 * Checkout Session per booking and the browser is sent to the one-shot hosted
 * page it returns. The guest needs no Stripe account; Stripe offers a login
 * only for its own saved cards.
 *
 * AZUL (Banco Popular) and CARDNET work the same way when the operator has
 * entered merchant credentials: the server prices the booking, and the guest
 * is posted to the bank's own page carrying that exact amount. When only a
 * payment link from the bank's portal is on file, the guest is sent to the
 * link instead — with the amount filled in if the link has an {amount} slot,
 * and shown the amount to enter if it has not.
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
  /** How many people are being paid for. Drives the line-item quantity. */
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
  /** Extra classes for the trigger button, for pages that dress it differently. */
  buttonClassName?: string;
}

type Lang = 'en' | 'es' | 'de' | 'fr';

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    trigger: 'Book & Pay Now',
    choose: 'Choose payment method',
    card: 'Credit / Debit Card',
    cardHint: 'Secure checkout — no account needed',
    azulHint: 'Banco Popular secure payment page',
    cardnetHint: 'CardNET secure payment page',
    paypal: 'PayPal Direct',
    paypalHint: 'Fast & buyer-protected checkout',
    cash: 'VIP Concierge / Cash',
    cashHint: 'Reserve now, pay on arrival',
    cardTitle: 'Card checkout',
    option: 'Selected option',
    standard: 'Standard excursion',
    people: 'People',
    date: 'Date',
    total: 'Total price',
    inquire: 'Inquire',
    stripeSafe: 'Card details are entered on Stripe, never on this site',
    bankSafe: 'Card details are entered on the bank’s page, never on this site',
    opening: 'Opening secure checkout…',
    payWith: 'Pay {amount} with {method}',
    continueTo: 'Continue to {method}',
    stripeNote: 'You will be taken to Stripe and returned here when the payment is done.',
    bankNote: 'You will be taken to the bank’s secure page and returned here when the payment is done.',
    linkNote: 'The bank’s payment page opens in a new tab, and we let the team know on WhatsApp.',
    enterAmount: 'Amount to enter on the bank’s page',
    copy: 'Copy',
    copied: 'Copied',
    atBank: 'charged by the bank',
    rate: 'rate',
    close: 'Close',
    failed: 'Could not start the payment.',
  },
  es: {
    trigger: 'Reservar y pagar',
    choose: 'Elige cómo pagar',
    card: 'Tarjeta de crédito / débito',
    cardHint: 'Pago seguro — sin crear cuenta',
    azulHint: 'Página de pago segura del Banco Popular',
    cardnetHint: 'Página de pago segura de CardNET',
    paypal: 'PayPal directo',
    paypalHint: 'Rápido y con protección al comprador',
    cash: 'Concierge VIP / efectivo',
    cashHint: 'Reserva ahora, paga al llegar',
    cardTitle: 'Pago con tarjeta',
    option: 'Opción elegida',
    standard: 'Excursión estándar',
    people: 'Personas',
    date: 'Fecha',
    total: 'Precio total',
    inquire: 'Consultar',
    stripeSafe: 'Los datos de la tarjeta se ponen en Stripe, nunca en este sitio',
    bankSafe: 'Los datos de la tarjeta se ponen en la página del banco, nunca en este sitio',
    opening: 'Abriendo el pago seguro…',
    payWith: 'Pagar {amount} con {method}',
    continueTo: 'Continuar a {method}',
    stripeNote: 'Irás a Stripe y volverás aquí cuando termine el pago.',
    bankNote: 'Irás a la página segura del banco y volverás aquí cuando termine el pago.',
    linkNote: 'La página de pago del banco se abre en otra pestaña y avisamos al equipo por WhatsApp.',
    enterAmount: 'Importe a poner en la página del banco',
    copy: 'Copiar',
    copied: 'Copiado',
    atBank: 'cobrado por el banco',
    rate: 'tasa',
    close: 'Cerrar',
    failed: 'No se pudo iniciar el pago.',
  },
  de: {
    trigger: 'Buchen & bezahlen',
    choose: 'Zahlungsart wählen',
    card: 'Kredit- / Debitkarte',
    cardHint: 'Sicherer Checkout — ohne Konto',
    azulHint: 'Sichere Zahlungsseite der Banco Popular',
    cardnetHint: 'Sichere Zahlungsseite von CardNET',
    paypal: 'PayPal direkt',
    paypalHint: 'Schnell & mit Käuferschutz',
    cash: 'VIP-Concierge / bar',
    cashHint: 'Jetzt reservieren, vor Ort zahlen',
    cardTitle: 'Kartenzahlung',
    option: 'Gewählte Option',
    standard: 'Standardausflug',
    people: 'Personen',
    date: 'Datum',
    total: 'Gesamtpreis',
    inquire: 'Auf Anfrage',
    stripeSafe: 'Kartendaten werden bei Stripe eingegeben, nie auf dieser Seite',
    bankSafe: 'Kartendaten werden auf der Seite der Bank eingegeben, nie auf dieser Seite',
    opening: 'Sicherer Checkout wird geöffnet…',
    payWith: '{amount} mit {method} bezahlen',
    continueTo: 'Weiter zu {method}',
    stripeNote: 'Sie werden zu Stripe weitergeleitet und nach der Zahlung hierher zurückgebracht.',
    bankNote: 'Sie werden zur sicheren Seite der Bank weitergeleitet und nach der Zahlung hierher zurückgebracht.',
    linkNote: 'Die Zahlungsseite der Bank öffnet sich in einem neuen Tab, und wir informieren das Team per WhatsApp.',
    enterAmount: 'Auf der Seite der Bank einzugebender Betrag',
    copy: 'Kopieren',
    copied: 'Kopiert',
    atBank: 'von der Bank belastet',
    rate: 'Kurs',
    close: 'Schließen',
    failed: 'Die Zahlung konnte nicht gestartet werden.',
  },
  fr: {
    trigger: 'Réserver et payer',
    choose: 'Choisir le moyen de paiement',
    card: 'Carte de crédit / débit',
    cardHint: 'Paiement sécurisé — sans compte',
    azulHint: 'Page de paiement sécurisée de Banco Popular',
    cardnetHint: 'Page de paiement sécurisée de CardNET',
    paypal: 'PayPal direct',
    paypalHint: 'Rapide et avec protection acheteur',
    cash: 'Concierge VIP / espèces',
    cashHint: 'Réservez maintenant, payez sur place',
    cardTitle: 'Paiement par carte',
    option: 'Option choisie',
    standard: 'Excursion standard',
    people: 'Personnes',
    date: 'Date',
    total: 'Prix total',
    inquire: 'Sur demande',
    stripeSafe: 'Les données de carte sont saisies chez Stripe, jamais sur ce site',
    bankSafe: 'Les données de carte sont saisies sur la page de la banque, jamais sur ce site',
    opening: 'Ouverture du paiement sécurisé…',
    payWith: 'Payer {amount} avec {method}',
    continueTo: 'Continuer vers {method}',
    stripeNote: 'Vous serez redirigé vers Stripe puis ramené ici une fois le paiement terminé.',
    bankNote: 'Vous serez redirigé vers la page sécurisée de la banque puis ramené ici une fois le paiement terminé.',
    linkNote: 'La page de paiement de la banque s’ouvre dans un nouvel onglet, et nous prévenons l’équipe sur WhatsApp.',
    enterAmount: 'Montant à saisir sur la page de la banque',
    copy: 'Copier',
    copied: 'Copié',
    atBank: 'débité par la banque',
    rate: 'taux',
    close: 'Fermer',
    failed: 'Impossible de lancer le paiement.',
  },
};

const BANK_NAME: Record<BankProvider, string> = { azul: 'AZUL', cardnet: 'CardNET' };

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

const formatMoney = (value: number, currency: 'USD' | 'DOP', lang: Lang) => {
  const symbol = currency === 'DOP' ? 'RD$' : 'US$';
  const number = new Intl.NumberFormat(lang === 'en' ? 'en-US' : `${lang}-${lang === 'es' ? 'DO' : lang.toUpperCase()}`, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
}) => {
  const lang: Lang = (['es', 'de', 'fr'].includes(locale) ? locale : 'en') as Lang;
  const t = COPY[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [bankModal, setBankModal] = useState<BankProvider | null>(null);
  const [starting, setStarting] = useState(false);
  const [cardError, setCardError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState<PaymentsReady | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const { brandSettings } = useBrand();

  // Asked once per mount rather than per click: the answer is a handful of
  // booleans and the endpoint lets the browser cache it briefly.
  useEffect(() => {
    let current = true;
    getPaymentsReady().then((next) => {
      if (current) setReady(next);
    });
    return () => {
      current = false;
    };
  }, []);

  const stripeReady = ready?.stripe ?? false;
  const methods = getPaymentMethodStates(brandSettings, {
    stripe: stripeReady,
    azul: ready?.azul ?? false,
    cardnet: ready?.cardnet ?? false,
  });
  const anyVisible = Object.values(methods).some((state) => state.visible);
  const hostedCardLink = getCardCheckoutLink(brandSettings);
  const totalUsd = typeof amount === 'number' && amount > 0 ? amount : extractAmountNumber(selectedPrice);
  const displayPrice = selectedPrice || (totalUsd ? formatMoney(totalUsd, 'USD', lang) : t.inquire);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 288;
      let left = rect.right - width;
      if (left < 16) left = 16;
      if (left + width > window.innerWidth - 16) left = window.innerWidth - width - 16;
      setDropdownCoords({ top: rect.bottom + 8, left });
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
  }, [isOpen]);

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
    openWhatsAppConfirmation('PayPal Direct');
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
    setCardModalOpen(true);
  };

  const handleBank = (provider: BankProvider) => {
    playClickFx();
    setIsOpen(false);
    setCardError('');
    setCopied(false);
    setBankModal(provider);
  };

  const booking = () => ({
    category,
    serviceId,
    title: excursionTitle,
    persons,
    date: bookingDate,
    amount: totalUsd ?? undefined,
    locale: lang,
  });

  /**
   * Leave for Stripe.
   *
   * A same-tab navigation, not a popup: this runs after an await, so a
   * `window.open` here would be outside the click gesture and blocked. Going
   * in the same tab is also what makes the return trip work — Stripe sends the
   * guest back to success_url, and PaymentReturn picks them up there.
   */
  const handleCardProceed = async () => {
    playClickFx();

    // No API key, but the operator pasted their own hosted page: use that.
    if (!stripeReady && hostedCardLink) {
      setCardModalOpen(false);
      window.open(hostedCardLink, '_blank');
      openWhatsAppConfirmation('Tarjeta (enlace del operador)');
      return;
    }

    setStarting(true);
    setCardError('');
    try {
      const url = await createStripeCheckout(booking());
      window.location.href = url;
    } catch (error: any) {
      setStarting(false);
      setCardError(error?.message || t.failed);
    }
  };

  /** What the bank will charge, in the bank's currency, when that can be known here. */
  const bankAmount = (provider: BankProvider): { value: number; currency: 'USD' | 'DOP' } | null => {
    if (!totalUsd) return null;
    const currency = ready?.currencies?.[provider] ?? 'USD';
    if (currency === 'DOP') {
      return ready?.dopPerUsd ? { value: Math.round(totalUsd * ready.dopPerUsd * 100) / 100, currency } : null;
    }
    return { value: totalUsd, currency: 'USD' };
  };

  const bankLinkFor = (provider: BankProvider) => {
    const link = getBankPaymentLink(brandSettings, provider);
    if (!link) return null;
    const charged = bankAmount(provider) ?? (totalUsd ? { value: totalUsd, currency: 'USD' as const } : null);
    return {
      ...fillPaymentLink(link, {
        amount: charged?.value ?? 0,
        currency: charged?.currency ?? 'USD',
        reference: excursionTitle,
      }),
      charged,
    };
  };

  const handleBankProceed = async (provider: BankProvider) => {
    playClickFx();
    const gatewayReady = provider === 'azul' ? ready?.azul : ready?.cardnet;

    if (!gatewayReady) {
      // Link mode: no await before the open, so it stays inside the click.
      const link = bankLinkFor(provider);
      if (link?.url) {
        window.open(link.url, '_blank', 'noopener');
        openWhatsAppConfirmation(`${BANK_NAME[provider]} (link)`);
        setBankModal(null);
      }
      return;
    }

    setStarting(true);
    setCardError('');
    try {
      const { action, fields } = await startBankCheckout(provider, booking());
      postToGateway(action, fields);
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

  const summaryRows = (
    <>
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
    </>
  );

  const modalShell = (title: string, icon: React.ReactNode, onClose: () => void, children: React.ReactNode) =>
    createPortal(
      <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
        <div className="relative w-full max-w-md rounded-[28px] border border-[rgba(150,112,31,0.4)] bg-[#17313F] p-7 text-paper shadow-ink-lg animate-in zoom-in-95">
          <button
            onClick={() => {
              playClickFx();
              onClose();
            }}
            className="absolute right-4 top-4 text-paper/70 hover:text-paper"
            aria-label={t.close}
          >
            ✕
          </button>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky/25 text-sky-light font-bold">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="text-xs text-paper/70">{excursionTitle}</p>
            </div>
          </div>
          {children}
        </div>
      </div>,
      document.body
    );

  const renderBankModal = (provider: BankProvider) => {
    const gatewayReady = provider === 'azul' ? ready?.azul : ready?.cardnet;
    const charged = bankAmount(provider);
    const link = gatewayReady ? null : bankLinkFor(provider);
    const mustEnterAmount = Boolean(link && !link.carriesAmount && (link.charged || totalUsd));
    const amountToEnter = link?.charged
      ? formatMoney(link.charged.value, link.charged.currency, lang)
      : totalUsd
      ? formatMoney(totalUsd, 'USD', lang)
      : '';

    return modalShell(BANK_NAME[provider], <FaUniversity />, () => setBankModal(null), (
      <>
        <div className="space-y-4 rounded-2xl border-2 border-paper/20 bg-paper/5 p-4 text-xs">
          {summaryRows}
          {charged && charged.currency === 'DOP' && (
            <div className="flex justify-between gap-4 border-t border-paper/15 pt-2">
              <span className="text-paper/70">≈ {t.atBank}:</span>
              <span className="text-right font-bold text-white">
                {formatMoney(charged.value, 'DOP', lang)}
                {ready?.dopPerUsd && (
                  <span className="block text-[0.6rem] font-normal text-paper/60">
                    {t.rate} {ready.dopPerUsd}
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 border-t-2 border-paper/20 pt-2 text-paper/70">
            <FaShieldAlt className="text-jungle-light" />
            <span>{t.bankSafe}</span>
          </div>
        </div>

        {mustEnterAmount && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-mango-light/40 bg-mango/15 p-3 text-xs">
            <div>
              <div className="text-paper/70">{t.enterAmount}</div>
              <div className="text-base font-bold text-mango-light">{amountToEnter}</div>
            </div>
            <button
              type="button"
              onClick={() => copyAmount((link?.charged?.value ?? totalUsd ?? 0).toFixed(2))}
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
            onClick={() => handleBankProceed(provider)}
            disabled={starting || (!gatewayReady && !link?.url)}
            className="w-full rounded-full border border-[rgba(150,112,31,0.4)] bg-lagoon-light py-3 text-xs font-extrabold uppercase tracking-wider text-ink shadow-ink-sm transition hover:bg-mango-light disabled:opacity-60"
          >
            {starting
              ? t.opening
              : gatewayReady && charged
              ? t.payWith.replace('{amount}', formatMoney(charged.value, charged.currency, lang)).replace('{method}', BANK_NAME[provider])
              : t.continueTo.replace('{method}', BANK_NAME[provider])}
          </button>
          <p className="text-center text-[0.65rem] text-paper/60">{gatewayReady ? t.bankNote : t.linkNote}</p>
        </div>
      </>
    ));
  };

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

          {methods.stripe.visible &&
            methodButton('stripe', handleCard, <FaCreditCard className="h-4 w-4" />, 'bg-sky/25 text-sky-light', t.card, t.cardHint)}
          {methods.azul.visible &&
            methodButton(
              'azul',
              () => handleBank('azul'),
              <span className="text-[0.6rem] font-black tracking-tight">AZUL</span>,
              'bg-sky-dark/40 text-white',
              'AZUL · Banco Popular',
              t.azulHint
            )}
          {methods.cardnet.visible &&
            methodButton(
              'cardnet',
              () => handleBank('cardnet'),
              <FaUniversity className="h-4 w-4" />,
              'bg-grape/30 text-grape-light',
              'CardNET',
              t.cardnetHint
            )}
          {methods.paypal.visible &&
            methodButton('paypal', handlePayPal, <FaPaypal className="h-4 w-4" />, 'bg-sky-dark/30 text-sky-light', t.paypal, t.paypalHint)}
          {methods.cash.visible &&
            methodButton('cash', handleWhatsApp, <FaWhatsapp className="h-4 w-4" />, 'bg-jungle/25 text-jungle-light', t.cash, t.cashHint)}
        </div>,
        document.body
      )}

      {cardModalOpen &&
        modalShell(t.cardTitle, '💳', () => setCardModalOpen(false), (
          <>
            <div className="space-y-4 rounded-2xl border-2 border-paper/20 bg-paper/5 p-4 text-xs">
              {summaryRows}
              <div className="flex items-center gap-2 border-t-2 border-paper/20 pt-2 text-paper/70">
                <FaShieldAlt className="text-jungle-light" />
                <span>{t.stripeSafe}</span>
              </div>
            </div>

            {cardError && (
              <div className="mt-4 rounded-xl border-2 border-mango-light/50 bg-mango/20 p-3 text-xs text-mango-light">
                {cardError}
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                onClick={handleCardProceed}
                disabled={starting}
                className="w-full rounded-full border border-[rgba(150,112,31,0.4)] bg-lagoon-light py-3 text-xs font-extrabold uppercase tracking-wider text-ink shadow-ink-sm transition hover:bg-mango-light disabled:opacity-60"
              >
                {starting ? t.opening : t.payWith.replace('{amount}', displayPrice).replace('{method}', t.card)}
              </button>
              <p className="text-center text-[0.65rem] text-paper/60">{t.stripeNote}</p>
            </div>
          </>
        ))}

      {bankModal && renderBankModal(bankModal)}
    </div>
  );
};

export default PaymentDropdown;
