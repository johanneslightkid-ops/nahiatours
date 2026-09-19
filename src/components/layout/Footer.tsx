import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { MdAdminPanelSettings } from 'react-icons/md';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';
import { PalmTree, Catamaran, Birds } from '../ui/Illustrations';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <FaInstagram className="h-4 w-4" />,
  tiktok: <FaTiktok className="h-4 w-4" />,
  facebook: <FaFacebook className="h-4 w-4" />,
  youtube: <FaYoutube className="h-4 w-4" />,
  twitter: <FaTwitter className="h-4 w-4" />,
  linkedin: <FaLinkedin className="h-4 w-4" />,
};

/**
 * The last postcard.
 *
 * The page ends the way the hero began: a painted scene, this time at dusk.
 * A sunset wash, the sea going dark, palms on the headland and a catamaran
 * making for harbour — then the practical part of a footer underneath it, in
 * the deep sea-ink the planner uses.
 *
 * The scene is one inline SVG: no image request, no decode, and it scales to
 * any width without art-directed crops.
 */
const Footer = () => {
  const { brandSettings } = useBrand();
  const [socialAccounts, setSocialAccounts] = useState<SocialMediaAccount[]>([]);

  useEffect(() => {
    const loadSocialAccounts = async () => {
      const data = await getSocialMediaData();
      setSocialAccounts(data.accounts.filter((a: SocialMediaAccount) => a.enabled));
    };
    loadSocialAccounts();
  }, []);

  return (
    <footer className="relative mt-auto">
      {/* ── The evening scene ─────────────────────────────────────────────── */}
      <div className="relative h-40 w-full overflow-hidden sm:h-56" aria-hidden="true">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1200 280"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          {/* dusk sky */}
          <rect width="1200" height="280" fill="#F6C98B" />
          <rect width="1200" height="280" fill="url(#duskWash)" />
          <defs>
            <linearGradient id="duskWash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F6C98B" stopOpacity="0.2" />
              <stop offset="42%" stopColor="#E0735B" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#6E5B8C" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {/* the sun going down */}
          <circle cx="880" cy="150" r="46" fill="#FBF5E9" fillOpacity="0.55" />
          <circle cx="880" cy="150" r="28" fill="#FBF5E9" fillOpacity="0.7" />
          {/* headland */}
          <path
            d="M0 168 C120 146 220 152 330 160 C420 166 470 156 540 162 L540 280 L0 280 Z"
            fill="#235141"
            fillOpacity="0.55"
          />
          {/* sea, with the sun's track on it */}
          <path
            d="M0 186 C180 172 360 194 540 184 C720 174 900 192 1080 182 C1130 179 1170 182 1200 178 L1200 280 L0 280 Z"
            fill="#14636F"
            fillOpacity="0.8"
          />
          <path
            d="M0 222 C200 210 400 230 600 220 C800 210 1000 228 1200 216 L1200 280 L0 280 Z"
            fill="#0E3F4A"
            fillOpacity="0.9"
          />
          <g fill="#F6C98B" fillOpacity="0.45">
            <rect x="856" y="196" width="48" height="4" rx="2" />
            <rect x="846" y="212" width="68" height="4" rx="2" />
            <rect x="836" y="230" width="88" height="4" rx="2" />
            <rect x="826" y="250" width="108" height="4" rx="2" />
          </g>
        </svg>

        <PalmTree className="absolute -left-4 bottom-0 h-40 w-28 opacity-80 sm:h-56 sm:w-40" />
        <PalmTree
          className="absolute -right-6 bottom-0 h-36 w-24 opacity-70 sm:h-48 sm:w-32"
          style={{ transform: 'scaleX(-1)' }}
        />
        <Catamaran className="absolute bottom-6 left-[38%] hidden h-20 w-20 opacity-90 sm:block" />
        <Birds className="absolute left-[22%] top-6 h-6 w-20 opacity-40" />
      </div>

      {/* ── The practical part ────────────────────────────────────────────── */}
      <div className="relative bg-[#0E3F4A] pb-10 pt-14 text-paper">
        <div className="section-shell relative z-10">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-paper/20 bg-paper/10">
                  {brandSettings.brandicon ? (
                    <img src={brandSettings.brandicon} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <img src="/competitor-logo.svg" alt="" className="h-8 w-8" loading="lazy" />
                  )}
                </span>
                <h3 className="font-display text-2xl font-semibold text-paper">{brandSettings.brandName}</h3>
              </div>
              <p className="max-w-md leading-relaxed text-paper/80">
                <FormattedMessage id="footer.description" />
              </p>

              {socialAccounts.length > 0 && (
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {socialAccounts.map((account) => (
                    <a
                      key={account.platform}
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-10 w-10 place-items-center rounded-full border border-paper/25 text-paper transition hover:-translate-y-0.5 hover:border-paper hover:bg-paper hover:text-[#0E3F4A]"
                      title={`${account.platform}`}
                    >
                      {platformIcons[account.platform]}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sun-light">
                <FormattedMessage id="footer.quickLinks" />
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link to="/#top" className="text-paper/85 hover:text-sun-light">
                    <FormattedMessage id="footer.home" />
                  </Link>
                </li>
                <li>
                  <Link to="/tours#top" className="text-paper/85 hover:text-sun-light">
                    <FormattedMessage id="footer.tours" />
                  </Link>
                </li>
                <li>
                  <Link to="/transport#top" className="text-paper/85 hover:text-sun-light">
                    <FormattedMessage id="footer.transport" defaultMessage="Transport" />
                  </Link>
                </li>
                <li>
                  <Link to="/contact#top" className="text-paper/85 hover:text-sun-light">
                    <FormattedMessage id="footer.contact" />
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="inline-flex items-center gap-1.5 text-paper/60 hover:text-sun-light">
                    <MdAdminPanelSettings className="h-4 w-4" />
                    <FormattedMessage id="footer.admin" />
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-sun-light">
                Punta Cana · Bávaro
              </h4>
              <p className="text-paper/80">El Cortecito, Bávaro</p>
              <p className="text-paper/80">Punta Cana, La Altagracia</p>
              {brandSettings.phoneNumber && (
                <a
                  href={`tel:${brandSettings.phoneNumber.replace(/[^\d+]/g, '')}`}
                  className="mt-3 inline-block text-paper hover:text-sun-light"
                >
                  {brandSettings.phoneNumber}
                </a>
              )}

              {socialAccounts.length > 0 && (
                <div className="mt-6 space-y-1.5 text-sm text-paper/70">
                  {socialAccounts.map((account) => (
                    <div key={account.platform} className="flex items-center gap-2">
                      <span className="text-sea-light">{platformIcons[account.platform]}</span>
                      <a
                        href={account.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="capitalize text-paper/80 transition-colors hover:text-sun-light"
                      >
                        {account.platform} @{account.username}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 border-t border-paper/15 pt-6 text-sm text-paper/60">
            <FormattedMessage id="footer.copyright" values={{ year: new Date().getFullYear() }} />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
