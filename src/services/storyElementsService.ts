import { apiGet, apiPut } from './apiClient';
import { JourneyLocale } from './introStoryService';
import { getAdminPassword } from './authStore';

export type StoryElementType = 'title' | 'paragraph' | 'picture' | 'video' | 'cta';
export type VideoOrientation = 'vertical' | 'horizontal';
export type VideoSource = 'vimeo' | 'tiktok' | 'youtube' | 'custom';
export type CTAButtonVariant = 'primary' | 'secondary' | 'outline';

export interface CTAButton {
  id: string;
  text: string;
  link: string;
  variant: CTAButtonVariant;
}

export interface StoryElement {
  id: string;
  type: StoryElementType;
  order: number;
  content: {
    title?: string;
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    videoOrientation?: VideoOrientation;
    videoSource?: VideoSource;
    emoji?: string;
    description?: string;
    buttons?: CTAButton[];
  };
}

export interface StoryElementsData {
  storyTitle: string;
  storyTagline: string;
  elements: StoryElement[];
}

const unwrapRecord = (payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const candidate = payload as { record?: unknown };
  const record = candidate.record;

  if (record && typeof record === 'object' && 'record' in record) {
    return (record as { record?: unknown }).record;
  }

  return record ?? payload;
};

const isStoryElementsData = (input: unknown): input is StoryElementsData => {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const data = input as Partial<StoryElementsData>;
  return (
    typeof data.storyTitle === 'string' &&
    typeof data.storyTagline === 'string' &&
    Array.isArray(data.elements)
  );
};

/**
 * Stored blocks use two spellings for the same two types.
 *
 * The seed data — and therefore every site that has ever been deployed from it
 * — writes `image` and `text`, while the type in this file says `picture` and
 * `paragraph`. The public renderer accepts both (introStoryService switches on
 * either), but the admin panel switched on the canonical names only, so a real
 * page of twenty blocks arrived in the editor with the images and the text
 * blocks unrecognised: no preview, no editor, and in the rewritten panel a
 * crash on the missing type entry.
 *
 * Normalising on the way in means the editor only ever sees the two canonical
 * names, and what it saves back is a spelling the public side already reads.
 */
const TYPE_ALIASES: Record<string, StoryElementType> = {
  image: 'picture',
  picture: 'picture',
  text: 'paragraph',
  paragraph: 'paragraph',
  title: 'title',
  video: 'video',
  cta: 'cta',
};

const normalizeElements = (data: StoryElementsData): StoryElementsData => ({
  ...data,
  elements: (data.elements || []).map((element, index) => ({
    ...element,
    id: element.id || `element-${index}`,
    order: typeof element.order === 'number' ? element.order : index,
    // An unknown type would otherwise reach the panel and be looked up in a
    // table that has no entry for it.
    type: TYPE_ALIASES[String(element.type)] ?? 'paragraph',
    content: element.content ?? {},
  })),
});

export const getStoryElements = async (locale: JourneyLocale): Promise<StoryElementsData | null> => {
  try {
    const response = await apiGet<unknown>('story-elements', { locale });
    const payload = unwrapRecord(response);
    return isStoryElementsData(payload) ? normalizeElements(payload) : null;
  } catch (error) {
    console.warn(`Failed to fetch ${locale} story elements:`, error);
    return null;
  }
};

export const saveStoryElements = async (
  data: StoryElementsData,
  locale: JourneyLocale
): Promise<boolean> => {
  try {
    await apiPut('story-elements', data, { locale });
    return true;
  } catch (error) {
    console.error(`Failed to save ${locale} story elements:`, error);
    return false;
  }
};

export const createNewElement = (type: StoryElementType, order: number): StoryElement => ({
  // Date.now() alone collides when two blocks are added inside one millisecond,
  // which React then renders with duplicate keys.
  id: `element-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  order,
  content: {},
});

export const uploadImage = async (file: File, onProgress?: (percent: number) => void): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'story');

  const adminPassword = getAdminPassword() ?? '';

  try {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    return await new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (data.secure_url) {
            resolve(data.secure_url);
          } else {
            reject(new Error('No secure_url in response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload request failed'));

      xhr.open('POST', '/api/upload');
      xhr.setRequestHeader('X-Admin-Password', adminPassword);
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Image upload failed:', error);
    throw error;
  }
};
