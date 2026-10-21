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
   * The home page's hero: eleven of the tours' own photographs, restored and
   * upscaled 4× by Cloudinary's AI (generative restore, then super-resolution)
   * and cropped twice — 16:9 for screens, 9:16 for a phone held upright —
   * around their subject (public/imgs/edt/banners/hero-*.webp). They give way
   * to each other with the transition set in Admin → Look (Ken Burns at first).
   */
  heroMedia: [
    { url: '/imgs/edt/banners/hero-palm-beach.webp', type: 'image', alt: 'A palm leaning over the white sand of Saona Island' },
    { url: '/imgs/edt/banners/hero-zipline.webp', type: 'image', alt: 'A zipline ride over the green hills behind Punta Cana' },
    { url: '/imgs/edt/banners/hero-saona-aerial.webp', type: 'image', alt: 'Boats moored off a pink sandbank at Saona, from the air' },
    { url: '/imgs/edt/banners/hero-buggy.webp', type: 'image', alt: 'A buggy splashing through the jungle at Scape Park' },
    { url: '/imgs/edt/banners/hero-cayo-levantado.webp', type: 'image', alt: 'Cayo Levantado and its white beach in Samaná Bay, from the air' },
    { url: '/imgs/edt/banners/hero-dolphins.webp', type: 'image', alt: 'Two dolphins leaping by the pier' },
    { url: '/imgs/edt/banners/hero-santo-domingo.webp', type: 'image', alt: 'The Puerta de la Misericordia in Santo Domingo’s Colonial Zone' },
    { url: '/imgs/edt/banners/hero-catamaran.webp', type: 'image', alt: 'Guests swimming beside a catamaran in turquoise water' },
    { url: '/imgs/edt/banners/hero-diving.webp', type: 'image', alt: 'Divers over the reef at Isla Catalina' },
    { url: '/imgs/edt/banners/hero-whale.webp', type: 'image', alt: 'A humpback whale breaching in Samaná Bay' },
    { url: '/imgs/edt/banners/hero-golden-hour.webp', type: 'image', alt: 'Cayo Levantado in the golden light of late afternoon' },
  ],
};
