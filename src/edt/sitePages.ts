import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../services/apiClient';
import type { Locale } from '../contexts/I18nContext';

/**
 * About, FAQ, contact details and the legal pages — Exclusive Dominican Tours'
 * own copy, one record per language (`site-pages-<locale>`). A language that
 * has none yet is served the English one by the data endpoint.
 */
export interface SitePolicy {
  slug: string;
  title: string;
  body: string;
}

export interface SitePages {
  about: {
    title: string;
    intro: string;
    body: string;
    vision: string;
    mission: string;
    promises: Array<{ title: string; text: string }>;
    founded: number;
  };
  faq: Array<{ q: string; a: string }>;
  contact: {
    address: string;
    email: string;
    whatsapp: string;
    phone2?: string;
    mapUrl?: string;
    intro: string;
  };
  policies: SitePolicy[];
}

const cache = new Map<string, Promise<SitePages | null>>();

const unwrap = (payload: unknown): SitePages | null => {
  const record = (payload as { record?: unknown })?.record ?? payload;
  const pages = record as SitePages;
  return pages && typeof pages === 'object' && pages.about && Array.isArray(pages.policies) ? pages : null;
};

export const getSitePages = (locale: Locale): Promise<SitePages | null> => {
  if (!cache.has(locale)) {
    cache.set(
      locale,
      apiGet<unknown>('site-pages', { locale })
        .then(unwrap)
        .catch(() => null)
    );
  }
  return cache.get(locale)!;
};

export const saveSitePages = async (pages: SitePages, locale: Locale): Promise<void> => {
  await apiPut<unknown>('site-pages', pages, { locale });
  cache.delete(locale);
};

/** The site pages in the reader's language, or null while they load. */
export const useSitePages = (locale: Locale): SitePages | null => {
  const [pages, setPages] = useState<SitePages | null>(null);
  useEffect(() => {
    let live = true;
    getSitePages(locale).then((value) => {
      if (live) setPages(value);
    });
    return () => {
      live = false;
    };
  }, [locale]);
  return pages;
};
