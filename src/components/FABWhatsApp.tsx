import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { useBrand } from '../contexts/BrandContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { playClickFx, playHoverFx } from '../lib/soundEngine';

interface FABWhatsAppProps {
  phoneNumber?: string;
  message?: string;
}

const FABWhatsApp: React.FC<FABWhatsAppProps> = ({
  phoneNumber,
  message = 'Hola! Me gustaría información sobre los tours de Francisco Ferreras.'
}) => {
  const { brandSettings } = useBrand();
  const effectivePhone = phoneNumber || brandSettings.phoneNumber || '+18095553333';

  const handleClick = () => {
    playClickFx();
    window.open(generateWhatsAppMessage(effectivePhone, message), '_blank');
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => playHoverFx()}
      className="whatsapp-fab animate-fab-glow-wave fixed bottom-6 right-6 z-50 flex h-14 items-center justify-center gap-2.5 rounded-full border-[2.5px] border-ink bg-jungle px-5 text-white transition-transform duration-200 hover:-translate-y-1 hover:bg-jungle-light hover:text-ink"
      aria-label="Contact via WhatsApp"
      title="Chat with Francisco Ferreras Concierge on WhatsApp"
    >
      <FaWhatsapp className="h-7 w-7" />
      <span className="hidden text-xs font-extrabold uppercase tracking-wider sm:inline">
        WhatsApp Concierge
      </span>
    </button>
  );
};

export default FABWhatsApp;
