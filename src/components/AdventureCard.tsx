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

  // Pebble-round, like everything else here. The old torn corners belonged
  // to a different design.
  const radiusClass = 'rounded-3xl';

  return (
    <div
      onMouseEnter={() => playHoverFx()}
      className={`group flex h-full flex-col overflow-hidden ${radiusClass} booking-card ${swayClass}`}
    >
      {/* Image container */}
      <div className="relative h-60 overflow-hidden bg-paper-warm sm:h-64 md:h-80">
        <img
          src={adventure.imageUrl}
          alt={adventure.title}
          className="photo-pop h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Ink wash on hover, so the play button has something to sit against */}
        <div className="absolute inset-0 bg-abyss/50 opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Video button overlay */}
        {!showVideo && (
          <button
            onClick={() => {
              playClickFx();
              setShowVideo(true);
            }}
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
          >
            <FaPlayCircle className="text-6xl text-white drop-shadow-lg transition-transform hover:scale-110" />
          </button>
        )}

        {/* Emoji badge */}
        <div className="absolute right-4 top-4 grid h-16 w-16 place-items-center rounded-full bg-white/92 text-3xl leading-none shadow-lg backdrop-blur">
          {adventure.emoji}
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
            className="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-ink shadow-md backdrop-blur transition hover:bg-white"
          >
            Close Video
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="mb-3 font-display text-2xl font-extrabold leading-tight text-ink">{adventure.title}</h3>

        {/* Quick info */}
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5 text-lagoon-dark">
            <FaClock className="text-base" />
            <span>{adventure.duration}</span>
          </div>
          <div className="flex items-center gap-1.5 text-mango-dark">
            <FaUsers className="text-base" />
            <span>{adventure.vibe}</span>
          </div>
        </div>

        {/* Description */}
        <p className="mb-4 flex-1 font-semibold italic leading-relaxed text-ink-soft">{adventure.description}</p>

        {/* Expandable section */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? 'max-h-96' : 'max-h-0'
          }`}
        >
          <div className="mt-4 border-t border-ink/10 pt-4">
            <div className="mb-4">
              <h4 className="mb-2 font-display font-extrabold text-ink">
                <FormattedMessage id="story.highlights" />
              </h4>
              <ul className="space-y-2">
                {adventure.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex gap-2 text-sm font-semibold text-ink-soft">
                    <span className="font-extrabold text-jungle">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="mb-2 font-display font-extrabold text-ink">
                <FormattedMessage id="story.bestFor" />
              </h4>
              <p className="text-sm font-semibold text-ink-soft">{adventure.bestFor}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {adventure.mood.split(', ').map((mood, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-lagoon-light/60 px-3 py-1.5 text-xs font-bold text-lagoon-dark"
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
            className="flex-1 rounded-full bg-paper-warm px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-ink-soft ring-1 ring-ink/10 transition hover:-translate-y-0.5 hover:bg-lagoon-light/60 hover:text-lagoon-dark"
          >
            {isExpanded ? 'Show Less' : 'Details'}
          </button>
          <button
            onClick={handleWhatsAppClick}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-mango-light via-mango to-mango-dark px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-coral transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <FaMapPin className="text-base" />
            Book Now
          </button>
          <button
            onClick={handleShowDetails}
            className="flex flex-1 items-center justify-center rounded-full bg-paper-warm px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-ink-soft ring-1 ring-ink/10 transition hover:-translate-y-0.5 hover:bg-lagoon-light/60 hover:text-lagoon-dark"
          >
            All Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdventureCard;
