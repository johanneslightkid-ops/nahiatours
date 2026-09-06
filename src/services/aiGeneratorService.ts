import { AISettings } from './aiSettingsService';
import { apiPost } from './apiClient';

export interface BlogGenerationParams {
  povOrigin: string;
  povAge: string;
  povGroup: string;
  povGender: string;
  povExclusivity: string;
  selectedTours: string[];
  voiceTranscript: string;
  mediaBase64?: string; // Optional image for models that support it
  language: 'en' | 'es';
  /** Configured company name, so the model never invents one. */
  brandName?: string;
}

/**
 * Target body length, in characters. Roughly 250 words of English — long
 * enough for a hook, two or three developed paragraphs and a close.
 */
const TARGET_CHARACTERS = 1500;

/**
 * Output ceiling for every provider.
 *
 * None of the three used to be given one, so each fell back to its own
 * default — and Cloudflare Workers AI defaults to 256 tokens, which cut posts
 * off mid-sentence. This is deliberately well above what TARGET_CHARACTERS
 * needs (Spanish runs longer, and the title, tags and Markdown all cost
 * tokens) so length is decided by the brief, never by truncation.
 */
const MAX_OUTPUT_TOKENS = 1200;

const buildPrompt = (params: BlogGenerationParams) => {
  const languageTarget = params.language === 'en' ? 'English' : 'Spanish';
  const brand = params.brandName?.trim() || 'our tour company';

  return `You are an award-winning travel copywriter writing for ${brand}, a tour
operator in Punta Cana, Dominican Republic. You write the kind of destination
feature that makes a reader stop scrolling and start planning.

Write the article in ${languageTarget}.

WHO YOU ARE WRITING FOR
- Coming from: ${params.povOrigin || 'anywhere in the world'}
- Age group: ${params.povAge || 'all ages'}
- Travelling as: ${params.povGroup || 'any kind of group'}
- Gender: ${params.povGender || 'mixed'}
- Style and budget: ${params.povExclusivity || 'standard'}
Speak to that reader directly, in the second person, as if you already know
what their holiday should feel like.

EXCURSIONS TO FEATURE
${params.selectedTours.length > 0 ? params.selectedTours.join(', ') : 'the best of Punta Cana and the Bávaro coast'}

NOTES AND RAW MATERIAL FROM THE OPERATOR
"${params.voiceTranscript || 'Focus on the experience itself: the water, the light, the food, the people, and how effortless the day feels when it is organised properly.'}"
Treat these notes as ground truth. Work every concrete detail into the article.

${params.mediaBase64 ? 'An image is attached. If you can see it, weave its specific details — colours, setting, mood — into the writing.' : ''}

HOW IT SHOULD READ
- Length: about ${TARGET_CHARACTERS} characters of body text — roughly 230 to 280
  words. Write to that length deliberately: it is long enough to develop a
  scene, so do not pad it and do not stop after two thin paragraphs.
- Open with a hook that puts the reader inside a moment — a sound, a colour,
  a temperature — not with "Welcome to" or "Are you looking for".
- Then develop it: what the day actually involves, what makes this operator's
  version better, and one specific, concrete detail a brochure would miss.
- Close with a warm, confident invitation to book. No hard sell.
- Sensory, vivid, and specific throughout. Marketing language, but the good
  kind: concrete nouns over adjectives, and never a sentence of filler.
- Weave in search terms a traveller would actually type — Punta Cana, Bávaro,
  the excursion names — naturally, never as a keyword list.
- Avoid the tired ones: "nestled", "hidden gem", "bucket list", "paradise
  found", "little slice of heaven", "unforgettable memories".
- Never invent prices, distances, durations or safety claims. If a fact is not
  in the notes above, write around it.

OUTPUT FORMAT (STRICT)
- Line 1 MUST be the title, prefixed exactly with "# ". Make it specific and
  click-worthy — a promise or an image, not a category label.
- Line 2 MUST be 3 to 5 comma-separated tags, prefixed exactly with "Tags: ".
- Line 3 onwards MUST be the article body in Markdown. Use short paragraphs,
  and at most one "## " subheading; bold sparingly for emphasis.
- Output nothing else. No preamble, no sign-off, no notes about the task.
`;
};

export const generateBlogPost = async (
  settings: AISettings,
  params: BlogGenerationParams
): Promise<{ title: string; content: string; tags: string[] }> => {
  const provider = settings.activeProvider;
  const prompt = buildPrompt(params);

  try {
    let generatedText = '';

    if (provider === 'gemini') {
      generatedText = await generateWithGemini(settings.gemini, prompt, params.mediaBase64);
    } else if (provider === 'cloudflare') {
      generatedText = await generateWithCloudflare(settings.cloudflare, prompt);
    } else if (provider === 'openrouter') {
      generatedText = await generateWithOpenRouter(settings.openrouter, prompt, params.mediaBase64);
    } else {
      throw new Error('Unknown AI provider');
    }

    // Parse title, tags and content
    const lines = generatedText.split('\n').map(l => l.trim());
    let title = 'New Blog Post';
    let tags: string[] = [];
    let contentLines: string[] = [];
    
    let lineIdx = 0;
    
    // 1. Find Title
    while (lineIdx < lines.length) {
      if (lines[lineIdx].startsWith('#')) {
        title = lines[lineIdx].replace(/^#+\s*/, '');
        lineIdx++;
        break;
      }
      // If we find tags or content first, assume title is missing and just start taking content
      if (lines[lineIdx].toLowerCase().startsWith('tags:')) {
        break;
      }
      if (lines[lineIdx] !== '') {
        title = lines[lineIdx];
        lineIdx++;
        break;
      }
      lineIdx++;
    }

    // 2. Find Tags
    while (lineIdx < lines.length) {
      if (lines[lineIdx].toLowerCase().startsWith('tags:')) {
        const tagStr = lines[lineIdx].replace(/^tags:\s*/i, '');
        tags = tagStr.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
        lineIdx++;
        break;
      }
      // If we hit a non-empty line that isn't tags, assume no tags and it's content
      if (lines[lineIdx] !== '') {
        break;
      }
      lineIdx++;
    }

    // 3. The rest is content
    while (lineIdx < lines.length) {
      contentLines.push(lines[lineIdx]);
      lineIdx++;
    }

    const content = contentLines.join('\n').trim();

    return { title, content, tags };
  } catch (error) {
    console.error('Error generating blog post:', error);
    throw error;
  }
};

const generateWithGemini = async (config: any, prompt: string, mediaBase64?: string): Promise<string> => {
  if (!config.apiKey) throw new Error('Gemini API Key missing');
  
  const contents: any[] = [
    {
      role: 'user',
      parts: [{ text: prompt }]
    }
  ];

  if (mediaBase64 && config.selectedModel.includes('pro')) {
    // Basic base64 handling - assuming image/jpeg for simplicity in this integration
    const base64Data = mediaBase64.split(',')[1] || mediaBase64;
    contents[0].parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data
      }
    });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.selectedModel}:generateContent?key=${config.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.9,
      },
    })
  });

  if (!res.ok) throw new Error(`Gemini error: ${res.statusText}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const generateWithCloudflare = async (config: any, prompt: string): Promise<string> => {
  if (!config.accountId || !config.apiKey) throw new Error('Cloudflare Account ID or API Token missing');
  
  const payload = {
    messages: [
      {
        role: 'system',
        content:
          'You are an award-winning travel copywriter. You write vivid, specific, ' +
          'persuasive destination features, and you always write to the length you are asked for.',
      },
      { role: 'user', content: prompt }
    ],
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.9,
  };

  const data = await apiPost<any>('cf-ai', {
    accountId: config.accountId,
    token: config.apiKey,
    model: config.selectedModel,
    payload
  });

  return data.result?.response || '';
};

const generateWithOpenRouter = async (config: any, prompt: string, mediaBase64?: string): Promise<string> => {
  if (!config.apiKey) throw new Error('OpenRouter API Key missing');

  const content: any = [
    { type: 'text', text: prompt }
  ];

  if (mediaBase64) {
    content.push({
      type: 'image_url',
      image_url: { url: mediaBase64 }
    });
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.selectedModel,
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.9,
    })
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.statusText}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
};
