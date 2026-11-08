import { apiGet, apiPut } from './apiClient';
import { BLOG_IMAGE_TAGS } from '../lib/blogImageTags';

export interface PoolImage {
  id: string;
  url: string;
  title: string;
  alt: string;
  categories: string[];
  excursions: string[];
  audiences: string[];
  ageGroups: string[];
  travelStyles: string[];
  hashtags: string[];
  createdAt: string;
}

export interface ImageCatalog {
  images: PoolImage[];
}

export interface ImagePoolPack {
  id: string;
  label: string;
  description: string;
  categories: string[];
  excursions: string[];
  audiences: string[];
  ageGroups: string[];
  travelStyles: string[];
}

export { BLOG_IMAGE_TAGS };

export const IMAGE_POOL_PACKS: ImagePoolPack[] = [
  {
    id: 'saona-family',
    label: 'Saona · familias e isla',
    description: 'Playa, barco y escenas familiares de Saona.',
    categories: ['island', 'beach', 'family'],
    excursions: ['Saona Island'],
    audiences: ['us-family-beach', 'latam-family-classic', 'france-family-island', 'canada-family-island'],
    ageGroups: ['all-ages'],
    travelStyles: ['standard', 'relaxed'],
  },
  {
    id: 'saona-couples',
    label: 'Saona · parejas',
    description: 'Imágenes de isla y navegación para artículos de pareja.',
    categories: ['island', 'beach', 'couples'],
    excursions: ['Saona Island'],
    audiences: ['us-couple-island', 'latam-couple-beach', 'europe-couple-premium'],
    ageGroups: ['adults'],
    travelStyles: ['premium', 'relaxed'],
  },
  {
    id: 'buggy-adventure',
    label: 'Buggy · aventura',
    description: 'Vehículos, rutas y paradas de buggy o ATV.',
    categories: ['adventure', 'buggy', 'off-road'],
    excursions: ['Buggy', 'ATV', 'Macao Beach'],
    audiences: ['us-friends-buggy', 'latam-friends-buggy', 'uk-friends-buggy', 'canada-friends-adventure'],
    ageGroups: ['adults'],
    travelStyles: ['adventure'],
  },
  {
    id: 'catamaran-sea',
    label: 'Catamarán · mar y grupos',
    description: 'Navegación, costa y momentos compartidos a bordo.',
    categories: ['boat', 'snorkeling', 'sea'],
    excursions: ['Catamaran', 'Catalina Island'],
    audiences: ['uk-family-catamaran', 'us-couple-snorkel', 'canada-couple-sailing'],
    ageGroups: ['all-ages', 'adults'],
    travelStyles: ['relaxed', 'premium'],
  },
  {
    id: 'culture-city',
    label: 'Cultura · ciudad y patrimonio',
    description: 'Santo Domingo, patrimonio y vida local representada con respeto.',
    categories: ['culture', 'history', 'city'],
    excursions: ['Santo Domingo', 'Altos de Chavón'],
    audiences: ['france-couple-culture', 'latam-mixed-group-culture', 'small-group-history', 'us-senior-culture'],
    ageGroups: ['adults', 'seniors'],
    travelStyles: ['standard', 'relaxed'],
  },
  {
    id: 'family-beach',
    label: 'Playa · familias',
    description: 'Playa y costa con distintas edades, sin asumir roles familiares.',
    categories: ['beach', 'family', 'nature'],
    excursions: ['Macao Beach', 'Bávaro Beach'],
    audiences: ['us-family-beach', 'latam-family-classic', 'canada-family-island', 'multi-gen-family'],
    ageGroups: ['all-ages'],
    travelStyles: ['standard', 'relaxed'],
  },
  {
    id: 'nature-relaxed',
    label: 'Naturaleza · ritmo tranquilo',
    description: 'Paisajes, miradores y excursiones de ritmo pausado.',
    categories: ['nature', 'viewpoint', 'relaxed'],
    excursions: ['Montaña Redonda', 'Hoyo Azul'],
    audiences: ['us-senior-culture', 'europe-senior-culture', 'germany-couple-nature', 'multi-gen-family'],
    ageGroups: ['adults', 'seniors', 'all-ages'],
    travelStyles: ['relaxed'],
  },
  {
    id: 'premium-couples',
    label: 'Parejas · premium',
    description: 'Confort y momentos para dos; usa solo imágenes que reflejen servicios reales.',
    categories: ['couples', 'premium', 'sea'],
    excursions: ['Private boat', 'Saona Island'],
    audiences: ['us-couple-island', 'europe-couple-premium', 'adult-friends-premium'],
    ageGroups: ['adults'],
    travelStyles: ['premium'],
  },
];

const unique = (values: unknown): string[] =>
  Array.isArray(values)
    ? [...new Set(values.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))]
    : [];

const normalizeImage = (value: unknown): PoolImage | null => {
  if (!value || typeof value !== 'object') return null;
  const image = value as Partial<PoolImage>;
  if (typeof image.id !== 'string' || typeof image.url !== 'string') return null;
  return {
    id: image.id,
    url: image.url,
    title: typeof image.title === 'string' ? image.title : '',
    alt: typeof image.alt === 'string' ? image.alt : '',
    categories: unique(image.categories),
    excursions: unique(image.excursions),
    audiences: unique(image.audiences),
    ageGroups: unique(image.ageGroups),
    travelStyles: unique(image.travelStyles),
    hashtags: unique(image.hashtags),
    createdAt: typeof image.createdAt === 'string' ? image.createdAt : '',
  };
};

export const getImageCatalog = async (): Promise<ImageCatalog> => {
  const stored = await apiGet<unknown>('image-catalog');
  if (!stored || typeof stored !== 'object') return { images: [] };
  const images = (stored as { images?: unknown }).images;
  return {
    images: Array.isArray(images)
      ? images.map(normalizeImage).filter((image): image is PoolImage => image !== null)
      : [],
  };
};

export const saveImageCatalog = async (catalog: ImageCatalog): Promise<void> => {
  await apiPut<ImageCatalog>('image-catalog', catalog);
};
