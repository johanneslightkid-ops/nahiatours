import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { MdAdminPanelSettings } from 'react-icons/md';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';
import { PalmTree, Sailboat, Starfish, WaveBand } from '../ui/Illustrations';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <FaInstagram className="w-5 h-5" />,
  tiktok: <FaTiktok className="w-5 h-5" />,
  facebook: <FaFacebook className="w-5 h-5" />,
  youtube: <FaYoutube className="w-5 h-5" />,
  twitter: <FaTwitter className="w-5 h-5" />,
  linkedin: <FaLinkedin className="w-5 h-5" />
};

/**
 * The footer is where the page settles into deep water.
 *
 * The waterline above it darkens rather than brightens — turquoise straight
 * into navy would read as a seam, so the wave hands over from shallow to deep
 * and the panel picks up exactly where it left off. Light shafts fall through
 * it, the way they do below the surface.
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
      {/* The shoreline that hands the page over to the footer. */}
      <WaveBand tone="deep" className="-mb-px block h-14 w-full sm:h-20" />

      <div className="relative overflow-hidden bg-gradient-to-b from-[#0a6a80] via-[#08415c] to-[#052a3d] pt-16 pb-10 text-paper">
        {/* Light falling through deep water. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background:
              'repeating-linear-gradient(96deg, transparent 0 60px, rgba(255,255,255,0.16) 60px 86px, transparent 86px 170px)',
            WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 70%)',
            maskImage: 'linear-gradient(180deg, #000 0%, transparent 70%)',
          }}
        />
        <PalmTree className="pointer-events-none absolute -left-8 bottom-0 h-56 w-40 opacity-20" />
        <PalmTree className="pointer-events-none absolute -right-10 bottom-0 h-64 w-44 -scale-x-100 opacity-[0.16]" />
        <Sailboat className="animate-bob pointer-events-none absolute right-[18%] top-6 hidden h-20 w-20 opacity-30 lg:block" />
        <Starfish className="pointer-events-none absolute bottom-8 left-[46%] hidden h-10 w-10 rotate-12 opacity-25 md:block" />

        <div className="section-shell relative z-10">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/95 shadow-lg">
                  {brandSettings.brandicon ? (
                    <img src={brandSettings.brandicon} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <img src="/competitor-logo.svg" alt="Logo" className="h-10 w-10" />
                  )}
                </div>
                <h3 className="font-display text-2xl text-white">{brandSettings.brandName}</h3>
              </div>
              <p className="max-w-md text-paper/80">
                <FormattedMessage id="footer.description" />
              </p>

              {/* Social Media Icons */}
              {socialAccounts.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {socialAccounts.map((account) => (
                    <a
                      key={account.platform}
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-12 w-12 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/20 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-mango hover:ring-mango"
                      title={`Follow on ${account.platform}`}
                    >
                      {platformIcons[account.platform]}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-4 font-display text-lg text-mango-light">
                <FormattedMessage id="footer.quickLinks" />
              </h4>
              <ul className="space-y-2.5 font-medium">
                <li><Link to="/#top" className="text-paper/85 transition hover:text-mango-light"><FormattedMessage id="footer.home" /></Link></li>
                <li><Link to="/tours#top" className="text-paper/85 transition hover:text-mango-light"><FormattedMessage id="footer.tours" /></Link></li>
                <li><Link to="/transport#top" className="text-paper/85 transition hover:text-mango-light"><FormattedMessage id="footer.transport" defaultMessage="Transport" /></Link></li>
                <li><Link to="/contact#top" className="text-paper/85 transition hover:text-mango-light"><FormattedMessage id="footer.contact" /></Link></li>
                <li>
                  <Link to="/admin" className="inline-flex items-center gap-1 text-paper/85 transition hover:text-mango-light">
                    <MdAdminPanelSettings />
                    <FormattedMessage id="footer.admin" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social Media Accounts Info */}
            {socialAccounts.length > 0 && (
              <div>
                <h4 className="mb-4 font-display text-lg text-mango-light">Follow Us</h4>
                <div className="space-y-2 text-sm text-paper/80">
                  {socialAccounts.map((account) => (
                    <div key={account.platform} className="flex items-center gap-2">
                      <span className="text-lagoon-light">{platformIcons[account.platform]}</span>
                      <a
                        href={account.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="capitalize text-paper transition-colors hover:text-mango-light"
                      >
                        {account.platform} @{account.username}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 border-t border-white/15 pt-6 text-sm text-paper/65">
            <FormattedMessage id="footer.copyright" values={{ year: new Date().getFullYear() }} />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
