import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { MdAdminPanelSettings } from 'react-icons/md';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaTwitter, FaLinkedin } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';
import { PalmTree, Sailboat, Starfish, WaveBand, Splatter, Barcode, Anchor } from '../ui/Illustrations';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <FaInstagram className="w-5 h-5" />,
  tiktok: <FaTiktok className="w-5 h-5" />,
  facebook: <FaFacebook className="w-5 h-5" />,
  youtube: <FaYoutube className="w-5 h-5" />,
  twitter: <FaTwitter className="w-5 h-5" />,
  linkedin: <FaLinkedin className="w-5 h-5" />
};

/**
 * The footer is the bottom of the sheet: a torn strip of ink, then the black
 * plate itself — linework showing faintly through, a barcode across the foot,
 * and the copyright set as a filing line. It is the darkest thing on the site
 * on purpose, so the page ends on the ink rather than trailing off.
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
      <WaveBand tone="blood" className="block h-10 w-full sm:h-14" />

      <div className="relative overflow-hidden border-t-[3px] border-ink bg-ink pt-16 pb-10 text-paper">
        {/* Linework showing through the black plate. */}
        <PalmTree className="pointer-events-none absolute -left-8 bottom-0 h-56 w-40 opacity-20" />
        <PalmTree className="pointer-events-none absolute -right-10 bottom-0 h-64 w-44 -scale-x-100 opacity-[0.14]" />
        <Sailboat className="animate-bob pointer-events-none absolute right-[18%] top-8 hidden h-20 w-20 opacity-25 lg:block" />
        <Starfish className="pointer-events-none absolute left-[46%] bottom-8 hidden h-10 w-10 rotate-12 opacity-25 md:block" />
        <Splatter tone="blood" variant={1} className="pointer-events-none absolute -right-16 -top-20 h-96 w-96 opacity-[0.16]" />
        <Anchor tone="blood" className="pointer-events-none absolute left-[12%] top-10 hidden h-24 w-20 opacity-[0.18] xl:block" />

        <div className="section-shell relative z-10">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="mb-6 flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border-[3px] border-paper bg-paper shadow-[4px_4px_0_0_#C1121F]">
                  {brandSettings.brandicon ? (
                    <img src={brandSettings.brandicon} alt="Logo" className="photo-pop h-full w-full object-cover" />
                  ) : (
                    <img src="/competitor-logo.svg" alt="Logo" className="h-10 w-10" />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-2xl text-paper">{brandSettings.brandName}</h3>
                  <span className="tp-filenum text-paper/45">Punta Cana · DO · No. 001</span>
                </div>
              </div>
              <p className="max-w-md font-medium text-paper/80">
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
                      className="grid h-12 w-12 place-items-center border-2 border-paper/70 text-paper transition hover:border-mango hover:bg-mango hover:text-paper"
                      title={`Follow on ${account.platform}`}
                    >
                      {platformIcons[account.platform]}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-4 font-condensed text-sm uppercase tracking-[0.2em] text-mango-light">
                <span className="mb-2 block h-[3px] w-10 bg-mango" />
                <FormattedMessage id="footer.quickLinks" />
              </h4>
              <ul className="space-y-2 font-condensed text-sm uppercase tracking-[0.08em]">
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
                <h4 className="mb-4 font-condensed text-sm uppercase tracking-[0.2em] text-mango-light">
                  <span className="mb-2 block h-[3px] w-10 bg-mango" />
                  Follow Us
                </h4>
                <div className="space-y-2 text-sm font-medium text-paper/80">
                  {socialAccounts.map((account) => (
                    <div key={account.platform} className="flex items-center gap-2">
                      <span className="text-mango-light">{platformIcons[account.platform]}</span>
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

          <div className="mt-12">
            <Barcode value={brandSettings.brandName || 'LDVIP'} tone="bone" className="h-7 w-full opacity-30" />
            <div className="mt-4 flex flex-col gap-2 border-t-2 border-paper/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="tp-filenum text-paper/55">
                <FormattedMessage id="footer.copyright" values={{ year: new Date().getFullYear() }} />
              </p>
              <p className="tp-filenum text-paper/35">Ed. LD VIP · Black &amp; Red · Printed in Bávaro</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
