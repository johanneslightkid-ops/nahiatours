import type { HeroMediaItem } from '../services/brandService';

/**
 * Defaults that belong to THIS site, not to the shared code.
 *
 * Each site branch keeps its own copy of this file (see CLAUDE.md, "This
 * branch's own"). A stored brand setting always wins; these only decide what
 * a site shows before anyone has chosen.
 */
export const SITE_DEFAULTS: { showBrandName: boolean; heroMedia?: HeroMediaItem[] } = {
  /** The company name beside the logo in the navigation bar. */
  showBrandName: true,
  /**
   * The three framed pictures beside the home-page welcome (read via
   * services/brandService). The party boat painted, in motion, then the real
   * boat on the water. The second one's alt is also its polaroid caption.
   */
  heroMedia: [
    { url: '/videos/partyboat.webm', type: 'video', alt: 'A party boat off El Cortecito, painted' },
    { url: '/imgs/tours/tour_party_boat_detail_9.jpg', type: 'image', alt: 'The party boat, Bávaro' },
    { url: '/imgs/tours/tour_speed_boat_detail_5.jpg', type: 'image', alt: 'Caribbean speedboat' },
  ],
};
