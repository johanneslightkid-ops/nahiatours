import React, { useEffect, useRef } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { useBrand } from '../contexts/BrandContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { playClickFx, playHoverFx } from '../lib/soundEngine';
import { siteNames } from '../utils/brandText';

interface FABWhatsAppProps {
  phoneNumber?: string;
  /** Overrides the default enquiry, which is built from the configured brand. */
  message?: string;
}

const FABWhatsApp: React.FC<FABWhatsAppProps> = ({ phoneNumber, message }) => {
  const { brandSettings } = useBrand();
  const effectivePhone = phoneNumber || brandSettings.phoneNumber;
  // "Los tours de …": the company's.
  const brandName = siteNames(brandSettings).brand;

  // Built from the configured brand rather than hardcoded, so renaming the
  // company in the admin panel renames it here too.
  const effectiveMessage =
    message || `Hola! Me gustaría información sobre los tours de ${brandName}.`;

  const button = useRef<HTMLButtonElement>(null);

  // Over the footer the button used to sit right on the Admin link. Once the
  // footer's last line comes into view it rises with it, so it always rests
  // 1rem above that line and everything on it stays clickable. A transform,
  // set once per frame at most.
  useEffect(() => {
    const element = button.current;
    if (!element) return undefined;
    let frame = 0;
    const place = () => {
      frame = 0;
      const bar = document.getElementById('footer-bar');
      if (!bar) return;
      const gap = 16;
      const box = element.getBoundingClientRect();
      const restingBottom = window.innerHeight - (parseFloat(getComputedStyle(element).bottom) || 20);
      const lift = Math.max(0, restingBottom - (bar.getBoundingClientRect().top - gap));
      element.style.setProperty('--fab-lift', `${-Math.min(lift, window.innerHeight - box.height - gap)}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  const handleClick = () => {
    playClickFx();
    window.open(generateWhatsAppMessage(effectivePhone, effectiveMessage), '_blank');
  };

  return (
    <button
      ref={button}
      onClick={handleClick}
      style={{ translate: '0 var(--fab-lift, 0px)' }}
      onMouseEnter={() => playHoverFx()}
      className="whatsapp-fab animate-fab-glow-wave fixed bottom-5 right-5 z-50 flex h-14 items-center justify-center gap-2.5 rounded-full bg-whatsapp px-4 text-[#06301a] shadow-ink-lg transition-transform duration-200 hover:-translate-y-1 sm:px-5"
      aria-label="Contact via WhatsApp"
      title={`Chat with ${brandName} on WhatsApp`}
    >
      <FaWhatsapp className="h-7 w-7" />
      <span className="hidden font-condensed text-sm font-bold uppercase tracking-[0.14em] sm:inline">
        WhatsApp
      </span>
    </button>
  );
};

export default FABWhatsApp;
