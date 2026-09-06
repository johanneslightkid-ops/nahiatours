import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { HiMenu, HiX, HiSparkles } from 'react-icons/hi';
import { MdHome, MdTour, MdLocalTaxi, MdEmail, MdLibraryBooks, MdSettings } from 'react-icons/md';
import { FaBook, FaTiktok, FaShareAlt, FaRobot, FaMagic, FaSignOutAlt } from 'react-icons/fa';
import LanguageSwitcher from '../LanguageSwitcher';
import SoundToggle from '../SoundToggle';
import { useBrand } from '../../contexts/BrandContext';
import { Crosshair } from '../ui/Illustrations';
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

  const adminNavClass = (section: string) => {
    const currentSection = searchParams.get('section') || 'brand';
    return `nav-link-pill p-3 !rounded-full ${currentSection === section ? 'nav-link-pill-active' : ''}`;
  };

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
          <div
            className="menu-logo-icon fixed left-4 top-2 flex relative h-[9.1875rem] w-[9.1875rem] items-center justify-center overflow-hidden border-[3px] border-ink bg-paper shadow-[6px_6px_0_0_#0C0C0D,-4px_-4px_0_0_#C1121F] transition-transform duration-300 group-hover:rotate-2 sm:left-6 lg:left-[max(2rem,calc((100vw-80rem)/2+2rem))]"
            style={{ transform: 'rotate(-2deg)' }}
          >
            {brandSettings.brandicon ? (
              <img src={brandSettings.brandicon} alt="Logo" className="photo-pop h-full w-full object-cover" />
            ) : (
              <img src="/competitor-logo.svg" alt="Logo" className="h-[7.875rem] w-[7.875rem]" />
            )}
            {/* Registration crosshair, printed over the corner of the plate. */}
            <Crosshair className="pointer-events-none absolute right-1.5 top-1.5 h-5 w-5" />
          </div>

          {/* The brand set as a stencil: filing number above, name below. */}
          <div className="relative hidden sm:ml-[10.75rem] sm:block lg:ml-[11.5rem]">
            <span className="tp-filenum block text-paper/55">Est. Punta Cana · No. 001</span>
            <h1 className="font-display text-2xl leading-none text-paper transition group-hover:text-mango-light">
              {brandSettings.brandName}
            </h1>
            <span className="mt-1 block h-[3px] w-14 bg-mango transition-all duration-300 group-hover:w-full" />
          </div>
        </Link>

        <button
          className="grid h-11 w-11 place-items-center border-[2.5px] border-paper bg-mango text-paper shadow-[3px_3px_0_0_#F5F1E8] transition hover:bg-paper hover:text-ink md:hidden"
          onClick={() => {
            playClickFx();
            setIsMenuOpen(!isMenuOpen);
          }}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <HiX className="h-8 w-8" /> : <HiMenu className="h-8 w-8" />}
        </button>

        <nav
          className={`${isMenuOpen ? 'flex' : 'hidden'} nav-sheet absolute left-3 right-3 top-[calc(100%+18px)] z-50 flex-col gap-2 border-[3px] border-ink bg-paper px-5 py-5 shadow-[8px_8px_0_0_#0C0C0D,-4px_-4px_0_0_#C1121F] md:static md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          {isAdminRoute ? (
            <>
              <Link to="/admin?section=brand" onClick={handleNavClick} className={adminNavClass('brand')} title="Brand Settings">
                <MdSettings className="h-6 w-6" />
              </Link>
              <Link to="/admin?section=story" onClick={handleNavClick} className={adminNavClass('story')} title="Story">
                <FaBook className="h-5 w-5" />
              </Link>
              <Link to="/admin?section=tours" onClick={handleNavClick} className={adminNavClass('tours')} title="Tours">
                <MdTour className="h-6 w-6" />
              </Link>
              <Link to="/admin?section=transport" onClick={handleNavClick} className={adminNavClass('transport')} title="Transport">
                <MdLocalTaxi className="h-6 w-6" />
              </Link>
              <Link to="/admin?section=tiktok" onClick={handleNavClick} className={adminNavClass('tiktok')} title="TikTok">
                <FaTiktok className="h-5 w-5" />
              </Link>
              <Link to="/admin?section=social" onClick={handleNavClick} className={adminNavClass('social')} title="Social">
                <FaShareAlt className="h-5 w-5" />
              </Link>
              <Link to="/admin?section=aiSettings" onClick={handleNavClick} className={adminNavClass('aiSettings')} title="AI Config">
                <FaRobot className="h-5 w-5" />
              </Link>
              <Link to="/admin?section=aiBlogGen" onClick={handleNavClick} className={adminNavClass('aiBlogGen')} title="AI Blog Gen">
                <FaMagic className="h-5 w-5" />
              </Link>
              <div className="mx-1 hidden h-6 w-0.5 bg-paper/30 md:block"></div>
              <button onClick={handleLogout} className="nav-link-pill p-3 !text-mango-light hover:!bg-mango hover:!text-paper" title="Log Out & Return">
                <FaSignOutAlt className="h-5 w-5" />
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
                  `flex items-center gap-2 border-[2px] border-mango px-4 py-2 font-condensed text-sm uppercase tracking-[0.12em] text-paper transition duration-150 ${
                    isActive
                      ? 'bg-mango shadow-[3px_3px_0_0_#F5F1E8]'
                      : 'bg-mango hover:bg-mango-light hover:shadow-[3px_3px_0_0_#F5F1E8]'
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

