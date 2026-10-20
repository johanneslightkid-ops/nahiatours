import { useEffect, useState } from 'react';
import { getTours, getTransportServices, Tour } from '../services/toursService';
import { getContentLocale, type Locale } from '../contexts/I18nContext';

const tours = new Map<string, Promise<Tour[]>>();
const transport = new Map<string, Promise<Tour[]>>();

/** One request per language for the whole visit, however many sections ask. */
export const loadTours = (locale: Locale): Promise<Tour[]> => {
  const key = getContentLocale(locale);
  if (!tours.has(key)) tours.set(key, getTours(key).catch(() => []));
  return tours.get(key)!;
};

export const loadTransport = (locale: Locale): Promise<Tour[]> => {
  const key = getContentLocale(locale);
  if (!transport.has(key)) transport.set(key, getTransportServices(key).catch(() => []));
  return transport.get(key)!;
};

const useList = (loader: (locale: Locale) => Promise<Tour[]>, locale: Locale) => {
  const [list, setList] = useState<Tour[] | null>(null);
  useEffect(() => {
    let live = true;
    loader(locale).then((value) => live && setList(value));
    return () => {
      live = false;
    };
  }, [loader, locale]);
  return list;
};

/** The catalogue in the reader's language; null until it arrives. */
export const useTours = (locale: Locale) => useList(loadTours, locale);
export const useTransport = (locale: Locale) => useList(loadTransport, locale);

/** The 640 px copy of one of the site's own photographs, when there is one. */
export const smallImage = (url: string): string =>
  /^\/imgs\/edt\/.+\.webp$/.test(url) && !url.endsWith('-sm.webp') ? url.replace(/\.webp$/, '-sm.webp') : url;

/** First paragraph of a description, without markdown, cut to `max` characters. */
export const excerpt = (markdown: string, max = 150): string => {
  const paragraph =
    markdown
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block && !block.startsWith('#') && !/^\*\*[^*]+:\*\*/.test(block) && !block.startsWith('•')) ?? '';
  const plain = paragraph.replace(/\*\*|__|[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : plain;
};

/** The labelled line of a description ("**Duration:** 9 hours"), in any of the four languages. */
export const descriptionField = (markdown: string, field: 'duration' | 'departs' | 'prices'): string => {
  const labels = {
    duration: 'duration|duración|durée|dauer',
    departs: 'departs from|sale desde|départ de|abfahrt ab',
    prices: 'prices|precios|prix|preise',
  }[field];
  const match = new RegExp(`\\*\\*(?:${labels})\\s*:?\\s*\\*\\*\\s*:?\\s*([^\\n]+)`, 'i').exec(markdown);
  return match ? match[1].trim() : '';
};

/** The bullets under the "Included" label. */
export const includedItems = (markdown: string): string[] => {
  const match = /\*\*(?:included|incluye|inclus|inklusive)\s*:?\s*\*\*\s*:?\s*\n((?:\s*•[^\n]*\n?)+)/i.exec(markdown);
  return match ? match[1].split('\n').map((line) => line.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
};
