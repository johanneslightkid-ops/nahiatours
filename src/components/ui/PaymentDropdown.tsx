import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaPaypal, FaCreditCard, FaWhatsapp, FaChevronDown, FaShieldAlt } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';

interface PaymentDropdownProps {
  excursionTitle?: string;
  selectedPrice?: string;
  selectedTier?: string;
  className?: string;
}

const extractAmountNumber = (priceStr?: string): number | null => {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
};

const buildDynamicPayPalUrl = (baseUrl: string, priceStr?: string): string => {
  const amount = extractAmountNumber(priceStr);
  const fallback = 'https://www.paypal.com/paypalme/carlostours';
  const targetBase = (baseUrl && baseUrl.trim()) ? baseUrl.trim() : fallback;
  
  if (!amount || amount <= 0) return targetBase;

  const cleanBase = targetBase.replace(/\/+$/, '').replace(/\/\d+(?:\.\d+)?(?:USD)?$/i, '');
  return `${cleanBase}/${amount}USD`;
};

export const PaymentDropdown: React.FC<PaymentDropdownProps> = ({
  excursionTitle = 'Excursion',
  selectedPrice,
  selectedTier,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);
  const { brandSettings } = useBrand();

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 288;
      let left = rect.right - width;
      if (left < 16) left = 16;
      if (left + width > window.innerWidth - 16) left = window.innerWidth - width - 16;
      setDropdownCoords({
        top: rect.bottom + 8,
        left,
      });
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
    const phone = brandSettings.phoneNumber || '+18095550123';
    const message = `Hola! Estoy comprando esto ahora mismo (${excursionTitle}${details}) vía ${paymentMethod}. Por favor confirma personalmente también.\n\nHello! I am buying this right now (${excursionTitle}${details}) via ${paymentMethod}. Please confirm personally as well.`;
    
    const waUrl = generateWhatsAppMessage(phone, message);
    if (waUrl) {
      setTimeout(() => {
        window.open(waUrl, '_blank');
      }, 350);
    }
  };

  const handlePayPal = () => {
    playClickFx();
    setIsOpen(false);
    const targetUrl = buildDynamicPayPalUrl(brandSettings.paypalMeLink, selectedPrice);
    window.open(targetUrl, '_blank');
    openWhatsAppConfirmation('PayPal Direct');
  };

  const handleWhatsApp = () => {
    playClickFx();
    setIsOpen(false);
    openWhatsAppConfirmation('VIP Concierge / Cash');
  };

  const handleStripe = () => {
    playClickFx();
    setIsOpen(false);
    setStripeModalOpen(true);
  };

  const handleStripeProceed = () => {
    playClickFx();
    setStripeModalOpen(false);
    const amount = extractAmountNumber(selectedPrice);
    const targetStripeUrl = brandSettings.verifoneLink || brandSettings.stripePublishableKey
      ? (brandSettings.verifoneLink || `https://buy.stripe.com/pay?amount=${amount || ''}`)
      : 'https://stripe.com';

    if (brandSettings.verifoneLink || brandSettings.stripePublishableKey) {
      window.open(targetStripeUrl, '_blank');
    }

    openWhatsAppConfirmation('Tarjeta (Stripe)');
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        onMouseEnter={() => playHoverFx()}
        onClick={() => {
          playClickFx();
          setIsOpen(!isOpen);
        }}
        className="inline-flex w-full items-center justify-between gap-2.5 rounded-full bg-white px-6 py-3 font-bold text-lagoon-dark ring-1 ring-lagoon/35 transition hover:-translate-y-0.5 hover:bg-lagoon-light/40 hover:ring-lagoon active:translate-y-0"
      >
        <span className="flex items-center gap-2">
          <span>💳</span>
          <span>Book & Pay Now</span>
        </span>
        <FaChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu via Portal to document.body */}
      {isOpen && dropdownCoords && createPortal(
        <div
          ref={dropdownRef}
          style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
          className="fixed z-[99999] w-72 rounded-2xl bg-abyss p-2 text-paper shadow-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-top-2"
        >
          <div className="px-3 py-2 mb-1 border-b border-white/15 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-sunset-light">
            Choose Payment Method
          </div>

          <button
            onMouseEnter={() => playHoverFx()}
            onClick={handleStripe}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left group transition hover:bg-paper/10"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky/25 text-sky-light group-hover:scale-110 transition-transform">
              <FaCreditCard className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold">Credit / Debit Card</div>
              <div className="text-[0.65rem] text-paper/70">Instant Stripe Secure Payment</div>
            </div>
          </button>

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
              <div className="text-[0.65rem] text-paper/70">Fast & Buyer-Protected Checkout</div>
            </div>
          </button>

          <button
            onMouseEnter={() => playHoverFx()}
            onClick={handleWhatsApp}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left group transition hover:bg-paper/10"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-jungle/25 text-jungle-light group-hover:scale-110 transition-transform">
              <FaWhatsapp className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold">VIP Concierge / Cash</div>
              <div className="text-[0.65rem] text-paper/70">Reserve now, pay on arrival</div>
            </div>
          </button>
        </div>,
        document.body
      )}

      {/* Stripe Modal via Portal to document.body */}
      {stripeModalOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl ring-1 ring-ink/10 bg-[#17313F] p-7 text-paper shadow-xl animate-in zoom-in-95">
            <button
              onClick={() => {
                playClickFx();
                setStripeModalOpen(false);
              }}
              className="absolute right-4 top-4 text-paper/70 hover:text-paper"
            >
              ✕
            </button>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky/25 text-sky-light font-bold">
                💳
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Stripe Card Checkout</h3>
                <p className="text-xs text-paper/70">{excursionTitle}</p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border-2 border-paper/20 bg-paper/5 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-paper/70">Selected Option:</span>
                <span className="font-bold text-white">{selectedTier || 'Standard Excursion'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-paper/70">Total Price:</span>
                <span className="text-sm font-bold text-sunset-light">{selectedPrice || 'Inquire'}</span>
              </div>
              <div className="flex items-center gap-2 border-t-2 border-paper/20 pt-2 text-paper/70">
                <FaShieldAlt className="text-jungle-light" />
                <span>256-Bit SSL Encrypted Payment</span>
              </div>
            </div>

            {brandSettings.verifoneLink || brandSettings.stripePublishableKey ? (
              <div className="mt-5 space-y-3">
                <p className="text-xs text-paper/70">
                  Click below to proceed to Stripe encrypted card payment portal.
                </p>
                <button
                  onClick={handleStripeProceed}
                  className="w-full rounded-full ring-1 ring-ink/10 bg-lagoon-light py-3 text-xs font-extrabold uppercase tracking-wider text-ink shadow-md transition hover:bg-mango-light"
                >
                  Pay {selectedPrice ? selectedPrice : ''} with Card via Stripe
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-sunset-light/40 bg-sunset/15 p-3 text-xs text-sunset-light">
                  Stripe publishable API key or Payment Link is pending in Admin Settings. You can confirm instantly via WhatsApp Concierge or PayPal.
                </div>
                <button
                  onClick={handleStripeProceed}
                  className="w-full rounded-full bg-jungle py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-jungle"
                >
                  Confirm Reservation & Open WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PaymentDropdown;
