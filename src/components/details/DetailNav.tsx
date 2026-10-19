import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowLeft, HiChevronLeft, HiChevronRight, HiSparkles } from 'react-icons/hi';
import { localeText } from '../../lib/localeText';
import { playClickFx } from '../../lib/soundEngine';

/**
 * The way back, and the way on.
 *
 * "All tours" is always there and returns to the list where it was left (the
 * tours page remembers its scroll position). "Back to my plan" — the
 * prominent one — appears only when the guest came here from the planner, and
 * returns to the very tour in the plan. Previous / next walk through the
 * catalogue without going back at all, and keep the way to the plan.
 *
 * Styled by the site's own `.dv-nav*` rules.
 */

export interface DetailOrigin {
  from?: 'plan';
  /** The tour the guest opened from the plan, to scroll back to. */
  planSlug?: string;
}

export interface Neighbour {
  title: string;
  path: string;
}

interface Props {
  category: 'tours' | 'transport';
  origin: DetailOrigin;
  previous?: Neighbour;
  next?: Neighbour;
  locale: string;
}

export const planReturnPath = (origin: DetailOrigin) => `/plan${origin.planSlug ? `#plan-${origin.planSlug}` : '#top'}`;

const DetailNav: React.FC<Props> = ({ category, origin, previous, next, locale }) => {
  const say = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);
  const fromPlan = origin.from === 'plan';
  return (
    <nav className="dv-nav flex flex-wrap items-center gap-2" aria-label={say({ en: 'Tour navigation', es: 'Navegación', de: 'Navigation', fr: 'Navigation' })}>
      {fromPlan && (
        <Link to={planReturnPath(origin)} onClick={() => playClickFx()} className="dv-nav-plan inline-flex items-center gap-2">
          <HiSparkles className="h-4 w-4" aria-hidden="true" />
          {say({ en: 'Back to my plan', es: 'Volver a mi plan', de: 'Zurück zu meinem Plan', fr: 'Retour à mon plan' })}
        </Link>
      )}
      <Link to={category === 'transport' ? '/transport' : '/tours'} onClick={() => playClickFx()} className="dv-nav-back inline-flex items-center gap-2">
        <HiArrowLeft className="h-4 w-4" aria-hidden="true" />
        {category === 'transport'
          ? say({ en: 'All transfers', es: 'Todos los traslados', de: 'Alle Transfers', fr: 'Tous les transferts' })
          : say({ en: 'All tours', es: 'Todos los tours', de: 'Alle Touren', fr: 'Toutes les excursions' })}
      </Link>
      <span className="ml-auto flex items-center gap-1.5">
        {previous && (
          <Link to={previous.path} state={origin} onClick={() => playClickFx()} className="dv-nav-step grid h-10 w-10 place-items-center" title={previous.title} aria-label={`${say({ en: 'Previous', es: 'Anterior', de: 'Vorherige', fr: 'Précédente' })}: ${previous.title}`}>
            <HiChevronLeft className="h-5 w-5" />
          </Link>
        )}
        {next && (
          <Link to={next.path} state={origin} onClick={() => playClickFx()} className="dv-nav-step grid h-10 w-10 place-items-center" title={next.title} aria-label={`${say({ en: 'Next', es: 'Siguiente', de: 'Nächste', fr: 'Suivante' })}: ${next.title}`}>
            <HiChevronRight className="h-5 w-5" />
          </Link>
        )}
      </span>
    </nav>
  );
};

export default DetailNav;
