import React, { useState, useEffect } from 'react';
import { localeText } from '../../lib/localeText';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { MdAdminPanelSettings } from 'react-icons/md';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube, FaTwitter, FaLinkedin, FaWhatsapp } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { useI18n } from '../../contexts/I18nContext';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';
import { generateWhatsAppMessage } from '../../utils/whatsapp';

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <FaInstagram className="h-5 w-5" />,
  tiktok: <FaTiktok className="h-5 w-5" />,
  facebook: <FaFacebook className="h-5 w-5" />,
  youtube: <FaYoutube className="h-5 w-5" />,
  twitter: <FaTwitter className="h-5 w-5" />,
  linkedin: <FaLinkedin className="h-5 w-5" />,
};

/** Colonial housefronts at night, windows lit, for the top of the footer. */
const NightStreet: React.FC = () => {
  const houses = [
    { w: 120, h: 92, wall: '#E5482F' },
    { w: 96, h: 112, wall: '#3FAFC9' },
    { w: 130, h: 84, wall: '#F5B921' },
    { w: 104, h: 104, wall: '#BF3A8F' },
    { w: 124, h: 90, wall: '#4F9136' },
    { w: 100, h: 116, wall: '#EE7A3C' },
    { w: 126, h: 88, wall: '#2F4FD1' },
    { w: 110, h: 100, wall: '#E5482F' },
    { w: 120, h: 94, wall: '#3FAFC9' },
    { w: 100, h: 108, wall: '#F5B921' },
  ];
  let x = 0;
  return (
    <svg className="block h-28 w-full sm:h-36" viewBox="0 0 1130 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {houses.map((house, i) => {
        const left = x;
        x += house.w;
        const top = 130 - house.h;
        return (
          <g key={i}>
            <rect x={left} y={top} width={house.w} height={house.h} fill={house.wall} stroke="#1D2346" strokeWidth={4} />
            <rect x={left} y={top - 8} width={house.w} height={10} fill="#FFFBF3" stroke="#1D2346" strokeWidth={3} />
            {[0, 1].map((col) => (
              <g key={col}>
                <rect x={left + 16 + col * (house.w / 2)} y={top + 22} width={house.w / 2 - 32} height={34} rx={14} fill="#FFDD6E" stroke="#1D2346" strokeWidth={3} className="night-window" style={{ animationDelay: `${(i * 2 + col) * 0.7}s` }} />
                <path d={`M${left + 16 + col * (house.w / 2) + (house.w / 2 - 32) / 2} ${top + 22} L${left + 16 + col * (house.w / 2) + (house.w / 2 - 32) / 2} ${top + 56}`} stroke="#1D2346" strokeWidth={2} />
              </g>
            ))}
            <rect x={left + house.w / 2 - 12} y={130 - 38} width={24} height={38} rx={10} fill="#1D2346" />
          </g>
        );
      })}
    </svg>
  );
};

/**
 * The gallery closes at night, on the Malecón: the street of painted houses
 * with their windows lit, the moon over the sea, and the names of the
 * painters this design is in debt to.
 */
const Footer = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const say = (texts: { en: string; es: string; de: string; fr: string }) => localeText(locale, texts);
  const [socialAccounts, setSocialAccounts] = useState<SocialMediaAccount[]>([]);

  useEffect(() => {
    getSocialMediaData()
      .then((data) => setSocialAccounts(data.accounts.filter((account: SocialMediaAccount) => account.enabled)))
      .catch(() => setSocialAccounts([]));
  }, []);

  const linkClass = 'font-semibold text-paper/90 no-underline transition-colors hover:text-mango-light';
  const whatsapp = generateWhatsAppMessage(
    brandSettings.phoneNumber,
    say({ en: 'Hello! A question about your tours:', es: '¡Hola! Una pregunta sobre sus tours:', de: 'Hallo! Eine Frage zu euren Touren:', fr: 'Bonjour ! Une question sur vos excursions :' })
  );

  return (
    <footer className="relative mt-auto">
      <div className="relative bg-[linear-gradient(180deg,#F7EFE1_0%,#F7EFE1_40%,#141A3C_40%)]">
        <NightStreet />
      </div>

      <div className="relative overflow-hidden border-t-[4px] border-ink bg-[linear-gradient(180deg,#141A3C_0%,#1A2F94_100%)] pb-16 pt-14 text-paper">
        <svg className="pointer-events-none absolute right-[6%] top-10 h-20 w-20 opacity-90" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M62 8 C36 12 20 36 24 60 C28 84 52 98 76 92 C56 86 42 68 44 48 C46 28 58 14 62 8 Z" fill="#FFF3B0" stroke="#FFDD6E" strokeWidth={3} />
        </svg>

        <div className="section-shell relative z-10">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-full border-[3px] border-mango bg-paper">
                  <img src={brandSettings.brandicon || '/brand/willy-tours-poster.jpg'} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                </div>
                <div>
                  <h3 className="font-display text-2xl text-paper">{brandSettings.brandName}</h3>
                  {brandSettings.contactName && <p className="hand-note !text-mango-light">{brandSettings.contactName}</p>}
                </div>
              </div>
              <p className="mb-4 max-w-sm text-paper/80">
                <FormattedMessage id="footer.description" />
              </p>
              {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border-[3px] border-mango bg-jungle px-4 py-2 font-bold text-paper no-underline">
                  <FaWhatsapp /> {brandSettings.phoneNumber}
                </a>
              )}
              {socialAccounts.length > 0 && (
                <div className="mt-5 flex gap-3">
                  {socialAccounts.map((account) => (
                    <a
                      key={account.platform}
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={account.platform}
                      className="grid h-10 w-10 place-items-center rounded-full border-2 border-paper/40 text-paper transition-colors hover:border-mango hover:text-mango-light"
                    >
                      {platformIcons[account.platform] ?? account.platform.slice(0, 2)}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-4 font-display text-xl text-mango-light">
                <FormattedMessage id="footer.quickLinks" />
              </h4>
              <ul className="space-y-2">
                <li><Link to="/#top" className={linkClass}><FormattedMessage id="footer.home" /></Link></li>
                <li><Link to="/tours#top" className={linkClass}><FormattedMessage id="footer.tours" /></Link></li>
                <li><Link to="/transport#top" className={linkClass}><FormattedMessage id="footer.transport" defaultMessage="Transport" /></Link></li>
                <li><Link to="/plan#top" className={linkClass}><FormattedMessage id="nav.plan" defaultMessage="Plan my day" /></Link></li>
                <li><Link to="/cart#top" className={linkClass}><FormattedMessage id="nav.cart" defaultMessage="Cart" /></Link></li>
                <li><Link to="/contact#top" className={linkClass}><FormattedMessage id="footer.contact" /></Link></li>
                <li>
                  <Link to="/admin" className={`inline-flex items-center gap-1 ${linkClass}`}>
                    <MdAdminPanelSettings /> <FormattedMessage id="footer.admin" />
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-display text-xl text-mango-light">{say({ en: 'In the spirit of', es: 'En el espíritu de', de: 'Im Geist von', fr: 'Dans l’esprit de' })}</h4>
              <p className="text-sm leading-6 text-paper/75">
                {say({
                  en: 'The colours of this site are a thank-you to the Dominican painters — Cándido Bidó’s suns and skies, Ada Balcácer, Jaime Colson — and to the painted shutters of the Zona Colonial. A homage, not a copy.',
                  es: 'Los colores de esta página son un agradecimiento a los pintores dominicanos — los soles y cielos de Cándido Bidó, Ada Balcácer, Jaime Colson — y a las persianas pintadas de la Zona Colonial. Un homenaje, no una copia.',
                  de: 'Die Farben dieser Seite sind ein Dank an die dominikanischen Maler — Cándido Bidós Sonnen und Himmel, Ada Balcácer, Jaime Colson — und an die bemalten Fensterläden der Zona Colonial. Eine Hommage, keine Kopie.',
                  fr: 'Les couleurs de ce site sont un merci aux peintres dominicains — les soleils et les ciels de Cándido Bidó, Ada Balcácer, Jaime Colson — et aux persiennes peintes de la Zona Colonial. Un hommage, pas une copie.',
                })}
              </p>
            </div>
          </div>

          <div className="mt-12 border-t border-paper/20 pt-6 text-center text-sm text-paper/60">
            <FormattedMessage id="footer.copyright" values={{ year: new Date().getFullYear() }} />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
