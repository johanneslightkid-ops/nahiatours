import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MdHome, MdTour, MdLocalTaxi, MdEmail, MdLibraryBooks, MdShoppingCart, MdPlace } from 'react-icons/md';
import { FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import AdminNav from './AdminNav';
import CartBadge from '../cart/CartBadge';
import { onNavLinkClick } from '../../lib/navScroll';
import { showsBrandName } from '../../lib/brandDisplay';
import AdminLanguageSelect from '../admin/AdminLanguageSelect';
import LanguageSwitcher from '../LanguageSwitcher';
import { useBrand } from '../../contexts/BrandContext';
import { useI18n } from '../../contexts/I18nContext';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';
import { getAdminPassword, clearAdminPassword } from '../../services/authStore';
import { localeText } from '../../lib/localeText';
import { track } from '../../lib/activity';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { Butterflies, ColourPools, PatioWall } from './PatioScene';

/**
 * A street in the Zona Colonial.
 *
 * Every page of the site is a painted window on the same street, each with
 * its own pair of wooden persianas. Brush past one and its shutters swing
 * open on the room behind; the page you are on stays open, with flowers in
 * its window box. The logo hangs at the corner like the medallion over a
 * shop door.
 *
 * On a phone — and on a wide screen once the street has scrolled away — the
 * street folds into a small double door in the corner. Open it and two tall
 * shutters swing apart onto the wall of an old house, every page a window in
 * it, with the logo and the language compass on one side and a way to reach
 * a person on the other.
 */

interface NavItem {
  to: string;
  id: string;
  fallback: string;
  icon: React.ReactNode;
  note: Record<'en' | 'es' | 'fr' | 'de', string>;
  /** The colour of the room behind the shutters, and of the shutters. */
  room: string;
  shutter: string;
  match: (path: string) => boolean;
}

const NAV: NavItem[] = [
  { to: '/', id: 'nav.home', fallback: 'Home', icon: <MdHome />, note: { en: 'the street', es: 'la calle', fr: 'la rue', de: 'die Gasse' }, room: '#FFDD6E', shutter: '#2F4FD1', match: (p) => p === '/' },
  { to: '/plan', id: 'nav.plan', fallback: 'Plan', icon: <HiSparkles />, note: { en: 'my day', es: 'mi día', fr: 'ma journée', de: 'mein Tag' }, room: '#F2AEDB', shutter: '#4F9136', match: (p) => p.startsWith('/plan') },
  { to: '/tours', id: 'nav.tours', fallback: 'Tours', icon: <MdTour />, note: { en: 'excursions', es: 'excursiones', fr: 'excursions', de: 'Ausflüge' }, room: '#A9E4EE', shutter: '#E5482F', match: (p) => p.startsWith('/tours') || p.startsWith('/details/tours') },
  { to: '/transport', id: 'nav.transport', fallback: 'Transport', icon: <MdLocalTaxi />, note: { en: 'rides', es: 'traslados', fr: 'trajets', de: 'Fahrten' }, room: '#FFC09A', shutter: '#1F7D94', match: (p) => p.startsWith('/transport') },
  { to: '/blog', id: 'nav.blog', fallback: 'Blog', icon: <MdLibraryBooks />, note: { en: 'stories', es: 'historias', fr: 'histoires', de: 'Geschichten' }, room: '#B4D98A', shutter: '#BF3A8F', match: (p) => p.startsWith('/blog') },
  { to: '/contact', id: 'nav.contact', fallback: 'Contact', icon: <MdEmail />, note: { en: 'say hola', es: 'di hola', fr: 'dites hola', de: 'sag hallo' }, room: '#FF9E8A', shutter: '#EE7A3C', match: (p) => p.startsWith('/contact') },
  { to: '/cart', id: 'nav.cart', fallback: 'Cart', icon: <MdShoppingCart />, note: { en: 'my trip', es: 'mi viaje', fr: 'mon voyage', de: 'meine Reise' }, room: '#FFF3B0', shutter: '#1A2F94', match: (p) => p.startsWith('/cart') },
];

/* ── The logo: a medallion over the door ───────────────────────────────── */

const LOGO_VIDEO = '/brand/willy-tours';

/**
 * The animated logo. Played only where it costs nothing to see it: never for
 * someone who asked for reduced motion or less data, who get the still.
 */
const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { brandSettings } = useBrand();
  const reduced = useReducedMotion();
  const saveData = typeof navigator !== 'undefined' && Boolean((navigator as any).connection?.saveData);
  const still = brandSettings.brandicon || `${LOGO_VIDEO}-poster.jpg`;
  return (
    <span className={`brand-logo relative block overflow-hidden rounded-full ${className}`}>
      {brandSettings.brandicon || reduced || saveData ? (
        <img src={still} alt="" className="brand-logo-image h-full w-full object-cover" />
      ) : (
        <video
          className="brand-logo-image h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={`${LOGO_VIDEO}-poster.jpg`}
          aria-hidden="true"
        >
          <source src={`${LOGO_VIDEO}.webm`} type="video/webm" />
          <source src={`${LOGO_VIDEO}.mp4`} type="video/mp4" />
        </video>
      )}
    </span>
  );
};

const BrandSign: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { brandSettings } = useBrand();
  if (!showsBrandName(brandSettings)) return <span className="sr-only">{brandSettings.brandName}</span>;
  return (
    <span
      className={`brand-name-crystal inline-block -rotate-2 rounded-[6px_12px_6px_12px] border-[3px] border-ink bg-paper-card px-3 py-1 shadow-ink-sm ${
        compact ? 'max-w-[9.5rem] px-2 py-0.5 text-[0.95rem] leading-tight' : 'text-[1.45rem]'
      }`}
    >
      {brandSettings.brandName}
    </span>
  );
};

/* ── One window ────────────────────────────────────────────────────────── */

const Ventana: React.FC<{ item: NavItem; active: boolean; locale: 'en' | 'es' | 'fr' | 'de'; onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void; big?: boolean }> = ({
  item,
  active,
  locale,
  onClick,
  big = false,
}) => (
  <Link
    to={item.to}
    onClick={onClick}
    onMouseEnter={() => playHoverFx()}
    aria-current={active ? 'page' : undefined}
    data-active={active}
    className={`ventana no-underline ${big ? 'scale-[1.18]' : ''}`}
    style={{ '--room': item.room, '--shutter': item.shutter } as React.CSSProperties}
  >
    <span className="ventana-frame">
      <span className="ventana-room">{item.icon}</span>
      <span className="ventana-leaf ventana-leaf-l" aria-hidden="true" />
      <span className="ventana-leaf ventana-leaf-r" aria-hidden="true" />
    </span>
    <span className="ventana-sill" aria-hidden="true" />
    <span className="ventana-name">
      <FormattedMessage id={item.id} defaultMessage={item.fallback} />
    </span>
    <span className="ventana-note">{item.note[locale]}</span>
    {item.to === '/cart' && (
      <span className="ventana-count">
        <CartBadge />
      </span>
    )}
  </Link>
);

/* ── The little double door that opens the menu ─────────────────────────── */

const DoorButton: React.FC<{ open: boolean; onClick: () => void; label: string }> = ({ open, onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    onMouseEnter={() => playHoverFx()}
    aria-label={label}
    aria-expanded={open}
    className="relative grid h-14 w-12 place-items-center"
    style={{ perspective: '240px' }}
  >
    <span className="absolute inset-0 rounded-t-[1.4rem] rounded-b-[4px] border-[3px] border-ink bg-mango-light shadow-ink-sm" />
    <span
      className="absolute bottom-[3px] left-[3px] top-[3px] w-[calc(50%-3px)] origin-left rounded-tl-[1.2rem] border-r-2 border-ink bg-sky transition-transform duration-500"
      style={{
        transform: open ? 'rotateY(-110deg)' : 'none',
        backgroundImage: 'repeating-linear-gradient(180deg, rgb(29 35 70 / .35) 0 2px, transparent 2px 6px)',
      }}
    />
    <span
      className="absolute bottom-[3px] right-[3px] top-[3px] w-[calc(50%-3px)] origin-right rounded-tr-[1.2rem] border-l-2 border-ink bg-sky transition-transform duration-500"
      style={{
        transform: open ? 'rotateY(110deg)' : 'none',
        backgroundImage: 'repeating-linear-gradient(180deg, rgb(29 35 70 / .35) 0 2px, transparent 2px 6px)',
      }}
    />
    <span className={`relative text-lg font-black text-ink transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}>✕</span>
    <span className="absolute -right-2 -top-2">
      <CartBadge />
    </span>
  </button>
);

/* ── Contact, on the right of the patio ─────────────────────────────────── */

const PatioContact: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const say = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);
  const name = brandSettings.contactName || brandSettings.brandName;
  const whatsapp = generateWhatsAppMessage(
    brandSettings.phoneNumber,
    say({ en: 'Hello! A question about your tours:', es: '¡Hola! Una pregunta sobre sus tours:', de: 'Hallo! Eine Frage zu euren Touren:', fr: 'Bonjour ! Une question sur vos excursions :' })
  );
  const tel = brandSettings.phoneNumber.replace(/[^\d+]/g, '');

  if (compact) {
    return (
      <div className="flex flex-col items-stretch gap-2.5">
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => track('whatsapp', { source: 'menu' })} className="inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-jungle px-4 py-2 font-bold text-paper no-underline shadow-ink-sm">
            <FaWhatsapp /> WhatsApp
          </a>
        )}
        {tel && (
          <a href={`tel:${tel}`} className="inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-paper-card px-4 py-2 font-bold text-ink no-underline shadow-ink-sm">
            <FaPhoneAlt /> {say({ en: 'Call', es: 'Llamar', de: 'Anrufen', fr: 'Appeler' })}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[19rem] -rotate-1 rounded-[1.6rem_0.8rem_1.6rem_0.8rem] border-[3px] border-ink bg-paper-card/95 p-6 shadow-ink">
      <p className="hand-note !text-[1.5rem] leading-none">{say({ en: `talk to ${name}`, es: `habla con ${name}`, de: `sprich mit ${name}`, fr: `parlez à ${name}` })}</p>
      <p className="mt-2 text-sm font-semibold text-ink-soft">
        {say({
          en: 'A real person answers — usually within minutes.',
          es: 'Contesta una persona de verdad — casi siempre en minutos.',
          de: 'Es antwortet ein echter Mensch — meist in wenigen Minuten.',
          fr: 'Une vraie personne répond — en général en quelques minutes.',
        })}
      </p>

      {whatsapp && (
        <div className="relative mt-6">
          {/* The button stays still; the sun behind it turns and a ring goes out from it. */}
          <svg className="contact-rays pointer-events-none absolute -left-5 -top-6 h-24 w-24" viewBox="0 0 100 100" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M50 4V18" transform={`rotate(${i * 30} 50 50)`} stroke="#F5B921" strokeWidth={6} strokeLinecap="round" />
            ))}
          </svg>
          <span className="contact-ping pointer-events-none absolute inset-0 rounded-full border-[3px] border-jungle" aria-hidden="true" />
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            onClick={() => track('whatsapp', { source: 'menu' })}
            className="relative flex items-center justify-center gap-3 rounded-full border-[3px] border-ink bg-jungle px-5 py-3.5 text-lg font-extrabold text-paper no-underline shadow-ink-sm"
          >
            <FaWhatsapp className="h-6 w-6" /> WhatsApp
          </a>
        </div>
      )}

      {tel && (
        <a href={`tel:${tel}`} className="mt-4 flex items-center gap-3 rounded-full border-[3px] border-ink bg-mango-light px-5 py-2.5 font-bold text-ink no-underline shadow-ink-sm">
          <span className="contact-ring inline-block" aria-hidden="true">
            <FaPhoneAlt />
          </span>
          <span className="tabular-nums">{brandSettings.phoneNumber}</span>
        </a>
      )}

      <Link to="/contact#top" className="mt-4 flex items-center gap-3 rounded-full border-[3px] border-ink bg-paper px-5 py-2.5 font-bold text-ink no-underline shadow-ink-sm">
        <MdEmail className="h-5 w-5" />
        {say({ en: 'Write to us', es: 'Escríbenos', de: 'Schreib uns', fr: 'Écrivez-nous' })}
        <span className="contact-spark ml-auto text-mango-dark" aria-hidden="true">✦</span>
      </Link>

      <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <MdPlace className="h-5 w-5 text-hibiscus" /> El Cortecito · Bávaro, Punta Cana
      </p>
    </div>
  );
};

/* ── The patio: the menu ───────────────────────────────────────────────── */

const Patio: React.FC<{ onClose: () => void; wide: boolean }> = ({ onClose, wide }) => {
  const location = useLocation();
  const { locale } = useI18n();
  const reduced = useReducedMotion();

  useEffect(() => {
    // Both the page and the document: locking only <body> leaves the root
    // scrollbar standing next to the menu's own on a desktop browser.
    const root = document.documentElement;
    const previous = { body: document.body.style.overflow, root: root.style.overflow };
    document.body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous.body;
      root.style.overflow = previous.root;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const shutter = (side: 'l' | 'r') => (
    <motion.div
      className="absolute inset-y-0 z-30 w-1/2 border-ink bg-sky"
      style={{
        [side === 'l' ? 'left' : 'right']: 0,
        transformOrigin: side === 'l' ? 'left center' : 'right center',
        borderRightWidth: side === 'l' ? 3 : 0,
        borderLeftWidth: side === 'r' ? 3 : 0,
        backgroundImage: 'repeating-linear-gradient(180deg, rgb(29 35 70 / .3) 0 3px, transparent 3px 14px)',
      }}
      initial={reduced ? { opacity: 0 } : { rotateY: 0 }}
      animate={reduced ? { opacity: 0 } : { rotateY: side === 'l' ? -96 : 96 }}
      exit={reduced ? { opacity: 0 } : { rotateY: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
    />
  );

  const question =
    locale === 'es' ? '¿Qué ventana abrimos?' : locale === 'fr' ? 'Quelle fenêtre ouvrir ?' : locale === 'de' ? 'Welches Fenster öffnen wir?' : 'Which window shall we open?';

  const windows = (columns: string) => (
    <div className={`grid ${columns} justify-items-center ${wide ? 'gap-x-4 gap-y-7' : 'gap-x-1 gap-y-5'}`}>
      {NAV.map((item, i) => (
        <motion.div
          key={item.to}
          className="flex justify-center"
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Ventana
            item={item}
            active={item.match(location.pathname)}
            locale={locale}
            big={wide}
            onClick={(event) => {
              playClickFx();
              onNavLinkClick(event, item.to, location.pathname);
              onClose();
            }}
          />
        </motion.div>
      ))}
    </div>
  );

  return (
    <motion.div
      className={`fixed inset-0 z-[60] ${wide ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'}`}
      style={{ perspective: 900 }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { delay: 0.45, duration: 0.15 } }}
      role="dialog"
      aria-modal="true"
      aria-label={question}
    >
      <PatioWall narrow={!wide} />
      <Butterflies />
      {/* Clipped, so the swung-open shutters cannot make the menu scroll. */}
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" style={{ perspective: 900 }}>
        {shutter('l')}
        {shutter('r')}
      </div>

      {wide ? (
        /* Wide screens: logo and compass on the left, the windows in the
           middle of the wall, a way to reach a person on the right — all of
           it inside the viewport, nothing to scroll. */
        <div className="relative z-20 grid h-[100dvh] grid-cols-[minmax(17rem,24rem)_1fr_minmax(17rem,22rem)] items-center gap-6 px-[4vw] py-10">
          <div className="relative mx-auto h-[min(30rem,80dvh)] w-[19rem]">
            <ColourPools />
            <Link to="/" onClick={(event) => { playClickFx(); onNavLinkClick(event, '/', location.pathname); onClose(); }} className="wobble-a absolute left-6 top-6 flex flex-col items-center gap-2 no-underline">
              <Logo className="h-[9.5rem] w-[9.5rem] border-[4px] border-ink shadow-ink" />
              <BrandSign />
            </Link>
            <div className="wobble-b absolute bottom-8 right-6">
              <LanguageSwitcher />
            </div>
          </div>

          {/* A freshly plastered stretch of the old wall, around the windows. */}
          <div className="mx-auto flex min-w-0 flex-col items-center rounded-[2.4rem_1.2rem_2.8rem_1.4rem] border-[3px] border-dashed border-[#E99876] bg-[#FBD5C0]/90 px-[3vw] pb-10 pt-7">
            <p className="hand-note mb-8 text-center !text-[1.7rem]">{question}</p>
            {windows('grid-cols-4')}
          </div>

          <div className="flex justify-center">
            <PatioContact />
          </div>
        </div>
      ) : (
        <div className="relative z-20 mx-auto flex min-h-full max-w-md flex-col px-3 pb-8 pt-24">
          <p className="hand-note mx-auto mb-4 rounded-full bg-paper-card/85 px-4 text-center">{question}</p>
          {windows('grid-cols-4')}
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="wobble-b shrink-0">
              <LanguageSwitcher />
            </div>
            <PatioContact compact />
          </div>
        </div>
      )}
    </motion.div>
  );
};

/* ── Header ────────────────────────────────────────────────────────────── */

const Header: React.FC = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 1024px)');
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

  // On a wide screen the street scrolls away with the page; past it, the
  // little door takes its place in the corner.
  useEffect(() => {
    if (!wide) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 170));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [wide]);

  const isAdminRoute = location.pathname.startsWith('/admin') && isAuthenticated;

  // The back office keeps a plain working bar: it is a tool, not a gallery.
  if (isAdminRoute) {
    return (
      <>
        <Link to="/" aria-label={brandSettings.brandName} title={brandSettings.brandName} className="fixed left-2 top-1.5 z-[60] no-underline">
          <Logo className="h-9 w-9" />
        </Link>
        <header className="lobster-header sticky top-0 z-50 border-b-[3px] border-ink bg-paper-card">
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

  const doorLabel =
    locale === 'es' ? 'Abrir el menú' : locale === 'fr' ? 'Ouvrir le menu' : locale === 'de' ? 'Menü öffnen' : 'Open the menu';
  const home = (event: React.MouseEvent<HTMLAnchorElement>) => {
    playClickFx();
    onNavLinkClick(event, '/', location.pathname);
  };

  return (
    <>
      {/* Wide screens: the street. */}
      <header className="absolute inset-x-0 top-0 z-50 hidden h-[9.5rem] bg-paper lg:block">
        <div className="fachada" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-ink/80" aria-hidden="true" />
        <div className="section-shell relative flex h-full items-center justify-between gap-4">
          <Link to="/" onClick={home} onMouseEnter={() => playHoverFx()} className="group flex items-center gap-3 no-underline">
            <Logo className="h-[6.5rem] w-[6.5rem] transition-transform duration-500 group-hover:-rotate-6" />
            <BrandSign />
          </Link>

          <nav className="flex items-end gap-0.5 xl:gap-2" aria-label="Main">
            {NAV.map((item) => (
              <Ventana
                key={item.to}
                item={item}
                active={item.match(location.pathname)}
                locale={locale}
                onClick={(event) => {
                  playClickFx();
                  onNavLinkClick(event, item.to, location.pathname);
                }}
              />
            ))}
          </nav>

          <LanguageSwitcher />
        </div>
      </header>

      {/* Phones: a narrow strip with the medallion and the door. */}
      <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-between border-b-[3px] border-ink bg-paper px-3 py-2 lg:hidden">
        <Link to="/" onClick={home} className="flex items-center gap-2 no-underline">
          <Logo className="h-11 w-11" />
          <BrandSign compact />
        </Link>
        <DoorButton open={menuOpen} label={doorLabel} onClick={() => { playClickFx(); setMenuOpen((v) => !v); }} />
      </div>

      {/* Wide screens, once the street has scrolled away. */}
      <AnimatePresence>
        {wide && scrolled && !menuOpen && (
          <motion.div
            className="fixed right-5 top-4 z-[70] hidden lg:flex lg:items-center lg:gap-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Link to="/" onClick={home} aria-label={brandSettings.brandName} className="no-underline">
              <Logo className="h-12 w-12" />
            </Link>
            <DoorButton open={false} label={doorLabel} onClick={() => { playClickFx(); setMenuOpen(true); }} />
          </motion.div>
        )}
      </AnimatePresence>
      {wide && menuOpen && (
        <div className="fixed right-5 top-4 z-[80]">
          <DoorButton open label={doorLabel} onClick={() => { playClickFx(); setMenuOpen(false); }} />
        </div>
      )}

      <AnimatePresence>{menuOpen && <Patio onClose={closeMenu} wide={wide} />}</AnimatePresence>
    </>
  );
};

export default Header;
