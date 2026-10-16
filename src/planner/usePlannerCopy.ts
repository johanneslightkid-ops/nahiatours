import { useI18n } from '../contexts/I18nContext';
import { getPlannerCopy, PlannerCopy } from './copy';

/** React binding for the planner copy — keeps copy.ts itself framework-free. */
export const usePlannerCopy = (): PlannerCopy => {
  const { locale } = useI18n();
  return getPlannerCopy(locale);
};
