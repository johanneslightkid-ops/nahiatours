import React, { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaTripadvisor, FaTwitter, FaYoutube } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import { brandNameStyle } from '../../lib/brandDisplay';
import { SITE_DEFAULTS } from '../../config/siteDefaults';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';

/**
 * The logo, with the name beside it as the admin set it (Marca → "Nombre junto
 * al logo"): in capitals, exactly as entered, or hidden — the logo alone.
 * Without a logo uploaded, the name is the logo.
 */
export const BrandLogo: React.FC<{ tone?: 'colour' | 'white'; className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  tone = 'colour',
  className = '',
  size = 'md',
}) => {
  const { brandSettings } = useBrand();
  const icon = brandSettings.brandicon;
  const name = brandSettings.brandName.trim();
  const style = brandNameStyle(brandSettings);
  const withName = Boolean(name) && (style !== 'hidden' || !icon);
  const height = size === 'lg' ? 'h-14' : size === 'sm' ? 'h-9' : 'h-11';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {icon && <img src={icon} alt={withName ? '' : name} className={`${height} w-auto select-none`} draggable={false} />}
      {withName && (
        <span
          className={`max-w-[12rem] font-display text-lg leading-none ${tone === 'white' ? 'text-white' : 'text-ink'}`}
          // .font-display sets capitals for every headline; "as entered" overrides it here.
          style={{ textTransform: style === 'asis' ? 'none' : 'uppercase' }}
        >
          {name}
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

/** Where the company is, used until site-pages has loaded. */
export const CONTACT = {
  address: 'Punta Cana, Dominican Republic',
};

/** The footer's partner sites: Admin › Marca's, else the site's own; empty means none. */
export const usePartners = () => {
  const { brandSettings } = useBrand();
  const fallback = SITE_DEFAULTS.partners;
  return {
    hotels: brandSettings.partnerHotelsUrl ?? fallback?.hotels ?? '',
    flights: brandSettings.partnerFlightsUrl ?? fallback?.flights ?? '',
  };
};
