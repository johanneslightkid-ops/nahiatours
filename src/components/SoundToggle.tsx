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
      className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 shadow-sm"
      style={{
        background: enabled ? 'rgba(13, 148, 136, 0.18)' : 'rgba(255, 255, 255, 0.4)',
        border: `1px solid ${enabled ? '#0D9488' : 'rgba(6, 29, 43, 0.15)'}`,
        color: enabled ? '#0D9488' : '#64748B',
        boxShadow: enabled ? '0 0 12px rgba(13, 148, 136, 0.3)' : 'none',
      }}
    >
      <span className="text-base leading-none select-none transition-transform hover:scale-110">
        {enabled ? '🎵' : '🔇'}
      </span>
    </button>
  );
};

export default SoundToggle;
