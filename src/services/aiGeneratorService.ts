import { AISettings } from './aiSettingsService';
import { ApiError, apiPost } from './apiClient';
import { BlogLang, keywordsFor, seasonalNote, topicById } from '../lib/blogTopics';
import { LANGUAGE_NAME, LANGUAGE_VOICE, templateById } from '../lib/blogTemplates';

/**
 * The blog generator.
 *
 * Everything here talks to /api/ai, which runs the model on the Worker. The
 * browser no longer holds a key, no longer reads an empty `statusText` and
 * calls it an error message, and no longer picks a model that was retired a
 * year ago — see functions/api/ai.ts for what each of those cost.
 */

export interface BlogGenerationParams {
  povOrigin: string;
  povAge: string;
  povGroup: string;
  povGender: string;
  povExclusivity: string;
  selectedTours: string[];
  /** Topic ids from lib/blogTopics. */
  topics: string[];
  voiceTranscript: string;
  mediaBase64?: string;
  /** Image URLs to place inside the article, in order. */
  images: string[];
  brandName?: string;
  /** Platforms the operator wants a social cut for. */
  socialPlatforms: string[];
  /** Article shape, an id from lib/blogTemplates. */
  template?: string;
  /** Editorial angle for the selected audience; not a claim about a nationality. */
  audienceFocus?: string;
  /** Operator-written labels for selected catalogue photos; visual cues only. */
  imageDescriptions?: string[];
  /** Existing article to use as the factual starting point when recreating. */
  sourceArticle?: GeneratedArticle;
  /** Specific editorial changes requested for a recreation. */
  recreateInstruction?: string;
  /** Selected contextual hashtags, without the leading #. */
  hashtags?: string[];
  /** Short real guest reviews, quoted as social proof. Never invented. */
  reviews?: string[];
  /** Editions to write besides English. Defaults to Spanish, French and German. */
  languages?: BlogLang[];
  /** Called as each edition starts, so the admin can say which one. */
  onProgress?: (lang: BlogLang) => void;
}

export interface GeneratedArticle {
  title: string;
  /** Standfirst. Shown larger than the body, under the title. */
  caption: string;
  /** The opening, set bold, before the body proper. */
  prelude: string;
  /** Markdown. May contain [[IMAGE-1]] … markers on their own lines. */
  body: string;
  tags: string[];
}

export interface SocialCut {
  platform: string;
  text: string;
  hashtags: string[];
}

export interface GeneratedPost {
  en: GeneratedArticle;
  es: GeneratedArticle;
  fr: GeneratedArticle;
  de: GeneratedArticle;
  /**
   * Editions the model could not write. They hold the English text until the
   * admin translates them, and must not be published under their own flag.
   */
  missing: BlogLang[];
  images: string[];
  social: SocialCut[];
  /** Which provider and model actually answered, for the admin to show. */
  provider: string;
  model: string;
}

/**
 * Article lengths are defined per template. Keeping each language edition
 * focused reduces truncation and free-provider rate-limit failures.
 */

/** Enough headroom for the longest template plus the article metadata. */
const MAX_OUTPUT_TOKENS = 3200;

const SYSTEM =
  'You are an award-winning travel writer and SEO editor for a Caribbean tour ' +
  'operator. You write long, specific, sensory destination features that read ' +
  'like a magazine, not like a brochure. You follow output formats exactly. ' +
  'Keep all private analysis, reasoning, planning, and model commentary out of ' +
  'the response. Return only the finished requested copy. Write naturally and ' +
  'idiomatically for the target culture; avoid literal translation and generic AI phrasing.';

interface AiResponse {
  ok: boolean;
  text?: string;
  provider?: string;
  model?: string;
  /** Set when another provider answered because the selected one could not. */
  fellBackFrom?: string;
  error?: string;
  detail?: string;
  status?: number;
  /** One readable sentence per provider that was tried and failed. */
  failures?: Array<{ provider: string; error: string }>;
  attempts?: Array<{ provider: string; model: string; status: number; detail: string }>;
}

/**
 * Everything the endpoint knows about a failure, in a form the panel can show.
 *
 * `message` is a sentence naming what to change. `failures` is the same for
 * each provider tried, because "Gemini's key is rejected AND Cloudflare has no
 * binding" is a different problem from either one alone.
 */
export class AiGenerationError extends Error {
  readonly failures: Array<{ provider: string; error: string }>;
  readonly attempts: Array<{ provider: string; model: string; status: number; detail: string }>;

  constructor(message: string, response?: AiResponse | null) {
    super(message);
    this.name = 'AiGenerationError';
    this.failures = response?.failures ?? [];
    this.attempts = response?.attempts ?? [];
  }
}

/** One call to the Worker, with the provider's own error kept intact. */
const callAi = async (
  body: Record<string, unknown>
): Promise<{ text: string; provider: string; model: string; fellBackFrom?: string }> => {
  let data: AiResponse;
  try {
    data = await apiPost<AiResponse>('ai', body);
  } catch (error) {
    // A non-2xx now means the request never got as far as a provider — a wrong
    // admin password, a Worker that is not there. ApiError still carries the
    // server's JSON, which is where anything it did manage to say lives.
    const payload = error instanceof ApiError ? (error.body as AiResponse | null) : null;
    if (payload?.error) {
      throw new AiGenerationError(
        `${payload.error}${payload.detail ? ` — ${payload.detail}` : ''}`,
        payload
      );
    }
    if (error instanceof ApiError && error.status === 401) {
      throw new AiGenerationError(
        'La contraseña de administrador no fue aceptada. Vuelve a entrar al panel e inténtalo otra vez.'
      );
    }
    throw error;
  }

  if (!data?.ok || !data.text) {
    const extra = (data?.failures ?? [])
      .slice(1)
      .map((f) => `${f.provider}: ${f.error}`)
      .join(' · ');
    throw new AiGenerationError(
      `${data?.error || 'El proveedor de IA no devolvió nada.'}${extra ? ` (${extra})` : ''}`,
      data
    );
  }

  return {
    text: data.text,
    provider: data.provider || '',
    model: data.model || '',
    fellBackFrom: data.fellBackFrom,
  };
};

/** Extract a `LABEL:` line, case-insensitively, anywhere in the output. */
const field = (text: string, label: string): string => {
  const re = new RegExp(`^\\s*(?:\\*\\*)?${label}(?:\\*\\*)?\\s*:\\s*(.+)$`, 'im');
  return re.exec(text)?.[1]?.trim() || '';
};

const stripMarkers = (text: string) =>
  text
    .replace(/^\s*(?:\*\*)?(TITLE|CAPTION|TAGS|PRELUDE|BODY)(?:\*\*)?\s*:.*$/gim, '')
    .trim();

/**
 * Turn one model response into an article.
 *
 * Small models drift from any format eventually, so every field has a way to
 * be recovered from the prose: a missing title becomes the first heading, a
 * missing caption becomes the first sentence, a missing prelude becomes the
 * first paragraph — which is then removed from the body so it is not printed
 * twice.
 */
const parseArticle = (raw: string, fallbackTitle: string): GeneratedArticle => {
  const text = raw.replace(/\r/g, '').trim();

  let title = field(text, 'TITLE');
  let caption = field(text, 'CAPTION');
  let prelude = field(text, 'PRELUDE');
  const tagLine = field(text, 'TAGS');

  const bodyMatch = /^\s*(?:\*\*)?BODY(?:\*\*)?\s*:\s*$/im.exec(text);
  let body = bodyMatch ? text.slice(bodyMatch.index + bodyMatch[0].length).trim() : stripMarkers(text);

  if (!title) {
    const heading = /^#{1,3}\s+(.+)$/m.exec(body);
    if (heading) {
      title = heading[1].trim();
      body = body.replace(heading[0], '').trim();
    }
  }
  if (!title) {
    const [first, ...rest] = body.split('\n');
    if (first && first.length < 140) {
      title = first.replace(/^#+\s*/, '').trim();
      body = rest.join('\n').trim();
    }
  }

  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  if (!prelude && paragraphs.length > 1) {
    prelude = paragraphs.shift() as string;
    body = paragraphs.join('\n\n');
  }
  if (!caption) {
    const source = prelude || paragraphs[0] || '';
    caption = (source.split(/(?<=[.!?])\s/)[0] || source).slice(0, 180).trim();
  }

  const tags = tagLine
    .split(',')
    .map((t) => t.trim().replace(/^#/, '').toLowerCase())
    .filter(Boolean);

  return {
    title: (title || fallbackTitle).replace(/^["'#\s]+|["'\s]+$/g, ''),
    caption: caption.replace(/^\*+|\*+$/g, ''),
    prelude: prelude.replace(/^\*+|\*+$/g, ''),
    body: body.trim(),
    tags,
  };
};

const addSelectedHashtags = (article: GeneratedArticle, hashtags: string[] = []) => ({
  ...article,
  tags: [...new Set([...article.tags, ...hashtags.map((tag) => tag.replace(/^#/, '').toLowerCase())])],
});

const FORMAT = (imageCount: number) => `OUTPUT FORMAT — follow it exactly, no preamble, no sign-off:

TITLE: <one line. Specific and inviting. Not a category label.>
CAPTION: <one sentence, max 25 words. The standfirst printed under the title.>
TAGS: <4 to 6 comma-separated lowercase tags>
PRELUDE: <2 to 3 sentences. The opening paragraph, printed in bold. Put the
reader inside a moment — a sound, a colour, a temperature.>
BODY:
<the rest of the article in Markdown>${
  imageCount > 0
    ? `

There ${imageCount === 1 ? 'is 1 photograph' : `are ${imageCount} photographs`} to place. Put ${
        imageCount === 1 ? 'the marker' : 'each marker'
      } ${imageCount === 1 ? '[[IMAGE-1]]' : `[[IMAGE-1]] … [[IMAGE-${imageCount}]]`} alone on its own
line inside BODY, at the point where that picture belongs — right where the
text is describing what it shows. Do not caption them and do not use Markdown
image syntax.`
    : ''
}`;

const modelGuidance = (settings: AISettings): string => {
  const provider = settings.activeProvider;
  const model = settings[provider].selectedModel.toLowerCase();
  if (provider === 'openrouter' && model.includes('gemma')) {
    return 'MODEL NOTE: Follow the requested article structure and output labels exactly. ' +
      'Prefer concrete, verified detail to length; do not repeat the same advice in multiple sections.';
  }
  if (provider === 'openrouter' && /deepseek|qwen/.test(model)) {
    return 'MODEL NOTE: Keep private reasoning private. Return only the finished article in the exact requested structure; ' +
      'do not add analysis, a plan, or commentary.';
  }
  if (provider === 'gemini') {
    return 'MODEL NOTE: Treat the output format and section order as strict requirements. ' +
      'Do not add preambles, explanations, or facts beyond the supplied material.';
  }
  if (provider === 'cloudflare') {
    return 'MODEL NOTE: Use short, clear sections and preserve every required output label. ' +
      'Prioritize accuracy and complete structure over extra length.';
  }
  return 'MODEL NOTE: Follow the structure and output labels exactly. Return only the finished article.';
};

const buildEnglishPrompt = (
  params: BlogGenerationParams,
  topicLabels: string[],
  settings: AISettings
) => {
  const brand = params.brandName?.trim() || 'our tour company';
  const template = templateById(params.template || 'guide');
  const targetWords = template.targetWords;
  const keywords = keywordsFor(params.topics, 'en');
  const reviews = (params.reviews || []).filter(Boolean).slice(0, 3);
  const sourceArticle = params.sourceArticle;

  return `Write a long-form travel feature in ENGLISH for ${brand}, a tour operator in
Punta Cana, Dominican Republic.

LENGTH — aim for about ${targetWords} words in the BODY. Follow the template's
section count and write one or two developed paragraphs per section. Do not
pad, repeat points, or sacrifice the requested structure to reach the target.

THE SHAPE OF THIS PIECE — ${template.label.en}
${template.structure}
Title: ${template.title}
${modelGuidance(settings)}

WHO YOU ARE WRITING FOR
- Coming from: ${params.povOrigin || 'anywhere in the world'}
- Age group: ${params.povAge || 'all ages'}
- Travelling as: ${params.povGroup || 'any kind of group'}
- Gender: ${params.povGender || 'mixed'}
- Style and budget: ${params.povExclusivity || 'standard'}
Write to that reader in the second person. Think about what this reader is
trying to decide, what worries them (safety, value, getting there, the kids,
the sun) and what they will want to tell their friends afterwards — and answer
all three.
${params.audienceFocus ? `EDITORIAL ANGLE FOR THIS AUDIENCE\n${params.audienceFocus}\nUse this as a writing lens, not as a claim about everyone from that place. Avoid stereotypes and explain local context naturally.\n` : ''}
${params.imageDescriptions?.length ? `SELECTED PHOTO CONTEXT\nThese operator-provided labels describe selected catalogue images. Use them only to place the photos naturally; they do not prove tour inclusions or itinerary details.\n${params.imageDescriptions.map((description) => `- ${description}`).join('\n')}\n` : ''}
${sourceArticle ? `EXISTING ARTICLE TO RECREATE\nUse this article as the factual and editorial starting point. Preserve accurate details, but rewrite it to fit the selected format and the specific instructions. Do not copy stale phrasing or add unsupported facts.\nTITLE: ${sourceArticle.title}\nCAPTION: ${sourceArticle.caption}\nPRELUDE: ${sourceArticle.prelude}\nBODY:\n${sourceArticle.body}\n` : ''}
${params.recreateInstruction?.trim() ? `SPECIFIC RECREATION INSTRUCTIONS\n${params.recreateInstruction.trim()}\n` : ''}

EXCURSIONS TO FEATURE
${params.selectedTours.length ? params.selectedTours.join('\n') : 'the best of Punta Cana and the Bávaro coast'}

TOPICS TO LEAN INTO
${topicLabels.length ? topicLabels.join(', ') : 'whatever the notes below suggest'}

SELECTED HASHTAGS
${params.hashtags?.length ? params.hashtags.map((tag) => `#${tag}`).join(' ') : 'None selected'}
These are optional editorial seasoning, not facts. If none are selected, do not
invent hashtags or a seasoning list. Never put hashtag syntax in article prose;
use a selected tag only when it fits the confirmed experience.

SEARCH PHRASES — what travellers type. Use the first one in the title or the
first subheading, and the others naturally in subheadings and text, never as a
list and never more than once each:
${keywords.length ? keywords.join(' · ') : 'Punta Cana excursions · things to do in Punta Cana · Bávaro tours'}

THIS TIME OF YEAR
${seasonalNote()}
Mention it where it genuinely helps the reader plan.
${
  reviews.length
    ? `
WHAT REAL GUESTS SAID — you may quote one or two of these, word for word, in
quotation marks and attributed to "a guest". Do not alter them and do not
invent others:
${reviews.map((r) => `- "${r}"`).join('\n')}
`
    : ''
}
NOTES FROM THE OPERATOR — treat these as ground truth and work every concrete
detail into the piece:
"${params.voiceTranscript || 'Focus on the experience itself: the water, the light, the food, the people, and how effortless the day feels when it is organised properly.'}"
${params.mediaBase64 ? '\nAn image is attached. Weave its specific details — colours, setting, mood — into the writing.\n' : ''}
HOW IT SHOULD READ
- Open inside a moment, never with "Welcome to" or "Are you looking for".
- Concrete nouns over adjectives. One specific detail per section that a
  brochure would miss.
- Include what the day actually involves, what to bring, who it suits and who
  it does not, and what makes this operator's version better.
- Somewhere in the piece, one short line a reader would want to screenshot and
  share — true, specific, a little surprising.
- Respect the place and its people: name Dominican things by their names, and
  write about local guides, cooks and drivers as people, not as scenery.
- Never invent prices, distances, durations, safety claims or awards. If a
  fact is not in the notes, write around it.
- Banned: "nestled", "hidden gem", "bucket list", "paradise found", "little
  slice of heaven", "unforgettable memories", "dive into", "look no further".
- Keep to the exact section count in the template. Do not append a bonus FAQ or
  "Good to know" section; close naturally within the final requested section.
- Close with a warm, confident invitation to get in touch on WhatsApp. No hard sell.

${FORMAT(params.images.length)}`;
};

const buildEditionPrompt = (
  english: GeneratedArticle,
  lang: BlogLang,
  params: BlogGenerationParams,
  settings: AISettings
) => {
  const keywords = keywordsFor(params.topics, lang);
  const targetWords = templateById(params.template || 'guide').targetWords;
  return `Below is a finished English travel feature. Produce the ${LANGUAGE_NAME[lang]} edition of it.

This is not a translation exercise. Rewrite it as a travel writer who writes in
that language would have written it in the first place: ${LANGUAGE_VOICE[lang]}
Use natural local phrasing, idioms, and cultural references appropriate to
readers of that language; avoid literal translation and machine-like wording.
Keep the same structure, section order and facts. Aim for about ${targetWords}
words without padding. Keep every [[IMAGE-n]] marker exactly where it is.
Guest quotes stay as they are, in their original words.
${modelGuidance(settings)}

Write the title and the subheadings for how people search in that language.${
    keywords.length ? ` Use these phrases where they fit naturally: ${keywords.join(' · ')}` : ''
  }

Never invent a fact the English version does not contain.

--- ENGLISH ARTICLE ---
TITLE: ${english.title}
CAPTION: ${english.caption}
PRELUDE: ${english.prelude}

${english.body}
--- END ---

${FORMAT(params.images.length)}`;
};

const buildSocialPrompt = (
  article: GeneratedArticle,
  platforms: string[],
  hashtags: string[],
  brand: string
) =>
  `Create one standalone content asset per selected channel for a Caribbean tour operator called ${brand}.

Use this exact format, nothing else:

${platforms.map((p) =>
    p === 'google-search'
      ? '[GOOGLE-SEARCH]\nSEO title: <max 60 characters>\nMeta description: <max 155 characters>\nPrimary search phrase: <one phrase>\nRelated phrases: <up to 5 natural phrases>\nSearch snippet: <clear, factual, inviting answer>'
      : `[${p.toUpperCase()}]\n<the post>`
  ).join('\n\n')}

For every social platform, the first line is the hook — a specific detail or a
question the reader cannot scroll past — and it must make sense on its own. No
engagement bait ("tag a friend who…"), no invented facts, no prices unless the
article gives them. Speak like a local who loves the place, not like an ad.

Rules per platform:
- instagram: 3 to 5 short lines, warm and visual, one emoji at most per line,
  ends with a call to action. Add up to 5 selected hashtags on the final line.
- facebook: one paragraph of 60 to 90 words, conversational, ends with a
  question. Add up to 5 selected hashtags on the final line.
- tiktok: 2 punchy lines, present tense, with up to 5 selected hashtags.
- twitter: under 260 characters including any selected hashtags.
- youtube: 2 sentences of description, with up to 5 selected hashtags.
- linkedin: 70 words, professional, about the operation rather than the party;
  include hashtags only when selected.
- google-search: Write a Google-ready search result package, not a social post.
  Keep the title and description within the character limits above, answer the
  traveller's intent, use natural language, and make no unsupported claims.
  Do not promise rankings or stuff keywords.

Write each post in the same language as the article. Use only hashtags from the
operator's selection below, choosing at most 5 that fit each post. Never invent
or add generic hashtags. If the selection is empty, do not include hashtags.
${hashtags.length ? hashtags.map((h) => `#${h}`).join(' ') : 'No hashtags selected'}

--- ARTICLE ---
${article.title}
${article.caption}

${article.prelude}

${article.body.slice(0, 2500)}
--- END ---`;

const parseSocial = (raw: string, platforms: string[], selectedHashtags: string[]): SocialCut[] => {
  const cuts: SocialCut[] = [];
  const allowed = new Map(
    selectedHashtags.map((tag) => [tag.replace(/^#/, '').toLowerCase(), tag.replace(/^#/, '')])
  );

  for (const platform of platforms) {
    const re = new RegExp(`\\[${platform}\\]\\s*([\\s\\S]*?)(?=\\n\\s*\\[[a-z-]+\\]|$)`, 'i');
    const rawText = re.exec(raw)?.[1]?.trim();
    if (!rawText) continue;
    const used = new Set<string>();
    let hashtagCount = 0;
    const text = rawText
      .replace(/#([\p{L}\p{N}_]+)/gu, (_match, tag: string) => {
        const key = tag.toLowerCase();
        if (!allowed.has(key) || used.has(key) || hashtagCount >= 5) return '';
        used.add(key);
        hashtagCount += 1;
        return `#${allowed.get(key)}`;
      })
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const hashtags = [...used].flatMap((tag) => {
      const selected = allowed.get(tag);
      return selected ? [selected] : [];
    });
    cuts.push({ platform, text, hashtags });
  }

  return cuts;
};

/**
 * Put the photographs where the article asked for them.
 *
 * When the model placed markers, they are kept. When it did not — which small
 * models frequently do not — every picture goes immediately after the prelude
 * and before the body proper, which is the agreed fallback and also the one
 * place a photograph always reads correctly.
 */
export const applyImagePlacement = (body: string, images: string[]): string => {
  if (images.length === 0) return body;

  const hasMarkers = /\[\[IMAGE-\d+\]\]/i.test(body);
  if (hasMarkers) {
    // Drop markers pointing at pictures that do not exist.
    return body.replace(/\[\[IMAGE-(\d+)\]\]/gi, (match, n) =>
      Number(n) >= 1 && Number(n) <= images.length ? match : ''
    );
  }

  const markers = images.map((_, i) => `[[IMAGE-${i + 1}]]`).join('\n\n');
  return `${markers}\n\n${body}`;
};

export const generateBlogPost = async (
  settings: AISettings,
  params: BlogGenerationParams
): Promise<GeneratedPost> => {
  const brand = params.brandName?.trim() || 'our tour company';
  const topicLabels = params.topics.map((id) => topicById(id)?.label.en || id);

  const english = await callAi({
    prompt: buildEnglishPrompt(params, topicLabels, settings),
    system: SYSTEM,
    maxTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.85,
    imageBase64: params.mediaBase64,
    settings,
  });

  const en = addSelectedHashtags(
    parseArticle(english.text, `A day out from ${brand}`),
    params.hashtags
  );
  en.body = applyImagePlacement(en.body, params.images);

  // Each edition is written from the finished English piece, so all four carry
  // the same facts, the same sections and the same pictures in the same places.
  // One that fails is reported rather than fatal: the English is kept in its
  // place and the admin translates it after saving.
  const editions = {} as Record<BlogLang, GeneratedArticle>;
  const missing: BlogLang[] = [];
  for (const lang of params.languages ?? (['es', 'fr', 'de'] as BlogLang[])) {
    if (lang === 'en') continue;
    params.onProgress?.(lang);
    try {
      const edition = await callAi({
        prompt: buildEditionPrompt(en, lang, params, settings),
        system: SYSTEM,
        maxTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.8,
        settings,
      });
      const article = addSelectedHashtags(parseArticle(edition.text, en.title), params.hashtags);
      article.body = applyImagePlacement(article.body, params.images);
      editions[lang] = article;
    } catch {
      editions[lang] = { ...en };
      missing.push(lang);
    }
  }
  for (const lang of ['es', 'fr', 'de'] as BlogLang[]) {
    if (!editions[lang]) {
      editions[lang] = { ...en };
      if (!missing.includes(lang)) missing.push(lang);
    }
  }

  let social: SocialCut[] = [];
  if (params.socialPlatforms.length > 0) {
    try {
      const cut = await callAi({
        prompt: buildSocialPrompt(
          en,
          params.socialPlatforms,
          params.hashtags ?? [],
          brand
        ),
        system: SYSTEM,
        maxTokens: 1500,
        temperature: 0.9,
        settings,
      });
      social = parseSocial(cut.text, params.socialPlatforms, params.hashtags ?? []);
    } catch {
      social = [];
    }
  }

  return {
    en,
    es: editions.es,
    fr: editions.fr,
    de: editions.de,
    missing,
    images: params.images,
    social,
    provider: english.provider,
    model: english.model,
  };
};

/** A one-line round trip, so the admin can prove a provider works. */
export const probeProvider = async (
  settings: AISettings,
  provider: string
): Promise<{ provider: string; model: string; text: string }> =>
  callAi({
    provider,
    prompt: 'Reply with exactly: ready',
    maxTokens: 20,
    temperature: 0,
    settings,
    // The point of a probe is to test THIS provider. Quietly succeeding on a
    // different one would report the very thing being diagnosed as healthy.
    allowFallback: false,
  });

/** One provider, and whether this deployment could actually call it. */
export interface ProviderStatus {
  provider: 'cloudflare' | 'gemini' | 'openrouter';
  usable: boolean;
  hasKey: boolean;
  model: string;
}

/**
 * Ask what this deployment could generate with, before spending a token.
 *
 * "Generate" failing on a site where nothing was ever configured is a bad way
 * to learn that nothing was ever configured. This costs one cheap request and
 * lets the panel say so up front.
 */
export const providerStatus = async (): Promise<{
  binding: boolean;
  activeProvider: string;
  providers: ProviderStatus[];
} | null> => {
  try {
    const data = await apiPost<{
      ok: boolean;
      binding?: boolean;
      activeProvider?: string;
      providers?: ProviderStatus[];
    }>('ai', { action: 'status' });
    if (!data?.ok) return null;
    return {
      binding: Boolean(data.binding),
      activeProvider: data.activeProvider || '',
      providers: data.providers || [],
    };
  } catch {
    // A deployment too old to know the action, or an admin session that has
    // expired. Neither is worth an error on a panel that has not been used yet.
    return null;
  }
};
