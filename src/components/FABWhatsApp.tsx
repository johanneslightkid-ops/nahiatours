import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { useIntl } from 'react-intl';
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
  const intl = useIntl();
  const isEs = intl.locale === 'es';
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
      // `jungle-dark` rather than `jungle`: white on the lighter green is
      // 4.3:1, which fails on a label this small. The deep palm green clears
      // 8:1 and is the pigment the rest of the site uses for WhatsApp anyway.
      className="whatsapp-fab animate-fab-glow-wave fixed bottom-6 right-6 z-50 flex h-14 items-center justify-center gap-2.5 rounded-full bg-jungle-dark px-5 text-paper shadow-ink-lg transition-transform duration-200 hover:-translate-y-1 hover:bg-[#1a3f33]"
      aria-label="Contact via WhatsApp"
      title={`Chat with ${brandName} on WhatsApp`}
    >
      <FaWhatsapp className="h-6 w-6" />
      <span className="hidden text-[0.7rem] font-bold uppercase tracking-[0.16em] sm:inline">
        {isEs ? 'Escríbenos' : 'Chat with us'}
      </span>
    </button>
  );
};

export default FABWhatsApp;
