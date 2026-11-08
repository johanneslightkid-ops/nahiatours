import React, { useEffect, useState } from 'react';
import { FaCheck, FaCopy, FaImages, FaMagic, FaMicrophone, FaRedo, FaSave, FaSearch, FaShareAlt, FaSpinner, FaStop, FaTrash } from 'react-icons/fa';
import { getTours, Tour } from '../../services/toursService';
import { getAISettings, AISettings } from '../../services/aiSettingsService';
import { AiGenerationError, GeneratedArticle, GeneratedPost, generateBlogPost, providerStatus } from '../../services/aiGeneratorService';
import { saveBlogArticle, getBlogArticles, BlogArticle } from '../../services/blogService';
import TranslateBar from './TranslateBar';
import { useTranslationSync } from './useTranslationSync';
import { Lang, translateRecord } from '../../lib/autoTranslate';
import { SUPPORTED_LOCALES, useI18n } from '../../contexts/I18nContext';
import { useDictation } from '../../lib/useDictation';
import { getSocialApiSettings } from '../../services/socialApiSettingsService';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';
import { apiPost } from '../../services/apiClient';
import { getAdminPassword } from '../../services/authStore';
import { useBrand } from '../../contexts/BrandContext';
import { TOPICS, keywordsFor, seasonalNote, BlogLang } from '../../lib/blogTopics';
import { BLOG_TEMPLATES } from '../../lib/blogTemplates';
import { getPublishedTestimonials } from '../../services/testimonialService';
import { SHARE_TARGETS, shareTo, copyText, shareTargetFor } from '../../lib/socialShare';
import ArticleBody from '../ui/ArticleBody';
import { BLOG_AUDIENCE_PRESETS, BlogAudience as Audience, findAudiencePreset } from '../../lib/blogAudiencePresets';
import { getImageCatalog, PoolImage } from '../../services/imageCatalogService';
import {
  BLOG_HASHTAG_PACKS,
  BLOG_HASHTAGS,
  findRelevantHashtags,
  HASHTAG_CATEGORIES,
} from '../../lib/blogHashtagPacks';
import type { HashtagCategory } from '../../lib/blogHashtagPacks';

/**
 * The blog generator.
 *
 * The panel this replaces was a column of long dropdowns above a wall of raw
 * Markdown in a <pre>. Nothing told you what the article would be about, the
 * tour picker was a list of every excursion with no way to find one, and the
 * only preview was the source text. It also had exactly one button that did
 * anything — "Generate" — and when that failed it said "Failed to generate
 * blog posts" and nothing else.
 *
 * This is three steps, in the order the work actually happens: say what the
 * piece is about, choose how it should come out, then read it and publish it.
 * The preview is the real article, rendered by the same component the public
 * blog uses, so what is approved here is what ships.
 */

const AUDIENCE_OPTIONS = {
  origin: ['Estados Unidos', 'Canadá', 'América Latina', 'Europa', 'Francia', 'Alemania', 'Reino Unido', 'Asia'],
  age: ['Jóvenes', 'Adultos', 'Personas mayores', 'Todas las edades'],
  group: ['Familia', 'Pareja', 'Amigos', 'Grupo', 'Solo/a'],
  gender: ['Mixto', 'Mujeres', 'Hombres'],
  style: ['Estándar', 'Premium', 'Económico', 'Aventura', 'Relajado'],
};

const AUDIENCE_LABELS: Record<keyof Audience, string> = {
  origin: 'Procedencia',
  age: 'Edad',
  group: 'Viajan como',
  gender: 'Público',
  style: 'Estilo',
};

const tourTerms = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9áéíóúüñ]+/)
    .filter((term) => term.length > 2 && !['tour', 'tours', 'excursion', 'excursions', 'island', 'isla', 'beach', 'playa'].includes(term));

interface AudiencePreset {
  id: string;
  label: string;
  audience: Audience;
  focus: string;
}

interface ArticleBrief {
  audience: Audience;
  audienceLabel: string;
  audienceFocus: string;
  templateId: string;
}

interface PostState {
  id: string;
  post: GeneratedPost;
  saved: boolean;
  brief: ArticleBrief;
  /** Which language the preview is showing. */
  view: BlogLang;
}

const GENERATED_DRAFTS_KEY = 'nahiatours:blog-generator:drafts:v1';

const loadGeneratedDrafts = (): PostState[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(GENERATED_DRAFTS_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is PostState =>
        Boolean(entry && typeof entry.id === 'string' && entry.post && entry.brief)
    );
  } catch (error) {
    console.warn('[Blog generator] Could not restore saved drafts:', error);
    return [];
  }
};

/** The generator writes every site language itself, from the English piece. */
const EDITIONS = SUPPORTED_LOCALES.filter((l) => l !== 'en') as BlogLang[];
const LANGUAGE_TABS: Record<BlogLang, string> = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch' };
const PROGRESS_LANGUAGE: Record<BlogLang, string> = { en: 'inglés', es: 'español', fr: 'francés', de: 'alemán' };
const MAX_BATCH_ARTICLES = 6;
const GOOGLE_SEARCH_CHANNEL = {
  platform: 'google-search',
  label: 'Google Search · SEO',
  note: 'SEO title, meta description, search phrase and snippet for Google search results.',
};



/** Short, well-rated reviews make the best quotes. */
const quotableReviews = (reviews: { review: string; rating: number }[]): string[] =>
  reviews
    .filter((r) => Number(r.rating) >= 4 && r.review && r.review.length >= 30 && r.review.length <= 280)
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, 3)
    .map((r) => r.review.replace(/\s+/g, ' ').trim());

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const AIBlogGenAdmin: React.FC = () => {
  const { brandSettings } = useBrand();

  const [tours, setTours] = useState<Tour[]>([]);
  const [tourQuery, setTourQuery] = useState('');
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [socialApiSettings, setSocialApiSettings] = useState<any>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialMediaAccount[]>([]);

  // ── The brief ────────────────────────────────────────────────────────────
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(['guide']);
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>([
    'us-family-beach',
    'latam-family-classic',
  ]);
  const [activeAudienceId, setActiveAudienceId] = useState('us-family-beach');
  const [audienceCustomized, setAudienceCustomized] = useState(false);
  const [audienceFocus, setAudienceFocus] = useState(BLOG_AUDIENCE_PRESETS[0].focus);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [hashtagCategory, setHashtagCategory] = useState<HashtagCategory | 'all' | 'recommended'>('recommended');
  const [customHashtag, setCustomHashtag] = useState('');
  const [reviews, setReviews] = useState<string[]>([]);
  const [quoteReviews, setQuoteReviews] = useState(false);
  const [selectedTours, setSelectedTours] = useState<string[]>([]);
  const [audience, setAudience] = useState<Audience>(BLOG_AUDIENCE_PRESETS[0].audience);
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [firstImageBase64, setFirstImageBase64] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [poolImages, setPoolImages] = useState<PoolImage[]>([]);
  const [poolSearch, setPoolSearch] = useState('');
  const [matchingPoolOnly, setMatchingPoolOnly] = useState(true);

  // ── How it comes out ─────────────────────────────────────────────────────
  const [platforms, setPlatforms] = useState<string[]>(['google-search']);
  const [autoSave, setAutoSave] = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);

  // ── Running ──────────────────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [problem, setProblem] = useState('');
  /** One sentence per provider that was tried, when more than one was. */
  const [problemFailures, setProblemFailures] = useState<{ provider: string; error: string }[]>([]);
  /** Null until the deployment has been asked; false means nothing can run. */
  const [anyProviderUsable, setAnyProviderUsable] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<PostState[]>(loadGeneratedDrafts);
  const [copied, setCopied] = useState('');
  const [draftPersistenceProblem, setDraftPersistenceProblem] = useState('');
  const [pendingGenerate, setPendingGenerate] = useState<ArticleBrief[] | null | undefined>(undefined);
  const sync = useTranslationSync('en');

  // ── Dictation ────────────────────────────────────────────────────────────
  // The notes are dictated in the language the admin is working in.
  const { locale } = useI18n();
  const dictation = useDictation(notes, setNotes, locale);

  useEffect(() => {
    try {
      window.localStorage.setItem(GENERATED_DRAFTS_KEY, JSON.stringify(posts));
      setDraftPersistenceProblem('');
    } catch (error) {
      console.error('[Blog generator] Could not persist generated articles:', error);
      setDraftPersistenceProblem('No se pudieron guardar los borradores en este navegador. Publica el artículo para conservarlo en el sitio.');
    }
  }, [posts]);

  useEffect(() => {
    (async () => {
      setTours(await getTours('en'));
      try {
        const catalog = await getImageCatalog();
        setPoolImages(catalog.images);
      } catch (error) {
        console.error('[Blog generator] Could not load the image pool:', error);
        setProblem('No se pudo cargar el catálogo de imágenes. Puedes continuar con fotos subidas directamente.');
      }
      setAiSettings(await getAISettings());
      setSocialApiSettings(await getSocialApiSettings());
      // Asked once, so the panel can say "nothing is configured" before a
      // click rather than after a wait.
      const status = await providerStatus();
      if (status) setAnyProviderUsable(status.providers.some((prov) => prov.usable));
      try {
        setReviews(quotableReviews(await getPublishedTestimonials()));
      } catch {
        setReviews([]);
      }
      const social = await getSocialMediaData();
      setSocialAccounts((social.accounts || []).filter((a: SocialMediaAccount) => a.enabled));
    })();

  }, []);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const selectAudiencePreset = (id: string) => {
    const preset = findAudiencePreset(id);
    if (!preset) return;
    setActiveAudienceId(id);
    setAudience(preset.audience);
    setAudienceFocus(preset.focus);
    setAudienceCustomized(false);
    setSelectedAudienceIds((current) => current.includes(id) ? current : [...current, id]);
  };

  const updateAudience = (facet: keyof Audience, value: string) => {
    if (audience[facet] === value) return;
    setAudience((current) => ({ ...current, [facet]: value }));
    setAudienceCustomized(true);
    if (!selectedAudienceIds.length) {
      setSelectedAudienceIds([activeAudienceId]);
    }
  };

  const toggleAudiencePreset = (id: string) => {
    setSelectedAudienceIds((current) => toggle(current, id));
  };

  const activeAudiencePreset = findAudiencePreset(activeAudienceId);
  const rankedHashtags = findRelevantHashtags(selectedTours, selectedTopics, selectedAudienceIds);
  const suggestedHashtags = rankedHashtags.filter(({ relevance }) => relevance > 0);
  const suggestedTagNames = new Set(suggestedHashtags.map(({ hashtag }) => hashtag.tag.toLowerCase()));
  const visibleHashtags = BLOG_HASHTAGS.filter((item) => {
    const categoryMatches = hashtagCategory === 'all'
      || (hashtagCategory === 'recommended'
        ? suggestedTagNames.has(item.tag.toLowerCase())
        : item.category === hashtagCategory);
    const query = hashtagQuery.trim().toLowerCase();
    return categoryMatches
      && (!query || `${item.tag} ${item.description}`.toLowerCase().includes(query));
  });

  const toggleHashtagPack = (tags: string[]) => {
    setSelectedHashtags((current) => {
      const selected = new Set(current.map((tag) => tag.toLowerCase()));
      const allSelected = tags.every((tag) => selected.has(tag.toLowerCase()));
      return allSelected
        ? current.filter((tag) => !tags.some((packTag) => packTag.toLowerCase() === tag.toLowerCase()))
        : [...current, ...tags.filter((tag) => !selected.has(tag.toLowerCase()))];
    });
  };

  const addCustomHashtag = () => {
    const tag = customHashtag.trim().replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '');
    if (!tag) return;
    setSelectedHashtags((current) =>
      current.some((selected) => selected.toLowerCase() === tag.toLowerCase())
        ? current
        : [...current, tag]
    );
    setCustomHashtag('');
  };

  /** Upload straight away, so the article can reference a real URL. */
  const handleImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = Math.max(0, 6 - images.length);
    if (remainingSlots === 0) {
      setProblem('El artículo admite hasta seis imágenes. Quita una para añadir otra.');
      return;
    }
    setUploading(true);
    setProblem('');

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setProblem(`Se pueden añadir ${remainingSlots} imagen(es) más; el límite por artículo es seis.`);
    }
    for (const file of selectedFiles) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', 'blog');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'X-Admin-Password': getAdminPassword() ?? '' },
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (data.secure_url) {
          setImages((prev) => [...prev, data.secure_url]);
          // The first picture also goes to the model as vision input.
          if (!firstImageBase64) {
            const reader = new FileReader();
            reader.onloadend = () => setFirstImageBase64(reader.result as string);
            reader.readAsDataURL(file);
          }
        } else {
          setProblem(data.error || 'No se pudo subir una de las imágenes.');
        }
      } catch (error) {
        setProblem(error instanceof Error ? error.message : String(error));
      }
    }

    setUploading(false);
  };

  const buildArticleRecord = (
    article: GeneratedArticle,
    post: GeneratedPost,
    locale: Lang,
    id: string
  ): BlogArticle => ({
    id,
    title: article.title,
    tour: selectedTours.join(', '),
    post: article.body,
    date: new Date().toISOString().split('T')[0],
    slug: slugify(article.title) || id,
    locale,
    tags: article.tags,
    visible: true,
    caption: article.caption,
    prelude: article.prelude,
    images: post.images,
    social: post.social,
  });

  /** This one article, in a language the generator did not write. */
  const translatePost = async (entry: PostState, to: Lang, report: (line: string) => void) => {
    const { value } = await translateRecord(entry.post.en, 'en', to, (n, total) => report(`${n}/${total}`));
    if (!(await saveBlogArticle(buildArticleRecord(value, entry.post, to, entry.id), to))) {
      throw new Error('no se pudo guardar');
    }
    return '1 artículo traducido';
  };

  /** All four languages at once; an edition the model could not write is translated instead. */
  const savePost = async (entry: PostState) => {
    if (!(await saveBlogArticle(buildArticleRecord(entry.post.en, entry.post, 'en', entry.id), 'en'))) {
      throw new Error('No se pudo guardar la versión en inglés.');
    }
    for (const lang of EDITIONS) {
      if (entry.post.missing.includes(lang)) continue;
      if (!(await saveBlogArticle(buildArticleRecord(entry.post[lang], entry.post, lang, entry.id), lang))) {
        throw new Error(`No se pudo guardar la versión en ${LANGUAGE_TABS[lang]}.`);
      }
    }
    setPosts((prev) => prev.map((p) => (p.id === entry.id ? { ...p, saved: true } : p)));
    const toTranslate = entry.post.missing.filter((lang) => EDITIONS.includes(lang)) as Lang[];
    if (toTranslate.length > 0) {
      void sync.afterSave((to, report) => translatePost(entry, to, report), toTranslate);
    }
  };

  /** The published articles of this session that a language does not have yet. */
  const fillMissingPosts = async (to: Lang, report: (line: string) => void): Promise<string | null> => {
    const theirs = new Set((await getBlogArticles(to, true)).map((article) => article.id));
    const missing = posts.filter((entry) => entry.saved && !theirs.has(entry.id));
    for (const [i, entry] of missing.entries()) {
      report(`${i + 1}/${missing.length}`);
      await translatePost(entry, to, () => undefined);
    }
    return missing.length ? `${missing.length} artículo(s) traducido(s)` : null;
  };

  /** Publish through the configured Graph API token, when there is one. */
  const publish = async (entry: PostState) => {
    const token = socialApiSettings?.facebookLongLivedToken;
    if (!token) return;
    const message =
      entry.post.social.find((c) => c.platform === 'facebook')?.text ||
      `${entry.post.en.title}\n\n${entry.post.en.prelude}`;
    const mediaUrl = entry.post.images[0] || '';

    try {
      if (socialApiSettings.selectedFacebookPageId) {
        await apiPost('social-publish', {
          message,
          mediaUrl,
          platform: 'facebook',
          pageId: socialApiSettings.selectedFacebookPageId,
          token,
        });
      }
      if (socialApiSettings.selectedInstagramAccountId && mediaUrl) {
        await apiPost('social-publish', {
          message:
            entry.post.social.find((c) => c.platform === 'instagram')?.text || message,
          mediaUrl,
          platform: 'instagram',
          igAccountId: socialApiSettings.selectedInstagramAccountId,
          token,
        });
      }
    } catch (error) {
      setProblem(
        `El artículo se generó, pero no se pudo publicar en redes: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const handleGenerate = async (
    requestedBriefs?: ArticleBrief[],
    channelOverride?: string[]
  ) => {
    if (!aiSettings) return;
    if (
      channelOverride === undefined &&
      platforms.includes(GOOGLE_SEARCH_CHANNEL.platform) &&
      platforms.length > 1
    ) {
      setPendingGenerate(requestedBriefs ?? null);
      return;
    }
    const outputChannels = channelOverride ?? platforms;
    const activeAudiences: Array<{
      audience: Audience;
      audienceLabel: string;
      audienceFocus: string;
    }> = selectedAudienceIds.length
      ? BLOG_AUDIENCE_PRESETS.filter((preset) => selectedAudienceIds.includes(preset.id)).map((preset) => ({
          audience: preset.id === activeAudienceId ? audience : preset.audience,
          audienceLabel: `${preset.label}${preset.id === activeAudienceId && audienceCustomized ? ' · personalizado' : ''}`,
          audienceFocus: preset.id === activeAudienceId ? audienceFocus : preset.focus,
        }))
      : [{
          audience,
          audienceLabel: 'Público personalizado',
          audienceFocus,
        }];
    const queue =
      requestedBriefs ??
      activeAudiences.flatMap((selectedAudience) =>
        selectedTemplateIds.map((templateId) => ({
          ...selectedAudience,
          templateId,
        }))
      );
    if (!queue.length) {
      setProblem('Selecciona al menos un formato de artículo y un público.');
      return;
    }
    if (queue.length > MAX_BATCH_ARTICLES) {
      setProblem(`La tanda contiene ${queue.length} artículos. El máximo es ${MAX_BATCH_ARTICLES}; reduce formatos o públicos.`);
      return;
    }

    setBusy(true);
    setProblem('');
    setProblemFailures([]);
    const generationErrors: string[] = [];
    const providerErrors: { provider: string; error: string }[] = [];
    let generatedCount = 0;

    try {
      for (const [index, brief] of queue.entries()) {
        const templateLabel = BLOG_TEMPLATES.find((item) => item.id === brief.templateId)?.label.es;
        const context = `${index + 1}/${queue.length} · ${brief.audienceLabel} · ${templateLabel}`;
        setProgress(`${context} · inglés…`);

        try {
          const post = await generateBlogPost(aiSettings, {
            povOrigin: brief.audience.origin,
            povAge: brief.audience.age,
            povGroup: brief.audience.group,
            povGender: brief.audience.gender,
            povExclusivity: brief.audience.style,
            audienceFocus: brief.audienceFocus,
            imageDescriptions: poolImages
              .filter((image) => images.includes(image.url))
              .map((image) => [image.title, image.alt, image.excursions.join(', ')].filter(Boolean).join(' — ')),
            selectedTours,
            topics: selectedTopics,
            hashtags: selectedHashtags,
            voiceTranscript: notes,
            mediaBase64: firstImageBase64,
            images,
            brandName: brandSettings.brandName,
            socialPlatforms: outputChannels,
            template: brief.templateId,
            reviews: quoteReviews ? reviews : [],
            languages: EDITIONS,
            onProgress: (lang) =>
              setProgress(`${context} · ${PROGRESS_LANGUAGE[lang]}…`),
          });

          const entry: PostState = {
            id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            post,
            saved: false,
            brief,
            view: 'es',
          };
          setPosts((prev) => [...prev, entry]);
          generatedCount += 1;

          if (autoSave) {
            await savePost(entry);
            entry.saved = true;
          }
          if (autoPublish) await publish(entry);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          generationErrors.push(`${brief.audienceLabel} · ${templateLabel}: ${message}`);
          if (error instanceof AiGenerationError) {
            providerErrors.push(...error.failures);
          }
        }
      }

      if (generationErrors.length) {
        setProblem(
          `${generatedCount} de ${queue.length} artículos generados. ${generationErrors.join('\n')}`
        );
        setProblemFailures(providerErrors);
      }
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const copy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    }
  };

  const visibleTours = tours.filter((tour) =>
    tourQuery.trim() ? tour.title.toLowerCase().includes(tourQuery.trim().toLowerCase()) : true
  );
  const visiblePoolImages = poolImages.filter((image) => {
    const query = poolSearch.trim().toLowerCase();
    const textMatches = !query || [
      image.title,
      image.alt,
      ...image.categories,
      ...image.excursions,
      ...image.audiences,
    ].join(' ').toLowerCase().includes(query);
    if (!textMatches) return false;
    if (!matchingPoolOnly) return true;
    const audienceMatches =
      !selectedAudienceIds.length ||
      !image.audiences.length ||
      image.audiences.some((id) => selectedAudienceIds.includes(id));
    const normalizedTours = selectedTours.map((tour) => tour.toLowerCase());
    const tourMatches =
      !selectedTours.length ||
      !image.excursions.length ||
      image.excursions.some((excursion) =>
        normalizedTours.some((tour) => {
          const imageTerms = tourTerms(excursion);
          return tour === excursion.toLowerCase() || tourTerms(tour).some((term) => imageTerms.includes(term));
        })
      );
    return audienceMatches && tourMatches;
  });

  const plannedArticleCount =
    (selectedAudienceIds.length || 1) * selectedTemplateIds.length;
  const batchWithinLimit = plannedArticleCount <= MAX_BATCH_ARTICLES;

  const providerLabel = aiSettings
    ? { cloudflare: 'Cloudflare Workers AI', gemini: 'Google Gemini', openrouter: 'OpenRouter' }[
        aiSettings.activeProvider
      ]
    : '…';
  const channelOptions = [
    ...SHARE_TARGETS.map((target) => ({ ...target, noteText: target.note.es })),
    { ...GOOGLE_SEARCH_CHANNEL, noteText: GOOGLE_SEARCH_CHANNEL.note },
  ];

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
      active
        ? 'border-lagoon-dark bg-lagoon-dark text-white'
        : 'border-ink/20 bg-white text-ink-soft hover:border-lagoon'
    }`;

  /**
   * The same action, rendered at both ends of the page.
   *
   * The brief is long enough that by the time it is filled in the button that
   * starts it is off-screen, and after a run the results push it further away
   * still. One handler, one `busy`, two buttons: whichever is in view is the
   * live one, and both show the same progress line so neither can look idle
   * while the other is working.
   */
  const GenerateButton = ({ size }: { size: 'lead' | 'foot' }) => (
    <button
      type="button"
      onClick={() => handleGenerate()}
      disabled={busy || plannedArticleCount === 0 || !batchWithinLimit}
      aria-busy={busy}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-mango font-bold uppercase tracking-[0.1em] text-ink transition hover:brightness-95 disabled:opacity-60 ${
        size === 'lead' ? 'px-7 py-3.5 text-sm' : 'w-full px-8 py-4 text-base sm:w-auto'
      }`}
    >
      {busy ? (
        <>
          <FaSpinner className="animate-spin" /> {progress || 'Generando…'}
        </>
      ) : (
        <>
          <FaMagic /> Generar {plannedArticleCount === 1 ? 'artículo' : `${plannedArticleCount} artículos`}
        </>
      )}
    </button>
  );

  const card = 'rounded-3xl border border-ink/12 bg-white p-5 shadow-sm sm:p-6';
  const step = 'mb-4 flex items-baseline gap-3';
  const stepNo =
    'grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[0.78rem] font-bold text-paper';

  return (
    <div className="space-y-6">
      {/* ── Heading and the one primary action ──────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-3xl border border-ink/12 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold text-ink sm:text-3xl">
            <FaMagic className="text-mango" /> Generador de blog
          </h2>
          <p className="mt-1 text-sm text-ink-light">
            Combina formatos y públicos para generar hasta {MAX_BATCH_ARTICLES} artículos en inglés,
            español, francés y alemán, con piezas estructuradas y búsquedas por idioma. Proveedor
            activo:{' '}
            <strong className="text-ink">{providerLabel}</strong>
          </p>
        </div>
      </div>
      {posts.length > 0 && (
        <p className="text-xs text-ink-light">
          {posts.length} artículo(s) recuperado(s) o generado(s) en este navegador.{' '}
          {posts.filter((entry) => entry.saved).length} guardado(s) en el sitio.
        </p>
      )}

      {anyProviderUsable === false && !problem && (
        <div className="rounded-2xl border border-sunset/50 bg-sunset/10 p-5">
          <p className="text-sm font-bold text-ink">Ningún proveedor de IA está listo</p>
          <p className="mt-1 text-sm text-ink-soft">
            Esta instalación no tiene el binding de Workers AI ni una clave guardada. Abre
            “Integraciones de IA” y pega una clave de Gemini o de OpenRouter — o vuelve a
            desplegar el sitio, que es lo que concede el binding de Cloudflare y no necesita
            ninguna clave.
          </p>
        </div>
      )}

      {problem && (
        <div className="rounded-2xl border border-hibiscus/40 bg-hibiscus/10 p-5">
          <p className="text-sm font-bold text-hibiscus-dark">No se pudo generar</p>
          {/* What to change, not what broke. The Worker turns each provider's
              own wording into one instruction, and when it tried more than one
              provider each gets its own line — "la clave de Gemini fue
              rechazada" and "Cloudflare no tiene el binding" are two different
              repairs, and seeing only the first sends you to fix the wrong
              thing. */}
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{problem}</p>
          {problemFailures.length > 1 && (
            <ul className="mt-3 space-y-1.5 border-t border-hibiscus/25 pt-3">
              {problemFailures.map((f) => (
                <li key={f.provider} className="text-xs text-ink-soft">
                  <strong className="uppercase tracking-[0.08em] text-ink">{f.provider}</strong>{' '}
                  — {f.error}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-light">
            Puedes probar cada proveedor por separado en “Integraciones de IA”, con el botón
            “Probar”. Cloudflare Workers AI funciona sin clave en esta instalación.
          </p>
        </div>
      )}
      {draftPersistenceProblem && (
        <p className="rounded-2xl border border-sunset/40 bg-sunset/10 p-4 text-sm font-semibold text-sunset-dark">
          {draftPersistenceProblem}
        </p>
      )}
      {pendingGenerate !== undefined && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/60 p-4" role="dialog" aria-modal="true" aria-labelledby="output-selection-title">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <h3 id="output-selection-title" className="text-xl font-bold text-ink">Confirmar los formatos de salida</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Google Search y las redes sociales necesitan piezas distintas: la búsqueda usa título y descripción SEO,
              mientras que cada red tiene su propio formato. Puedes generar todo por separado o elegir un conjunto enfocado.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  const briefs = pendingGenerate;
                  setPendingGenerate(undefined);
                  void handleGenerate(briefs ?? undefined, platforms);
                }}
                className="rounded-2xl bg-lagoon-dark px-4 py-3 text-left text-sm font-bold text-white"
              >
                Continuar con Google Search y redes
              </button>
              <button
                type="button"
                onClick={() => {
                  const briefs = pendingGenerate;
                  setPendingGenerate(undefined);
                  setPlatforms([GOOGLE_SEARCH_CHANNEL.platform]);
                  void handleGenerate(briefs ?? undefined, [GOOGLE_SEARCH_CHANNEL.platform]);
                }}
                className="rounded-2xl border border-ink/15 px-4 py-3 text-left text-sm font-bold text-ink"
              >
                Usar solo Google Search
              </button>
              <button
                type="button"
                onClick={() => {
                  const briefs = pendingGenerate;
                  const socialChannels = platforms.filter((platform) => platform !== GOOGLE_SEARCH_CHANNEL.platform);
                  setPendingGenerate(undefined);
                  setPlatforms(socialChannels);
                  void handleGenerate(briefs ?? undefined, socialChannels);
                }}
                className="rounded-2xl border border-ink/15 px-4 py-3 text-left text-sm font-bold text-ink"
              >
                Usar solo redes sociales
              </button>
              <button
                type="button"
                onClick={() => setPendingGenerate(undefined)}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-ink-light hover:bg-paper-warm"
              >
                Volver a editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. The brief ────────────────────────────────────────────────── */}
      <section className={card}>
        <div className={step}>
          <span className={stepNo}>1</span>
          <div>
            <h3 className="text-lg font-bold text-ink">¿De qué trata el artículo?</h3>
            <p className="text-sm text-ink-light">Toca los temas. Puedes elegir varios.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setSelectedTopics((prev) => toggle(prev, topic.id))}
              className={chip(selectedTopics.includes(topic.id))}
            >
              {topic.label.es}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
            Formatos de artículo · puedes elegir varios
          </p>
          <div className="flex flex-wrap gap-2">
            {BLOG_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplateIds((prev) => toggle(prev, t.id))}
                title={t.hint}
                aria-pressed={selectedTemplateIds.includes(t.id)}
                className={chip(selectedTemplateIds.includes(t.id))}
              >
                {t.label.es}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-light">
            {selectedTemplateIds.length
              ? BLOG_TEMPLATES.filter((t) => selectedTemplateIds.includes(t.id))
                  .map((t) => `${t.label.es} · ${t.targetWords} palabras`)
                  .join('  |  ')
              : 'Elige al menos un formato.'}
          </p>
        </div>

        {selectedTopics.length > 0 && (
          <div className="mt-4 rounded-2xl bg-paper-warm p-3">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Búsquedas que el artículo trabajará (español)
            </p>
            <p className="mb-3 mt-1 break-words text-sm text-ink-soft">
              {keywordsFor(selectedTopics, 'es').join(' · ')}
            </p>
          </div>
        )}
      </section>

      {/* ── 2. Tours, audience, notes, photos ───────────────────────────── */}
      <section className={card}>
        <div className={step}>
          <span className={stepNo}>2</span>
          <div>
            <h3 className="text-lg font-bold text-ink">Excursiones y público</h3>
            <p className="text-sm text-ink-light">
              Lo que se menciona en el texto y para quién está escrito.
            </p>
          </div>
        </div>

        {/* Tours: searchable chips instead of a list of everything. */}
        <div className="relative mb-3">
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-light" />
          <input
            type="search"
            value={tourQuery}
            onChange={(event) => setTourQuery(event.target.value)}
            placeholder="Buscar excursión…"
            className="w-full rounded-full border border-ink/15 py-2.5 pl-10 pr-4 text-sm"
          />
        </div>

        <div className="rounded-2xl border border-ink/10 p-2">
          <div className="flex flex-wrap gap-2">
            {visibleTours.map((tour) => {
              const active = selectedTours.includes(tour.title);
              return (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => setSelectedTours((prev) => toggle(prev, tour.title))}
                  className={`flex items-center gap-2 ${chip(active)} !py-1 !pl-1 !pr-3.5`}
                >
                  {tour.image && (
                    <img
                      src={tour.image}
                      alt=""
                      loading="lazy"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <span className="max-w-[16rem] truncate">{tour.title}</span>
                </button>
              );
            })}
            {visibleTours.length === 0 && (
              <p className="p-3 text-sm text-ink-light">Ninguna excursión coincide.</p>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-light">
          {selectedTours.length} seleccionada{selectedTours.length === 1 ? '' : 's'}
          {selectedTours.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTours([])}
              className="ml-3 font-semibold text-sunset-dark hover:underline"
            >
              Quitar todas
            </button>
          )}
        </p>

        <div className="mt-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Perfil de viajero · elige una preselección y ajusta sus detalles
            </p>
          </div>
          <p className="mb-3 text-xs text-ink-light">
            Perfiles editoriales prácticos; no son porcentajes ni afirmaciones sobre todas las personas de un mercado.
          </p>
          <p className="mb-3 text-xs leading-relaxed text-ink-light">
            La guía oficial de turismo presenta el destino para parejas, familias y grupos y destaca playa, islas, snorkel, aventura y cultura. No publica cuotas por excursión, edad o raza; por eso estos 27 perfiles son hipótesis editoriales útiles, no estadísticas ni segmentación racial.{' '}
            <a href="https://www.godominicanrepublic.com/destinations/punta-cana/" target="_blank" rel="noreferrer" className="font-semibold text-lagoon-dark underline">Ver guía oficial de Punta Cana</a>
            {' · '}
            <a href="https://www.bancentral.gov.do/a/d/2533-sector-turismo" target="_blank" rel="noreferrer" className="font-semibold text-lagoon-dark underline">Estadísticas oficiales del sector turístico</a>
          </p>
          <label className="block text-sm font-bold text-ink">
            Preselección
            <select
              value={activeAudienceId}
              onChange={(event) => selectAudiencePreset(event.target.value)}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-3 text-sm font-medium focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            >
              {BLOG_AUDIENCE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}{preset.id === activeAudienceId && audienceCustomized ? ' · personalizado' : ''}
                </option>
              ))}
            </select>
          </label>
          {activeAudiencePreset && (
            <p className="mt-2 rounded-xl bg-paper-warm p-3 text-sm leading-relaxed text-ink-soft">
              {activeAudiencePreset.explanation}
            </p>
          )}

          <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-4">
            <p className="mb-3 text-sm font-bold text-ink">Configuración manual · siempre visible</p>
            <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(AUDIENCE_OPTIONS) as Array<keyof Audience>).map((facet) => (
              <div key={facet}>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-ink-light">
                  {AUDIENCE_LABELS[facet]}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AUDIENCE_OPTIONS[facet].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateAudience(facet, option)}
                      className={`${chip(audience[facet] === option)} !px-3 !py-1 !text-[0.8rem]`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-ink-light sm:col-span-2">
                Enfoque editorial específico
                <textarea
                  value={audienceFocus}
                  onChange={(event) => {
                    setAudienceFocus(event.target.value);
                    setAudienceCustomized(true);
                  }}
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-normal normal-case leading-relaxed text-ink focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
                />
              </label>
            </div>
            {audienceCustomized && (
              <p className="mt-3 text-xs font-semibold text-sunset-dark">
                Esta preselección está personalizada. Elegir otra preselección restablece automáticamente todos sus valores.
              </p>
            )}
          </div>

          <div className="mt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-ink-light">
              Perfiles incluidos en esta tanda
            </p>
            <div className="flex flex-wrap gap-2">
              {BLOG_AUDIENCE_PRESETS.filter((preset) => selectedAudienceIds.includes(preset.id)).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed="true"
                  onClick={() => toggleAudiencePreset(preset.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    preset.id === activeAudienceId && audienceCustomized
                      ? 'border-sunset bg-sunset/10 text-sunset-dark'
                      : 'border-lagoon-dark bg-lagoon/10 text-ink'
                  }`}
                  title="Quitar este perfil de la tanda"
                >
                  {preset.label}{preset.id === activeAudienceId && audienceCustomized ? ' · personalizado' : ''} ×
                </button>
              ))}
              {!selectedAudienceIds.length && (
                <button type="button" onClick={() => setSelectedAudienceIds([activeAudienceId])} className="rounded-full border border-dashed border-lagoon px-3 py-1.5 text-xs font-semibold text-lagoon-dark">
                  Añadir perfil actual a la tanda
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-paper-warm px-4 py-3 text-sm text-ink-soft">
          {selectedAudienceIds.length || 1} público(s) × {selectedTemplateIds.length} formato(s) ={' '}
          {selectedAudienceIds.length
            ? selectedAudienceIds.length * selectedTemplateIds.length
            : selectedTemplateIds.length}{' '}
          artículo(s) planificado(s). El máximo por tanda es {MAX_BATCH_ARTICLES}.
        </div>

        {/* Notes. Large on a phone, because this is the field that is dictated
            into and then corrected by thumb. */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Notas para el artículo
            </p>
            {dictation.mode !== 'none' && (
              <button
                type="button"
                onClick={dictation.toggle}
                disabled={dictation.transcribing}
                aria-pressed={dictation.listening}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                  dictation.listening ? 'bg-hibiscus text-white' : 'border border-ink/20 text-ink-soft hover:border-lagoon'
                }`}
              >
                {dictation.transcribing ? (
                  <><FaSpinner className="animate-spin" /> Transcribiendo…</>
                ) : dictation.listening ? (
                  <><FaStop /> Detener{dictation.mode === 'record' ? ` · ${dictation.seconds}s` : ''}</>
                ) : (
                  <><FaMicrophone /> Dictar</>
                )}
              </button>
            )}
          </div>
          {dictation.error && <p className="mb-2 text-xs font-semibold text-hibiscus-dark">{dictation.error}</p>}
          {dictation.mode === 'none' && (
            <p className="mb-2 text-xs text-ink-light">
              Este navegador no permite dictar. Puedes usar el micrófono del teclado del teléfono.
            </p>
          )}
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={6}
            placeholder="Cuenta lo que hace especial el día: el agua, la comida, la gente, lo que incluye, qué llevar…"
            className="min-h-[9rem] w-full rounded-2xl border border-ink/15 p-4 text-base leading-relaxed"
          />
          <p className="mt-1 text-xs text-ink-light">
            Todo lo que escribas aquí se trata como verdad y entra en el artículo.
          </p>
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
                Sal y sabor · hashtags opcionales
              </p>
              <span className="text-xs text-ink-light">{selectedHashtags.length} seleccionados</span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-ink-light">
              No hay etiquetas preseleccionadas. Elige solo las que describen de verdad la experiencia; las redes usarán como máximo cinco de las seleccionadas por publicación.
            </p>
            {selectedHashtags.length > 0 && (
              <div className="mb-4 rounded-2xl bg-paper-warm p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-ink">Tu selección</p>
                  <button
                    type="button"
                    onClick={() => setSelectedHashtags([])}
                    className="text-xs font-semibold text-sunset-dark hover:underline"
                  >
                    Quitar todas
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedHashtags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      aria-label={`Quitar #${tag}`}
                      onClick={() => setSelectedHashtags((current) => current.filter((value) => value !== tag))}
                      className={chip(true)}
                    >
                      #{tag} <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="mb-2 text-xs font-bold text-ink">Packs temáticos</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {BLOG_HASHTAG_PACKS.map((pack) => {
                const active = pack.tags.every((tag) =>
                  selectedHashtags.some((selected) => selected.toLowerCase() === tag.toLowerCase())
                );
                return (
                  <button
                    key={pack.id}
                    type="button"
                    title={pack.description}
                    aria-pressed={active}
                    onClick={() => toggleHashtagPack(pack.tags)}
                    className={chip(active)}
                  >
                    {pack.label}
                  </button>
                );
              })}
            </div>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar hashtags">
              {HASHTAG_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={hashtagCategory === category.id}
                  onClick={() => setHashtagCategory(category.id)}
                  className={chip(hashtagCategory === category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="relative mb-3">
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-light" />
              <input
                type="search"
                value={hashtagQuery}
                onChange={(event) => setHashtagQuery(event.target.value)}
                placeholder="Buscar por etiqueta o descripción…"
                aria-label="Buscar hashtags"
                className="w-full rounded-full border border-ink/15 py-2.5 pl-10 pr-4 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleHashtags.map((item) => {
                const active = selectedHashtags.some((tag) => tag.toLowerCase() === item.tag.toLowerCase());
                return (
                  <button
                    key={item.tag}
                    type="button"
                    title={item.description}
                    aria-pressed={active}
                    onClick={() => setSelectedHashtags((current) =>
                      active
                        ? current.filter((tag) => tag.toLowerCase() !== item.tag.toLowerCase())
                        : [...current, item.tag]
                    )}
                    className={`${chip(active)} !inline-flex !flex-col !items-start !gap-1 !rounded-2xl !text-left`}
                  >
                    <span>
                      #{item.tag}
                      {suggestedTagNames.has(item.tag.toLowerCase()) && (
                        <span className="ml-1 text-[0.65rem] font-normal opacity-70">· sugerido</span>
                      )}
                    </span>
                    <span className="max-w-[18rem] whitespace-normal text-left text-[0.65rem] font-normal leading-snug opacity-75">
                      {item.description}
                    </span>
                  </button>
                );
              })}
              {visibleHashtags.length === 0 && (
                <p className="text-sm text-ink-light">
                  {hashtagCategory === 'recommended'
                    ? 'Aún no hay sugerencias para esta selección. Elige otro filtro o busca en Todos.'
                    : 'No hay hashtags que coincidan.'}
                </p>
              )}
            </div>
            <form
              className="mt-4 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addCustomHashtag();
              }}
            >
              <input
                type="text"
                value={customHashtag}
                onChange={(event) => setCustomHashtag(event.target.value)}
                placeholder="Añadir hashtag propio"
                aria-label="Añadir hashtag propio"
                className="min-w-[14rem] flex-1 rounded-full border border-ink/15 px-4 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={!customHashtag.trim()}
                className="rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-paper disabled:opacity-50"
              >
                Añadir
              </button>
            </form>
            <p className="mt-2 text-xs leading-relaxed text-ink-light">
              Las sugerencias se relacionan con el público, los temas y las excursiones seleccionadas.
              Los hashtags no garantizan alcance; prioriza la relevancia y evita afirmaciones que no correspondan.
              Referencias:{' '}
              <a
                href="https://www.godominicanrepublic.com/destinations/punta-cana/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-lagoon-dark underline"
              >
                guía oficial de Punta Cana
              </a>{' '}
              ·{' '}
              <a
                href="https://later.com/blog/instagram-hashtags/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-lagoon-dark underline"
              >
                guía actual de hashtags de Instagram
              </a>
              .
            </p>
          </div>
        </div>

        {/* Photos. Uploaded immediately so the article can reference real URLs. */}
        <div className="mt-6">
          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
            Fotos del artículo
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {images.map((url, index) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-xl border border-ink/15 object-cover"
                />
                <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-[0.6rem] font-bold text-paper">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-hibiscus text-[0.6rem] text-white"
                  aria-label="Quitar la foto"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="inline-flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink/25 text-ink-light transition hover:border-lagoon hover:text-ink">
              <FaImages />
              <span className="text-[0.62rem] font-bold">{uploading ? 'Subiendo…' : 'Añadir'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  handleImages(event.target.files);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-ink-light">
            La IA coloca cada foto donde el texto la describe. Si no encuentra un lugar claro, van
            justo después de la entrada en negrita.
          </p>
          <div className="mt-5 rounded-2xl border border-ink/10 bg-paper-warm p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-ink">Elegir del catálogo de imágenes</h4>
                <p className="mt-1 text-xs text-ink-light">
                  Sugerencias filtradas por los públicos y excursiones elegidos. Puedes ampliar la búsqueda cuando quieras.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft">
                <input type="checkbox" checked={!matchingPoolOnly} onChange={(event) => setMatchingPoolOnly(!event.target.checked)} className="accent-lagoon-dark" />
                Mostrar todo el catálogo
              </label>
            </div>
            <label className="relative mt-3 block">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light" />
              <input
                value={poolSearch}
                onChange={(event) => setPoolSearch(event.target.value)}
                placeholder="Buscar por excursión, categoría o nombre…"
                className="w-full rounded-xl border border-ink/15 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-lagoon focus:outline-none"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {visiblePoolImages.map((image) => {
                const selected = images.includes(image.url);
                return (
                  <button
                    key={image.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={!selected && images.length >= 6}
                    onClick={() => setImages((current) => selected
                      ? current.filter((url) => url !== image.url)
                      : current.length < 6 ? [...current, image.url] : current
                    )}
                    className={`overflow-hidden rounded-xl border-2 text-left transition ${
                      selected ? 'border-lagoon-dark ring-2 ring-lagoon/20' : 'border-transparent hover:border-lagoon'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                    title={image.title}
                  >
                    <span className="relative block">
                      <img src={image.url} alt={image.alt} loading="lazy" className="h-24 w-full bg-white object-cover" />
                      {selected && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-lagoon-dark text-xs font-bold text-white">{images.indexOf(image.url) + 1}</span>}
                    </span>
                    <span className="block truncate bg-white p-2 text-xs font-semibold text-ink">{image.title || image.excursions[0] || 'Imagen de excursión'}</span>
                  </button>
                );
              })}
            </div>
            {!visiblePoolImages.length && (
              <p className="mt-3 rounded-xl bg-white p-4 text-center text-xs text-ink-light">
                No hay coincidencias en este filtro. Desactiva «Mostrar todo el catálogo» o sube imágenes desde la sección Imágenes del admin.
              </p>
            )}
            <p className="mt-3 text-xs text-ink-light">
              {images.length} de 6 imágenes seleccionadas. Administra y clasifica el catálogo desde la sección independiente «Imágenes».
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. How it comes out ─────────────────────────────────────────── */}
      <section className={card}>
        <div className={step}>
          <span className={stepNo}>3</span>
          <div>
            <h3 className="text-lg font-bold text-ink">Cómo se publica</h3>
            <p className="text-sm text-ink-light">Versiones, redes sociales y guardado.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-paper-warm p-4">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Tanda de generación
            </p>
            <p className="mt-1 text-sm font-bold text-ink">
              {plannedArticleCount} artículo(s) · en secuencia · cuatro idiomas
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-light">
              Cada formato se combina con cada público seleccionado. El límite de {MAX_BATCH_ARTICLES}
              artículos ayuda a evitar tandas largas y solicitudes simultáneas al proveedor.
            </p>
            {!batchWithinLimit && (
              <p className="mt-2 text-xs font-bold text-hibiscus-dark">
                Reduce la selección a {MAX_BATCH_ARTICLES} combinaciones o menos.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Uso y optimización
            </p>
            <div className="flex flex-wrap gap-1.5">
              {channelOptions.map((target) => {
                const configured = socialAccounts.some(
                  (a) => a.platform === target.platform
                );
                return (
                  <button
                    key={target.platform}
                    type="button"
                    onClick={() => setPlatforms((prev) => toggle(prev, target.platform))}
                    title={
                      target.platform === 'google-search'
                        ? target.noteText
                        : configured
                          ? 'Cuenta configurada'
                          : 'Sin cuenta configurada — se podrá copiar y compartir'
                    }
                    className={`${chip(platforms.includes(target.platform))} !px-3 !py-1 !text-[0.8rem]`}
                  >
                    {target.label}
                    {configured && target.platform !== 'google-search' && <span className="ml-1.5 text-[0.7em]">●</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-light">
              Google Search crea un paquete de SEO; cada red social recibe su propio texto adaptado.
            </p>
          </div>
        </div>

        <p className="mt-5 rounded-2xl bg-paper-warm p-3 text-xs text-ink-soft">
          <strong className="text-ink">Temporada:</strong> {seasonalNote()}
        </p>

        <div className="mt-5 flex flex-wrap gap-5 border-t border-ink/10 pt-5">
          <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={quoteReviews && reviews.length > 0}
              onChange={(event) => setQuoteReviews(event.target.checked)}
              disabled={reviews.length === 0}
              className="h-4 w-4"
            />
            Citar reseñas reales
            <span className="text-xs font-normal text-ink-light">
              ({reviews.length ? `${reviews.length} disponibles` : 'no hay reseñas publicadas'})
            </span>
          </label>
          <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(event) => setAutoSave(event.target.checked)}
              className="h-4 w-4"
            />
            Guardar en el sitio automáticamente
          </label>
          <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(event) => setAutoPublish(event.target.checked)}
              disabled={!socialApiSettings?.facebookLongLivedToken}
              className="h-4 w-4"
            />
            Publicar en Facebook e Instagram
            {!socialApiSettings?.facebookLongLivedToken && (
              <span className="text-xs font-normal text-ink-light">(falta el token)</span>
            )}
          </label>
        </div>
      </section>

      {/* ── The result ──────────────────────────────────────────────────── */}
      {/* Only for an edition the model could not write itself. */}
      {posts.some((entry) => entry.post.missing.length > 0) && (
        <TranslateBar
          sync={sync}
          what="el artículo publicado"
          languages={EDITIONS as Lang[]}
          fillMissing={fillMissingPosts}
          disabled={!posts.some((entry) => entry.saved)}
        />
      )}
      {posts.map((entry) => {
        const article = entry.post[entry.view];
        const plain = `${article.title}\n\n${article.caption}\n\n${article.prelude}\n\n${article.body}`;

        return (
          <section key={entry.id} className={card}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
              <div className="inline-flex rounded-full bg-paper-warm p-1">
                {(['es', 'en', 'fr', 'de'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() =>
                      setPosts((prev) =>
                        prev.map((p) => (p.id === entry.id ? { ...p, view: lang } : p))
                      )
                    }
                    className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                      entry.view === lang ? 'bg-white text-ink shadow-sm' : 'text-ink-light'
                    }`}
                  >
                    {LANGUAGE_TABS[lang]}
                    {entry.post.missing.includes(lang) && (
                      <span className="ml-1 text-[0.7em] text-sunset-dark" title="Se traducirá al guardar">
                        *
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copy(`${entry.id}-article`, plain)}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-xs font-bold text-ink-soft transition hover:border-lagoon hover:text-ink"
                >
                  {copied === `${entry.id}-article` ? <FaCheck /> : <FaCopy />} Copiar
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate([entry.brief])}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-xs font-bold text-ink-soft transition hover:border-lagoon hover:text-ink disabled:opacity-50"
                >
                  <FaRedo /> Regenerar
                </button>
                <button
                  type="button"
                  onClick={() => setPosts((prev) => prev.filter((p) => p.id !== entry.id))}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-xs font-bold text-sunset-dark transition hover:border-hibiscus"
                >
                  <FaTrash /> Descartar
                </button>
                <button
                  type="button"
                  onClick={() => savePost(entry)}
                  disabled={entry.saved}
                  className="inline-flex items-center gap-2 rounded-full bg-jungle-dark px-5 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {entry.saved ? <><FaCheck /> Guardado</> : <><FaSave /> Publicar en el sitio</>}
                </button>
              </div>
            </div>

            {/* The preview is the real thing: same component as the blog. */}
            <article className="mx-auto max-w-3xl">
              <h1 className="mb-4 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
                {article.title}
              </h1>
              <ArticleBody
                caption={article.caption}
                prelude={article.prelude}
                body={article.body}
                images={entry.post.images}
                title={article.title}
              />
              {article.tags.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2 border-t border-ink/10 pt-5">
                  {article.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-ink/15 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-light"
                    >
                      #{tag}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <p className="mt-6 text-center text-xs text-ink-light">
              {entry.brief.audienceLabel} ·{' '}
              {BLOG_TEMPLATES.find((item) => item.id === entry.brief.templateId)?.label.es} ·{' '}
              {entry.post.provider} · {entry.post.model} ·{' '}
              {article.body.split(/\s+/).filter(Boolean).length} palabras
            </p>

            {/* The social cut. */}
            {entry.post.social.length > 0 && (
              <div className="mt-8 border-t border-ink/10 pt-6">
                <h4 className="mb-4 text-lg font-bold text-ink">Adaptaciones por canal</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {entry.post.social.map((cut) => {
                    const target = shareTargetFor(cut.platform);
                    const key = `${entry.id}-${cut.platform}`;
                    const url =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/blog#${slugify(article.title)}`
                        : '';
                    return (
                      <div
                        key={cut.platform}
                        className="flex flex-col rounded-2xl border border-ink/12 bg-paper-warm p-4"
                      >
                        <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
                          {target?.label || (cut.platform === 'google-search' ? 'Google Search · SEO' : cut.platform)}
                        </p>
                        <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                          {cut.text}
                        </p>
                        <p className="mt-3 text-xs text-ink-light">
                          {target?.note.es || (cut.platform === 'google-search'
                            ? GOOGLE_SEARCH_CHANNEL.note
                            : '')}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => copy(key, cut.text)}
                            className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white px-4 py-2 text-xs font-bold text-ink-soft transition hover:border-lagoon hover:text-ink"
                          >
                            {copied === key ? <FaCheck /> : <FaCopy />} Copiar
                          </button>
                          {target && (
                            <button
                              type="button"
                              onClick={() => shareTo(cut.platform, cut.text, url)}
                              className="inline-flex items-center gap-2 rounded-full bg-lagoon-dark px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                            >
                              <FaShareAlt /> Compartir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}

      {posts.length === 0 && !busy && (
        <p className="rounded-3xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink-light">
          Los artículos generados aparecerán aquí, con vista previa real y botones para publicar.
        </p>
      )}

      {/* ── The same action again, where the form ends ─────────────────── */}
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-ink/12 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-ink-light">
          {posts.length > 0
            ? 'Genera otra versión con el mismo resumen, o cambia algo arriba y vuelve a intentarlo.'
            : 'Cuando el resumen esté listo, genera el artículo desde aquí.'}
        </p>
        <GenerateButton size="foot" />
        <p className="text-xs text-ink-light">
          Proveedor activo: <strong className="text-ink-soft">{providerLabel}</strong>
        </p>
      </div>
    </div>
  );
};

export default AIBlogGenAdmin;
