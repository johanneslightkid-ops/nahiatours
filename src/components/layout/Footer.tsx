import React, { useState, useEffect } from 'react';
import { localeText } from '../../lib/localeText';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { MdAdminPanelSettings } from 'react-icons/md';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { useI18n } from '../../contexts/I18nContext';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';
import { Coral, Humpback, SeaFan, SeaTurtle, Seaweed, WaveBand } from '../ui/Illustrations';
import { RisingBubbles, useLiteNature } from '../nature/Nature';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <FaInstagram className="w-5 h-5" />,
  tiktok: <FaTiktok className="w-5 h-5" />,
  facebook: <FaFacebook className="w-5 h-5" />,
  youtube: <FaYoutube className="w-5 h-5" />,
  twitter: <FaTwitter className="w-5 h-5" />,
  linkedin: <FaLinkedin className="w-5 h-5" />
};

/**
 * The page ends underwater. A current line hands it over to deep water, a
 * humpback from Samaná passes slowly behind the links, and the reef grows
 * along the floor.
 */
const Footer = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const lite = useLiteNature();
  const [socialAccounts, setSocialAccounts] = useState<SocialMediaAccount[]>([]);

  useEffect(() => {
    const loadSocialAccounts = async () => {
      const data = await getSocialMediaData();
      setSocialAccounts(data.accounts.filter((a: SocialMediaAccount) => a.enabled));
    };
    loadSocialAccounts();
  }, []);

  const linkClass = 'font-semibold text-paper/90 no-underline transition-colors hover:text-lagoon-light';

  return (
    <footer className="relative mt-auto">
      <WaveBand tone="abyss" className="block h-14 w-full sm:h-20" />

      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#06323D_0%,#05252E_100%)] pb-28 pt-12 text-paper sm:pb-36">
        {/* Light from the surface. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_0%,rgba(147,236,225,0.18),transparent_70%)]" />

        {/* A humpback, crossing slowly. */}
        <div
          className="pointer-events-none absolute left-0 top-[18%] opacity-40"
          style={{ animation: `swimLeft ${lite ? 90 : 70}s linear infinite`, animationDelay: '-25s' }}
          aria-hidden="true"
        >
          <Humpback className="h-24 w-56 -scale-x-100 sm:h-32 sm:w-72" />
        </div>
        {!lite && (
          <div
            className="pointer-events-none absolute left-0 top-[52%] opacity-50"
            style={{ animation: 'swimRight 80s linear infinite', animationDelay: '-50s' }}
            aria-hidden="true"
          >
            <SeaTurtle className="h-20 w-16 rotate-90" />
          </div>
        )}
        <RisingBubbles columns={5} className="opacity-60" />

        {/* The reef floor. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 sm:h-40" aria-hidden="true">
          <Seaweed className="absolute bottom-0 left-[2%] h-32 w-16 opacity-80 sm:h-40" />
          <Coral className="absolute -bottom-2 left-[10%] h-24 w-24 opacity-90 sm:h-32 sm:w-32" />
          <SeaFan className="absolute bottom-0 left-[30%] hidden h-28 w-28 opacity-70 md:block" />
          <Coral tone="mango" className="absolute -bottom-2 right-[28%] hidden h-24 w-24 opacity-80 md:block" />
          <Seaweed tone="gold" className="absolute bottom-0 right-[18%] h-28 w-14 opacity-70 sm:h-36" />
          <Coral tone="orchid" className="absolute -bottom-2 right-[2%] h-28 w-28 opacity-90 sm:h-36 sm:w-36" />
          <svg className="absolute inset-x-0 bottom-0 h-8 w-full" viewBox="0 0 1200 40" preserveAspectRatio="none">
            <path d="M0 24 C200 10 400 34 600 22 C800 10 1000 30 1200 18 L1200 40 L0 40 Z" fill="#0B4F5C" fillOpacity={0.7} />
          </svg>
        </div>

        <div className="section-shell relative z-10">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-mango-light to-mango ring-4 ring-white/10">
                  {brandSettings.brandicon ? (
                    <img src={brandSettings.brandicon} alt="Logo" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <img src="/competitor-logo.svg" alt="Logo" className="h-10 w-10" loading="lazy" decoding="async" />
                  )}
                </div>
                <h3 className="font-display text-2xl font-bold text-paper">{brandSettings.brandName}</h3>
              </div>
              <p className="max-w-md font-medium leading-relaxed text-paper/80">
                <FormattedMessage id="footer.description" />
              </p>
              <p className="mt-4 font-accent text-2xl text-lagoon-light">
                {localeText(locale, { en: 'from the beach at El Cortecito', es: 'desde la playa de El Cortecito', de: 'vom Strand in El Cortecito', fr: 'depuis la plage d’El Cortecito' })}
              </p>

              {socialAccounts.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {socialAccounts.map((account, i) => (
                    <a
                      key={account.platform}
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`grid h-12 w-12 place-items-center bg-white/10 text-paper transition-transform duration-300 hover:-translate-y-1 hover:bg-lagoon hover:text-white ${
                        i % 2 ? 'rounded-[18px_10px_18px_10px]' : 'rounded-[10px_18px_10px_18px]'
                      }`}
                      title={`Follow on ${account.platform}`}
                    >
                      {platformIcons[account.platform]}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-4 font-display text-lg font-bold text-mango-light">
                <FormattedMessage id="footer.quickLinks" />
              </h4>
              <ul className="space-y-2.5">
                <li><Link to="/#top" className={linkClass}><FormattedMessage id="footer.home" /></Link></li>
                <li><Link to="/tours#top" className={linkClass}><FormattedMessage id="footer.tours" /></Link></li>
                <li><Link to="/transport#top" className={linkClass}><FormattedMessage id="footer.transport" defaultMessage="Transport" /></Link></li>
                <li><Link to="/contact#top" className={linkClass}><FormattedMessage id="footer.contact" /></Link></li>
                <li>
                  <Link to="/admin" className={`inline-flex items-center gap-1 ${linkClass}`}>
                    <MdAdminPanelSettings />
                    <FormattedMessage id="footer.admin" />
                  </Link>
                </li>
              </ul>
            </div>

            {socialAccounts.length > 0 && (
              <div>
                <h4 className="mb-4 font-display text-lg font-bold text-mango-light">Follow Us</h4>
                <div className="space-y-2 text-sm">
                  {socialAccounts.map((account) => (
                    <div key={account.platform} className="flex items-center gap-2">
                      <span className="text-lagoon-light">{platformIcons[account.platform]}</span>
                      <a href={account.url} target="_blank" rel="noopener noreferrer" className={`capitalize ${linkClass}`}>
                        {account.platform} @{account.username}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-10 border-t border-dashed border-paper/20 pt-6 text-sm font-medium text-paper/65">
            <FormattedMessage id="footer.copyright" values={{ year: new Date().getFullYear() }} />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
