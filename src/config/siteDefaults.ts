/**
 * Defaults that belong to THIS site, not to the shared code.
 *
 * Each site branch keeps its own copy of this file (see CLAUDE.md, "This
 * branch's own"). A stored brand setting always wins; these only decide what
 * a site shows before anyone has chosen.
 */
import type { HeroMediaItem } from '../services/brandService';

export const SITE_DEFAULTS: { showBrandName: boolean; heroMedia?: HeroMediaItem[] } = {
  /** The company name beside the logo in the navigation bar. */
  showBrandName: true,
  /**
   * The home page's hero: a party catamaran off Bávaro beach, then guests in
   * the water beside a catamaran — graded bright (scripts/grade-hero.py) and
   * drifting one way, then back the other (Hero.tsx, `.hero-slide`).
   */
  heroMedia: [
    { url: '/imgs/edt/banners/hero-party.webp', type: 'image', alt: 'A party catamaran off Bávaro beach' },
    { url: '/imgs/edt/banners/hero-catamaran.webp', type: 'image', alt: 'Guests in the turquoise water beside a catamaran' },
  ],
};
