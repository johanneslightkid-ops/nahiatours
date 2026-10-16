import introStoryEn from '../data/introStory.en.json';
import introStoryEs from '../data/introStory.es.json';
import { getStoryElements, StoryElementsData, StoryElement } from './storyElementsService';
import { apiGet } from './apiClient';

export type JourneyLocale = 'en' | 'es';

export interface AdventureStory {
  id: string;
  title: string;
  emoji: string;
  duration: string;
  vibe: string;
  description: string;
  highlights: string[];
  bestFor: string;
  vimeoUrl: string;
  imageUrl: string;
  mood: string;
}

export interface JourneySection {
  id: string;
  title: string;
  emoji: string;
  timeframe?: string;
  description: string;
  narrative?: string;
  imageUrl?: string;
  vimeoUrl?: string;
  mood?: string;
  adventures?: AdventureStory[];
}

export interface StoryData {
  storyTitle: string;
  storyTagline: string;
  sections: JourneySection[];
  callToActions?: Array<{
    text: string;
    target: string;
    action: string;
  }>;
}

const fallbackStoryByLocale: Record<JourneyLocale, StoryData> = {
  en: introStoryEn as StoryData,
  es: introStoryEs as StoryData,
};

const unwrapJsonBinRecord = (payload: unknown): unknown => {
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

const isStoryData = (input: unknown): input is StoryData => {
  if (!input || typeof input !== 'object') {
    return false;
  }

  const story = input as Partial<StoryData>;
  return (
    typeof story.storyTitle === 'string' &&
    typeof story.storyTagline === 'string' &&
    Array.isArray(story.sections) &&
    story.sections.every(
      (section) =>
        section &&
        typeof section === 'object' &&
        typeof (section as JourneySection).id === 'string' &&
        typeof (section as JourneySection).title === 'string' &&
        typeof (section as JourneySection).description === 'string'
    )
  );
};

export const getFallbackIntroStory = (locale: JourneyLocale): StoryData => fallbackStoryByLocale[locale];

export const getIntroStory = async (locale: JourneyLocale): Promise<StoryData> => {
  const fallbackStory = getFallbackIntroStory(locale);

  try {
    const data = await apiGet<unknown>('intro-story', { locale });
    const remoteStory = unwrapJsonBinRecord(data);
    return isStoryData(remoteStory) ? remoteStory : fallbackStory;
  } catch (error) {
    console.error(`Failed to fetch ${locale} intro journey:`, error);
    return fallbackStory;
  }
};

// New helper: try to resolve story from the Story Elements JSONBin (preferred)
export const getIntroStoryPreferred = async (locale: JourneyLocale): Promise<StoryData> => {
  // Try story elements first
  try {
    const elementsData: StoryElementsData | null = await getStoryElements(locale);
    if (elementsData) {
      // Convert StoryElementsData -> StoryData by grouping related elements into sections
      const sections: JourneySection[] = [];
      let currentSection: JourneySection | null = null;

      const startNewSection = (id: string) => {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          id,
          title: '',
          emoji: '',
          description: '',
          narrative: '',
          imageUrl: undefined,
          vimeoUrl: undefined,
          mood: '',
        };
      };

      (elementsData.elements || []).forEach((el: any) => {
        if (el.type === 'cta') return; // CTA is handled separately

        // Start a new section if:
        // 1. We don't have one yet
        // 2. We encounter a 'title' and the current section already has a title
        // 3. We encounter an image and the current section already has an image
        if (!currentSection) {
          startNewSection(el.id);
        } else if (el.type === 'title' && currentSection.title) {
          startNewSection(el.id);
        } else if ((el.type === 'picture' || el.type === 'image') && currentSection.imageUrl) {
          startNewSection(el.id);
        }

        switch (el.type) {
          case 'title':
            currentSection!.title = el.content.title || '';
            currentSection!.emoji = el.content.emoji || '';
            break;
          case 'paragraph':
          case 'text':
            if (currentSection!.description) {
              currentSection!.description += '\n\n' + (el.content.text || el.content.description || '');
            } else {
              currentSection!.description = el.content.text || el.content.description || '';
            }
            break;
          case 'picture':
          case 'image':
            currentSection!.imageUrl = el.content.imageUrl;
            break;
          case 'video':
            currentSection!.vimeoUrl = el.content.videoUrl;
            break;
        }
      });

      if (currentSection) {
        sections.push(currentSection);
      }

      const callToActions = (elementsData.elements || [])
        .filter((e) => e.type === 'cta')
        .flatMap((cta) => (cta.content.buttons || []).map((b) => ({ text: b.text, target: b.link, action: 'link' })));

      const story: StoryData = {
        storyTitle: elementsData.storyTitle || '',
        storyTagline: elementsData.storyTagline || '',
        sections,
        callToActions: callToActions.length ? callToActions : undefined,
      };

      return story;
    }
  } catch (e) {
    console.warn('Story elements not available, falling back to legacy journey.', e);
  }

  // Fallback to legacy journey endpoint
  return getIntroStory(locale);
};
