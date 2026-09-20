import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { MdAdminPanelSettings } from 'react-icons/md';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';
import { PalmTree, Sailboat, Starfish, WaveBand, TainoBand, SeaFan } from '../ui/Illustrations';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <FaInstagram className="w-5 h-5" />,
  tiktok: <FaTiktok className="w-5 h-5" />,
  facebook: <FaFacebook className="w-5 h-5" />,
  youtube: <FaYoutube className="w-5 h-5" />,
  twitter: <FaTwitter className="w-5 h-5" />,
  linkedin: <FaLinkedin className="w-5 h-5" />
};

/**
 * The footer closes the page at dusk.
 *
 * The last band of the painting: the swell handing over to deep water, palms
 * on the horizon gone to silhouette, and the light off the sea reduced to the
 * warm edge the sun leaves behind. Everything here is a value darker than the
 * page above it, which is what makes it read as an ending rather than as
 * another section.
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
      <WaveBand tone="sky" className="block h-16 w-full sm:h-24" />

      <div
        className="relative overflow-hidden pt-20 pb-12 text-canvas"
        style={{
          background:
            'linear-gradient(175deg, #14495F 0%, #0E3B52 42%, #122E33 100%)',
        }}
      >
        {/* The last of the light, low on the left. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 50% at 18% 108%, rgba(242,163,43,0.26), transparent 70%), radial-gradient(50% 40% at 88% -8%, rgba(47,182,164,0.2), transparent 70%)',
          }}
        />
        {/* Horizon scenery */}
        <PalmTree className="pointer-events-none absolute -left-6 bottom-0 h-56 w-40 opacity-25 brightness-50" />
        <PalmTree className="pointer-events-none absolute -right-8 bottom-0 h-64 w-44 -scale-x-100 opacity-20 brightness-50" />
        <Sailboat className="animate-swell-soft pointer-events-none absolute right-[18%] top-10 hidden h-24 w-24 opacity-45 lg:block" />
        <Starfish className="pointer-events-none absolute left-[46%] bottom-6 hidden h-10 w-10 rotate-12 opacity-30 md:block" />
        <SeaFan className="pointer-events-none absolute bottom-0 left-[22%] hidden h-28 w-24 opacity-20 lg:block" />

        <div className="section-shell relative z-10">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-[rgba(255,206,122,0.5)] bg-gradient-to-br from-canvas-lift to-mango-light shadow-oil-sm">
                  {brandSettings.brandicon ? (
                    <img src={brandSettings.brandicon} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <img src="/competitor-logo.svg" alt="Logo" className="h-10 w-10" />
                  )}
                </div>
                <h3 className="font-display text-[1.7rem] font-bold text-canvas-lift">{brandSettings.brandName}</h3>
              </div>
              <p className="max-w-measure leading-relaxed text-canvas/80">
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
                      className="grid h-12 w-12 place-items-center rounded-full border border-[rgba(255,206,122,0.4)] bg-canvas-lift/10 text-canvas transition duration-300 hover:-translate-y-1 hover:border-[rgba(255,206,122,0.8)] hover:bg-canvas-lift/20 hover:text-mango-light"
                      title={`Follow on ${account.platform}`}
                    >
                      {platformIcons[account.platform]}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-5 font-display text-xl font-bold italic text-mango-light">
                <FormattedMessage id="footer.quickLinks" />
              </h4>
              <ul className="space-y-3">
                <li><Link to="/#top" className="text-canvas/80 transition hover:text-mango-light"><FormattedMessage id="footer.home" /></Link></li>
                <li><Link to="/tours#top" className="text-canvas/80 transition hover:text-mango-light"><FormattedMessage id="footer.tours" /></Link></li>
                <li><Link to="/transport#top" className="text-canvas/80 transition hover:text-mango-light"><FormattedMessage id="footer.transport" defaultMessage="Transport" /></Link></li>
                <li><Link to="/contact#top" className="text-canvas/80 transition hover:text-mango-light"><FormattedMessage id="footer.contact" /></Link></li>
                <li>
                  <Link to="/admin" className="inline-flex items-center gap-1.5 text-canvas/80 transition hover:text-mango-light">
                    <MdAdminPanelSettings />
                    <FormattedMessage id="footer.admin" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social Media Accounts Info */}
            {socialAccounts.length > 0 && (
              <div>
                <h4 className="mb-5 font-display text-xl font-bold italic text-mango-light">Follow Us</h4>
                <div className="space-y-2.5 text-sm text-canvas/80">
                  {socialAccounts.map((account) => (
                    <div key={account.platform} className="flex items-center gap-2">
                      <span className="text-lagoon-light">{platformIcons[account.platform]}</span>
                      <a
                        href={account.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="capitalize text-canvas/80 transition-colors hover:text-mango-light"
                      >
                        {account.platform} @{account.username}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* The rim pattern off a piece of Taino pottery, closing the page
              the way it closes a vessel. */}
          {/* Lifted rather than inverted: inverting would swing the ochre to blue,
              and the band has to read as the warm rim it is. */}
          <TainoBand tone="lagoon" className="mt-14 h-6 w-full opacity-70 brightness-[2.6]" />

          <div className="mt-6 text-sm text-canvas/65">
            <FormattedMessage id="footer.copyright" values={{ year: new Date().getFullYear() }} />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
