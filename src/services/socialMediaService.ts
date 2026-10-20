import { apiGet, apiPut } from './apiClient';

// Social media platform types
export interface SocialMediaAccount {
  platform: 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'twitter' | 'linkedin' | 'tripadvisor';
  username: string;
  url: string;
  enabled: boolean;
}

export interface SocialMediaVideo {
  id: string;
  platform: 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'twitter';
  title: string;
  url: string;
  embedUrl?: string;
  description: string;
  createdAt: string;
}

const defaultSocialMediaData = {
  accounts: [] as SocialMediaAccount[],
  videos: [] as SocialMediaVideo[],
};

const normalizeSocialMediaData = (input: unknown) => {
  const data = (input as Record<string, unknown>)?.record ?? input;
  return {
    accounts: Array.isArray((data as Record<string, unknown>).accounts)
      ? ((data as Record<string, unknown>).accounts as SocialMediaAccount[])
      : defaultSocialMediaData.accounts,
    videos: Array.isArray((data as Record<string, unknown>).videos)
      ? ((data as Record<string, unknown>).videos as SocialMediaVideo[])
      : defaultSocialMediaData.videos,
  };
};

export const getSocialMediaData = async () => {
  try {
    const data = await apiGet<unknown>('social-media');
    return normalizeSocialMediaData(data);
  } catch (error) {
    console.warn('Failed to fetch social media data:', error);
    return defaultSocialMediaData;
  }
};

export const saveSocialMediaData = async (data: { accounts: SocialMediaAccount[]; videos: SocialMediaVideo[] }) => {
  try {
    await apiPut<unknown>('social-media', data);
    return data;
  } catch (error) {
    console.error('Error saving social media data:', error);
    throw error;
  }
};

export const addSocialMediaAccount = async (account: SocialMediaAccount) => {
  const data = await getSocialMediaData();
  const existingIndex = data.accounts.findIndex((a: SocialMediaAccount) => a.platform === account.platform);

  if (existingIndex >= 0) {
    data.accounts[existingIndex] = account;
  } else {
    data.accounts.push(account);
  }

  return saveSocialMediaData(data);
};

export const removeSocialMediaAccount = async (platform: string) => {
  const data = await getSocialMediaData();
  data.accounts = data.accounts.filter((a: SocialMediaAccount) => a.platform !== platform);
  return saveSocialMediaData(data);
};

export const addSocialMediaVideo = async (video: SocialMediaVideo) => {
  const data = await getSocialMediaData();
  data.videos.push(video);
  return saveSocialMediaData(data);
};

export const removeSocialMediaVideo = async (videoId: string) => {
  const data = await getSocialMediaData();
  data.videos = data.videos.filter((v: SocialMediaVideo) => v.id !== videoId);
  return saveSocialMediaData(data);
};

export const getVideosByPlatform = async (platform: string) => {
  const data = await getSocialMediaData();
  return data.videos.filter((v: SocialMediaVideo) => v.platform === platform);
};

export const updateSocialMediaVideo = async (videoId: string, updates: Partial<SocialMediaVideo>) => {
  const data = await getSocialMediaData();
  const videoIndex = data.videos.findIndex((v: SocialMediaVideo) => v.id === videoId);

  if (videoIndex >= 0) {
    data.videos[videoIndex] = { ...data.videos[videoIndex], ...updates };
  }

  return saveSocialMediaData(data);
};
