import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { FaPlayCircle, FaMapPin, FaClock, FaUsers } from 'react-icons/fa';
import { useBrand } from '../contexts/BrandContext';
import { generateWhatsAppMessage } from '../utils/whatsapp';
import { playClickFx, playHoverFx } from '../lib/soundEngine';

interface Adventure {
  id: string;
  title: string;
  emoji: string;
  duration: string;
  vibe: string;
  description: string;
  highlights: string[];
  bestFor: string;
  vimeoUrl: string;
  imageUrl: string;
  mood: string;
}

interface AdventureCardProps {
  adventure: Adventure;
  onBook?: (adventureId: string) => void;
  index?: number;
}

const AdventureCard: React.FC<AdventureCardProps> = ({ adventure, onBook, index = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const navigate = useNavigate();
  const { brandSettings } = useBrand();
  const whatsappPhone = brandSettings.phoneNumber || '+18095553333';
  const swayClass = `animate-wave-sway-${(index % 10) + 1}`;

  const handleWhatsAppClick = () => {
    playClickFx();
    const message = `Hola! Me gustaría más información sobre: ${adventure.title} con ${brandSettings.brandName}`;
    window.open(generateWhatsAppMessage(whatsappPhone, message), '_blank');
  };

  const detailPaths: Record<string, string> = {
    buggy: '/details/tours/2-buggies-adventure',
    party_boat: '/details/tours/3-party-boat-experience',
    waterfall: '/tours'
  };

  const handleShowDetails = () => {
    playClickFx();
    navigate(detailPaths[adventure.id] || '/tours');
  };

  return (
    <div
      onMouseEnter={() => playHoverFx()}
      className={`artsy-glass-card group flex h-full flex-col overflow-hidden ${swayClass}`}
    >
      {/* Image container */}
      <div className="relative h-60 overflow-hidden border-b-[3px] border-ink bg-paper-warm sm:h-64 md:h-80">
        <img
          src={adventure.imageUrl}
          alt={adventure.title}
          className="photo-pop h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Ink wash on hover, so the play button has something to sit against */}
        <div className="absolute inset-0 bg-ink/45 opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Video button overlay */}
        {!showVideo && (
          <button
            onClick={() => {
              playClickFx();
              setShowVideo(true);
            }}
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
          >
            <FaPlayCircle className="text-6xl text-paper transition-transform hover:scale-110" />
          </button>
        )}

        {/* Emoji badge */}
        <div
          className="absolute right-4 top-4 border-[3px] border-paper bg-ink p-2.5 text-2xl leading-none shadow-[3px_3px_0_0_#C1121F]"
          style={{ transform: 'rotate(4deg)' }}
        >
          <span style={{ filter: 'grayscale(1) contrast(1.3) brightness(2)' }}>{adventure.emoji}</span>
        </div>
      </div>

      {/* Video embed */}
      {showVideo && (
        <div className="relative w-full bg-black aspect-video">
          <iframe
            width="100%"
            height="100%"
            src={adventure.vimeoUrl.replace('vimeo.com', 'player.vimeo.com/video')}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={adventure.title}
          />
          <button
            onClick={() => {
              playClickFx();
              setShowVideo(false);
            }}
            className="absolute right-2 top-2 z-10 border-2 border-paper bg-mango px-3 py-1 font-condensed text-xs uppercase tracking-[0.14em] text-paper"
          >
            Close Video
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-2xl leading-none text-ink">{adventure.title}</h3>
        <span className="mb-3 mt-2 block h-[3px] w-10 bg-mango transition-all duration-300 group-hover:w-24" />

        {/* Quick info */}
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 font-condensed text-xs uppercase tracking-[0.14em]">
          <div className="flex items-center gap-1.5 text-ink">
            <FaClock className="text-base text-mango" />
            <span>{adventure.duration}</span>
          </div>
          <div className="flex items-center gap-1.5 text-ink">
            <FaUsers className="text-base text-mango" />
            <span>{adventure.vibe}</span>
          </div>
        </div>

        {/* Description */}
        <p className="mb-4 flex-1 font-medium italic leading-relaxed text-ink-soft">{adventure.description}</p>

        {/* Expandable section */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? 'max-h-96' : 'max-h-0'
          }`}
        >
          <div className="mt-4 border-t-[3px] border-ink pt-4">
            <div className="mb-4">
              <h4 className="mb-2 font-condensed text-sm uppercase tracking-[0.16em] text-ink">
                <FormattedMessage id="story.highlights" />
              </h4>
              <ul className="space-y-2">
                {adventure.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex gap-2 text-sm font-medium text-ink-soft">
                    <span className="font-bold text-mango">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="mb-2 font-condensed text-sm uppercase tracking-[0.16em] text-ink">
                <FormattedMessage id="story.bestFor" />
              </h4>
              <p className="text-sm font-medium text-ink-soft">{adventure.bestFor}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {adventure.mood.split(', ').map((mood, idx) => (
                <span
                  key={idx}
                  className="border-2 border-ink bg-paper-warm px-3 py-1 font-condensed text-xs uppercase tracking-[0.1em] text-ink"
                >
                  {mood}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => {
              playClickFx();
              setIsExpanded(!isExpanded);
            }}
            className="flex-1 border-[3px] border-ink bg-paper px-4 py-2.5 font-condensed text-xs uppercase tracking-[0.14em] text-ink shadow-ink-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-ink hover:text-paper"
          >
            {isExpanded ? 'Show Less' : 'Details'}
          </button>
          <button
            onClick={handleWhatsAppClick}
            className="flex flex-1 items-center justify-center gap-2 border-[3px] border-ink bg-mango px-4 py-2.5 font-condensed text-xs uppercase tracking-[0.14em] text-paper shadow-ink-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-mango-light"
          >
            <FaMapPin className="text-base" />
            Book Now
          </button>
          <button
            onClick={handleShowDetails}
            className="flex flex-1 items-center justify-center border-[3px] border-ink bg-paper px-4 py-2.5 font-condensed text-xs uppercase tracking-[0.14em] text-ink shadow-ink-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-ink hover:text-paper"
          >
            All Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdventureCard;
