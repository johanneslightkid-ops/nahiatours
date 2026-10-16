import React, { useEffect, useState } from 'react';
import { useI18n, type Locale } from '../contexts/I18nContext';
import SoundToggle from './SoundToggle';

const DIRECTIONS: Array<{ code: Locale; short: string; name: string; direction: 'north' | 'east' | 'south' | 'west' }> = [
  { code: 'en', short: 'EN', name: 'English', direction: 'north' },
  { code: 'de', short: 'DE', name: 'Deutsch', direction: 'east' },
  { code: 'es', short: 'ES', name: 'Español', direction: 'south' },
  { code: 'fr', short: 'FR', name: 'Français', direction: 'west' },
];

const FLAG_BACKGROUNDS: Record<Locale, string> = {
  en: 'linear-gradient(90deg, rgba(11,36,105,0.9) 0 38%, rgba(255,255,255,0.95) 38% 46%, rgba(179,20,42,0.9) 46% 54%, rgba(255,255,255,0.95) 54% 62%, rgba(11,36,105,0.9) 62% 100%), linear-gradient(180deg, rgba(11,36,105,0.9) 0 38%, rgba(255,255,255,0.95) 38% 46%, rgba(179,20,42,0.9) 46% 54%, rgba(255,255,255,0.95) 54% 62%, rgba(11,36,105,0.9) 62% 100%)',
  de: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0 33%, rgba(221,0,0,0.82) 33% 66%, rgba(255,206,0,0.86) 66% 100%)',
  es: 'linear-gradient(180deg, rgba(198,11,30,0.82) 0 20%, rgba(255,196,0,0.9) 20% 80%, rgba(198,11,30,0.82) 80% 100%)',
  fr: 'linear-gradient(135deg, rgba(0,85,164,0.88) 0 33%, rgba(255,255,255,0.92) 33% 66%, rgba(239,65,53,0.82) 66% 100%)',
};

const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useI18n();
  const [selectedCode, setSelectedCode] = useState<Locale>(locale);
  useEffect(() => setSelectedCode(locale), [locale]);
  const selected = DIRECTIONS.find((item) => item.code === selectedCode) ?? DIRECTIONS[0];
  const compassBackground = FLAG_BACKGROUNDS[selectedCode] ?? FLAG_BACKGROUNDS.en;

  return (
    <div className="language-compass" aria-label="Language and sound controls" style={{ background: compassBackground }}>
      <span className="compass-rings" aria-hidden="true" />
      <span className={`compass-needle compass-needle-${selected.direction}`} aria-hidden="true" />
      {DIRECTIONS.map((language) => (
        <button
          key={language.code}
          type="button"
          title={language.name}
          aria-label={`Switch language to ${language.name}`}
          aria-pressed={selectedCode === language.code}
          onClick={() => {
            setSelectedCode(language.code);
            setLocale(language.code);
          }}
          className={`compass-language compass-language-${language.direction} ${selectedCode === language.code ? 'active' : ''}`}
        >
          {language.short}
        </button>
      ))}
      <div className="compass-sound" title="Sound effects"><SoundToggle /></div>
    </div>
  );
};

export default LanguageSwitcher;
