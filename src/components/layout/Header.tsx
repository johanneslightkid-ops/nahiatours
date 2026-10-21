import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MdShoppingCart } from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { HiOutlineMail, HiOutlineLocationMarker, HiPhone } from 'react-icons/hi';
import AdminNav from './AdminNav';
import CartBadge from '../cart/CartBadge';
import { onNavLinkClick } from '../../lib/navScroll';
import AdminLanguageSelect from '../admin/AdminLanguageSelect';
import LanguageSwitcher from '../LanguageSwitcher';
import { useBrand } from '../../contexts/BrandContext';
import { useI18n, type Locale } from '../../contexts/I18nContext';
import { playClickFx } from '../../lib/soundEngine';
import { getAdminPassword, clearAdminPassword } from '../../services/authStore';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { BrandLogo, CONTACT, SocialIcons } from '../edt/brand';
import PlannerBarControls from '../edt/PlannerBarControls';
import { useSitePages } from '../../edt/sitePages';

/**
 * A thin black line of contact details, and under it the bar: clear over the
 * home page's photograph, solid ivory everywhere else and as soon as the page
 * moves. Small caps, an amber rule under the page you are on, and the one
 * green button. On a phone the links open as a full-screen index.
 */

interface NavItem {
  to: string;
  id: string;
  fallback: string;
  match: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { to: '/', id: 'nav.home', fallback: 'Home', match: (p) => p === '/' },
  { to: '/tours', id: 'nav.tours', fallback: 'Tours', match: (p) => p.startsWith('/tours') || p.startsWith('/details/tours') },
  { to: '/transport', id: 'nav.transport', fallback: 'Transfers', match: (p) => p.startsWith('/transport') || p.startsWith('/details/transport') },
  { to: '/plan', id: 'nav.plan', fallback: 'Plan my day', match: (p) => p.startsWith('/plan') },
  { to: '/blog', id: 'nav.blog', fallback: 'Blog', match: (p) => p.startsWith('/blog') },
  { to: '/about', id: 'nav.about', fallback: 'About', match: (p) => p.startsWith('/about') },
  { to: '/contact', id: 'nav.contact', fallback: 'Contact', match: (p) => p.startsWith('/contact') },
];

const ABOUT_LABEL: Record<Locale, string> = { en: 'About us', es: 'Nosotros', fr: 'À propos', de: 'Über uns' };
const BOOK_LABEL: Record<Locale, string> = { en: 'Book now', es: 'Reservar', fr: 'Réserver', de: 'Buchen' };
const MENU_LABEL: Record<Locale, string> = { en: 'Menu', es: 'Menú', fr: 'Menu', de: 'Menü' };
const WA_HELLO: Record<Locale, string> = {
  en: 'Hi! I would like to book an excursion.',
  es: '¡Hola! Me gustaría reservar una excursión.',
  fr: 'Bonjour ! Je voudrais réserver une excursion.',
  de: 'Hallo! Ich möchte einen Ausflug buchen.',
};

const NavLabel: React.FC<{ item: NavItem; locale: Locale }> = ({ item, locale }) =>
  item.id === 'nav.about' ? <>{ABOUT_LABEL[locale]}</> : <FormattedMessage id={item.id} defaultMessage={item.fallback} />;

/** The phone menu: a full-screen index of the site, numbered like a contents page. */
const MobileMenu: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const location = useLocation();
  const { locale } = useI18n();
  const { brandSettings } = useBrand();
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
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-paper"
      initial={reduced ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex h-[4.5rem] items-center justify-between border-b border-ink/10 px-5">
        <Link to="/" onClick={onClose} className="no-underline">
          <BrandLogo size="sm" />
        </Link>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-[3px] ring-1 ring-ink/15" aria-label="Close">
          <svg viewBox="0 0 20 20" className="h-5 w-5"><path d="M4 4 L16 16 M16 4 L4 16" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" /></svg>
        </button>
      </div>
      <nav className="flex-1 px-5 py-6" aria-label="Main">
        <ul className="divide-y divide-ink/10">
          {[...NAV, { to: '/cart', id: 'nav.cart', fallback: 'Cart', match: (p: string) => p.startsWith('/cart') }].map((item, index) => {
            const active = item.match(location.pathname);
            return (
              <motion.li
                key={item.to}
                initial={reduced ? false : { opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * index, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={item.to}
                  onClick={(event) => {
                    playClickFx();
                    onNavLinkClick(event, item.to, location.pathname);
                    onClose();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className="flex items-baseline gap-4 py-3.5 text-ink no-underline"
                >
                  <span className="w-7 font-condensed text-sm font-bold tracking-[0.14em] text-gold-dark">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`font-display text-[2.1rem] uppercase leading-none ${active ? 'text-mango-dark' : ''}`}>
                    <NavLabel item={item} locale={locale} />
                  </span>
                  {item.to === '/cart' && <CartBadge className="ml-1 self-center" />}
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>
      <div className="space-y-5 border-t border-ink/10 px-5 py-6">
        <LanguageSwitcher inline />
        <a
          href={generateWhatsAppMessage(brandSettings.phoneNumber, WA_HELLO[locale])}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa w-full"
        >
          <FaWhatsapp className="h-5 w-5" /> WhatsApp {brandSettings.phoneNumber}
        </a>
        <SocialIcons itemClassName="grid h-10 w-10 place-items-center rounded-full bg-ink text-paper hover:bg-mango hover:text-ink" />
      </div>
    </motion.div>
  );
};

const Header: React.FC = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const contactEmail = useSitePages(locale)?.contact.email || brandSettings.contactEmail || '';
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAdminPassword());
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const handleAuthChange = () => setIsAuthenticated(!!getAdminPassword());
    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setScrolled(window.scrollY > 24);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const isAdminRoute = location.pathname.startsWith('/admin') && isAuthenticated;

  // The back office keeps a plain working bar: one line, the menu, the
  // language and log-out. The logo is pinned to the corner, out of the flow.
  if (isAdminRoute) {
    return (
      <>
        <Link
          to="/"
          aria-label={brandSettings.brandName}
          title={brandSettings.brandName}
          className="fixed left-2 top-1.5 z-[60] grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-white no-underline ring-2 ring-ink/10"
        >
          {brandSettings.brandicon ? (
            <img src={brandSettings.brandicon} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <span className="font-display text-sm text-ink">{brandSettings.brandName.trim().charAt(0)}</span>
          )}
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

  // Clear only at the top of the home page, over the hero photograph.
  const overPhoto = location.pathname === '/' && !scrolled;
  const linkTone = overPhoto ? 'text-white' : 'text-ink';

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        {/* Contact line, on wide screens, until the page moves. */}
        <div
          className={`hidden overflow-hidden bg-ink text-paper/80 transition-[transform,opacity] duration-300 lg:block ${
            scrolled ? 'pointer-events-none -translate-y-full opacity-0' : ''
          }`}
        >
          <div className="section-shell flex h-9 items-center justify-between text-[0.8rem] font-medium">
            <div className="flex items-center gap-6">
              <span className="inline-flex items-center gap-1.5"><HiOutlineLocationMarker className="h-3.5 w-3.5 text-gold" /> {CONTACT.address}</span>
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="inline-flex items-center gap-1.5 font-medium text-paper/80 no-underline hover:text-mango-light">
                  <HiOutlineMail className="h-3.5 w-3.5 text-gold" /> {contactEmail}
                </a>
              )}
              {brandSettings.phoneNumber && (
                <span className="inline-flex items-center gap-1.5"><HiPhone className="h-3.5 w-3.5 text-gold" /> {brandSettings.phoneNumber}</span>
              )}
            </div>
            <SocialIcons itemClassName="grid h-7 w-7 place-items-center rounded-full text-paper/75 transition hover:bg-white/10 hover:text-mango-light" />
          </div>
        </div>

        <div
          className={`transition-[transform,background-color,box-shadow] duration-300 ${
            overPhoto ? 'bg-transparent' : 'bg-paper/[0.97] shadow-[0_1px_0_rgb(20_22_26/0.08),0_10px_30px_-20px_rgb(20_22_26/0.4)]'
          } ${scrolled ? 'lg:-translate-y-9' : ''}`}
        >
          <div className="section-shell flex h-[4.5rem] items-center justify-between gap-4 lg:h-20">
            <Link
              to="/"
              onClick={(event) => {
                playClickFx();
                onNavLinkClick(event, '/', location.pathname);
              }}
              className="shrink-0 no-underline"
              aria-label={brandSettings.brandName}
            >
              <BrandLogo tone={overPhoto ? 'white' : 'colour'} size="md" />
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex xl:gap-2" aria-label="Main">
              {NAV.slice(1).map((item) => {
                const active = item.match(location.pathname);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={(event) => {
                      playClickFx();
                      onNavLinkClick(event, item.to, location.pathname);
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`edt-nav-link ${linkTone} ${active ? 'is-active' : ''}`}
                  >
                    <NavLabel item={item} locale={locale} />
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {/* The planner's voice play/pause and Enter, there only. */}
              {location.pathname.startsWith('/plan') && <PlannerBarControls tone={overPhoto ? 'light' : 'dark'} />}
              <Link
                to="/cart"
                onClick={(event) => {
                  playClickFx();
                  onNavLinkClick(event, '/cart', location.pathname);
                }}
                aria-label="Cart"
                className={`relative grid h-10 w-10 place-items-center rounded-[3px] no-underline transition ${
                  overPhoto ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-paper-warm'
                }`}
              >
                <MdShoppingCart className="h-5 w-5" />
                <CartBadge className="absolute -right-1 -top-1" />
              </Link>
              <div className="hidden lg:block">
                <LanguageSwitcher tone={overPhoto ? 'light' : 'dark'} />
              </div>
              {/* Wrapped: the button's own display would override `hidden`. */}
              <span className="hidden sm:block">
                <a
                  href={generateWhatsAppMessage(brandSettings.phoneNumber, WA_HELLO[locale])}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playClickFx()}
                  className="btn-wa btn-sm"
                >
                  <FaWhatsapp className="h-4 w-4" /> {BOOK_LABEL[locale]}
                </a>
              </span>
              <button
                type="button"
                onClick={() => {
                  playClickFx();
                  setMenuOpen(true);
                }}
                aria-label={MENU_LABEL[locale]}
                aria-expanded={menuOpen}
                className={`grid h-10 w-10 place-items-center rounded-[3px] lg:hidden ${overPhoto ? 'text-white ring-1 ring-white/40' : 'text-ink ring-1 ring-ink/15'}`}
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5"><path d="M3 6 H17 M3 10 H17 M3 14 H12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>{menuOpen && <MobileMenu onClose={closeMenu} />}</AnimatePresence>
    </>
  );
};

export default Header;
