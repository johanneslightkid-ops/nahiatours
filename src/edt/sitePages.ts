import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPut } from '../services/apiClient';
import type { Locale } from '../contexts/I18nContext';
import { useBrand } from '../contexts/BrandContext';
import type { BrandSettings } from '../services/brandService';
import { siteNames } from '../utils/brandText';

/**
 * About, FAQ, contact details and the legal pages — the company's own copy,
 * one record per language (`site-pages-<locale>`). A language that has none
 * yet is served the English one by the data endpoint.
 *
 * The copy never spells out the company's name or address: the legal pages
 * say {{brand}} (the company), the rest {{name}} (the company or the contact
 * person, as Admin › Marca prefers — see src/utils/brandText.ts), and the
 * address is {{email}}. They are filled in from the brand settings as the
 * copy is read, so a new name or address is one change there, not one per
 * paragraph in four languages.
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

/** The address guests write to: the one set in Admin › Marca, else the stored contact one. */
export const contactEmailOf = (brand: Pick<BrandSettings, 'contactEmail'>, pages: SitePages | null) =>
  brand.contactEmail?.trim() || pages?.contact.email?.trim() || '';

const fill = <T,>(value: T, tokens: Record<string, string>): T => {
  if (typeof value === 'string') return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (token, key: string) => tokens[key] ?? token) as T;
  if (Array.isArray(value)) return value.map((item) => fill(item, tokens)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fill(item, tokens)])) as T;
  }
  return value;
};

/** The site pages in the reader's language, with the company's name and address filled in; null while they load. */
export const useSitePages = (locale: Locale): SitePages | null => {
  const { brandSettings } = useBrand();
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
  return useMemo(() => {
    if (!pages) return null;
    const email = contactEmailOf(brandSettings, pages);
    const filled = fill(pages, { ...siteNames(brandSettings), email });
    return { ...filled, contact: { ...filled.contact, email } };
  }, [pages, brandSettings]);
};
