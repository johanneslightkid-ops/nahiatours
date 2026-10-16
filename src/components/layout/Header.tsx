import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MdHome, MdTour, MdLocalTaxi, MdEmail, MdLibraryBooks } from 'react-icons/md';
import { HiSparkles } from 'react-icons/hi';
import AdminNav from './AdminNav';
import { onNavLinkClick } from '../../lib/navScroll';
import { showsBrandName } from '../../lib/brandDisplay';
import AdminLanguageSelect from '../admin/AdminLanguageSelect';
import LanguageSwitcher from '../LanguageSwitcher';
import { useBrand } from '../../contexts/BrandContext';
import { useI18n } from '../../contexts/I18nContext';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';
import { getAdminPassword, clearAdminPassword } from '../../services/authStore';

/**
 * No menu bar. This is a beach.
 *
 * On a wide screen a liana is strung across the top of the page and the
 * links hang from it as luggage tags — each on its own length of string,
 * swinging when you brush past it. The logo hangs from it too, like a
 * coconut.
 *
 * On a phone, and on a wide screen once the vine has scrolled away, there is
 * a life ring in the corner. Throw it and a beach signpost rises out of the
 * sand, with a wooden arrow for every place you can go.
 */

interface NavItem {
  to: string;
  id: string;
  fallback: string;
  icon: React.ReactNode;
  note: Record<'en' | 'es' | 'fr' | 'de', string>;
  accent?: 'mango';
  match: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { to: '/', id: 'nav.home', fallback: 'Home', icon: <MdHome />, note: { en: 'the beach', es: 'la playa', fr: 'la plage', de: 'der Strand' }, match: (p) => p === '/' },
  {
    to: '/plan',
    id: 'nav.plan',
    fallback: 'Plan',
    icon: <HiSparkles />,
    note: { en: 'my day', es: 'mi día', fr: 'ma journée', de: 'mein Tag' },
    accent: 'mango',
    match: (p) => p.startsWith('/plan'),
  },
  { to: '/tours', id: 'nav.tours', fallback: 'Tours', icon: <MdTour />, note: { en: 'excursions', es: 'excursiones', fr: 'excursions', de: 'Ausflüge' }, match: (p) => p.startsWith('/tours') || p.startsWith('/details/tours') },
  { to: '/transport', id: 'nav.transport', fallback: 'Transport', icon: <MdLocalTaxi />, note: { en: 'rides', es: 'traslados', fr: 'trajets', de: 'Fahrten' }, match: (p) => p.startsWith('/transport') },
  { to: '/blog', id: 'nav.blog', fallback: 'Blog', icon: <MdLibraryBooks />, note: { en: 'stories', es: 'historias', fr: 'histoires', de: 'Geschichten' }, match: (p) => p.startsWith('/blog') },
  { to: '/contact', id: 'nav.contact', fallback: 'Contact', icon: <MdEmail />, note: { en: 'say hola', es: 'di hola', fr: 'dites hola', de: 'sag hallo' }, match: (p) => p.startsWith('/contact') },
];

const STRINGS = [22, 40, 28, 46, 30, 38];

/**
 * The header floats 0.75rem below the top of the window, so a rope that only
 * started at the header looked tied to thin air. Every rope is ROPE_EXTRA
 * longer and every hanging piece is lifted by ROPE_LIFT: the ropes now run up
 * past the edge of the window, and what hangs from them sits the difference
 * (1.5rem) lower than before.
 */
const ROPE_EXTRA = '3rem';
const ROPE_LIFT = '-1.5rem';

/* ── Pieces ────────────────────────────────────────────────────────────── */

const Vine: React.FC = () => (
  <div className="pointer-events-none absolute inset-x-0 top-0 h-16" aria-hidden="true">
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 64" preserveAspectRatio="none">
      <path d="M-10 14 C200 44 400 4 720 24 C1000 42 1200 8 1450 18" stroke="#1E6A3B" strokeWidth={5} fill="none" />
      <path d="M-10 18 C220 38 420 12 720 28 C980 40 1220 14 1450 22" stroke="#3E9B50" strokeWidth={2} fill="none" strokeOpacity={0.6} />
    </svg>
    {Array.from({ length: 22 }).map((_, i) => {
      const left = (i / 21) * 100;
      const up = i % 2 === 0;
      return (
        <svg
          key={i}
          viewBox="0 0 40 20"
          className="leaf-sway absolute h-5 w-10"
          style={{
            left: `${left}%`,
            top: `${12 + Math.sin(i * 1.3) * 8}px`,
            transform: `rotate(${up ? -30 + (i % 3) * 8 : 150 - (i % 3) * 8}deg)`,
            transformOrigin: '0% 50%',
            animationDelay: `${-i * 0.7}s`,
          }}
        >
          <path d="M0 10 Q18 -2 40 10 Q18 22 0 10 Z" fill={i % 3 === 0 ? '#5DB85C' : '#3E9B50'} />
          <path d="M2 10 L36 10" stroke="#A3DB93" strokeWidth={1} />
        </svg>
      );
    })}
  </div>
);

/** A red-and-white life ring. Rotates into a "close" when the menu is open. */
const LifeRing: React.FC<{ open: boolean; onClick: () => void; label: string }> = ({ open, onClick, label }) => (
  <motion.button
    type="button"
    onClick={onClick}
    onMouseEnter={() => playHoverFx()}
    aria-label={label}
    aria-expanded={open}
    className="relative grid h-16 w-16 place-items-center rounded-full bg-transparent"
    animate={{ rotate: open ? 135 : 0 }}
    whileTap={{ scale: 0.9 }}
    transition={{ type: 'spring', stiffness: 180, damping: 14 }}
  >
    <svg viewBox="0 0 64 64" className="h-16 w-16 drop-shadow-[0_6px_10px_rgba(14,59,54,0.35)]">
      <circle cx="32" cy="32" r="24" fill="none" stroke="#FFFDF8" strokeWidth={13} />
      <circle cx="32" cy="32" r="24" fill="none" stroke="#F2675C" strokeWidth={13} strokeDasharray="18.85 18.85" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#C9A56F" strokeWidth={1.6} strokeDasharray="3 4" />
      <circle cx="32" cy="32" r="17.5" fill="none" stroke="#0E3B36" strokeOpacity={0.15} strokeWidth={1} />
    </svg>
    <span className="absolute inset-0 grid place-items-center text-ink">
      {open ? (
        <svg viewBox="0 0 20 20" className="h-5 w-5 -rotate-[135deg]"><path d="M4 4 L16 16 M16 4 L4 16" stroke="currentColor" strokeWidth={3} strokeLinecap="round" /></svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-5 w-5"><path d="M4 6 H16 M4 10 H16 M4 14 H16" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" /></svg>
      )}
    </span>
  </motion.button>
);

const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { brandSettings } = useBrand();
  return (
    <div className={`brand-logo relative rounded-full ${className}`}>
      <div className="brand-logo-image h-full w-full overflow-hidden rounded-full">
        {brandSettings.brandicon ? (
          <img src={brandSettings.brandicon} alt="Logo" className="h-full w-full object-cover" />
        ) : (
          <img src="/competitor-logo.svg" alt="Logo" className="h-full w-full p-2" />
        )}
      </div>
    </div>
  );
};

/** The beach signpost that rises when the life ring is thrown. */
const Signpost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const location = useLocation();
  const { locale } = useI18n();
  const reduced = useReducedMotion();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Sky, sea and sand, painted flat so opening the menu costs nothing. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #8fd6f2 0%, #c8eefa 34%, #e8f8f6 46%, #4fcfc4 47%, #17b5ac 60%, #93ece1 72%, #f5ead3 74%, #e9d8b6 100%)',
        }}
        onClick={onClose}
      />
      <div className="pointer-events-none absolute right-[12%] top-[8%] h-24 w-24 rounded-full bg-[radial-gradient(circle,#fff4c9_0%,#ffd47e_45%,transparent_70%)]" />
      {/* Compass: left-aligned on mobile */}
      <div className="relative z-20 flex justify-start pl-5 pt-3">
        <LanguageSwitcher />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-md flex-col items-center px-6 pb-6 pt-0">
        {/* The post */}
        <motion.div
          className="absolute bottom-0 left-1/2 top-16 w-5 -translate-x-1/2 rounded-t-lg bg-gradient-to-r from-[#B58A5E] via-[#9A6E45] to-[#7A5434] shadow-ink"
          initial={reduced ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          exit={{ scaleY: 0 }}
          style={{ transformOrigin: 'bottom' }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
        <div className="relative z-10 flex w-full flex-col gap-4">
          {NAV.map((item, i) => {
            const pointsRight = i % 2 === 0;
            const active = item.match(location.pathname);
            return (
              <motion.div
                key={item.to}
                className={`flex ${pointsRight ? 'justify-start pl-[calc(50%-0.75rem)]' : 'justify-end pr-[calc(50%-0.75rem)]'}`}
                initial={reduced ? false : { opacity: 0, rotate: pointsRight ? -35 : 35, y: 30 }}
                animate={{ opacity: 1, rotate: pointsRight ? (i % 3) - 2 : 2 - (i % 3), y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 160, damping: 13, delay: 0.12 + i * 0.06 }}
                style={{ transformOrigin: pointsRight ? '0% 50%' : '100% 50%' }}
              >
                <Link
                  to={item.to}
                  onClick={(event) => {
                    playClickFx();
                    onNavLinkClick(event, item.to, location.pathname);
                    onClose();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className="group relative block w-[min(15rem,62vw)] text-ink no-underline"
                >
                  <span
                    className={`flex items-center gap-3 py-3 shadow-ink-lg transition-transform duration-300 group-hover:scale-105 ${
                      pointsRight ? 'pl-4 pr-9' : 'flex-row-reverse pl-9 pr-4 text-right'
                    }`}
                    style={{
                      clipPath: pointsRight
                        ? 'polygon(0 0, 86% 0, 100% 50%, 86% 100%, 0 100%)'
                        : 'polygon(14% 0, 100% 0, 100% 100%, 14% 100%, 0 50%)',
                      background: active
                        ? 'linear-gradient(180deg, #2fd1c5, #0a7c76)'
                        : item.accent === 'mango'
                        ? 'linear-gradient(180deg, #ffe3a6, #f7b23b)'
                        : 'linear-gradient(180deg, #e8c99c 0%, #d2a874 60%, #c09060 100%)',
                      color: active ? '#fff' : '#0E3B36',
                    }}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="flex flex-col leading-none">
                      <span className="font-display text-xl font-bold">
                        <FormattedMessage id={item.id} defaultMessage={item.fallback} />
                      </span>
                      <span className={`font-accent text-base ${active ? 'text-white/85' : 'text-ink/60'}`}>{item.note[locale]}</span>
                    </span>
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>

      </div>
    </motion.div>
  );
};

/* ── Header ────────────────────────────────────────────────────────────── */

const Header: React.FC = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAdminPassword());
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const handleAuthChange = () => setIsAuthenticated(!!getAdminPassword());
    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const isAdminRoute = location.pathname.startsWith('/admin') && isAuthenticated;

  // The back office keeps a plain working bar: it is a tool, not a beach.
  // One line: the menu, the language and log-out. The logo is pinned to the
  // corner, out of the flow, so its sway and aura never push anything around.
  if (isAdminRoute) {
    return (
      <>
        <Link
          to="/"
          aria-label={brandSettings.brandName}
          title={brandSettings.brandName}
          className="fixed left-2 top-1.5 z-[60] no-underline"
        >
          <Logo className="h-9 w-9 ring-2" />
        </Link>
        <header className="lobster-header sticky top-0 z-50">
          <nav className="flex items-center gap-2 py-1.5 pl-14 pr-2">
            <AdminNav
              onNavigate={() => playClickFx()}
              onLogout={() => {
                clearAdminPassword();
                navigate('/');
              }}
              trailing={<AdminLanguageSelect />}
            />
          </nav>
        </header>
      </>
    );
  }

  const ringLabel = locale === 'es' ? 'Abrir el letrero de la playa' : locale === 'fr' ? 'Ouvrir le panneau de plage' : locale === 'de' ? 'Strandwegweiser öffnen' : 'Open the beach signpost';

  return (
    <>
      <header className="fixed inset-x-4 top-3 z-50 h-[5rem] lg:h-[9rem]">
        {/* Phones: a pebble with the logo and the name. */}
        <Link
          to="/"
          onClick={(event) => {
            playClickFx();
            onNavLinkClick(event, '/', location.pathname);
          }}
          className="absolute left-4 top-3 flex items-center gap-2.5 no-underline lg:hidden"
        >
          <Logo className="h-14 w-14" />
          {showsBrandName(brandSettings) ? (
            <span className="brand-name-crystal max-w-[11rem] text-lg leading-tight">{brandSettings.brandName}</span>
          ) : (
            <span className="sr-only">{brandSettings.brandName}</span>
          )}
        </Link>

        {/* Wide screens: the vine. */}
        <div className="absolute inset-x-0 top-0 hidden lg:block" style={{ height: '9rem', overflow: 'visible' }}>
          <Vine />
          <div className="section-shell relative flex h-full items-start justify-between">
            <Link
              to="/"
              onClick={(event) => {
                playClickFx();
                onNavLinkClick(event, '/', location.pathname);
              }}
              onMouseEnter={() => playHoverFx()}
              className="group relative mt-0 flex items-start gap-4 no-underline"
            >
              <motion.div
                className="flex flex-col items-center"
                style={{ transformOrigin: '50% 0%', marginTop: ROPE_LIFT }}
                initial={reduced ? false : { y: -120 }}
                animate={{ y: 0 }}
                whileHover={{ rotate: [0, -6, 4, -2, 0], transition: { duration: 1.4 } }}
                transition={{ type: 'spring', stiffness: 90, damping: 11 }}
              >
                {/* Logo rope — anchored to y=0 of the vine container */}
                <span className="rope-string" style={{ height: `calc(1.4rem + ${ROPE_EXTRA})` }} />
                <Logo className="h-24 w-24" />
              </motion.div>
              {showsBrandName(brandSettings) ? (
                <span className="desktop-brand-name brand-name-crystal mt-[4rem]">
                  {brandSettings.brandName}
                </span>
              ) : (
                <span className="sr-only">{brandSettings.brandName}</span>
              )}
            </Link>

            <nav className="flex items-start gap-2 xl:gap-4" aria-label="Main">
              {NAV.map((item, i) => {
                const active = item.match(location.pathname);
                return (
                  <motion.div
                    key={item.to}
                    className="flex flex-col items-center"
                    style={{ transformOrigin: '50% 0%', marginTop: ROPE_LIFT }}
                    initial={reduced ? false : { y: -140 }}
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', stiffness: 110, damping: 10, delay: 0.1 + i * 0.07 }}
                  >
                    <motion.div
                      className="flex flex-col items-center"
                      style={{ transformOrigin: '50% 0%' }}
                      whileHover={reduced ? undefined : { rotate: [0, 9, -7, 4, -2, 0], transition: { duration: 1.6 } }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Rope runs from top-0 of the header wrapper */}
                      <span className="rope-string" style={{ height: `calc(${STRINGS[i % STRINGS.length]}px + ${ROPE_EXTRA})` }} />
                      <Link
                        to={item.to}
                        onClick={(event) => {
                          playClickFx();
                          onNavLinkClick(event, item.to, location.pathname);
                        }}
                        onMouseEnter={() => playHoverFx()}
                        aria-current={active ? 'page' : undefined}
                        data-active={active}
                        data-accent={item.accent}
                        className={`vine-tag vine-tag-item-${i % 6}`}
                      >
                        <span className="vine-tag-icon">{item.icon}</span>
                        <FormattedMessage id={item.id} defaultMessage={item.fallback} />
                        <span className="vine-tag-note">{item.note[locale]}</span>
                      </Link>
                    </motion.div>
                  </motion.div>
                );
              })}
              <div className="ml-2 mt-4 flex items-center gap-2">
                <LanguageSwitcher />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* The full-page signpost remains a mobile-only menu. */}
      <div className="fixed right-3 top-3 z-[70] lg:hidden">
        <LifeRing open={menuOpen} label={ringLabel} onClick={() => { playClickFx(); setMenuOpen((v) => !v); }} />
      </div>

      <AnimatePresence>{menuOpen && <Signpost onClose={closeMenu} />}</AnimatePresence>
    </>
  );
};

export default Header;
