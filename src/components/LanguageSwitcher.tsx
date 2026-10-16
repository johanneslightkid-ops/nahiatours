import React from 'react';
import { useI18n, SUPPORTED_LOCALES, type Locale } from '../contexts/I18nContext';

const NAMES: Record<Locale, string> = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch' };

/**
 * The site's language toggle. One button per language the site offers, in the
 * site's own toggle style (.language-toggle / .language-toggle-button).
 */
const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useI18n();

  const selectLanguage = (lang: Locale) => {
    if (lang !== locale) {
      setLocale(lang);
    }
  };

  return (
    <div className="language-toggle inline-flex rounded-full bg-paper p-1 shadow-lg">
      {SUPPORTED_LOCALES.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          title={NAMES[lang]}
          aria-label={NAMES[lang]}
          aria-pressed={locale === lang}
          onClick={() => selectLanguage(lang)}
          className={`language-toggle-button ${locale === lang ? 'active' : ''}`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
