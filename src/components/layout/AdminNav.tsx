import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { FaSignOutAlt } from 'react-icons/fa';
import { ADMIN_NAV, adminLabel, adminLang, LOGOUT_LABEL } from '../../lib/adminNav';

/**
 * The admin menu, as one component.
 *
 * It lives apart from Header for two reasons. The first is that the entries
 * used to be eight hand-written links carrying an icon and an English `title`
 * — a tooltip, which needs a mouse, needs a pause, and on a phone never
 * appears at all, so the menu could only be learned by clicking everything.
 * The second is that five branches of this repository each have their own
 * masthead, and eight links repeated five times is eight links that drift
 * apart five ways. This file is identical everywhere; only its surroundings
 * differ.
 *
 * From laptop width up the entries are icons only — the full row of words
 * no longer fit beside the language switch — and each one's name appears in
 * a small label under it on hover AND on keyboard focus, not as a `title`
 * tooltip (see above). The page you are on keeps its name beside its icon,
 * so the row always says where you are. Narrower than that, and in the phone
 * menu, the names stay written out: there is no hover there.
 *
 * The styling is deliberately token-only — `nav-link-pill` and the nine colour
 * families every branch's tailwind config defines — so it lands inside each
 * site's own palette rather than silently losing half its classes.
 */

interface AdminNavProps {
  /** Closes the mobile menu; whatever the masthead does on navigation. */
  onNavigate?: () => void;
  onLogout: () => void;
  /**
   * Controls that must stay in view, such as a language switch. When given,
   * the links scroll sideways on a narrow screen and these stay pinned at the
   * end of the row with log-out.
   */
  trailing?: React.ReactNode;
}

const AdminNav: React.FC<AdminNavProps> = ({ onNavigate, onLogout, trailing }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const intl = useIntl();

  const currentSection = searchParams.get('section') || 'brand';

  // Compact on purpose: the entries, a language switch and log-out share one
  // line at laptop width. Below that the row scrolls sideways rather than wraps.
  const pill = (active: boolean) =>
    `nav-link-pill group relative flex shrink-0 items-center !gap-1.5 !rounded-full !px-2.5 !py-1 text-xs font-semibold whitespace-nowrap ${
      active ? 'nav-link-pill-active' : 'lg:!px-2'
    }`;
  const logoutLabel = LOGOUT_LABEL[adminLang(intl.locale)];

  const links = ADMIN_NAV.map((item) => {
    const Icon = item.icon;
    const label = adminLabel(item, intl.locale);
    const to = item.path ?? `/admin?section=${item.section}`;
    // A section pill must not light up while a route-of-its-own is open:
    // with no `section` in the URL the default above would otherwise mark
    // the first entry as the current page from /admin/transport.
    const active = item.path
      ? location.pathname === item.path
      : location.pathname === '/admin' && currentSection === item.section;
    return (
      <Link
        key={item.path ?? item.section}
        to={to}
        onClick={onNavigate}
        className={pill(active)}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {/* The name: written out below laptop width and for the current page; read out by screen readers always. */}
        <span className={active ? '' : 'lg:sr-only'}>{label}</span>
        {!active && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-semibold text-paper opacity-0 shadow-ink-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
          >
            {label}
          </span>
        )}
      </Link>
    );
  });

  const logout = (
    <button
      type="button"
      onClick={onLogout}
      title={logoutLabel}
      aria-label={logoutLabel}
      className="nav-link-pill flex shrink-0 items-center !rounded-full !px-2 !py-1 text-xs font-semibold whitespace-nowrap !text-hibiscus-dark hover:!bg-hibiscus-light"
    >
      <FaSignOutAlt className="h-4 w-4 shrink-0" />
    </button>
  );

  if (trailing === undefined) {
    return (
      <>
        {links}
        {logout}
      </>
    );
  }

  return (
    <>
      {/* Scrolls sideways on a narrow screen; from laptop width the icons fit, and the hover labels must not be clipped. */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] lg:justify-center lg:overflow-visible">
        {links}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {trailing}
        {logout}
      </div>
    </>
  );
};

export default AdminNav;
