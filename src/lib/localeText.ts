/**
 * One piece of copy in every language a site might offer, picked for the
 * reader. English is the fallback, so a site — or a sentence — that has not
 * been given German or French yet still reads, in English, rather than
 * showing an empty string.
 */
export interface LocaleTexts<T = string> {
  en: T;
  es: T;
  de?: T;
  fr?: T;
}

export const localeText = <T,>(locale: string, texts: LocaleTexts<T>): T => {
  const lang = locale.slice(0, 2).toLowerCase() as keyof LocaleTexts<T>;
  return (texts[lang] ?? texts.en) as T;
};

/** BCP 47 tag for dates and numbers in the reader's language, Dominican where it is Spanish. */
export const localeTag = (locale: string): string =>
  localeText(locale, { en: 'en-US', es: 'es-DO', de: 'de-DE', fr: 'fr-FR' });
