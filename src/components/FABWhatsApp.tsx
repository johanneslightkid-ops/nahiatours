import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { useBrand } from '../contexts/BrandContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { playClickFx, playHoverFx } from '../lib/soundEngine';

interface FABWhatsAppProps {
  phoneNumber?: string;
  /** Overrides the default enquiry, which is built from the configured brand. */
  message?: string;
}

const FABWhatsApp: React.FC<FABWhatsAppProps> = ({ phoneNumber, message }) => {
  const { brandSettings } = useBrand();
  const effectivePhone = phoneNumber || brandSettings.phoneNumber;
  const brandName = brandSettings.brandName;

  // Built from the configured brand rather than hardcoded, so renaming the
  // company in the admin panel renames it here too.
  const effectiveMessage =
    message || `Hola! Me gustaría información sobre los tours de ${brandName}.`;

  const handleClick = () => {
    playClickFx();
    window.open(generateWhatsAppMessage(effectivePhone, effectiveMessage), '_blank');
  };

  return (
    <button
      onClick={handleClick}
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
