import { useI18n } from '../contexts/I18nContext';
import { getPlannerCopy, PlannerCopy } from './copy';
import { useBrand } from '../contexts/BrandContext';

/** React binding for the planner copy — keeps copy.ts itself framework-free. */
export const usePlannerCopy = (): PlannerCopy => {
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
  return getPlannerCopy(locale, brandSettings.contactName);
};
