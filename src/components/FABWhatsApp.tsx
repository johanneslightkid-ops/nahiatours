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
      className="whatsapp-fab animate-fab-glow-wave fixed bottom-6 right-6 z-50 flex h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-mango-light via-mango to-mango-dark px-6 text-white transition-transform duration-300 hover:-translate-y-1"
      aria-label="Contact via WhatsApp"
      title={`Chat with ${brandName} on WhatsApp`}
    >
      <FaWhatsapp className="h-7 w-7" />
      <span className="hidden text-xs font-bold uppercase tracking-[0.12em] sm:inline">
        WhatsApp Concierge
      </span>
    </button>
  );
};

export default FABWhatsApp;
