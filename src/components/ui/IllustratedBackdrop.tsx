import React from 'react';

/**
 * The page behind every page: plain ivory with the faintest grain. Fixed and
 * full-viewport, so it is one static layer and nothing in it moves.
 */
const IllustratedBackdrop: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 select-none bg-paper" style={{ zIndex: -1 }} aria-hidden="true">
    <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'var(--grain)' }} />
  </div>
);

export default IllustratedBackdrop;
