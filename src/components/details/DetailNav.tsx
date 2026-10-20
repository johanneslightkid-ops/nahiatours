import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowLeft, HiChevronLeft, HiChevronRight, HiReply, HiSparkles } from 'react-icons/hi';
import { localeText } from '../../lib/localeText';
import { readReturnTrail } from '../../lib/navScroll';
import { playClickFx } from '../../lib/soundEngine';

/**
 * The way back, and the way on.
 *
 * "All tours" is always there and returns to the list where it was left (the
 * tours page remembers its scroll position). When the guest came from
 * somewhere else — the home page's reels, the transfers page, the blog — a
 * "Back to …" link leads to that very page at the very spot they left it
 * (the return trail, written by ScrollToHash). "Back to my plan" — the
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
  const listPath = category === 'transport' ? '/transport' : '/tours';
  const trail = readReturnTrail();
  const trailPathname = trail ? trail.path.split('?')[0] : '';
  // The list link already returns to the list; the plan has its own link.
  const showTrail = Boolean(trail) && !fromPlan && trailPathname !== listPath && trailPathname !== '/plan';
  const trailName = (): string => {
    switch (trailPathname) {
      case '/':
        return say({ en: 'Back to the home page', es: 'Volver al inicio', de: 'Zurück zur Startseite', fr: 'Retour à l’accueil' });
      case '/tours':
        return say({ en: 'Back to the tours', es: 'Volver a los tours', de: 'Zurück zu den Touren', fr: 'Retour aux excursions' });
      case '/transport':
        return say({ en: 'Back to transfers', es: 'Volver a traslados', de: 'Zurück zu den Transfers', fr: 'Retour aux transferts' });
      case '/blog':
        return say({ en: 'Back to the blog', es: 'Volver al blog', de: 'Zurück zum Blog', fr: 'Retour au blog' });
      case '/cart':
        return say({ en: 'Back to the cart', es: 'Volver al carrito', de: 'Zurück zum Warenkorb', fr: 'Retour au panier' });
      default:
        return say({ en: 'Back', es: 'Volver', de: 'Zurück', fr: 'Retour' });
    }
  };
  return (
    <nav className="dv-nav flex flex-wrap items-center gap-2" aria-label={say({ en: 'Tour navigation', es: 'Navegación', de: 'Navigation', fr: 'Navigation' })}>
      {fromPlan && (
        <Link to={planReturnPath(origin)} onClick={() => playClickFx()} className="dv-nav-plan inline-flex items-center gap-2">
          <HiSparkles className="h-4 w-4" aria-hidden="true" />
          {say({ en: 'Back to my plan', es: 'Volver a mi plan', de: 'Zurück zu meinem Plan', fr: 'Retour à mon plan' })}
        </Link>
      )}
      {showTrail && trail && (
        <Link to={trail.path} state={{ restoreScroll: true, y: trail.y }} onClick={() => playClickFx()} className="dv-nav-plan inline-flex items-center gap-2">
          <HiReply className="h-4 w-4" aria-hidden="true" />
          {trailName()}
        </Link>
      )}
      <Link to={listPath} onClick={() => playClickFx()} className="dv-nav-back inline-flex items-center gap-2">
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
