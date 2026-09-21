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

/**
 * The masthead.
 *
 * The version this replaces hung a 147px circular sticker off the top-left
 * corner in `position: fixed`, which forced every other element in the bar to
 * be pushed right by a hard-coded 11rem and left the brand name orphaned. This
 * one is an ordinary flex row: a small paper-mounted mark, the name set in the
 * display face, and the navigation. The current page is marked by a painted
 * stroke under its label rather than by a filled pill, the way a page is
 * marked in a guidebook.
 */
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

  /** Sections of the tours admin, which live behind `?section=`. */
  const adminNavClass = (section: string) => {
    const currentSection = searchParams.get('section') || 'brand';
    const active = location.pathname === '/admin' && currentSection === section;
    return `nav-link-pill p-2.5 !rounded-full ${active ? 'nav-link-pill-active' : ''}`;
  };

  /** Admin areas that are their own route, such as transport. */
  const adminRouteNavClass = (path: string) =>
    `nav-link-pill p-2.5 !rounded-full ${location.pathname === path ? 'nav-link-pill-active' : ''}`;

  const handleNavClick = () => {
    playClickFx();
    setIsMenuOpen(false);
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link-pill ${isActive ? 'nav-link-pill-active' : ''}`;

  return (
    <header className="lobster-header sticky top-0 z-50">
      <div className="section-shell flex items-center justify-between gap-4 py-3">
        <Link
          to="/#top"
          className="group flex shrink-0 items-center gap-3"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
        >
          <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-ink/15 bg-paper-warm shadow-ink-sm transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-14">
            {brandSettings.brandicon ? (
              <img src={brandSettings.brandicon} alt="" className="h-full w-full object-cover" />
            ) : (
              <img src="/competitor-logo.svg" alt="" className="h-9 w-9" />
            )}
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-ink transition group-hover:text-coral-deep sm:text-2xl">
            {brandSettings.brandName}
          </span>
        </Link>

        <button
          className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-paper-warm text-ink transition hover:border-sea md:hidden"
          onClick={() => {
            playClickFx();
            setIsMenuOpen(!isMenuOpen);
          }}
          aria-label="Toggle navigation"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <HiX className="h-6 w-6" /> : <HiMenu className="h-6 w-6" />}
        </button>

        <nav
          className={`${
            isMenuOpen ? 'flex' : 'hidden'
          } absolute left-3 right-3 top-[calc(100%+10px)] flex-col gap-2 rounded-[22px_17px_24px_16px/17px_24px_16px_22px] border border-ink/12 bg-paper p-4 shadow-ink-lg md:static md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0 ${isAdminRoute ? 'md:flex-wrap md:justify-end' : ''} md:shadow-none`}
        >
          {isAdminRoute ? (
            <>
              <AdminNav onNavigate={handleNavClick} onLogout={handleLogout} />
            </>
          ) : (
            <>
              <NavLink to="/#top" end onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdHome className="h-4 w-4" />
                <FormattedMessage id="nav.home" />
              </NavLink>

              {/* The planner is the fastest way in, so it is the one item in
                  the bar that carries the primary pigment. */}
              <NavLink
                to="/plan#top"
                onClick={handleNavClick}
                onMouseEnter={() => playHoverFx()}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full px-4 py-2 text-[0.95rem] font-semibold transition duration-200 ${
                    isActive
                      ? 'bg-coral-deep text-paper'
                      : 'bg-coral-deep/10 text-coral-deep hover:bg-coral-deep hover:text-paper'
                  }`
                }
              >
                <HiSparkles className="h-4 w-4" />
                <FormattedMessage id="nav.plan" defaultMessage="Plan" />
              </NavLink>

              <NavLink to="/tours#top" onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdTour className="h-4 w-4" />
                <FormattedMessage id="nav.tours" />
              </NavLink>
              <NavLink to="/transport#top" onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdLocalTaxi className="h-4 w-4" />
                <FormattedMessage id="nav.transport" defaultMessage="Transport" />
              </NavLink>
              <NavLink to="/blog#top" onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdLibraryBooks className="h-4 w-4" />
                <FormattedMessage id="nav.blog" defaultMessage="Blog" />
              </NavLink>
              <NavLink to="/contact#top" onClick={handleNavClick} onMouseEnter={() => playHoverFx()} className={navClass}>
                <MdEmail className="h-4 w-4" />
                <FormattedMessage id="nav.contact" />
              </NavLink>
            </>
          )}
          <div className="mt-2 flex items-center gap-2 border-t border-ink/10 pt-3 md:ml-2 md:mt-0 md:border-l md:border-t-0 md:pl-3 md:pt-0">
            <LanguageSwitcher />
            <SoundToggle />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
