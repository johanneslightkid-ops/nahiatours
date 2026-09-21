import { AISettings } from './aiSettingsService';
import { ApiError, apiPost } from './apiClient';
import { hashtagsFor } from '../lib/blogTopics';

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
  images: string[];
  social: SocialCut[];
  /** Which provider and model actually answered, for the admin to show. */
  provider: string;
  model: string;
}

/**
 * About 1500 words.
 *
 * The old brief asked for "about 1500 characters — roughly 230 to 280 words"
 * and got exactly that: a thin two-paragraph post. A destination feature that
 * ranks and that somebody reads to the end is an order of magnitude longer,
 * so the target is stated in words, repeated, and backed by a section count —
 * models hold a length far better when they are told the shape as well.
 */
const TARGET_WORDS = 1500;

/** Enough headroom for 1500 words plus the title, caption, tags and Markdown. */
const MAX_OUTPUT_TOKENS = 4000;

const SYSTEM =
  'You are an award-winning travel writer and SEO editor for a Caribbean tour ' +
  'operator. You write long, specific, sensory destination features that read ' +
  'like a magazine, not like a brochure. You follow output formats exactly.';

interface AiResponse {
  ok: boolean;
  text?: string;
  provider?: string;
  model?: string;
  error?: string;
  detail?: string;
  status?: number;
  attempts?: Array<{ provider: string; model: string; status: number; detail: string }>;
}

/** One call to the Worker, with the provider's own error kept intact. */
const callAi = async (
  body: Record<string, unknown>
): Promise<{ text: string; provider: string; model: string }> => {
  let data: AiResponse;
  try {
    data = await apiPost<AiResponse>('ai', body);
  } catch (error) {
    // ApiError carries the server's JSON, which is where the provider's own
    // explanation lives — the model it tried, the status it got back and what
    // Google or OpenRouter actually said about it.
    const payload = error instanceof ApiError ? (error.body as AiResponse | null) : null;
    if (payload?.error) {
      throw new Error(`${payload.error}${payload.detail ? ` — ${payload.detail}` : ''}`);
    }
    throw error;
  }

  if (!data?.ok || !data.text) {
    const detail = data?.detail ? ` — ${data.detail}` : '';
    throw new Error(`${data?.error || 'The AI provider returned nothing.'}${detail}`);
  }

  return { text: data.text, provider: data.provider || '', model: data.model || '' };
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

const buildEnglishPrompt = (params: BlogGenerationParams, topicLabels: string[]) => {
  const brand = params.brandName?.trim() || 'our tour company';

  return `Write a long-form travel feature in ENGLISH for ${brand}, a tour operator in
Punta Cana, Dominican Republic.

LENGTH — this is the requirement most often missed, so read it twice.
About ${TARGET_WORDS} words in the BODY. Not 300. Not 600. Around ${TARGET_WORDS}.
Build it as six to eight developed sections with "## " subheadings, each two or
three real paragraphs long. If you find yourself finishing early, you have
skipped the detail that makes the piece worth reading — go deeper instead of
padding with adjectives.

WHO YOU ARE WRITING FOR
- Coming from: ${params.povOrigin || 'anywhere in the world'}
- Age group: ${params.povAge || 'all ages'}
- Travelling as: ${params.povGroup || 'any kind of group'}
- Gender: ${params.povGender || 'mixed'}
- Style and budget: ${params.povExclusivity || 'standard'}
Write to that reader in the second person.

EXCURSIONS TO FEATURE
${params.selectedTours.length ? params.selectedTours.join('\n') : 'the best of Punta Cana and the Bávaro coast'}

TOPICS TO LEAN INTO
${topicLabels.length ? topicLabels.join(', ') : 'whatever the notes below suggest'}

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
- Weave in the search terms a traveller would type — Punta Cana, Bávaro, the
  excursion names — naturally, never as a list.
- Never invent prices, distances, durations, safety claims or awards. If a
  fact is not in the notes, write around it.
- Banned: "nestled", "hidden gem", "bucket list", "paradise found", "little
  slice of heaven", "unforgettable memories", "dive into", "look no further".
- Close with a warm, confident invitation to get in touch. No hard sell.

${FORMAT(params.images.length)}`;
};

const buildSpanishPrompt = (english: GeneratedArticle, params: BlogGenerationParams) =>
  `Below is a finished English travel feature. Produce the SPANISH edition of it.

This is not a translation exercise. Rewrite it as a Spanish-language travel
writer from the Dominican Republic would have written it in the first place:
Latin American Spanish, Dominican where it is natural, "tú" not "usted", idioms
that exist in Spanish rather than English ones carried across. Keep the same
structure, the same sections, the same facts and the same length — about
${TARGET_WORDS} words — and keep every [[IMAGE-n]] marker exactly where it is.

Never invent a fact the English version does not contain.

--- ENGLISH ARTICLE ---
TITLE: ${english.title}
CAPTION: ${english.caption}
PRELUDE: ${english.prelude}

${english.body}
--- END ---

${FORMAT(params.images.length)}`;

const buildSocialPrompt = (
  article: GeneratedArticle,
  platforms: string[],
  hashtags: string[],
  brand: string
) =>
  `Write the social media cut of this article for a Caribbean tour operator called ${brand}.

One post per platform, in this exact format, nothing else:

${platforms.map((p) => `[${p.toUpperCase()}]\n<the post>`).join('\n\n')}

Rules per platform:
- instagram: 3 to 5 short lines, warm and visual, one emoji at most per line,
  ends with a call to action. 8 to 12 hashtags on the final line.
- facebook: one paragraph of 60 to 90 words, conversational, ends with a
  question. 3 to 5 hashtags on the final line.
- tiktok: 2 punchy lines, present tense, 5 to 8 hashtags on the final line.
- twitter: under 260 characters including the hashtags.
- youtube: 2 sentences of description plus 5 hashtags.
- linkedin: 70 words, professional, about the operation rather than the party.

Write each post in the same language as the article. Draw hashtags from this
list where they fit, and add others that genuinely match:
${hashtags.map((h) => `#${h}`).join(' ')}

--- ARTICLE ---
${article.title}
${article.caption}

${article.prelude}

${article.body.slice(0, 2500)}
--- END ---`;

const parseSocial = (raw: string, platforms: string[]): SocialCut[] => {
  const cuts: SocialCut[] = [];

  for (const platform of platforms) {
    const re = new RegExp(`\\[${platform}\\]\\s*([\\s\\S]*?)(?=\\n\\s*\\[[a-z]+\\]|$)`, 'i');
    const text = re.exec(raw)?.[1]?.trim();
    if (!text) continue;
    const hashtags = [...text.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1]);
    cuts.push({ platform, text, hashtags: [...new Set(hashtags)] });
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
  const topicLabels = params.topics;

  const english = await callAi({
    prompt: buildEnglishPrompt(params, topicLabels),
    system: SYSTEM,
    maxTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.85,
    imageBase64: params.mediaBase64,
    settings,
  });

  const en = parseArticle(english.text, `A day out from ${brand}`);
  en.body = applyImagePlacement(en.body, params.images);

  // Spanish is written from the finished English piece so the two carry the
  // same facts, the same sections and the same pictures in the same places.
  let es: GeneratedArticle;
  try {
    const spanish = await callAi({
      prompt: buildSpanishPrompt(en, params),
      system: SYSTEM,
      maxTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.8,
      settings,
    });
    es = parseArticle(spanish.text, en.title);
    es.body = applyImagePlacement(es.body, params.images);
  } catch (error) {
    // An English post that saved is worth more than no post at all, so a
    // failed Spanish pass is reported rather than fatal.
    es = {
      title: en.title,
      caption: en.caption,
      prelude: en.prelude,
      body: `> La versión en español no se pudo generar: ${
        error instanceof Error ? error.message : String(error)
      }\n\n${en.body}`,
      tags: en.tags,
    };
  }

  let social: SocialCut[] = [];
  if (params.socialPlatforms.length > 0) {
    try {
      const cut = await callAi({
        prompt: buildSocialPrompt(en, params.socialPlatforms, hashtagsFor(params.topics), brand),
        system: SYSTEM,
        maxTokens: 1500,
        temperature: 0.9,
        settings,
      });
      social = parseSocial(cut.text, params.socialPlatforms);
    } catch {
      social = [];
    }
  }

  return {
    en,
    es,
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
  });
