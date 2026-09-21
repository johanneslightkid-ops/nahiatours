import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { FaSignOutAlt } from 'react-icons/fa';
import { ADMIN_NAV, adminLabel } from '../../lib/adminNav';

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
 * The styling is deliberately token-only — `nav-link-pill` and the nine colour
 * families every branch's tailwind config defines — so it lands inside each
 * site's own palette rather than silently losing half its classes.
 */

interface AdminNavProps {
  /** Closes the mobile menu; whatever the masthead does on navigation. */
  onNavigate?: () => void;
  onLogout: () => void;
}

const AdminNav: React.FC<AdminNavProps> = ({ onNavigate, onLogout }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const intl = useIntl();

  const currentSection = searchParams.get('section') || 'brand';

  const pill = (active: boolean) =>
    `nav-link-pill flex items-center gap-2 !rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap ${
      active ? 'nav-link-pill-active' : ''
    }`;

  return (
    <>
      {ADMIN_NAV.map((item) => {
        const Icon = item.icon;
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
            <Icon className="h-5 w-5 shrink-0" />
            <span>{adminLabel(item, intl.locale)}</span>
          </Link>
        );
      })}

      <div className="mx-1 hidden h-6 w-0.5 bg-ink/30 md:block" />

      <button
        type="button"
        onClick={onLogout}
        className="nav-link-pill flex items-center gap-2 !rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap !text-hibiscus-dark hover:!bg-hibiscus-light"
      >
        <FaSignOutAlt className="h-5 w-5 shrink-0" />
        <span>{intl.locale.toLowerCase().startsWith('en') ? 'Log out' : 'Salir'}</span>
      </button>
    </>
  );
};

export default AdminNav;
