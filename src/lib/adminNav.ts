import type { IconType } from 'react-icons';
import { MdSettings, MdTour, MdLocalTaxi } from 'react-icons/md';
import { FaBook, FaTiktok, FaShareAlt, FaRobot, FaMagic, FaQuoteRight } from 'react-icons/fa';

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
export interface AdminNavItem {
  /** `?section=` value, or null when the entry is its own route. */
  section: string | null;
  /** Used only for the entries that are a route of their own. */
  path?: string;
  icon: IconType;
  label: { en: string; es: string };
}

export const ADMIN_NAV: AdminNavItem[] = [
  { section: 'brand', icon: MdSettings, label: { en: 'Brand', es: 'Marca' } },
  { section: 'story', icon: FaBook, label: { en: 'Welcome page', es: 'Página de inicio' } },
  { section: 'tours', icon: MdTour, label: { en: 'Tours', es: 'Excursiones' } },
  { section: null, path: '/admin/transport', icon: MdLocalTaxi, label: { en: 'Transport', es: 'Transporte' } },
  { section: 'testimonials', icon: FaQuoteRight, label: { en: 'Reviews', es: 'Reseñas' } },
  { section: 'tiktok', icon: FaTiktok, label: { en: 'TikTok', es: 'TikTok' } },
  { section: 'social', icon: FaShareAlt, label: { en: 'Social', es: 'Redes' } },
  { section: 'aiSettings', icon: FaRobot, label: { en: 'AI setup', es: 'IA: ajustes' } },
  { section: 'aiBlogGen', icon: FaMagic, label: { en: 'Blog writer', es: 'Redactor de blog' } },
];

/** Spanish for anything that is not explicitly English — these sites are Dominican. */
export const adminLabel = (item: AdminNavItem, locale: string): string =>
  locale.toLowerCase().startsWith('en') ? item.label.en : item.label.es;
