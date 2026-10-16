import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import enMessagesJson from '../locales/en.json';
import esMessagesJson from '../locales/es.json';
import { apiGet } from '../services/apiClient';

type Locale = 'en' | 'es';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Record<string, string>;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

const flattenMessages = (
  nestedMessages: Record<string, unknown> | null | undefined,
  prefix = ''
): Record<string, string> => {
  const source = nestedMessages ?? {};
  let flattened: Record<string, string> = {};

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = source[key as keyof typeof source];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, flattenMessages(value as Record<string, unknown>, newKey));
      } else if (value === null || typeof value === 'undefined') {
        flattened[newKey] = '';
      } else {
        flattened[newKey] = String(value);
      }
    }
  }

  return flattened;
};

const fallbackMessages: Record<Locale, Record<string, string>> = {
  en: flattenMessages(enMessagesJson as unknown as Record<string, unknown>),
  es: flattenMessages(esMessagesJson as unknown as Record<string, unknown>),
};

const fetchMessages = async (locale: Locale): Promise<Record<string, string>> => {
  try {
    const data = await apiGet<unknown>('translations', { locale });
    const nestedMessages = (data as Record<string, unknown>)?.record ?? data;
    const remoteFlattened = flattenMessages(nestedMessages as Record<string, unknown>);
    return { ...fallbackMessages[locale], ...remoteFlattened };
  } catch (error) {
    console.error(`Failed to fetch ${locale} messages:`, error);
    return fallbackMessages[locale];
  }
};

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('en');
  const [messages, setMessages] = useState<Record<string, string>>(fallbackMessages.en);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      const fetchedMessages = await fetchMessages(locale);
      setMessages(fetchedMessages);
      setLoading(false);
    };
    loadMessages();
  }, [locale]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mango mx-auto mb-4"></div>
          <p className="text-ink-soft">Loading translations...</p>
        </div>
      </div>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, messages, loading }}>
      <IntlProvider locale={locale} messages={messages}>
        {children}
      </IntlProvider>
    </I18nContext.Provider>
  );
};
