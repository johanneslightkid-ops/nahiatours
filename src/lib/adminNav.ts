import type { IconType } from 'react-icons';
import { MdSettings, MdTour, MdLocalTaxi, MdDeleteOutline } from 'react-icons/md';
import { FaBook, FaTiktok, FaShareAlt, FaRobot, FaMagic, FaQuoteRight, FaLanguage, FaCashRegister } from 'react-icons/fa';
import { SITE_ADMIN_NAV } from '../config/siteAdmin';

/**
 * The admin menu, in one place.
 *
 * It used to be eight hand-written <Link>s carrying an icon and an English
 * `title` attribute, which is a tooltip: it needs a mouse, it needs a pause,
 * and on a phone it never appears at all. So the only way to learn the menu
 * was to click every icon and remember. The names are rendered beside the
 * icons now, and the Admin page reads the same table, so a section cannot be
 * in the menu without a panel or the other way round.
 *
 * WHY THE LABELS ARE HERE AND NOT IN THE TRANSLATION FILES. Those are loaded
 * from KV at runtime and edited through this very admin. A missing id renders
 * as the raw id — so putting the navigation's own names there means a bad save
 * can leave the operator looking at `admin.nav.tours` with no way back to the
 * panel that fixes it. The menu you repair the site with should not depend on
 * the data you are repairing.
 */
export type AdminLang = 'en' | 'es' | 'fr' | 'de';

export interface AdminNavItem {
  /** `?section=` value, or null when the entry is its own route. */
  section: string | null;
  /** Used only for the entries that are a route of their own. */
  path?: string;
  icon: IconType;
  /** One short word each, so the whole menu fits on one line. */
  label: Record<AdminLang, string>;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { section: 'brand', icon: MdSettings, label: { en: 'Brand', es: 'Marca', fr: 'Marque', de: 'Marke' } },
  // Payment attempts, cart activity, contact requests, and who gets told.
  { section: 'sales', icon: FaCashRegister, label: { en: 'Sales', es: 'Ventas', fr: 'Ventes', de: 'Verkauf' } },
  { section: 'story', icon: FaBook, label: { en: 'Home', es: 'Inicio', fr: 'Accueil', de: 'Start' } },
  { section: 'tours', icon: MdTour, label: { en: 'Tours', es: 'Tours', fr: 'Tours', de: 'Touren' } },
  { section: null, path: '/admin/transport', icon: MdLocalTaxi, label: { en: 'Transport', es: 'Transporte', fr: 'Transport', de: 'Transport' } },
  { section: 'testimonials', icon: FaQuoteRight, label: { en: 'Reviews', es: 'Reseñas', fr: 'Avis', de: 'Bewertungen' } },
  { section: 'texts', icon: FaLanguage, label: { en: 'Texts', es: 'Textos', fr: 'Textes', de: 'Texte' } },
  { section: 'tiktok', icon: FaTiktok, label: { en: 'TikTok', es: 'TikTok', fr: 'TikTok', de: 'TikTok' } },
  { section: 'social', icon: FaShareAlt, label: { en: 'Social', es: 'Redes', fr: 'Réseaux', de: 'Social' } },
  { section: 'aiSettings', icon: FaRobot, label: { en: 'AI', es: 'IA', fr: 'IA', de: 'KI' } },
  { section: 'aiBlogGen', icon: FaMagic, label: { en: 'Blog', es: 'Blog', fr: 'Blog', de: 'Blog' } },
  // Pages only this site has (src/config/siteAdmin.ts — a per-branch file).
  ...SITE_ADMIN_NAV,
  // What the other pages deleted, to restore or delete for good.
  { section: null, path: '/admin/trash', icon: MdDeleteOutline, label: { en: 'Trash', es: 'Papelera', fr: 'Corbeille', de: 'Papierkorb' } },
];

/** The admin's own language. Anything unknown reads Spanish — these sites are Dominican. */
export const adminLang = (locale: string): AdminLang => {
  const code = locale.toLowerCase().slice(0, 2);
  return code === 'en' || code === 'fr' || code === 'de' ? code : 'es';
};

export const adminLabel = (item: AdminNavItem, locale: string): string => item.label[adminLang(locale)];

export const LOGOUT_LABEL: Record<AdminLang, string> = { en: 'Log out', es: 'Salir', fr: 'Quitter', de: 'Abmelden' };
