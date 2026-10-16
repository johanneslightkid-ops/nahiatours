import React from 'react';
import { MdTranslate } from 'react-icons/md';
import { useI18n, SUPPORTED_LOCALES, type Locale } from '../../contexts/I18nContext';

/**
 * The admin's language switch: a native select, about the size of a nav pill.
 *
 * The site's own switch is part of each site's design and takes the space a
 * design gives it. The back office only needs to say which language is being
 * edited and to change it, so this is the platform's own control — keyboard,
 * screen reader and the phone's native picker all work without any code here.
 *
 * Styled in the colour families every branch defines, so it is identical
 * everywhere.
 */
const NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

const AdminLanguageSelect: React.FC = () => {
  const { locale, setLocale } = useI18n();
  return (
    <label className="relative inline-flex shrink-0 items-center gap-1 rounded-full border border-ink/15 bg-paper px-2 py-1 text-xs font-semibold text-ink">
      <MdTranslate className="h-4 w-4 shrink-0 text-lagoon-dark" aria-hidden="true" />
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="cursor-pointer appearance-none bg-transparent pr-1 uppercase outline-none"
        title={NAMES[locale]}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code} title={NAMES[code]}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
};

export default AdminLanguageSelect;
