import React, { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaTripadvisor, FaTwitter, FaYoutube } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { showsBrandName } from '../../lib/brandDisplay';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';

/** The company's own mark, as it ships with the site. */
export const DEFAULT_MARK = '/imgs/edt/brand/mark.webp';
const WIDE = '/imgs/edt/brand/logo-wide.webp';
const WIDE_WHITE = '/imgs/edt/brand/logo-wide-white.webp';

/**
 * The logo. With the company's own mark it is their full horizontal logo —
 * swoosh and wordmark — in colour, or in white on a photograph. An operator
 * who uploads a different icon gets that icon with the brand name beside it;
 * hiding the name in the admin leaves the icon alone.
 */
export const BrandLogo: React.FC<{ tone?: 'colour' | 'white'; className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  tone = 'colour',
  className = '',
  size = 'md',
}) => {
  const { brandSettings } = useBrand();
  const icon = brandSettings.brandicon || DEFAULT_MARK;
  const own = icon === DEFAULT_MARK;
  const withName = showsBrandName(brandSettings);
  const height = size === 'lg' ? 'h-14' : size === 'sm' ? 'h-9' : 'h-11';

  if (own && withName) {
    return (
      <img
        src={tone === 'white' ? WIDE_WHITE : WIDE}
        alt={brandSettings.brandName}
        className={`${height} w-auto select-none ${className}`}
        draggable={false}
      />
    );
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img src={icon} alt={withName ? '' : brandSettings.brandName} className={`${height} w-auto select-none`} draggable={false} />
      {withName && (
        <span className={`max-w-[12rem] font-display text-lg uppercase leading-none ${tone === 'white' ? 'text-white' : 'text-ink'}`}>
          {brandSettings.brandName}
        </span>
      )}
    </span>
  );
};

export const SOCIAL_ICONS: Record<string, IconType> = {
  instagram: FaInstagram,
  facebook: FaFacebookF,
  tiktok: FaTiktok,
  tripadvisor: FaTripadvisor,
  youtube: FaYoutube,
  twitter: FaTwitter,
  linkedin: FaLinkedinIn,
};

export const SOCIAL_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  tripadvisor: 'Tripadvisor',
  youtube: 'YouTube',
  twitter: 'X',
  linkedin: 'LinkedIn',
};

let socialCache: Promise<SocialMediaAccount[]> | null = null;

/** The social accounts switched on in the admin. */
export const useSocialAccounts = (): SocialMediaAccount[] => {
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  useEffect(() => {
    let live = true;
    socialCache ??= getSocialMediaData().then((data) => data.accounts.filter((account) => account.enabled && account.url));
    socialCache.then((list) => live && setAccounts(list));
    return () => {
      live = false;
    };
  }, []);
  return accounts;
};

export const SocialIcons: React.FC<{ className?: string; itemClassName?: string }> = ({ className = '', itemClassName = '' }) => {
  const accounts = useSocialAccounts();
  if (!accounts.length) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {accounts.map((account) => {
        const Icon = SOCIAL_ICONS[account.platform] ?? FaInstagram;
        return (
          <a
            key={account.platform + account.url}
            href={account.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={SOCIAL_NAMES[account.platform] ?? account.platform}
            title={SOCIAL_NAMES[account.platform] ?? account.platform}
            className={itemClassName}
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
};

/** Contact details the site always knows, used until site-pages has loaded. */
export const CONTACT = {
  email: 'booking@exclusivedominicantours.com',
  address: 'Punta Cana, Dominican Republic',
};

export const PARTNERS = {
  hotels: 'https://exclusivehotelpuntacana.com/',
  flights: 'https://exclusivehotelpuntacana.com/flight-offers/',
};
