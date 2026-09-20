import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaPaypal, FaCreditCard, FaWhatsapp, FaChevronDown, FaShieldAlt } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';
import { getPaymentMethodStates, getCardCheckoutLink } from '../../utils/paymentMethods';
import { createStripeCheckout, isStripeReady } from '../../services/paymentService';

/**
 * How a guest pays.
 *
 * Card goes to Stripe for real. There is no Payment Link with the amount in
 * the query string — Stripe links are fixed-price — so the server mints a
 * Checkout Session per booking and the browser is sent to the one-shot hosted
 * page it returns. The guest needs no Stripe account; Stripe offers a login
 * only for its own saved cards.
 *
 * WHICH BUTTONS APPEAR is decided by paymentMethods.ts: a method shows only
 * when it is both configured and switched on. If the operator has configured
 * nothing, the dropdown collapses to a single WhatsApp button, because three
 * options that all dead-end is worse than one that works.
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
  /** How many people are being paid for. Drives the Stripe line-item quantity. */
  persons?: number;
  /** Human-readable preferred date, carried onto the payment for the operator. */
  bookingDate?: string;
  locale?: string;
}

const extractAmountNumber = (priceStr?: string): number | null => {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
};

const buildDynamicPayPalUrl = (baseUrl: string, priceStr?: string): string => {
  const amount = extractAmountNumber(priceStr);
  const targetBase = (baseUrl && baseUrl.trim()) ? baseUrl.trim() : '';
  if (!targetBase) return '';
  if (!amount || amount <= 0) return targetBase;

  const cleanBase = targetBase.replace(/\/+$/, '').replace(/\/\d+(?:\.\d+)?(?:USD)?$/i, '');
  return `${cleanBase}/${amount}USD`;
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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cardError, setCardError] = useState('');
  const [stripeReady, setStripeReady] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const { brandSettings } = useBrand();

  // Asked once per mount rather than per card: the answer is a single boolean
  // and the endpoint lets the browser cache it briefly.
  useEffect(() => {
    let current = true;
    isStripeReady().then((ready) => {
      if (current) setStripeReady(ready);
    });
    return () => {
      current = false;
    };
  }, []);

  const methods = getPaymentMethodStates(brandSettings, stripeReady);
  const anyVisible = methods.stripe.visible || methods.paypal.visible || methods.cash.visible;
  const hostedCardLink = getCardCheckoutLink(brandSettings);

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
    const details = selectedPrice ? ` (${selectedTier || 'Option'}: ${selectedPrice})` : '';
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
    const targetUrl = buildDynamicPayPalUrl(brandSettings.paypalMeLink, selectedPrice);
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
      const url = await createStripeCheckout({
        category,
        serviceId,
        title: excursionTitle,
        persons,
        date: bookingDate,
        amount: extractAmountNumber(selectedPrice) ?? undefined,
        locale,
      });
      window.location.href = url;
    } catch (error: any) {
      setStarting(false);
      setCardError(error?.message || 'Could not start the card payment.');
    }
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
        className="inline-flex items-center justify-between gap-2.5 rounded-full border border-[rgba(150,112,31,0.4)] bg-lagoon px-6 py-3 font-extrabold text-white shadow-oil-sm transition hover:-translate-y-0.5 hover:bg-lagoon-light hover:text-ink active:translate-y-0"
      >
        <span className="flex items-center gap-2">
          <span>💳</span>
          <span>Book &amp; Pay Now</span>
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
          className="fixed z-[99999] w-72 rounded-2xl border border-[rgba(150,112,31,0.4)] bg-[#17313F] p-2 text-paper shadow-oil animate-in fade-in slide-in-from-top-2"
        >
          <div className="px-3 py-2 mb-1 border-b-2 border-paper/20 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-mango-light">
            Choose Payment Method
          </div>

          {methods.stripe.visible && (
            <button
              onMouseEnter={() => playHoverFx()}
              onClick={handleCard}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left group transition hover:bg-paper/10"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky/25 text-sky-light group-hover:scale-110 transition-transform">
                <FaCreditCard className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold">Credit / Debit Card</div>
                <div className="text-[0.65rem] text-paper/70">Secure checkout — no account needed</div>
              </div>
            </button>
          )}

          {methods.paypal.visible && (
            <button
              onMouseEnter={() => playHoverFx()}
              onClick={handlePayPal}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left group transition hover:bg-paper/10"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-dark/30 text-sky-light group-hover:scale-110 transition-transform">
                <FaPaypal className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold">PayPal Direct</div>
                <div className="text-[0.65rem] text-paper/70">Fast &amp; Buyer-Protected Checkout</div>
              </div>
            </button>
          )}

          {methods.cash.visible && (
            <button
              onMouseEnter={() => playHoverFx()}
              onClick={handleWhatsApp}
              className="flex w-full items-center gap-3 rounded-xl p-3 text-left group transition hover:bg-paper/10"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-palm/25 text-jungle-light group-hover:scale-110 transition-transform">
                <FaWhatsapp className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold">VIP Concierge / Cash</div>
                <div className="text-[0.65rem] text-paper/70">Reserve now, pay on arrival</div>
              </div>
            </button>
          )}
        </div>,
        document.body
      )}

      {cardModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-md rounded-[28px] border border-[rgba(150,112,31,0.4)] bg-[#17313F] p-7 text-paper shadow-oil-lg animate-in zoom-in-95">
            <button
              onClick={() => {
                playClickFx();
                setCardModalOpen(false);
              }}
              className="absolute right-4 top-4 text-paper/70 hover:text-paper"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky/25 text-sky-light font-bold">
                💳
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Card Checkout</h3>
                <p className="text-xs text-paper/70">{excursionTitle}</p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border-2 border-paper/20 bg-paper/5 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-paper/70">Selected Option:</span>
                <span className="font-bold text-white">{selectedTier || 'Standard Excursion'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-paper/70">People:</span>
                <span className="font-bold text-white">{persons}</span>
              </div>
              {bookingDate && (
                <div className="flex justify-between">
                  <span className="text-paper/70">Date:</span>
                  <span className="font-bold text-white">{bookingDate}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-paper/70">Total Price:</span>
                <span className="text-sm font-bold text-mango-light">{selectedPrice || 'Inquire'}</span>
              </div>
              <div className="flex items-center gap-2 border-t-2 border-paper/20 pt-2 text-paper/70">
                <FaShieldAlt className="text-jungle-light" />
                <span>Card details are entered on Stripe, never on this site</span>
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
                className="w-full rounded-full border border-[rgba(150,112,31,0.4)] bg-lagoon-light py-3 text-xs font-extrabold uppercase tracking-wider text-ink shadow-oil-sm transition hover:bg-mango-light disabled:opacity-60"
              >
                {starting
                  ? 'Opening secure checkout…'
                  : `Pay ${selectedPrice ?? ''} with Card`}
              </button>
              <p className="text-center text-[0.65rem] text-paper/60">
                You will be taken to Stripe and returned here when the payment is done.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PaymentDropdown;
