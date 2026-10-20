import { FaMapMarkedAlt, FaPalette, FaTv } from 'react-icons/fa';
import type { AdminNavItem } from '../lib/adminNav';

/**
 * Admin pages that belong to THIS site only (see CLAUDE.md, "This branch's
 * own"). The shared menu appends them, so another branch that copies the
 * shared admin code simply has none.
 */
export const SITE_ADMIN_NAV: AdminNavItem[] = [
  { section: null, path: '/admin/destinations', icon: FaMapMarkedAlt, label: { en: 'Destinations', es: 'Destinos', fr: 'Destinations', de: 'Ziele' } },
  // The home page's background and how every gallery moves.
  { section: null, path: '/admin/look', icon: FaPalette, label: { en: 'Look', es: 'Aspecto', fr: 'Style', de: 'Look' } },
  { section: null, path: '/admin/inspire', icon: FaTv, label: { en: 'Inspire', es: 'Inspírame', fr: 'Inspire', de: 'Inspire' } },
];
