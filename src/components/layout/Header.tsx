import React, { useState, useEffect } from 'react';
import AdminNav from './AdminNav';
import { Link, NavLink, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { HiMenu, HiX, HiSparkles } from 'react-icons/hi';
import { MdHome, MdTour, MdLocalTaxi, MdEmail, MdLibraryBooks, MdSettings } from 'react-icons/md';
import { FaBook, FaTiktok, FaShareAlt, FaRobot, FaMagic, FaSignOutAlt } from 'react-icons/fa';
import LanguageSwitcher from '../LanguageSwitcher';
import SoundToggle from '../SoundToggle';
import { useBrand } from '../../contexts/BrandContext';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';

import { getAdminPassword, clearAdminPassword } from '../../services/authStore';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { brandSettings } = useBrand();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAdminPassword());

  useEffect(() => {
    const handleAuthChange = () => setIsAuthenticated(!!getAdminPassword());
    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  const isAdminRoute = location.pathname.startsWith('/admin') && isAuthenticated;

  const handleLogout = () => {
    clearAdminPassword();
    navigate('/');
  };

  /* The section pills live on /admin and are selected by its `section` query.
     Transport is a route of its own, so it is excluded here and handled by
     `adminRouteNavClass` below — and, importantly, none of these may light up
     while we are on that route: with no `section` in the URL the default below
     would otherwise mark Brand Settings as the current page from /admin/transport. */
  const isToursAdmin = location.pathname === '/admin';

  const adminNavClass = (section: string) => {
    const currentSection = searchParams.get('section') || 'brand';
    const active = isToursAdmin && currentSection === section;
    return `nav-link-pill p-3 !rounded-full ${active ? 'nav-link-pill-active' : ''}`;
  };

  /* For admin areas that are their own page rather than a section of one. */
  const adminRouteNavClass = (path: string) =>
    `nav-link-pill p-3 !rounded-full ${location.pathname === path ? 'nav-link-pill-active' : ''}`;

  const handleNavClick = () => {
    playClickFx();
    setIsMenuOpen(false);
  };

  // Active route gets a drawn, filled pill so guests always know where they are.
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link-pill ${isActive ? 'nav-link-pill-active' : ''}`;

  return (
    <header className="lobster-header sticky top-0 z-50 overflow-visible">
      <div className="section-shell flex items-center justify-between gap-4 py-3">
        <Link
          to="/#top"
          className="group flex items-center gap-3"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
        >
          {/* The mark used to be a 147px disc pinned to the viewport, which
              floated over the page once you scrolled. On a translucent bar it
              belongs in the bar: small, round, softly lit. */}
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-1 ring-ink/5 transition duration-500 group-hover:shadow-lg sm:h-14 sm:w-14">
            {brandSettings.brandicon ? (
              <img src={brandSettings.brandicon} alt="Logo" decoding="async" className="h-full w-full object-cover" />
            ) : (
              <img src="/competitor-logo.svg" alt="Logo" className="h-9 w-9 sm:h-11 sm:w-11" />
            )}
          </span>
          <span className="block">
            <span className="block font-display text-lg leading-none text-ink transition group-hover:text-lagoon-dark sm:text-xl">
              {brandSettings.brandName}
            </span>
            {/* The place is part of the promise, so it stays on the phone too
                — a family searching from a hotel room wants to see "Bávaro". */}
            <span className="mt-1 block text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-ink-light sm:text-[0.68rem] sm:tracking-[0.16em]">
              Punta Cana · Bávaro
            </span>
          </span>
        </Link>

        <button
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-md ring-1 ring-ink/5 transition hover:text-lagoon-dark md:hidden"
          onClick={() => {
            playClickFx();
            setIsMenuOpen(!isMenuOpen);
          }}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <HiX className="h-8 w-8" /> : <HiMenu className="h-8 w-8" />}
        </button>

        <nav
          className={`${isMenuOpen ? 'flex' : 'hidden'} absolute left-3 right-3 top-[calc(100%+10px)] z-50 flex-col gap-1.5 rounded-3xl bg-white/95 px-4 py-4 shadow-xl ring-1 ring-ink/5 backdrop-blur-xl md:static md:flex md:flex-row md:items-center md:gap-1 md:bg-transparent md:p-0 ${isAdminRoute ? 'md:flex-wrap md:justify-end' : ''} md:shadow-none md:ring-0 md:backdrop-blur-none`}
        >
          {isAdminRoute ? (
            <>
              <AdminNav onNavigate={handleNavClick} onLogout={handleLogout} />
            </>
          ) : (
            <>
              <NavLink to="/#top" end onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdHome />
                <FormattedMessage id="nav.home" />
              </NavLink>

              {/* The planner gets its own accented tab — it is the fastest way in. */}
              <NavLink
                to="/plan#top"
                onClick={handleNavClick}
                onMouseEnter={() => playHoverFx()}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full px-4 py-2 font-bold text-white shadow-coral transition duration-300 hover:-translate-y-0.5 ${
                    isActive
                      ? 'bg-gradient-to-br from-mango-light to-mango-dark'
                      : 'bg-gradient-to-br from-mango-light to-mango'
                  }`
                }
              >
                <HiSparkles className="h-4 w-4" />
                <FormattedMessage id="nav.plan" defaultMessage="Plan" />
              </NavLink>

              <NavLink to="/tours#top" onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdTour />
                <FormattedMessage id="nav.tours" />
              </NavLink>
              <NavLink to="/transport#top" onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdLocalTaxi />
                <FormattedMessage id="nav.transport" defaultMessage="Transport" />
              </NavLink>
              <NavLink to="/blog#top" onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdLibraryBooks />
                <FormattedMessage id="nav.blog" defaultMessage="Blog" />
              </NavLink>
              <NavLink to="/contact#top" onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdEmail />
                <FormattedMessage id="nav.contact" />
              </NavLink>
            </>
          )}
          <div className="flex items-center gap-3 pt-2 md:pt-0">
            <LanguageSwitcher />
            <SoundToggle />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;

