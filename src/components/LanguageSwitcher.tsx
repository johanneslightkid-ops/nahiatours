import React, { useEffect, useRef, useState } from 'react';
import { HiChevronDown } from 'react-icons/hi';
import { useI18n, type Locale } from '../contexts/I18nContext';
import SoundToggle from './SoundToggle';

const LANGUAGES: Array<{ code: Locale; short: string; name: string }> = [
  { code: 'en', short: 'EN', name: 'English' },
  { code: 'es', short: 'ES', name: 'Español' },
  { code: 'fr', short: 'FR', name: 'Français' },
  { code: 'de', short: 'DE', name: 'Deutsch' },
];

interface LanguageSwitcherProps {
  /** On a photograph: white type. */
  tone?: 'light' | 'dark';
  /** Show all four as a row of buttons instead of a menu (the phone menu). */
  inline?: boolean;
}

/** Four languages in the space of one: a small menu, or a row in the phone menu. */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ tone = 'dark', inline = false }) => {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((item) => item.code === locale) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (inline) {
    return (
      <div className="flex items-center gap-1.5" role="group" aria-label="Language">
        {LANGUAGES.map((language) => (
          <button
            key={language.code}
            type="button"
            onClick={() => setLocale(language.code)}
            aria-pressed={language.code === locale}
            className={`rounded-[3px] px-3 py-2 font-condensed text-sm font-bold tracking-[0.14em] transition ${
              language.code === locale ? 'bg-ink text-paper' : 'bg-white text-ink ring-1 ring-ink/10 hover:bg-paper-warm'
            }`}
          >
            {language.short}
          </button>
        ))}
        <SoundToggle />
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.name}`}
        className={`inline-flex h-9 items-center gap-1 rounded-[3px] px-2.5 font-condensed text-[0.85rem] font-bold tracking-[0.14em] transition ${
          tone === 'light' ? 'text-white ring-1 ring-white/40 hover:bg-white/10' : 'text-ink ring-1 ring-ink/15 hover:bg-paper-warm'
        }`}
      >
        {current.short}
        <HiChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-md bg-white py-1 shadow-ink-lg ring-1 ring-ink/10">
          <ul role="listbox" aria-label="Language">
            {LANGUAGES.map((language) => (
              <li key={language.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={language.code === locale}
                  onClick={() => {
                    setLocale(language.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold transition hover:bg-paper ${
                    language.code === locale ? 'text-ink' : 'text-ink-soft'
                  }`}
                >
                  <span>{language.name}</span>
                  <span className="font-condensed text-xs font-bold tracking-[0.16em] text-gold-dark">{language.short}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-ink/10 px-4 py-2 text-xs font-semibold text-ink-soft">
            <span>FX</span>
            <SoundToggle />
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
