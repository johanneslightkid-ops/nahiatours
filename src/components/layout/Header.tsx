import React, { useState, useEffect } from 'react';
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
  /**
   * The logo medallion is deliberately oversized — it is the brand mark, and
   * it hangs below the bar into the page. That is right at the top of a page
   * and wrong everywhere else: once you scroll, a fixed 147px disc sits on
   * top of whatever you are reading. So it shrinks into the bar as soon as the
   * page moves, and comes back when you return to the top.
   *
   * The shrink is `scale` on a transform, so it costs a composite and never a
   * layout.
   */
  const [isScrolled, setIsScrolled] = useState(false);
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

  useEffect(() => {
    // Coalesced to one read per frame: a scroll handler that touches the DOM
    // on every event is the classic way to make a smooth page stutter.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 40);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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

  /** Admin areas that are their own route, such as transport. */
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
      <div
        className={`section-shell flex items-center justify-between py-3.5 transition-[padding] duration-500 lg:pl-8 ${
          isScrolled ? 'pl-[4.75rem] sm:pl-[6.5rem]' : 'pl-[6.75rem] sm:pl-[11.25rem]'
        }`}
      >
        <Link
          to="/#top"
          className="group flex items-center gap-3"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
        >
          <div
            className={`menu-logo-icon fixed left-3 top-1.5 flex h-[5.75rem] w-[5.75rem] origin-top-left items-center justify-center overflow-hidden rounded-full border-[3px] border-[rgba(150,112,31,0.55)] bg-gradient-to-br from-canvas-lift via-mango-light to-ochre shadow-oil-lg transition-transform duration-500 ease-out group-hover:-rotate-2 sm:left-6 sm:top-2 sm:h-[9.1875rem] sm:w-[9.1875rem] lg:left-[max(2rem,calc((100vw-80rem)/2+2rem))] ${
              isScrolled ? 'scale-[0.46] sm:scale-[0.38]' : 'group-hover:scale-[1.03]'
            }`}
          >
            {brandSettings.brandicon ? (
              <img src={brandSettings.brandicon} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <img src="/competitor-logo.svg" alt="Logo" className="h-[4.9rem] w-[4.9rem] sm:h-[7.875rem] sm:w-[7.875rem]" />
            )}
          </div>
          <h1 className={`relative hidden font-display text-[1.7rem] font-bold tracking-tight text-ink transition-all duration-500 group-hover:text-coral-dark sm:block ${
              isScrolled ? 'sm:ml-0 lg:ml-[4.75rem]' : 'sm:ml-[10.75rem] lg:ml-[11.5rem]'
            }`}>
            {brandSettings.brandName}
          </h1>
        </Link>

        <button
          className="grid h-11 w-11 place-items-center rounded-full border border-[rgba(150,112,31,0.5)] bg-gradient-to-br from-canvas-lift to-mango-light text-ink shadow-oil-sm transition hover:from-mango-light hover:to-ochre md:hidden"
          onClick={() => {
            playClickFx();
            setIsMenuOpen(!isMenuOpen);
          }}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <HiX className="h-8 w-8" /> : <HiMenu className="h-8 w-8" />}
        </button>

        <nav
          className={`${isMenuOpen ? 'flex' : 'hidden'} absolute left-3 right-3 top-[calc(100%+12px)] flex-col gap-2 rounded-[26px_18px_24px_20px] border border-[rgba(150,112,31,0.45)] bg-canvas-lift px-5 py-5 shadow-oil-lg md:static md:flex md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
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
              <Link to="/admin/transport" onClick={handleNavClick} className={adminRouteNavClass('/admin/transport')} title="Transport">
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
              <div className="mx-1 hidden h-6 w-px bg-[rgba(150,112,31,0.45)] md:block"></div>
              <button onClick={handleLogout} className="nav-link-pill p-3 !rounded-full !text-coral-dark hover:!bg-coral-light/40" title="Log Out & Return">
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
                  `flex items-center gap-2 rounded-full border border-[rgba(150,112,31,0.5)] px-4 py-2 text-sm font-bold text-ink shadow-oil-sm transition duration-300 hover:-translate-y-0.5 ${
                    isActive
                      ? 'bg-gradient-to-br from-mango to-ochre'
                      : 'bg-gradient-to-br from-canvas-lift to-mango-light hover:to-mango'
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

