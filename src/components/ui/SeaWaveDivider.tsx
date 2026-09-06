import React from 'react';

interface SeaWaveDividerProps {
  variant?: 'crest' | 'deep-crest' | 'swell' | 'tall-swell' | 'tide' | 'foam';
  colorClass?: string;
  className?: string;
  flip?: boolean;
}

export const SeaWaveDivider: React.FC<SeaWaveDividerProps> = ({
  variant = 'crest',
  colorClass = 'text-[#061d2b]/15',
  className = '',
  flip = false,
}) => {
  const transformClass = flip ? 'rotate-180' : '';

  if (variant === 'deep-crest') {
    return (
      <div className={`w-full overflow-hidden leading-none pointer-events-none select-none ${className}`}>
        <svg
          className={`relative block w-full h-14 sm:h-20 md:h-28 lg:h-36 ${colorClass} ${transformClass}`}
          viewBox="0 0 1200 140"
          preserveAspectRatio="none"
        >
          <path
            d="M0,15 C220,65 480,-10 720,50 C920,115 1060,135 1200,5 L1200,140 L0,140 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'tall-swell') {
    return (
      <div className={`w-full overflow-hidden leading-none pointer-events-none select-none ${className}`}>
        <svg
          className={`relative block w-full h-24 sm:h-36 md:h-48 lg:h-56 ${colorClass} ${transformClass}`}
          viewBox="0 0 1200 190"
          preserveAspectRatio="none"
        >
          <path
            d="M0,15 C200,130 450,-20 720,100 C960,190 1100,30 1200,65 L1200,190 L0,190 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'swell') {
    return (
      <div className={`w-full overflow-hidden leading-none pointer-events-none select-none ${className}`}>
        <svg
          className={`relative block w-full h-10 sm:h-14 md:h-18 lg:h-24 ${colorClass} ${transformClass}`}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 C150,90 350,-40 550,60 C750,150 950,10 1200,40 L1200,120 L0,120 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'tide') {
    return (
      <div className={`w-full overflow-hidden leading-none pointer-events-none select-none ${className}`}>
        <svg
          className={`relative block w-full h-8 sm:h-12 md:h-16 ${colorClass} ${transformClass}`}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,30 Q300,100 600,20 T1200,40 L1200,120 L0,120 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'foam') {
    return (
      <div className={`w-full overflow-hidden leading-none pointer-events-none select-none ${className}`}>
        <svg
          className={`relative block w-full h-12 sm:h-16 md:h-20 ${colorClass} ${transformClass}`}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,40 C200,110 450,10 700,70 C950,130 1100,20 1200,50 L1200,120 L0,120 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden leading-none pointer-events-none select-none ${className}`}>
      <svg
        className={`relative block w-full h-12 sm:h-16 md:h-24 lg:h-28 ${colorClass} ${transformClass}`}
        viewBox="0 0 1200 130"
        preserveAspectRatio="none"
      >
        <path
          d="M0,10 C250,75 520,5 780,65 C950,115 1100,125 1200,15 L1200,130 L0,130 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
};

export default SeaWaveDivider;
