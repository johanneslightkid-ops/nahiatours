import { SITE_DEFAULTS } from '../config/siteDefaults';

/**
 * Whether the navigation bar shows the company name beside the logo.
 *
 * The admin's choice when there is one (Marca → "Mostrar el nombre junto al
 * logo"); otherwise this site's own default from src/config/siteDefaults.ts.
 */
export const showsBrandName = (brand: { showBrandName?: boolean } | null | undefined): boolean =>
  typeof brand?.showBrandName === 'boolean' ? brand.showBrandName : SITE_DEFAULTS.showBrandName;
