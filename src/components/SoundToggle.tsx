import React, { useState } from 'react';
import { isAudioEnabled, setAudioEnabled, playClickFx, playOceanWaveFx } from '../lib/soundEngine';

export const SoundToggle: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(() => isAudioEnabled());

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setAudioEnabled(next);
    if (next) {
      playClickFx();
      setTimeout(() => playOceanWaveFx(), 100);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? 'Mute Sound Effects (Audio FX ON)' : 'Enable Sound Effects (Audio FX OFF)'}
      aria-label={enabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
      className="inline-flex h-9 w-9 items-center justify-center border-2 transition-colors duration-200"
      style={{
        // On when it is red, off when it is an empty outline — the same rule
        // the rest of the interface follows.
        background: enabled ? '#C1121F' : 'transparent',
        borderColor: enabled ? '#C1121F' : 'rgba(245, 241, 232, 0.55)',
        color: enabled ? '#F5F1E8' : 'rgba(245, 241, 232, 0.8)',
      }}
    >
      <span
        className="select-none text-base leading-none transition-transform hover:scale-110"
        style={{ filter: 'grayscale(1) contrast(1.4) brightness(1.8)' }}
      >
        {enabled ? '🎵' : '🔇'}
      </span>
    </button>
  );
};

export default SoundToggle;
