import { apiGet, apiPut } from './apiClient';
import { getAdminPassword } from './authStore';

export interface BrandSettings {
  brandName: string;
  phoneNumber: string;
  paypalMeLink: string;
  verifoneLink: string;
  brandicon: string;
}

const defaultBrandSettings: BrandSettings = {
  brandName: 'Tours',
  phoneNumber: '+1 (809) 555-0123',
  paypalMeLink: 'https://www.paypal.com/paypalme/carlostours',
  verifoneLink: '',
  brandicon: '',
};

const normalizeBrandSettings = (input: Partial<BrandSettings> | null | undefined): BrandSettings => ({
  brandName:
    typeof input?.brandName === 'string' && input.brandName.trim()
      ? input.brandName
      : defaultBrandSettings.brandName,
  phoneNumber:
    typeof input?.phoneNumber === 'string' && input.phoneNumber.trim()
      ? input.phoneNumber
      : defaultBrandSettings.phoneNumber,
  paypalMeLink:
    typeof input?.paypalMeLink === 'string' && input.paypalMeLink.trim()
      ? input.paypalMeLink
      : defaultBrandSettings.paypalMeLink,
  verifoneLink:
    typeof input?.verifoneLink === 'string' && input.verifoneLink.trim()
      ? input.verifoneLink
      : defaultBrandSettings.verifoneLink,
  brandicon:
    typeof input?.brandicon === 'string' && input.brandicon.trim()
      ? input.brandicon
      : defaultBrandSettings.brandicon,
});

export const getBrandSettings = async (): Promise<BrandSettings> => {
  try {
    const data = await apiGet<unknown>('brand');
    const brandData = (data as Record<string, unknown>).record ?? data;
    return normalizeBrandSettings(brandData as Partial<BrandSettings>);
  } catch (error) {
    console.error('Failed to fetch brand settings:', error);
    return defaultBrandSettings;
  }
};

export const saveBrandSettings = async (settings: BrandSettings): Promise<void> => {
  try {
    await apiPut<unknown>('brand', settings);
  } catch (error) {
    console.error('Failed to save brand settings:', error);
  }
};

export const uploadBrandIcon = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'brand-icons');

  const adminPassword = getAdminPassword() ?? '';

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'X-Admin-Password': adminPassword,
      },
      body: formData,
    });
    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('Cloudinary upload failed');
    }
    return data.secure_url;
  } catch (error) {
    console.error('Brand icon upload failed:', error);
    return '';
  }
};
