import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { HiMenu, HiX, HiSparkles } from 'react-icons/hi';
import { MdHome, MdTour, MdLocalTaxi, MdEmail, MdLibraryBooks } from 'react-icons/md';
import { FaSignOutAlt } from 'react-icons/fa';
import { ADMIN_NAV, adminLabel } from '../../lib/adminNav';
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
  const intl = useIntl();
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

  /**
   * A menu entry is active when its section is the one showing — or, for the
   * entries that are their own route, when that route is the one open.
   *
   * The pill is no longer a circle: it holds a name now as well as an icon.
   */
  const adminPillClass = (active: boolean) =>
    `nav-link-pill flex items-center gap-2 !rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap ${
      active ? 'nav-link-pill-active' : ''
    }`;

  const currentSection = searchParams.get('section') || 'brand';

  const handleNavClick = () => {
    playClickFx();
    setIsMenuOpen(false);
  };

  // Active route gets a drawn, filled pill so guests always know where they are.
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link-pill ${isActive ? 'nav-link-pill-active' : ''}`;

  return (
    <header className="lobster-header sticky top-0 z-50 overflow-visible">
      <div className="section-shell flex items-center justify-between py-3.5 pl-[10.5rem] sm:pl-[11.25rem] lg:pl-8">
        <Link
          to="/#top"
          className="group flex items-center gap-3"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
        >
          <div className="menu-logo-icon fixed left-4 top-2 flex h-[9.1875rem] w-[9.1875rem] items-center justify-center overflow-hidden rounded-full border-[3px] border-ink bg-mango-light shadow-ink transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 sm:left-6 lg:left-[max(2rem,calc((100vw-80rem)/2+2rem))]">
            {brandSettings.brandicon ? (
              <img src={brandSettings.brandicon} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <img src="/competitor-logo.svg" alt="Logo" className="h-[7.875rem] w-[7.875rem]" />
            )}
          </div>
          <h1 className="relative hidden font-display text-2xl font-extrabold text-ink transition group-hover:text-mango-dark sm:ml-[10.75rem] sm:block lg:ml-[11.5rem]">
            {brandSettings.brandName}
          </h1>
        </Link>

        <button
          className="grid h-11 w-11 place-items-center rounded-full border-[2.5px] border-ink bg-mango-light text-ink shadow-ink-sm transition hover:bg-mango md:hidden"
          onClick={() => {
            playClickFx();
            setIsMenuOpen(!isMenuOpen);
          }}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <HiX className="h-8 w-8" /> : <HiMenu className="h-8 w-8" />}
        </button>

        <nav
          className={`${isMenuOpen ? 'flex' : 'hidden'} absolute left-3 right-3 top-[calc(100%+12px)] flex-col gap-3 rounded-[24px] border-[3px] border-ink bg-paper px-5 py-5 shadow-ink-lg md:static md:flex md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none ${isAdminRoute ? 'md:flex-wrap md:justify-end' : ''}`}
        >
          {isAdminRoute ? (
            <>
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                const to = item.path ?? `/admin?section=${item.section}`;
                const active = item.path
                  ? location.pathname === item.path
                  : location.pathname === '/admin' && currentSection === item.section;
                const name = adminLabel(item, intl.locale);
                return (
                  <Link
                    key={item.path ?? item.section}
                    to={to}
                    onClick={handleNavClick}
                    className={adminPillClass(active)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{name}</span>
                  </Link>
                );
              })}
              <div className="mx-1 hidden h-6 w-0.5 bg-ink/30 md:block"></div>
              <button
                onClick={handleLogout}
                className="nav-link-pill flex items-center gap-2 !rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap !text-hibiscus-dark hover:!bg-hibiscus-light"
              >
                <FaSignOutAlt className="h-5 w-5 shrink-0" />
                <span>{intl.locale.toLowerCase().startsWith('en') ? 'Log out' : 'Salir'}</span>
              </button>
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
                  `flex items-center gap-2 rounded-full border-[2.5px] border-ink px-4 py-2 font-extrabold text-ink shadow-ink-sm transition duration-200 hover:-translate-y-0.5 ${
                    isActive ? 'bg-mango' : 'bg-mango-light hover:bg-mango'
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

