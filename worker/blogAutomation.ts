import { BLOG_AUDIENCE_PRESETS, findAudiencePreset } from '../src/lib/blogAudiencePresets';
import { BLOG_IMAGE_TAGS } from '../src/lib/blogImageTags';
import { templateById } from '../src/lib/blogTemplates';
import { normalizeBlogAutomationConfig, type BlogAutomationConfig } from '../shared/blogAutomation';
import { generateAutomationText } from '../functions/api/ai';

const AUTOMATION_KEY = 'blog-automation';
const LOCALES = ['en', 'es', 'fr', 'de'] as const;
type Locale = (typeof LOCALES)[number];

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface AutomationEnv {
  DATA_KV_F?: KVNamespace;
  DATA_KV?: KVNamespace;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  SITE_URL?: string;
  [key: string]: unknown;
}

interface TourRecord {
  id: number;
  title: string;
  description: string;
}

interface PoolImage {
  id: string;
  url: string;
  title: string;
  alt: string;
  categories: string[];
  excursions: string[];
  audiences: string[];
  hashtags: string[];
}

interface GeneratedArticle {
  title: string;
  caption: string;
  tags: string[];
  prelude: string;
  body: string;
}

const kvFor = (env: AutomationEnv): KVNamespace => {
  const kv = env.DATA_KV_F ?? env.DATA_KV;
  if (!kv) throw new Error('Scheduled blog generation requires this site’s KV namespace.');
  return kv;
};

const parseJson = (value: string | null, key: string): unknown => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Stored ${key} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const readAssetJson = async (env: AutomationEnv, path: string): Promise<unknown | null> => {
  if (!env.ASSETS) return null;
  const response = await env.ASSETS.fetch(new Request(`https://assets.local/${path}`));
  if (!response.ok) return null;
  const text = await response.text();
  if (!text || text.trimStart().startsWith('<')) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Bundled ${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const findArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  if (object.record !== undefined) return findArray(object.record);
  for (const nested of Object.values(object)) {
    const found = findArray(nested);
    if (found.length) return found;
  }
  return [];
};

const localizedText = (value: unknown, locale: Locale = 'en'): string => {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  const object = value as Record<string, unknown>;
  const localized = object[locale] ?? object.en ?? object.es;
  return typeof localized === 'string' ? localized.trim() : '';
};

const readList = async (
  env: AutomationEnv,
  key: string,
  assetPath: string
): Promise<unknown[]> => {
  const kv = kvFor(env);
  const stored = await kv.get(key);
  const data = stored === null ? await readAssetJson(env, assetPath) : parseJson(stored, key);
  return findArray(data);
};

const readImageCatalog = async (env: AutomationEnv): Promise<PoolImage[]> => {
  const stored = await kvFor(env).get('image-catalog');
  if (!stored) return [];
  const parsed = parseJson(stored, 'image catalogue');
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { images?: unknown }).images)) {
    throw new Error('The image catalogue has an invalid shape.');
  }
  return (parsed as { images: unknown[] }).images.flatMap((entry): PoolImage[] => {
    if (!entry || typeof entry !== 'object') return [];
    const image = entry as Partial<PoolImage>;
    if (typeof image.id !== 'string' || typeof image.url !== 'string' || !/^https?:\/\//i.test(image.url)) return [];
    return [{
      id: image.id,
      url: image.url,
      title: typeof image.title === 'string' ? image.title : '',
      alt: typeof image.alt === 'string' ? image.alt : '',
      categories: Array.isArray(image.categories) ? image.categories.filter((item): item is string => typeof item === 'string') : [],
      excursions: Array.isArray(image.excursions) ? image.excursions.filter((item): item is string => typeof item === 'string') : [],
      audiences: Array.isArray(image.audiences) ? image.audiences.filter((item): item is string => typeof item === 'string') : [],
      hashtags: Array.isArray(image.hashtags) ? image.hashtags.filter((item): item is string => typeof item === 'string') : [],
    }];
  });
};

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const topicForTour = (tour: TourRecord): string => {
  const text = normalize(`${tour.title} ${tour.description}`);
  if (/buggy|atv|quad|off road/.test(text)) return 'buggy';
  if (/saona/.test(text)) return 'saona';
  if (/catalina|snorkel|catamaran|sail|boat|island/.test(text)) return 'island';
  if (/santo domingo|altos de chavon|history|historic|culture|cultural/.test(text)) return 'culture';
  if (/hoyo azul|ojos indigenas|haitises|montana redonda|nature|waterfall|lagoon/.test(text)) return 'nature';
  if (/beach|bavaro|bávaro|macao|juanillo|coast/.test(text)) return 'beach';
  return 'destination';
};

const AUDIENCE_IDS: Record<string, string[]> = {
  buggy: ['us-friends-buggy', 'latam-friends-buggy', 'uk-friends-buggy', 'canada-friends-adventure', 'us-solo-nature'],
  saona: ['us-family-beach', 'latam-family-classic', 'france-family-island', 'canada-family-island', 'us-couple-island'],
  island: ['uk-family-catamaran', 'us-couple-snorkel', 'canada-couple-sailing', 'us-family-beach', 'europe-couple-premium'],
  culture: ['france-couple-culture', 'latam-mixed-group-culture', 'small-group-history', 'us-senior-culture', 'caribbean-family-roots'],
  nature: ['germany-couple-nature', 'europe-senior-culture', 'multi-gen-family', 'us-solo-nature', 'canada-friends-adventure'],
  beach: ['latam-couple-beach', 'us-family-beach', 'canada-family-island', 'us-couple-island', 'multi-gen-family'],
  destination: ['us-family-beach', 'latam-mixed-group-culture', 'us-couple-island', 'small-group-history'],
};

const TEMPLATE_IDS: Record<string, string[]> = {
  buggy: ['guide', 'story', 'list', 'faq', 'itinerary'],
  saona: ['guide', 'story', 'list', 'faq', 'itinerary'],
  island: ['guide', 'story', 'faq', 'itinerary', 'romantic'],
  culture: ['local-culture', 'guide', 'story', 'faq', 'list'],
  nature: ['guide', 'story', 'list', 'faq', 'itinerary'],
  beach: ['guide', 'story', 'family', 'list', 'faq'],
  destination: ['guide', 'story', 'list', 'faq', 'itinerary'],
};

const editorialChoices = (topic: string, runCount: number) => {
  const ids = AUDIENCE_IDS[topic] ?? AUDIENCE_IDS.destination;
  const audience = findAudiencePreset(ids[runCount % ids.length]) ?? BLOG_AUDIENCE_PRESETS[0];
  const templateIds = TEMPLATE_IDS[topic] ?? TEMPLATE_IDS.destination;
  const template = templateById(templateIds[Math.floor(runCount / ids.length) % templateIds.length]);
  return { audience, template };
};

const topicImageTerms: Record<string, string[]> = {
  buggy: ['buggy', 'atv', 'quad', 'off road', 'adventure', 'macao'],
  saona: ['saona', 'island', 'boat', 'beach'],
  island: ['island', 'boat', 'catamaran', 'sailing', 'snorkel', 'sea'],
  culture: ['culture', 'history', 'city', 'heritage', 'local'],
  nature: ['nature', 'viewpoint', 'lagoon', 'waterfall', 'cave', 'mangrove'],
  beach: ['beach', 'sea', 'coast', 'island'],
  destination: ['punta cana', 'bavaro', 'beach', 'excursion'],
};

const pickImages = (
  images: PoolImage[],
  tour: TourRecord,
  audienceId: string,
  topic: string,
  runCount: number
): PoolImage[] => {
  const tourText = normalize(`${tour.title} ${tour.description}`);
  const titleTerms = normalize(tour.title).split(' ').filter((term) => term.length > 3);
  const topicTerms = topicImageTerms[topic] ?? topicImageTerms.destination;
  const scored = images.map((image) => {
    const excursions = image.excursions.map(normalize);
    const metadata = normalize([
      image.title,
      image.alt,
      ...image.categories,
      ...image.excursions,
      ...image.hashtags,
    ].join(' '));
    let score = 0;
    if (excursions.some((item) => item && (tourText.includes(item) || item.includes(normalize(tour.title))))) score += 8;
    if (titleTerms.some((term) => metadata.includes(term))) score += 3;
    if (image.audiences.some((id) => normalize(id) === normalize(audienceId))) score += 4;
    if (topicTerms.some((term) => metadata.includes(normalize(term)))) score += 2;
    for (const selectedTag of image.hashtags) {
      const curated = BLOG_IMAGE_TAGS.find((entry) => normalize(entry.tag) === normalize(selectedTag));
      if (curated?.terms.some((term) => tourText.includes(normalize(term)))) score += 3;
    }
    return { image, score };
  }).filter((entry) => entry.score > 0);

  const groups = new Map<number, PoolImage[]>();
  for (const entry of scored) {
    groups.set(entry.score, [...(groups.get(entry.score) ?? []), entry.image]);
  }

  const selected: PoolImage[] = [];
  for (const score of [...groups.keys()].sort((a, b) => b - a)) {
    const group = groups.get(score) ?? [];
    group.sort((a, b) => a.id.localeCompare(b.id));
    const offset = group.length ? runCount % group.length : 0;
    const rotated = [...group.slice(offset), ...group.slice(0, offset)];
    selected.push(...rotated.slice(0, 3 - selected.length));
    if (selected.length >= 3) break;
  }
  return selected;
};

const basePrompt = (
  tour: TourRecord,
  audience: (typeof BLOG_AUDIENCE_PRESETS)[number],
  templateId: string,
  images: PoolImage[]
) => {
  const template = templateById(templateId);
  return `Write an enjoyable, inspiring, informative travel feature for a real tour operator in Punta Cana, Dominican Republic.

ARTICLE SHAPE
${template.label.en} — ${template.structure}
Aim for about 700 words in the BODY. Keep paragraphs comfortable to read on a phone.

VERIFIED TOUR SOURCE
Tour name: ${tour.title}
Operator description: ${tour.description || 'No further itinerary details were supplied.'}
Treat this source as the limit of what is known. Do not invent inclusions, duration, transport, prices, safety guarantees, named guides, local encounters, or exact schedules. Distinguish general destination context from what this particular tour includes.

EDITORIAL READER
Origin profile: ${audience.audience.origin}
Age range: ${audience.audience.age}
Travelling as: ${audience.audience.group}
Travel style: ${audience.audience.style}
Editorial angle: ${audience.focus}
Use this only as a writing lens, not a stereotype or claim about everyone from that place. Do not infer race, ability, income, or preferences from origin.

PHOTO CATALOGUE
${images.length
    ? images.map((image, index) => `${index + 1}. ${image.title || image.alt || 'Operator photo'} — ${image.alt || 'No further visual description'}\nPlace [[IMAGE-${index + 1}]] on its own line where this particular photo genuinely fits. Never treat its tags as proof of tour inclusions.`).join('\n')
    : 'No matching catalogue photographs are available. Do not request or invent image markers.'}

VOICE AND ACCURACY
Write like a perceptive travel writer who knows the difference between vivid detail and made-up detail. Use concrete, observed-sounding phrasing only when supported by the source; keep any broader destination advice clearly general. Be candid about what the supplied information does not say. Respect Dominican people and culture as contemporary and diverse; never exoticise them.
Keep all private thought, analysis, planning, and model commentary out of the copy. Do not mention AI, prompts, sources, or these instructions. Avoid generic sales language, repeated adjectives, canned openings, and empty superlatives. No hashtags in prose.

OUTPUT FORMAT — return only these labels and the finished article:
TITLE: <specific, inviting title>
CAPTION: <one useful sentence, no more than 25 words>
TAGS: <4 to 6 concise lowercase subject tags, comma-separated>
PRELUDE: <2 to 3 vivid but grounded opening sentences>
BODY:
<the article in Markdown, following the selected article shape exactly>`;
};

const editionPrompt = (article: GeneratedArticle, locale: Locale, audience: string) => {
  const language = { es: 'natural Latin American Spanish', fr: 'idiomatic French', de: 'natural German' }[locale];
  return `Create the ${language} edition of the travel article below. Adapt it as original travel writing for readers of that language, not as a literal translation. Keep every factual claim and caveat, the same tour, section order, image markers, and useful details. Respect Dominican culture and local context; avoid stereotypes and machine-like phrasing. Do not include reasoning, commentary, or mention translation. Preserve the audience focus (${audience}) without generalizing about a nationality.

Return only the same labels: TITLE, CAPTION, TAGS, PRELUDE, BODY.

ENGLISH SOURCE
TITLE: ${article.title}
CAPTION: ${article.caption}
TAGS: ${article.tags.join(', ')}
PRELUDE: ${article.prelude}
BODY:
${article.body}`;
};

const extractField = (text: string, field: string, nextField?: string): string => {
  const start = new RegExp(`^${field}\\s*:\\s*`, 'im').exec(text);
  if (!start) return '';
  const contentStart = start.index + start[0].length;
  if (!nextField) return text.slice(contentStart).trim();
  const rest = text.slice(contentStart);
  const end = new RegExp(`^${nextField}\\s*:\\s*`, 'im').exec(rest);
  return rest.slice(0, end?.index ?? rest.length).trim();
};

const parseArticle = (text: string): GeneratedArticle => {
  const clean = text
    .replace(/<(think|thinking|analysis|reasoning)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(think|thinking|analysis|reasoning)\b[^>]*>[\s\S]*$/gi, '')
    .trim();
  const article: GeneratedArticle = {
    title: extractField(clean, 'TITLE', 'CAPTION'),
    caption: extractField(clean, 'CAPTION', 'TAGS'),
    tags: extractField(clean, 'TAGS', 'PRELUDE').split(',').map((tag) => tag.trim().replace(/^#/, '').toLowerCase()).filter(Boolean).slice(0, 8),
    prelude: extractField(clean, 'PRELUDE', 'BODY'),
    body: extractField(clean, 'BODY'),
  };
  if (!article.title || !article.caption || !article.prelude || article.body.length < 150) {
    throw new Error('The AI response did not contain a complete article in the required format.');
  }
  return article;
};

const slugify = (value: string): string =>
  normalize(value).replace(/\s+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

const withImageMarkers = (body: string, images: PoolImage[]): string => {
  if (!images.length) return body.replace(/\[\[IMAGE-\d+\]\]/gi, '');
  const valid = body.replace(/\[\[IMAGE-(\d+)\]\]/gi, (marker, number: string) =>
    Number(number) >= 1 && Number(number) <= images.length ? marker : ''
  );
  const present = new Set(
    [...valid.matchAll(/\[\[IMAGE-(\d+)\]\]/gi)].map((match) => Number(match[1]))
  );
  const missing = images
    .map((_, index) => index + 1)
    .filter((index) => !present.has(index))
    .map((index) => `[[IMAGE-${index}]]`);
  return missing.length ? `${missing.join('\n\n')}\n\n${valid}` : valid;
};

const createLocaleRecord = (
  article: GeneratedArticle,
  locale: Locale,
  tour: TourRecord,
  id: string,
  date: string,
  images: PoolImage[]
) => ({
  id,
  title: article.title,
  tour: localizedText(tour.title, locale) || tour.title,
  post: withImageMarkers(article.body, images),
  date,
  slug: `${slugify(article.title)}-${locale}`,
  language: locale,
  tags: article.tags,
  visible: false,
  caption: article.caption,
  prelude: article.prelude,
  images: images.map((image) => image.url),
  relatedTourIds: [tour.id],
  social: [],
});

const writeDrafts = async (
  env: AutomationEnv,
  records: Record<Locale, ReturnType<typeof createLocaleRecord>>
): Promise<void> => {
  const kv = kvFor(env);
  const lists = {} as Record<Locale, unknown[]>;
  for (const locale of LOCALES) {
    lists[locale] = await readList(env, `blog-${locale}`, `data/blog-${locale}.json`);
  }

  const written: Locale[] = [];
  try {
    for (const locale of LOCALES) {
      const list = lists[locale];
      await kv.put(`blog-${locale}`, JSON.stringify([records[locale], ...list]));
      written.push(locale);
    }
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (const locale of written) {
      try {
        const current = await readList(env, `blog-${locale}`, `data/blog-${locale}.json`);
        await kv.put(`blog-${locale}`, JSON.stringify(
          current.filter((entry) => !entry || typeof entry !== 'object' || String((entry as { id?: unknown }).id) !== records[locale].id)
        ));
      } catch (rollbackError) {
        rollbackErrors.push(`${locale}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not save all four language drafts: ${message}${rollbackErrors.length ? `; rollback also failed for ${rollbackErrors.join(', ')}` : ''}`);
  }
};

const runBlogGeneration = async (env: AutomationEnv, now: Date): Promise<{
  title: string;
  tour: string;
  provider: string;
  model: string;
}> => {
  const config = normalizeBlogAutomationConfig(parseJson(await kvFor(env).get(AUTOMATION_KEY), AUTOMATION_KEY));
  const tours = (await readList(env, 'tours-en', 'data/tours-en.json'))
    .flatMap((entry, index): TourRecord[] => {
      if (!entry || typeof entry !== 'object') return [];
      const raw = entry as Record<string, unknown>;
      const id = Number(raw.id ?? index + 1);
      const title = localizedText(raw.title);
      if (!Number.isSafeInteger(id) || id < 1 || !title) return [];
      return [{ id, title, description: localizedText(raw.description) }];
    });
  if (!tours.length) throw new Error('No valid English tours were found; add a tour before enabling automatic articles.');

  const tour = tours[config.runCount % tours.length];
  const topic = topicForTour(tour);
  const { audience, template } = editorialChoices(topic, config.runCount);
  const catalogue = await readImageCatalog(env);
  const images = pickImages(catalogue, tour, audience.id, topic, config.runCount);
  const imageDescriptions = images.map((image) =>
    [image.title, image.alt, ...image.hashtags].filter(Boolean).join(' — ')
  );
  const prompt = basePrompt(tour, audience, template.id, images);
  const firstGeneration = await generateAutomationText(env, prompt);
  const first = parseArticle(firstGeneration.text);
  const imagePromptNote = imageDescriptions.length
    ? `\nThe selected images have these operator-entered descriptions: ${imageDescriptions.join(' | ')}. Use them only to place the photo markers, not to infer itinerary details.`
    : '';
  const translations = {} as Record<Exclude<Locale, 'en'>, GeneratedArticle>;

  for (const locale of ['es', 'fr', 'de'] as const) {
    const result = await generateAutomationText(
      env,
      `${editionPrompt(first, locale, audience.audience.origin)}${imagePromptNote}`
    );
    const translated = parseArticle(result.text);
    if (normalize(`${translated.title} ${translated.body}`) === normalize(`${first.title} ${first.body}`)) {
      throw new Error(`The AI returned the English article instead of a ${locale.toUpperCase()} edition.`);
    }
    translations[locale] = translated;
  }

  const id = `auto-${now.getTime()}-${crypto.randomUUID()}`;
  const date = now.toISOString();
  const records = {
    en: createLocaleRecord(first, 'en', tour, id, date, images),
    es: createLocaleRecord(translations.es, 'es', tour, id, date, images),
    fr: createLocaleRecord(translations.fr, 'fr', tour, id, date, images),
    de: createLocaleRecord(translations.de, 'de', tour, id, date, images),
  };
  await writeDrafts(env, records);

  return {
    title: first.title,
    tour: tour.title,
    provider: firstGeneration.provider,
    model: firstGeneration.model,
  };
};

export const runScheduledBlogAutomation = async (
  env: AutomationEnv,
  scheduledTime = Date.now()
): Promise<void> => {
  const kv = kvFor(env);
  const now = new Date(scheduledTime);
  let config = normalizeBlogAutomationConfig(parseJson(await kv.get(AUTOMATION_KEY), AUTOMATION_KEY));
  if (!config.enabled) return;

  const lastStartedAt = config.lastRunStartedAt ? Date.parse(config.lastRunStartedAt) : NaN;
  const intervalMs = config.intervalHours * 60 * 60 * 1000;
  if (config.lastStatus === 'running' && Number.isFinite(lastStartedAt) && scheduledTime - lastStartedAt < intervalMs) {
    return;
  }
  if (Number.isFinite(lastStartedAt) && scheduledTime - lastStartedAt < intervalMs) return;

  config = {
    ...config,
    lastStatus: 'running',
    lastRunStartedAt: now.toISOString(),
    lastError: '',
  };
  await kv.put(AUTOMATION_KEY, JSON.stringify(config));

  try {
    const result = await runBlogGeneration(env, now);
    const current = normalizeBlogAutomationConfig(parseJson(await kv.get(AUTOMATION_KEY), AUTOMATION_KEY));
    await kv.put(AUTOMATION_KEY, JSON.stringify({
      ...current,
      lastStatus: 'success',
      lastRunAt: new Date().toISOString(),
      lastError: '',
      lastArticleTitle: result.title,
      lastTourTitle: result.tour,
      lastProvider: result.provider,
      lastModel: result.model,
      runCount: current.runCount + 1,
    } satisfies BlogAutomationConfig));
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 1200);
    console.error('[blog automation] Scheduled article generation failed:', message);
    try {
      const current = normalizeBlogAutomationConfig(parseJson(await kv.get(AUTOMATION_KEY), AUTOMATION_KEY));
      await kv.put(AUTOMATION_KEY, JSON.stringify({ ...current, lastStatus: 'failed', lastError: message }));
    } catch (statusError) {
      console.error('[blog automation] Could not persist the failure status:', statusError);
    }
    throw error;
  }
};
